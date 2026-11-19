// Transparent-fringe policy in metres. Shared by shader and CPU regression model.
export const fringeStep=48;
export const fringeDensity=.25;

/** Reference step for an optically thin edge. Dense material retains its original
 * fine step; alpha must use the returned step so extinction remains consistent. */
export function edgeStep(nominal,density){const x=Math.max(0,Math.min(1,density/fringeDensity));const weight=1.-x*x*(3.-2.*x);return Math.max(nominal,fringeStep*weight*weight);}

/** Shader counterpart, with policy constants generated from the same source. */
export const traversalGLSL=`float cloudFringeStep(float nominal,float density){float weight=1.-smoothstep(0.,${fringeDensity},density);return max(nominal,${fringeStep.toFixed(1)}*weight*weight);}`;
