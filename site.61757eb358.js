'use strict';
const {units, floors, pictures, widths, buildingPhotos} = JSON.parse(document.querySelector('#data').textContent);
const el = (selector) => document.querySelector(selector);
const all = (selector) => Array.from(document.querySelectorAll(selector));
const icon = (name) => {
  const paths = {up:'M5 19 19 5M7 5h12v12',expand:'M4 10V4h6m4 0h6v6m0 4v6h-6m-4 0H4v-6'};
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[name]+'"/></svg>';
};
const imagePath = (key) => 'assets/'+key+'.webp';
function setPhoto(img, key, sizes) {
  img.sizes = sizes;
  img.srcset = 'assets/'+key+'-640.webp 640w, assets/'+key+'-1024.webp 1024w, '+imagePath(key)+' '+widths[key]+'w';
  img.src = imagePath(key);
}
const lookup = (id) => units.find((unit) => unit.id === id);
const dialog = el('#detail');
const contents = el('#dialog-content');
let gallery = [];
let photoIndex = 0;
let currentUnit = null;
let unitTab = '';
function show(content) {
  contents.innerHTML = content;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add('has-dialog');
}
function tabs(unit) {
  const result = [{label:unit.id==='4.1'?'Půdorys 4. NP':'Půdorys', key:unit.plan}];
  if (unit.id==='4.1') result.push({label:'Půdorys 5. NP',key:'plan-4-1-horni'});
  const photos=unit.photos.length?unit.photos:[unit.image];
  result.push({label:unit.photos.length?'Fotografie bytu ('+photos.length+')':'Z nabídkové galerie',key:unit.image,photos});
  result.push({label:'Dům a garáž',key:'spolecny-dum',photos:buildingPhotos});
  return result;
}
let activeSheet=null;
let sheetPhoto=0;
function photoControls(photos, withThumbs) {
  const controls='<div class="room-controls"><button data-sheet-step="-1" aria-label="Předchozí fotografie">←</button><div aria-live="polite" aria-atomic="true"><span data-sheet-count></span><span data-sheet-caption></span></div><button data-sheet-step="1" aria-label="Další fotografie">→</button></div>';
  if(!withThumbs||photos.length<2)return controls;
  const thumbs=photos.map((key,i)=>'<button type="button" data-sheet-thumb="'+i+'" aria-label="Zobrazit snímek '+(i+1)+' – '+pictures[key]+'"><img src="assets/'+key+'-thumb.webp" width="144" height="90" alt="" decoding="async"></button>').join('');
  return controls+'<div class="room-thumbs" role="group" aria-label="Miniatury fotografií">'+thumbs+'</div>';
}
function renderSheet(index){
  const photos=activeSheet.photos;
  sheetPhoto=(index+photos.length)%photos.length;
  const key=photos[sheetPhoto],caption=pictures[key]||'Snímek z nabídkové galerie bytu '+currentUnit.id;
  const image=el('[data-sheet-image]');
  setPhoto(image,key,'(max-width:700px) 96vw, 880px');image.alt=caption;
  if(el('[data-sheet-full]'))el('[data-sheet-full]').href=imagePath(key);
  if(el('[data-enlarge]'))el('[data-enlarge]').setAttribute('aria-label','Zvětšit fotografii – '+caption);
  el('[data-sheet-count]').textContent=String(sheetPhoto+1).padStart(2,'0')+' / '+String(photos.length).padStart(2,'0');
  el('[data-sheet-caption]').textContent=caption;
  all('[data-sheet-step]').forEach(button=>{button.hidden=photos.length<2;});
  all('[data-sheet-thumb]').forEach(btn=>btn.setAttribute('aria-pressed',String(Number(btn.dataset.sheetThumb)===sheetPhoto)));
}
function unitDialog(id, tabKey, index=0) {
  const unit = lookup(id);
  if (!unit) return;
  currentUnit = unit;
  gallery = [];
  const options = tabs(unit);
  const tab = options.find((option) => option.key === tabKey) || options[0];
  activeSheet=tab;unitTab=tab.key;
  const fields = [['Podlaží',unit.floor],['Podlahová plocha',unit.area+' m²'],['Lodžie / terasa',unit.outdoor],['Cena bytu',unit.price],['Parkování',unit.park],['PENB','C']];
  const alternative = {'1.1':'3 (4) + kk','3.1':'4 (5) + kk','4.1':'5 (6) + kk'}[id];
  const note = !tab.photos&&alternative?'Výkres uvádí variantní dispozici '+alternative+'. Přehled bytů používá prodejní označení '+unit.layout+'.':'';
  const detailTitle=tab.label+' · byt '+id;
  const visual=tab.photos?'<img data-sheet-image alt="">':'<img src="'+imagePath(unitTab)+'" alt="'+detailTitle+'">';
  show('<article class="unit-detail"><p class="kicker"><i></i>Nad Sokolovnou 3 / Byt '+id+'</p><h2 id="dialog-title">'+unit.layout+' · '+unit.area+' m²</h2><div class="detail-tabs" role="group" aria-label="Podklady bytu">'+options.map((item)=>'<button data-tab="'+item.key+'" aria-pressed="'+(item.key===unitTab)+'">'+item.label+'</button>').join('')+'</div><button class="detail-picture '+(tab.photos?'photo-tab':'')+'" data-enlarge aria-label="Zvětšit obrázek — '+detailTitle+'">'+visual+'<i class="zoombadge">'+icon('expand')+'</i></button>'+(tab.photos?photoControls(tab.photos,true):'')+(note?'<p class="detail-floor-note">'+note+'</p>':'')+'<dl class="detail-facts">'+fields.map(([key,val])=>'<div><dt>'+key+'</dt><dd>'+val+'</dd></div>').join('')+'</dl>'+(unit.sold?'<a class="btn dark" href="#byty" data-leave>Další byty v domě</a>':'<a class="btn dark" href="'+unit.mail+'">Domluvit prohlídku bytu '+unit.id+' '+icon('up')+'</a>')+'</article>');
  if(tab.photos)renderSheet(index);
}
function enlargeUnit() {
  const u=currentUnit,tab=activeSheet;
  const label=tab.label+' · byt '+u.id;
  const visual=tab.photos?'<img data-sheet-image alt="">':'<img src="'+imagePath(unitTab)+'" alt="'+label+'">';
  show('<figure class="full-visual '+(tab.photos?'room-full':'planview')+'">'+visual+'<figcaption><h2 id="dialog-title">'+label+'</h2>'+(tab.photos?photoControls(tab.photos,false):'')+'<button data-back>Zpět k bytu '+u.id+'</button><a data-sheet-full href="'+imagePath(unitTab)+'" target="_blank" rel="noopener">Plná velikost ↗</a></figcaption></figure>');
  if(tab.photos)renderSheet(sheetPhoto);
  el('[data-back]').focus({preventScroll:true});
}
function showGallery(index) {
  photoIndex = (index + gallery.length) % gallery.length;
  const key = gallery[photoIndex];
  show('<figure class="full-visual"><img src="'+imagePath(key)+'" alt="'+pictures[key]+'"><figcaption><h2 id="dialog-title">'+pictures[key]+'</h2><div class="gallery-controls"><button data-gallery-step="-1" aria-label="Předchozí snímek">← Zpět</button><span>'+String(photoIndex+1).padStart(2,'0')+' / '+String(gallery.length).padStart(2,'0')+'</span><button data-gallery-step="1" aria-label="Další snímek">Další →</button></div></figcaption></figure>');
}
document.addEventListener('click',(event)=>{
  const target=event.target.closest('button, a');
  if(!target) return;
  if(target.matches('[data-unit]')) unitDialog(target.dataset.unit,target.dataset.plan);
  if(target.matches('[data-tab]')) {unitDialog(currentUnit.id,target.dataset.tab);el('[data-tab][aria-pressed="true"]').focus({preventScroll:true});}
  if(target.matches('[data-sheet-step]'))renderSheet(sheetPhoto+Number(target.dataset.sheetStep));
  if(target.matches('[data-sheet-thumb]'))renderSheet(Number(target.dataset.sheetThumb));
  if(target.matches('[data-enlarge]')) enlargeUnit();
  if(target.matches('[data-back]')) {unitDialog(currentUnit.id,unitTab,sheetPhoto);el('[data-enlarge]').focus({preventScroll:true});}
  if(target.matches('.dlg-close,[data-leave]')) dialog.close();
  if(target.matches('[data-gallery]')) {
    gallery=all('[data-gallery]').map((item)=>item.dataset.gallery);
    showGallery(gallery.indexOf(target.dataset.gallery));
  }
  if(target.matches('[data-gallery-step]')) {showGallery(photoIndex+Number(target.dataset.galleryStep));el('[data-gallery-step="'+target.dataset.galleryStep+'"]').focus({preventScroll:true});}
  if(target.matches('[data-filter]')) {
    all('[data-filter]').forEach((button)=>button.setAttribute('aria-pressed',String(button===target)));
    all('[data-sold]').forEach((row)=>{row.hidden=target.dataset.filter==='available' && row.dataset.sold==='true';});
  }
});
dialog.addEventListener('close',()=>{document.body.classList.remove('has-dialog');gallery=[];});
dialog.addEventListener('click',(event)=>{
  if(event.target!==dialog) return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) dialog.close();
});
document.addEventListener('keydown',(event)=>{
  if(dialog.open && el('[data-sheet-image]') && ['ArrowLeft','ArrowRight'].includes(event.key)){
    event.preventDefault();renderSheet(sheetPhoto+(event.key==='ArrowRight'?1:-1));
  }else if(dialog.open && gallery.length && ['ArrowLeft','ArrowRight'].includes(event.key)) {
    event.preventDefault(); showGallery(photoIndex + (event.key==='ArrowRight'?1:-1));el('.dlg-close').focus({preventScroll:true});
  }
});
const menu=el('.menubtn');
function closeMenu() {
  menu.setAttribute('aria-expanded','false'); menu.setAttribute('aria-label','Otevřít navigaci'); el('.mainnav').classList.remove('open');
}
menu.addEventListener('click',()=>{
  if(menu.getAttribute('aria-expanded')==='true') {closeMenu();return;}
  menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Zavřít navigaci');el('.mainnav').classList.add('open');
});
document.addEventListener('click',(event)=>{if(!menu.contains(event.target)) closeMenu();});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape' && menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});

