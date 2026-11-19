const {test}=require('node:test');const assert=require('node:assert/strict');

test('transparent fringes preserve the budget for background clouds',async()=>{
 const {edgeStep}=await import('../src/cloud-traversal.js');
 for(const budget of [144,192]){
  let distance=0,background=false,trans=1;
  for(let i=0;i<budget&&distance<3000;i++){
   if(distance<600){const density=.001,step=edgeStep(4,density);trans*=Math.exp(-density*step*.02);distance+=step;}
   else if(distance<2000)distance+=35; // empty-space traversal
   else{background=true;break;}
  }
  assert.ok(background);assert.ok(trans>.98,'thin foreground remains transmissive');
  assert.ok(budget*4<2000,'the former fine-step policy exhausts this budget');
 }
});

test('dense cloud detail and existing larger distance steps are preserved',async()=>{
 const {edgeStep}=await import('../src/cloud-traversal.js');
 assert.equal(edgeStep(4,.25),4);assert.equal(edgeStep(4,1),4);
 assert.equal(edgeStep(100,0),100);assert.equal(edgeStep(4,0),48);
 let previous=48;for(let i=0;i<=25;i++){const step=edgeStep(4,i/100);assert.ok(step<=previous);previous=step;}
});
