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

test('30 FPS deadlines remain stable across display refresh rates and jitter',async()=>{
 const {frameSlot}=await import('../src/performance.js');
 for(const hz of [60,120,144]){let next=null,count=0;for(let n=0;n<hz*10;n++){const now=n*1000/hz+Math.sin(n)*.15;const slot=frameSlot(now,next,30);next=slot.nextDue;if(slot.due)count++;}assert.ok(Math.abs(count-300)<=1,`${hz} Hz: ${count}`);}
 assert.equal(frameSlot(1,null,0).due,true);
 const late=frameSlot(1000,100,30);assert.ok(late.nextDue>1000);assert.ok(late.nextDue<=1034);
});

test('intentional 30 FPS is not mistaken for overload',async()=>{
 const {tuneResolution}=await import('../src/performance.js');let state={scale:.65,slowWindows:0,fastWindows:0};
 for(let n=0;n<10;n++)state=tuneResolution(state,1000/30,20,1000/30);
 assert.equal(state.scale,.65);
 for(let n=0;n<2;n++)state=tuneResolution(state,60,45,1000/30);
 assert.ok(state.scale<.65);
});
