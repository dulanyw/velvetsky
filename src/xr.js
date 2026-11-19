import {createXRAnchor,eyeCamera} from './camera.js';

// Initial headset profiling preset, separate from desktop frame pacing.
export const xrPolicy=Object.freeze({framebufferScale:.5});

/** Own the optional immersive session. Dependencies are explicit for lifecycle
 * tests. Requests no eye, hand, DOM-overlay or controller features in this first
 * stationary milestone. Native headset/browser UI provides the immersive exit. */
export function createXRController({gl,state,button,status,prepare,renderEye,onEnter,onExit,
 system=globalThis.navigator?.xr,secure=globalThis.isSecureContext,
 createLayer=(session,context)=>new XRWebGLLayer(session,context,{alpha:false,depth:false,stencil:false,antialias:false,framebufferScaleFactor:xrPolicy.framebufferScale})}){
 let supported=false,session=null,space=null,layer=null,handle=null,anchor=null,snapshot=null,entered=false,phase='checking',failure='';
 const cameras=new Map();

 /** Restore desktop ownership exactly once, including failed partial entry. */
 function finish(candidate){
  if(!candidate||session!==candidate)return;
  if(handle!==null)candidate.cancelAnimationFrame(handle);
  session=null;handle=null;space=null;layer=null;anchor=null;cameras.clear();
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  if(entered){entered=false;onExit();}
  phase=supported?'ready':'unavailable';button.disabled=!supported;button.textContent='Enter VR';
  status.textContent=failure||'VR preview ended. Desktop settings restored.';
 }

 /** Draw all runtime-provided views at headset cadence, even with flight frozen.
  * Missing/hidden tracking clears the frame and never substitutes a fake pose. */
 function frame(now,xrFrame){
  const current=session;if(!current||phase!=='active')return;
  handle=current.requestAnimationFrame(frame);
  try{
   gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);gl.disable(gl.SCISSOR_TEST);
   gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
   if(current.visibilityState==='hidden')return;
   const pose=xrFrame.getViewerPose(space);if(!pose)return;
   if(!anchor)anchor=createXRAnchor(pose.transform,snapshot.yaw);
   for(const view of pose.views){
    const viewport=layer.getViewport(view);if(!viewport)continue;
    const camera=eyeCamera(view,anchor,cameras.get(view.eye));cameras.set(view.eye,camera);
    gl.viewport(viewport.x,viewport.y,viewport.width,viewport.height);
    renderEye(snapshot,camera,viewport);
   }
  }catch(error){failure=`VR rendering stopped: ${error.message}`;phase='ending';void current.end().catch(()=>finish(current));}
 }

 /** Start only from a user gesture. Compile the selected cheaper lighting variant
  * before scheduling immersive frames; do not change desktop settings or time. */
 async function enter(){
  if(phase!=='ready')return;phase='entering';failure='';button.disabled=true;button.textContent='Starting VR…';
  let candidate;
  try{
   candidate=await system.requestSession('immersive-vr');session=candidate;
   candidate.addEventListener('end',()=>finish(candidate),{once:true});
   await gl.makeXRCompatible();if(session!==candidate)return;
   if(gl.isContextLost())throw new Error('Graphics context changed. Reload before entering VR.');
   space=await candidate.requestReferenceSpace('local');if(session!==candidate)return;
   space.addEventListener('reset',()=>{anchor=null;});
   layer=createLayer(candidate,gl);candidate.updateRenderState({baseLayer:layer});
   snapshot={...state,powerMode:1,paused:true,timeFrozen:1,immersive:true};
   prepare(snapshot);entered=true;onEnter();phase='active';
   button.disabled=false;button.textContent='Exit VR';status.textContent='Stationary VR preview active.';
   handle=candidate.requestAnimationFrame(frame);
  }catch(error){
   if(candidate&&session===candidate){try{await candidate.end();}catch{}finish(candidate);}
   phase='ready';button.disabled=false;button.textContent='Enter VR';
   status.textContent=error.name==='NotAllowedError'?'VR entry was cancelled or blocked. You can try again.':`Could not enter VR: ${error.message}`;
  }
 }

 /** End the current session; its end event owns restoration. */
 async function exit(){if(session)try{await session.end();}catch{finish(session);}}

 /** Read support without prompting or starting a session; desktop is always usable. */
 async function initialize(){
  if(!secure||!system){phase='unavailable';button.textContent='VR unavailable';button.disabled=true;status.textContent=secure?'Open this page in a WebXR headset browser.':'VR requires HTTPS or localhost.';return;}
  try{supported=await system.isSessionSupported('immersive-vr');}catch{supported=false;}
  phase=supported?'ready':'unavailable';button.disabled=!supported;button.textContent=supported?'Enter VR':'VR unavailable';
  status.textContent=supported?'Stationary preview. Choose your scene before entering.':'No immersive VR device is available in this browser.';
 }
 button.onclick=()=>phase==='active'?void exit():void enter();
 return {initialize,enter,exit,get phase(){return phase;}};
}
