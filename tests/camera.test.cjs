const {test}=require('node:test');const assert=require('node:assert/strict');

/** Synthetic rigid pose and asymmetric perspective fixture in WebXR coordinates. */
function view(x=0,yaw=0,shift=0){const c=Math.cos(yaw),s=Math.sin(yaw);return {transform:{position:{x,y:1.6,z:0},matrix:new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,x,1.6,0,1])},projectionMatrix:new Float32Array([1,0,0,0,0,1,0,0,shift,0,-1,-1,0,0,-.2,0])};}
/** Reconstruct the shader's world ray from projection coefficients and rotation. */
function ray(camera,x=0,y=0){const p=camera.projection,m=camera.rotation,v=[(x+p[2])/p[0],(y+p[3])/p[1],-1];return [0,1,2].map(i=>m[i]*v[0]+m[i+3]*v[1]+m[i+6]*v[2]);}

test('stereo offsets retain physical IPD and per-eye off-axis projections',async()=>{
 const {createXRAnchor,eyeCamera}=await import('../src/camera.js');const anchor=createXRAnchor(view().transform);
 const left=eyeCamera(view(-.032,0,.04),anchor),right=eyeCamera(view(.032,0,-.04),anchor);
 assert.ok(Math.abs(right.offset[0]-left.offset[0]-.064)<1e-7);
 assert.ok(ray(left)[0]>0&&ray(right)[0]<0);assert.equal(ray(left)[2],1);
 assert.ok(Math.abs(left.offset[1])<1e-6);assert.ok(Math.abs(right.offset[1])<1e-6);
});

test('entry yaw aligns with the scene while subsequent head yaw and translation remain physical',async()=>{
 const {createXRAnchor,eyeCamera}=await import('../src/camera.js');
 const anchor=createXRAnchor(view(10,Math.PI/2).transform,0);
 const initial=ray(eyeCamera(view(10,Math.PI/2),anchor));assert.ok(Math.abs(initial[0])<1e-6);assert.ok(initial[2]>.999);
 const turned=ray(eyeCamera(view(10,Math.PI),anchor));assert.ok(turned[0]<-.999);
 const moved=eyeCamera(view(10.2,Math.PI/2),anchor);assert.ok(Math.abs(Math.hypot(...moved.offset)-.2)<1e-6);
 const same=eyeCamera(view(10,Math.PI/2),anchor,moved);assert.equal(same,moved);
});
