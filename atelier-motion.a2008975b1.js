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

{
  const cinema=el('#project-cinema'),movie=cinema.querySelector('video');
  const ambient=el('[data-film]');let resume=false,timestamp=null;
  function seekFilm(){if(timestamp!==null && movie.readyState>=1){movie.currentTime=timestamp;timestamp=null;}}
  el('[data-cinema-open]').addEventListener('click',()=>{
    resume=!ambient.paused;ambient.pause();cinema.showModal();
    document.body.classList.add('cinema-open');
    if(!movie.getAttribute('src'))movie.src='assets/atelier/film-rezidence.mp4';
    if(movie.ended)movie.currentTime=0;
    movie.play().catch(()=>{});
    el('[data-cinema-close]').focus({preventScroll:true});
  });
  movie.addEventListener('loadedmetadata',seekFilm);
  all('[data-film-jump]').forEach(b=>b.addEventListener('click',()=>{timestamp=Number(b.dataset.filmJump);seekFilm();movie.play().catch(()=>{});}));
  movie.addEventListener('timeupdate',()=>{const t=movie.currentTime;all('[data-film-jump]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.filmJump)===(t>=32.4?0:t>=25?25:t>=16?16:0))));});
  function closeCinema(){movie.pause();cinema.close();}
  cinema.addEventListener('cancel',()=>movie.pause());
  el('[data-cinema-close]').addEventListener('click',closeCinema);
  cinema.addEventListener('click',e=>{if(e.target===cinema){const r=cinema.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeCinema();}});
  cinema.addEventListener('close',()=>{movie.pause();document.body.classList.remove('cinema-open');if(resume&&!document.hidden)ambient.play().catch(()=>{});});
}

{
  const calm=matchMedia('(prefers-reduced-motion: reduce)');
  // Both exhibitions keep their complete views readable without JavaScript.
  function exhibit(container,buttonSelector,viewSelector,buttonKey,viewKey){
    const root=el(container),buttons=Array.from(root.querySelectorAll(buttonSelector)),views=Array.from(root.querySelectorAll(viewSelector));
    let active=0,animation,overlay;
    function choose(n,initial=false){
      if(!initial&&n===active)return;
      const last=views.find(v=>Number(v.dataset[viewKey])===active);
      const outgoing=last?.querySelector('.imgbtn img');
      active=n;animation?.cancel();overlay?.remove();
      let view;
      for(const item of views){item.hidden=Number(item.dataset[viewKey])!==n;if(!item.hidden)view=item;}
      for(const button of buttons)button.setAttribute('aria-pressed',String(Number(button.dataset[buttonKey])===n));
      if(!initial && !calm.matches && view.animate){
        const surface=view.querySelector('.imgbtn');
        if(surface&&outgoing){
          const curtain=outgoing.cloneNode(false);
          curtain.className='photo-curtain';curtain.alt='';curtain.setAttribute('aria-hidden','true');
          surface.append(curtain);overlay=curtain;
          animation=curtain.animate([{clipPath:'inset(0)',transform:'none'},{clipPath:'inset(0 0 0 100%)',transform:'scale(1.035)'}],{duration:650,easing:'cubic-bezier(.2,.7,.18,1)'});
          animation.finished.then(()=>curtain.remove()).catch(()=>curtain.remove());
        }
        const words=view.querySelector('figcaption');
        words?.animate([{transform:'translateY(9px)'},{transform:'none'}],{duration:440,easing:'ease-out'});
      }
    }
    buttons.forEach(b=>b.addEventListener('click',()=>choose(Number(b.dataset[buttonKey]))));
    root.addEventListener('keydown',e=>{
      if(!buttons.includes(e.target)||!['ArrowLeft','ArrowRight'].includes(e.key))return;
      e.preventDefault();const n=(active+(e.key==='ArrowLeft'?-1:1)+views.length)%views.length;
      choose(n);buttons.find(b=>Number(b.dataset[buttonKey])===n&&b.parentElement===e.target.parentElement)?.focus();
    });
    root.classList.add('ready');choose(0,true);
  }
  exhibit('.room-spread','[data-room-choice]','[data-room-shot]','roomChoice','roomShot');
  exhibit('.material-cabinet','[data-sample]','[data-sample-view]','sample','sampleView');
  exhibit('.paper-atlas','[data-near]','[data-near-view]','near','nearView');
}

{
  const study=el('.facade-study'),frame=study.querySelector('.study-glass'),lens=el('.masonry-lens');
  const toggle=el('[data-study-lens]'),hint=el('.lens-instruction'),photo=frame.querySelector('.imgbtn img');
  let active=false,u=.61,v=.45;
  function position(){
    if(!active||!photo.naturalWidth)return;
    const {width,height}=frame.getBoundingClientRect(),diameter=lens.offsetWidth;
    if(!width || !diameter)return;
    const ratio=Math.max(width/photo.naturalWidth,height/photo.naturalHeight);
    const rw=photo.naturalWidth*ratio,rh=photo.naturalHeight*ratio;
    const x=Math.max(diameter/2,Math.min(width-diameter/2,u*width)),y=Math.max(diameter/2,Math.min(height-diameter/2,v*height));
    const zoom=2.45;
    lens.style.left=x+'px';lens.style.top=y+'px';
    lens.style.backgroundSize=rw*zoom+'px '+rh*zoom+'px';
    lens.style.backgroundPosition=(diameter/2-(x+(rw-width)/2)*zoom)+'px '+(diameter/2-(y+(rh-height)/2)*zoom)+'px';
  }
  function pointer(e){if(!active)return;const r=frame.getBoundingClientRect();u=(e.clientX-r.left)/r.width;v=(e.clientY-r.top)/r.height;position();}
  toggle.addEventListener('click',()=>{
    active=!active;toggle.setAttribute('aria-pressed',String(active));toggle.textContent=active?'Zavřít lupu':'Lupa na fasádu';
    hint.hidden=lens.hidden=!active;frame.classList.toggle('lens-active',active);
    if(active){lens.style.backgroundImage='url("assets/fasada-podhled.webp")';position();}
  });
  frame.addEventListener('pointerdown',pointer);frame.addEventListener('pointermove',pointer);
  frame.addEventListener('click',e=>{if(active){e.preventDefault();e.stopPropagation();}},true);
  study.addEventListener('keydown',e=>{
    if(!active||e.target.matches('input'))return;
    if(e.key==='Escape'){toggle.click();toggle.focus();return;}
    const step={ArrowLeft:[-.08,0],ArrowRight:[.08,0],ArrowUp:[0,-.08],ArrowDown:[0,.08]}[e.key];
    if(!step)return;e.preventDefault();u=Math.min(1,Math.max(0,u+step[0]));v=Math.min(1,Math.max(0,v+step[1]));position();
  });
  new ResizeObserver(position).observe(frame);photo.addEventListener('load',position);
}
