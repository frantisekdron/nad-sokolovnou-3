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
  function reveal(value) {
    level=Number(value);
    board.dataset.selected=String(level);
    el('.model-overview').hidden=true; el('.model-result').hidden=false;
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
  const model=window.NS3Model.mount(drawing,reveal,selectApartment);
  function chooseFloor(n){ model.select(n); reveal(n); }
  all('[data-house]').forEach(b=>b.addEventListener('click',()=>chooseFloor(Number(b.dataset.house))));
  el('[data-house-first]').addEventListener('click',()=>{chooseFloor(1);el('[data-house="1"]').focus({preventScroll:true});});
  unitChoices.addEventListener('click',event=>{const b=event.target.closest('[data-house-unit]');if(b){selectApartment(b.dataset.houseUnit);model.selectUnit(b.dataset.houseUnit);}});
  all('[data-house], [data-house-first]').forEach(b=>b.disabled=false);
  el('.fold-house').addEventListener('click',()=>{
    model.reset();board.removeAttribute('data-selected');el('.model-overview').hidden=false;el('.model-result').hidden=true;
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
  function syncFilm() {
    if (!wanted || !visible || document.hidden) {
      film.pause();
      return;
    }
    if (!film.getAttribute('src')) {
      const format = matchMedia('(max-width:700px)').matches ? 'mobil' : 'siroky';
      film.src = 'assets/atelier/podoli-' + format + '.mp4';
    }
    film.play().catch(() => {});
  }
  function updateControl() {
    const playing = !film.paused;
    const label = playing ? 'Pozastavit film' : 'Přehrát film';
    toggle.dataset.playing = String(playing);
    toggle.setAttribute('aria-label', label);
    el('[data-film-label]').textContent = label;
  }
  toggle.hidden = false;
  toggle.addEventListener('click', () => { wanted = film.paused; syncFilm(); });
  film.addEventListener('playing', () => {film.classList.add('has-frame'); updateControl();});
  film.addEventListener('pause', updateControl);
  film.addEventListener('error', () => {film.classList.remove('has-frame'); toggle.hidden=true;});
  reduced.addEventListener('change', () => {wanted=!reduced.matches && !navigator.connection?.saveData; syncFilm();});
  document.addEventListener('visibilitychange', syncFilm);
  new IntersectionObserver(([entry]) => {visible=entry.isIntersecting; syncFilm();}).observe(film);
}
