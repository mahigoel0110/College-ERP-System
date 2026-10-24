import {useEffect,useMemo,useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {api} from '../services/api';
import {RecordSummary,RecordTable} from '../components/RecordTable';
import FacultyLeavePayroll from './faculty-b/FacultyLeavePayroll';

const configs={
  students:{title:'Student Management',sections:[
    {label:'Course offerings',roles:['ADMIN','FACULTY'],path:'/courses/offerings'},
    {label:'Enrollment records',roles:['ADMIN'],path:'/admin/enrollments'},
    {label:'My Courses',roles:['STUDENT'],path:'/students/me/enrollments'},
    {label:'Attendance',roles:['STUDENT'],path:'/students/me/attendance'},
  ]},
  'student-services':{title:'My Fees & Hostel',sections:[
    {label:'Fees and receipts',path:user=>`/students/${user.student_id}/fees`},
    {label:'Hostel allocation',path:user=>`/students/${user.student_id}/hostel`},
  ]},
  faculty:{title:'Faculty Management',sections:[
    {label:'My profile',roles:['FACULTY'],path:user=>`/faculty/${user.faculty_id}/details`},
    {label:'Faculty directory',roles:['ADMIN'],path:'/faculty/profiles'},
    {label:'Teaching allocations',path:'/faculty/allocations'},
    {label:'Course rosters',path:'/faculty/enrollments'},
    {label:'Low attendance',roles:['ADMIN','FACULTY'],path:'/students/low-attendance'},
  ]},
  'faculty-b':{title:'Leave & Payroll',sections:[
    {label:'Leave balances',path:'/faculty/leave-balances'},
    {label:'Leave requests',path:'/faculty/leave-requests'},
    {label:'Payroll records',path:'/faculty/payroll'},
  ]},
  examinations:{title:'Examinations',sections:[
    {label:'Exam schedule',path:'/exams'},
    {label:'Registrations and marks',path:'/exams/registrations'},
    {label:'Published results',roles:['STUDENT'],path:user=>`/exams/results/${user.student_id}`},
    {label:'Revaluation requests',roles:['STUDENT','ADMIN'],path:'/exams/revaluation'},
  ]},
  administration:{title:'Administration',sections:[
    {label:'User accounts',path:'/admin/users'},
    {label:'Pending fees',path:'/admin/pending-fees'},
    {label:'Fee structures',path:'/admin/fee-structures'},
    {label:'Fee collection',path:'/admin/fee-collection'},
    {label:'Receipts',path:'/admin/receipts'},
    {label:'Hostel occupancy',path:'/admin/hostels'},
    {label:'Hostel allocations',path:'/admin/hostel-allocations'},
  ]},
  notices:{title:'Campus notices',sections:[{label:'Current notices',path:'/notices'}]},
};

const formFields={
  'Enroll student':[['student_id','Student ID','number',{min:1}],['offering_id','Offering ID','number',{min:1}]],
  'Request leave':[['leave_type_id','Leave type','number',{min:1}],['start_date','Start date','date'],['end_date','End date','date'],['days_requested','Days requested','number',{min:.5,step:.5}]],
  'Generate payroll':[['faculty_id','Faculty ID','number',{min:1}],['period_start','Period start','date'],['period_end','Period end','date'],['lop_amount','Loss of pay (₹)','number',{min:0,step:.01}]],
  'Record attendance':[['enrollment_id','Enrollment ID','number',{min:1}],['class_date','Class date','date'],['status','Attendance status','select',{options:['PRESENT','ABSENT']}]],
  'Register for exam':[['exam_id','Exam ID','number',{min:1}],['offering_id','Offering ID','number',{min:1}],['exam_hall_id','Hall ID (optional)','number',{min:1,required:false}]],
  'Enter marks':[['exam_registration_id','Registration ID','number',{min:1}],['marks_obtained','Marks obtained','number',{min:0,step:.5}]],
  'Request revaluation':[['marks_id','Marks ID','number',{min:1}],['reason','Reason','text',{minLength:5}]],
  'Collect fee':[['student_id','Student ID','number',{min:1}],['fee_structure_id','Fee item ID','number',{min:1}],['payment_method','Payment method','select',{options:['UPI','CARD','BANK','CASH']}]],
  'Allocate hostel':[['student_id','Student ID','number',{min:1}],['hostel_room_id','Room ID','number',{min:1}]],
  'Publish notice':[['title','Notice title','text',{maxLength:150}],['body','Notice content','textarea',{minLength:5}],['audience','Audience','select',{options:['ALL','STUDENT','FACULTY']}],['expires_at','Expiry date (optional)','date',{required:false}]],
  'Create account':[['role_name','Role','select',{options:['STUDENT','FACULTY','ADMIN']}],['username','Username','text',{maxLength:50}],['email','Email address','email',{maxLength:120}],['password','Temporary password','password',{minLength:8}],['student_id','Linked student ID','number',{min:1,required:values=>(values.role_name||'STUDENT')==='STUDENT'}],['faculty_id','Linked faculty ID','number',{min:1,required:values=>values.role_name==='FACULTY'}]],
};

function ActionForm({label,busy,values,onChange,onSubmit}){
  const role=values.role_name||'STUDENT';
  const fields=(formFields[label]||[]).filter(([key])=>key!=='student_id'||role==='STUDENT').filter(([key])=>key!=='faculty_id'||role==='FACULTY');
  return <form className="action-card" onSubmit={onSubmit}>
    <h2 className="h6">{label}</h2>
    <div className="action-fields">{fields.map(([key,title,type='text',rules={}])=>{const required=typeof rules.required==='function'?rules.required(values):rules.required!==false;return <label className="form-label" key={key}>{title}
      {type==='select'?<select className="form-select" required={required} value={values[key]??rules.options?.[0]??''} onChange={event=>onChange(key,event.target.value)}>{rules.options.map(option=><option value={option} key={option}>{option}</option>)}</select>:type==='textarea'?<textarea className="form-control" required={required} minLength={rules.minLength} maxLength={rules.maxLength} rows="2" value={values[key]||''} onChange={event=>onChange(key,event.target.value)}/>:<input className="form-control" type={type} required={required} min={rules.min} step={rules.step} minLength={rules.minLength} maxLength={rules.maxLength} value={values[key]||''} onChange={event=>onChange(key,event.target.value)}/>}
    </label>})}</div>
    <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy?'Submitting…':label}</button>
  </form>;
}

