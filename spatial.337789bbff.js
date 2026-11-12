'use strict';

// Textured architectural maquette. The same camera drives the drawing fallback,
// floor buttons and projected hotspots, including during an interrupted journey.
window.NSBuildingScene = (() => {
  const base=new URL('assets/model/',document.baseURI);
  let library;
  function script(name){
    return new Promise((resolve,reject)=>{
      const node=document.createElement('script');node.src=new URL(name,base);
      node.onload=resolve;node.onerror=reject;document.head.append(node);
    });
  }
  function load(){
    if(!library){
      const required=[script('three-160.min.js')];
      if(location.protocol==='file:')required.push(script('offline-images.js'));
      library=Promise.all(required).then(()=>window.NS3Graphics);
    }
    return library;
  }
  async function mount(host,geometry,partsFor,floorY,repaint){
    const T=await load(),canvas=document.createElement('canvas');
    canvas.className='spatial-canvas';canvas.hidden=true;canvas.setAttribute('aria-hidden','true');
    let renderer;
    try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});}
    catch{return null;}
    const scene=new T.Scene(),camera=new T.PerspectiveCamera();
    const fill=new T.HemisphereLight(0xfff4e3,0xae9e91,1.75);
    const sun=new T.DirectionalLight(0xffe5c8,2.05);
    sun.position.set(-16,31,23);sun.castShadow=true;
    Object.assign(sun.shadow.camera,{left:-27,right:27,top:27,bottom:-27,near:1,far:90});
    sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.045;sun.shadow.bias=-.0003;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0,0);
    scene.add(fill,sun);
    const textures=new Map(),loading=new T.TextureLoader();
    function texture(key,relief=false){
      if(textures.has(key))return textures.get(key);
      const url=window.NSModelImages?.[key]||new URL(key+'.webp',base).href;
      const map=loading.load(url,repaint,undefined,()=>{});
      if(!relief)map.colorSpace=T.SRGBColorSpace;
      map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      textures.set(key,map);return map;
    }
    const front=7.6,rear=-7.45,half=7.1;
    const standard=(color,options={})=>new T.MeshStandardMaterial({color,roughness:.9,side:T.DoubleSide,...options});
    const print=(key,color=0xffffff)=>standard(color,{map:texture(key)});
    function layer(parent=scene){const group=new T.Group();parent.add(group);return group;}
    function solid(group,material,x,y,z,width,height,depth){
      const mesh=new T.Mesh(new T.BoxGeometry(width,height,depth),material);
      mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
    }
    // Batch coplanar and recessed surfaces per material, avoiding a draw call for each window.
    function surfaces(group){
      const batches=new Map();
      function points(mat,vertices,uv){
        if(!batches.has(mat))batches.set(mat,{positions:[],coords:[],indices:[]});
        const data=batches.get(mat),start=data.positions.length/3;
        vertices.forEach((v,i)=>{data.positions.push(...v);data.coords.push(...uv[i]);});
        data.indices.push(start,start+2,start+1,start,start+3,start+2);
      }
      const quad=(mat,vertices,uv=[[0,1],[1,1],[1,0],[0,0]])=>points(mat,vertices,uv);
      function finish(){
        for(const [mat,data] of batches){
          const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));
          g.setAttribute('uv',new T.Float32BufferAttribute(data.coords,2));g.setIndex(data.indices);g.computeVertexNormals();
          const m=new T.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;group.add(m);
        }
      }
      return {quad,finish};
    }
    const bands=[[795,960],[602,795],[405,602],[208,405],[0,208]];
    const ranges=[[30,86],[113,135],[163,218],[246,268],[295,349]];
    function skin(n){
      const group=layer(),mesh=surfaces(group),baseY=n?floorY(n):0;
      group.position.y=baseY;
      const masonry=print('front'),pane=print('front',0xf4f8fc),stone=standard(0xab987a),edge=standard(0x584f43);
      const brick=standard(0xc9b69a,{map:texture('brick'),bumpMap:texture('cihla-relief',true),bumpScale:.045});
      const [first,last]=bands[n],height=n?2.92:2.4;
      const x=p=>p/960*(2*half)-half,y=p=>(last-p)/(last-first)*height;
      function rect(mat,l,r,a,b,depth=0){
        const z=front-depth;
        mesh.quad(mat,[[x(l),y(a),z],[x(r),y(a),z],[x(r),y(b),z],[x(l),y(b),z]],
          [[l/960,1-a/960],[r/960,1-a/960],[r/960,1-b/960],[l/960,1-b/960]]);
      }
      const rowPixels=[[0,0],[247,302],[170,224],[92,146],[17,68]];
      const windows=(n===0?[[8,87,316,371],[330,374,315,331]]:
        ranges.map(([l,r],i)=>[l,n===1&&i===3?289:r,...rowPixels[n]]).filter((_,i)=>n!==1||i!==4));
      if(n===1)windows.push([330,374,245,317]);
      const openings=windows.map(v=>v.map(p=>Math.round(p*960/380)))
        .map(([l,r,a,b])=>({l,r,a:Math.max(first,a),b:Math.min(last,b)})).filter(q=>q.a<q.b);
      let left=0;
      for(const {l,r,a,b} of openings){
        const depth=n===0||l>800&&n===1?.46:.32;
        if(left<l)rect(masonry,left,l,first,last);
        if(first<a)rect(masonry,l,r,first,a);
        if(last>b)rect(masonry,l,r,b,last);
        rect(pane,l,r,a,b,depth);
        const x0=x(l),x1=x(r),hi=y(a),lo=y(b),back=front-depth;
        mesh.quad(stone,[[x0,hi,front],[x0,hi,back],[x0,lo,back],[x0,lo,front]]);
        mesh.quad(stone,[[x1,hi,back],[x1,hi,front],[x1,lo,front],[x1,lo,back]]);
        mesh.quad(edge,[[x0,hi,front],[x1,hi,front],[x1,hi,back],[x0,hi,back]]);
        mesh.quad(stone,[[x0,lo,back],[x1,lo,back],[x1,lo,front+.055],[x0,lo,front+.055]]);
        left=r;
      }
      if(left<960)rect(masonry,left,960,first,last);
      mesh.quad(brick,[[half,height,front],[half,height,rear],[half,0,rear],[half,0,front]]);
      mesh.quad(brick,[[-half,height,rear],[-half,height,front],[-half,0,front],[-half,0,rear]]);
      mesh.quad(stone,[[-half,height,rear],[half,height,rear],[half,height,front],[-half,height,front]]);
      mesh.quad(edge,[[-half,0,rear],[half,0,rear],[half,0,front],[-half,0,front]]);
      mesh.finish();return group;
    }
    const shells=[0,1,2,3,4].map(skin);
    const roof=layer(),cap=surfaces(roof),metal=standard(0x8e8d80),flashing=standard(0x514f48,{metalness:.35});
    roof.position.y=floorY(5);
    cap.quad(print('roof'),[[-half,2.47,-.86],[half,2.47,-.86],[half,0,front],[-half,0,front]]);
    cap.quad(metal,[[-half,2.47,rear],[half,2.47,rear],[half,2.47,-.86],[-half,2.47,-.86]]);
    for(const side of [-half,half])cap.quad(metal,[[side,2.47,rear],[side,2.47,-.86],[side,0,front],[side,0,rear]]);
    // Raised curbs and glazing sit on the sloping plane at the photographed roof windows.
    for(const outline of [[[128,78],[177,78],[212,141],[165,141]],[[365,75],[414,74],[424,139],[379,139]]]){
      const u=outline.reduce((sum,p)=>sum+p[0],0)/(4*512),v=outline.reduce((sum,p)=>sum+p[1],0)/(4*256);
      const panel=(pad,raise)=>{
        const coords=outline.map(([px,py])=>[u+(px/512-u)*(1+pad*12),v+(py/256-v)*(1+pad*12)]);
        return {xyz:coords.map(([xx,yy])=>[-half+2*half*xx,2.47*(1-yy)+raise,-.86+(front+.86)*yy]),uv:coords.map(([xx,yy])=>[xx,1-yy])};
      };
      const foot=panel(.009,.013),frame=panel(.009,.102),glass=panel(0,.113);
      for(let i=0;i<4;i++){const j=(i+1)%4;cap.quad(flashing,[foot.xyz[i],foot.xyz[j],frame.xyz[j],frame.xyz[i]]);}
      cap.quad(flashing,frame.xyz);cap.quad(print('roof'),glass.xyz,glass.uv);
    }
    cap.finish();solid(roof,flashing,0,.025,front,14.5,.12,.24);
    for(const [x,z] of [[-5.65,-4.7],[5.3,-3.8]]){
      solid(roof,metal,x,2.86,z,.62,.78,.83);solid(roof,flashing,x,3.27,z,.74,.1,.96);
    }
    shells.push(roof);
    const street=layer(),plinth=standard(0xbba78b),walk=surfaces(street);
    const streetHeight=x=>.05+(x+half)/(2*half)*1.87;
    const limits=[-14.5,14.5],far=rear-.7,near=front+2.6,curb=front+1.15;
    const [lo,hi]=limits;
    function strip(back,edge){return [[lo,streetHeight(lo),back],[hi,streetHeight(hi),back],[hi,streetHeight(hi),edge],[lo,streetHeight(lo),edge]];}
    walk.quad(standard(0xb6a691),strip(far,front));
    walk.quad(standard(0xaa9f91),strip(front,curb));
    const cobbles=texture('dlazba');cobbles.wrapS=T.RepeatWrapping;cobbles.wrapT=T.RepeatWrapping;
    walk.quad(standard(0xe1d5c1,{map:cobbles}),strip(curb,near),[[0,1.6],[7,1.6],[7,0],[0,0]]);
    const deck=strip(far,near),baseY=-1.25;
    walk.quad(plinth,[deck[3],deck[2],[hi,baseY,near],[lo,baseY,near]]);
    walk.quad(plinth,[deck[2],deck[1],[hi,baseY,far],[hi,baseY,near]]);
    walk.finish();
    solid(street,standard(0x857357,{metalness:.32}),0,baseY-.055,(near+far)/2,hi-lo+.1,.11,near-far+.1);
    // Adjacent facades are photographic context from the same street photograph.
    const neighbors=layer(),context=surfaces(neighbors);
    for(const [l,r,hi,key] of [[-13.0,-half,10.5,'soused-vlevo'],[half,13.0,14.22,'soused-vpravo']]){
      const mat=print(key,0xeee1d1),z=front-.30;
      context.quad(mat,[[l,hi,z],[r,hi,z],[r,streetHeight(r),z],[l,streetHeight(l),z]]);
      const side=standard(0xc2b7a4),outer=l<0?l:r;
      context.quad(side,[[outer,hi,z],[outer,hi,-4],[outer,streetHeight(outer),-4],[outer,streetHeight(outer),z]]);
      context.quad(side,[[l,hi,-4],[r,hi,-4],[r,hi,z],[l,hi,z]]);
    }
    context.finish();
    const shadowMat=new T.ShadowMaterial({opacity:.20}),ground=new T.Mesh(new T.PlaneGeometry(160,160),shadowMat);
    ground.rotation.x=-Math.PI/2;ground.position.y=-1.40;ground.receiveShadow=true;scene.add(ground);
    const trim=standard(0xb58448,{metalness:.30,roughness:.38}),focus=layer();
    solid(focus,trim,0,0,front+.06,14.28,.10,.16);
    solid(focus,trim,half+.02,0,(front+rear)/2,.09,.085,front-rear);
    const floors=new Map();
    function buildPlan(n){
      if(floors.has(n))return floors.get(n);
      const group=layer();group.position.y=floorY(n);const units=[];
      for(const part of partsFor(n)){
        const unit=layer(group),d=part.depth,z0=front-d,x0=part.left,x1=x0+part.width;
        const horizontal=surfaces(unit),ink=new T.MeshBasicMaterial({map:texture('cut-'+part.k),transparent:true,alphaTest:.16,side:T.DoubleSide});
        horizontal.quad(ink,[[x0,.015,z0],[x1,.015,z0],[x1,.015,front],[x0,.015,front]]);horizontal.finish();
        const walls=surfaces(unit),wall=standard(0xe3cfaf),coping=standard(0x635546);
        const loops=geometry[part.k].walls.map(loop=>loop.map(([u,v])=>[x0+u*part.width,z0+v*d]));
        // Match the holes in the wall drawing before triangulating horizontal caps.
        const rings=loops.map(points=>points.map(([x,z])=>new T.Vector2(x,z)));
        const area=ring=>Math.abs(T.ShapeUtils.area(ring));
        function contains(ring,p){
          let inside=false;
          for(let i=0,j=ring.length-1;i<ring.length;j=i++){
            const a=ring[i],b=ring[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
          }return inside;
        }
        const parent=rings.map((ring,i)=>rings.reduce((best,outer,j)=>j!==i&&area(outer)>area(ring)&&contains(outer,ring[0])&&(best<0||area(outer)<area(rings[best]))?j:best,-1));
        const capPositions=[];
        loops.forEach((loop,i)=>{
          for(let j=0;j<loop.length;j++){
            const [ax,az]=loop[j],[bx,bz]=loop[(j+1)%loop.length];
            walls.quad(wall,[[ax,.91,az],[bx,.91,bz],[bx,.02,bz],[ax,.02,az]]);
          }
          if(parent[i]!==-1)return;
          const holes=rings.filter((r,j)=>parent[j]===i);
          const tris=T.ShapeUtils.triangulateShape(rings[i],holes),all=[...rings[i],...holes.flat()];
          for(const tri of tris)for(const idx of tri)capPositions.push(all[idx].x,.91,all[idx].y);
        });
        walls.finish();
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(capPositions,3));g.computeVertexNormals();
        const mesh=new T.Mesh(g,coping);mesh.receiveShadow=true;unit.add(mesh);units.push([part.k.replace('-horni','').replace('-','.'),unit]);
      }
      floors.set(n,{group,units});return floors.get(n);
    }
    // Change opacity once per material, avoiding traversal and transparency re-compiles each frame.
    const layers=new WeakMap();
    function alpha(group,value){
      const amount=Math.max(0,Math.min(1,value));group.visible=amount>.012;
      if(!group.visible)return;
      if(!layers.has(group)){
        const mats=new Set();group.traverse(obj=>{if(obj.material)mats.add(obj.material);});
        layers.set(group,[...mats].map(m=>[m,m.transparent]));
      }
      for(const [m,inherent] of layers.get(group)){
        const transparent=inherent||amount<.995;
        if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}
        m.opacity=amount;m.depthWrite=amount>.69;
      }
    }
    let lost=false,dusk=0,previousSize='',previousLight=-1,ready=false;
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.hidden=true;repaint();});
    host.prepend(canvas);
    function render(s,{w,h,dpr,cutLevel,level,visibleApartment,hoverFloor,light,quiet}){
      if(lost)return false;
      if(!ready){
        ready=['front','roof','brick','cihla-relief','dlazba','soused-vlevo','soused-vpravo'].every(key=>textures.get(key)?.image?.naturalWidth);
        if(!ready)return false;
        canvas.hidden=false;
      }
      const size=w+'x'+h+'@'+dpr;if(size!==previousSize){renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);previousSize=size;}
      const ca=Math.cos(s.az),sa=Math.sin(s.az),ct=Math.cos(s.tilt),st=Math.sin(s.tilt);
      const distance=Math.max(27,1/(.015*s.coverage)),scale=Math.min(w,h)*.045*s.coverage;
      camera.aspect=w/h;camera.fov=2*Math.atan(h/(2*scale*distance))*180/Math.PI;
      camera.near=.35;camera.far=270;camera.updateProjectionMatrix();camera.projectionMatrix.elements[9]=.03;
      camera.position.set(s.tx-sa*ct*distance,s.ty+st*distance,s.tz+ca*ct*distance);
      camera.up.set(sa*st,ct,-ca*st);camera.lookAt(s.tx,s.ty,s.tz);
      const target=light?1:0;dusk=quiet?target:dusk+(target-dusk)*.14;
      if(Math.abs(dusk-target)<.006)dusk=target;else repaint();
      if(dusk!==previousLight){
        fill.color.setRGB(1-.12*dusk,.94-.16*dusk,.88-.13*dusk);
        fill.intensity=1.6-.20*dusk;sun.color.setRGB(1,.90-.42*dusk,.74-.43*dusk);
        sun.intensity=1.65+.75*dusk;sun.position.set(-18-12*dusk,32-21*dusk,24);previousLight=dusk;
      }
      alpha(street,1-s.cut);alpha(neighbors,(1-s.cut)*Math.max(0,1-s.spread*.85));
      ground.visible=s.cut<.96;shadowMat.opacity=.125*(1-s.cut);
      for(let n=0;n<shells.length;n++){
        const shell=shells[n],selected=n===cutLevel&&cutLevel>0;
        shell.position.y=(n?floorY(n):0)+(n?s.spread*(n-cutLevel)*.95:0);
        shell.position.z=selected?1.85*s.spread/2.5:(n>cutLevel?-s.spread*.38:0);
        alpha(shell,Math.pow(1-s.cut,selected?2.8:n>cutLevel?1.65:1.15));
      }
      const lit=hoverFloor||cutLevel;focus.visible=!!lit&&s.cut<.88;
      if(focus.visible){focus.position.set(0,floorY(lit)+s.spread*(lit-cutLevel)*.95+.04,lit===cutLevel?1.85*s.spread/2.5:0);alpha(focus,1-s.cut);}
      if(cutLevel && (s.cut>.001||s.spread>.01))buildPlan(cutLevel);
      for(const [n,{group,units}] of floors){
        group.visible=n===cutLevel&&(s.cut>.001||s.spread>.01);if(!group.visible)continue;
        group.position.z=1.85*s.spread/2.5;
        const reveal=Math.min(1,s.spread*.37+s.cut*4),height=.16+.84*Math.min(1,s.cut*1.7+s.spread*.30);
        for(const [id,unit] of units){
          unit.scale.y=height;
          alpha(unit,visibleApartment&&id!==visibleApartment&&n===2?0:reveal);
        }
      }
      renderer.render(scene,camera);return true;
    }
    return {render};
  }
  return {mount};
})();
