import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import {AuthProvider} from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import Login from './modules/auth/Login';
import Dashboard from './modules/Dashboard';
import ModulePage from './modules/ModulePage';

const page=(name,roles)=> <ProtectedRoute roles={roles}><AppLayout><ModulePage key={name} name={name}/></AppLayout></ProtectedRoute>;

export default function App(){
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<Login/>}/>
    <Route path="/" element={<ProtectedRoute><AppLayout/></ProtectedRoute>}>
      <Route index element={<Dashboard/>}/>
    </Route>
    <Route path="/students" element={page('students',['ADMIN','STUDENT'])}/>
    <Route path="/student-services" element={page('student-services',['STUDENT'])}/>
    <Route path="/faculty" element={page('faculty',['ADMIN','FACULTY'])}/>
    <Route path="/faculty-b" element={page('faculty-b',['ADMIN','FACULTY'])}/>
    <Route path="/examinations" element={page('examinations',['ADMIN','FACULTY','STUDENT'])}/>
    <Route path="/administration" element={page('administration',['ADMIN'])}/>
    <Route path="/notices" element={page('notices',['ADMIN','FACULTY','STUDENT'])}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></BrowserRouter></AuthProvider>;
}
