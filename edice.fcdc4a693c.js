'use strict';
if(el('.hero-photo')) {
  const slides=['fasada-podhled','mezonet-prostor','stresni-terasa','podoli-nadhled'];
  let index=0;
  const rotate=(direction)=>{
    index=(index+direction+slides.length)%slides.length;
    const pic=el('.hero-photo');setPhoto(pic, slides[index], "100vw");pic.alt=pictures[slides[index]];
    el('#slide-number').innerHTML=String(index+1).padStart(2,'0')+' <i>/</i> 04';
  };
  el('[data-hero-prev]').addEventListener('click',()=>rotate(-1));
  el('[data-hero-next]').addEventListener('click',()=>rotate(1));
}
function turnPage(pick) {
  const u=lookup(pick.dataset.ed);
  all('[data-ed]').forEach(button=>button.setAttribute('aria-pressed',String(button===pick)));
  const img=el('.ed-image');
  img.alt='Snímek z galerie bytu '+u.id;
  setPhoto(img,u.image,'(max-width:700px) 100vw, 52vw');
  el('[data-ed-caption]').textContent=u.id;
  el('[data-ed-floor]').textContent='Byt '+u.id+' / '+u.floor;
  el('[data-ed-name]').textContent=pick.dataset.title;
  el('[data-ed-layout]').textContent=u.layout;
  el('[data-ed-area]').textContent=u.area+' m²';
  el('[data-ed-price]').textContent=u.price;
  el('[data-ed-open]').dataset.unit=u.id;
}
all('[data-ed]').forEach(pick=>pick.addEventListener('click',()=>turnPage(pick)));
el('[data-filter="available"]').addEventListener('click',()=>{
  if(el('[data-ed][aria-pressed="true"]').dataset.sold==='true') turnPage(el('[data-ed][data-sold="false"]'));
});
