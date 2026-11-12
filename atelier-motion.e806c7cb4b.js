'use strict';
// Architectural study: the drawing and photograph share precisely the same crop.
{
  const range=el('#study-mix'),study=el('.facade-study');
  function display(percent){study.style.setProperty('--drawing',percent+'%');range.value=String(Math.round(percent));}
  display(Number(range.value));
  let animation=0,edited=false;
  range.addEventListener('input',()=>{edited=true;cancelAnimationFrame(animation);display(Number(range.value));});
  const quiet=matchMedia('(prefers-reduced-motion: reduce)');
  const observer=new IntersectionObserver(([entry])=>{
    if(!entry.isIntersecting)return;
    observer.disconnect();
    if(quiet.matches||edited)return;
    const start=performance.now();
    function etch(now){
      if(edited||quiet.matches)return;
      const t=Math.min(1,(now-start)/1550);
      display(98-50*(t*t*(3-2*t)));
      if(t<1)animation=requestAnimationFrame(etch);
    }
    animation=requestAnimationFrame(etch);
  },{threshold:.32});
  observer.observe(study);
}

// An editorial spread: changing the subject reveals the next photograph in the same frame.
{
  const folio=el('.folio'),frames=all('.folio-frame'),tabs=all('[data-folio-index]');
  const quiet=matchMedia('(prefers-reduced-motion: reduce)');
  let active=0, running=[], touch=null,swiped=false;
  folio.classList.add('interactive');
  function select(index,step=1){
    const next=(index+frames.length)%frames.length;
    running.forEach(a=>a.cancel());running=[];
    const previous=active;
    active=next;
    frames.forEach((frame,i)=>{
      frame.hidden=i!==active;
      frame.inert=i!==active;
      frame.classList.toggle('current',i===active);
    });
    tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===active)));
    el('[data-folio-count]').value=String(active+1).padStart(2,'0')+' / '+String(frames.length).padStart(2,'0');
    if(previous===active||quiet.matches||!frames[active].animate)return;
    const old=frames[previous],current=frames[active];
    old.hidden=false;
    const cover=step>0?'inset(0 100% 0 0)':'inset(0 0 0 100%)';
    const reveal=current.animate([{clipPath:cover},{clipPath:'inset(0)'}],{duration:670,easing:'cubic-bezier(.22,.75,.24,1)'});
    running=[reveal,current.querySelector('img').animate([{transform:'scale(1.09)'},{transform:'scale(1)'}],{duration:780,easing:'ease-out'})];
    reveal.finished.then(()=>{if(active===next)old.hidden=true;}).catch(()=>{});
  }
  tabs.forEach((tab,i)=>tab.addEventListener('click',()=>select(i,i>=active?1:-1)));
  all('[data-folio-step]').forEach(b=>b.addEventListener('click',()=>{const d=Number(b.dataset.folioStep);select(active+d,d);}));
  folio.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
    e.preventDefault();const d=e.key==='ArrowLeft'?-1:1;select(active+d,d);
    if(tabs.includes(e.target))tabs[active].focus({preventScroll:true});
  });
  const stage=el('.folio-stage');
  stage.addEventListener('touchstart',e=>{swiped=false;touch=e.touches.length===1?[e.touches[0].clientX,e.touches[0].clientY]:null;},{passive:true});
  stage.addEventListener('touchend',e=>{
    if(!touch)return;
    const dx=e.changedTouches[0].clientX-touch[0],dy=e.changedTouches[0].clientY-touch[1];touch=null;
    if(Math.abs(dx)<43||Math.abs(dx)<1.35*Math.abs(dy))return;
    const d=dx<0?1:-1;swiped=true;select(active+d,d);
  },{passive:true});
  stage.addEventListener('touchcancel',()=>{touch=null;});
  stage.addEventListener('click',e=>{if(swiped){e.stopPropagation();e.preventDefault();swiped=false;}},true);
  select(0);
}

{
  const quiet=matchMedia('(prefers-reduced-motion: reduce)');
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      const node=entry.target;
      observer.unobserve(node);
      if(quiet.matches||!node.animate)return;
      const image=node.matches('.river-hero,.penthouse-pair,.residence-room');
      const keyframes=image ? [{clipPath:'inset(7% 4% 7% 4%)',transform:'translateY(16px)'},{clipPath:'inset(0)',transform:'none'}] :
        [{opacity:.4,transform:'translateY(18px)'},{opacity:1,transform:'none'}];
      node.animate(keyframes,{duration:image?1050:740,easing:'cubic-bezier(.18,.65,.2,1)'});
    });
  },{threshold:.13});
  all('.b-pad h2,.house-section h2,.residence-room,.penthouse-pair,.river-hero,.project-contact address').forEach(n=>observer.observe(n));
}

{
  const quiet=matchMedia('(prefers-reduced-motion: reduce)');
  let ticket=0;
  const lightbox=el('#detail');
  lightbox.addEventListener('close',()=>{ticket++;});
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-gallery],[data-gallery-step]');
    if(!button || quiet.matches)return;
    const source=button.hasAttribute('data-gallery')?button.getBoundingClientRect():null;
    const visit=++ticket;
    requestAnimationFrame(async()=>{
      const image=lightbox.querySelector('.full-visual img');
      if(!image || !lightbox.open || !image.animate)return;
      try{await image.decode();}catch{return;}
      if(visit!==ticket || !image.isConnected || !lightbox.open)return;
      const dest=image.getBoundingClientRect();
      if(!dest.width || !dest.height)return;
      const origin=source?
        'translate('+((source.left+source.width/2)-(dest.left+dest.width/2))+'px,'+((source.top+source.height/2)-(dest.top+dest.height/2))+'px) scale('+Math.min(1,Math.max(.12,source.width/dest.width))+')':
        'translateX('+(Number(button.dataset.galleryStep)*24)+'px) scale(1.025)';
      image.animate([{transform:origin,opacity:source?.7:.45},{transform:'none',opacity:1}],{duration:source?530:350,easing:'cubic-bezier(.18,.74,.2,1)'});
    });
  },true);
  const trace=el('.contact-trace path');
  const observer=new IntersectionObserver(([entry])=>{
    if(!entry.isIntersecting)return;
    observer.disconnect();
    if(!quiet.matches && trace.animate){
      trace.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{duration:2400,easing:'ease-out'});
    }
  },{threshold:.15});
  observer.observe(el('#kontakt'));
}
