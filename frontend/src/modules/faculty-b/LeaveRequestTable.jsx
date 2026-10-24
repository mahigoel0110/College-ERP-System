import { useState, useMemo } from 'react';

export default function LeaveRequestTable({ requests = [], onCancelRequest, loading = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const formatDate = d => {
    if (!d) return '—';
    const parsed = new Date(d);
    return isNaN(parsed) ? '—' : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesId = String(req.leave_request_id).includes(query);
        const matchesType = (req.type_name || '').toLowerCase().includes(query);
        const matchesRemarks = (req.approver_remarks || '').toLowerCase().includes(query);
        if (!matchesId && !matchesType && !matchesRemarks) return false;
      }
      if (statusFilter && req.status !== statusFilter) return false;
      return true;
    });
  }, [requests, searchTerm, statusFilter]);

  function handleCancelClick(req) {
    const isApproved = req.status === 'APPROVED';
    const confirmPrompt = isApproved
      ? `Cancel approved leave request #${req.leave_request_id}? Deducted days will be restored to your balance.`
      : `Cancel pending leave request #${req.leave_request_id}?`;

    if (window.confirm(confirmPrompt)) {
      setCancellingId(req.leave_request_id);
      onCancelRequest(req.leave_request_id).finally(() => setCancellingId(null));
    }
  }

  function renderStatusText(status) {
    switch (status) {
      case 'PENDING': return <span className="erp-status-pending">Pending</span>;
      case 'APPROVED': return <span className="erp-status-approved">Approved</span>;
      case 'REJECTED': return <span className="erp-status-rejected">Rejected</span>;
      case 'CANCELLED': return <span className="erp-status-cancelled">Cancelled</span>;
      default: return status;
    }
  }

  return (
    <div className="erp-module-container">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="erp-subheading mb-0">Leave Applications</h3>

        {/* Basic Search and Status Filter */}
        <div className="d-flex gap-2">
          <input
            type="text"
            className="erp-input"
            style={{ width: '200px' }}
            placeholder="Search by ID or type…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <select
            className="erp-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="erp-table">
          <thead>
            <tr>
              <th scope="col">Request ID</th>
              <th scope="col">Leave Type</th>
              <th scope="col">Start Date</th>
              <th scope="col">End Date</th>
              <th scope="col" className="num-col">Days</th>
              <th scope="col">Applied On</th>
              <th scope="col">Status</th>
              <th scope="col">Remarks</th>
              <th scope="col" style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-3 text-muted">
                  Loading leave records…
                </td>
              </tr>
            ) : filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-muted">
                  No leave requests found.
                </td>
              </tr>
            ) : (
              filteredRequests.map(row => {
                const canCancel = row.status === 'PENDING' || row.status === 'APPROVED';

                return (
                  <tr key={row.leave_request_id}>
                    <td>#{row.leave_request_id}</td>
                    <td>{row.type_name}</td>
                    <td>{formatDate(row.start_date)}</td>
                    <td>{formatDate(row.end_date)}</td>
                    <td className="num-col">{row.days_requested}</td>
                    <td>{formatDate(row.requested_at)}</td>
                    <td>{renderStatusText(row.status)}</td>
                    <td>{row.approver_remarks || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="d-inline-flex gap-2">
                        <button
                          type="button"
                          className="erp-btn erp-btn-secondary erp-btn-sm"
                          onClick={() => setSelectedRequest(row)}
                        >
                          View Details
                        </button>
                        {canCancel && (
                          <button
                            type="button"
                            className="erp-btn erp-btn-danger erp-btn-sm"
                            disabled={cancellingId === row.leave_request_id}
                            onClick={() => handleCancelClick(row)}
                          >
                            {cancellingId === row.leave_request_id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="erp-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="erp-modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="erp-modal-header">
              <h3>Leave Request Details — Request #{selectedRequest.leave_request_id}</h3>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setSelectedRequest(null)}
              />
            </div>
            <div className="erp-modal-body">
              <table className="erp-table mb-3">
                <tbody>
                  <tr>
                    <th style={{ width: '30%' }}>Request ID</th>
                    <td>#{selectedRequest.leave_request_id}</td>
                  </tr>
                  <tr>
                    <th>Leave Type</th>
                    <td>{selectedRequest.type_name}</td>
                  </tr>
                  <tr>
                    <th>Period</th>
                    <td>{formatDate(selectedRequest.start_date)} to {formatDate(selectedRequest.end_date)}</td>
                  </tr>
                  <tr>
                    <th>Number of Days</th>
                    <td>{selectedRequest.days_requested}</td>
                  </tr>
                  <tr>
                    <th>Applied On</th>
                    <td>{formatDate(selectedRequest.requested_at)}</td>
                  </tr>
                  <tr>
                    <th>Status</th>
                    <td>{renderStatusText(selectedRequest.status)}</td>
                  </tr>
                  <tr>
                    <th>Reason</th>
                    <td>{selectedRequest.reason || '—'}</td>
                  </tr>
                  <tr>
                    <th>Approver Remarks</th>
                    <td>{selectedRequest.approver_remarks || '—'}</td>
                  </tr>
                  {selectedRequest.document_path && (
                    <tr>
                      <th>Supporting Document</th>
                      <td>
                        <a
                          href={selectedRequest.document_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary"
                        >
                          Download Attachment
                        </a>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="erp-modal-footer">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => setSelectedRequest(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
