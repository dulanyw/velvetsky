// Shared performance policy. All timings are milliseconds; scale is a pixel ratio.
export const performancePolicy=Object.freeze({initialScale:.65,minScale:.38,maxScale:.9,windowMs:1000,slowFrameMs:21,fastFrameMs:18,gpuBudgetMs:14,maxDeltaMs:250});
export const powerPolicy=Object.freeze({fps:30,maxScale:.65,maxPixelRatio:1,raySteps:144});

/** Deadline-based pacing carries fractional refresh timing forward, avoiding the
 * old reset-to-now drift. Returns a slot decision without side effects. */
export function frameSlot(now,nextDue,fps){
 if(!fps)return {due:true,nextDue:null};const interval=1000/fps;
 if(nextDue===null)return {due:true,nextDue:now+interval};
 if(now+.5<nextDue)return {due:false,nextDue};
 return {due:true,nextDue:nextDue+Math.max(1,Math.floor((now-nextDue+.5)/interval)+1)*interval};
}

/** Integrate actual elapsed flight time, independent of display refresh rate.
 * Returns metres advanced. Pauses/hidden tabs contribute zero; long stalls are
 * bounded so compiling a shader or returning from sleep cannot teleport the view. */
export function travelDelta(elapsedMs,speedKmh,paused,hidden){return paused||hidden?0:Math.max(0,Math.min(elapsedMs,performancePolicy.maxDeltaMs))*speedKmh/3600;}

/** Select a resolution after one measured window. No side effects. Two slow
 * windows trigger a decrease; increases require five fast windows with GPU
 * headroom. Absent GPU timing, keep the settled resolution rather than guessing. */
export function tuneResolution(previous,frameMs,gpuMs,targetFrameMs=1000/60){
 const ratio=targetFrameMs/(1000/60);
 const slow=frameMs>performancePolicy.slowFrameMs*ratio||(gpuMs!==null&&gpuMs>performancePolicy.gpuBudgetMs*ratio*1.2);
 const fast=frameMs<performancePolicy.fastFrameMs*ratio&&gpuMs!==null&&gpuMs<performancePolicy.gpuBudgetMs*ratio*.7;
 const slowWindows=slow?previous.slowWindows+1:0;const fastWindows=fast?previous.fastWindows+1:0;
 let scale=previous.scale;if(slowWindows>=2)scale=Math.max(performancePolicy.minScale,scale*.85);
 else if(fastWindows>=5)scale=Math.min(performancePolicy.maxScale,scale*1.04);
 return {scale,slowWindows:slowWindows>=2?0:slowWindows,fastWindows:fastWindows>=5?0:fastWindows};
}

/** Advance a fictional 24-hour clock; rate is simulated minutes per real second.
 * Hidden/paused/frozen time is excluded, and stalls share the travel time cap. */
export function advanceHour(hour,elapsedMs,rate,frozen,paused,hidden){const elapsed=frozen||paused||hidden?0:Math.max(0,Math.min(elapsedMs,performancePolicy.maxDeltaMs));return ((hour+elapsed*rate/60000)%24+24)%24;}
