'use strict';

{
  const views=JSON.parse(el('#room-views').textContent);
  const walk=el('#room-walk'),stage=walk.querySelector('.walk-pictures');
  const panel=walk.querySelector('.walk-list'),map=el('[data-walk-map]'),dot=el('.walk-dot');
  const calm=matchMedia('(prefers-reduced-motion: reduce)');
  let unit='',index=0,edition=0,activeImage=null,trigger=null,gesture=null;
  let transitions=[],flight=null,entryGate=Promise.resolve(),travel=0,raf=0,closing=false;
  let paper=null,entryOrigin=null;
  function fly(to,duration){
    cancelAnimationFrame(raf);
    if(!flight?.render||calm.matches){travel=to;return;}
    const start=performance.now(),from=travel;let last=-100;
    function frame(now){
      const t=Math.min(1,(now-start)/duration);
      if(now-last>=32||t===1){travel=from+(to-from)*t;flight.render(travel);last=now;}
      if(t<1)raf=requestAnimationFrame(frame);
    }
    raf=requestAnimationFrame(frame);
  }
  const twoDigits=n=>String(n).padStart(2,'0');

  function stopMovement(){
    transitions.forEach(animation=>animation.cancel());
    transitions=[];
  }
  function bindRooms(){
    panel.replaceChildren();
    views[unit].forEach((view,i)=>{
      const button=document.createElement('button');
      const number=document.createElement('small'),label=document.createElement('span');
      number.textContent=twoDigits(i+1);label.textContent=view.label;
      button.type='button';button.dataset.walkRoom=String(i);button.append(number,label);
      panel.append(button);
    });
  }
  async function showPhoto(i,direction,origin){
    if(closing)return;
    const shots=views[unit];
    index=(i+shots.length)%shots.length;
    const number=index,view=shots[index],ticket=++edition;
    const entrySheet=stage.querySelector('.walk-floor-print');
    const next=new Image();
    next.alt=pictures[view.photo];next.decoding='async';
    setPhoto(next,view.photo,'(max-width: 700px) 100vw, 78vw');
    el('#walk-title').textContent=view.label;
    el('[data-walk-counter]').textContent=twoDigits(number+1)+' / '+twoDigits(shots.length)+' fotografií';
    el('[data-walk-unit]').textContent='Byt '+unit+'  /  '+view.floor+'. NP';
    const cut=unit.replace('.','-')+(view.floor===5?'-horni':'');
    map.src='assets/model/cut-'+cut+'.webp';
    map.alt='Půdorys bytu '+unit+', '+view.floor+'. NP';
    const mapBox=map.parentElement;
    const focusedPin=mapBox.contains(document.activeElement)?document.activeElement.dataset.walkMini:null;
    mapBox.querySelectorAll('button.walk-map-pin').forEach(b=>b.remove());
    shots.forEach((room,j)=>{
      if(room.floor!==view.floor||!room.point)return;
      const b=document.createElement('button');b.type='button';b.className='walk-map-pin';b.dataset.walkMini=String(j);
      b.setAttribute('aria-label','Zobrazit místnost – '+room.label);b.setAttribute('aria-pressed',String(j===number));
      b.style.left=room.point[0]*100+'%';b.style.top=room.point[1]*100+'%';
      b.onclick=()=>{if(j!==index&&!closing)showPhoto(j,j>index?1:-1);};mapBox.append(b);
    });
    if(focusedPin!=null)mapBox.querySelector('[data-walk-mini="'+focusedPin+'"]')?.focus({preventScroll:true});
    dot.hidden=!view.point;
    if(view.point){dot.style.left=view.point[0]*100+'%';dot.style.top=view.point[1]*100+'%';}
    Array.from(panel.children).forEach((b,j)=>b.setAttribute('aria-pressed',String(j===number)));
    try{await Promise.all([next.decode(),origin?entryGate:Promise.resolve()]);}catch{if(ticket===edition)el('#walk-title').textContent='Fotografii se nepodařilo načíst.';return;}
    if(ticket!==edition||!walk.open||closing)return;
    stopMovement();
    const old=activeImage;
    stage.replaceChildren(...[old||entrySheet,next].filter(Boolean));
    activeImage=next;
    if(calm.matches||!next.animate){old?.remove();entrySheet?.remove();return;}
    const rect=stage.getBoundingClientRect();
    const x=Math.min(rect.width,Math.max(0,(origin?.x??rect.left+rect.width/2)-rect.left));
    const y=Math.min(rect.height,Math.max(0,(origin?.y??rect.top+rect.height/2)-rect.top));
    const keyframes=origin?
      [{clipPath:'circle(3% at '+x+'px '+y+'px)',transform:'scale(1.08)'},{clipPath:'circle(155% at '+x+'px '+y+'px)',transform:'none'}]:
      [{clipPath:direction<0?'inset(0 0 0 100%)':'inset(0 100% 0 0)',transform:'scale(1.045)'},{clipPath:'inset(0)',transform:'none'}];
    const entering=next.animate(keyframes,{duration:origin?740:520,easing:'cubic-bezier(.2,.72,.16,1)'});
    transitions.push(entering);
    if(old)transitions.push(old.animate([{transform:'none'},{transform:'translateX('+(-direction*2.3)+'%) scale(1.025)'}],{duration:520,easing:'ease-out'}));
    entering.finished.then(()=>{if(edition===ticket){old?.remove();entrySheet?.remove();}}).catch(()=>{});
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-enter-unit]');
    if(!b||!views[b.dataset.enterUnit]?.length)return;
    const rect=b.getBoundingClientRect(),model=el('[data-house-model]');
    const source=model.getBoundingClientRect();paper=document.createElement('canvas');
    paper.className='walk-floor-print';paper.setAttribute('aria-hidden','true');
    model.dispatchEvent(new CustomEvent('capture-floor',{detail:{canvas:paper}}));
    trigger=b;unit=b.dataset.enterUnit;
    const list=views[unit];
    let i=b.dataset.walkPhoto?list.findIndex(s=>s.photo===b.dataset.walkPhoto):list.findIndex(s=>s.floor===Number(b.dataset.floor));
    if(i<0)i=0;
    closing=false;travel=0;activeImage=null;stage.replaceChildren(paper);bindRooms();
    flight={canvas:paper,unit,point:list[i].point};
    model.dispatchEvent(new CustomEvent('room-camera',{detail:flight}));
    entryGate=flight.render&&!calm.matches?new Promise(resolve=>setTimeout(resolve,340)):Promise.resolve();
    fly(1,1000);
    el('#walk-title').textContent=list[i].label;
    walk.showModal();document.body.classList.add('walk-open');
    el('[data-walk-close]').focus({preventScroll:true});
    const box=stage.getBoundingClientRect(),ratio=Math.min(box.width/source.width,box.height/source.height);
    const u=b.classList.contains('room-pin')?(rect.left+rect.width/2-source.left)/source.width:.5;
    const v=b.classList.contains('room-pin')?(rect.top+rect.height/2-source.top)/source.height:.5;
    const x=box.left+box.width/2+(u-.5)*source.width*ratio;
    const y=box.top+box.height/2+(v-.5)*source.height*ratio;
    entryOrigin={x,y};showPhoto(i,1,entryOrigin);
  });
  panel.addEventListener('click',e=>{
    const b=e.target.closest('[data-walk-room]');
    if(b){const n=Number(b.dataset.walkRoom);if(n!==index)showPhoto(n,n<index?-1:1);}
  });
  all('[data-walk-step]').forEach(b=>b.addEventListener('click',()=>{const d=Number(b.dataset.walkStep);showPhoto(index+d,d);}));
  walk.addEventListener('keydown',e=>{
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
    e.preventDefault();const d=e.key==='ArrowLeft'?-1:1;showPhoto(index+d,d);
    if(panel.contains(e.target))panel.children[index].focus({preventScroll:true});
  });
  stage.addEventListener('pointerdown',e=>{if(e.isPrimary){gesture=[e.clientX,e.clientY];stage.setPointerCapture(e.pointerId);}});
  stage.addEventListener('pointercancel',()=>{gesture=null;});
  stage.addEventListener('pointerup',e=>{
    if(!gesture)return;
    const dx=e.clientX-gesture[0],dy=e.clientY-gesture[1];gesture=null;
    if(Math.abs(dx)<42||Math.abs(dx)<Math.abs(dy)*1.4)return;
    const d=dx<0?1:-1;showPhoto(index+d,d);
  });
  function returnToPlan(){
    if(closing||!walk.open)return;
    closing=true;edition++;stopMovement();cancelAnimationFrame(raf);
    if(!activeImage||calm.matches||!activeImage.animate){walk.close();return;}
    stage.replaceChildren(paper,activeImage);fly(0,530);
    const bounds=stage.getBoundingClientRect();
    const x=Math.max(0,Math.min(bounds.width,entryOrigin.x-bounds.left));
    const y=Math.max(0,Math.min(bounds.height,entryOrigin.y-bounds.top));
    const dest=x+'px '+y+'px';
    const exit=activeImage.animate([{clipPath:'circle(150% at '+dest+')'},{clipPath:'circle(0% at '+dest+')'}],
      {duration:520,easing:'cubic-bezier(.4,0,.3,1)',fill:'forwards'});
    exit.finished.then(()=>{if(walk.open)walk.close();}).catch(()=>{});
  }
  el('[data-walk-close]').addEventListener('click',returnToPlan);
  walk.addEventListener('cancel',e=>{e.preventDefault();returnToPlan();});
  walk.addEventListener('close',()=>{
    edition++;cancelAnimationFrame(raf);flight?.restore?.();flight=null;paper=null;
    stopMovement();document.body.classList.remove('walk-open');
    stage.replaceChildren();activeImage=null;gesture=null;closing=false;trigger?.focus({preventScroll:true});
  });
}

