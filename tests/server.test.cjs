const test=require('node:test');const assert=require('node:assert/strict');
/** Verify actual preview routing, module MIME types, and private-file protection. Requires the preview server. */
test('preview serves browser assets and keeps project internals private',async()=>{
 for(const [route,type] of [['/','text/html'],['/src/main.js','text/javascript'],['/src/shaders.js','text/javascript'],['/src/performance.js','text/javascript'],['/src/style.css','text/css']]){const response=await fetch(`http://127.0.0.1:8467${route}`);assert.equal(response.status,200);assert.ok(response.headers.get('content-type').startsWith(type));}
 for(const route of ['/.git/config','/style.md','/server.cjs','/src/../README.md']){const response=await fetch(`http://127.0.0.1:8467${route}`);assert.equal(response.status,404);}
});