const courseDateFormatter=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric'});
function courseDate(value){
  if(!value)return '—';
  const parsed=new Date(`${String(value).slice(0,10)}T00:00:00`);
  return Number.isNaN(parsed.valueOf())?'—':courseDateFormatter.format(parsed);
}
function CourseTable({rows}){
  if(!rows.length)return <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">✓</span><div><h2 className="h6 mb-1">No courses currently assigned</h2><p className="mb-0 text-secondary">Your enrolled subjects will appear here when they are assigned.</p></div></div>;
  return <section className="record-panel" aria-label="My Courses">
    <div className="record-toolbar"><div><h2 className="h6 mb-1">My Courses</h2><span className="small text-secondary">{rows.length} assigned {rows.length===1?'course':'courses'}</span></div></div>
    <div className="table-responsive"><table className="table table-hover align-middle mb-0" style={{minWidth:'900px'}}><thead><tr>
      <th scope="col">Course code</th><th scope="col">Subject</th><th scope="col">Credits</th><th scope="col">Semester</th><th scope="col">Term</th><th scope="col">Department / branch</th><th scope="col">Enrolled on</th><th scope="col">Status</th>
    </tr></thead><tbody>{rows.map(row=><tr key={row.enrollment_id}>
      <td className="text-nowrap fw-semibold">{row.course_code}</td><td>{row.course_name}</td><td className="text-nowrap">{row.credits}</td><td className="text-nowrap">Semester {row.semester_no}</td><td>{row.term}</td>
      <td>{row.department_code} · {row.department_name}</td><td className="text-nowrap">{courseDate(row.enrolled_on)}</td><td><span className="badge text-bg-success">{row.status}</span></td>
    </tr>)}</tbody></table></div>
  </section>;
}

