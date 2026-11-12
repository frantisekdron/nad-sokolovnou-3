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
    const bounce=new T.DirectionalLight(0xdde8ef,.54);
    bounce.position.set(15,10,-14);
    scene.add(fill,sun,bounce);
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
      function box(mat,x0,x1,y0,y1,z0,z1){
        quad(mat,[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]]);
        quad(mat,[[x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0]]);
        quad(mat,[[x1,y1,z0],[x0,y1,z0],[x0,y0,z0],[x1,y0,z0]]);
        quad(mat,[[x0,y1,z1],[x1,y1,z1],[x1,y0,z1],[x0,y0,z1]]);
        quad(mat,[[x0,y1,z0],[x0,y1,z1],[x0,y0,z1],[x0,y0,z0]]);
        quad(mat,[[x1,y1,z1],[x1,y1,z0],[x1,y0,z0],[x1,y0,z1]]);
      }
      function finish(){
        for(const [mat,data] of batches){
          const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));
          g.setAttribute('uv',new T.Float32BufferAttribute(data.coords,2));g.setIndex(data.indices);g.computeVertexNormals();
          const m=new T.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;group.add(m);
        }
      }
      return {quad,box,finish};
    }
    const bands=[[795,960],[602,795],[405,602],[208,405],[0,208]];
    const ranges=[[30,86],[113,135],[163,218],[246,268],[295,349]];
    const glazing=[];
    const grain=texture('omitka-dvur'),gravel=texture('strk-strecha');
    for(const map of [grain,gravel]){map.wrapS=T.RepeatWrapping;map.wrapT=T.RepeatWrapping;}
    const courtGlass=[];
    // At the party-wall angle section the interior and the roof in the same
    // world-space plane. A uniform moves it without rebuilding floor geometry.
    const surveyPlane={value:new T.Vector2(1,100)};
    function surveySection(group){
      const materials=new Set();
      group.traverse(node=>{if(node.material)materials.add(node.material);});
      for(const mat of materials){
        mat.onBeforeCompile=shader=>{
          shader.uniforms.nsSurvey=surveyPlane;
          shader.vertexShader='varying float nsAcross;\n'+shader.vertexShader.replace('#include <project_vertex>',
            '#include <project_vertex>\nnsAcross=(modelMatrix*vec4(transformed,1.0)).x;');
          shader.fragmentShader='uniform vec2 nsSurvey; varying float nsAcross;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',
            '#include <clipping_planes_fragment>\nif(nsSurvey.x*nsAcross>nsSurvey.y)discard;');
        };
      }
    }
    function courtyardMaterials(){
      const pane=print('odraz-dvur',0xd6e0e3);
      pane.roughness=.25;pane.metalness=.13;
      pane.emissiveMap=texture('odraz-dvur');courtGlass.push(pane);
      return {
        render:standard(0xffffff,{map:grain,bumpMap:grain,bumpScale:.014}),
        sill:standard(0xcbc6b7),tile:standard(0xdfd9cb),joint:standard(0xb2aa9d),
        steel:standard(0xa4acaa,{roughness:.40,metalness:.28}),
        shadow:standard(0x555952,{roughness:.52}),frame:standard(0xcbcec5,{roughness:.48}),
        pane,soffit:standard(0xd7d6ca),base:standard(0xbcbcb0)
      };
    }
    function elevation(batch,mat,l,r,y0,y1,z){
      if(r-l<.001||y1-y0<.001)return;
      batch.quad(mat,[[r,y1,z],[l,y1,z],[l,y0,z],[r,y0,z]],
        [[(r-l)/1.9,(y1-y0)/1.9],[0,(y1-y0)/1.9],[0,0],[(r-l)/1.9,0]]);
    }
    // The loggia tiles and balcony rails sit on the outline of the original
    // apartment plan. One bay meets the plot obliquely; the opposite bay is square.
    function rail(batch,m,x0,z0,x1,z1,y,glass=false){
      const dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
      function bar(material,y0,y1,halfWidth){
        const sx=-uz*halfWidth,sz=ux*halfWidth,a=[x0+sx,z0+sz],b=[x1+sx,z1+sz],c=[x1-sx,z1-sz],d=[x0-sx,z0-sz];
        const v=(p,h)=>[p[0],h,p[1]];
        batch.quad(material,[v(a,y1),v(b,y1),v(c,y1),v(d,y1)]);
        batch.quad(material,[v(a,y1),v(b,y1),v(b,y0),v(a,y0)]);
        batch.quad(material,[v(c,y1),v(d,y1),v(d,y0),v(c,y0)]);
      }
      const high=y+1.02;
      bar(m.steel,high-.043,high,.028);
      if(glass){
        const count=Math.max(1,Math.round(len/1.22));
        for(let i=0;i<count;i++){
          const a=i*len/count+.013,b=(i+1)*len/count-.013;
          batch.quad(m.balustrade,[[x0+ux*b,high-.045,z0+uz*b],[x0+ux*a,high-.045,z0+uz*a],
            [x0+ux*a,y+.07,z0+uz*a],[x0+ux*b,y+.07,z0+uz*b]]);
        }
        bar(m.steel,y+.04,y+.105,.041);
        return;
      }
      bar(m.steel,y+.10,y+.133,.025);
      const count=Math.ceil(len/.155);
      for(let i=0;i<=count;i++){
        const r=i/count,x=x0+dx*r,z=z0+dz*r,radius=i===0||i===count?.029:.014;
        batch.box(m.steel,x-radius,x+radius,y+.09,high-.035,z-radius,z+radius);
      }
    }
    function terraceTile(batch,m,x0,x1,minimum,maximum,y=0){
      const z0=typeof minimum==='number'?()=>minimum:minimum;
      const rear0=z0(x0),rear1=z0(x1);
      batch.quad(m.tile,[[x0,y,rear0],[x1,y,rear1],[x1,y,maximum],[x0,y,maximum]]);
      batch.quad(m.base,[[x1,y+.015,rear1],[x0,y+.015,rear0],[x0,y-.14,rear0],[x1,y-.14,rear1]]);
      for(let x=x0+.56;x<x1;x+=.56){
        batch.quad(m.joint,[[x-.006,y+.006,z0(x)],[x+.006,y+.006,z0(x)],[x+.006,y+.006,maximum],[x-.006,y+.006,maximum]]);
      }
      for(let z=maximum-.56;z>Math.min(rear0,rear1);z-=.56){
        let l=x0,r=x1;
        if(rear0!==rear1){
          const cross=x0+(z-rear0)*(x1-x0)/(rear1-rear0);
          if(z<rear1)r=Math.min(x1,cross);
          if(z<rear0)l=Math.max(x0,cross);
        }
        if(r>l)batch.quad(m.joint,[[l,y+.009,z-.006],[r,y+.009,z-.006],[r,y+.009,z+.006],[l,y+.009,z+.006]]);
      }
    }
    function courtWindow(batch,m,l,r,z,y0,y1,narrow=false){
      // The glass is inset behind a lined reveal, and reflects a muted crop of
      // the real courtyard canopy. Frames retain their thickness at oblique angles.
      const depth=.19,face=z+depth,frame=.062;
      batch.quad(m.soffit,[[l,y1,z],[l,y1,face],[l,y0,face],[l,y0,z]]);
      batch.quad(m.soffit,[[r,y1,face],[r,y1,z],[r,y0,z],[r,y0,face]]);
      batch.quad(m.shadow,[[r,y1,z],[l,y1,z],[l,y1,face],[r,y1,face]]);
      batch.box(m.sill,l-.045,r+.045,y0-.04,y0+.012,z-.095,face);
      batch.quad(m.pane,[[r,y1,face],[l,y1,face],[l,y0,face],[r,y0,face]]);
      batch.box(m.frame,l,l+frame,y0,y1,face-.060,face+.02);
      batch.box(m.frame,r-frame,r,y0,y1,face-.060,face+.02);
      batch.box(m.frame,l,r,y1-frame,y1,face-.060,face+.02);
      batch.box(m.frame,l,r,y0,y0+frame,face-.060,face+.02);
      if(!narrow){
        const x=l+(r-l)*.54;
        batch.box(m.frame,x-.035,x+.035,y0,y1,face-.073,face+.012);
        batch.box(m.shadow,x+.07,x+.085,y0+.88,y0+1.05,face-.10,face-.06);
      }
    }
    function paneWall(batch,m,l,r,z,height,openings){
      let at=l;
      for(const [x0,x1,y0,y1] of openings){
        elevation(batch,m.render,at,x0,0,height,z);
        elevation(batch,m.render,x0,x1,0,y0,z);elevation(batch,m.render,x0,x1,y1,height,z);
        courtWindow(batch,m,x0,x1,z,y0,y1,x1-x0<1.1);at=x1;
      }
      elevation(batch,m.render,at,r,0,height,z);
    }
    const leftReturn=-3.56,rightReturn=4.02,leftCorner=-4.22,leftInner=-3.23,rightOuter=-6.87;
    function rearFace(batch,m,n,height){
      if(!n){
        elevation(batch,m.base,-half,half,0,height,rear);
        batch.box(m.sill,-half,half,height-.18,height,rear-.035,rear+.04);
        return;
      }
      const low=.035,head=2.30,leftDoor=-2.24,rightDoor=-5.54;
      const diagonal=x=>leftCorner+(x+half)*(leftInner-leftCorner)/(leftReturn+half);
      terraceTile(batch,m,-half,leftReturn,diagonal,leftDoor);
      rail(batch,m,-half+.04,diagonal(-half+.04),leftReturn-.04,diagonal(leftReturn-.04),low);
      rail(batch,m,-half+.04,leftCorner+.03,-half+.04,leftDoor,low);
      paneWall(batch,m,-half,leftReturn,leftDoor,height,[[-6.80,-5.43,.065,head]]);
      batch.quad(m.render,[[leftReturn,height,rear],[leftReturn,height,leftDoor],[leftReturn,0,leftDoor],[leftReturn,0,rear]]);
      paneWall(batch,m,leftReturn,rightReturn,rear,height,[[.52,1.57,.08,2.22]]);
      const back=n===1?rear+.16:rightDoor;
      batch.quad(m.render,[[rightReturn,height,back],[rightReturn,height,rear],[rightReturn,0,rear],[rightReturn,0,back]]);
      if(n>1){
        terraceTile(batch,m,rightReturn,half,rightOuter,rightDoor);
        rail(batch,m,rightReturn+.035,rightOuter,half-.035,rightOuter,low);
        rail(batch,m,half-.035,rightOuter,half-.035,rightDoor,low);
        paneWall(batch,m,rightReturn,half,rightDoor,height,[[4.26,6.74,.055,head]]);
      }else{
        elevation(batch,m.render,rightReturn,half,0,height,back);
      }
      // A vertical seam on the core follows the grey downpipe visible beside the
      // upper terrace. Its clips and the thin drip edge define the plaster relief.
      batch.box(m.steel,3.75,3.83,0,height,rear-.135,rear-.053);
      for(const h of [.54,2.36])batch.box(m.shadow,3.736,3.844,h,h+.033,rear-.141,rear-.012);
    }
    function skin(n){
      const group=layer(),facade=layer(group),back=layer(group),body=layer(group),lid=layer(group);
      const mesh=surfaces(facade),court=surfaces(back),block=surfaces(body),ceiling=surfaces(lid),baseY=n?floorY(n):0;
      Object.assign(group.userData,{facade,back,body,lid});
      group.position.y=baseY;
      const masonry=print('front'),pane=print('front',0xf6fbff),stone=standard(0xd5c5af),edge=standard(0x504c45);
      const joinery=standard(0x817e70,{roughness:.44,metalness:.36});
      if(n){pane.emissiveMap=texture('front');glazing.push(pane);}
      const profile=(mat,x0,x1,lo,hi,z)=>mesh.quad(mat,[[x0,hi,z],[x1,hi,z],[x1,lo,z],[x0,lo,z]]);
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
        mesh.quad(stone,[[x0,lo,back],[x1,lo,back],[x1,lo,front+.08],[x0,lo,front+.08]]);
        profile(edge,x0-.025,x1+.025,lo-.042,lo,front+.08);
        if(n&&r-l>100&&!(n===1&&l>800)){
          // The large photographed windows have a central upright and one transom.
          // Shallow physical frames retain the photographic glass and street reflection.
          const centre=(x0+x1)/2;
          profile(joinery,centre-.027,centre+.027,lo,hi,back+.045);
          profile(joinery,x0,x1,lo+(hi-lo)*.52-.016,lo+(hi-lo)*.52+.016,back+.048);
        }
        if(n===1&&l>800){
          const lip=front+.38;
          mesh.quad(joinery,[[x0-.075,hi+.06,back],[x1+.075,hi+.06,back],[x1+.075,hi-.005,lip],[x0-.075,hi-.005,lip]]);
          profile(edge,x0-.075,x1+.075,hi-.07,hi-.005,lip);
        }
        left=r;
      }
      if(left<960)rect(masonry,left,960,first,last);
      const ml=courtyardMaterials();
      rearFace(court,ml,n,height);
      const leftZ=n?-2.24:rear,rightZ=n>1?-5.54:n?rear+.16:rear;
      block.quad(brick,[[half,height,front],[half,height,rightZ],[half,0,rightZ],[half,0,front]],[[0,1],[2.5,1],[2.5,0],[0,0]]);
      block.quad(brick,[[-half,height,leftZ],[-half,height,front],[-half,0,front],[-half,0,leftZ]],[[0,1],[2.2,1],[2.2,0],[0,0]]);
      const boards=n?[
        [-half,leftReturn,leftCorner,leftInner],
        [leftReturn,rightReturn,rear,rear],
        [rightReturn,half,n>1?rightOuter:rightZ,n>1?rightOuter:rightZ]
      ]:[[-half,half,rear,rear]];
      const slab=standard(0xd1c7b5),underside=standard(0xe3ddcf);
      for(const [l,r,zl,zr] of boards){
        ceiling.quad(slab,[[l,height-.018,zl],[r,height-.018,zr],[r,height-.018,front],[l,height-.018,front]]);
        ceiling.quad(underside,[[l,0,front],[r,0,front],[r,0,zr],[l,0,zl]]);
      }
      mesh.finish();court.finish();block.finish();ceiling.finish();
      surveySection(facade);surveySection(back);return group;
    }
    const shells=[0,1,2,3,4].map(skin);
    const roof=layer(),cap=surfaces(roof),metal=standard(0x8e8d80),flashing=standard(0x514f48,{metalness:.35});
    roof.position.y=floorY(5);
    const roofPrint=print('roof');roofPrint.bumpMap=texture('roof');roofPrint.bumpScale=.032;roofPrint.roughness=.70;
    cap.quad(roofPrint,[[-half,2.47,-.86],[half,2.47,-.86],[half,0,front],[-half,0,front]]);
    // The upper plan steps back twice from the courtyard. Preserve the traced
    // street roof while opening its rear half into the two outdoor strips.
    const attic=courtyardMaterials(),atticRear=-3.29,atticLeft=-4.75,offset=-1.76;
    const overhang=.11,roofY=2.47;
    const gravelCap=standard(0xe8e3da,{map:gravel,bumpMap:gravel,bumpScale:.035});
    function roofSheet(l,r,z0,z1,h,mat){
      cap.quad(mat,[[l,h,z0],[r,h,z0],[r,h,z1],[l,h,z1]],[[0,(z1-z0)/1.25],[(r-l)/1.25,(z1-z0)/1.25],[(r-l)/1.25,0],[0,0]]);
    }
    roofSheet(-2.81,half,atticRear-overhang,-.86,roofY,metal);
    roofSheet(atticLeft,-2.81,offset-overhang,-.86,roofY,metal);
    // The folded roof narrows on its left flank, as on the upper plan.
    cap.quad(metal,[[-half,0,-.86],[atticLeft,roofY,-.86],[atticLeft,roofY,offset],[-half,0,offset]]);
    cap.quad(metal,[[-half,0,front],[atticLeft,roofY,-.86],[-half,0,-.86],[-half,0,front]]);
    cap.quad(metal,[[-half,roofY,-.86],[atticLeft,roofY,-.86],[-half,0,-.86],[-half,roofY,-.86]]);
    cap.quad(metal,[[half,roofY,atticRear],[half,roofY,-.86],[half,0,front],[half,0,atticRear]]);
    paneWall(cap,attic,-2.81,half,atticRear,roofY,[[-1.04,.35,.075,2.08],[1.6,3.04,.075,2.08]]);
    paneWall(cap,attic,atticLeft,-2.81,offset,roofY,[]);
    cap.quad(attic.render,[[atticLeft,roofY,offset],[atticLeft,roofY,-.86],[atticLeft,0,-.86],[atticLeft,0,offset]]);
    cap.quad(attic.render,[[-2.81,roofY,atticRear],[-2.81,roofY,offset],[-2.81,0,offset],[-2.81,0,atticRear]]);
    cap.box(flashing,-2.81,half,roofY-.065,roofY+.018,atticRear-overhang,atticRear+.04);
    cap.box(flashing,atticLeft,-2.81,roofY-.065,roofY+.018,offset-overhang,offset+.03);
    cap.box(flashing,half-.085,half+.025,roofY-.08,roofY+.018,atticRear-overhang,-.86);

    // Separate tile, edge and gravel surfaces are visible in the terrace photographs.
    const courtDeck=-5.20,leftDeck=-5.79;
    attic.balustrade=standard(0x91b6b0,{transparent:true,opacity:.28,depthWrite:false,metalness:.15,roughness:.23});
    roofSheet(-half,half,courtDeck,front,-.10,gravelCap);
    roofSheet(leftReturn,rightReturn,rear,courtDeck,-.10,gravelCap);
    roofSheet(rightReturn,half,rightOuter,courtDeck,-.10,gravelCap);
    cap.box(attic.sill,leftReturn,rightReturn,-.15,-.07,rear-.03,rear+.09);
    terraceTile(cap,attic,leftDeck,4.06,courtDeck,atticRear,.01);
    terraceTile(cap,attic,leftDeck,atticLeft,atticRear,2.63,.01);
    terraceTile(cap,attic,atticLeft,-2.81,atticRear,offset,.01);
    rail(cap,attic,leftDeck,courtDeck,4.06,courtDeck,.025,true);
    rail(cap,attic,leftDeck,courtDeck,leftDeck,2.63,.025,true);
    rail(cap,attic,4.06,courtDeck,4.06,atticRear,.025,true);
    rail(cap,attic,leftDeck,2.63,atticLeft,2.63,.025,true);
    // Low skylight on the gravel alongside the terrace, visible in the end-on view.
    cap.box(flashing,1.12,2.44,-.092,.035,rear+.15,rear+1.17);
    cap.box(attic.frame,1.19,2.37,.035,.085,rear+.21,rear+1.1);
    cap.box(attic.pane,1.25,2.31,.085,.10,rear+.27,rear+1.04);
    const seam=standard(0x8c8c81);
    for(let x=-half+.38;x<half-.1;x+=.59){
      const across=(a,b,l,r)=>{
        const za=-.86+(front+.86)*a,zb=-.86+(front+.86)*b,ya=roofY*(1-a)+.022,yb=roofY*(1-b)+.022;
        cap.quad(seam,[[l,ya,za],[r,ya,za],[r,yb,zb],[l,yb,zb]]);
      };
      // Avoid writing a metal seam across either photographed rooflight.
      const u=(x+half)/(2*half);
      if((u>.24&&u<.42)||(u>.70&&u<.84)){across(0,.285,x-.009,x+.009);across(.57,1,x-.009,x+.009);}
      else across(0,1,x-.009,x+.009);
    }
    // Folded metal side edges and six small projections are visible in the
    // aerial roof photograph. Keep their coordinates in the original roof crop.
    for(const x of [-half+.045,half-.045]){
      cap.quad(flashing,[[x-.045,2.51,-.86],[x+.045,2.51,-.86],[x+.045,.045,front],[x-.045,.045,front]]);
    }
    for(const u of [78,158,236,315,397,478]){
      const x=-half+2*half*u/512,z=-.86+(front+.86)*.162,y=2.47*(1-.162);
      cap.quad(metal,[[x-.10,y+.12,z-.06],[x+.10,y+.12,z-.06],[x+.10,y-.036,z+.14],[x-.10,y-.036,z+.14]]);
    }
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
    for(const [x,z] of [[-3.81,-1.30],[5.30,-2.67]]){
      solid(roof,metal,x,2.86,z,.62,.78,.83);solid(roof,flashing,x,3.27,z,.74,.1,.96);
    }
    surveySection(roof);shells.push(roof);
    const street=layer(),plinth=standard(0xc2ac89),walk=surfaces(street);
    const streetHeight=x=>.05+(x+half)/(2*half)*1.87;
    const limits=[-14.5,14.5],far=rear-.7,near=front+2.6,curb=front+1.15;
    const [lo,hi]=limits;
    function strip(back,edge){return [[lo,streetHeight(lo),back],[hi,streetHeight(hi),back],[hi,streetHeight(hi),edge],[lo,streetHeight(lo),edge]];}
    walk.quad(standard(0xb6a691),strip(far,front));
    walk.quad(standard(0xaa9f91),strip(front,curb));
    const kerb=standard(0xc9beb0),joint=standard(0x8c8379);
    for(let x=lo;x<hi;x+=1.6){
      const end=Math.min(hi,x+1.6),z=curb+.015;
      walk.quad(kerb,[[x,streetHeight(x)+.04,z],[end-.014,streetHeight(end)+.04,z],
        [end-.014,streetHeight(end)+.04,z+.14],[x,streetHeight(x)+.04,z+.14]]);
      walk.quad(joint,[[x,streetHeight(x)+.04,z+.14],[end-.014,streetHeight(end)+.04,z+.14],
        [end-.014,streetHeight(end),z+.14],[x,streetHeight(x),z+.14]]);
    }
    const cobbles=texture('dlazba');cobbles.wrapS=T.RepeatWrapping;cobbles.wrapT=T.RepeatWrapping;
    walk.quad(standard(0xe1d5c1,{map:cobbles}),strip(curb,near),[[0,1.6],[7,1.6],[7,0],[0,0]]);
    const deck=strip(far,near),baseY=-1.25;
    walk.quad(plinth,[deck[3],deck[2],[hi,baseY,near],[lo,baseY,near]]);
    walk.quad(plinth,[deck[2],deck[1],[hi,baseY,far],[hi,baseY,near]]);
    walk.quad(plinth,[deck[1],deck[0],[lo,baseY,far],[hi,baseY,far]]);
    walk.quad(plinth,[deck[0],deck[3],[lo,baseY,near],[lo,baseY,far]]);
    walk.finish();
    solid(street,standard(0x715b41,{metalness:.24}),0,baseY-.07,(near+far)/2,hi-lo+.1,.14,near-far+.1);
    solid(street,standard(0xbaa075,{metalness:.30}),0,baseY-.19,(near+far)/2,hi-lo-.25,.11,near-far-.25);
    // Fold the two display wings back to the house footprint as the neighbours
    // leave the view. The centre pavement and the documented slope stay fixed.
    const wings=[];
    street.traverse(node=>{
      if(!node.geometry)return;
      const g=node.geometry,points=g.getAttribute('position'),folded=points.clone();
      for(let i=0;i<points.count;i++){
        const x=points.getX(i),y=points.getY(i),inside=Math.max(-8.12,Math.min(8.12,x));
        folded.setX(i,inside);
        // Pavement, kerb and the plinth's top edge are attached to street level.
        if(Math.abs(y+node.position.y-streetHeight(x))<.30)folded.setY(i,y+(inside-x)*(1.87/(2*half)));
      }
      g.morphAttributes.position=[folded];node.updateMorphTargets();wings.push(node);
    });
    // Adjacent facades are photographic context from the same street photograph.
    const neighbors=layer(),context=surfaces(neighbors);
    for(const [l,r,hi,key] of [[-13.0,-half,10.5,'soused-vlevo'],[half,13.0,14.22,'soused-vpravo']]){
      const mat=print(key,0xf6eee0),z=front-.30;
      const position=(u,v,relief=0)=>{const x=l+(r-l)*u;return [x,hi+(streetHeight(x)-hi)*v,z+relief];};
      function tile(u0,v0,u1,v1,relief=0){
        context.quad(mat,[position(u0,v0,relief),position(u1,v0,relief),position(u1,v1,relief),position(u0,v1,relief)],
          [[u0,1-v0],[u1,1-v0],[u1,1-v1],[u0,1-v1]]);
      }
      tile(0,0,1,1);
      const fascia=standard(0xb6a791),edge=standard(0x988b78);
      const cornices=l<0?[[0,.048,.24],[.078,.120,.15]]:[[.05,.107,.19],[.549,.573,.14],[.596,.633,.21]];
      for(const [top,bottom,relief] of cornices){
        tile(0,top,1,bottom,relief);
        context.quad(fascia,[position(0,top),position(1,top),position(1,top,relief),position(0,top,relief)]);
        context.quad(edge,[position(0,bottom,relief),position(1,bottom,relief),position(1,bottom),position(0,bottom)]);
      }
      // Sills and lintels follow the recorded bays of each adjoining facade.
      const bays=l<0?[[0,.172],[.528,.725]]:[[.125,.33],[.615,.817],[.973,1]];
      const sills=l<0?[.336,.628,.908]:[.274,.554,.832];
      for(const [a,b] of bays)for(const y of sills){
        tile(a,y-.005,b,y+.009,.105);
        context.quad(fascia,[position(a,y-.005),position(b,y-.005),position(b,y-.005,.105),position(a,y-.005,.105)]);
      }
      const side=standard(0xc2b7a4),outer=l<0?l:r;
      context.quad(side,[[outer,hi,z],[outer,hi,-4],[outer,streetHeight(outer),-4],[outer,streetHeight(outer),z]]);
      context.quad(side,[[r,hi,-4],[l,hi,-4],[l,streetHeight(l),-4],[r,streetHeight(r),-4]]);
      const roofMat=standard(l<0?0x8e7a6d:0xa27b6a),peak=l<0?hi+1.50:hi+1.12,ridgeZ=z-3.4;
      context.quad(roofMat,[[l,peak,ridgeZ],[r,peak,ridgeZ],[r,hi,z],[l,hi,z]]);
      context.quad(roofMat,[[l,hi,-4],[r,hi,-4],[r,peak,ridgeZ],[l,peak,ridgeZ]]);
      context.quad(side,[[outer,hi,-4],[outer,peak,ridgeZ],[outer,hi,z],[outer,hi,-4]]);
    }
    context.finish();
    const shadowMat=new T.ShadowMaterial({opacity:.20}),ground=new T.Mesh(new T.PlaneGeometry(160,160),shadowMat);
    ground.rotation.x=-Math.PI/2;ground.position.y=-1.52;ground.receiveShadow=true;scene.add(ground);
    const trim=standard(0xb58448,{metalness:.30,roughness:.38}),focus=layer();
    solid(focus,trim,0,0,front+.06,14.28,.10,.16);
    solid(focus,trim,half+.02,0,(front+rear)/2,.09,.085,front-rear);
    const rearGuide=surfaces(focus);
    rearGuide.box(trim,leftReturn,rightReturn,-.024,.057,rear-.077,rear+.023);
    rearGuide.box(trim,rightReturn,half,-.024,.057,rightOuter-.077,rightOuter+.02);
    rearGuide.quad(trim,[[leftReturn,.057,leftInner-.035],[-half,.057,leftCorner-.035],[-half,-.024,leftCorner-.035],[leftReturn,-.024,leftInner-.035]]);
    rearGuide.finish();
    // Perimeters sampled from the alpha masks of the six architectural sheets
    // on a 120-cell grid. The two maisonette levels have different plate shapes.
    const typical=[[0,25],[0,119],[119,119],[119,4],[95,4],[94,0],[29,0],[27,30]];
    const perimeters={
      '1-1':[[0,25],[0,119],[103,119],[104,111],[115,111],[116,119],[119,119],[119,3],[94,1],[29,1],[27,31]],
      '2-1':[[3,3],[3,10],[0,11],[0,119],[119,119],[119,15],[90,13],[89,0],[46,0],[44,10]],
      '2-2':[[1,1],[1,119],[115,119],[115,17],[119,17],[119,1]],
      '3-1':typical,'4-1':typical,
      '4-1-horni':[[0,27],[0,80],[12,81],[12,111],[6,112],[6,119],[119,119],[119,1],[95,1],[95,18],[30,18],[29,26]]
    };
    // These pieces follow the furniture symbols in the supplied drawings. The
    // first four numbers of each record are its bounds as percentages of the crop.
    const dining=['table',9.2,76.4,15.1,87.9,'long'];
    const kitchen=['island',38.3,60.8,60.4,64.7];
    const arrangements={
      '1-1':[dining,kitchen,['sofa',36.2,81.1,42.3,95,'left'],['chair',44.1,72.3,51.1,78.5],['bed',69.4,78.9,83.7,90.4,'right']],
      '2-1':[['bed',5.2,72.5,28.2,87.4,'left'],['sofa',86,68.5,94.2,85.8,'right'],['table',75,56,84.3,65.6,'long'],['island',62.4,51.4,96.2,55.7],['chair',58.3,69.0,68.1,76.7],['chair',58.3,80.1,68.1,87.6]],
      '2-2':[['bed',54.5,21.5,81.4,33.4,'right'],['sofa',75,75.3,88.9,90,'right'],['island',48.8,67.1,91.1,70.6],['table',6.7,64.8,24.0,69.8,'small']],
      '3-1':[dining,kitchen,['sofa',40.1,71.5,56.5,77.3,'back'],['chair',36.4,80.8,42.1,85.6],['bed',82.5,77.7,96.1,90.2,'right']],
      '4-1':[dining,kitchen,['sofa',40.1,71.5,56.5,77.3,'back'],['chair',36.4,80.8,42.1,85.6],['bed',74.1,75.3,87.3,87.5,'back']],
      '4-1-horni':[['sofa',29.9,39.5,46.3,45.4,'back'],['sofa',25.3,50.1,31.5,63.6,'left'],['round',54,63.8,62.7,71.7],['low',36.5,53.1,43.5,59.1]]
    };
    function furnishings(unit,part){
      const group=layer(unit),batch=surfaces(group);
      const linen=standard(0xe4dac9),fabric=standard(0xc9bca4),seam=standard(0x9e8973),
        oak=standard(0xbb976b),worktop=standard(0xe3ddcf),metal=standard(0x8e7960);
      function piece(x,z,w,d,base,top,bevel,mat,round=false){
        const ax=x-w/2,bx=x+w/2,az=z-d/2,bz=z+d/2;
        const rim=round?Array.from({length:24},(_,i)=>{
          const a=2*Math.PI*i/24;return [x+w*.5*Math.cos(a),z+d*.5*Math.sin(a)];
        }):[[ax+bevel,az],[bx-bevel,az],[bx,az+bevel],[bx,bz-bevel],
          [bx-bevel,bz],[ax+bevel,bz],[ax,bz-bevel],[ax,az+bevel]];
        for(let i=0;i<rim.length;i++){
          const [a,b]=rim[i],[c,e]=rim[(i+1)%rim.length];
          batch.quad(mat,[[a,top,b],[c,top,e],[c,base,e],[a,base,b]]);
          batch.quad(mat,[[x,top,z],[a,top,b],[c,top,e],[x,top,z]]);
        }
      }
      const chair=(x,z,w,d)=>{piece(x,z,w*.68,d*.66,.03,.30,.022,seam);piece(x,z,w,d,.30,.41,.065,linen);};
      for(const [kind,left,back,right,forward,orientation] of arrangements[part.k]){
        const w=(right-left)*part.width/100,d=(forward-back)*part.depth/100;
        const x=part.left+(left+right)*part.width/200,z=front-part.depth+(back+forward)*part.depth/200;
        if(kind==='bed'){
          piece(x,z,w,d,.05,.33,.06,seam);piece(x,z,w*.99,d*.99,.33,.45,.095,linen);
          const upper=orientation==='back',dir=orientation==='left'?-1:1;
          for(const side of [-1,1])piece(x+(upper?side*w*.235:dir*w*.32),z+(upper?-d*.31:side*d*.235),
            upper?w*.41:w*.20,upper?d*.20:d*.41,.45,.53,.045,worktop);
        }else if(kind==='sofa'){
          piece(x,z,w,d,.07,.34,.075,seam);
          const longZ=orientation!=='back',dir=orientation==='left'?-1:1;
          for(const i of [-1,0,1])piece(x+(longZ?-dir*w*.075:i*w*.32),z+(longZ?i*d*.32:d*.07),
            w*(longZ?.79:.318),d*(longZ?.318:.78),.33,.48,.057,linen);
          piece(x+(longZ?dir*w*.42:0),z+(longZ?0:-d*.42),w*(longZ?.18:1),d*(longZ?1:.18),.28,.68,.043,fabric);
        }else if(kind==='round'||kind==='table'||kind==='low'){
          const low=kind==='low',circle=kind==='round';
          piece(x,z,w*.35,d*.44,.025,low?.28:.58,.045,metal,circle);
          piece(x,z,w,d,low?.28:.58,low?.35:.66,.048,oak,circle);
          if(circle){for(const a of [.25,.75,1.25,1.75])chair(x+Math.cos(a*Math.PI)*(w/2+.25),z+Math.sin(a*Math.PI)*(d/2+.25),.38,.38);}
          else if(orientation==='long'){for(const side of [-1,1])for(const f of [-.29,0,.29])chair(x+side*(w/2+.20),z+f*d,.34,.33);}
        }else if(kind==='island'){
          piece(x,z,w*.98,d*.95,.04,.70,.018,oak);piece(x,z,w,d,.70,.77,.024,worktop);
        }else chair(x,z,w,d);
      }
      batch.finish();return group;
    }
    const floors=new Map();
    function buildPlan(n){
      if(floors.has(n))return floors.get(n);
      const group=layer();group.position.y=floorY(n);const units=[];
      for(const part of partsFor(n)){
        const unit=layer(group),d=part.depth,z0=front-d,x0=part.left,x1=x0+part.width;
        const paper=layer(unit),horizontal=surfaces(paper),ink=standard(0xffffff,{map:texture('cut-'+part.k),transparent:true,alphaTest:.16,roughness:1});
        horizontal.quad(ink,[[x0,.015,z0],[x1,.015,z0],[x1,.015,front],[x0,.015,front]]);horizontal.finish();
        const envelope=layer(unit),walls=surfaces(envelope);
        const wall=standard(0xece0c9),skirting=standard(0xc5ae8c),coping=standard(0x665541);
        const veneer=standard(0xb79e7f),concrete=standard(0x89725a);
        const outline=perimeters[part.k].map(([u,v])=>new T.Vector2(x0+u/119*part.width,z0+v/119*d));
        for(let i=0;i<outline.length;i++){
          const a=outline[i],b=outline[(i+1)%outline.length];
          walls.quad(veneer,[[a.x,.012,a.y],[b.x,.012,b.y],[b.x,-.08,b.y],[a.x,-.08,a.y]]);
          walls.quad(concrete,[[a.x,-.08,a.y],[b.x,-.08,b.y],[b.x,-.25,b.y],[a.x,-.25,a.y]]);
        }
        const underside=[];
        for(const tri of T.ShapeUtils.triangulateShape(outline,[]))for(const i of tri)underside.push(outline[i].x,-.25,outline[i].y);
        const plate=new T.BufferGeometry();plate.setAttribute('position',new T.Float32BufferAttribute(underside,3));plate.computeVertexNormals();
        const deck=new T.Mesh(plate,concrete);deck.castShadow=true;deck.receiveShadow=true;envelope.add(deck);
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
            walls.quad(wall,[[ax,1.40,az],[bx,1.40,bz],[bx,.115,bz],[ax,.115,az]]);
            walls.quad(skirting,[[ax,.115,az],[bx,.115,bz],[bx,.016,bz],[ax,.016,az]]);
          }
          if(parent[i]!==-1)return;
          const holes=rings.filter((r,j)=>parent[j]===i);
          const tris=T.ShapeUtils.triangulateShape(rings[i],holes),all=[...rings[i],...holes.flat()];
          for(const tri of tris)for(const idx of tri)capPositions.push(all[idx].x,1.40,all[idx].y);
        });
        walls.finish();
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(capPositions,3));g.computeVertexNormals();
        const mesh=new T.Mesh(g,coping);mesh.castShadow=true;mesh.receiveShadow=true;envelope.add(mesh);
        const interior=furnishings(unit,part);
        surveySection(paper);surveySection(envelope);surveySection(interior);
        units.push({id:part.k.replace('-horni','').replace('-','.'),unit,paper,envelope,interior});
      }
      floors.set(n,{group,units});return floors.get(n);
    }
    // Change opacity once per material, avoiding traversal and transparency re-compiles each frame.
    const layers=new WeakMap();
    function alpha(group,value){
      const amount=Math.max(0,Math.min(1,value));group.visible=amount>.012;
      if(!group.visible)return;
      if(!layers.has(group)){
        const mats=new Set(),casters=[];group.traverse(obj=>{if(obj.material)mats.add(obj.material);if(obj.castShadow)casters.push(obj);});
        layers.set(group,{materials:[...mats].map(m=>[m,m.transparent,m.opacity,m.depthWrite]),casters});
      }
      const {materials,casters}=layers.get(group);
      for(const obj of casters)obj.castShadow=amount>.52;
      for(const [m,inherent,opacity,depthWrite] of materials){
        const transparent=inherent||amount<.995;
        if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}
        m.opacity=amount*opacity;m.depthWrite=depthWrite&&amount>.69;
      }
    }
    let keyAngle=null,keyDusk=null;
    let lost=false,dusk=0,previousSize='',previousLight=-1,ready=false,entrySide=1;
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.hidden=true;repaint();});
    host.prepend(canvas);
    function render(s,{w,h,dpr,cutLevel,level,visibleApartment,hoverFloor,light,quiet,transfer}){
      if(lost)return false;
      if(!ready){
        ready=['front','roof','brick','cihla-relief','dlazba','soused-vlevo','soused-vpravo','odraz-dvur','omitka-dvur','strk-strecha'].every(key=>textures.get(key)?.image?.naturalWidth);
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
        fill.color.setRGB(.98-.23*dusk,.97-.18*dusk,1-.05*dusk);
        fill.intensity=1.42-.31*dusk;sun.color.setRGB(1,.94-.44*dusk,.82-.50*dusk);
        sun.intensity=1.72+.45*dusk;
        bounce.intensity=.54+.23*dusk;
        for(const pane of glazing)pane.emissive.setRGB(.43*dusk,.245*dusk,.08*dusk);
        for(const pane of courtGlass)pane.emissive.setRGB(.045+.24*dusk,.044+.15*dusk,.039+.065*dusk);
        previousLight=dusk;
      }
      const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>v*v*(3-2*v);
      if(!s.cut&&s.spread<.015)entrySide=ca<0?-1:1;
      const axis=transfer?transfer.elevation:cutLevel;
      const phase=transfer?clamp(transfer.progress):0;
      function strength(n){
        if(!cutLevel||!n)return 0;
        if(!transfer)return n===cutLevel?1:0;
        return Math.max(n===transfer.from?1-phase:0,n===transfer.to?phase:0,smooth(clamp(1-Math.abs(n-axis))));
      }
      // The adjoining buildings are part of the documented street elevation.
      // As the lens passes their party walls, show the residence in section.
      const streetView=smooth(clamp((ca-.05)/.62));
      const sideCut=!cutLevel?smooth(clamp((.55-Math.abs(ca))/.5)):0;
      const display=1-streetView;
      for(const wing of wings)wing.morphTargetInfluences[0]=display;
      const key=(cutLevel?entrySide:ca),keyPosition=smooth(clamp((key+.68)/1.36));
      if(keyAngle!==keyPosition||keyDusk!==dusk){
        sun.position.set(-17-11*dusk,32-17*dusk,-23+47*keyPosition);
        bounce.position.set(14,13,15-30*keyPosition);keyAngle=keyPosition;keyDusk=dusk;
      }
      surveyPlane.value.set(sa<0?1:-1,7.5-5.15*sideCut);
      alpha(street,1-s.cut);alpha(neighbors,(1-s.cut)*Math.max(0,1-s.spread*.85)*streetView);
      ground.visible=s.cut<.96;shadowMat.opacity=.125*(1-s.cut);
      const peel=Math.min(1,s.spread*.62+s.cut*1.4);
      const separation=Math.min(1,Math.max(0,(s.spread-.10)/1.2));
      if(cutLevel && (s.cut>.001||s.spread>.01))buildPlan(cutLevel);
      if(transfer){buildPlan(transfer.from);buildPlan(transfer.to);}
      if((cutLevel&&separation>.02&&s.cut<.75)||sideCut>.02){
        const next=[1,2,3,4,5].find(n=>!floors.has(n));if(next){buildPlan(next);repaint();}
      }
      const offset=n=>entrySide*s.spread*(.74*strength(n)-.38*clamp(n-axis));
      const lift=n=>(n?floorY(n):0)+(n?s.spread*(n-axis)*.95:0);
      for(let n=0;n<shells.length;n++){
        const shell=shells[n],weight=strength(n),remove=peel*weight;
        shell.position.y=lift(n);shell.position.z=offset(n);
        const remain=Math.pow(1-s.cut,1.15+.50*clamp(n-axis));
        if(shell.userData.facade){
          const {facade,back,body,lid}=shell.userData;
          for(const [panel,side] of [[facade,1],[back,-1]]){
            const shift=entrySide===side?remove:0;
            panel.position.set(-side*1.25*shift,-.26*shift,side*2.4*shift);
            panel.rotation.y=-side*.09*shift;
            const selectedAlpha=(1-s.cut)*(1-(side===entrySide?.89:.54)*peel);
            alpha(panel,remain+(selectedAlpha-remain)*weight);
          }
          const secondary=n>0&&floors.has(n)?separation:0;
          const selectedAlpha=(1-s.cut)*Math.pow(1-peel,2);
          const bodyAlpha=remain*(1-.64*secondary),lidAlpha=remain*(1-secondary);
          alpha(body,(bodyAlpha+(selectedAlpha-bodyAlpha)*weight)*(1-.94*sideCut));
          alpha(lid,(lidAlpha+(selectedAlpha-lidAlpha)*weight)*(1-.75*sideCut));
        }else{
          shell.position.y+=2.5*remove;shell.position.z-=entrySide*1.7*remove;
          alpha(shell,remain+(Math.pow(1-s.cut,3)-remain)*weight);
        }
      }
      const lit=hoverFloor||axis;focus.visible=!!lit&&s.cut<.88;
      if(focus.visible){
        focus.position.set(0,floorY(lit)+s.spread*(lit-axis)*.95+.04,offset(lit));
        alpha(focus,1-s.cut);
      }
      for(const [n,{group,units}] of floors){
        const weight=strength(n),primary=Math.min(1,s.spread*.70+s.cut*5);
        const secondary=sideCut||((n===5?0:separation)*Math.pow(1-s.cut,1.7));
        const reveal=secondary+(primary-secondary)*weight;
        group.visible=reveal>.012;if(!group.visible)continue;
        group.position.z=offset(n);group.position.y=lift(n);
        const inclination=clamp((Math.PI/2-s.tilt)/.28);
        for(const {id,unit,paper,envelope,interior} of units){
          unit.visible=!(!transfer&&weight===1&&visibleApartment&&id!==visibleApartment&&n===2);
          if(!unit.visible)continue;
          unit.scale.y=.12+.88*reveal;
          envelope.scale.y=.26+.74*inclination;
          interior.scale.y=.15+.85*inclination;
          alpha(paper,reveal);alpha(envelope,reveal);
          alpha(interior,reveal*inclination);
        }
      }
      renderer.render(scene,camera);return true;
    }
    return {render};
  }
  return {mount};
})();
