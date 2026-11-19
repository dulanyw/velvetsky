// Build only browser assets for GitHub Pages; Node is not part of the hosted app.
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');

/** Recreate this project's generated dist/ folder, refusing redirected targets.
 * Copies only the entry page and ordinary JS/CSS sources. Returns its absolute path. */
function packageSite(){
 const output=path.resolve(root,'dist');
 if(path.dirname(output)!==root||path.basename(output)!=='dist')throw new Error('Invalid build target.');
 if(fs.existsSync(output)&&fs.lstatSync(output).isSymbolicLink())throw new Error('Refusing redirected dist folder.');
 fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(path.join(output,'src'),{recursive:true});
 fs.copyFileSync(path.join(root,'index.html'),path.join(output,'index.html'));
 for(const name of fs.readdirSync(path.join(root,'src'))){
  const source=path.join(root,'src',name);
  if(/^[a-zA-Z0-9_-]+\.(js|css)$/.test(name)&&fs.lstatSync(source).isFile())fs.copyFileSync(source,path.join(output,'src',name));
 }
 fs.writeFileSync(path.join(output,'.nojekyll'),'');return output;
}
module.exports={packageSite};
if(require.main===module)console.log(`Static site packaged at ${packageSite()}`);
