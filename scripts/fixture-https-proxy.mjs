// HTTPS loopback reverse proxy for CI. Production cookies remain Secure.
// No public listener, no external upstream, no user secrets.
import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
const [cert, key] = process.argv.slice(2);
if (!cert || !key) throw Error('Usage: node fixture-https-proxy.mjs CERT KEY');
const server = https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)}, (req,res)=>{
  if(!req.url?.startsWith('/') || req.url.startsWith('//')) {res.writeHead(400);res.end();return;}
  const headers={...req.headers,'x-forwarded-proto':'https','x-forwarded-host':req.headers.host || '127.0.0.1:3443'};
  const upstream=http.request({hostname:'127.0.0.1',port:3100,path:req.url,method:req.method,headers}, response=>{
    res.writeHead(response.statusCode || 502,response.headers);
    response.pipe(res);
    response.on('error',()=>res.destroy());
  });
  upstream.setTimeout(60000,()=>upstream.destroy());
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});
  req.on('aborted',()=>upstream.destroy());
  res.on('close',()=>{if(!res.writableEnded)upstream.destroy();});
  req.pipe(upstream);
});
server.listen(3443,'127.0.0.1',()=>console.log('HTTPS fixture ready'));
