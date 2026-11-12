'use strict';
{
  const drawing=el('[data-house-model]');
  const floorUnits={1:['1.1'],2:['2.2','2.1'],3:['3.1'],4:['4.1'],5:['4.1']};
  const board=el('.model-sheet');
  const unitChoices=el('.floor-apartments');
  let level=0, selectedPlan='', selectedId='';
  function selectApartment(id) {
    const u=lookup(id);
    selectedId=id;
    const enter=el('.walk-invite');
    enter.hidden=u.sold || !u.photos.length;
    enter.dataset.enterUnit=id;
    enter.dataset.floor=String(level);
    enter.setAttribute('aria-label','Vstoupit do bytu '+id+' na fotografiích');
    const strip=el('[data-apartment-filmstrip]');
    strip.replaceChildren();strip.hidden=!u.photos.length;
    const indexes=Array.from(new Set([0,Math.floor(u.photos.length/2),u.photos.length-1]));
    if(u.photos.length)for(const i of indexes){
      const key=u.photos[i],caption=pictures[key],b=document.createElement('button');
      const image=document.createElement('img'),label=document.createElement('span');
      image.src='assets/'+key+'-640.webp';image.alt='';image.loading='lazy';image.decoding='async';
      label.textContent=caption;b.type='button';b.append(image,label);
      b.setAttribute('aria-label','Zvětšit fotografii bytu '+id+' – '+caption);
      b.addEventListener('click',()=>{unitDialog(id,u.image,i);enlargeUnit();});
      strip.append(b);
    }
    const visit=el('[data-specific-visit]');
    visit.hidden=u.sold;visit.href=u.mail;visit.firstChild.textContent='Prohlídka bytu '+u.id+' ';
    selectedPlan=level===5?'plan-4-1-horni':u.plan;
    all('[data-house-unit]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.houseUnit===id)));
    const img=el('.model-plan img');
    img.src=imagePath(selectedPlan);img.alt='Půdorys bytu '+id+' · '+level+'. NP';
    el('.model-plan').setAttribute('aria-label','Zvětšit '+img.alt.toLowerCase());
    el('[data-house-metrics]').textContent=u.layout+' · '+u.area+' m² · '+u.price;
  }
  function depart(value) {
    level=Number(value);
    board.dataset.selected=String(level);
    board.dataset.travel='opening';
    el('.model-overview').hidden=true; el('.model-result').hidden=true;
    const visit=lookup(floorUnits[level][0]);
    el('.transit-photo').style.backgroundImage='url("assets/'+visit.photos[level===5?0:level===4?1:0]+'-640.webp")';
    el('[data-transit-floor]').textContent=level+'. NP';
    el('[data-transit-title]').textContent=level===5?'Podkroví mezonetu':level===2?'Dva byty v patře':'Otevření podlaží';
    el('.model-transit').hidden=false;
    el('.fold-house').hidden=false;
    all('[data-house]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.house)===level)));
    el('[data-house-label]').textContent=level+'. nadzemní podlaží';
    el('[data-house-title]').textContent=level===5?'Mezonet, horní podlaží':level===4?'Mezonet, dolní podlaží':floorUnits[level].length===2?'Byty 2.1 a 2.2':'Byt '+floorUnits[level][0];
    unitChoices.replaceChildren();
    floorUnits[level].forEach(id=>{
      const button=document.createElement('button');button.dataset.houseUnit=id;
      button.textContent='Byt '+id+(lookup(id).sold?' · prodáno':'');unitChoices.append(button);
    });
    selectApartment(floorUnits[level][0]);
  }
  function arrive(n){
    board.dataset.travel=n?'arrived':'home';
    el('.model-transit').hidden=true;
    el('.model-result').hidden=!n;
    el('.model-overview').hidden=!!n;
    el('[data-arrival]').textContent=n?'Otevřeno '+n+'. nadzemní podlaží.':'Celý dům.';
  }
  const model=window.NS3Model.mount(drawing,depart,selectApartment,arrive);
  function chooseFloor(n){ model.select(n); depart(n); }
  all('[data-house]').forEach(b=>b.addEventListener('click',()=>chooseFloor(Number(b.dataset.house))));
  const theatre=el('#model-theatre'),wide=el('[data-model-wide]'),slot=document.createComment('model position');
  board.before(slot);
  function wideLabel(open){
    const label=open?'Zavřít větší pohled':'Zvětšit model';
    wide.setAttribute('aria-pressed',String(open));wide.setAttribute('aria-label',label);wide.querySelector('span').textContent=label;
  }
  wide.addEventListener('click',()=>{
    if(theatre.open){theatre.close();return;}
    theatre.append(board);theatre.showModal();document.body.classList.add('model-open');wideLabel(true);wide.focus({preventScroll:true});
  });
  theatre.addEventListener('close',()=>{
    slot.after(board);wideLabel(false);document.body.classList.remove('model-open');wide.focus({preventScroll:true});
  });
  drawing.addEventListener('house-side',event=>{
    const court=event.detail==='court';
    setPhoto(el('.model-cover-photo'),court?'ch-2-2-lodzie':'fasada-podhled','(max-width:760px) 35vw, 24vw');
    el('.model-cover-photo').alt=court?'Lodžie bytu 2.2 do vnitrobloku':'Cihlová fasáda a ostění oken z ulice';
    el('.model-overview .drawing-label').textContent=court?'Pohled z lodžie · Byt 2.2':'Detail uliční fasády';
  });
  if(new URLSearchParams(location.search).get('pohled')==='dvur'&&location.hash==='#byty'){
    const watcher=new MutationObserver(()=>{
      if(drawing.dataset.renderer==='spatial'){
        watcher.disconnect();if(!model.current)model.chooseSide('court');
      }
    });
    watcher.observe(drawing,{attributes:true,attributeFilter:['data-renderer']});
  }
  const requestedFloor=Number(new URLSearchParams(location.search).get('patro'));
  if(location.hash==='#byty'&&floorUnits[requestedFloor]){
    const entrance=new IntersectionObserver(([entry])=>{
      if(!entry.isIntersecting)return;
      entrance.disconnect();
      if(!board.hasAttribute('data-selected'))chooseFloor(requestedFloor);
    },{threshold:.10});
    entrance.observe(drawing);
  }
  unitChoices.addEventListener('click',event=>{const b=event.target.closest('[data-house-unit]');if(b){selectApartment(b.dataset.houseUnit);model.selectUnit(b.dataset.houseUnit);}});
  all('[data-house]').forEach(b=>b.disabled=false);
  el('.fold-house').addEventListener('click',()=>{
    el('.model-transit').hidden=true;
    model.reset();board.dataset.travel='returning';board.removeAttribute('data-selected');el('.model-overview').hidden=true;el('.model-result').hidden=true;
    all('[data-house]').forEach(b=>b.setAttribute('aria-pressed','false'));el('[data-house="'+level+'"]').focus({preventScroll:true});
    el('.fold-house').hidden=true;level=0;
  });
  el('[data-floor-detail]').addEventListener('click',()=>unitDialog(selectedId,selectedPlan));
  el('[data-floor-plan]').addEventListener('click',()=>{unitDialog(selectedId,selectedPlan);enlargeUnit();});
}
