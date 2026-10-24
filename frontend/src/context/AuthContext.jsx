import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {api} from '../services/api';
const AuthContext=createContext(null);
export function AuthProvider({children}){
  const [session,setSession]=useState(()=>{try{return JSON.parse(localStorage.getItem('erp_session')||'null')}catch{return null}});
  useEffect(()=>{const expire=()=>{localStorage.removeItem('erp_session');setSession(null)};const refreshed=event=>{const next=event.detail;localStorage.setItem('erp_session',JSON.stringify(next));setSession(next)};window.addEventListener('erp:unauthorized',expire);window.addEventListener('erp:session-refreshed',refreshed);return()=>{window.removeEventListener('erp:unauthorized',expire);window.removeEventListener('erp:session-refreshed',refreshed)}},[]);
  const login=async(username,password,recaptchaToken)=>{const data=await api('/auth/login',{method:'POST',body:{username,password,recaptchaToken}});const next={token:data.token,refreshToken:data.refreshToken,user:data.user};localStorage.setItem('erp_session',JSON.stringify(next));setSession(next);};
  const logout=async()=>{try{if(session?.refreshToken)await api('/auth/logout',{method:'POST',body:{refreshToken:session.refreshToken}})}catch{}finally{localStorage.removeItem('erp_session');setSession(null)}};
  const value=useMemo(()=>({session,login,logout}),[session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){return useContext(AuthContext)}
