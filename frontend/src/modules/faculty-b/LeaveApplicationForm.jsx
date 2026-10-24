import { useState, useEffect } from 'react';

export default function LeaveApplicationForm({ leaveTypes = [], balances = [], onSubmit, busy = false }) {
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysRequested, setDaysRequested] = useState(1);
  const [reason, setReason] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [documentBase64, setDocumentBase64] = useState('');
  const [validationError, setValidationError] = useState('');

  // Set default leave type when list loads
  useEffect(() => {
    if (leaveTypes.length > 0 && !leaveTypeId) {
      setLeaveTypeId(String(leaveTypes[0].leave_type_id));
    }
  }, [leaveTypes, leaveTypeId]);

  // Selected leave type & balance
  const selectedType = leaveTypes.find(t => String(t.leave_type_id) === String(leaveTypeId));
  const selectedBalance = balances.find(b => String(b.leave_type_id) === String(leaveTypeId));
  const availableDays = selectedBalance 
    ? (Number(selectedBalance.available_days) ?? (Number(selectedBalance.remaining_days) - Number(selectedBalance.pending_days || 0)))
    : null;

  // Auto-calculate days requested on date changes
  useEffect(() => {
    if (!startDate || !endDate) {
      setValidationError('');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setValidationError('End date cannot be earlier than start date.');
      setDaysRequested(0);
      return;
    }

    let workingDays = 0;
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() !== 0) { // Sunday excluded by default
        workingDays++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    if (workingDays === 0) workingDays = 1;

    setDaysRequested(workingDays);
    setValidationError('');

    if (availableDays !== null && workingDays > availableDays) {
      setValidationError(`Days requested (${workingDays}) exceed remaining available balance (${Math.max(0, availableDays)} days).`);
    }
  }, [startDate, endDate, availableDays]);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setDocumentFile(null);
      setDocumentBase64('');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setValidationError('File size exceeds 5MB limit.');
      e.target.value = '';
      return;
    }

    setDocumentFile(file);
    const reader = new FileReader();
    reader.onload = () => setDocumentBase64(reader.result);
    reader.readAsDataURL(file);
  }

  function handleReset() {
    setStartDate('');
    setEndDate('');
    setDaysRequested(1);
    setReason('');
    setDocumentFile(null);
    setDocumentBase64('');
    setValidationError('');
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!leaveTypeId || !startDate || !endDate || !reason.trim()) {
      setValidationError('Please fill in all mandatory fields.');
      return;
    }

    if (daysRequested <= 0) {
      setValidationError('Number of days must be greater than zero.');
      return;
    }

    if (availableDays !== null && daysRequested > availableDays) {
      setValidationError(`Insufficient leave balance. You have ${Math.max(0, availableDays)} day(s) available.`);
      return;
    }

    if (selectedType?.requires_document && daysRequested > 2 && !documentFile) {
      setValidationError(`Supporting document is required for ${selectedType.type_name} exceeding 2 days.`);
      return;
    }

    onSubmit({
      leave_type_id: Number(leaveTypeId),
      start_date: startDate,
      end_date: endDate,
      days_requested: Number(daysRequested),
      reason: reason.trim(),
      contact_info: '',
      document_name: documentFile ? documentFile.name : null,
      document_data: documentBase64 || null
    });
  }

  return (
    <div className="erp-form-box mb-4">
      <h3 className="erp-subheading border-bottom pb-2 mb-3">Apply for Leave</h3>

      <form onSubmit={handleSubmit}>
        <div className="erp-form-row">
          {/* Leave Type */}
          <div className="erp-form-group">
            <label className="erp-label" htmlFor="leave-type-select">
              Leave Type <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id="leave-type-select"
              className="erp-select"
              required
              value={leaveTypeId}
              onChange={e => setLeaveTypeId(e.target.value)}
            >
              {leaveTypes.map(t => {
                const b = balances.find(item => String(item.leave_type_id) === String(t.leave_type_id));
                const avail = b ? (Number(b.available_days) ?? (Number(b.remaining_days) - Number(b.pending_days || 0))) : t.annual_days;
                return (
                  <option key={t.leave_type_id} value={t.leave_type_id}>
                    {t.type_name} (Remaining: {avail})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Start Date */}
          <div className="erp-form-group">
            <label className="erp-label" htmlFor="leave-start-date">
              Start Date <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="leave-start-date"
              type="date"
              className="erp-input"
              required
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div className="erp-form-group">
            <label className="erp-label" htmlFor="leave-end-date">
              End Date <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="leave-end-date"
              type="date"
              className="erp-input"
              required
              min={startDate || undefined}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          {/* Number of Days */}
          <div className="erp-form-group">
            <label className="erp-label" htmlFor="leave-days-count">
              Number of Days
            </label>
            <input
              id="leave-days-count"
              type="number"
              step="0.5"
              min="0.5"
              className="erp-input"
              readOnly
              value={daysRequested}
            />
          </div>
        </div>

        {/* Reason for leave */}
        <div className="erp-form-group mb-3">
          <label className="erp-label" htmlFor="leave-reason-text">
            Reason <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            id="leave-reason-text"
            className="erp-textarea"
            rows="2"
            required
            minLength={5}
            maxLength={500}
            placeholder="Enter reason for leave"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>

        {/* Supporting Document */}
        <div className="erp-form-group mb-3">
          <label className="erp-label" htmlFor="leave-doc-file">
            Supporting Document {selectedType?.requires_document && <span className="text-muted fw-normal">(Required for medical leave &gt; 2 days)</span>}
          </label>
          <input
            id="leave-doc-file"
            type="file"
            className="erp-input"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            onChange={handleFileChange}
          />
        </div>

        {/* Validation message plain text */}
        {validationError && (
          <div className="mb-3" style={{ color: '#dc2626', fontSize: '13px' }}>
            {validationError}
          </div>
        )}

        {/* Form buttons */}
        <div className="d-flex gap-2">
          <button
            type="submit"
            className="erp-btn erp-btn-primary"
            disabled={busy || (availableDays !== null && daysRequested > availableDays)}
          >
            {busy ? 'Submitting…' : 'Submit Request'}
          </button>
          <button
            type="button"
            className="erp-btn erp-btn-secondary"
            onClick={handleReset}
            disabled={busy}
          >
            Reset Form
          </button>
        </div>
      </form>
    </div>
  );
}
