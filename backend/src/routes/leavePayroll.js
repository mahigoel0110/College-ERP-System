const express = require('express');
const fs = require('fs');
const path = require('path');
const { query, pool } = require('../config/db');
const { authenticate, allow } = require('../middleware/auth');

const router = express.Router();
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const ok = (res, data, status = 200) => res.status(status).json({ data });

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../../uploads/leave_documents');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Number to words helper for Indian Rupees
function numberToWordsINR(amount) {
  const num = Math.round(Number(amount));
  if (isNaN(num) || num === 0) return 'Zero Rupees Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convertBelowThousand(n) {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '') + ' ';
    } else if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }
  
  let result = '';
  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  let thousand = Math.floor(remainder / 1000);
  let belowThousand = remainder % 1000;
  
  if (crore > 0) result += convertBelowThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertBelowThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertBelowThousand(thousand) + ' Thousand ';
  if (belowThousand > 0) result += convertBelowThousand(belowThousand) + ' ';
  
  return (result.trim() + ' Rupees Only');
}

// -------------------------------------------------------------
// HELPER: DEPARTMENTS & FACULTY LIST (For Admin Dropdowns & Filters)
// -------------------------------------------------------------
router.get('/departments', authenticate, allow('FACULTY', 'ADMIN'), asyncRoute(async (req, res) => {
  const departments = await query(`
    SELECT department_id, department_code, department_name 
    FROM department 
    ORDER BY department_name ASC
  `);
  ok(res, departments);
}));

router.get('/faculty-list', authenticate, allow('ADMIN'), asyncRoute(async (req, res) => {
  const facultyList = await query(`
    SELECT 
      f.faculty_id,
      f.employee_code,
      CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
      f.department_id,
      d.department_name
    FROM faculty f
    LEFT JOIN department d ON d.department_id = f.department_id
    WHERE f.status = 'ACTIVE'
    ORDER BY f.faculty_id ASC
  `);
  ok(res, facultyList);
}));

// -------------------------------------------------------------
// 1. LEAVE TYPES (View, Create, Update Quota & Config)
// -------------------------------------------------------------
router.get('/leave-types', authenticate, allow('FACULTY', 'ADMIN'), asyncRoute(async (req, res) => {
  const types = await query(`
    SELECT 
      leave_type_id,
      type_name,
      type_code,
      annual_days,
      description,
      requires_document,
      COALESCE(is_active, 1) AS is_active
    FROM leave_type 
    ORDER BY leave_type_id ASC
  `);
  ok(res, types);
}));

