import {vertex, fragment} from './shaders.js';
import {performancePolicy,powerPolicy,frameSlot,travelDelta,tuneResolution} from './performance.js';

// Shared scene defaults. Distances are metres; speed is kilometres per hour.
const config = Object.freeze({powerMode:1,raySteps:192, neighborRadius:1, altitude:850, speed:65, cover:42, hour:17.6, cloud:0, moon:0, celestialScale:6, eclipse:0, eclipseProgress:50, quality:0});

/** Compile one GPU stage. Returns a shader or throws the compiler diagnostic. */
function compileShader(gl,type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;}

/** Compile a cloud-specific program so unused volume models are removed by GLSL.
 * Returns its program and uniform handles. Caller owns the cache and GPU lifetime. */
function createCloudProgram(gl,mode,powerMode){
 const source=fragment.replace('#version 300 es',`#version 300 es\n#define CLOUD_MODE ${mode}\n#define POWER_SAVING ${powerMode}`).replace('cloudType,','').replace('precision highp float;','precision highp float;\nconst float cloudType=float(CLOUD_MODE);');
 const program=gl.createProgram();const stages=[compileShader(gl,gl.VERTEX_SHADER,vertex),compileShader(gl,gl.FRAGMENT_SHADER,source)];for(const stage of stages)gl.attachShader(program,stage);gl.bindAttribLocation(program,0,'position');gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));for(const stage of stages)gl.deleteShader(stage);
 const uniforms=Object.fromEntries(['raySteps','neighborRadius','resolution','travel','altitude','cover','hour','moon','celestialScale','eclipse','eclipseProgress','look'].map(key=>[key,gl.getUniformLocation(program,key)]));return {program,uniforms};
}

/** Create the renderer from a canvas; owns GPU resources and reports unsupported WebGL. */
function createRenderer(canvas){
 const gl=canvas.getContext('webgl2',{antialias:false,alpha:false,powerPreference:'default',depth:false,stencil:false});
 if(!gl)throw new Error('This view needs WebGL 2. Please enable hardware acceleration in your browser.');
 const initial=createCloudProgram(gl,config.cloud,config.powerMode);const program=initial.program;gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 const location=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
 return {gl,canvas,programs:new Map([[`${config.cloud}:${config.powerMode}`,initial]]),timer:gl.getExtension('EXT_disjoint_timer_query_webgl2'),queries:[],gpuMs:null,frameNumber:0,warmup:true};
}

/** Read completed optional GPU timers without waiting for the GPU. Deletes every
 * completed query; disjoint measurements are discarded. Unsupported devices use
 * animation cadence alone for downward scaling. */
function pollGpuTimers(renderer){const {gl,timer,queries}=renderer;if(!timer)return;const disjoint=gl.getParameter(timer.GPU_DISJOINT_EXT);for(let i=queries.length-1;i>=0;i--){const query=queries[i];if(gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){if(!disjoint){const ms=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;renderer.gpuMs=renderer.gpuMs===null?ms:renderer.gpuMs*.75+ms*.25;}gl.deleteQuery(query);queries.splice(i,1);}}if(disjoint)renderer.gpuMs=null;}

/** Submit one draw, occasionally bracketed by an asynchronous GPU timer. */
function submitFrame(renderer){const {gl,timer,queries}=renderer;pollGpuTimers(renderer);const query=timer&&renderer.frameNumber++%12===0&&queries.length<3?gl.createQuery():null;if(query)gl.beginQuery(timer.TIME_ELAPSED_EXT,query);gl.drawArrays(gl.TRIANGLES,0,3);if(query){gl.endQuery(timer.TIME_ELAPSED_EXT);queries.push(query);}}

/** Resize only when needed. Quality caps pixel cost independently of display scaling. */
function resizeRenderer(renderer,quality,maxPixelRatio=1.5){const {canvas,gl}=renderer;const scale=Math.min(devicePixelRatio,maxPixelRatio)*quality;const w=Math.round(innerWidth*scale),h=Math.round(innerHeight*scale);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}}

