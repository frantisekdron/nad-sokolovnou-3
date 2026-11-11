'use strict';
{
  const segments = ['M9 5h22','M34 10l-2 19','M31 37l-2 20','M24 62H4','M1 56l2-18','M4 28l2-18','M9 33h18'];
  const patterns = ['012345', '12', '01643', '01623', '5612', '05623'];
  function led(number) {
    el('.led').innerHTML = ('0'+number).split('').map((n) => '<svg viewBox="0 0 40 68" fill="none" stroke-width="5.7" stroke-linecap="square">'+segments.map((d,i)=>'<path d="'+d+'" stroke="'+(patterns[Number(n)].includes(String(i))?'#dfbb79':'#373429')+'"/>').join('')+'</svg>').join('');
  }
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const track=el('.lift-track'), stage=el('.lift-stage');
  const views=el('.roof-views'), digit=el('#digit');
  let position=5, destination=5, displayedLevel=5, animation=0, trip=0, roofMode='interier';
  function display(level) {
    displayedLevel=level;
    led(level);
    digit.textContent='0'+level;el('.cabin-floor').textContent='0'+level;
    digit.setAttribute('aria-label',level+'. nadzemní podlaží');
  }
  function levelImage(level) {
    const scene=el('[data-scene="'+level+'"]');
    let img=scene.querySelector('img');
    if(!img) {
      img=new Image();img.className='lift-photo';img.decoding='async';
      img.alt=pictures[floors[level].pic] || floors[level].label;
      setPhoto(img,floors[level].pic,'(max-width:700px) 100vw, 76vw');
      scene.prepend(img);
    }
    return img;
  }
  function chooseView(view) {
    roofMode=view;
    const key=view==='terasa'?'stresni-terasa':floors[5].pic;
    const img=levelImage(5);setPhoto(img,key,'(max-width:700px) 100vw, 76vw');
    img.alt=pictures[key];
    all('[data-view]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.view===view)));
    el('#lift-label').textContent=view==='terasa'?'Střešní terasa mezonetu':floors[5].label;
  }
  const gauge=el('.shaft-car'), state=el('[data-travel-state]'), play=el('[data-play-ride]');
  function draw(value, moveScene=true) {
    position=value;
    if(moveScene) track.style.transform='translate3d(0,'+((value-5)*100)+'%,0)';
    gauge.style.top=((5-value)/4*100)+'%';
    const near=Math.round(value);
    if(near!==displayedLevel){
      if(!moveScene)track.style.transform='translate3d(0,'+((near-5)*100)+'%,0)';
      display(near);
      el('#lift-desc').textContent=floors[near].desc;
    }
  }
  function arrive(level) {
    animation=0;draw(level);
    const f=floors[level];
    stage.dataset.moving='false';stage.dataset.phase='rest';stage.dataset.arrived=String(level);
    state.textContent='Kabina v '+level+'. NP';
    el('[data-ride-cta]').textContent=level===5?'Sjet k ulici':'Vyjet na terasu';
    el('[data-ride-arrow]').textContent=level===5?'↓':'↑';
    el('.direction').textContent='';
    views.hidden=level!==5;views.inert=level!==5;el('.lift-story').inert=false;
    all('[data-scene]').forEach(scene=>scene.setAttribute('aria-hidden',String(Number(scene.dataset.scene)!==level)));
    el('#lift-title').innerHTML=f.name;el('#lift-label').textContent=f.label;
    el('#lift-desc').textContent=f.desc;
    el('#lift-links').innerHTML=f.ids.map(id=>'<button data-unit="'+id+'" data-plan="'+(level===5?'plan-4-1-horni':lookup(id).plan)+'">Byt '+id+' · '+lookup(id).layout+' '+icon('up')+'</button>').join('');
    if(level===5)chooseView(roofMode);
  }
  function ride(level, explicitPlayback=false) {
    if(level===destination)return;
    const ticket=++trip, start=position, distance=Math.abs(level-start);
    cancelAnimationFrame(animation);destination=level;
    const calm=reduceMotion.matches&&!explicitPlayback;
    const from=Math.round(start), direction=level>start?'↑':'↓';
    all('[data-floor]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.floor)===level)));
    if(distance<.01){arrive(level);return;}
    stage.dataset.calm=String(calm);stage.dataset.moving='true';stage.dataset.phase='closing';
    views.inert=true;el('.lift-story').inert=true;
    state.textContent=from+'. NP '+direction+' '+level+'. NP';
    el('.cabin-trip').textContent=direction+' '+String(level).padStart(2,'0');
    el('.direction').textContent=direction;
    el('[data-ride-cta]').textContent='Zastavit v nejbližším patře';el('[data-ride-arrow]').textContent='■';
    for(let n=Math.floor(Math.min(start,level));n<=Math.ceil(Math.max(start,level));n++)levelImage(n);
    const began=performance.now(), depart=calm?80:310, duration=(calm?610:1000)+distance*(calm?510:660), open=calm?60:320;
    function tick(now) {
      if(ticket!==trip)return;
      const elapsed=Math.max(0,now-began-depart),p=Math.min(1,elapsed/duration);
      if(p>0&&p<1)stage.dataset.phase='travelling';
      const ease=p*p*(3-2*p);
      draw(start+(level-start)*ease,!calm);
      if(p===1){draw(level);stage.dataset.phase='opening';}
      if(elapsed<duration+open)animation=requestAnimationFrame(tick);else arrive(level);
    }
    animation=requestAnimationFrame(tick);
  }
  all('[data-view]').forEach(btn=>btn.addEventListener('click',()=>chooseView(btn.dataset.view)));
  all('[data-floor]').forEach(btn=>btn.addEventListener('click',()=>ride(Number(btn.dataset.floor))));
  play.addEventListener('click',()=>{
    if(stage.dataset.moving==='true'){
      const nearest=Math.round(position);
      if(nearest===destination){++trip;cancelAnimationFrame(animation);arrive(nearest);}
      else ride(nearest);
    }else ride(destination===5?1:5,true);
  });
  reduceMotion.addEventListener('change',()=>{
    if(reduceMotion.matches&&stage.dataset.moving==='true'){++trip;cancelAnimationFrame(animation);arrive(destination);}
  });
  display(5);arrive(5);
}
{
  const rail=el('#street-rail'),cards=[...rail.children],counter=el('.street-counter');
  let index=0,scrollTimer;
  const leftOf=i=>cards[i].offsetLeft-cards[0].offsetLeft;
  const visible=()=>Math.max(1,Math.min(2,Math.round(rail.clientWidth/cards[0].getBoundingClientRect().width)));
  const last=()=>cards.length-visible();
  const pad=n=>String(n).padStart(2,'0');
  function showCount(){
    counter.textContent=pad(index+1)+(visible()>1?'–'+pad(index+visible()):'')+' / '+pad(cards.length);
  }
  function sync(){
    let near=0;
    for(let i=1;i<=last();i++)if(Math.abs(leftOf(i)-rail.scrollLeft)<Math.abs(leftOf(near)-rail.scrollLeft))near=i;
    index=near;showCount();
  }
  function move(step){
    index=(index+step+last()+1)%(last()+1);showCount();
    rail.scrollTo({left:leftOf(index),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  el('[data-street-prev]').addEventListener('click',()=>move(-1));
  el('[data-street-next]').addEventListener('click',()=>move(1));
  el('.c-views').addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}
  });
  rail.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(sync,130);},{passive:true});
  new ResizeObserver(sync).observe(rail);
}
{
  const places=JSON.parse(el('#places').textContent), graphic=el('.map-graphic');
  const card=el('.place-preview'), image=el('[data-map-photo]'), credit=el('[data-photo-credit]');
  const pins=all('[data-place]');let active=null, pinned=null, closeTimer, trigger=null;
  function noteLink(title,url){
    const a=document.createElement('a');a.href=url;a.textContent=title;a.target='_blank';a.rel='noopener';return a;
  }
  function position(){
    if(!active||card.hidden)return;
    const w=graphic.clientWidth,h=graphic.clientHeight,cw=card.offsetWidth,ch=card.offsetHeight;
    const x=w*active.x/900,y=h*active.y/650;
    const preferred=x+cw+22<w?x+19:x-cw-19;
    card.style.left=Math.max(5,Math.min(w-cw-5,preferred))+'px';
    card.style.top=Math.max(5,Math.min(h-ch-5,y-ch*.52))+'px';
  }
  function show(id){
    clearTimeout(closeTimer);
    const p=places.find(place=>place.id===id),ph=p.photo;active=p;
    pins.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.place===id)));
    el('[data-map-name]').textContent=p.name;el('[data-map-category]').textContent=p.category;
    el('[data-map-description]').textContent=p.description;el('.map-route').href=p.url;
    image.src='assets/map-photos/'+ph.file;image.alt=ph.caption;
    el('[data-photo-title]').textContent=p.name;credit.replaceChildren();
    if(ph.license)credit.append(noteLink(ph.credit,ph.credit_url),' · ',noteLink(ph.license,ph.license_url),' · '+ph.changes);
    else credit.textContent=ph.credit;
    card.hidden=false;card.dataset.photo=id;position();
  }
  function hide(){clearTimeout(closeTimer);pinned=null;card.hidden=true;}
  function leave(){
    clearTimeout(closeTimer);
    closeTimer=setTimeout(()=>{if(pinned)show(pinned);else if(!card.contains(document.activeElement))hide();},240);
  }
  pins.forEach(b=>{
    b.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')show(b.dataset.place);});
    b.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')leave();});
    b.addEventListener('focus',()=>show(b.dataset.place));b.addEventListener('blur',leave);
    b.addEventListener('click',()=>{trigger=b;pinned=b.dataset.place;show(pinned);});
  });
  card.addEventListener('pointerenter',()=>clearTimeout(closeTimer));card.addEventListener('pointerleave',leave);
  card.addEventListener('focusin',()=>clearTimeout(closeTimer));card.addEventListener('focusout',leave);
  function dismiss(){if(card.contains(document.activeElement)&&trigger)trigger.focus({preventScroll:true});hide();}
  el('.close-preview').addEventListener('click',dismiss);
  el('.night-map').addEventListener('keydown',e=>{if(e.key==='Escape'&&!card.hidden){e.preventDefault();dismiss();}});
  document.addEventListener('pointerdown',e=>{if(!card.hidden&&!card.contains(e.target)&&!e.target.closest('[data-place]'))hide();});
  new ResizeObserver(position).observe(graphic);
}
