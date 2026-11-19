const {test}=require('node:test');const assert=require('node:assert/strict');

test('flight distance is independent of 30, 60, or 144 Hz rendering',async()=>{
 const {travelDelta}=await import('../src/performance.js');
 for(const refresh of [30,60,144]){let distance=0;for(let n=0;n<refresh*10;n++)distance+=travelDelta(1000/refresh,360,false,false);assert.ok(Math.abs(distance-1000)<1e-8);}
 assert.equal(travelDelta(1000,360,true,false),0);assert.equal(travelDelta(1000,360,false,true),0);assert.equal(travelDelta(10000,360,false,false),25);
});

test('automatic resolution settles under load and avoids rapid oscillation',async()=>{
 const {tuneResolution,performancePolicy:p}=await import('../src/performance.js');
 let adaptive={scale:p.initialScale,slowWindows:0,fastWindows:0};
 const first=tuneResolution(adaptive,34,null);assert.equal(first.scale,adaptive.scale);
 adaptive=tuneResolution(first,34,null);assert.ok(adaptive.scale<first.scale);
 for(let n=0;n<100;n++)adaptive=tuneResolution(adaptive,34,30);assert.equal(adaptive.scale,p.minScale);
 const settled=adaptive.scale;for(let n=0;n<20;n++)adaptive=tuneResolution(adaptive,16.7,null);assert.equal(adaptive.scale,settled);
 for(let n=0;n<4;n++)adaptive=tuneResolution(adaptive,16.7,5);assert.equal(adaptive.scale,settled);
 adaptive=tuneResolution(adaptive,16.7,5);assert.ok(adaptive.scale>settled);
 for(let n=0;n<300;n++)adaptive=tuneResolution(adaptive,16.7,5);assert.equal(adaptive.scale,p.maxScale);
});