/** Upload a scene snapshot and draw one full-screen procedural frame. */
function drawScene(renderer,state){const {gl,canvas}=renderer;const key=`${state.cloud}:${state.powerMode}`;const compiled=renderer.warmup||!renderer.programs.has(key);renderer.warmup=false;if(!renderer.programs.has(key))renderer.programs.set(key,createCloudProgram(gl,state.cloud,state.powerMode));const {program,uniforms:u}=renderer.programs.get(key);gl.useProgram(program);const quality=state.quality||state.autoScale;resizeRenderer(renderer,state.powerMode?Math.min(quality,powerPolicy.maxScale):quality,state.powerMode?powerPolicy.maxPixelRatio:1.5);gl.uniform1i(u.raySteps,state.powerMode?powerPolicy.raySteps:state.raySteps);gl.uniform1i(u.neighborRadius,state.neighborRadius);gl.uniform2f(u.resolution,canvas.width,canvas.height);gl.uniform1f(u.travel,state.travel);gl.uniform1f(u.altitude,state.altitude);gl.uniform1f(u.cover,state.cover/100);gl.uniform1f(u.hour,state.hour);gl.uniform1f(u.moon,state.moon);gl.uniform1f(u.celestialScale,state.celestialScale);gl.uniform1f(u.eclipse,state.eclipse);gl.uniform1f(u.eclipseProgress,state.eclipseProgress/100);gl.uniform2f(u.look,state.yaw,state.pitch);submitFrame(renderer);return compiled;}

/** Wake an idle renderer after a scene change; schedules at most one callback. */
function invalidate(state){state.wake?.();}

/** Bind accessible controls to explicit scene state. Installs DOM event handlers. */
function bindControls(canvas,state){
 const formatters={eclipseProgress:v=>`${v}%`,altitude:v=>`${Math.round(v/.3048).toLocaleString()} ft`,speed:v=>`${v} km/h`,cover:v=>`${v}%`,hour:v=>`${String(Math.floor(Math.round(v*60)/60)%24).padStart(2,'0')}:${String(Math.round(v*60)%60).padStart(2,'0')}`};
 for(const key of ['altitude','speed','cover','hour','cloud','moon','celestialScale','eclipse','eclipseProgress','powerMode','quality']){const input=document.getElementById(key);input.value=state[key];const sync=()=>{state[key]=Number(input.value);const output=document.getElementById(`${key}-value`);if(output){output.value=formatters[key](state[key]);input.setAttribute('aria-valuetext',output.value);}invalidate(state);};input.addEventListener('input',sync);sync();}
 const recenter=()=>{state.yaw=0;state.pitch=.12;invalidate(state);};
 // Enabling the illustrative eclipse frames the Sun, and selects afternoon only
 // if it is below the horizon. Existing moon phase and fixed-time behaviour persist.
 document.getElementById('eclipse').addEventListener('input',()=>{
  document.getElementById('eclipse-controls').hidden=state.eclipse===0;
  if(!state.eclipse)return;
  if(state.hour<6.5||state.hour>17.5){const time=document.getElementById('hour');time.value='16';time.dispatchEvent(new Event('input'));}
  const angle=(state.hour-6)/12*Math.PI;const sun={x:-.65,y:Math.sin(angle),z:-Math.cos(angle)*.8};
  const length=Math.hypot(sun.x,sun.y,sun.z);state.yaw=Math.atan2(sun.x,sun.z);state.pitch=-Math.asin(sun.y/length);
 });
 document.getElementById('forward').onclick=recenter;canvas.ondblclick=recenter;
 let drag=null;canvas.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);});
 canvas.addEventListener('pointermove',event=>{if(!drag)return;state.yaw-=(event.clientX-drag.x)*.004;state.pitch=Math.max(-1.45,Math.min(1.45,state.pitch+(event.clientY-drag.y)*.004));state.yaw=Math.atan2(Math.sin(state.yaw),Math.cos(state.yaw));drag={x:event.clientX,y:event.clientY};invalidate(state);});
 const endDrag=()=>{drag=null;};canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
 const toggle=document.getElementById('toggle'),panel=document.getElementById('panel');toggle.onclick=()=>{if(document.body.classList.contains('clean')){document.body.classList.remove('clean');panel.hidden=false;}else panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));};
 document.getElementById('pause').onclick=event=>{state.paused=!state.paused;event.currentTarget.textContent=state.paused?'Resume':'Pause';event.currentTarget.setAttribute('aria-pressed',String(state.paused));invalidate(state);};
 document.getElementById('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(error){console.info('Fullscreen unavailable',error.message);}};
 window.addEventListener('keydown',event=>{if(event.target.matches('input,select,button'))return;if(event.key.toLowerCase()==='h'){document.body.classList.toggle('clean');toggle.setAttribute('aria-expanded',String(!document.body.classList.contains('clean')&&!panel.hidden));}if(event.key==='Home')recenter();});
}

