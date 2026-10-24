import React from 'react';

export default function LeaveBalanceCards({ balances = [], loading = false, academicYear = '2026–27' }) {
  const defaultOrder = ['Casual Leave', 'Medical Leave', 'Earned Leave', 'Special Leave'];
  const sortedBalances = [...balances].sort((a, b) => {
    const idxA = defaultOrder.indexOf(a.type_name);
    const idxB = defaultOrder.indexOf(b.type_name);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });

  return (
    <div className="erp-module-container mb-4">
      <h2 className="erp-section-heading">Leave Balance</h2>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="erp-subheading mb-0">Academic Year: {academicYear}</span>
        <span className="text-muted" style={{ fontSize: '12px' }}>
          Values retrieved dynamically from institutional records
        </span>
      </div>

      <div className="table-responsive">
        <table className="erp-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: '30%' }}>Leave Type</th>
              <th scope="col" className="num-col" style={{ width: '17.5%' }}>Total Allocated</th>
              <th scope="col" className="num-col" style={{ width: '17.5%' }}>Leave Used</th>
              <th scope="col" className="num-col" style={{ width: '17.5%' }}>Pending Leave</th>
              <th scope="col" className="num-col" style={{ width: '17.5%' }}>Remaining Leave</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-3 text-muted">
                  Loading leave balances from database…
                </td>
              </tr>
            ) : sortedBalances.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-3 text-muted">
                  No leave balances configured for this academic year.
                </td>
              </tr>
            ) : (
              sortedBalances.map(row => {
                const allocated = Number(row.allocated_days) || 0;
                const used = Number(row.used_days) || 0;
                const pending = Number(row.pending_days) || 0;
                const remaining = Number(row.remaining_days) || 0;

                return (
                  <tr key={row.leave_type_id || row.type_name}>
                    <td className="fw-semibold">{row.type_name}</td>
                    <td className="num-col">{allocated}</td>
                    <td className="num-col">{used}</td>
                    <td className="num-col">{pending}</td>
                    <td className="num-col fw-bold">{remaining}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
