import {useState} from 'react';
import {Navigate} from 'react-router-dom';
import {useAuth} from '../../context/AuthContext';
import RecaptchaCheckbox from './RecaptchaCheckbox';

export default function Login(){
  const {session,login}=useAuth();
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [recaptchaToken,setRecaptchaToken]=useState('');
  const [resetVersion,setResetVersion]=useState(0);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  if(session)return <Navigate to="/" replace/>;

  async function submit(event){
    event.preventDefault();
    setBusy(true);
    setError('');
    try{
      await login(username.trim(),password,recaptchaToken);
    }catch(failure){
      setError(failure.message);
      setRecaptchaToken('');
      setResetVersion(version=>version+1);
    }finally{setBusy(false)}
  }

  return <main className="login-shell">
    <form className="login-form login-card" onSubmit={submit}>
      <p className="eyebrow">SECURE ACCESS</p>
      <h2>Sign in to your workspace</h2>
      <p className="text-secondary mb-4">Use your university account to continue.</p>
      {error&&<div className="alert alert-danger" role="alert">{error}</div>}
      <label className="form-label" htmlFor="username">Username
        <input id="username" className="form-control form-control-lg" autoComplete="username" autoCapitalize="none" required value={username} onChange={event=>setUsername(event.target.value)}/>
      </label>
      <label className="form-label" htmlFor="password">Password
        <input id="password" className="form-control form-control-lg" type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/>
      </label>
      <RecaptchaCheckbox token={recaptchaToken} onToken={setRecaptchaToken} resetVersion={resetVersion}/>
      <button className="btn btn-primary btn-lg w-100 mt-3" disabled={busy||!username.trim()||!password||!recaptchaToken}>
        {busy?'Signing in…':'Sign in'}
      </button>
      <p className="login-footnote">Your access is protected by your assigned university role.</p>
    </form>
  </main>;
}
