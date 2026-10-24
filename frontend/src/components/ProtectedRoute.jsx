import {Navigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';

export default function ProtectedRoute({children,roles}){
  const {session}=useAuth();
  if(!session)return <Navigate to="/login" replace/>;
  if(roles&&!roles.includes(session.user.role))return <Navigate to="/" replace/>;
  return children;
}