export default function ModulePage({name}){
  if(name==='faculty-b') return <FacultyLeavePayroll />;
  const {session}=useAuth();
  const user=session.user;
  const config=configs[name];
  const sections=useMemo(()=>config.sections.filter(section=>!section.roles||section.roles.includes(user.role)),[config,user.role]);
  const [selected,setSelected]=useState(sections[0]);
  const [data,setData]=useState(null);
  const [busy,setBusy]=useState(false);
  const [busyAction,setBusyAction]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [form,setForm]=useState({});

  async function load(section=selected){
    setSelected(section);setError('');setData(null);setBusy(true);
    try{const path=typeof section.path==='function'?section.path(user):section.path;setData(await api(path,{token:session.token}));}
    catch(failure){setError(failure.message);}
    finally{setBusy(false);}
  }
  useEffect(()=>{load(sections[0])},[]);

  const actions=useMemo(()=>{
    if(name==='students')return user.role==='ADMIN'&&selected.label==='Course offerings'?['Enroll student']:[];
    if(name==='faculty')return ['ADMIN','FACULTY'].includes(user.role)&&selected.label==='Course rosters'?['Record attendance']:[];
    if(name==='faculty-b')return user.role==='FACULTY'&&selected.label==='Leave requests'?['Request leave']:user.role==='ADMIN'&&selected.label==='Payroll records'?['Generate payroll']:[];
    if(name==='examinations')return user.role==='STUDENT'?(selected.label==='Revaluation requests'?['Request revaluation']:[]):(selected.label==='Registrations and marks'?['Enter marks']:[]);
    if(name==='administration'&&selected.label==='User accounts')return ['Create account'];
    if(name==='administration'&&selected.label==='Pending fees')return ['Collect fee'];
    if(name==='administration'&&selected.label==='Hostel occupancy')return ['Allocate hostel'];
    if(name==='notices'&&user.role==='ADMIN')return ['Publish notice'];
    return [];
  },[name,user.role,selected.label]);

  async function perform(label,values){
    const num=key=>Number(values[key]);
    if(['Collect fee','Allocate hostel','Request revaluation','Generate payroll'].includes(label)&&!window.confirm(`Continue with ${label.toLowerCase()}?`))return;
    if(label==='Register for exam'&&!window.confirm('Register for this examination? Attendance eligibility will be checked.'))return;
    setMessage('');setError('');setBusyAction(label);
    try{
      if(label==='Enroll student')await api('/students/enrollments',{token:session.token,method:'POST',body:{student_id:num('student_id'),offering_id:num('offering_id')}});
      if(label==='Request leave')await api('/faculty/leave-requests',{token:session.token,method:'POST',body:{leave_type_id:num('leave_type_id'),start_date:values.start_date,end_date:values.end_date,days_requested:num('days_requested')}});
      if(label==='Record attendance')await api('/students/attendance',{token:session.token,method:'POST',body:{enrollment_id:num('enrollment_id'),class_date:values.class_date,status:values.status||'PRESENT'}});
      if(label==='Generate payroll')await api('/faculty/payroll',{token:session.token,method:'POST',body:{faculty_id:num('faculty_id'),period_start:values.period_start,period_end:values.period_end,lop_amount:num('lop_amount')||0}});
      if(label==='Register for exam')await api('/exams/registration',{token:session.token,method:'POST',body:{exam_id:num('exam_id'),offering_id:num('offering_id'),exam_hall_id:num('exam_hall_id')||null}});
      if(label==='Enter marks')await api('/exams/marks',{token:session.token,method:'POST',body:{exam_registration_id:num('exam_registration_id'),marks_obtained:num('marks_obtained')}});
      if(label==='Request revaluation')await api('/exams/revaluation',{token:session.token,method:'POST',body:{marks_id:num('marks_id'),reason:values.reason}});
      if(label==='Collect fee')await api('/admin/fee-payments',{token:session.token,method:'POST',body:{student_id:num('student_id'),fee_structure_id:num('fee_structure_id'),payment_method:values.payment_method||'UPI'}});
      if(label==='Allocate hostel')await api('/admin/hostel-allocations',{token:session.token,method:'POST',body:{student_id:num('student_id'),hostel_room_id:num('hostel_room_id')}});
      if(label==='Publish notice')await api('/admin/notices',{token:session.token,method:'POST',body:{title:values.title,body:values.body,audience:values.audience||'ALL',expires_at:values.expires_at||null}});
      if(label==='Create account')await api('/auth/register',{token:session.token,method:'POST',body:{username:values.username,email:values.email,password:values.password,role_name:values.role_name||'STUDENT',student_id:num('student_id')||null,faculty_id:num('faculty_id')||null}});
      setMessage(`${label} completed successfully.`);setForm({});await load(selected);
    }catch(failure){setError(failure.message);}
    finally{setBusyAction('');}
  }

  async function rowAction(endpoint,body,question,success='The change was saved.'){
    if(!window.confirm(question))return;
    setError('');setMessage('');setBusyAction(endpoint);
    try{await api(endpoint,{token:session.token,method:'POST',body});setMessage(success);await load(selected);}
    catch(failure){setError(failure.message)}
    finally{setBusyAction('')}
  }
  function rowControls(row){
    if(name==='students'&&user.role==='ADMIN'&&selected.label==='Enrollment records'&&row.status==='ENROLLED')return <button className="btn btn-sm btn-outline-danger" disabled={Boolean(busyAction)} onClick={()=>rowAction(`/students/enrollments/${row.enrollment_id}/drop`,{},`Drop enrollment ${row.enrollment_id} for ${row.student_name}?`,'Enrollment dropped successfully.')}>Drop</button>;
    if(name==='faculty'&&user.role==='ADMIN'&&selected.label==='Faculty directory')return <button className="btn btn-sm btn-outline-primary" onClick={()=>load({label:`Faculty profile · ${row.employee_code}`,path:`/faculty/${row.faculty_id}/details`})}>View profile</button>;
    if(name==='examinations'&&user.role==='STUDENT'&&selected.label==='Exam schedule'&&row.registration_open&&!row.results_published)return <button className="btn btn-sm btn-primary" disabled={Boolean(busyAction)} onClick={()=>rowAction('/exams/registration',{exam_id:Number(row.exam_id),offering_id:Number(row.offering_id)},`Register for ${row.exam_name}? Attendance eligibility will be checked.`,'Exam registration completed successfully.')}>Register</button>;
    if(name==='faculty-b'&&user.role==='ADMIN'&&selected.label==='Leave requests'&&row.status==='PENDING')return <div className="d-flex gap-2"><button className="btn btn-sm btn-success" disabled={Boolean(busyAction)} onClick={()=>rowAction(`/faculty/leave-requests/${row.leave_request_id}/decision`,{approve:true},'Approve this leave request?')}>Approve</button><button className="btn btn-sm btn-outline-danger" disabled={Boolean(busyAction)} onClick={()=>rowAction(`/faculty/leave-requests/${row.leave_request_id}/decision`,{approve:false},'Reject this leave request?')}>Reject</button></div>;
    if(name==='examinations'&&user.role==='ADMIN'&&selected.label==='Exam schedule'&&!row.results_published)return <button className="btn btn-sm btn-primary" disabled={Boolean(busyAction)} onClick={()=>rowAction(`/exams/${row.exam_id}/publish`,{},'Publish results and close registration for this exam?')}>Publish results</button>;
    if(name==='examinations'&&user.role==='ADMIN'&&selected.label==='Revaluation requests'&&row.status==='PENDING')return <div className="d-flex gap-2"><button className="btn btn-sm btn-success" disabled={Boolean(busyAction)} onClick={()=>rowAction(`/exams/revaluation/${row.revaluation_request_id}/decision`,{approve:true},'Approve this revaluation request?')}>Approve</button><button className="btn btn-sm btn-outline-danger" disabled={Boolean(busyAction)} onClick={()=>rowAction(`/exams/revaluation/${row.revaluation_request_id}/decision`,{approve:false},'Reject this revaluation request?')}>Reject</button></div>;
    return null;
  }

  const rows=Array.isArray(data)?data:[];
  const structured= name==='faculty'&&(selected.label==='My profile'||selected.label.startsWith('Faculty profile ·'))&&data&&typeof data==='object';
  const hasRowActions=(name==='students'&&user.role==='ADMIN'&&selected.label==='Enrollment records')||(name==='faculty'&&((user.role==='ADMIN'&&selected.label==='Faculty directory')||(user.role==='FACULTY'&&selected.label==='Course rosters')))||(name==='faculty-b'&&user.role==='ADMIN'&&selected.label==='Leave requests')||(name==='examinations'&&((user.role==='STUDENT'&&selected.label==='Exam schedule')||(user.role==='ADMIN'&&['Exam schedule','Revaluation requests'].includes(selected.label))));
  const emptyMessages={'Course offerings':'There are no course offerings for this term.','Enrollment records':'No enrollment records are available.','My Courses':'No courses are currently assigned. Your enrolled subjects will appear here when they are assigned.','Attendance':'Attendance has not been recorded for your courses.','Leave balances':'No leave balance has been configured.','Leave requests':'No leave requests are available.','Payroll records':'No payroll records are available.','Exam schedule':'No examinations are scheduled.','Registrations and marks':'No exam registrations are available.','Published results':'Results will appear here after the institution publishes them.','Revaluation requests':'There are no revaluation requests.','User accounts':'No user accounts are available.','Pending fees':'No fee items are pending.','Fee structures':'No fee structures are configured.','Fee collection':'No fee collections are recorded.','Receipts':'No receipts have been issued.','Hostel occupancy':'No hostel rooms are configured.','Hostel allocations':'No hostel allocations are recorded.','Current notices':'There are no current notices.'};
  function updateField(label,key,value){setForm(previous=>{const current=previous[label]||{};const next={...current,[key]:value};if(label==='Create account'&&key==='role_name'){next.student_id='';next.faculty_id='';}return {...previous,[label]:next};});}
  return <div className="page-stack">
    <div className="page-heading"><div><p className="eyebrow">ERP MODULE</p><h1>{config.title}</h1><p className="page-subtitle">Records and actions available to your {user.role.toLowerCase()} account.</p></div><button className="btn btn-outline-primary" disabled={busy||Boolean(busyAction)} onClick={()=>load()}>Refresh data</button></div>
    <div className="module-tabs" role="tablist" aria-label={`${config.title} views`}>{sections.map(section=><button type="button" role="tab" aria-selected={selected.label===section.label} key={section.label} className={`module-tab${selected.label===section.label?' active':''}`} onClick={()=>load(section)}>{section.label}</button>)}</div>
    {actions.length>0&&<div className="action-grid">{actions.map(label=><ActionForm key={label} label={label} busy={busyAction===label} values={form[label]||{}} onChange={(key,value)=>updateField(label,key,value)} onSubmit={event=>{event.preventDefault();perform(label,form[label]||{})}}/>)}</div>}
    {message&&<div className="alert alert-success" role="status" aria-live="polite">{message}</div>}
    {error&&<div className="alert alert-danger" role="alert">{error}</div>}
    {busy?<div className="loading-state"><span className="spinner-border spinner-border-sm text-primary" role="status"/><span>Loading {selected.label.toLowerCase()}…</span></div>:structured?<div className="page-stack"><RecordSummary title="Faculty profile" record={data.profile}/><div className="dashboard-grid"><RecordTable title="Qualifications" rows={data.qualifications||[]} empty="No qualifications have been recorded."/><RecordTable title="Designation history" rows={data.designation_history||[]} empty="No designation history is available."/></div></div>:name==='students'&&user.role==='STUDENT'&&selected.label==='My Courses'?<CourseTable rows={rows}/>:<RecordTable title={selected.label} rows={rows} empty={emptyMessages[selected.label]||'No records are available.'} actions={hasRowActions?rowControls:undefined}/ >}
  </div>;
}