{
  const header=el('.atelier-head'),hero=el('.film-cover');
  const links=all('.atelier-head .mainnav a'),sections=links.map(a=>el(a.getAttribute('href')));
  const calm=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,atTop=true;
  function update(){
    frame=0;
    const cover=hero.getBoundingClientRect();
    const near=cover.bottom>100;
    if(atTop!==near){atTop=near;header.classList.toggle('solid',!near);}
    const travel=Math.min(1,Math.max(0,-cover.top/cover.height));
    if(near)hero.style.setProperty('--cover-scroll',calm.matches?'0':travel.toFixed(3));
    const y=Math.min(innerHeight*.36,240);
    const section=sections.filter(s=>s.getBoundingClientRect().top<=y).at(-1);
    links.forEach((link,i)=>{if(sections[i]===section)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
  calm.addEventListener('change',schedule);update();
}

{
  const atlas=el('.atlas-window'),print=atlas.querySelector('.map-print');
  const pins=Array.from(atlas.querySelectorAll('.paper-pin'));
  const views=all('[data-near-view]'),mouse=matchMedia('(hover: hover)');
  function preview(pin){
    const view=views[Number(pin.dataset.near)],photo=view.querySelector('.imgbtn img');
    const x=pin.offsetLeft,y=pin.offsetTop,width=atlas.clientWidth,height=atlas.clientHeight;
    print.querySelector('img').src=photo.currentSrc||photo.src;
    print.querySelector('span').textContent=view.querySelector('h3').textContent;
    print.hidden=false;
    const left=x<width*.53?x+20:x-20-print.offsetWidth;
    print.style.left=Math.max(7,Math.min(width-print.offsetWidth-7,left))+'px';
    print.style.top=Math.max(8,Math.min(height-print.offsetHeight-8,y-print.offsetHeight*.64))+'px';
  }
  pins.forEach(pin=>{
    pin.addEventListener('pointerenter',e=>{if(mouse.matches&&e.pointerType!=='touch')preview(pin);});
    pin.addEventListener('pointerleave',()=>{print.hidden=true;});
    pin.addEventListener('focus',()=>{if(pin.matches(':focus-visible'))preview(pin);});
    pin.addEventListener('blur',()=>{print.hidden=true;});
    pin.addEventListener('click',()=>{print.hidden=true;});
  });
  atlas.addEventListener('keydown',e=>{if(e.key==='Escape')print.hidden=true;});
}
