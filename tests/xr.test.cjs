const {test}=require('node:test');const assert=require('node:assert/strict');

/** Fake only platform boundaries, exercising the real session/pose lifecycle. */
async function fixture(options={}){
 const {createXRController}=await import('../src/xr.js');
 const events=new Map(),callbacks=new Map();let next=0;
 const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,1.6,0,1]);
 const transform={matrix:identity,position:{x:0,y:1.6,z:0}};
 const projection=new Float32Array([1,0,0,0,0,1,0,0,0,0,-1,-1,0,0,-.2,0]);
 const pose={transform,views:['left','right'].map((eye,i)=>{const matrix=identity.slice();matrix[12]=i?.032:-.032;return {eye,projectionMatrix:projection,transform:{matrix}};})};
 const session={visibilityState:'visible',addEventListener:(name,cb)=>events.set(name,cb),requestReferenceSpace:async name=>{assert.equal(name,'local');return {addEventListener(){}};},updateRenderState(value){this.layer=value.baseLayer;},requestAnimationFrame:cb=>{callbacks.set(++next,cb);return next;},cancelAnimationFrame:id=>callbacks.delete(id),async end(){events.get('end')?.();}};
 const calls={requests:[],views:[],enters:0,exits:0,prepared:[],clears:0};
 const gl={FRAMEBUFFER:1,SCISSOR_TEST:2,COLOR_BUFFER_BIT:4,makeXRCompatible:async()=>{},isContextLost:()=>false,bindFramebuffer(){},disable(){},clearColor(){},clear(){calls.clears++;},viewport(){}};
 const state={travel:123,hour:17.6,yaw:0,speed:65,paused:false,timeFrozen:0,powerMode:0};
 const button={disabled:true},status={textContent:''};
 const system={isSessionSupported:async()=>options.supported!==false,requestSession:async(...args)=>{calls.requests.push(args);if(options.reject)throw Object.assign(new Error('cancelled'),{name:'NotAllowedError'});return session;}};
 const controller=createXRController({gl,state,button,status,system,secure:options.secure!==false,prepare:value=>calls.prepared.push(value),renderEye:(snapshot,camera,viewport)=>{if(options.renderFailure)throw new Error('draw failed');calls.views.push({snapshot,camera,viewport});},onEnter:()=>calls.enters++,onExit:()=>calls.exits++,createLayer:()=>({framebuffer:{},getViewport:view=>({x:view.eye==='left'?0:100,y:0,width:100,height:100})})});
 function tick(value=pose){const [id,cb]=callbacks.entries().next().value;callbacks.delete(id);cb(0,{getViewerPose:()=>value});}
 return {controller,calls,session,state,button,status,tick,callbacks,gl};
}

test('unsupported/insecure browsers keep desktop usable without prompting',async()=>{
 for(const options of [{supported:false},{secure:false}]){const f=await fixture(options);await f.controller.initialize();assert.equal(f.controller.phase,'unavailable');assert.equal(f.button.disabled,true);await f.controller.enter();assert.equal(f.calls.requests.length,0);}
});

test('VR requests only an immersive session, draws both eyes and freezes scene state',async()=>{
 const f=await fixture();await f.controller.initialize();await f.controller.enter();
 assert.deepEqual(f.calls.requests,[['immersive-vr']]);assert.equal(f.calls.enters,1);
 const before={...f.state};f.tick();f.tick();assert.equal(f.calls.views.length,4);
 assert.equal(f.calls.views[0].viewport.x,0);assert.equal(f.calls.views[1].viewport.x,100);
 assert.ok(f.calls.views[0].camera.offset[0]<f.calls.views[1].camera.offset[0]);
 assert.equal(f.calls.prepared[0].paused,true);assert.equal(f.calls.prepared[0].timeFrozen,1);
 assert.deepEqual(f.state,before);await f.controller.exit();assert.equal(f.calls.exits,1);assert.equal(f.callbacks.size,0);assert.equal(f.controller.phase,'ready');
});

test('tracking loss and hidden sessions submit no invented eye poses',async()=>{
 const f=await fixture();await f.controller.initialize();await f.controller.enter();f.tick(null);
 f.session.visibilityState='hidden';f.tick();assert.equal(f.calls.views.length,0);assert.equal(f.callbacks.size,1);
 f.session.visibilityState='visible';f.tick();assert.equal(f.calls.views.length,2);
 await f.session.end();assert.equal(f.calls.exits,1);
});

test('cancelled entry and partial setup failure leave a working retry path',async()=>{
 const rejected=await fixture({reject:true});await rejected.controller.initialize();await rejected.controller.enter();assert.equal(rejected.controller.phase,'ready');assert.equal(rejected.calls.enters,0);assert.equal(rejected.button.disabled,false);assert.match(rejected.status.textContent,/cancelled/);
 const partial=await fixture();partial.session.requestReferenceSpace=async()=>{throw new Error('reference space unavailable');};await partial.controller.initialize();await partial.controller.enter();assert.equal(partial.controller.phase,'ready');assert.equal(partial.calls.enters,0);assert.equal(partial.calls.exits,0);assert.equal(partial.callbacks.size,0);
});

test('session ending during compatibility setup cannot start an orphan frame loop',async()=>{
 const f=await fixture();let release;f.gl.makeXRCompatible=()=>new Promise(resolve=>{release=resolve;});
 await f.controller.initialize();const entering=f.controller.enter();await Promise.resolve();
 await f.session.end();release();await entering;
 assert.equal(f.controller.phase,'ready');assert.equal(f.calls.enters,0);assert.equal(f.callbacks.size,0);
});

test('render failure restores desktop once and preserves a useful error',async()=>{
 const f=await fixture({renderFailure:true});await f.controller.initialize();await f.controller.enter();f.tick();await Promise.resolve();
 assert.equal(f.calls.exits,1);assert.equal(f.callbacks.size,0);assert.match(f.status.textContent,/draw failed/);
 await f.controller.exit();assert.equal(f.calls.exits,1);
});
