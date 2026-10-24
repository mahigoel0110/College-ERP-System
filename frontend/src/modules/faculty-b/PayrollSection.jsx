import { useState, useMemo } from 'react';
import PayslipModal from './PayslipModal';
import { api } from '../../services/api';

export default function PayrollSection({ payrollRecords = [], loading = false, token }) {
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [payslipData, setPayslipData] = useState(null);
  const [loadingPayslipId, setLoadingPayslipId] = useState(null);

  const formatCurrency = val => {
    const num = Number(val) || 0;
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parsedRecords = useMemo(() => {
    return payrollRecords.map(r => {
      const d = r.period_start ? new Date(r.period_start) : new Date();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const month = monthNames[d.getMonth()] || '—';
      const year = d.getFullYear() || 2026;
      return {
        ...r,
        monthName: month,
        yearNumber: year
      };
    });
  }, [payrollRecords]);

  const yearOptions = useMemo(() => {
    const set = new Set();
    parsedRecords.forEach(r => set.add(r.yearNumber));
    return Array.from(set).sort((a, b) => b - a);
  }, [parsedRecords]);

  const filteredRecords = useMemo(() => {
    return parsedRecords.filter(r => {
      if (yearFilter && String(r.yearNumber) !== String(yearFilter)) return false;
      if (statusFilter && r.payment_status !== statusFilter) return false;
      return true;
    });
  }, [parsedRecords, yearFilter, statusFilter]);

  async function openPayslip(payrollId, printImmediately = false) {
    try {
      setLoadingPayslipId(payrollId);
      const res = await api(`/faculty/payroll/${payrollId}/payslip`, { token });
      setPayslipData(res);
      if (printImmediately) {
        setTimeout(() => window.print(), 300);
      }
    } catch (err) {
      alert(err.message || 'Failed to retrieve payslip.');
    } finally {
      setLoadingPayslipId(null);
    }
  }

  return (
    <div className="erp-module-container">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="erp-subheading mb-0">Payroll Records</h3>

        {/* Filters */}
        <div className="d-flex gap-2">
          <select
            className="erp-select"
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
          >
            <option value="">All Years</option>
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            className="erp-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSED">Processed</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="erp-table">
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Year</th>
              <th scope="col" className="num-col">Basic Salary</th>
              <th scope="col" className="num-col">Allowances</th>
              <th scope="col" className="num-col">Gross Salary</th>
              <th scope="col" className="num-col">Deductions</th>
              <th scope="col" className="num-col">Net Salary</th>
              <th scope="col">Payment Status</th>
              <th scope="col" style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-3 text-muted">
                  Loading payroll records…
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-muted">
                  No payroll records found.
                </td>
              </tr>
            ) : (
              filteredRecords.map(r => (
                <tr key={r.payroll_id}>
                  <td>{r.monthName}</td>
                  <td>{r.yearNumber}</td>
                  <td className="num-col">{formatCurrency(r.basic_pay)}</td>
                  <td className="num-col">{formatCurrency(r.allowances)}</td>
                  <td className="num-col">{formatCurrency(r.gross_pay)}</td>
                  <td className="num-col">{formatCurrency(r.total_deductions)}</td>
                  <td className="num-col fw-bold">{formatCurrency(r.net_pay)}</td>
                  <td>{r.payment_status || 'PAID'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="d-inline-flex gap-2">
                      <button
                        type="button"
                        className="erp-btn erp-btn-secondary erp-btn-sm"
                        disabled={loadingPayslipId === r.payroll_id}
                        onClick={() => openPayslip(r.payroll_id, false)}
                      >
                        {loadingPayslipId === r.payroll_id ? 'Loading…' : 'View Payslip'}
                      </button>
                      <button
                        type="button"
                        className="erp-btn erp-btn-secondary erp-btn-sm"
                        disabled={loadingPayslipId === r.payroll_id}
                        onClick={() => openPayslip(r.payroll_id, true)}
                      >
                        Print Payslip
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {payslipData && (
        <PayslipModal
          payslip={payslipData}
          onClose={() => setPayslipData(null)}
        />
      )}
    </div>
  );
}
