export const vertex = `#version 300 es
in vec2 position;out vec2 uv;void main(){uv=position;gl_Position=vec4(position,0,1);}`;
export const fragment = `#version 300 es
precision highp float;
in vec2 uv;out vec4 frag;
uniform vec2 resolution;uniform float travel,altitude,cover,hour,cloudType;uniform vec2 look;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .55*noise(p)+.27*noise(p*2.03)+.13*noise(p*4.07)+.05*noise(p*8.1);}
float volumeNoise(vec3 p){float z=floor(p.y);return mix(noise(p.xz+z*vec2(37,17)),noise(p.xz+(z+1.)*vec2(37,17)),smoothstep(0.,1.,fract(p.y)));}
// Ellipsoid distance bound in metres. Used for safe empty-space traversal.
float ellipsoid(vec3 p,vec3 radii){return (length(p/radii)-1.)*min(radii.x,min(radii.y,radii.z));}
// Smooth union joins cloud lobes into a shared body rather than intersecting balls.
float mergeCloud(float a,float b,float width){float h=max(width-abs(a-b),0.)/width;return min(a,b)-h*h*width*.25;}
// World-anchored cumulus clusters: broad flat bases and overlapping rising lobes.
// Returns signed distance in metres; coverage controls occupancy and cluster size.
float cumulusField(vec3 p){
 if(cover<.001)return 10000.;
 vec3 original=p;
 // Broad coherent warping breaks the underlying placement grid into organic banks.
 p.xz+=vec2(noise(p.xz*.00055+19.),noise(p.xz*.00055+83.))*360.-180.;
 vec2 tile=floor(p.xz/2600.);float field=10000.;
 for(int x=-1;x<=1;x++)for(int z=-1;z<=1;z++){
 vec2 id=tile+vec2(float(x),float(z));float seed=hash(id+17.);
 float growth=smoothstep(seed*.76,seed*.76+.24,cover);
 if(growth<.001)continue;
 vec2 center=(id+.5)*2600.+vec2(hash(id+31.),hash(id+73.))*600.-300.;
 float scale=(.8+hash(id+9.)*.55)*sqrt(growth);vec3 q=(p-vec3(center.x,1800.,center.y))/scale;
 float spread=mix(.55,2.1,cover);q.xz/=spread;
 float rotation=seed*6.28318;q.xz=mat2(cos(rotation),-sin(rotation),sin(rotation),cos(rotation))*q.xz;
 q.x/=.8+hash(id+5.)*.6;q.y/=.7+hash(id+6.)*.65;
 float body=ellipsoid(q-vec3(0,30,0),vec3(640,210,470));
 body=mergeCloud(body,ellipsoid(q-vec3(-270,190,20),vec3(330,350,310)),110.);
 body=mergeCloud(body,ellipsoid(q-vec3(160,310,10),vec3(390,430,350)),110.);
 body=mergeCloud(body,ellipsoid(q-vec3(440,130,-50),vec3(280,290,280)),100.);
 body=mergeCloud(body,ellipsoid(q-vec3(30,180,280),vec3(300,300,280)),110.);
 body*=scale*min(.7,spread*.7);body=max(body,1600.-p.y);field=mergeCloud(field,body,150.);
 }
 // A regional weather field supplies connected bodies between the rising towers.
 // Increasing cover shrinks its holes; at 100% its continuous base has no holes.
 float joining=smoothstep(.55,1.,cover);
 float weather=fbm(original.xz*.00042+vec2(41,67));
 float bottom=1580.+noise(original.xz*.001)*90.;
 float top=1920.+fbm(original.xz*.0012)*500.;
 float bank=max(max(bottom-original.y,original.y-top),(weather-mix(-.3,1.1,joining))*2200.);
 if(cover>.55)field=mergeCloud(field,bank,180.);
 // Small boundary erosion reveals billows without dissolving the silhouette.
 if(field<180.)field+=(volumeNoise(p*.006)-.5)*125.+(volumeNoise(p*.017)-.5)*40.+(volumeNoise(p*.038)-.5)*12.;
 return field;
}
float density(vec3 p){
 if(cloudType<.5)return (1.-smoothstep(-45.,18.,cumulusField(p)));
 vec2 q=p.xz*.0007;float base=fbm(q*.43);float shape=volumeNoise(p*.0012)*.7+volumeNoise(p*.003)*.2+volumeNoise(p*.008)*.1;
 float bottom=1400.+base*350.;float height=cloudType<.5?850.:cloudType<1.5?250.:380.;
 if(cloudType>.5&&cloudType<1.5){bottom=3300.;shape=fbm(vec2(q.x*.45+q.y*2.,q.y*7.));}
 float vertical=smoothstep(bottom,bottom+150.,p.y)*(1.-smoothstep(bottom+height*.35,bottom+height,p.y));
 float threshold=mix(.85,.26,cover);return smoothstep(threshold,threshold+.16,shape)*vertical;
}
vec3 sky(vec3 rd,vec3 sun,float day,float warm){
 vec3 horizon=mix(vec3(.055,.07,.12),mix(vec3(.65,.77,.81),vec3(.91,.67,.43),warm),day);
 vec3 zenith=mix(vec3(.009,.018,.045),vec3(.19,.41,.61),day);
 vec3 c=mix(horizon,zenith,pow(max(rd.y,0.),.45));float glow=pow(max(dot(rd,sun),0.),12.);
 c+=vec3(1.,.59,.25)*glow*.22*day;c+=vec3(1.,.82,.51)*smoothstep(.99965,.9999,dot(rd,sun))*2.5;
 return c;
}
vec3 land(vec3 p,vec3 rd,vec3 sun,float day,float warm){
 vec2 w=p.xz;vec2 cell=floor(w/680.);vec2 f=fract(w/680.);float seed=hash(cell);float product=hash(cell+45.);
 vec3 a=vec3(.24,.29,.105),b=vec3(.49,.40,.18);vec3 c=mix(a,b,product);
 c=mix(c,vec3(.17,.24,.12),step(.76,product));c*=.83+.24*noise(w*.025);
 float rows=.5+.5*sin((seed>.5?w.x:w.y)*.43);c*=.94+.06*rows;
 float edge=min(min(f.x,1.-f.x),min(f.y,1.-f.y));c=mix(vec3(.19,.225,.12),c,smoothstep(.002,.009,edge));
 float road=1.-smoothstep(.003,.007,edge);c=mix(c,vec3(.44,.41,.31),road*.9);
 float lake=fbm(w*.00032+vec2(31,81));float water=smoothstep(.645,.665,lake);c=mix(c,vec3(.17,.28,.29),water);
 float sparkle=pow(max(dot(reflect(rd,vec3(0,1,0)),sun),0.),80.);c+=water*sparkle*vec3(1.,.65,.3)*.7;
 vec2 townCell=floor(w/2600.);vec2 local=fract(w/2600.)-.5;float town=step(.82,hash(townCell+90.))*(1.-smoothstep(.12,.22,length(local)))*(1.-water);
 vec2 block=fract(w/55.);float roof=step(.22,block.x)*step(block.x,.8)*step(.2,block.y)*step(block.y,.74);vec3 roofs=mix(vec3(.25,.26,.23),vec3(.55,.49,.39),hash(floor(w/55.)));
 c=mix(c,mix(vec3(.3,.32,.27),roofs,roof),town);
 float trees=step(.72,noise(w*.015))*smoothstep(.028,.009,edge);c=mix(c,vec3(.10,.17,.085),trees*(1.-water));
 c*=mix(vec3(.16,.21,.32),mix(vec3(1.05,1.,.83),vec3(1.12,.79,.49),warm),day);
 float shadow=density(vec3(w.x+1100.,1700.,w.y+600.));c*=1.-shadow*.32;
 float haze=1.-exp(-length(p.xz-vec2(0,travel))*.000065);return mix(c,sky(vec3(rd.x,.015,rd.z),sun,day,warm),haze);
}
void main(){
 vec2 screen=uv;screen.x*=resolution.x/resolution.y;vec3 rd=normalize(vec3(screen*.68,1.));
 float pitch=look.y;rd.yz=mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch))*rd.yz;
 float yaw=look.x;rd.xz=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw))*rd.xz;
 float angle=(hour-6.)/12.*3.14159265;vec3 sun=normalize(vec3(-.65,sin(angle),-cos(angle)*.8));float day=smoothstep(-.18,.12,sun.y);float warm=1.-smoothstep(.12,.65,sun.y);
 vec3 ro=vec3(0,altitude,travel);vec3 col=sky(rd,sun,day,warm);float ground=60000.;
 if(rd.y<-.001){ground=-ro.y/rd.y;vec3 p=ro+rd*ground;col=land(p,rd,sun,day,warm);}
 float entry=(1250.-ro.y)/rd.y,exit=(4100.-ro.y)/rd.y;
 float t=max(0.,min(entry,exit));float end=min(min(ground,28000.),max(entry,exit));float stride=max(1.,(end-t)/72.);
 float trans=1.;vec3 fog=vec3(0);float d=t;
 for(int i=0;i<128;i++){
 if(d>end||trans<.012)break;vec3 p=ro+rd*d;
 float distanceToCloud=cloudType<.5?cumulusField(p):0.;
 if(cloudType<.5&&distanceToCloud>35.){d+=clamp(distanceToCloud*.55,35.,700.);continue;}
 float stepLength=cloudType<.5?32.:stride;
 float den=cloudType<.5?(1.-smoothstep(-45.,18.,distanceToCloud)):density(p);
 if(den>.001){
 float optical=density(p+sun*90.)*.65+density(p+sun*220.)*.9+density(p+sun*460.)*.65;
 float surfaceLight=cloudType<.5?clamp((cumulusField(p+sun*80.)-distanceToCloud)/80.,0.,1.):.5;
 float lighting=exp(-optical*.8)*.55+surfaceLight*.45;
 float alpha=1.-exp(-den*stepLength*.012);
 vec3 ambient=mix(vec3(.29,.36,.45),vec3(.43,.48,.55),smoothstep(1550.,2400.,p.y));
 vec3 direct=mix(vec3(1.04,1.03,.99),vec3(1.17,.88,.59),warm*.65);
 vec3 shade=(ambient+direct*lighting*.85)*(.12+.88*day);
 shade=mix(shade,sky(rd,sun,day,warm),1.-exp(-d*.000025));fog+=trans*alpha*shade;trans*=1.-alpha;}
 d+=stepLength;}
 col=col*trans+fog;
 // The suspension lines remain outside the forward hemisphere.
 float side=abs(look.x);if(side>1.52){float cable=abs(uv.x-(sign(look.x)*.74+uv.y*.12));float line=1.-smoothstep(.001,.004,cable);col=mix(col,vec3(.07,.08,.075),line*smoothstep(1.52,1.9,side));}
 col=col/(col+vec3(.38))*1.16;col=pow(max(col,0.),vec3(.94));float vignette=1.-.1*dot(uv,uv);frag=vec4(col*vignette,1.);
}`;
