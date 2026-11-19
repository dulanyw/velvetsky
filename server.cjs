// Dependency-free loopback static server. Never exposes files outside this project.
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const root=__dirname;const port=8467;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.md':'text/plain'};
/** Resolve an HTTP request to a public application file; reject traversal and private paths. */
function resolvePublicPath(raw){const url=new URL(raw,'http://localhost');const name=decodeURIComponent(url.pathname);if(name==='/'||name==='/index.html')return path.join(root,'index.html');if(!/^\/src\/[a-zA-Z0-9_-]+\.(js|css)$/.test(name))return null;return path.join(root,name);}
/** Serve a validated file with explicit content type and no stale preview caching. */
function serveRequest(req,res){let file;try{file=resolvePublicPath(req.url);}catch{res.writeHead(400).end('Bad request');return;}if(!file){res.writeHead(404).end('Not found');return;}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':`${mime[path.extname(file)]||'application/octet-stream'}; charset=utf-8`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);});}
http.createServer(serveRequest).listen(port,'127.0.0.1',()=>console.log(`Velvet Sky: http://127.0.0.1:${port}`));
