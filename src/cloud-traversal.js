// Transparent-fringe policy in metres. Shared by shader and CPU regression model.
export const fringeStep=48;
export const fringeDensity=.25;
export const fringeNear=1500;
export const fringeFar=4500;

/** Reference step for an optically thin edge. Dense material retains its original
 * fine step; nearby fringes also retain their original step to avoid popping. Alpha must use the returned step so extinction remains consistent. */
export function edgeStep(nominal,density,distance){const x=Math.max(0,Math.min(1,density/fringeDensity));const weight=1.-x*x*(3.-2.*x);const t=Math.max(0,Math.min(1,(distance-fringeNear)/(fringeFar-fringeNear)));const far=t*t*(3.-2.*t);return Math.max(nominal,fringeStep*weight*weight*far);}

/** Shader counterpart, with policy constants generated from the same source. */
export const traversalGLSL=`float cloudFringeStep(float nominal,float density,float distance){float weight=1.-smoothstep(0.,${fringeDensity},density);return max(nominal,${fringeStep.toFixed(1)}*weight*weight*smoothstep(${fringeNear.toFixed(1)},${fringeFar.toFixed(1)},distance));}`;
