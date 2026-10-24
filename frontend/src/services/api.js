export async function api(path,{token,method='GET',body,signal}={}){
  const isAuthRoute=path.startsWith('/auth/');
  const request=async(accessToken)=>{
  let response;
  try{
    response=await fetch(`/api${path}`,{method,signal,headers:{...(body?{'Content-Type':'application/json'}:{}),...(accessToken?{Authorization:`Bearer ${accessToken}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  }catch(error){
    if(error.name==='AbortError')throw error;
    throw new Error(`The ERP request to /api${path} could not reach its destination. Check the frontend server and ERP API on port 5000, then retry.`);
  }
  return response;
  };
  let response=await request(token);
  if(response.status===401&&token&&!isAuthRoute){
    const session=JSON.parse(localStorage.getItem('erp_session')||'null');
    if(session?.refreshToken){
      let refreshed;
      try{
        const result=await fetch('/api/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:session.refreshToken})});
        const refreshPayload=await result.json().catch(()=>({}));
        if(!result.ok)throw new Error(refreshPayload.error?.message||'Session expired');
        refreshed=refreshPayload.data;const next={token:refreshed.token,refreshToken:refreshed.refreshToken,user:refreshed.user};window.dispatchEvent(new CustomEvent('erp:session-refreshed',{detail:next}));response=await request(next.token);
      }catch{window.dispatchEvent(new Event('erp:unauthorized'));}
    }
  }
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){
    if(response.status===401&&token&&!isAuthRoute)window.dispatchEvent(new Event('erp:unauthorized'));
    if([502,503,504].includes(response.status))throw new Error(payload.error?.message||'The ERP API is temporarily unavailable. Try again in a moment.');
    if(response.status>=500&&!response.headers.get('content-type')?.includes('application/json'))throw new Error('The frontend proxy could not reach the ERP API on port 5000. Start the API or check its logs, then retry.');
    throw new Error(payload.error?.message||`Request failed (${response.status})`);
  }
  return payload.data;
}
