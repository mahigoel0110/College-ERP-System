const VERIFY_URL='https://www.google.com/recaptcha/api/siteverify';
const VERIFY_TIMEOUT_MS=5000;

class RecaptchaError extends Error{
  constructor(code,statusCode,message){super(message);this.name='RecaptchaError';this.code=code;this.statusCode=statusCode;}
}

async function verifyRecaptchaToken(token,{secret=process.env.RECAPTCHA_SECRET_KEY,fetchImpl=fetch}={}){
  if(typeof token!=='string'||!token.trim())throw new RecaptchaError('CAPTCHA_REQUIRED',400,'Complete the reCAPTCHA checkbox.');
  if(!secret)throw new RecaptchaError('CAPTCHA_UNAVAILABLE',503,'CAPTCHA verification is not configured on the server.');

  let response;
  try{
    const body=new URLSearchParams({secret,response:token.trim()});
    response=await fetchImpl(VERIFY_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(VERIFY_TIMEOUT_MS)});
    if(!response.ok)throw new Error('Verification service returned an unsuccessful HTTP status.');
  }catch{
    throw new RecaptchaError('CAPTCHA_UNAVAILABLE',503,'CAPTCHA verification is temporarily unavailable. Try again shortly.');
  }

  let result;
  try{result=await response.json();}
  catch{throw new RecaptchaError('CAPTCHA_UNAVAILABLE',503,'CAPTCHA verification is temporarily unavailable. Try again shortly.');}

  if(result?.success===true)return true;
  const codes=Array.isArray(result?.['error-codes'])?result['error-codes']:[];
  if(codes.includes('missing-input-secret')||codes.includes('invalid-input-secret')||codes.includes('bad-request')){
    throw new RecaptchaError('CAPTCHA_UNAVAILABLE',503,'CAPTCHA verification is not configured correctly on the server.');
  }
  if(codes.includes('timeout-or-duplicate')){
    throw new RecaptchaError('CAPTCHA_EXPIRED',400,'The reCAPTCHA response expired or was already used. Complete the checkbox again.');
  }
  throw new RecaptchaError('CAPTCHA_INVALID',400,'The reCAPTCHA response is invalid. Complete the checkbox again.');
}

module.exports={VERIFY_URL,VERIFY_TIMEOUT_MS,RecaptchaError,verifyRecaptchaToken};
