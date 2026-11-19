const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {packageSite}=require('../tools/package-site.cjs');

test('Pages artifact contains only browser assets and resolves every module under a repository subpath',()=>{
 const output=packageSite();assert.deepEqual(fs.readdirSync(output).sort(),['.nojekyll','index.html','src']);
 const html=fs.readFileSync(path.join(output,'index.html'),'utf8');
 const base=new URL('https://example.github.io/velvet-sky/');
 const entryAssets=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
 assert.ok(entryAssets.includes('src/main.js'));const seen=new Set();
 function inspect(relative){const url=new URL(relative,base);assert.ok(url.pathname.startsWith(base.pathname));const local=decodeURIComponent(url.pathname.slice(base.pathname.length));assert.ok(fs.existsSync(path.join(output,local)),local);if(!local.endsWith('.js')||seen.has(local))return;seen.add(local);const source=fs.readFileSync(path.join(output,local),'utf8');for(const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)){const dependency=new URL(match[1],url);inspect(dependency.href);}}
 for(const asset of entryAssets)inspect(asset);
 assert.ok(seen.has('src/xr.js'));assert.ok(seen.has('src/camera.js'));
 for(const privateFile of ['server.cjs','style.md','README.md','.git','tests','tools'])assert.equal(fs.existsSync(path.join(output,privateFile)),false);
});
