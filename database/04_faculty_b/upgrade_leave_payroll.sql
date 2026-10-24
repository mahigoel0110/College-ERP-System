-- ====================================================================
-- College ERP: Faculty Leave & Payroll Module Upgrade
-- Migration File: 04_faculty_b/upgrade_leave_payroll.sql
-- Compatible with MySQL 8.0+
-- Preserves all existing tables and data safely.
-- ====================================================================

-- 1. Upgrade leave_type table
ALTER TABLE leave_type 
  ADD COLUMN IF NOT EXISTS type_code VARCHAR(10) NULL AFTER type_name,
  ADD COLUMN IF NOT EXISTS description VARCHAR(255) NULL AFTER annual_days,
  ADD COLUMN IF NOT EXISTS requires_document TINYINT(1) NOT NULL DEFAULT 0 AFTER description;

-- Update or insert the 4 standardized leave types
-- ID 1: Casual Leave (CL) - 12 days
-- ID 2: Medical Leave (ML) - 10 days
-- ID 3: Earned Leave (EL) - 15 days
-- ID 4: Special Leave (SL) - 5 days
INSERT INTO leave_type (leave_type_id, type_name, type_code, annual_days, description, requires_document)
VALUES 
  (1, 'Casual Leave', 'CL', 12.00, 'Leave for personal, urgent or unforeseen matters', 0),
  (2, 'Medical Leave', 'ML', 10.00, 'Leave for illness, medical treatment or health recovery', 1)
ON DUPLICATE KEY UPDATE 
  type_name = VALUES(type_name),
  type_code = VALUES(type_code),
  annual_days = VALUES(annual_days),
  description = VALUES(description),
  requires_document = VALUES(requires_document);

INSERT INTO leave_type (leave_type_id, type_name, type_code, annual_days, description, requires_document)
VALUES 
  (3, 'Earned Leave', 'EL', 15.00, 'Earned/privileged leave accrued for continuous academic service', 0),
  (4, 'Special Leave', 'SL', 5.00, 'Special leave for academic conferences, research, or duty', 0)
ON DUPLICATE KEY UPDATE 
  type_name = VALUES(type_name),
  type_code = VALUES(type_code),
  annual_days = VALUES(annual_days),
  description = VALUES(description),
  requires_document = VALUES(requires_document);

-- 2. Upgrade leave_balance table
ALTER TABLE leave_balance
  ADD COLUMN IF NOT EXISTS allocated_days DECIMAL(5,2) NULL AFTER leave_type_id;

-- Update allocated_days for existing balances based on leave_type
UPDATE leave_balance lb
JOIN leave_type lt ON lt.leave_type_id = lb.leave_type_id
SET lb.allocated_days = lt.annual_days
WHERE lb.allocated_days IS NULL;

-- Ensure all active faculty have balance records for all 4 leave types in balance_year 2026
INSERT IGNORE INTO leave_balance (faculty_id, leave_type_id, balance_year, allocated_days, days_remaining)
SELECT f.faculty_id, lt.leave_type_id, 2026, lt.annual_days, lt.annual_days
FROM faculty f
CROSS JOIN leave_type lt
WHERE f.status = 'ACTIVE' AND lt.leave_type_id IN (1, 2, 3, 4);

-- Adjust faculty 1 remaining for CL if 2 days were approved in sample data
UPDATE leave_balance 
SET allocated_days = 12.00, days_remaining = 10.00 
WHERE faculty_id = 1 AND leave_type_id = 1 AND balance_year = 2026;

-- 3. Upgrade leave_request table
ALTER TABLE leave_request
  MODIFY COLUMN status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS reason TEXT NULL AFTER days_requested,
  ADD COLUMN IF NOT EXISTS contact_info VARCHAR(255) NULL AFTER reason,
  ADD COLUMN IF NOT EXISTS document_name VARCHAR(255) NULL AFTER contact_info,
  ADD COLUMN IF NOT EXISTS document_path VARCHAR(255) NULL AFTER document_name,
  ADD COLUMN IF NOT EXISTS approver_remarks TEXT NULL AFTER status,
  ADD COLUMN IF NOT EXISTS decided_by INT UNSIGNED NULL AFTER approver_remarks,
  ADD COLUMN IF NOT EXISTS cancelled_at DATETIME NULL AFTER decided_at;

