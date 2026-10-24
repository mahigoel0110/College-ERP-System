const crypto=require('crypto');
const jwt=require('jsonwebtoken');
const {pool}=require('../config/db');

const ACCESS_TTL='8h';
const REFRESH_TTL='7d';
const secret=()=>process.env.JWT_SECRET;

function accessToken(user){
  return jwt.sign({id:user.user_id,username:user.username,role:user.role,student_id:user.student_id,faculty_id:user.faculty_id,type:'access'},secret(),{algorithm:'HS256',expiresIn:ACCESS_TTL});
}
function refreshToken(userId){
  return jwt.sign({sub:String(userId),type:'refresh',jti:crypto.randomBytes(16).toString('hex')},secret(),{algorithm:'HS256',expiresIn:REFRESH_TTL});
}
function tokenHash(token){return crypto.createHash('sha256').update(token).digest('hex');}
function decodedExpiry(token){return new Date(jwt.decode(token).exp*1000);}
function isMissingTable(error){return error?.code==='ER_NO_SUCH_TABLE';}

async function issueRefreshToken(userId,token){
  try{
    await pool.execute('INSERT INTO refresh_tokens(user_id,token_hash,expires_at) VALUES(?,?,?)',[userId,tokenHash(token),decodedExpiry(token)]);
    return true;
  }catch(error){if(isMissingTable(error))return false;throw error;}
}

class SessionError extends Error{
  constructor(message='Refresh session is invalid or expired.',statusCode=401){super(message);this.statusCode=statusCode;}
}

async function rotateRefreshToken(token){
  let claims;
  try{claims=jwt.verify(token,secret(),{algorithms:['HS256']});}catch{throw new SessionError();}
  if(claims.type!=='refresh'||!claims.sub)throw new SessionError();
  const connection=await pool.getConnection();
  try{
    await connection.beginTransaction();
    const [rows]=await connection.execute('SELECT refresh_token_id,user_id,is_revoked,expires_at FROM refresh_tokens WHERE token_hash=? FOR UPDATE',[tokenHash(token)]);
    const current=rows[0];
    if(!current){await connection.rollback();throw new SessionError();}
    if(current.is_revoked){
      await connection.execute('UPDATE refresh_tokens SET is_revoked=1,revoked_at=COALESCE(revoked_at,NOW()) WHERE user_id=? AND is_revoked=0',[current.user_id]);
      await connection.commit();
      throw new SessionError('Refresh token reuse detected. Sign in again.');
    }
    if(new Date(current.expires_at)<=new Date()){
      await connection.execute('UPDATE refresh_tokens SET is_revoked=1,revoked_at=NOW() WHERE refresh_token_id=?',[current.refresh_token_id]);
      await connection.commit();
      throw new SessionError();
    }
    const [users]=await connection.execute("SELECT u.user_id,u.username,u.email,u.student_id,u.faculty_id,r.role_name role FROM app_user u JOIN role r ON r.role_id=u.role_id WHERE u.user_id=? AND u.is_active=1 AND (u.locked_until IS NULL OR u.locked_until<=NOW()) FOR UPDATE",[current.user_id]);
    const user=users[0];
    if(!user){await connection.execute('UPDATE refresh_tokens SET is_revoked=1,revoked_at=NOW() WHERE refresh_token_id=?',[current.refresh_token_id]);await connection.commit();throw new SessionError();}
    const next=refreshToken(user.user_id);
    const nextHash=tokenHash(next);
    await connection.execute('INSERT INTO refresh_tokens(user_id,token_hash,expires_at) VALUES(?,?,?)',[user.user_id,nextHash,decodedExpiry(next)]);
    await connection.execute('UPDATE refresh_tokens SET is_revoked=1,revoked_at=NOW(),replaced_by_token_hash=? WHERE refresh_token_id=?',[nextHash,current.refresh_token_id]);
    await connection.commit();
    return {token:accessToken(user),refreshToken:next,user:{id:user.user_id,username:user.username,email:user.email,role:user.role,student_id:user.student_id,faculty_id:user.faculty_id}};
  }catch(error){
    if(error instanceof SessionError)throw error;
    await connection.rollback();
    if(isMissingTable(error))throw new SessionError('Refresh sessions are not enabled until the database schema is updated.',503);
    throw error;
  }finally{connection.release();}
}

async function revokeRefreshToken(token){
  if(!token||typeof token!=='string')return;
  try{await pool.execute('UPDATE refresh_tokens SET is_revoked=1,revoked_at=COALESCE(revoked_at,NOW()) WHERE token_hash=?',[tokenHash(token)]);}
  catch(error){if(!isMissingTable(error))throw error;}
}

module.exports={ACCESS_TTL,REFRESH_TTL,accessToken,refreshToken,tokenHash,issueRefreshToken,rotateRefreshToken,revokeRefreshToken,SessionError};
