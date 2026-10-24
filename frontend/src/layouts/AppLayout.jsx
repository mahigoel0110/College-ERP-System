import {NavLink,Link,Outlet} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';

export default function AppLayout({children}){
  const {session,logout}=useAuth();
  const role=session.user.role;
  const links=[
    ['Dashboard','/',null],
    ['Student Management','/students',['ADMIN','STUDENT']],
    ['My Fees & Hostel','/student-services',['STUDENT']],
    ['Faculty Management','/faculty',['ADMIN','FACULTY']],
    ['Leave & Payroll','/faculty-b',['ADMIN','FACULTY']],
    ['Examinations','/examinations',['ADMIN','STUDENT','FACULTY']],
    ['Administration','/administration',['ADMIN']],
    ['Notices','/notices',['ADMIN','STUDENT','FACULTY']],
  ];
  const visible=links.filter(([, ,roles])=>!roles||roles.includes(role));
  return <div className="app-shell">
    <header className="topbar"><Link className="brand" to="/">University <span>ERP</span></Link><div className="user-tools"><span className="user-chip"><span className="user-dot" aria-hidden="true"/>{session.user.username}<span className="user-role">{role}</span></span><button className="btn btn-sm btn-outline-light" onClick={logout}>Sign out</button></div></header>
    <div className="app-frame"><aside className="sidebar" aria-label="Main navigation"><div className="sidebar-label">WORKSPACE</div><nav className="nav flex-column">{visible.map(([label,path])=><NavLink end={path==='/'} key={path} className={({isActive})=>`side-link${isActive?' active':''}`} to={path}><span className="side-link-mark" aria-hidden="true"/>{label}</NavLink>)}</nav><div className="sidebar-footer"><span className="sidebar-status"/>Academic year 2026–27</div></aside><main className="page-content">{children||<Outlet/>}</main></div>
  </div>;
}
