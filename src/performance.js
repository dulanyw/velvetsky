// Shared performance policy. All timings are milliseconds; scale is a pixel ratio.
export const performancePolicy=Object.freeze({initialScale:.65,minScale:.38,maxScale:.9,windowMs:1000,slowFrameMs:21,fastFrameMs:18,gpuBudgetMs:14,maxDeltaMs:250});

/** Integrate actual elapsed flight time, independent of display refresh rate.
 * Returns metres advanced. Pauses/hidden tabs contribute zero; long stalls are
 * bounded so compiling a shader or returning from sleep cannot teleport the view. */
export function travelDelta(elapsedMs,speedKmh,paused,hidden){return paused||hidden?0:Math.max(0,Math.min(elapsedMs,performancePolicy.maxDeltaMs))*speedKmh/3600;}

/** Select a resolution after one measured window. No side effects. Two slow
 * windows trigger a decrease; increases require five fast windows with GPU
 * headroom. Absent GPU timing, keep the settled resolution rather than guessing. */
export function tuneResolution(previous,frameMs,gpuMs){
 const slow=frameMs>performancePolicy.slowFrameMs||(gpuMs!==null&&gpuMs>performancePolicy.gpuBudgetMs*1.2);
 const fast=frameMs<performancePolicy.fastFrameMs&&gpuMs!==null&&gpuMs<performancePolicy.gpuBudgetMs*.7;
 const slowWindows=slow?previous.slowWindows+1:0;const fastWindows=fast?previous.fastWindows+1:0;
 let scale=previous.scale;if(slowWindows>=2)scale=Math.max(performancePolicy.minScale,scale*.85);
 else if(fastWindows>=5)scale=Math.min(performancePolicy.maxScale,scale*1.04);
 return {scale,slowWindows:slowWindows>=2?0:slowWindows,fastWindows:fastWindows>=5?0:fastWindows};
}
