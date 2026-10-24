import {useEffect,useRef,useState} from 'react';

const SCRIPT_ID='erp-google-recaptcha-v2';
const PROMISE_KEY='__erpGoogleRecaptchaPromise';
const CALLBACK_NAME='erpGoogleRecaptchaOnLoad';
const LOAD_TIMEOUT_MS=15000;

function loadGoogleRecaptcha(){
  const existingApi=window.grecaptcha;
  if(existingApi?.render&&typeof existingApi.ready==='function'){
    return new Promise((resolve,reject)=>{
      try{existingApi.ready(()=>resolve(existingApi));}
      catch{reject(new Error('Google reCAPTCHA could not initialize.'));}
    });
  }
  if(window[PROMISE_KEY])return window[PROMISE_KEY];

  let resolveLoad;
  let rejectLoad;
  const promise=new Promise((resolve,reject)=>{resolveLoad=resolve;rejectLoad=reject;});
  window[PROMISE_KEY]=promise;
  let settled=false;
  let readinessRequested=false;
  let script=document.getElementById(SCRIPT_ID);
  let timeout;

  const cleanup=()=>{
    window.clearTimeout(timeout);
    script?.removeEventListener('load',onLoad);
    script?.removeEventListener('error',onError);
    if(window[CALLBACK_NAME]===onGoogleReady)delete window[CALLBACK_NAME];
  };
  const fail=message=>{
    if(settled)return;
    settled=true;
    cleanup();
    if(window[PROMISE_KEY]===promise)window[PROMISE_KEY]=null;
    rejectLoad(new Error(message));
  };
  const onGoogleReady=()=>{
    const api=window.grecaptcha;
    if(!api||typeof api.render!=='function'||typeof api.ready!=='function')return;
    if(readinessRequested)return;
    readinessRequested=true;
    try{
      api.ready(()=>{
        if(settled)return;
        settled=true;
        cleanup();
        resolveLoad(api);
      });
    }catch{fail('Google reCAPTCHA could not initialize.');}
  };
  const onLoad=()=>onGoogleReady();
  const onError=()=>fail('Google reCAPTCHA could not be loaded.');

  window[CALLBACK_NAME]=onGoogleReady;
  timeout=window.setTimeout(()=>fail('Google reCAPTCHA initialization timed out.'),LOAD_TIMEOUT_MS);
  if(!script){
    script=document.createElement('script');
    script.id=SCRIPT_ID;
    script.src=`https://www.google.com/recaptcha/api.js?onload=${CALLBACK_NAME}&render=explicit`;
    script.async=true;
    script.defer=true;
    script.addEventListener('load',onLoad,{once:true});
    script.addEventListener('error',onError,{once:true});
    document.head.appendChild(script);
  }else{
    script.addEventListener('load',onLoad,{once:true});
    script.addEventListener('error',onError,{once:true});
    // A previously loaded script may have fired its load event before this
    // component mounted. Use the API when available; otherwise the callback
    // or timeout will resolve this shared initialization attempt.
    onGoogleReady();
  }
  return promise;
}

export default function RecaptchaCheckbox({token,onToken,resetVersion}){
  const containerRef=useRef(null);
  const widgetIdRef=useRef(null);
  const onTokenRef=useRef(onToken);
  const [status,setStatus]=useState('loading');
  const [loadAttempt,setLoadAttempt]=useState(0);
  const siteKey=import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  onTokenRef.current=onToken;

  useEffect(()=>{
    let disposed=false;
    const container=containerRef.current;
    widgetIdRef.current=null;
    if(!siteKey){setStatus('missing-key');return()=>{disposed=true};}
    setStatus('loading');
    loadGoogleRecaptcha().then(grecaptcha=>{
      if(disposed||!container||containerRef.current!==container)return;
      try{
        container.replaceChildren();
        widgetIdRef.current=grecaptcha.render(container,{
          sitekey:siteKey,
          callback:responseToken=>{
            if(typeof responseToken==='string'&&responseToken.length){onTokenRef.current(responseToken);setStatus('verified');}
            else{onTokenRef.current('');setStatus('error');}
          },
          'expired-callback':()=>{onTokenRef.current('');setStatus('expired')},
          'error-callback':()=>{onTokenRef.current('');setStatus('error')},
        });
        setStatus('ready');
      }catch{onTokenRef.current('');setStatus('error');}
    }).catch(()=>{if(!disposed){onTokenRef.current('');setStatus('error');}});
    return()=>{
      disposed=true;
      if(container){container.replaceChildren();}
      widgetIdRef.current=null;
    };
  },[siteKey,loadAttempt]);

  useEffect(()=>{
    if(!resetVersion||widgetIdRef.current===null||!window.grecaptcha)return;
    window.grecaptcha.reset(widgetIdRef.current);
    onTokenRef.current('');
    setStatus('ready');
  },[resetVersion]);

  function retry(){
    onTokenRef.current('');
    const script=document.getElementById(SCRIPT_ID);
    if(!window.grecaptcha?.render){
      script?.remove();
      window[PROMISE_KEY]=null;
      delete window[CALLBACK_NAME];
    }else if(widgetIdRef.current!==null){
      window.grecaptcha.reset(widgetIdRef.current);
    }
    widgetIdRef.current=null;
    setLoadAttempt(attempt=>attempt+1);
  }

  return <div className="recaptcha-check" aria-live="polite">
    <div ref={containerRef} />
    {status==='loading'&&<p className="small text-secondary mt-2">Loading Google reCAPTCHA…</p>}
    {status==='missing-key'&&<p className="small text-danger mt-2" role="alert">Google reCAPTCHA is not configured. Set VITE_RECAPTCHA_SITE_KEY in frontend/.env and restart Vite.</p>}
    {status==='error'&&<div className="small text-danger mt-2" role="alert">Google reCAPTCHA could not load or encountered an error. Check the network and allowed domains, then retry.<button type="button" className="btn btn-link btn-sm p-0 ms-1" onClick={retry}>Retry CAPTCHA</button></div>}
    {status==='expired'&&<p className="small text-danger mt-2" role="alert">The CAPTCHA expired. Complete the checkbox again.</p>}
    {token&&status==='verified'&&<span className="visually-hidden">CAPTCHA completed</span>}
  </div>;
}
