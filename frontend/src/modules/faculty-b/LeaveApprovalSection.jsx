import { useState } from 'react';

export default function LeaveApprovalSection({ requests = [], onDecision, loading = false }) {
  const [selectedReq, setSelectedReq] = useState(null);
  const [decisionType, setDecisionType] = useState('APPROVE');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  const formatDate = d => {
    if (!d) return '—';
    const parsed = new Date(d);
    return isNaN(parsed) ? '—' : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  function openDecisionModal(req, type) {
    setSelectedReq(req);
    setDecisionType(type);
    setRemarks(type === 'APPROVE' ? 'Approved as per college regulations.' : '');
    setError('');
  }

  async function handleDecisionSubmit(e) {
    e.preventDefault();
    if (!selectedReq) return;

    if (decisionType === 'REJECT' && (!remarks || !remarks.trim())) {
      setError('Please provide remarks explaining the reason for rejection.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onDecision(selectedReq.leave_request_id, decisionType === 'APPROVE', remarks.trim());
      setSelectedReq(null);
    } catch (err) {
      setError(err.message || 'Error recording decision.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="erp-module-container">
      <h3 className="erp-subheading mb-3">Pending Leave Applications</h3>

      <div className="table-responsive">
        <table className="erp-table">
          <thead>
            <tr>
              <th scope="col">Request ID</th>
              <th scope="col">Faculty Name</th>
              <th scope="col">Department</th>
              <th scope="col">Leave Type</th>
              <th scope="col">Start Date</th>
              <th scope="col">End Date</th>
              <th scope="col" className="num-col">Days</th>
              <th scope="col">Applied On</th>
              <th scope="col" style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-3 text-muted">
                  Loading applications…
                </td>
              </tr>
            ) : pendingRequests.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-muted">
                  No pending leave applications requiring approval.
                </td>
              </tr>
            ) : (
              pendingRequests.map(r => (
                <tr key={r.leave_request_id}>
                  <td>#{r.leave_request_id}</td>
                  <td>{r.faculty_name || `Faculty #${r.faculty_id}`}</td>
                  <td>{r.department_name || '—'}</td>
                  <td>{r.type_name}</td>
                  <td>{formatDate(r.start_date)}</td>
                  <td>{formatDate(r.end_date)}</td>
                  <td className="num-col">{r.days_requested}</td>
                  <td>{formatDate(r.requested_at)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="d-inline-flex gap-2">
                      <button
                        type="button"
                        className="erp-btn erp-btn-success erp-btn-sm"
                        onClick={() => openDecisionModal(r, 'APPROVE')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="erp-btn erp-btn-danger erp-btn-sm"
                        onClick={() => openDecisionModal(r, 'REJECT')}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Decision Modal with remarks input */}
      {selectedReq && (
        <div className="erp-modal-overlay" onClick={() => setSelectedReq(null)}>
          <div className="erp-modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="erp-modal-header">
              <h3>{decisionType === 'APPROVE' ? 'Approve' : 'Reject'} Request #{selectedReq.leave_request_id}</h3>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setSelectedReq(null)}
              />
            </div>
            <form onSubmit={handleDecisionSubmit}>
              <div className="erp-modal-body">
                {error && (
                  <div className="mb-3 text-danger" style={{ fontSize: '13px' }}>
                    {error}
                  </div>
                )}

                <table className="erp-table mb-3">
                  <tbody>
                    <tr>
                      <th style={{ width: '30%' }}>Faculty</th>
                      <td>{selectedReq.faculty_name} ({selectedReq.department_name})</td>
                    </tr>
                    <tr>
                      <th>Leave Type</th>
                      <td>{selectedReq.type_name} ({selectedReq.days_requested} days)</td>
                    </tr>
                    <tr>
                      <th>Dates</th>
                      <td>{formatDate(selectedReq.start_date)} to {formatDate(selectedReq.end_date)}</td>
                    </tr>
                    <tr>
                      <th>Applicant's Reason</th>
                      <td>{selectedReq.reason || '—'}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="erp-form-group">
                  <label className="erp-label" htmlFor="approval-remarks">
                    {decisionType === 'APPROVE' ? 'Remarks (Optional)' : 'Rejection Reason (Required)'}
                  </label>
                  <textarea
                    id="approval-remarks"
                    className="erp-textarea"
                    rows="3"
                    required={decisionType === 'REJECT'}
                    placeholder="Enter remarks..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="erp-modal-footer">
                <button
                  type="button"
                  className="erp-btn erp-btn-secondary"
                  disabled={submitting}
                  onClick={() => setSelectedReq(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`erp-btn ${decisionType === 'APPROVE' ? 'erp-btn-success' : 'erp-btn-danger'}`}
                  disabled={submitting}
                >
                  {submitting ? 'Processing…' : (decisionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
