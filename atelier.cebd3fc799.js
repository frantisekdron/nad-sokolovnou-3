'use strict';
if(el('.plan-console')) {
  const sheets=units.flatMap(u=>u.id==='4.1'?
    [{u,plan:u.plan,level:4},{u,plan:'plan-4-1-horni',level:5}]:
    [{u,plan:u.plan,level:Number(u.id[0])}]);
  let selected=0;
  function rotate(offset){
    selected=(selected+offset+sheets.length)%sheets.length;
    const {u,plan,level}=sheets[selected],pic=el('.plot img');
    pic.src=imagePath(plan);pic.alt='Půdorys bytu '+u.id+' · '+level+'. NP';
    el('#plan-seq').textContent=String(selected+1).padStart(2,'0')+' / 06';
    el('#plan-floor').textContent='Byt '+u.id+' · '+level+'. NP';
    el('#plan-name').innerHTML=u.layout+' <span>/</span> '+u.area+' m²';
  }
  el('[data-plan-prev]').addEventListener('click',()=>rotate(-1));
  el('[data-plan-next]').addEventListener('click',()=>rotate(1));
  el('[data-plan-open]').addEventListener('click',()=>{const {u,plan}=sheets[selected];unitDialog(u.id,plan);enlargeUnit();});
}
{
  const drawing=el('[data-house-model]');
  const floorUnits={1:['1.1'],2:['2.2','2.1'],3:['3.1'],4:['4.1'],5:['4.1']};
  const board=el('.model-sheet');
  const unitChoices=el('.floor-apartments');
  let level=0, selectedPlan='', selectedId='';
  function selectApartment(id) {
    const u=lookup(id);
    selectedId=id;
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
    visit.hidden=u.sold;visit.href=u.mail;visit.setAttribute('aria-label','Sjednat prohlídku bytu '+u.id);
    const photoLink=el('[data-floor-photos]');
    photoLink.hidden=!u.photos.length;
    if(u.photos.length)photoLink.textContent='Fotografie bytu '+id+' ('+u.photos.length+')';
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
    el('.fold-house').hidden=false;
    all('[data-house]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.house)===level)));
    el('[data-house-label]').textContent=level+'. nadzemní podlaží';
    el('[data-house-title]').textContent=level===5?'Pod střechou':level===4?'Dolní úroveň mezonetu':level===2?'Dva byty v patře':'Byt přes podlaží';
    unitChoices.replaceChildren();
    floorUnits[level].forEach(id=>{
      const button=document.createElement('button');button.dataset.houseUnit=id;
      button.textContent='Byt '+id+(lookup(id).sold?' · prodáno':'');unitChoices.append(button);
    });
    selectApartment(floorUnits[level][0]);
  }
  function arrive(n){
    board.dataset.travel=n?'arrived':'home';
    el('.model-result').hidden=!n;
    el('.model-overview').hidden=!!n;
    el('[data-arrival]').textContent=n?'Otevřeno '+n+'. nadzemní podlaží.':'Celý dům.';
  }
  const model=window.NS3Model.mount(drawing,depart,selectApartment,arrive);
  function chooseFloor(n){ model.select(n); depart(n); }
  all('[data-house]').forEach(b=>b.addEventListener('click',()=>chooseFloor(Number(b.dataset.house))));
  el('[data-house-first]').addEventListener('click',()=>{chooseFloor(1);el('[data-house="1"]').focus({preventScroll:true});});
  unitChoices.addEventListener('click',event=>{const b=event.target.closest('[data-house-unit]');if(b){selectApartment(b.dataset.houseUnit);model.selectUnit(b.dataset.houseUnit);}});
  all('[data-house], [data-house-first]').forEach(b=>b.disabled=false);
  el('.fold-house').addEventListener('click',()=>{
    model.reset();board.dataset.travel='returning';board.removeAttribute('data-selected');el('.model-overview').hidden=true;el('.model-result').hidden=true;
    all('[data-house]').forEach(b=>b.setAttribute('aria-pressed','false'));el('[data-house="'+level+'"]').focus({preventScroll:true});
    el('.fold-house').hidden=true;level=0;
  });
  el('[data-floor-photos]').addEventListener('click',()=>unitDialog(selectedId,lookup(selectedId).image));
  el('[data-floor-detail]').addEventListener('click',()=>unitDialog(selectedId,selectedPlan));
  el('[data-floor-plan]').addEventListener('click',()=>{unitDialog(selectedId,selectedPlan);enlargeUnit();});
}

{
  const film = el('[data-film]');
  const toggle = el('[data-film-toggle]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let wanted = !reduced.matches && !navigator.connection?.saveData;
  let visible = false;
  function loadFilm() {
    if(film.getAttribute('src'))return;
    const format=matchMedia('(max-width:700px)').matches?'mobil':'siroky';
    film.src='assets/atelier/pruceli-'+format+'.mp4';
  }
  function syncFilm() {
    if (!wanted || !visible || document.hidden || el('#project-cinema')?.open) {
      film.pause();
      return;
    }
    loadFilm();
    film.play().catch(() => {});
  }
  function updateControl() {
    const playing = !film.paused;
    const label = playing ? 'Pozastavit film' : 'Přehrát film';
    toggle.dataset.playing = String(playing);
    toggle.setAttribute('aria-label', label);
    el('[data-film-label]').textContent = label;
  }
  const chapters=all('[data-film-chapter]');
  const chapterBar=el('.film-chapters');
  let pendingSeek=null;
  function seek(){
    if(pendingSeek===null || film.readyState<1)return;
    film.currentTime=pendingSeek;pendingSeek=null;
  }
  function markChapter(){
    const time=film.currentTime;
    const chapter=time<3.9 || time>=11.4?0:time<7.7?1:2;
    chapters.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===chapter)));
  }
  chapterBar.hidden=false;
  chapters.forEach(b=>b.addEventListener('click',()=>{
    pendingSeek=Number(b.dataset.filmChapter);loadFilm();
    if(!film.readyState)film.load();
    seek();
    if(wanted)syncFilm();
  }));
  film.addEventListener('loadedmetadata',seek);
  film.addEventListener('seeked',()=>{film.classList.add('has-frame');markChapter();});
  film.addEventListener('timeupdate',markChapter);
  toggle.hidden = false;
  toggle.addEventListener('click', () => { wanted = film.paused; syncFilm(); });
  film.addEventListener('playing', () => {film.classList.add('has-frame'); updateControl();});
  film.addEventListener('pause', updateControl);
  film.addEventListener('error', () => {film.classList.remove('has-frame'); toggle.hidden=true;chapterBar.hidden=true;});
  reduced.addEventListener('change', () => {wanted=!reduced.matches && !navigator.connection?.saveData; syncFilm();});
  document.addEventListener('visibilitychange', syncFilm);
  new IntersectionObserver(([entry]) => {visible=entry.isIntersecting; syncFilm();}).observe(film);
}
