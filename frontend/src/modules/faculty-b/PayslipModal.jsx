import React from 'react';

export default function PayslipModal({ payslip, onClose }) {
  if (!payslip) return null;

  const formatCurrency = val => {
    const num = Number(val) || 0;
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = d => {
    if (!d) return '—';
    const parsed = new Date(d);
    return isNaN(parsed) ? '—' : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="erp-modal-overlay" onClick={onClose}>
      <div className="erp-modal-dialog" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
        <div className="erp-modal-header d-print-none">
          <h3>Employee Payslip — {payslip.period?.month_year}</h3>
          <button type="button" className="btn-close btn-close-white" onClick={onClose} />
        </div>

        <div className="erp-modal-body">
          <div className="formal-payslip printable-payslip-container">
            <div className="formal-payslip-header">
              <h2>{payslip.institution?.name || 'NATIONAL INSTITUTE OF ENGINEERING & TECHNOLOGY'}</h2>
              <p>{payslip.institution?.sub_title}</p>
              <p>{payslip.institution?.address}</p>
              <div className="formal-payslip-title">
                Salary Statement for the Month of {payslip.period?.month_year}
              </div>
            </div>

            {/* Employee Details Table */}
            <table className="erp-table mb-3">
              <tbody>
                <tr>
                  <th style={{ width: '20%' }}>Employee Code</th>
                  <td style={{ width: '30%' }}>{payslip.employee?.employee_code}</td>
                  <th style={{ width: '20%' }}>Faculty Name</th>
                  <td style={{ width: '30%' }}>{payslip.employee?.faculty_name}</td>
                </tr>
                <tr>
                  <th>Department</th>
                  <td>{payslip.employee?.department_name}</td>
                  <th>Designation</th>
                  <td>{payslip.employee?.designation_name}</td>
                </tr>
                <tr>
                  <th>Pay Period</th>
                  <td>{formatDate(payslip.period?.period_start)} to {formatDate(payslip.period?.period_end)}</td>
                  <th>Payment Status</th>
                  <td>{payslip.period?.payment_status} ({formatDate(payslip.period?.payment_date)})</td>
                </tr>
              </tbody>
            </table>

            {/* Earnings and Deductions Two Column Table */}
            <div className="row g-2 mb-3">
              <div className="col-6">
                <table className="erp-table mb-0">
                  <thead>
                    <tr>
                      <th>Earnings Component</th>
                      <th className="num-col">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslip.earnings?.filter(e => !e.is_total).map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.label}</td>
                        <td className="num-col">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
                      <td>Gross Earnings</td>
                      <td className="num-col">{formatCurrency(payslip.summary?.gross_salary)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="col-6">
                <table className="erp-table mb-0">
                  <thead>
                    <tr>
                      <th>Deduction Component</th>
                      <th className="num-col">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslip.deductions?.filter(d => !d.is_total).map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.label}</td>
                        <td className="num-col">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
                      <td>Total Deductions</td>
                      <td className="num-col">{formatCurrency(payslip.summary?.total_deductions)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Salary Summary */}
            <table className="erp-table mb-4">
              <tbody>
                <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold', fontSize: '14px' }}>
                  <td style={{ width: '40%' }}>Net Salary Payable</td>
                  <td className="num-col">{formatCurrency(payslip.summary?.net_salary)}</td>
                </tr>
                <tr>
                  <td colSpan="2" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                    Amount in words: {payslip.summary?.net_salary_words}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Signatures */}
            <div className="d-flex justify-content-between pt-4 mt-4 border-top" style={{ fontSize: '11px' }}>
              <div>
                <span>Prepared by: Accounts Section</span>
              </div>
              <div className="text-end">
                <span>Authorized Signatory / Registrar</span>
              </div>
            </div>
          </div>
        </div>

        <div className="erp-modal-footer d-print-none">
          <button type="button" className="erp-btn erp-btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="erp-btn erp-btn-primary" onClick={() => window.print()}>
            Print Payslip
          </button>
        </div>
      </div>
    </div>
  );
}
