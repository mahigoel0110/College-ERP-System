function createRateLimiter({windowMs=900000,max=100,message='Too many requests. Try again later.',now=Date.now}={}){
  const hits=new Map();
  return (req,res,next)=>{
    const key=req.ip||req.socket?.remoteAddress||'unknown';
    const timestamp=now();
    let bucket=hits.get(key);
    if(!bucket||timestamp>=bucket.resetAt){bucket={count:0,resetAt:timestamp+windowMs};hits.set(key,bucket);}
    bucket.count+=1;
    res.setHeader('RateLimit-Limit',String(max));
    res.setHeader('RateLimit-Remaining',String(Math.max(0,max-bucket.count)));
    res.setHeader('RateLimit-Reset',String(Math.ceil(bucket.resetAt/1000)));
    if(bucket.count>max){
      res.setHeader('Retry-After',String(Math.max(1,Math.ceil((bucket.resetAt-timestamp)/1000))));
      return res.status(429).json({error:{message}});
    }
    if(hits.size>10000)for(const [entryKey,entry] of hits)if(timestamp>=entry.resetAt)hits.delete(entryKey);
    return next();
  };
}

module.exports={createRateLimiter};
