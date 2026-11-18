export const vertex = `#version 300 es
in vec2 position;out vec2 uv;void main(){uv=position;gl_Position=vec4(position,0,1);}`;
export const fragment = `#version 300 es
precision highp float;
in vec2 uv;out vec4 frag;
uniform vec2 resolution;uniform float travel,altitude,cover,hour,cloudType,moon,celestialScale,eclipse,eclipseProgress;uniform vec2 look;
const float EARTH_RADIUS=6371000.;
const float CELESTIAL_RADIUS=.004625;
// Shared display radius: the real ~0.53-degree diameter multiplied by UI scale.
float celestialRadius(){return CELESTIAL_RADIUS*celestialScale;}
// Eclipse centres share the solar projection. Progress runs first to last contact.
float eclipseSeparation(){return abs(eclipseProgress-.5)*4.4;}
float eclipseMoonRadius(){return eclipse<1.5?1.06:.92;}
// Analytic two-circle overlap; returns fraction of the solar photosphere obscured.
float eclipseCoverage(){
 if(eclipse<.5)return 0.;float r=eclipseMoonRadius();float d=eclipseSeparation();
 if(d>=1.+r)return 0.;if(d<=abs(1.-r))return min(1.,r*r);
 float a=acos(clamp((d*d+1.-r*r)/(2.*d),-1.,1.));float b=acos(clamp((d*d+r*r-1.)/(2.*d*r),-1.,1.));
 float area=a+r*r*b-.5*sqrt(max(0.,(-d+1.+r)*(d+1.-r)*(d-1.+r)*(d+1.+r)));
 return area/3.14159265;
}
float eclipseDaylight(){if(hour<=6.||hour>=18.)return 1.;return mix(1.,max(.025,pow(1.-eclipseCoverage(),.65)),step(.5,eclipse));}
// Totality progressively lowers the effective sky brightness for stellar visibility.
// Keep actual solar elevation for sky/cloud lighting; annular eclipses do not reveal
// the night star field. Zero obscuration restores the ordinary twilight behaviour.
float stellarSkyElevation(float solarElevation){
 if(eclipse<.5||eclipse>1.5||solarElevation<=0.)return solarElevation;
 float darkness=smoothstep(.90,1.,eclipseCoverage());
 return mix(solarElevation,-.40,darkness);
}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
// Explicit floor subtraction preserves the interpolation endpoint for tiny negative
// coordinates. GPU fract() can wrap a rounded 1 back to 0, causing a seam on axis.
float noise(vec2 p){vec2 i=floor(p),f=p-i;f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .55*noise(p)+.27*noise(p*2.03)+.13*noise(p*4.07)+.05*noise(p*8.1);}
float volumeNoise(vec3 p){float z=floor(p.y);return mix(noise(p.xz+z*vec2(37,17)),noise(p.xz+(z+1.)*vec2(37,17)),smoothstep(0.,1.,p.y-z));}
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
// Tall convective volumes with a common low base, rising lobes, and a wind-spread
// anvil. Returns a conservative metre-distance bound for adaptive traversal.
// Coverage changes storm occupancy and spread; shape remains world anchored.
float stormField(vec3 p){
 if(cover<.001)return 10000.;vec2 tile=floor(p.xz/9500.);float field=20000.;
 for(int x=-1;x<=1;x++)for(int z=-1;z<=1;z++){
 vec2 id=tile+vec2(float(x),float(z));float seed=hash(id+61.);
 float growth=smoothstep(seed*.7,seed*.7+.3,cover);if(growth<.001)continue;
 vec2 center=(id+.5)*9500.+(vec2(hash(id+13.),hash(id+29.))-.5)*2600.;
 float scale=(.8+hash(id+23.)*.35)*pow(growth,.3);
 vec3 q=(p-vec3(center.x,1500.,center.y))/scale;
 float turn=seed*6.28318;q.xz=mat2(cos(turn),-sin(turn),sin(turn),cos(turn))*q.xz;
 q.xz/=mix(.75,1.45,cover);
 q.x+=sin(q.y*.00045+seed*4.)*240.;q.z+=sin(q.y*.00035+seed*7.)*180.;
 float height=6000.+hash(id+19.)*2500.;
 float body=ellipsoid(q-vec3(0,650,0),vec3(2300,1000,1850));
 body=mergeCloud(body,ellipsoid(q-vec3(-250,height*.38,50),vec3(1600,height*.39,1450)),400.);
 body=mergeCloud(body,ellipsoid(q-vec3(200,height*.67,-100),vec3(1350,height*.31,1250)),320.);
 body=mergeCloud(body,ellipsoid(q-vec3(-650,height*.84,120),vec3(1050,1400,1000)),220.);
 body=mergeCloud(body,ellipsoid(q-vec3(500,height*.92,80),vec3(1250,1100,1150)),260.);
 // Upper flow stretches the summit sideways into the distinctive anvil shelf.
 body=mergeCloud(body,ellipsoid(q-vec3(1450,height*.97,100),vec3(3650,550,2350)),250.);
 body=mergeCloud(body,ellipsoid(q-vec3(3450,height*.99,100),vec3(1700,330,1850)),180.);
 field=mergeCloud(field,max(body*scale*.6,1400.-p.y),260.);
 }
 if(cover>.65){float regional=fbm(p.xz*.00017+37.);float holes=(regional-mix(.15,1.1,smoothstep(.65,1.,cover)))*4500.;field=mergeCloud(field,max(max(1400.-p.y,p.y-2450.),holes),200.);}
 if(field<400.)field+=(volumeNoise(p*.0025)-.5)*210.+(volumeNoise(p*.007)-.5)*75.+(volumeNoise(p*.018)-.5)*25.;
 return field;
}
// Common field dispatch keeps traversal, density, and light sampling consistent.
float cloudField(vec3 p){return cloudType>2.5?stormField(p):cumulusField(p);}
float density(vec3 p){
 if(cloudType<.5||cloudType>2.5)return (1.-smoothstep(-45.,18.,cloudField(p)));
 vec2 q=p.xz*.0007;float base=fbm(q*.43);float shape=volumeNoise(p*.0012)*.7+volumeNoise(p*.003)*.2+volumeNoise(p*.008)*.1;
 float bottom=1400.+base*350.;float height=cloudType<.5?850.:cloudType<1.5?250.:380.;
 if(cloudType>.5&&cloudType<1.5){bottom=3300.;shape=fbm(vec2(q.x*.45+q.y*2.,q.y*7.));}
 float vertical=smoothstep(bottom,bottom+150.,p.y)*(1.-smoothstep(bottom+height*.35,bottom+height,p.y));
 float threshold=mix(.85,.26,cover);return smoothstep(threshold,threshold+.16,shape)*vertical;
}
// Shared spectral approximation: long low-angle paths favour amber then red.
// elevation is sine of local sun elevation, including horizon dip at cloud height.
vec3 sunlight(float elevation){
 vec3 low=mix(vec3(1.25,.16,.065),vec3(1.35,.58,.20),smoothstep(-.06,.10,elevation));
 return mix(low,vec3(1.08,1.04,.94),smoothstep(.08,.48,elevation));
}
// Layered sunset colours depend on elevation and bearing, rather than a global tint.
// Broad sky bands leave the separate solar disc crisp and free of a bloom halo.
vec3 sky(vec3 rd,vec3 sun,float day,float warm){
 float h=max(rd.y,0.);float sunset=exp(-pow((sun.y-.015)/.24,2.));
 vec2 bearing=normalize(sun.xz);float facing=dot(normalize(rd.xz+vec2(.00001)),bearing)*.5+.5;
 vec3 clear=mix(vec3(.59,.73,.86),vec3(.12,.32,.58),pow(h,.48));
 vec3 horizon=mix(vec3(.72,.32,.37),vec3(1.32,.45,.12),pow(facing,1.6));
 vec3 peach=mix(vec3(.52,.32,.57),vec3(1.06,.48,.36),facing);
 vec3 dusk=mix(horizon,peach,smoothstep(0.,.18,h));
 dusk=mix(dusk,vec3(.34,.25,.53),smoothstep(.12,.42,h));
 dusk=mix(dusk,vec3(.075,.15,.34),smoothstep(.35,.9,h));
 vec3 daylight=mix(clear,dusk,sunset);
 vec3 night=mix(vec3(.025,.028,.075),vec3(.006,.012,.035),pow(h,.5));
 return mix(night,daylight,smoothstep(-.20,.025,sun.y));
}
// Project a celestial direction into the camera plane; Z marks front/behind.
vec3 celestialProjection(vec3 sun){
 float yaw=-look.x;sun.xz=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw))*sun.xz;
 float pitch=-look.y;sun.yz=mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch))*sun.yz;
 return sun;
}
// Crisp discs with geometric lunar occultation. Corona is visible only in totality.
// RGB is premultiplied emission, alpha masks the background behind either disc.
vec4 solarBody(vec2 screen,vec3 sun){
 vec3 projected=celestialProjection(sun);float radius=celestialRadius();
 vec2 q=(screen*.68-projected.xy/max(projected.z,.001))/radius;float aa=.68/resolution.y/radius;
 float r=length(q);float solar=1.-smoothstep(1.-aa,1.+aa,r);
 float lunar=0.;if(eclipse>.5)lunar=1.-smoothstep(eclipseMoonRadius()-aa,eclipseMoonRadius()+aa,length(q-vec2((eclipseProgress-.5)*4.4,0)));
 float totality=eclipse<1.5?smoothstep(.995,1.,eclipseCoverage())*step(.5,eclipse):0.;
 float angle=atan(q.y,q.x);float streamers=.75+.16*cos(angle*3.)+.09*cos(angle*7.);
 float corona=exp(-max(r-1.,0.)*2.1)*streamers*totality*(1.-solar)*(1.-lunar);
 vec3 colour=sunlight(sun.y)*3.8*solar*(1.-lunar)+vec3(.21,.24,.30)*corona+vec3(.0006)*lunar*totality;
 // In partial phases the unlit Moon outside the photosphere blends into the
 // daylight sky; it must not appear as a floating black ball beside the Sun.
 return vec4(colour,max(solar*(1.-lunar),lunar*totality))*step(.001,projected.z);
}
// Fictional celestial orientation: fixed with respect to the sky, never the camera.
// Time rotates the stars slowly; forward travel does not translate celestial objects.
vec3 lunarDirection(){return normalize(vec3(-.30,sin((hour-18.)/12.*3.14159265)*.32,.9));}
float lunarStrength(){return moon<.5||eclipse>.5?0.:moon<1.5?.12:moon<2.5?.45:1.;}
// One independently seeded population. Occupancy and brightness vary with galactic
// structure; multiple populations remove the impression of one evenly spaced grid.
// Returns filtered radiance; inputs are a unit sky direction and population settings.
vec3 starPopulation(vec3 direction,float frequency,float salt,float probability,float strength,float solarElevation){
 vec3 a=abs(direction);vec2 plane;float face;
 if(a.x>a.y&&a.x>a.z){plane=direction.yz/a.x;face=direction.x>0.?1.:2.;}
 else if(a.y>a.z){plane=direction.xz/a.y;face=direction.y>0.?3.:4.;}
 else{plane=direction.xy/a.z;face=direction.z>0.?5.:6.;}
 vec2 grid=plane*frequency+vec2(salt,salt*.37);vec2 id=floor(grid);float seed=hash(id+face*137.+salt);
 vec2 center=.05+.90*vec2(hash(id+face*31.+salt),hash(id+face*57.+salt));
 float distanceToStar=length(fract(grid)-center);float magnitude=pow(hash(id+face*97.+salt),3.);
 float radius=mix(.065,.19,magnitude);float aa=max(length(fwidth(grid))*.5,.008);
 float point=(1.-smoothstep(max(0.,radius-aa),radius+aa,distanceToStar))*min(1.,radius*radius/(aa*aa));
 float emergence=1.-smoothstep(-.26+ magnitude*.13,-.09+magnitude*.07,solarElevation);
 vec3 colour=mix(vec3(.66,.79,1.),vec3(1.,.81,.56),hash(id+face*41.+salt));
 return colour*point*(.10+magnitude*1.8)*step(1.-probability,seed)*emergence*strength;
}
// Procedural Milky Way: a great-circle band, brighter central bulge, unresolved
// star light, and absorbing dust lanes. All structure is continuous on the sphere.
// This is an illustrative galaxy, not a real-location astronomical sky catalogue.
vec3 stars(vec3 direction,float solarElevation){
 if(solarElevation>-.02)return vec3(0);
 float turn=hour*.261799388;direction.xz=mat2(cos(turn),-sin(turn),sin(turn),cos(turn))*direction.xz;
 float latitude=dot(direction,normalize(vec3(.58,.72,-.24)));
 float band=exp(-pow(latitude/.145,2.));
 float filaments=volumeNoise(direction*32.)*.55+volumeNoise(direction*83.)*.30+volumeNoise(direction*193.)*.15;
 float broad=volumeNoise(direction*8.+vec3(17,11,41));
 float core=pow(max(dot(direction,normalize(vec3(-.5,.65,.75))),0.),20.);
 float lane=latitude+(volumeNoise(direction*16.)-.5)*.075;
 float dust=exp(-pow(lane/(.016+.026*broad),2.))*(.60+.34*filaments);
 float clouds=band*(.30+.90*filaments)*(.45+.75*broad);
 float extinction=smoothstep(.005,.22,direction.y);
 float dark=1.-smoothstep(-.32,-.08,solarElevation);
 vec3 glow=mix(vec3(.65,.72,.91),vec3(1.,.83,.61),core)*clouds*(.055+core*.095)*(1.-dust*.94);
 glow+=vec3(.72,.75,.85)*core*.022*exp(-pow(latitude/.25,2.));
 float clustering=.45+.85*volumeNoise(direction*45.);
 vec3 points=starPopulation(direction,85.,7.,.045,1.7,solarElevation);
 points+=starPopulation(direction,210.,39.,(.025+band*.18)*clustering,.85,solarElevation);
 points+=starPopulation(direction,470.,117.,(.018+band*.27)*clustering,.65,solarElevation);
 points*=1.-dust*band*.78;
 return (points+glow*dark)*extinction*(1.-lunarStrength()*.48);
}
// Render a small textured lunar sphere with a geometric phase terminator.
// Returns RGB and coverage; the entire disc masks background stars, including its dark side.
vec4 lunarDisc(vec2 screen,vec3 rd,float solarElevation){
 if(moon<.5||solarElevation>.035||eclipse>.5)return vec4(0);
 vec3 projected=celestialProjection(lunarDirection());float facing=projected.z;
 vec2 q=(screen*.68-projected.xy/max(facing,.001))/celestialRadius();
 float radius=length(q);float aa=max(length(fwidth(q))*.5,.01);float mask=1.-smoothstep(1.-aa,1.+aa,radius);
 vec3 normal=vec3(q,sqrt(max(0.,1.-dot(q,q))));
 vec3 light=moon<1.5?normalize(vec3(.9,.08,-.55)):moon<2.5?vec3(1,0,0):vec3(0,0,1);
 float lit=smoothstep(-.025,.045,dot(normal,light));
 float maria=.56+.44*fbm(q*3.1+vec2(81,27));
 vec3 colour=vec3(.72,.76,.82)*maria*(.025+lit*.95);
 mask*=step(.001,facing)*step(.5,moon)*(1.-smoothstep(-.16,.035,solarElevation));
 return vec4(colour,mask);
}
// Analytic ray/sphere intersection in the camera's local tangent frame.
// Returns nearest ground distance in metres, or -1 for sky. Rationalized root
// avoids subtracting two Earth-sized numbers near the ground. Constant GPU cost.
float groundDistance(vec3 rd,float height){
 float b=(EARTH_RADIUS+height)*rd.y;float c=height*(2.*EARTH_RADIUS+height);
 float discriminant=b*b-c;if(b>=0.||discriminant<0.)return -1.;
 return c/(-b+sqrt(discriminant));
}
vec3 land(vec3 p,vec3 rd,vec3 sun,float day,float warm){
 vec2 w=p.xz;float footprint=length(fwidth(w));vec2 cell=floor(w/680.);vec2 f=fract(w/680.);float seed=hash(cell);float product=hash(cell+45.);
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
 // Average subpixel fields into their material colour, rather than fading to fog.
 // This suppresses far-horizon shimmer while keeping terrain distinct from sky.
 c=mix(c,mix(vec3(.32,.33,.14),vec3(.17,.28,.29),water),smoothstep(60.,650.,footprint));
 c*=vec3(.045,.065,.12)+sunlight(sun.y)*smoothstep(-.035,.16,sun.y)*.85;
 float moonlight=lunarStrength()*(1.-smoothstep(-.18,-.02,sun.y))*max(lunarDirection().y,0.);
 c+=vec3(.014,.020,.033)*moonlight;
 c+=water*pow(max(dot(reflect(rd,vec3(0,1,0)),lunarDirection()),0.),110.)*vec3(.20,.25,.34)*moonlight;
 float shadow=density(vec3(w.x+1100.,1700.,w.y+600.));c*=1.-shadow*.32;
 return c*eclipseDaylight();
}
void main(){
 vec2 screen=uv;screen.x*=resolution.x/resolution.y;vec3 rd=normalize(vec3(screen*.68,1.));
 float pitch=look.y;rd.yz=mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch))*rd.yz;
 float yaw=look.x;rd.xz=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw))*rd.xz;
 float angle=(hour-6.)/12.*3.14159265;vec3 sun=normalize(vec3(-.65,sin(angle),-cos(angle)*.8));float day=smoothstep(-.18,.12,sun.y);float warm=1.-smoothstep(.12,.65,sun.y);
 vec3 ro=vec3(0,altitude,travel);vec3 col=sky(rd,sun,day,warm);
 col=mix(vec3(.006,.012,.024),col,pow(eclipseDaylight(),.7));
 col+=stars(rd,stellarSkyElevation(sun.y));vec4 lunar=lunarDisc(screen,rd,sun.y);col=mix(col,lunar.rgb,lunar.a);
 vec4 solar=solarBody(screen,sun);col=col*(1.-solar.a)+solar.rgb;
 float hit=groundDistance(rd,altitude);float ground=hit<0.?1.e8:hit;
 if(hit>=0.){vec3 p=ro+rd*ground;col=land(p,rd,sun,day,warm);}
 bool storm=cloudType>2.5;bool shaped=cloudType<.5||storm;
 float entry=(1250.-ro.y)/rd.y,exit=((storm?12500.:4100.)-ro.y)/rd.y;
 float t=max(0.,min(entry,exit));float end=min(min(ground,28000.),max(entry,exit));float stride=max(1.,(end-t)/72.);
 float trans=1.;vec3 fog=vec3(0);float d=t;
 for(int i=0;i<128;i++){
 if(d>end||trans<.012)break;vec3 p=ro+rd*d;
 float distanceToCloud=shaped?cloudField(p):0.;
 if(shaped&&distanceToCloud>35.){d+=clamp(distanceToCloud*.55,35.,storm?1100.:700.);continue;}
 float stepLength=shaped?(storm?60.:32.):stride;
 float den=shaped?(1.-smoothstep(-45.,18.,distanceToCloud)):density(p);
 if(den>.001){
 float lightScale=storm?2.5:1.;
 float optical=density(p+sun*90.*lightScale)*.65+density(p+sun*220.*lightScale)*.9+density(p+sun*460.*lightScale)*.65;
 float surfaceLight=shaped?clamp((cloudField(p+sun*80.*lightScale)-distanceToCloud)/(80.*lightScale),0.,1.):.5;
 float lighting=exp(-optical*.8)*.55+surfaceLight*.45;
 float alpha=1.-exp(-den*stepLength*.012);
 // Elevated clouds retain direct light after the ground has entered twilight.
 float localSun=sun.y+sqrt(2.*max(p.y,0.)/EARTH_RADIUS);
 float lit=smoothstep(-.025,.045,localSun);
 float sunset=exp(-pow(sun.y/.24,2.));
 vec3 ambient=mix(vec3(.27,.36,.49),vec3(.22,.15,.35),sunset);
 ambient*=mix(.6,1.,smoothstep(1550.,2600.,p.y))*(.10+.9*day);
 if(storm)ambient*=mix(.32,1.05,smoothstep(1400.,8500.,p.y));
 vec3 direct=sunlight(localSun);
 float silver=pow(max(dot(rd,sun),0.),10.)*exp(-optical*1.2)*.22;
 vec3 shade=ambient*sqrt(eclipseDaylight())+direct*(lighting*.95+silver)*lit*eclipseDaylight();
 float moonlight=lunarStrength()*(1.-smoothstep(-.18,-.02,sun.y))*max(lunarDirection().y,0.);
 if(moonlight>.001){float moonFacing=shaped?clamp((cloudField(p+lunarDirection()*100.)-distanceToCloud)/100.,0.,1.):.4;shade+=vec3(.07,.09,.14)*moonlight*(.25+.75*moonFacing);}
 fog+=trans*alpha*shade;trans*=1.-alpha;}
 d+=stepLength;}
 col=col*trans+fog;
 // The suspension lines remain outside the forward hemisphere.
 float side=abs(look.x);if(side>1.52){float cable=abs(uv.x-(sign(look.x)*.74+uv.y*.12));float line=1.-smoothstep(.001,.004,cable);col=mix(col,vec3(.07,.08,.075),line*smoothstep(1.52,1.9,side));}
 col=col/(col+vec3(.38))*1.16;col=pow(max(col,0.),vec3(.94));float vignette=1.-.1*dot(uv,uv);frag=vec4(col*vignette,1.);
}`;
