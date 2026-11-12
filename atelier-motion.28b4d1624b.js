'use strict';
// An editorial spread: changing the subject reveals the next photograph in the same frame.
{
  const folio=el('.folio'),indexPanel=el('.folio-index');
  let frames=all('.folio-frame'),tabs=all('[data-folio-index]');
  const originalFrames=frames.map(n=>n.cloneNode(true)),originalTabs=tabs.map(n=>n.cloneNode(true));
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
    el('[data-folio-count]').value=(active+1)+' z '+frames.length;
    if(previous===active||quiet.matches||!frames[active].animate)return;
    const old=frames[previous],current=frames[active];
    old.hidden=false;
    const cover=step>0?'inset(0 100% 0 0)':'inset(0 0 0 100%)';
    const reveal=current.animate([{clipPath:cover},{clipPath:'inset(0)'}],{duration:670,easing:'cubic-bezier(.22,.75,.24,1)'});
    running=[reveal,current.querySelector('img').animate([{transform:'scale(1.09)'},{transform:'scale(1)'}],{duration:780,easing:'ease-out'})];
    reveal.finished.then(()=>{if(active===next)old.hidden=true;}).catch(()=>{});
  }
  indexPanel.addEventListener('click',e=>{
    const tab=e.target.closest('[data-folio-index]');if(tab){const i=Number(tab.dataset.folioIndex);select(i,i>=active?1:-1);}
  });
  all('[data-album]').forEach(button=>button.addEventListener('click',()=>{
    if(button.getAttribute('aria-pressed')==='true')return;
    running.forEach(a=>a.cancel());running=[];
    const template=el('template[data-book="'+button.dataset.album+'"]');
    const collections=template?Array.from(template.content.children).map(n=>Array.from(n.children)):[originalFrames,originalTabs];
    frames=collections[0].map(n=>n.cloneNode(true));tabs=collections[1].map(n=>n.cloneNode(true));
    stage.replaceChildren(...frames);indexPanel.replaceChildren(...tabs);
    all('[data-album]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    active=0;select(0);
    if(!quiet.matches)stage.animate([{clipPath:'inset(0 8% 0 4%)'},{clipPath:'inset(0)'}],{duration:490,easing:'cubic-bezier(.2,.7,.2,1)'});
  }));
  all('[data-folio-step]').forEach(b=>b.addEventListener('click',()=>{const d=Number(b.dataset.folioStep);select(active+d,d);}));
  folio.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
    e.preventDefault();const d=e.key==='ArrowLeft'?-1:1;select(active+d,d);
    if(tabs.includes(e.target))tabs[active].focus({preventScroll:true});
  });
  el('.folio-stage').addEventListener('click',e=>{
    const button=e.target.closest('[data-gallery]');if(!button)return;
    if(swiped){swiped=false;e.stopPropagation();return;}
    e.stopPropagation();gallery=frames.map(f=>f.dataset.frameKey);showGallery(gallery.indexOf(button.dataset.gallery));
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

}

{
  const cinema=el('#project-cinema'),movie=cinema.querySelector('video');
  el('[data-cinema-open]').addEventListener('click',()=>{
    cinema.showModal();
    document.body.classList.add('cinema-open');
    if(!movie.getAttribute('src'))movie.src='assets/atelier/film-rezidence.mp4';
    if(movie.ended)movie.currentTime=0;
    movie.play().catch(()=>{});
    el('[data-cinema-close]').focus({preventScroll:true});
  });
  function closeCinema(){movie.pause();cinema.close();}
  cinema.addEventListener('cancel',()=>movie.pause());
  el('[data-cinema-close]').addEventListener('click',closeCinema);
  cinema.addEventListener('click',e=>{if(e.target===cinema){const r=cinema.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeCinema();}});
  cinema.addEventListener('close',()=>{movie.pause();document.body.classList.remove('cinema-open');});
}

{
  const calm=matchMedia('(prefers-reduced-motion: reduce)');
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
  exhibit('.paper-atlas','[data-near]','[data-near-view]','near','nearView');
}
