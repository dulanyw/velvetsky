import {vertex, fragment} from './shaders.js';

// Shared scene defaults. Distances are metres; speed is kilometres per hour.
const config = Object.freeze({fps:30, altitude:850, speed:65, cover:42, hour:17.6, cloud:0, moon:0, celestialScale:6, eclipse:0, eclipseProgress:50, quality:.65});

/** Compile one GPU stage. Returns a shader or throws the compiler diagnostic. */
function compileShader(gl,type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;}

/** Create the renderer from a canvas; owns GPU resources and reports unsupported WebGL. */
function createRenderer(canvas){
 const gl=canvas.getContext('webgl2',{antialias:false,alpha:false,powerPreference:'low-power'});
 if(!gl)throw new Error('This view needs WebGL 2. Please enable hardware acceleration in your browser.');
 const program=gl.createProgram();gl.attachShader(program,compileShader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(program,compileShader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 const location=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
 const uniforms=Object.fromEntries(['resolution','travel','altitude','cover','hour','cloudType','moon','celestialScale','eclipse','eclipseProgress','look'].map(key=>[key,gl.getUniformLocation(program,key)]));
 return {gl,uniforms,canvas};
}

/** Resize only when needed. Quality caps pixel cost independently of display scaling. */
function resizeRenderer(renderer,quality){const {canvas,gl}=renderer;const scale=Math.min(devicePixelRatio,1.5)*quality;const w=Math.round(innerWidth*scale),h=Math.round(innerHeight*scale);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}}

/** Upload a scene snapshot and draw one full-screen procedural frame. */
function drawScene(renderer,state){const {gl,uniforms:u,canvas}=renderer;resizeRenderer(renderer,state.quality);gl.uniform2f(u.resolution,canvas.width,canvas.height);gl.uniform1f(u.travel,state.travel);gl.uniform1f(u.altitude,state.altitude);gl.uniform1f(u.cover,state.cover/100);gl.uniform1f(u.hour,state.hour);gl.uniform1f(u.cloudType,state.cloud);gl.uniform1f(u.moon,state.moon);gl.uniform1f(u.celestialScale,state.celestialScale);gl.uniform1f(u.eclipse,state.eclipse);gl.uniform1f(u.eclipseProgress,state.eclipseProgress/100);gl.uniform2f(u.look,state.yaw,state.pitch);gl.drawArrays(gl.TRIANGLES,0,3);}

/** Bind accessible controls to explicit scene state. Installs DOM event handlers. */
function bindControls(canvas,state){
 const formatters={eclipseProgress:v=>`${v}%`,altitude:v=>`${Math.round(v/.3048).toLocaleString()} ft`,speed:v=>`${v} km/h`,cover:v=>`${v}%`,hour:v=>`${String(Math.floor(Math.round(v*60)/60)%24).padStart(2,'0')}:${String(Math.round(v*60)%60).padStart(2,'0')}`};
 for(const key of ['altitude','speed','cover','hour','cloud','moon','celestialScale','eclipse','eclipseProgress','quality']){const input=document.getElementById(key);input.value=state[key];const sync=()=>{state[key]=Number(input.value);const output=document.getElementById(`${key}-value`);if(output){output.value=formatters[key](state[key]);input.setAttribute('aria-valuetext',output.value);}};input.addEventListener('input',sync);sync();}
 const recenter=()=>{state.yaw=0;state.pitch=.12;};
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
 canvas.addEventListener('pointermove',event=>{if(!drag)return;state.yaw-=(event.clientX-drag.x)*.004;state.pitch=Math.max(-1.45,Math.min(1.45,state.pitch+(event.clientY-drag.y)*.004));state.yaw=Math.atan2(Math.sin(state.yaw),Math.cos(state.yaw));drag={x:event.clientX,y:event.clientY};});
 const endDrag=()=>{drag=null;};canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
 const toggle=document.getElementById('toggle'),panel=document.getElementById('panel');toggle.onclick=()=>{if(document.body.classList.contains('clean')){document.body.classList.remove('clean');panel.hidden=false;}else panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));};
 document.getElementById('pause').onclick=event=>{state.paused=!state.paused;event.currentTarget.textContent=state.paused?'Resume':'Pause';event.currentTarget.setAttribute('aria-pressed',String(state.paused));};
 document.getElementById('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(error){console.info('Fullscreen unavailable',error.message);}};
 window.addEventListener('keydown',event=>{if(event.target.matches('input,select,button'))return;if(event.key.toLowerCase()==='h'){document.body.classList.toggle('clean');toggle.setAttribute('aria-expanded',String(!document.body.classList.contains('clean')&&!panel.hidden));}if(event.key==='Home')recenter();});
}

/** Start capped animation. Hidden tabs stop travel; elapsed jumps are clamped. */
function startFlight(renderer,state){let last=0;function frame(now){requestAnimationFrame(frame);if(document.hidden){last=now;return;}const elapsed=(now-last)/1000;if(elapsed<1/config.fps)return;last=now;if(!state.paused)state.travel+=Math.min(elapsed,.1)*state.speed/3.6;drawScene(renderer,state);}requestAnimationFrame(frame);}

/** Orchestrate initialization; surface any rendering failure as readable UI. */
function main(){try{const canvas=document.getElementById('sky');const state={...config,travel:0,yaw:0,pitch:.12,paused:false};const renderer=createRenderer(canvas);bindControls(canvas,state);startFlight(renderer,state);canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();const box=document.getElementById('error');box.hidden=false;box.textContent='The graphics context was interrupted. Reload to resume your flight.';});}catch(error){const box=document.getElementById('error');box.hidden=false;box.textContent=error.message;console.error(error);}}
main();
