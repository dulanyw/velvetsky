/** Capture a seated origin and yaw alignment from a centre-eye WebXR pose.
 * Scene metres match tracking metres. XR -Z forward maps to scene +Z forward;
 * headset pitch/roll remain physical, independent of the desktop mouse camera. */
export function createXRAnchor(transform,yaw=0){
 const m=transform.matrix,p=transform.position;
 return {origin:[p.x,p.y,p.z],yaw:yaw-Math.atan2(-m[8],m[10])};
}

/** Convert one XRView into reusable shader uniforms, including its asymmetric
 * projection and eye translation. Pass an existing output to avoid frame garbage. */
export function eyeCamera(view,anchor,out={rotation:new Float32Array(9),offset:new Float32Array(3),projection:new Float32Array(4)}){
 const m=view.transform.matrix,p=view.projectionMatrix,c=Math.cos(anchor.yaw),s=Math.sin(anchor.yaw);
 for(let column=0;column<3;column++){
  const i=column*4,j=column*3,x=m[i],y=m[i+1],z=-m[i+2];
  out.rotation[j]=c*x+s*z;out.rotation[j+1]=y;out.rotation[j+2]=-s*x+c*z;
 }
 const x=m[12]-anchor.origin[0],y=m[13]-anchor.origin[1],z=-(m[14]-anchor.origin[2]);
 out.offset[0]=c*x+s*z;out.offset[1]=y;out.offset[2]=-s*x+c*z;
 out.projection[0]=p[0];out.projection[1]=p[5];out.projection[2]=p[8];out.projection[3]=p[9];
 return out;
}
