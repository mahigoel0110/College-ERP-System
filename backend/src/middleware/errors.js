function notFound(req,res){res.status(404).json({error:{message:'Route not found'}});}
function errors(err,req,res,next){
  if(res.headersSent)return next(err);
  const messages={ER_DUP_ENTRY:'A record with these details already exists.',ER_NO_REFERENCED_ROW_2:'A referenced record was not found.',ER_CHECK_CONSTRAINT_VIOLATED:'One or more values are invalid.',ER_TRUNCATED_WRONG_VALUE_FOR_FIELD:'One or more values are invalid.'};
  let status=500;let message='Internal server error';let code=null;
  if(err.name==='SessionError'&&Number.isInteger(err.statusCode)){status=err.statusCode;message=err.message;}
  else if(['ECONNREFUSED','ETIMEDOUT','PROTOCOL_CONNECTION_LOST','ER_ACCESS_DENIED_ERROR','ER_BAD_DB_ERROR'].includes(err.code)){status=503;code='DATABASE_UNAVAILABLE';message='The ERP database is unavailable. Check the database service and server configuration.';}
  else if(err.type==='entity.parse.failed'){status=400;message='Request body must contain valid JSON.';}
  else if(err.type==='entity.too.large'){status=413;message='Request body is too large.';}
  else if(err.sqlState==='45000'){status=400;message='The requested operation violates a business rule.';}
  else if(messages[err.code]){status=err.code==='ER_DUP_ENTRY'?409:400;message=messages[err.code];}
  if(status>=500)console.error('API request failed',{method:req.method,path:req.path,errorCode:err.code||err.name,sqlState:err.sqlState||null});
  res.status(status).json({error:{...(code?{code}:{}),message}});
}
module.exports={notFound,errors};