router.post('/leave-types', authenticate, allow('ADMIN'), asyncRoute(async (req, res) => {
  const { type_name, type_code, annual_days, requires_document, description, is_active } = req.body || {};

  if (!type_name || !type_name.trim() || !type_code || !type_code.trim()) {
    return res.status(400).json({ error: { message: 'Leave type name and code are required.' } });
  }

  const quota = Number(annual_days);
  if (isNaN(quota) || quota < 0) {
    return res.status(400).json({ error: { message: 'Annual quota must be a non-negative number.' } });
  }

  const cleanCode = type_code.trim().toUpperCase();
  const existing = await query('SELECT leave_type_id FROM leave_type WHERE type_code = ?', [cleanCode]);
  if (existing.length > 0) {
    return res.status(400).json({ error: { message: `Leave type with code '${cleanCode}' already exists.` } });
  }

  const result = await query(`
    INSERT INTO leave_type (type_name, type_code, annual_days, requires_document, description, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [type_name.trim(), cleanCode, quota, requires_document ? 1 : 0, description ? description.trim() : null, is_active !== false ? 1 : 0]);

  const newTypeId = result.insertId;

  // Initialize leave balance for all active faculty for the current year
  const currentYear = new Date().getFullYear();
  const facultyMembers = await query("SELECT faculty_id FROM faculty WHERE status = 'ACTIVE'");
  for (const f of facultyMembers) {
    await query(`
      INSERT IGNORE INTO leave_balance (faculty_id, leave_type_id, balance_year, allocated_days, days_remaining)
      VALUES (?, ?, ?, ?, ?)
    `, [f.faculty_id, newTypeId, currentYear, quota, quota]);
  }

  ok(res, { leave_type_id: newTypeId, message: 'Leave type created successfully and initialized for active faculty.' }, 201);
}));

router.put('/leave-types/:id', authenticate, allow('ADMIN'), asyncRoute(async (req, res) => {
  const typeId = Number(req.params.id);
  const { type_name, annual_days, requires_document, description, is_active } = req.body || {};

  const existing = await query('SELECT * FROM leave_type WHERE leave_type_id = ?', [typeId]);
  if (!existing.length) {
    return res.status(404).json({ error: { message: 'Leave type not found.' } });
  }

  const updates = [];
  const params = [];

  if (type_name !== undefined) {
    updates.push('type_name = ?');
    params.push(type_name.trim());
  }

  if (annual_days !== undefined) {
    const quota = Number(annual_days);
    if (isNaN(quota) || quota < 0) {
      return res.status(400).json({ error: { message: 'Annual quota must be a non-negative number.' } });
    }
    updates.push('annual_days = ?');
    params.push(quota);
  }

  if (requires_document !== undefined) {
    updates.push('requires_document = ?');
    params.push(requires_document ? 1 : 0);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description ? description.trim() : null);
  }

  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  if (updates.length > 0) {
    params.push(typeId);
    await query(`UPDATE leave_type SET ${updates.join(', ')} WHERE leave_type_id = ?`, params);
  }

  ok(res, { success: true, message: 'Leave type updated successfully.' });
}));

// -------------------------------------------------------------
// 2. LEAVE BALANCES (Listing, Filtering, Manual Adjustments)
// -------------------------------------------------------------
router.get('/leave-balances', authenticate, allow('FACULTY', 'ADMIN'), asyncRoute(async (req, res) => {
  const targetFacultyId = req.user.role === 'FACULTY' ? req.user.faculty_id : (req.query.faculty_id ? Number(req.query.faculty_id) : null);
  const targetYear = req.query.year ? Number(req.query.year) : 2026;
  const departmentId = req.query.department_id ? Number(req.query.department_id) : null;
  const leaveTypeId = req.query.leave_type_id ? Number(req.query.leave_type_id) : null;
  const search = req.query.search ? req.query.search.trim() : null;

  let sql = `
    SELECT 
      b.leave_balance_id,
      b.faculty_id,
      b.employee_code,
      b.faculty_name,
      b.department_name,
      f.department_id,
      b.leave_type_id,
      b.type_name,
      b.type_code,
      b.balance_year,
      b.allocated_days,
      b.used_days,
      b.pending_days,
      b.remaining_days
    FROM vw_leave_balance b
    JOIN faculty f ON f.faculty_id = b.faculty_id
    WHERE 1=1
  `;
  const params = [];

  if (targetFacultyId) {
    sql += ' AND b.faculty_id = ?';
    params.push(targetFacultyId);
  }

  if (targetYear) {
    sql += ' AND b.balance_year = ?';
    params.push(targetYear);
  }

  if (departmentId) {
    sql += ' AND f.department_id = ?';
    params.push(departmentId);
  }

  if (leaveTypeId) {
    sql += ' AND b.leave_type_id = ?';
    params.push(leaveTypeId);
  }

  if (search) {
    sql += ' AND (b.faculty_name LIKE ? OR b.employee_code LIKE ? OR CAST(b.faculty_id AS CHAR) = ?)';
    const term = `%${search}%`;
    params.push(term, term, search);
  }

  sql += ' ORDER BY b.faculty_id ASC, b.leave_type_id ASC';
  const rows = await query(sql, params);
  ok(res, rows);
}));

// Manual balance adjustment by Admin with mandatory reason & audit logging
router.post('/leave-balances/adjust', authenticate, allow('ADMIN'), asyncRoute(async (req, res) => {
  const { faculty_id, leave_type_id, balance_year, adjustment_amount, reason } = req.body || {};

  if (!faculty_id || !leave_type_id || !balance_year || adjustment_amount === undefined || !reason || !reason.trim()) {
    return res.status(400).json({ error: { message: 'Faculty ID, leave type, year, adjustment amount, and a clear reason are required.' } });
  }

  const adj = Number(adjustment_amount);
  if (isNaN(adj) || adj === 0) {
    return res.status(400).json({ error: { message: 'Adjustment amount must be a non-zero number.' } });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.query(`
      SELECT leave_balance_id, allocated_days, days_remaining
      FROM leave_balance
      WHERE faculty_id = ? AND leave_type_id = ? AND balance_year = ?
      FOR UPDATE
    `, [faculty_id, leave_type_id, balance_year]);

    if (!existingRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: { message: `No leave balance record found for faculty ${faculty_id} in academic year ${balance_year}.` } });
    }

    const current = existingRows[0];
    const oldAllocated = Number(current.allocated_days);
    const oldRemaining = Number(current.days_remaining);

    const newAllocated = oldAllocated + adj;
    const newRemaining = oldRemaining + adj;

    if (newAllocated < 0) {
      await conn.rollback();
      return res.status(400).json({ error: { message: `Cannot adjust: Total allocated days cannot be negative (current: ${oldAllocated}, adjustment: ${adj}).` } });
    }

    if (newRemaining < 0) {
      await conn.rollback();
      return res.status(400).json({ error: { message: `Cannot adjust: Remaining days cannot be negative (current remaining: ${oldRemaining}, adjustment: ${adj}).` } });
    }

    // Update leave_balance
    await conn.query(`
      UPDATE leave_balance
      SET allocated_days = ?, days_remaining = ?
      WHERE leave_balance_id = ?
    `, [newAllocated, newRemaining, current.leave_balance_id]);

    // Record audit log
    await conn.query(`
      INSERT INTO leave_balance_audit (
        faculty_id, leave_type_id, balance_year, old_allocated, new_allocated, adjustment_amount, reason, adjusted_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [faculty_id, leave_type_id, balance_year, oldAllocated, newAllocated, adj, reason.trim(), req.user.id]);

    await conn.commit();
    ok(res, {
      success: true,
      message: `Balance adjusted successfully. New allocated: ${newAllocated}, new remaining: ${newRemaining}.`,
      new_allocated: newAllocated,
      new_remaining: newRemaining
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

// Leave balance audit history
router.get('/leave-balances/audit-history', authenticate, allow('ADMIN'), asyncRoute(async (req, res) => {
  const rows = await query(`
    SELECT 
      lba.audit_id,
      lba.faculty_id,
      f.employee_code,
      CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
      d.department_name,
      lba.leave_type_id,
      lt.type_name,
      lba.balance_year,
      lba.old_allocated,
      lba.new_allocated,
      lba.adjustment_amount,
      lba.reason,
      u.username AS adjusted_by_username,
      lba.adjusted_at
    FROM leave_balance_audit lba
    JOIN faculty f ON f.faculty_id = lba.faculty_id
    LEFT JOIN department d ON d.department_id = f.department_id
    JOIN leave_type lt ON lt.leave_type_id = lba.leave_type_id
    LEFT JOIN app_user u ON u.user_id = lba.adjusted_by
    ORDER BY lba.adjusted_at DESC
    LIMIT 100
  `);
  ok(res, rows);
}));

// -------------------------------------------------------------
// 3. LEAVE REQUESTS (Comprehensive Filters, Approvals, History)
// -------------------------------------------------------------
router.get('/leave-requests', authenticate, allow('FACULTY', 'ADMIN'), asyncRoute(async (req, res) => {
  let sql = `
    SELECT 
      lr.leave_request_id,
      lr.faculty_id,
      f.employee_code,
      CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
      d.department_name,
      f.department_id,
      lr.leave_type_id,
      lt.type_name,
      lt.type_code,
      lr.start_date,
      lr.end_date,
      lr.days_requested,
      lr.reason,
      lr.contact_info,
      lr.document_name,
      lr.document_path,
      lr.status,
      lr.approver_remarks,
      lr.decided_by,
      u_dec.username AS approver_username,
      lr.requested_at,
      lr.decided_at,
      lr.cancelled_at
    FROM leave_request lr
    JOIN faculty f ON f.faculty_id = lr.faculty_id
    LEFT JOIN department d ON d.department_id = f.department_id
    JOIN leave_type lt ON lt.leave_type_id = lr.leave_type_id
    LEFT JOIN app_user u_dec ON u_dec.user_id = lr.decided_by
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'FACULTY') {
    sql += ' AND lr.faculty_id = ?';
    params.push(req.user.faculty_id);
  } else if (req.query.faculty_id) {
    sql += ' AND lr.faculty_id = ?';
    params.push(Number(req.query.faculty_id));
  }

  if (req.query.department_id) {
    sql += ' AND f.department_id = ?';
    params.push(Number(req.query.department_id));
  }

  if (req.query.status) {
    sql += ' AND lr.status = ?';
    params.push(req.query.status);
  }

  if (req.query.leave_type_id) {
    sql += ' AND lr.leave_type_id = ?';
    params.push(Number(req.query.leave_type_id));
  }

  if (req.query.start_date) {
    sql += ' AND lr.start_date >= ?';
    params.push(req.query.start_date);
  }

  if (req.query.end_date) {
    sql += ' AND lr.end_date <= ?';
    params.push(req.query.end_date);
  }

  if (req.query.search) {
    const s = req.query.search.trim();
    sql += ' AND (f.first_name LIKE ? OR f.last_name LIKE ? OR f.employee_code LIKE ? OR CONCAT(f.first_name, " ", f.last_name) LIKE ? OR CAST(lr.leave_request_id AS CHAR) = ?)';
    const term = `%${s}%`;
    params.push(term, term, term, term, s);
  }

  sql += ' ORDER BY lr.requested_at DESC';
  const rows = await query(sql, params);
  ok(res, rows);
}));

// Leave summary stats
router.get('/leave-requests/summary', authenticate, allow('FACULTY', 'ADMIN'), asyncRoute(async (req, res) => {
  const isFaculty = req.user.role === 'FACULTY';
  const facultyId = isFaculty ? req.user.faculty_id : null;

  const whereClause = facultyId ? 'WHERE faculty_id = ?' : '';
  const params = facultyId ? [facultyId] : [];

  const rows = await query(`
    SELECT 
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END), 0) AS approved,
      COALESCE(SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END), 0) AS rejected,
      COALESCE(SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS cancelled
    FROM leave_request
    ${whereClause}
  `, params);

  ok(res, rows[0] || { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 });
}));

// Submit leave request
router.post('/leave-requests', authenticate, allow('FACULTY', 'ADMIN'), asyncRoute(async (req, res) => {
  const { leave_type_id, start_date, end_date, days_requested, reason, contact_info, document_name, document_data } = req.body || {};

  const faculty_id = req.user.role === 'FACULTY' ? req.user.faculty_id : Number(req.body.faculty_id || req.user.faculty_id);
  if (!faculty_id) {
    return res.status(400).json({ error: { message: 'A valid faculty account is required.' } });
  }

  if (!leave_type_id || !start_date || !end_date || !days_requested || !reason || !reason.trim()) {
    return res.status(400).json({ error: { message: 'Please provide leave type, start date, end date, days requested, and reason.' } });
  }

  const days = Number(days_requested);
  if (isNaN(days) || days <= 0) {
    return res.status(400).json({ error: { message: 'Days requested must be greater than zero.' } });
  }

  if (new Date(end_date) < new Date(start_date)) {
    return res.status(400).json({ error: { message: 'End date cannot be earlier than start date.' } });
  }

  const facultyRows = await query('SELECT faculty_id, first_name, last_name, employee_code FROM faculty WHERE faculty_id = ? AND status = "ACTIVE"', [faculty_id]);
  if (!facultyRows.length) {
    return res.status(400).json({ error: { message: 'Faculty member is not active.' } });
  }
  const facultyMember = facultyRows[0];

  const typeRows = await query('SELECT leave_type_id, type_name, requires_document, COALESCE(is_active, 1) AS is_active FROM leave_type WHERE leave_type_id = ?', [Number(leave_type_id)]);
  if (!typeRows.length) {
    return res.status(400).json({ error: { message: 'Invalid leave type selected.' } });
  }
  const leaveType = typeRows[0];

  if (leaveType.is_active === 0) {
    return res.status(400).json({ error: { message: `Leave type '${leaveType.type_name}' is currently disabled.` } });
  }

  if (leaveType.requires_document && days > 2 && !document_data && !document_name) {
    return res.status(400).json({ error: { message: `${leaveType.type_name} for more than 2 days requires a medical certificate or supporting document.` } });
  }

  const reqYear = new Date(start_date).getFullYear();

  // Check overlapping active requests (PENDING or APPROVED)
  const overlapping = await query(`
    SELECT leave_request_id, start_date, end_date, status 
    FROM leave_request 
    WHERE faculty_id = ? 
      AND status IN ('PENDING', 'APPROVED')
      AND start_date <= ? AND end_date >= ?
  `, [faculty_id, end_date, start_date]);

  if (overlapping.length > 0) {
    const o = overlapping[0];
    const sDate = String(o.start_date).slice(0, 10);
    const eDate = String(o.end_date).slice(0, 10);
    return res.status(400).json({ 
      error: { message: `You already have an active leave request (${o.status}) from ${sDate} to ${eDate} overlapping with these dates.` } 
    });
  }

  // Check balance availability
  const balanceRows = await query(`
    SELECT 
      days_remaining,
      COALESCE((
        SELECT SUM(days_requested) 
        FROM leave_request 
        WHERE faculty_id = ? 
          AND leave_type_id = ? 
          AND YEAR(start_date) = ? 
          AND status = 'PENDING'
      ), 0) AS pending_days
    FROM leave_balance 
    WHERE faculty_id = ? AND leave_type_id = ? AND balance_year = ?
  `, [faculty_id, Number(leave_type_id), reqYear, faculty_id, Number(leave_type_id), reqYear]);

  if (!balanceRows.length) {
    return res.status(400).json({ error: { message: `No leave balance record found for academic year ${reqYear}.` } });
  }

  const available = Number(balanceRows[0].days_remaining) - Number(balanceRows[0].pending_days);
  if (days > available) {
    return res.status(400).json({ 
      error: { message: `Insufficient leave balance. You currently have ${Math.max(0, available)} day(s) available for ${leaveType.type_name}, but requested ${days} day(s).` } 
    });
  }

  // Handle document upload if provided as base64
  let savedDocPath = null;
  let savedDocName = null;
  if (document_data && document_name) {
    try {
      const ext = path.extname(document_name).toLowerCase();
      const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
      if (!allowedExts.includes(ext)) {
        return res.status(400).json({ error: { message: 'Invalid document format. Allowed formats: PDF, PNG, JPG, DOC, DOCX' } });
      }

      const safeBase64 = document_data.includes('base64,') ? document_data.split('base64,')[1] : document_data;
      const buffer = Buffer.from(safeBase64, 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: { message: 'Document size must be less than 5MB.' } });
      }

      const uniqueFilename = `leave_${faculty_id}_${Date.now()}${ext}`;
      const filePath = path.join(UPLOADS_DIR, uniqueFilename);
      fs.writeFileSync(filePath, buffer);
      savedDocPath = `/uploads/leave_documents/${uniqueFilename}`;
      savedDocName = document_name.slice(0, 150);
    } catch (e) {
      console.error('File upload error:', e);
      return res.status(500).json({ error: { message: 'Failed to save supporting document.' } });
    }
  }

  const insertResult = await query(`
    INSERT INTO leave_request (faculty_id, leave_type_id, start_date, end_date, days_requested, reason, contact_info, document_name, document_path, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `, [faculty_id, Number(leave_type_id), start_date, end_date, days, reason.trim(), contact_info ? contact_info.trim() : null, savedDocName, savedDocPath]);

  const leaveRequestId = insertResult.insertId;

  // Notification creation
  try {
    await query(`
      INSERT INTO app_notification (user_id, title, message, type, link)
      VALUES (?, ?, ?, 'LEAVE_SUBMITTED', '/faculty-b')
    `, [req.user.id, 'Leave Request Submitted', `Your request for ${days} day(s) of ${leaveType.type_name} from ${start_date} to ${end_date} has been submitted.`]);

    const adminUsers = await query('SELECT user_id FROM app_user WHERE role_id = (SELECT role_id FROM role WHERE role_name = "ADMIN")');
    for (const admin of adminUsers) {
      await query(`
        INSERT INTO app_notification (user_id, title, message, type, link)
        VALUES (?, ?, ?, 'LEAVE_SUBMITTED', '/faculty-b')
      `, [admin.user_id, 'New Leave Request Received', `${facultyMember.first_name} ${facultyMember.last_name} (${facultyMember.employee_code}) submitted a ${days}-day ${leaveType.type_name} request.`]);
    }
  } catch (notifErr) {
    console.error('Notification error:', notifErr);
  }

  ok(res, { leave_request_id: leaveRequestId, message: 'Leave request submitted successfully.' }, 201);
}));

// -------------------------------------------------------------
// 4. APPROVE / REJECT LEAVE REQUEST (Admin Transaction & Balance Sync)
// -------------------------------------------------------------
router.post('/leave-requests/:id/decision', authenticate, allow('ADMIN'), asyncRoute(async (req, res) => {
  const requestId = Number(req.params.id);
  const { approve, remarks } = req.body || {};

  if (!approve && (!remarks || !remarks.trim())) {
    return res.status(400).json({ error: { message: 'A rejection reason is mandatory when rejecting a leave request.' } });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock request row
    const [requestRows] = await conn.query(`
      SELECT 
        lr.leave_request_id,
        lr.faculty_id,
        lr.leave_type_id,
        lr.start_date,
        lr.end_date,
        lr.days_requested,
        lr.status,
        YEAR(lr.start_date) AS req_year,
        lt.type_name,
        u.user_id AS faculty_user_id
      FROM leave_request lr
      JOIN leave_type lt ON lt.leave_type_id = lr.leave_type_id
      LEFT JOIN app_user u ON u.faculty_id = lr.faculty_id
      WHERE lr.leave_request_id = ?
      FOR UPDATE
    `, [requestId]);

    if (!requestRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: { message: 'Leave request not found.' } });
    }

    const reqData = requestRows[0];
    if (reqData.status !== 'PENDING') {
      await conn.rollback();
      return res.status(400).json({ error: { message: `This leave request has already been ${reqData.status.toLowerCase()}.` } });
    }

    // Role check: Admin cannot approve their own leave application if they are linked as faculty
    if (req.user.faculty_id && req.user.faculty_id === reqData.faculty_id) {
      await conn.rollback();
      return res.status(403).json({ error: { message: 'Faculty members cannot approve their own leave requests.' } });
    }

    const decisionRemarks = remarks ? remarks.trim() : (approve ? 'Approved as per institutional guidelines.' : 'Rejected.');

    if (approve) {
      // Prevent conflicting approved leave requests for the same faculty member
      const [conflicts] = await conn.query(`
        SELECT leave_request_id FROM leave_request
        WHERE faculty_id = ? AND status = 'APPROVED' AND leave_request_id != ?
          AND start_date <= ? AND end_date >= ?
      `, [reqData.faculty_id, requestId, reqData.end_date, reqData.start_date]);

      if (conflicts.length > 0) {
        await conn.rollback();
        return res.status(400).json({ error: { message: 'This faculty member already has an APPROVED leave request that overlaps these dates.' } });
      }

      // Check balance availability
      const [balanceRows] = await conn.query(`
        SELECT days_remaining 
        FROM leave_balance 
        WHERE faculty_id = ? AND leave_type_id = ? AND balance_year = ?
        FOR UPDATE
      `, [reqData.faculty_id, reqData.leave_type_id, reqData.req_year]);

      if (!balanceRows.length || Number(balanceRows[0].days_remaining) < Number(reqData.days_requested)) {
        await conn.rollback();
        return res.status(400).json({ error: { message: 'Insufficient leave balance to approve this request.' } });
      }

      // Deduct balance
      await conn.query(`
        UPDATE leave_balance 
        SET days_remaining = days_remaining - ? 
        WHERE faculty_id = ? AND leave_type_id = ? AND balance_year = ?
      `, [reqData.days_requested, reqData.faculty_id, reqData.leave_type_id, reqData.req_year]);

      // Update leave request
      await conn.query(`
        UPDATE leave_request 
        SET status = 'APPROVED', approver_remarks = ?, decided_by = ?, decided_at = NOW() 
        WHERE leave_request_id = ?
      `, [decisionRemarks, req.user.id, requestId]);

      // Record in audit log
      await conn.query(`
        INSERT INTO leave_approval (leave_request_id, action, decided_by, remarks)
        VALUES (?, 'APPROVED', ?, ?)
      `, [requestId, req.user.id, decisionRemarks]);

    } else {
      // Rejection: update status and save rejection remarks, without deducting balance
      await conn.query(`
        UPDATE leave_request 
        SET status = 'REJECTED', approver_remarks = ?, decided_by = ?, decided_at = NOW() 
        WHERE leave_request_id = ?
      `, [decisionRemarks, req.user.id, requestId]);

      await conn.query(`
        INSERT INTO leave_approval (leave_request_id, action, decided_by, remarks)
        VALUES (?, 'REJECTED', ?, ?)
      `, [requestId, req.user.id, decisionRemarks]);
    }

    await conn.commit();

    // Send notification
    if (reqData.faculty_user_id) {
      const notifTitle = approve ? 'Leave Request Approved' : 'Leave Request Rejected';
      const notifMsg = approve
        ? `Your request for ${reqData.days_requested} day(s) of ${reqData.type_name} has been approved.`
        : `Your request for ${reqData.days_requested} day(s) of ${reqData.type_name} was rejected. Reason: ${decisionRemarks}`;
      await query(`
        INSERT INTO app_notification (user_id, title, message, type, link)
        VALUES (?, ?, ?, ?, '/faculty-b')
      `, [reqData.faculty_user_id, notifTitle, notifMsg, approve ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED']);
    }

    ok(res, { success: true, status: approve ? 'APPROVED' : 'REJECTED', message: `Leave application ${approve ? 'approved' : 'rejected'} successfully.` });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

// -------------------------------------------------------------
// 5. CANCEL LEAVE REQUEST
// -------------------------------------------------------------
router.post('/leave-requests/:id/cancel', authenticate, allow('FACULTY', 'ADMIN'), asyncRoute(async (req, res) => {
  const requestId = Number(req.params.id);
  const cancelReason = req.body?.reason ? req.body.reason.trim() : 'Cancelled by user';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [requestRows] = await conn.query(`
      SELECT 
        lr.leave_request_id,
        lr.faculty_id,
        lr.leave_type_id,
        lr.start_date,
        lr.end_date,
        lr.days_requested,
        lr.status,
        YEAR(lr.start_date) AS req_year,
        lt.type_name,
        u.user_id AS faculty_user_id
      FROM leave_request lr
      JOIN leave_type lt ON lt.leave_type_id = lr.leave_type_id
      LEFT JOIN app_user u ON u.faculty_id = lr.faculty_id
      WHERE lr.leave_request_id = ?
      FOR UPDATE
    `, [requestId]);

    if (!requestRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: { message: 'Leave request not found.' } });
    }

    const reqData = requestRows[0];

    if (req.user.role === 'FACULTY' && req.user.faculty_id !== reqData.faculty_id) {
      await conn.rollback();
      return res.status(403).json({ error: { message: 'You can only cancel your own leave requests.' } });
    }

    if (reqData.status === 'CANCELLED') {
      await conn.rollback();
      return res.status(400).json({ error: { message: 'This leave request is already cancelled.' } });
    }

    if (reqData.status === 'REJECTED') {
      await conn.rollback();
      return res.status(400).json({ error: { message: 'A rejected leave request cannot be cancelled.' } });
    }

    // If it was APPROVED, restore the deducted days to the balance!
    if (reqData.status === 'APPROVED') {
      await conn.query(`
        UPDATE leave_balance 
        SET days_remaining = days_remaining + ? 
        WHERE faculty_id = ? AND leave_type_id = ? AND balance_year = ?
      `, [reqData.days_requested, reqData.faculty_id, reqData.leave_type_id, reqData.req_year]);
    }

    await conn.query(`
      UPDATE leave_request 
      SET status = 'CANCELLED', cancelled_at = NOW(), approver_remarks = CONCAT(COALESCE(approver_remarks, ''), ' [Cancelled: ', ?, ']')
      WHERE leave_request_id = ?
    `, [cancelReason, requestId]);

    await conn.query(`
      INSERT INTO leave_approval (leave_request_id, action, decided_by, remarks)
      VALUES (?, 'CANCELLED', ?, ?)
    `, [requestId, req.user.id, cancelReason]);

    await conn.commit();

    if (reqData.faculty_user_id) {
      await query(`
        INSERT INTO app_notification (user_id, title, message, type, link)
        VALUES (?, 'Leave Request Cancelled', ?, 'LEAVE_CANCELLED', '/faculty-b')
      `, [reqData.faculty_user_id, `Your ${reqData.type_name} request (${reqData.days_requested} days) has been cancelled.`]);
    }

    ok(res, { success: true, message: 'Leave request cancelled successfully. Any deducted balance has been restored.' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

// Decision History / Audit Trail
router.get('/leave-requests/:id/history', authenticate, allow('FACULTY', 'ADMIN'), asyncRoute(async (req, res) => {
  const requestId = Number(req.params.id);

  if (req.user.role === 'FACULTY') {
    const owner = await query('SELECT faculty_id FROM leave_request WHERE leave_request_id = ?', [requestId]);
    if (!owner.length || owner[0].faculty_id !== req.user.faculty_id) {
      return res.status(403).json({ error: { message: 'Access denied.' } });
    }
  }

  const history = await query(`
    SELECT 
      la.approval_id,
      la.action,
      la.remarks,
      la.created_at,
      u.username AS decided_by_username,
      r.role_name AS decided_by_role
    FROM leave_approval la
    LEFT JOIN app_user u ON u.user_id = la.decided_by
    LEFT JOIN role r ON r.role_id = u.role_id
    WHERE la.leave_request_id = ?
    ORDER BY la.created_at ASC
  `, [requestId]);

  ok(res, history);
}));

// -------------------------------------------------------------
// 6. PAYROLL MANAGEMENT (Listing, Generation, Status, Payslip)
// -------------------------------------------------------------
router.get('/payroll', authenticate, allow('FACULTY', 'ADMIN'), asyncRoute(async (req, res) => {
  const targetFacultyId = req.user.role === 'FACULTY' ? req.user.faculty_id : (req.query.faculty_id ? Number(req.query.faculty_id) : null);
  const departmentId = req.query.department_id ? Number(req.query.department_id) : null;
  const status = req.query.status ? req.query.status.trim() : null;
  const month = req.query.month ? Number(req.query.month) : null;
  const year = req.query.year ? Number(req.query.year) : null;
  const search = req.query.search ? req.query.search.trim() : null;

  let sql = `
    SELECT 
      p.payroll_id,
      p.faculty_id,
      p.employee_code,
      p.faculty_name,
      p.department_name,
      f.department_id,
      p.period_start,
      p.period_end,
      p.month_year,
      p.basic_pay,
      p.allowances,
      p.gross_pay,
      p.pf_amount,
      p.professional_tax,
      p.lop_amount,
      p.total_deductions,
      p.net_pay,
      p.payment_status,
      p.payment_date,
      p.generated_at
    FROM vw_payroll_summary p
    JOIN faculty f ON f.faculty_id = p.faculty_id
    WHERE 1=1
  `;
  const params = [];

  if (targetFacultyId) {
    sql += ' AND p.faculty_id = ?';
    params.push(targetFacultyId);
  }

  if (departmentId) {
    sql += ' AND f.department_id = ?';
    params.push(departmentId);
  }

  if (status) {
    sql += ' AND p.payment_status = ?';
    params.push(status);
  }

  if (month) {
    sql += ' AND MONTH(p.period_start) = ?';
    params.push(month);
  }

  if (year) {
    sql += ' AND YEAR(p.period_start) = ?';
    params.push(year);
  }

  if (search) {
    sql += ' AND (p.faculty_name LIKE ? OR p.employee_code LIKE ? OR CAST(p.faculty_id AS CHAR) = ? OR CAST(p.payroll_id AS CHAR) = ?)';
    const term = `%${search}%`;
    params.push(term, term, search, search);
  }

  sql += ' ORDER BY p.period_start DESC, p.faculty_id ASC';
  const rows = await query(sql, params);
  ok(res, rows);
}));

// Update payroll payment status (Admin only)
router.put('/payroll/:id/status', authenticate, allow('ADMIN'), asyncRoute(async (req, res) => {
  const payrollId = Number(req.params.id);
  const { payment_status, payment_date } = req.body || {};

  if (!['PAID', 'PROCESSED', 'PENDING'].includes(payment_status)) {
    return res.status(400).json({ error: { message: 'Invalid payment status. Must be PAID, PROCESSED, or PENDING.' } });
  }

  const existing = await query('SELECT payroll_id FROM payroll WHERE payroll_id = ?', [payrollId]);
  if (!existing.length) {
    return res.status(404).json({ error: { message: 'Payroll record not found.' } });
  }

  let finalPaymentDate = payment_date || null;
  if (payment_status === 'PAID' && !finalPaymentDate) {
    finalPaymentDate = new Date().toISOString().slice(0, 10);
  }

  await query(`
    UPDATE payroll 
    SET payment_status = ?, payment_date = ?
    WHERE payroll_id = ?
  `, [payment_status, finalPaymentDate, payrollId]);

  ok(res, { success: true, message: `Payroll status updated to ${payment_status}.` });
}));

// Generate payroll record (Admin only - prevents duplicates)
router.post('/payroll/generate', authenticate, allow('ADMIN'), asyncRoute(async (req, res) => {
  const { faculty_id, month, year, status } = req.body || {};

  const targetMonth = Number(month);
  const targetYear = Number(year);

  if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12 || isNaN(targetYear) || targetYear < 2000) {
    return res.status(400).json({ error: { message: 'Valid month (1-12) and year are required.' } });
  }

  // Calculate period start and period end dates
  const startDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(targetYear, targetMonth, 0).getDate();
  const endDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // Find target faculties
  let targetFaculties = [];
  if (faculty_id && faculty_id !== 'ALL') {
    const f = await query('SELECT faculty_id FROM faculty WHERE faculty_id = ? AND status = "ACTIVE"', [Number(faculty_id)]);
    if (!f.length) return res.status(404).json({ error: { message: 'Active faculty not found.' } });
    targetFaculties = f;
  } else {
    targetFaculties = await query('SELECT faculty_id FROM faculty WHERE status = "ACTIVE"');
  }

  let generatedCount = 0;
  let skippedCount = 0;

  for (const fac of targetFaculties) {
    // Check if duplicate exists for this faculty and period
    const existing = await query('SELECT payroll_id FROM payroll WHERE faculty_id = ? AND period_start = ?', [fac.faculty_id, startDateStr]);
    if (existing.length > 0) {
      skippedCount++;
      continue;
    }

    // Get basic pay from salary_structure
    const ss = await query('SELECT basic_pay FROM salary_structure WHERE faculty_id = ? ORDER BY effective_from DESC LIMIT 1', [fac.faculty_id]);
    const basicPay = ss.length > 0 ? Number(ss[0].basic_pay) : (50000 + fac.faculty_id * 1000);

    // Standard institutional allowances: 10% DA, 8% HRA, 5% Special Allowance
    const da = Math.round(basicPay * 0.10);
    const hra = Math.round(basicPay * 0.08);
    const special = Math.round(basicPay * 0.05);
    const totalAllowances = da + hra + special;
    const grossPay = basicPay + totalAllowances;

    // Deductions: 12% PF, 200 PT, 0 LOP
    const pf = Math.round(basicPay * 0.12);
    const pt = 200;
    const lop = 0;
    const netPay = grossPay - (pf + pt + lop);

    const initialStatus = status === 'PAID' ? 'PAID' : (status === 'PROCESSED' ? 'PROCESSED' : 'PENDING');
    const paymentDate = initialStatus === 'PAID' ? endDateStr : null;

    await query(`
      INSERT INTO payroll (
        faculty_id, period_start, period_end, basic_pay, allowances, gross_pay, pf_amount, professional_tax, lop_amount, net_pay, payment_status, payment_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [fac.faculty_id, startDateStr, endDateStr, basicPay, totalAllowances, grossPay, pf, pt, lop, netPay, initialStatus, paymentDate]);

    generatedCount++;
  }

  ok(res, {
    success: true,
    message: `Payroll generation complete. ${generatedCount} record(s) created, ${skippedCount} duplicate(s) skipped.`,
    generated: generatedCount,
    skipped: skippedCount
  });
}));

// Payslip details payload
router.get('/payroll/:id/payslip', authenticate, allow('FACULTY', 'ADMIN'), asyncRoute(async (req, res) => {
  const payrollId = Number(req.params.id);

  const rows = await query(`
    SELECT 
      p.*,
      DATE_FORMAT(p.period_start, '%M %Y') AS month_year,
      f.employee_code,
      CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
      f.email AS faculty_email,
      d.department_name,
      des.designation_name,
      fp.date_of_joining,
      fp.office_room
    FROM payroll p
    JOIN faculty f ON f.faculty_id = p.faculty_id
    LEFT JOIN department d ON d.department_id = f.department_id
    LEFT JOIN faculty_profile fp ON fp.faculty_id = f.faculty_id
    LEFT JOIN designation des ON des.designation_id = fp.designation_id
    WHERE p.payroll_id = ?
  `, [payrollId]);

  if (!rows.length) {
    return res.status(404).json({ error: { message: 'Payroll record not found.' } });
  }

  const pr = rows[0];

  if (req.user.role === 'FACULTY' && req.user.faculty_id !== pr.faculty_id) {
    return res.status(403).json({ error: { message: 'Access denied.' } });
  }

  const basic = Number(pr.basic_pay);
  const allowances = Number(pr.allowances || (pr.gross_pay - pr.basic_pay));
  const da = Math.round(basic * 0.10);
  const hra = Math.round(basic * 0.08);
  const specialAllowance = Math.max(0, allowances - da - hra);

  const payslip = {
    payroll_id: pr.payroll_id,
    institution: {
      name: 'NATIONAL INSTITUTE OF ENGINEERING & TECHNOLOGY',
      sub_title: 'Affiliated to State Technical University · Approved by AICTE',
      address: 'University Campus, Knowledge Park IV, Greater Noida, UP - 201310',
      payslip_title: `PAYSLIP FOR THE MONTH OF ${pr.month_year || 'CURRENT PERIOD'}`
    },
    employee: {
      faculty_id: pr.faculty_id,
      employee_code: pr.employee_code,
      faculty_name: pr.faculty_name,
      department_name: pr.department_name || 'Academics',
      designation_name: pr.designation_name || 'Assistant Professor',
      date_of_joining: pr.date_of_joining,
      email: pr.faculty_email
    },
    period: {
      period_start: pr.period_start,
      period_end: pr.period_end,
      month_year: pr.month_year,
      payment_date: pr.payment_date || pr.generated_at,
      payment_status: pr.payment_status || 'PAID'
    },
    earnings: [
      { label: 'Basic Salary', amount: basic },
      { label: 'Dearness Allowance (DA 10%)', amount: da },
      { label: 'House Rent Allowance (HRA 8%)', amount: hra },
      { label: 'Special & Academic Allowances', amount: specialAllowance },
      { label: 'Gross Salary', amount: Number(pr.gross_pay), is_total: true }
    ],
    deductions: [
      { label: 'Provident Fund (PF 12%)', amount: Number(pr.pf_amount) },
      { label: 'Professional Tax (PT)', amount: Number(pr.professional_tax) },
      { label: 'Loss of Pay / Unpaid Leave (LOP)', amount: Number(pr.lop_amount) },
      { label: 'Total Deductions', amount: Number(pr.pf_amount) + Number(pr.professional_tax) + Number(pr.lop_amount), is_total: true }
    ],
    summary: {
      gross_salary: Number(pr.gross_pay),
      total_deductions: Number(pr.pf_amount) + Number(pr.professional_tax) + Number(pr.lop_amount),
      net_salary: Number(pr.net_pay),
      net_salary_words: numberToWordsINR(pr.net_pay),
      currency: 'INR (₹)'
    }
  };

  ok(res, payslip);
}));

// -------------------------------------------------------------
// 7. SALARY STRUCTURE & SALARY CHANGE HISTORY (Admin only)
// -------------------------------------------------------------
router.get('/salary-structures', authenticate, allow('ADMIN'), asyncRoute(async (req, res) => {
  const rows = await query(`
    SELECT 
      ss.salary_structure_id,
      ss.faculty_id,
      f.employee_code,
      CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
      d.department_name,
      ss.basic_pay,
      ss.effective_from,
      ss.effective_to
    FROM salary_structure ss
    JOIN faculty f ON f.faculty_id = ss.faculty_id
    LEFT JOIN department d ON d.department_id = f.department_id
    ORDER BY f.faculty_id ASC
  `);
  ok(res, rows);
}));

router.post('/salary-structures', authenticate, allow('ADMIN'), asyncRoute(async (req, res) => {
  const { faculty_id, basic_pay, effective_from } = req.body || {};

  if (!faculty_id || basic_pay === undefined) {
    return res.status(400).json({ error: { message: 'Faculty ID and basic pay are required.' } });
  }

  const pay = Number(basic_pay);
  if (isNaN(pay) || pay <= 0) {
    return res.status(400).json({ error: { message: 'Basic pay must be a positive number.' } });
  }

  const effectiveDate = effective_from || new Date().toISOString().slice(0, 10);

  // Check if structure exists
  const existing = await query('SELECT salary_structure_id FROM salary_structure WHERE faculty_id = ?', [faculty_id]);

  if (existing.length > 0) {
    // Update existing (this fires trg_salary_structure_after_update which logs to salary_change_log!)
    await query(`
      UPDATE salary_structure 
      SET basic_pay = ?, effective_from = ?
      WHERE faculty_id = ?
    `, [pay, effectiveDate, faculty_id]);
  } else {
    await query(`
      INSERT INTO salary_structure (faculty_id, basic_pay, effective_from)
      VALUES (?, ?, ?)
    `, [faculty_id, pay, effectiveDate]);
  }

  ok(res, { success: true, message: 'Salary structure updated successfully.' });
}));

router.get('/salary-history', authenticate, allow('ADMIN'), asyncRoute(async (req, res) => {
  const rows = await query(`
    SELECT 
      scl.salary_change_id,
      scl.salary_structure_id,
      ss.faculty_id,
      f.employee_code,
      CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
      d.department_name,
      scl.old_basic_pay,
      scl.new_basic_pay,
      scl.changed_at
    FROM salary_change_log scl
    JOIN salary_structure ss ON ss.salary_structure_id = scl.salary_structure_id
    JOIN faculty f ON f.faculty_id = ss.faculty_id
    LEFT JOIN department d ON d.department_id = f.department_id
    ORDER BY scl.changed_at DESC
    LIMIT 100
  `);
  ok(res, rows);
}));

// -------------------------------------------------------------
// 8. IN-APP NOTIFICATIONS
// -------------------------------------------------------------
router.get('/notifications', authenticate, asyncRoute(async (req, res) => {
  const notifs = await query(`
    SELECT * FROM app_notification 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 25
  `, [req.user.id]);

  const unreadCountResult = await query(`
    SELECT COUNT(*) AS count 
    FROM app_notification 
    WHERE user_id = ? AND is_read = 0
  `, [req.user.id]);

  ok(res, {
    notifications: notifs,
    unread_count: unreadCountResult[0]?.count || 0
  });
}));

router.post('/notifications/:id/read', authenticate, asyncRoute(async (req, res) => {
  await query('UPDATE app_notification SET is_read = 1 WHERE notification_id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  ok(res, { success: true });
}));

router.post('/notifications/read-all', authenticate, asyncRoute(async (req, res) => {
  await query('UPDATE app_notification SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  ok(res, { success: true });
}));

module.exports = router;
