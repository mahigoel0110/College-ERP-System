import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {api} from '../services/api';
import {RecordTable} from '../components/RecordTable';

function Metric({label,value,note,tone='blue'}){
  return <article className={`metric-card metric-${tone}`}><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong>{note&&<span className="metric-note">{note}</span>}</article>;
}
function Section({title,to,children}){
  return <section className="dashboard-section"><div className="section-heading"><h2 className="h5 mb-0">{title}</h2>{to&&<Link to={to}>View all <span aria-hidden="true">→</span></Link>}</div>{children}</section>;
}
const count=(value)=>Array.isArray(value)?value.length:0;
const isUpcoming=(value)=>{const date=new Date(value);const today=new Date();today.setHours(0,0,0,0);return !Number.isNaN(date.valueOf())&&date>=today;};

export default function Dashboard(){
  const {session}=useAuth();
  const [data,setData]=useState({});
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  const user=session.user;
  useEffect(()=>{
    let active=true;
    const requests=user.role==='STUDENT'?
      [['profile',`/students/${user.student_id}/profile`],['enrollments',`/students/${user.student_id}/enrollments`],['attendance',`/students/${user.student_id}/attendance`],['fees',`/students/${user.student_id}/fees`],['exams','/exams'],['registrations','/exams/registrations'],['results',`/exams/results/${user.student_id}`],['notices','/notices']]:
      user.role==='FACULTY'?
      [['profile',`/faculty/${user.faculty_id}/details`],['allocations','/faculty/allocations'],['leave','/faculty/leave-requests'],['balances','/faculty/leave-balances'],['exams','/exams'],['registrations','/exams/registrations'],['lowAttendance','/students/low-attendance'],['notices','/notices']]:
      [['offerings','/courses/offerings'],['lowAttendance','/students/low-attendance'],['allocations','/faculty/allocations'],['leave','/faculty/leave-requests'],['payroll','/faculty/payroll'],['pendingFees','/admin/pending-fees'],['receipts','/admin/receipts'],['rooms','/admin/hostels'],['exams','/exams'],['notices','/notices']];
    setBusy(true);setError('');
    Promise.allSettled(requests.map(async([key,path])=>({key,value:await api(path,{token:session.token})}))).then(results=>{
      if(!active)return;
      const successful=results.filter(result=>result.status==='fulfilled').map(result=>[result.value.key,result.value.value]);
      const failed=results.find(result=>result.status==='rejected');
      setData(Object.fromEntries(successful));
      if(failed)setError(failed.reason.message);
    }).finally(()=>{if(active)setBusy(false)});
    return()=>{active=false};
  },[session.token,user.role,user.student_id,user.faculty_id]);

  const title=user.role==='ADMIN'?'Institution overview':user.role==='FACULTY'?'Faculty workspace':'Student workspace';
  if(busy)return <div className="loading-state"><span className="spinner-border spinner-border-sm text-primary" role="status"/><span>Loading your live ERP overview…</span></div>;
  return <div className="page-stack">
    <div className="page-heading"><div><p className="eyebrow">{user.role} PORTAL</p><h1>{title}</h1><p className="page-subtitle">Welcome back, {user.username}. Here is the latest information available to your account.</p></div></div>
    {error&&<div className="alert alert-warning" role="alert">Some dashboard data could not be loaded: {error}</div>}
    {user.role==='STUDENT'&&<>
      <div className="metric-grid"><Metric label="Enrolled courses" value={count(data.enrollments)} note="Current course registrations"/><Metric label="Average attendance" value={data.attendance?.length?`${(data.attendance.reduce((sum,row)=>sum+Number(row.attendance_pct||0),0)/data.attendance.length).toFixed(1)}%`:'—'} note="Across your enrolled courses" tone="green"/><Metric label="Upcoming examinations" value={count(data.exams?.filter(exam=>!exam.results_published&&isUpcoming(exam.exam_date)))} note="Not yet published" tone="purple"/><Metric label="Pending fee items" value={count(data.fees?.filter(fee=>fee.payment_status==='PENDING'))} note="Review fees and receipts" tone="amber"/></div>
      <div className="dashboard-grid"><Section title="My courses" to="/students"><RecordTable title="Enrolled courses" rows={data.enrollments||[]} empty="Enroll in an available course to see it here."/></Section><Section title="Attendance by course" to="/students"><RecordTable title="Attendance" rows={data.attendance||[]} empty="Attendance has not been recorded for your courses yet."/></Section><Section title="Upcoming examinations" to="/examinations"><RecordTable title="Exam schedule" rows={(data.exams||[]).filter(exam=>isUpcoming(exam.exam_date)&&!exam.results_published)} empty="There are no upcoming examinations for your enrolled courses."/></Section><Section title="Published results" to="/examinations"><RecordTable title="Results" rows={data.results||[]} empty="Published results will appear here."/></Section><Section title="Campus notices" to="/notices"><RecordTable title="Recent notices" rows={(data.notices||[]).slice(0,4)} empty="There are no current notices."/></Section></div>
    </>}
    {user.role==='FACULTY'&&<>
      <div className="metric-grid"><Metric label="Weekly teaching hours" value={`${data.profile?.profile?.weekly_hours??0} hrs`} note="Current assigned workload"/><Metric label="Teaching allocations" value={count(data.allocations)} note="Assigned offerings" tone="green"/><Metric label="Pending leave requests" value={count(data.leave?.filter(item=>item.status==='PENDING'))} note="Your requests" tone="amber"/><Metric label="Students below 75%" value={count(data.lowAttendance)} note="In your assigned offerings" tone="purple"/></div>
      <div className="dashboard-grid"><Section title="Teaching allocations" to="/faculty"><RecordTable title="Current allocations" rows={data.allocations||[]} empty="No teaching allocations are assigned."/></Section><Section title="Upcoming examination duties" to="/examinations"><RecordTable title="Exam registrations" rows={(data.registrations||[]).filter(item=>isUpcoming(item.exam_date)).slice(0,6)} empty="No upcoming registrations in your assigned courses."/></Section><Section title="Attendance watch" to="/faculty"><RecordTable title="Low attendance" rows={data.lowAttendance||[]} empty="No students in your offerings are below the attendance threshold."/></Section><Section title="Leave status" to="/faculty-b"><RecordTable title="Recent leave requests" rows={(data.leave||[]).slice(0,5)} empty="You have not submitted leave requests."/></Section></div>
    </>}
    {user.role==='ADMIN'&&<>
      <div className="metric-grid"><Metric label="Pending fee items" value={count(data.pendingFees)} note="Students with outstanding fees" tone="amber"/><Metric label="Low attendance alerts" value={count(data.lowAttendance)} note="Students below 75%" tone="purple"/><Metric label="Teaching allocations" value={count(data.allocations)} note="Across the institution" tone="green"/><Metric label="Available hostel beds" value={(data.rooms||[]).reduce((sum,room)=>sum+Number(room.vacant||0),0)} note={`${count(data.rooms)} rooms tracked`}/></div>
      <div className="dashboard-grid"><Section title="Outstanding fees" to="/administration"><RecordTable title="Pending fee items" rows={(data.pendingFees||[]).slice(0,6)} empty="All listed fee items are paid."/></Section><Section title="Attendance alerts" to="/students"><RecordTable title="Low attendance" rows={(data.lowAttendance||[]).slice(0,6)} empty="No students are currently below the attendance threshold."/></Section><Section title="Leave approvals" to="/faculty-b"><RecordTable title="Pending requests" rows={(data.leave||[]).filter(item=>item.status==='PENDING').slice(0,5)} empty="There are no leave requests awaiting a decision."/></Section><Section title="Recent receipts" to="/administration"><RecordTable title="Receipts" rows={(data.receipts||[]).slice(0,5)} empty="No receipts have been issued yet."/></Section></div>
    </>}
  </div>;
}
