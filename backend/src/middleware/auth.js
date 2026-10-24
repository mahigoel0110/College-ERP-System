const jwt=require('jsonwebtoken');
function authenticate(req,res,next){const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!token)return res.status(401).json({error:{message:'Authentication required'}});try{const claims=jwt.verify(token,process.env.JWT_SECRET,{algorithms:['HS256']});if(claims.type==='refresh')return res.status(401).json({error:{message:'Invalid or expired session'}});req.user=claims;next();}catch{return res.status(401).json({error:{message:'Invalid or expired session'}});}}
function allow(...roles){return (req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).json({error:{message:'Insufficient role'}});}
function ownStudent(req,res,next){const id=Number(req.params.studentId);if(req.user.role==='ADMIN'||(req.user.role==='STUDENT'&&req.user.student_id===id))return next();return res.status(403).json({error:{message:'Access denied'}});}
module.exports={authenticate,allow,ownStudent};
