const mysql = require('mysql2/promise');
const pool = mysql.createPool({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'college_erp',waitForConnections:true,connectionLimit:10,decimalNumbers:true});
async function query(sql,params=[]){const [rows]=await pool.execute(sql,params);return rows;}
async function callProcedure(name,params=[]){if(!/^sp_[a-z0-9_]+$/i.test(name))throw new Error('Invalid procedure name');const placeholders=params.map(()=>'?').join(',');const [result]=await pool.query(`CALL ${name}(${placeholders})`,params);return result;}
module.exports={pool,query,callProcedure};