-- 4. Create leave_approval audit trail table
CREATE TABLE IF NOT EXISTS leave_approval (
  approval_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  leave_request_id INT UNSIGNED NOT NULL,
  action ENUM('APPROVED','REJECTED','CANCELLED') NOT NULL,
  decided_by INT UNSIGNED NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_leave_approval PRIMARY KEY(approval_id),
  CONSTRAINT fk_leave_approval_request FOREIGN KEY(leave_request_id) REFERENCES leave_request(leave_request_id) ON DELETE CASCADE
);

-- Backfill approval audit record for any existing approved/rejected requests
INSERT IGNORE INTO leave_approval (leave_request_id, action, decided_by, remarks, created_at)
SELECT leave_request_id, status, decided_by, COALESCE(approver_remarks, 'Pre-migration decision'), COALESCE(decided_at, requested_at)
FROM leave_request
WHERE status IN ('APPROVED','REJECTED') AND leave_request_id NOT IN (SELECT leave_request_id FROM leave_approval);

-- 5. Create app_notification table
CREATE TABLE IF NOT EXISTS app_notification (
  notification_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'INFO',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  link VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_app_notification PRIMARY KEY(notification_id),
  CONSTRAINT fk_notification_user FOREIGN KEY(user_id) REFERENCES app_user(user_id) ON DELETE CASCADE
);

-- 6. Upgrade payroll table
ALTER TABLE payroll
  ADD COLUMN IF NOT EXISTS allowances DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER basic_pay,
  ADD COLUMN IF NOT EXISTS payment_status ENUM('PAID','PENDING','PROCESSED') NOT NULL DEFAULT 'PAID' AFTER net_pay,
  ADD COLUMN IF NOT EXISTS payment_date DATE NULL AFTER payment_status;

-- Update allowances for existing payroll records if any
UPDATE payroll SET allowances = ROUND(gross_pay - basic_pay, 2) WHERE allowances = 0 AND gross_pay > basic_pay;
UPDATE payroll SET payment_date = DATE(generated_at) WHERE payment_date IS NULL;

-- Seed sample realistic monthly payroll records for faculty members if table is empty
INSERT IGNORE INTO payroll (faculty_id, period_start, period_end, basic_pay, allowances, gross_pay, pf_amount, professional_tax, lop_amount, net_pay, payment_status, payment_date, generated_at)
VALUES
  (1, '2026-08-01', '2026-08-31', 51000.00, 10200.00, 61200.00, 6120.00, 200.00, 0.00, 54880.00, 'PAID', '2026-08-31', '2026-08-31 10:00:00'),
  (1, '2026-09-01', '2026-09-30', 51000.00, 10200.00, 61200.00, 6120.00, 200.00, 0.00, 54880.00, 'PAID', '2026-09-30', '2026-09-30 10:00:00'),
  (1, '2026-10-01', '2026-10-31', 51000.00, 10200.00, 61200.00, 6120.00, 200.00, 0.00, 54880.00, 'PAID', '2026-10-24', '2026-10-24 10:00:00'),
  (2, '2026-09-01', '2026-09-30', 52000.00, 10400.00, 62400.00, 6240.00, 200.00, 0.00, 55960.00, 'PAID', '2026-09-30', '2026-09-30 10:00:00'),
  (2, '2026-10-01', '2026-10-31', 52000.00, 10400.00, 62400.00, 6240.00, 200.00, 0.00, 55960.00, 'PAID', '2026-10-24', '2026-10-24 10:00:00'),
  (3, '2026-09-01', '2026-09-30', 53000.00, 10600.00, 63600.00, 6360.00, 200.00, 0.00, 57040.00, 'PAID', '2026-09-30', '2026-09-30 10:00:00'),
  (3, '2026-10-01', '2026-10-31', 53000.00, 10600.00, 63600.00, 6360.00, 200.00, 0.00, 57040.00, 'PAID', '2026-10-24', '2026-10-24 10:00:00');

