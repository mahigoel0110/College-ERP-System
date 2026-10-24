require('dotenv').config({path:process.env.ENV_FILE||require('path').join(__dirname,'../.env')});
const express=require('express');const cors=require('cors');const helmet=require('helmet');const routes=require('./routes');const {notFound,errors}=require('./middleware/errors');const {pool}=require('./config/db');
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32){console.error('JWT_SECRET must be configured with at least 32 characters');process.exit(1);}
const app=express();
const allowedOrigins=new Set(['http://localhost:5173','http://localhost:5174','http://localhost:5175','http://127.0.0.1:5173','http://127.0.0.1:5174','http://127.0.0.1:5175',...(process.env.CORS_ORIGIN||'').split(',')].map(origin=>origin.trim()).filter(Boolean));
app.use(helmet());
app.use(cors({origin(origin,callback){callback(null,!origin||allowedOrigins.has(origin));}}));
app.use(express.json({limit:'10mb'}));
app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));
app.use('/api',routes);app.use(notFound);app.use(errors);
const port=Number(process.env.PORT||5000);const server=app.listen(port,()=>console.log(`ERP API listening on ${port}`));
async function stop(){server.close(async()=>{await pool.end();process.exit(0);});}process.on('SIGINT',stop);process.on('SIGTERM',stop);
