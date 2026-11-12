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
    const glazing=[];
    function skin(n){
      const group=layer(),facade=layer(group),body=layer(group),lid=layer(group),mesh=surfaces(facade),block=surfaces(body),ceiling=surfaces(lid),baseY=n?floorY(n):0;
      Object.assign(group.userData,{facade,body,lid});
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
      block.quad(brick,[[half,height,front],[half,height,rear],[half,0,rear],[half,0,front]]);
      block.quad(brick,[[-half,height,rear],[-half,height,front],[-half,0,front],[-half,0,rear]]);
      ceiling.quad(stone,[[-half,height,rear],[half,height,rear],[half,height,front],[-half,height,front]]);
      ceiling.quad(edge,[[-half,0,rear],[half,0,rear],[half,0,front],[-half,0,front]]);
      mesh.finish();block.finish();ceiling.finish();return group;
    }
    const shells=[0,1,2,3,4].map(skin);
    const roof=layer(),cap=surfaces(roof),metal=standard(0x8e8d80),flashing=standard(0x514f48,{metalness:.35});
    roof.position.y=floorY(5);
    const roofPrint=print('roof');roofPrint.bumpMap=texture('roof');roofPrint.bumpScale=.032;roofPrint.roughness=.70;
    cap.quad(roofPrint,[[-half,2.47,-.86],[half,2.47,-.86],[half,0,front],[-half,0,front]]);
    cap.quad(metal,[[-half,2.47,rear],[half,2.47,rear],[half,2.47,-.86],[-half,2.47,-.86]]);
    for(const side of [-half,half])cap.quad(metal,[[side,2.47,rear],[side,2.47,-.86],[side,0,front],[side,0,rear]]);
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
    for(const [x,z] of [[-5.65,-4.7],[5.3,-3.8]]){
      solid(roof,metal,x,2.86,z,.62,.78,.83);solid(roof,flashing,x,3.27,z,.74,.1,.96);
    }
    shells.push(roof);
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
    walk.finish();
    solid(street,standard(0x715b41,{metalness:.24}),0,baseY-.07,(near+far)/2,hi-lo+.1,.14,near-far+.1);
    solid(street,standard(0xbaa075,{metalness:.30}),0,baseY-.19,(near+far)/2,hi-lo-.25,.11,near-far-.25);
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
      context.quad(side,[[l,hi,-4],[r,hi,-4],[r,hi,z],[l,hi,z]]);
    }
    context.finish();
    const shadowMat=new T.ShadowMaterial({opacity:.20}),ground=new T.Mesh(new T.PlaneGeometry(160,160),shadowMat);
    ground.rotation.x=-Math.PI/2;ground.position.y=-1.52;ground.receiveShadow=true;scene.add(ground);
    const trim=standard(0xb58448,{metalness:.30,roughness:.38}),focus=layer();
    solid(focus,trim,0,0,front+.06,14.28,.10,.16);
    solid(focus,trim,half+.02,0,(front+rear)/2,.09,.085,front-rear);
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
        units.push({id:part.k.replace('-horni','').replace('-','.'),unit,paper,envelope,interior:furnishings(unit,part)});
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
        layers.set(group,{materials:[...mats].map(m=>[m,m.transparent]),casters});
      }
      const {materials,casters}=layers.get(group);
      for(const obj of casters)obj.castShadow=amount>.52;
      for(const [m,inherent] of materials){
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
        fill.color.setRGB(.98-.23*dusk,.97-.18*dusk,1-.05*dusk);
        fill.intensity=1.42-.31*dusk;sun.color.setRGB(1,.94-.44*dusk,.82-.50*dusk);
        sun.intensity=1.72+.45*dusk;sun.position.set(-18-12*dusk,32-17*dusk,24);
        bounce.intensity=.54+.23*dusk;
        for(const pane of glazing)pane.emissive.setRGB(.43*dusk,.245*dusk,.08*dusk);
        previousLight=dusk;
      }
      alpha(street,1-s.cut);alpha(neighbors,(1-s.cut)*Math.max(0,1-s.spread*.85));
      ground.visible=s.cut<.96;shadowMat.opacity=.125*(1-s.cut);
      const peel=Math.min(1,s.spread*.62+s.cut*1.4);
      const separation=Math.min(1,Math.max(0,(s.spread-.10)/1.2));
      if(cutLevel && (s.cut>.001||s.spread>.01))buildPlan(cutLevel);
      if(cutLevel && separation>.02 && s.cut<.72){
        // Populate neighbouring cutaways over successive frames. Their real plans
        // replace the opaque block tops as daylight enters the split model.
        const next=[1,2,3,4].find(n=>!floors.has(n));
        if(next){buildPlan(next);repaint();}
      }
      for(let n=0;n<shells.length;n++){
        const shell=shells[n],selected=n===cutLevel&&cutLevel>0;
        shell.position.y=(n?floorY(n):0)+(n?s.spread*(n-cutLevel)*.95:0);
        shell.position.z=selected?1.85*s.spread/2.5:(n>cutLevel?-s.spread*.38:0);
        if(shell.userData.facade){
          const {facade,body,lid}=shell.userData;
          // Separate the photographed face from its floor plate like a removable
          // model panel. The adjacent floors keep their own facades as references.
          facade.position.set(selected?-1.55*peel:0,selected?-.34*peel:0,selected?2.60*peel:0);
          facade.rotation.y=selected?-.105*peel:0;
          alpha(facade,selected?(1-s.cut)*(1-.89*peel):Math.pow(1-s.cut,n>cutLevel?1.65:1.15));
          const remain=Math.pow(1-s.cut,n>cutLevel?1.65:1.15);
          const secondary=n>0&&floors.has(n)?separation:0;
          alpha(body,selected?(1-s.cut)*Math.pow(1-peel,2):remain*(1-.69*secondary));
          alpha(lid,selected?(1-s.cut)*Math.pow(1-peel,2):remain*(1-secondary));
        }else{
          if(selected){shell.position.y+=2.5*peel;shell.position.z-=1.7*peel;}
          alpha(shell,Math.pow(1-s.cut,selected?3:n>cutLevel?1.65:1.15));
        }
      }
      const lit=hoverFloor||cutLevel;focus.visible=!!lit&&s.cut<.88;
      if(focus.visible){focus.position.set(0,floorY(lit)+s.spread*(lit-cutLevel)*.95+.04,lit===cutLevel?1.85*s.spread/2.5:0);alpha(focus,1-s.cut);}
      for(const [n,{group,units}] of floors){
        const selected=n===cutLevel;
        const reveal=selected?Math.min(1,s.spread*.70+s.cut*5):n===5?0:separation*Math.pow(1-s.cut,1.7);
        group.visible=!!cutLevel&&reveal>.012;if(!group.visible)continue;
        group.position.z=selected?1.85*s.spread/2.5:n>cutLevel?-s.spread*.38:0;
        group.position.y=floorY(n)+s.spread*(n-cutLevel)*.95;
        // Near the vertical view the model joins the architect's flat drawing.
        // Tilting back reveals furniture at the locations printed on that drawing.
        const inclination=Math.max(0,Math.min(1,(Math.PI/2-s.tilt)/.28));
        for(const {id,unit,paper,envelope,interior} of units){
          unit.visible=!(selected&&visibleApartment&&id!==visibleApartment&&n===2);
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