/** Schedule display-refresh or deadline-paced draws. Static scenes sleep until an
 * input/resize wakes them; hidden tabs stop scheduling. Travel uses elapsed time,
 * while resolution tuning measures submitted frames, excluding compilation. */
function startFlight(renderer,state){
 let last=null,nextDue=null,pending=null,windowStart=0,frames=0,ignoreUntil=0,previousMode=state.powerMode;
 let adaptive={scale:performancePolicy.initialScale,slowWindows:0,fastWindows:0};
 const output=document.getElementById('performance-value');
 const wake=()=>{if(pending===null&&!document.hidden)pending=requestAnimationFrame(frame);};state.wake=wake;
 window.addEventListener('resize',()=>invalidate(state));
 document.addEventListener('visibilitychange',()=>{if(pending!==null)cancelAnimationFrame(pending);pending=null;last=null;nextDue=null;windowStart=0;frames=0;if(!document.hidden)invalidate(state);});
 function frame(now){
  pending=null;if(document.hidden)return;
  if(previousMode!==state.powerMode){previousMode=state.powerMode;nextDue=null;windowStart=0;frames=0;renderer.gpuMs=null;adaptive={scale:state.powerMode?Math.min(adaptive.scale,powerPolicy.maxScale):adaptive.scale,slowWindows:0,fastWindows:0};}
  const elapsed=last===null?0:now-last;last=now;
  state.travel+=travelDelta(elapsed,state.speed,state.paused,false);
  const moving=!state.paused&&state.speed>0;
  const slot=frameSlot(now,nextDue,state.powerMode?powerPolicy.fps:0);nextDue=slot.nextDue;
  if(!slot.due){wake();return;}
  state.autoScale=adaptive.scale;
  let compiled=false;try{compiled=drawScene(renderer,state);}catch(error){const box=document.getElementById('error');box.hidden=false;box.textContent=error.message;console.error(error);return;}
  if(compiled){last=performance.now();ignoreUntil=last+2000;windowStart=0;frames=0;renderer.gpuMs=null;}
  else if(now>=ignoreUntil){
   if(!windowStart)windowStart=now;frames++;
   if(now-windowStart>=performancePolicy.windowMs){
    const frameMs=(now-windowStart)/Math.max(1,frames-1);
    if(state.quality===0&&moving){const tuned=tuneResolution(adaptive,frameMs,renderer.gpuMs,state.powerMode?1000/powerPolicy.fps:1000/60);adaptive=state.powerMode?{...tuned,scale:Math.min(adaptive.scale,tuned.scale)}:tuned;}
    else adaptive={...adaptive,slowWindows:0,fastWindows:0};
    output.value=`${Math.round(1000/frameMs)} FPS`;windowStart=now;frames=1;
   }
  }
  if(moving)wake();else{last=null;windowStart=0;frames=0;output.value=state.paused?'Paused':'Still';}
 }
 wake();
}

/** Orchestrate initialization; surface any rendering failure as readable UI. */
function main(){try{const canvas=document.getElementById('sky');const state={...config,autoScale:performancePolicy.initialScale,travel:0,yaw:0,pitch:.12,paused:false};const renderer=createRenderer(canvas);bindControls(canvas,state);startFlight(renderer,state);canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();const box=document.getElementById('error');box.hidden=false;box.textContent='The graphics context was interrupted. Reload to resume your flight.';});}catch(error){const box=document.getElementById('error');box.hidden=false;box.textContent=error.message;console.error(error);}}
main();
