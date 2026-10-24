import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import LeaveBalanceCards from './LeaveBalanceCards';
import LeaveApplicationForm from './LeaveApplicationForm';
import LeaveRequestTable from './LeaveRequestTable';
import LeaveApprovalSection from './LeaveApprovalSection';
import PayrollSection from './PayrollSection';

export default function FacultyLeavePayroll() {
  const { session } = useAuth();
  const user = session?.user || {};
  const token = session?.token;
  const isAdmin = user.role === 'ADMIN';

  // State
  const [activeTab, setActiveTab] = useState('Leave balances');
  const [academicYear, setAcademicYear] = useState('2026–27');
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Primary loader
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const yearParam = academicYear.startsWith('2025') ? 2025 : 2026;
      const [typesData, balancesData, requestsData, payrollData] = await Promise.all([
        api('/faculty/leave-types', { token }).catch(() => []),
        api(`/faculty/leave-balances?year=${yearParam}`, { token }).catch(() => []),
        api('/faculty/leave-requests', { token }).catch(() => []),
        api('/faculty/payroll', { token }).catch(() => [])
      ]);

      setLeaveTypes(Array.isArray(typesData) ? typesData : []);
      setBalances(Array.isArray(balancesData) ? balancesData : []);
      setRequests(Array.isArray(requestsData) ? requestsData : []);
      setPayroll(Array.isArray(payrollData) ? payrollData : []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load records from the database.');
    } finally {
      setLoading(false);
    }
  }, [token, academicYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleApplyLeave(payload) {
    setFormBusy(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api('/faculty/leave-requests', {
        token,
        method: 'POST',
        body: payload
      });
      setSuccessMsg('Leave request submitted successfully.');
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit leave request.');
    } finally {
      setFormBusy(false);
    }
  }

  async function handleCancelRequest(requestId) {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api(`/faculty/leave-requests/${requestId}/cancel`, {
        token,
        method: 'POST',
        body: { reason: 'Cancelled by applicant.' }
      });
      setSuccessMsg(`Leave request #${requestId} cancelled successfully.`);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to cancel leave request.');
      throw err;
    }
  }

  async function handleDecision(requestId, approve, remarks) {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api(`/faculty/leave-requests/${requestId}/decision`, {
        token,
        method: 'POST',
        body: { approve, remarks }
      });
      setSuccessMsg(`Leave request #${requestId} has been ${approve ? 'approved' : 'rejected'}.`);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to record decision.');
      throw err;
    }
  }

  const tabs = [
    { label: 'Leave balances' },
    { label: 'Leave requests' },
    { label: 'Payroll records' }
  ];
  if (isAdmin) {
    tabs.push({ label: 'Approvals' });
  }

  return (
    <div className="page-stack">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pb-2 border-bottom">
        <div>
          <span className="text-muted text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>
            Faculty Management
          </span>
          <h1 className="h4 text-navy mb-0" style={{ color: '#102a56', fontWeight: 600 }}>
            Leave &amp; Payroll
          </h1>
        </div>

        <div className="d-flex align-items-center gap-2">
          <label htmlFor="academic-year-select" className="visually-hidden">Academic Year</label>
          <select
            id="academic-year-select"
            className="erp-select"
            style={{ width: '130px' }}
            value={academicYear}
            onChange={e => setAcademicYear(e.target.value)}
          >
            <option value="2026–27">AY 2026–27</option>
            <option value="2025–26">AY 2025–26</option>
          </select>

          <button
            type="button"
            className="erp-btn erp-btn-primary"
            disabled={loading}
            onClick={loadData}
          >
            {loading ? 'Refreshing…' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="alert alert-success py-2 px-3 mb-0" style={{ fontSize: '13px', borderRadius: '2px' }}>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-danger py-2 px-3 mb-0" style={{ fontSize: '13px', borderRadius: '2px' }}>
          {errorMsg}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="module-tabs" role="tablist">
        {tabs.map(tab => (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tab.label}
            key={tab.label}
            className={`module-tab${activeTab === tab.label ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.label)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Leave Balances Table */}
      {activeTab === 'Leave balances' && (
        <LeaveBalanceCards
          balances={balances}
          loading={loading}
          academicYear={academicYear}
        />
      )}

      {/* Tab 2: Leave Requests (Application Form + Table) */}
      {activeTab === 'Leave requests' && (
        <div className="page-stack">
          <LeaveBalanceCards
            balances={balances}
            loading={loading}
            academicYear={academicYear}
          />

          <LeaveApplicationForm
            leaveTypes={leaveTypes}
            balances={balances}
            onSubmit={handleApplyLeave}
            busy={formBusy}
          />

          <LeaveRequestTable
            requests={requests}
            onCancelRequest={handleCancelRequest}
            loading={loading}
          />
        </div>
      )}

      {/* Tab 3: Payroll Records Table */}
      {activeTab === 'Payroll records' && (
        <PayrollSection
          payrollRecords={payroll}
          loading={loading}
          token={token}
        />
      )}

      {/* Tab 4: Approval Interface */}
      {activeTab === 'Approvals' && isAdmin && (
        <LeaveApprovalSection
          requests={requests}
          onDecision={handleDecision}
          loading={loading}
        />
      )}
    </div>
  );
}