function openLinkedPhotos(){
  const match=location.hash.match(/^#byt-([1-4])-([12])-foto$/);
  const unit=match&&lookup(match[1]+'.'+match[2]);
  if(unit){
    el('#byty').scrollIntoView({behavior:'instant'});
    unitDialog(unit.id,unit.image);
  }
}
openLinkedPhotos();
window.addEventListener('hashchange',openLinkedPhotos);
dialog.addEventListener('close',()=>{
  if(location.hash.match(/^#byt-[1-4]-[12]-foto$/))history.replaceState(null,'','#byty');
});
let swipeOrigin=null, ignorePhotoClickUntil=0;
dialog.addEventListener('pointerdown',event=>{
  if(event.pointerType==='touch'&&event.isPrimary&&event.target.matches('[data-sheet-image]')){
    swipeOrigin={id:event.pointerId,x:event.clientX,y:event.clientY};
  }
});
dialog.addEventListener('pointercancel',()=>{swipeOrigin=null;});
dialog.addEventListener('pointerup',event=>{
  if(!swipeOrigin||event.pointerId!==swipeOrigin.id)return;
  const dx=event.clientX-swipeOrigin.x,dy=event.clientY-swipeOrigin.y;
  swipeOrigin=null;
  if(Math.abs(dx)<42||Math.abs(dx)<Math.abs(dy)*1.4||!activeSheet?.photos)return;
  renderSheet(sheetPhoto+(dx<0?1:-1));
  ignorePhotoClickUntil=performance.now()+400;
});
dialog.addEventListener('click',event=>{
  if(performance.now()<ignorePhotoClickUntil&&event.target.closest('[data-enlarge]')){
    event.preventDefault();event.stopPropagation();
  }
},true);
