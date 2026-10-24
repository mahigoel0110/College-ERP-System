import {useId,useMemo,useState} from 'react';

const currency=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2});
const dateFormatter=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric'});
const labels={attendance_pct:'Attendance',course_code:'Course code',course_name:'Course',credits:'Credits',term:'Term',capacity:'Capacity',enrolled:'Enrolled',remaining:'Seats left',enrolled_count:'Enrolled',remaining_seats:'Seats left',designation_name:'Designation',weekly_hours:'Weekly hours',years_of_service:'Years of service',period_start:'Period from',period_end:'Period to',basic_pay:'Basic pay',gross_pay:'Gross pay',pf_amount:'Provident fund',professional_tax:'Professional tax',lop_amount:'Loss of pay',net_pay:'Net pay',take_home:'Take home',days_remaining:'Days remaining',days_requested:'Days requested',type_name:'Leave type',payment_status:'Payment status',fee_name:'Fee',fee_structure_id:'Fee item',hostel_room_id:'Room',room_no:'Room number',vacant:'Vacant beds',occupied:'Occupied beds',exam_date:'Exam date',max_marks:'Maximum marks',marks_obtained:'Marks',results_published:'Results published',student_name:'Student',enrollment_no:'Enrollment number',published_at:'Published',requested_at:'Requested',decided_at:'Decision date',registered_at:'Registered',allocated_on:'Allocated',paid_at:'Paid',receipt_no:'Receipt',date_of_joining:'Joined',year_passed:'Year',office_room:'Office',specialization:'Specialization'};

function heading(key){return labels[key]||key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
function display(value,key){
  if(value===null||value===undefined||value==='')return '—';
  if(typeof value==='boolean'||key==='results_published')return value===true||value===1||value==='1'?'Published':'Open';
  if(typeof value==='number'){
    const n=value;
    if(/attendance_pct|percent/i.test(key))return `${n.toFixed(1)}%`;
    if(/^(amount|base_amount|late_fee|total_amount|basic_pay|gross_pay|net_pay|take_home|professional_tax|lop_amount)$|collected$/i.test(key))return currency.format(n);
    if(/_id$|_year$|year_passed|semester_no/i.test(key))return String(n);
    if(/credits/i.test(key))return `${n} credits`;
    if(/hours_per_week|weekly_hours/i.test(key))return `${n} hrs`;
    if(/year_passed/i.test(key))return String(n);
    return new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(n);
  }
  if(typeof value==='string'&&/(date|_at$|_on$|period_start|period_end)/i.test(key)){
    const parsed=new Date(value.length===10?`${value}T00:00:00`:value);
    if(!Number.isNaN(parsed.valueOf()))return dateFormatter.format(parsed);
  }
  return String(value);
}
function Status({value}){
  const text=String(value??'').toUpperCase();
  const tone=['APPROVED','PUBLISHED','PAID','ENROLLED','ACTIVE','PRESENT'].includes(text)?'success':['REJECTED','DROPPED','LOCKED','ABSENT','CLOSED','UNPUBLISHED'].includes(text)?'danger':['PENDING','OPEN'].includes(text)?'warning':'secondary';
  return <span className={`badge text-bg-${tone}`}>{text||'—'}</span>;
}

export function RecordTable({rows=[],title='Records',empty='No records are available.',actions}){
  const [search,setSearch]=useState('');
  const searchId=`record-search-${useId().replace(/:/g,'')}`;
  const columns=useMemo(()=>Array.from(new Set(rows.flatMap(row=>Object.keys(row||{})))).filter(key=>!['password_hash','created_at','updated_at'].includes(key)),[rows]);
  const filtered=useMemo(()=>{const term=search.trim().toLowerCase();if(!term)return rows;return rows.filter(row=>columns.some(key=>String(row?.[key]??'').toLowerCase().includes(term)))},[rows,columns,search]);
  if(!rows.length)return <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">✓</span><div><h3 className="h6 mb-1">Nothing to show yet</h3><p className="mb-0 text-secondary">{empty}</p></div></div>;
  const cell=(row,key)=>{
    if(key==='status'||key==='payment_status'||key==='account_status')return <Status value={row[key]}/>;
    if(key==='results_published')return <Status value={row[key]?'PUBLISHED':'UNPUBLISHED'}/>;
    if(key==='registration_open')return <Status value={row[key]?'OPEN':'CLOSED'}/>;
    if(key==='attendance_pct'){const pct=Number(row[key]);return <span className={`badge text-bg-${pct<75?'danger':pct<85?'warning':'success'}`}>{display(row[key],key)}</span>}
    return display(row[key],key);
  };
  return <section className="record-panel" aria-label={title}>
    <div className="record-toolbar"><div><h2 className="h6 mb-1">{title}</h2><span className="small text-secondary">{filtered.length} {filtered.length===1?'record':'records'}</span></div><label className="visually-hidden" htmlFor={searchId}>Search {title}</label><input id={searchId} className="form-control form-control-sm record-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search records"/></div>
    <div className="table-responsive"><table className="table table-hover align-middle mb-0"><thead><tr>{columns.map(key=><th scope="col" key={key}>{heading(key)}</th>)}{actions&&<th scope="col">Actions</th>}</tr></thead><tbody>{filtered.map((row,index)=><tr key={row[columns[0]]??index}>{columns.map(key=><td key={key}>{cell(row,key)}</td>)}{actions&&<td className="text-nowrap">{actions(row)}</td>}</tr>)}{!filtered.length&&<tr><td colSpan={columns.length+(actions?1:0)} className="text-center text-secondary py-4">No records match this search.</td></tr>}</tbody></table></div>
  </section>;
}

export function RecordSummary({record,title}){
  if(!record||typeof record!=='object')return <div className="empty-state"><div><h3 className="h6 mb-1">No profile available</h3><p className="mb-0 text-secondary">This account has no linked profile record.</p></div></div>;
  return <section className="record-panel"><div className="record-toolbar"><div><h2 className="h6 mb-0">{title}</h2></div></div><dl className="detail-grid">{Object.entries(record).filter(([key,value])=>value!==null&&typeof value!=='object'&&!['password_hash'].includes(key)).map(([key,value])=><div className="detail-item" key={key}><dt>{heading(key)}</dt><dd>{key==='status'?<Status value={value}/>:display(value,key)}</dd></div>)}</dl></section>;
}

export {Status,display,heading};