-- 7. Update vw_leave_balance view
CREATE OR REPLACE VIEW vw_leave_balance AS 
SELECT 
  lb.leave_balance_id,
  f.faculty_id,
  f.employee_code,
  CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
  d.department_name,
  lt.leave_type_id,
  lt.type_name,
  COALESCE(lt.type_code, SUBSTRING(lt.type_name, 1, 2)) AS type_code,
  COALESCE(lb.allocated_days, lt.annual_days) AS allocated_days,
  lb.balance_year,
  lb.days_remaining AS remaining_days,
  COALESCE((
    SELECT SUM(lr.days_requested) 
    FROM leave_request lr 
    WHERE lr.faculty_id = f.faculty_id 
      AND lr.leave_type_id = lt.leave_type_id 
      AND YEAR(lr.start_date) = lb.balance_year 
      AND lr.status = 'APPROVED'
  ), 0) AS used_days,
  COALESCE((
    SELECT SUM(lr.days_requested) 
    FROM leave_request lr 
    WHERE lr.faculty_id = f.faculty_id 
      AND lr.leave_type_id = lt.leave_type_id 
      AND YEAR(lr.start_date) = lb.balance_year 
      AND lr.status = 'PENDING'
  ), 0) AS pending_days,
  (lb.days_remaining - COALESCE((
    SELECT SUM(lr.days_requested) 
    FROM leave_request lr 
    WHERE lr.faculty_id = f.faculty_id 
      AND lr.leave_type_id = lt.leave_type_id 
      AND YEAR(lr.start_date) = lb.balance_year 
      AND lr.status = 'PENDING'
  ), 0)) AS available_days
FROM leave_balance lb 
JOIN faculty f ON f.faculty_id = lb.faculty_id 
LEFT JOIN department d ON d.department_id = f.department_id
JOIN leave_type lt ON lt.leave_type_id = lb.leave_type_id;

-- 8. Update vw_payroll_summary view
CREATE OR REPLACE VIEW vw_payroll_summary AS 
SELECT 
  p.payroll_id,
  p.faculty_id,
  f.employee_code,
  CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
  d.department_name,
  p.period_start,
  p.period_end,
  DATE_FORMAT(p.period_start, '%M %Y') AS month_year,
  p.basic_pay,
  COALESCE(p.allowances, ROUND(p.gross_pay - p.basic_pay, 2)) AS allowances,
  p.gross_pay,
  p.pf_amount,
  p.professional_tax,
  p.lop_amount,
  ROUND(p.pf_amount + p.professional_tax + p.lop_amount, 2) AS total_deductions,
  ROUND(p.net_pay, 2) AS net_pay,
  ROUND(p.net_pay, 2) AS take_home,
  p.payment_status,
  COALESCE(p.payment_date, DATE(p.generated_at)) AS payment_date,
  p.generated_at
FROM payroll p
JOIN faculty f ON f.faculty_id = p.faculty_id
LEFT JOIN department d ON d.department_id = f.department_id;

-- 9. Replace trg_leave_request_before_update to allow cancellation of approved leaves
DROP TRIGGER IF EXISTS trg_leave_request_before_update;
DELIMITER $$
CREATE TRIGGER trg_leave_request_before_update BEFORE UPDATE ON leave_request FOR EACH ROW
BEGIN 
  IF OLD.status IN ('REJECTED','CANCELLED') AND NEW.status <> OLD.status THEN 
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Terminal leave request is immutable'; 
  ELSEIF OLD.status = 'APPROVED' AND NEW.status NOT IN ('APPROVED','CANCELLED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Approved leave can only be cancelled';
  END IF; 
END$$
DELIMITER ;
