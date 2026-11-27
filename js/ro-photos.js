/* RO FSO. Decorative photographs. Does not alter navigation or reference materials. */
(() => {
  'use strict';
  const folder = './assets/ro/';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const groups = [
    {selector:'#page-territories > .section-head', name:'section', photos:['spasskaya-tower.webp']},
    {selector:'#page-convoys > .section-head', name:'section', photos:['motorcade.webp']},
    {selector:'#page-departments > .section-head', name:'section', photos:['fso-officer.webp']}
  ];
  // Compact photo accents outside reference text and search controls.
  const accents = [
    {selector:'#page-basis > .page-title-row', layout:'split', photo:'government-house.webp'},
    {selector:'#page-situations #localScenarios > .section-head', layout:'postcard', photo:'kremlin-tower-autumn.webp'},
    {selector:'#page-process > .section-head', layout:'split', photo:'fso-officer.webp'},
    {selector:'#page-terms > .section-head', layout:'postcard', photo:'st-basil.webp'},
    {selector:'#page-codes > .section-head', layout:'ribbon', photo:'moscow-evening.webp'},
    {selector:'#page-cheats > .section-head', layout:'postcard', photo:'hero-autumn.webp'},
    {selector:'#page-laws > .section-head', layout:'split', photo:'moscow-skyline.webp'}
  ];
  function createGallery(group, urls) {
    if (!urls.length) return;
    const host = document.querySelector(group.selector);
    if (!host || host.classList.contains('ro-photo-host')) return;
    host.classList.add('ro-photo-host', group.name === 'hero' ? 'ro-photo-hero' : 'ro-photo-section');
    const media = document.createElement('div');
    media.className = 'ro-photo-media';
    media.setAttribute('aria-hidden', 'true');
    urls.forEach((url, i) => {
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.decoding = 'async';
      img.className = i === 0 ? 'is-current' : '';
      img.loading = 'lazy';
      media.appendChild(img);
    });
    host.insertBefore(media, host.firstChild);
    if (urls.length < 2) return;
    let active = 0;
    let paused = false;
    const dots = document.createElement('div');
    dots.className = 'ro-photo-dots';
    const buttons = urls.map((url, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = i === 0 ? 'is-current' : '';
      b.setAttribute('aria-label', 'Фотография ' + (i + 1) + ' из ' + urls.length);
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      dots.appendChild(b);
      return b;
    });
    host.appendChild(dots);
    const images = [...media.children];
    function select(index) {
      active = (index + images.length) % images.length;
      images.forEach((img, i) => img.classList.toggle('is-current', i === active));
      buttons.forEach((button, i) => {
        button.classList.toggle('is-current', i === active);
        button.setAttribute('aria-pressed', i === active ? 'true' : 'false');
      });
    }
    buttons.forEach((b, i) => b.addEventListener('click', () => select(i)));
    host.addEventListener('mouseenter', () => { paused = true; });
    host.addEventListener('mouseleave', () => { paused = false; });
    host.addEventListener('focusin', () => { paused = true; });
    host.addEventListener('focusout', () => { paused = false; });
    window.setInterval(() => {
      if (!paused && !document.hidden && !reduced.matches && host.getClientRects().length) select(active + 1);
    }, 8500);
  }
  function createAccent(group, url) {
    const host = document.querySelector(group.selector);
    if (!host || host.classList.contains('ro-accent-header')) return;
    const photo = document.createElement('div');
    photo.className = 'ro-photo-accent';
    photo.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    photo.appendChild(img);
    host.classList.add('ro-accent-header', 'ro-accent-' + group.layout);
    host.appendChild(photo);
  }
  function init() {
    // Create the layout immediately; native lazy loading defers hidden sections.
    groups.forEach(group => createGallery(group, group.photos.map(file => folder + file)));
    accents.forEach(group => createAccent(group, folder + group.photo));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
;
/* Only presentation. Uses existing navigation and document buttons, never creates a session. */
(()=>{'use strict';
 const init=()=>{
 const html=document.documentElement;html.classList.add('lx-redesign');
 const home=document.getElementById('page-home'),hero=home?.querySelector('.hero'),copy=hero?.querySelector('.hero-center'),nav=document.getElementById('mainNav');
 if(!hero||!copy||!nav||hero.classList.contains('lx-ready'))return;
 const paths={shield:'<path d="M12 3l8 3v6c0 4.6-3 7.5-8 10-5-2.5-8-5.4-8-10V6z"/><path d="M8 12l3 3 5-6"/>',book:'<path d="M12 6c-3-2-6-3-10-2v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-4-1-7 0-10 2zM12 6v15"/>',doc:'<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',ne:'<path d="M6 18 18 6M8 6h10v10"/>',map:'<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',layers:'<path d="M12 3 2 8l10 5 10-5zM2 12l10 5 10-5M2 16l10 5 10-5"/>',car:'<path d="M3 16V10l3-6h12l3 6v6H3zM5 16v3m14-3v3M3 10h18M6 13h2m8 0h2"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>'};
 const icon=name=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('class','lx-icon');s.setAttribute('aria-hidden','true');s.innerHTML=paths[name]||paths.doc;return s};
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e};
 const isAvailable=e=>!!e&&!e.hidden&&!e.disabled&&!e.closest('[hidden]')&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
 const sourceNav=key=>nav.querySelector('button[data-page="'+key+'"]');
 const jump=key=>{const e=sourceNav(key);if(isAvailable(e)&&!document.body.classList.contains('access-pending'))e.click()};
 const mkButton=(cls,text,action,ico)=>{const b=make('button',cls,text);b.type='button';if(ico)b.append(icon(ico));b.addEventListener('click',action);return b};
 const brand=document.querySelector('.topbar .brand');if(brand&&!brand.querySelector('.lx-mark')){const mark=make('span','lx-mark');mark.append(icon('shield'));brand.prepend(mark)}
 // Keep the original heading from index.html.
 const desc=copy.querySelector('p');if(desc)desc.textContent='Памятка сотрудника ФСО. Законодательство, правовые основания, служебные материалы и личная шпаргалка.';
 const actions=make('div','lx-hero-actions');const lawCTA=mkButton('lx-primary','Открыть законодательство',()=>jump('laws'),'arrow');const serviceCTA=mkButton('lx-secondary','Материалы службы',()=>jump('territories'));actions.append(lawCTA,serviceCTA);copy.append(actions);
 const panel=make('div','lx-live-panel');const top=make('div','lx-live-top'),title=make('span');title.append(icon('book'),document.createTextNode('Правовая база'));top.append(title,make('small',null,'Памятка ФСО'));panel.append(top);
 const searchBox=home.querySelector('.smart-search-box');const searchTitle=home.querySelector('.smart-search-title');if(searchTitle)panel.append(searchTitle);if(searchBox)panel.append(searchBox); const hints=home.querySelector('.smart-search-hints'),results=home.querySelector('#homeSmartResults');if(hints)panel.append(hints);if(results)panel.append(results);
 const lawLabel=make('div','lx-law-label','ОСНОВНЫЕ ДОКУМЕНТЫ');const rows=make('div','lx-law-list');panel.append(lawLabel,rows);

 const foot=make('div','lx-live-bottom');const allLaws=mkButton('lx-text-link','Все документы',()=>jump('laws'),'arrow');foot.append(allLaws);panel.append(foot);hero.append(panel);hero.classList.add('lx-ready');
 const catalogHead=make('div','lx-directory-head'),headText=make('div');headText.append(make('h2',null,'Разделы памятки'));catalogHead.append(headText,mkButton('lx-text-link','Поиск по памятке',()=>document.getElementById('homeSmartSearch')?.focus()));
 const directory=make('div','lx-directory');const core=home.querySelector('.core-grid'),homeBlock=home.querySelector('.home-block');if(core){core.before(catalogHead,directory);const h=make('div','lx-directory-head');h.append(make('h2',null,'Основные материалы'));core.before(h)}else{home.append(catalogHead,directory)}
 const cards=[['laws','Законодательство','Кодексы, законы и нормативные документы.','book','moscow-skyline.webp'],['basis','Правовой справочник','Справочные карточки и связанные нормы.','shield','government-house.webp'],['territories','Гос. территории','Территории и материалы раздела.','map','spasskaya-tower.webp'],['convoys','Кортежи','Существующие материалы раздела.','car','motorcade.webp'],['departments','Подразделения','Памятки и материалы подразделений.','grid','fso-officer.webp'],['cheats','Личная шпаргалка','Сохранённые материалы и заметки.','bookmark',null],['process','Задержание и права','Справочные материалы и нормативная база.','layers','kremlin-tower-autumn.webp'],['terms','Понятия','Служебные и юридические понятия.','info','st-basil.webp'],['codes','Коды','Справочные материалы раздела.','doc','moscow-evening.webp'],['uk-memos','Памятки УК','Материалы управления кадров.','grid','hero-autumn.webp']];
 const docKeys=[['pk','Кодекс · ПК'],['uk','Кодекс · УК'],['koap','Кодекс · КоАП'],['fso','Федеральный закон · ФЗ ФСО']];
 let last='';function sync(){
  const keys=cards.filter(c=>isAvailable(sourceNav(c[0]))).map(c=>c[0]);const stamp=keys.join('|');
  lawCTA.hidden=!keys.includes('laws');serviceCTA.hidden=!keys.includes('territories');allLaws.hidden=!keys.includes('laws');
  if(stamp===last&&directory.children.length)return;last=stamp;directory.replaceChildren();rows.replaceChildren();
  for(const c of cards){const [key,label,detail,ico,img]=c;if(!keys.includes(key))continue;const b=mkButton('lx-directory-card'+(key==='laws'?' lx-featured':''),'',()=>jump(key));b.dataset.lxPage=key;if(img){b.classList.add('lx-has-photo');const photo=make('img','lx-card-photo');photo.src='./assets/ro/'+img;photo.alt='';photo.loading='lazy';photo.decoding='async';b.append(photo)}const symbol=make('span','lx-card-symbol');symbol.append(icon(ico));b.append(symbol,make('strong',null,label),make('small',null,detail),icon('ne'));directory.append(b)}
  if(keys.includes('laws'))for(const [key,tag] of docKeys){const doc=document.querySelector('#page-laws .doc-btn[data-doc="'+key+'"]');if(!doc||doc.hidden||doc.disabled||doc.closest('[hidden]'))continue;const row=mkButton('lx-law-item','',()=>{if(!isAvailable(sourceNav('laws')))return;jump('laws');if(isAvailable(doc))doc.click()});const symbol=make('span','lx-law-symbol');symbol.append(icon('doc'));const text=make('span');text.append(make('strong',null,doc.textContent.trim()),make('small',null,tag));row.append(symbol,text,icon('arrow'));rows.append(row)}
  lawLabel.hidden=!rows.children.length;
 }
 let syncFrame=0;const scheduleSync=()=>{if(!syncFrame)syncFrame=requestAnimationFrame(()=>{syncFrame=0;sync()})};
 sync();new MutationObserver(scheduleSync).observe(nav,{subtree:true,attributes:true,childList:true,attributeFilter:['class','style','hidden','disabled']});new MutationObserver(scheduleSync).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&!document.body.classList.contains('access-pending')&&isAvailable(sourceNav('home'))){event.preventDefault();jump('home');document.getElementById('homeSmartSearch')?.focus()}});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

/* Elastic navigation and bounded motion. Routing and permissions remain unchanged. */
(()=>{
 'use strict';
 function init(){
  const nav=document.getElementById('mainNav'),main=document.querySelector('main.wrap');
  if(!nav||!main||nav.querySelector('.lx-nav-glass'))return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact=window.matchMedia('(max-width:760px)');
  const motion=()=>!reduced.matches&&!document.hidden&&!document.body.classList.contains('access-pending');
  const ease='cubic-bezier(.22,.75,.24,1)';
  const pill=document.createElement('span');pill.className='lx-nav-glass';pill.setAttribute('aria-hidden','true');
  // Animate only transforms, not width/height on every frame.
  pill.style.setProperty('transition','none','important');pill.style.transformOrigin='left center';nav.prepend(pill);
  const buttons=()=>Array.from(nav.querySelectorAll('button[data-page]'));
  const activeButton=()=>nav.querySelector('button[data-page].active');
  let raf=0,lastBox=null,pillAnimation=null;
  const transform=(x,y,sx=1,sy=1)=>'translate3d('+x+'px,'+y+'px,0) scale('+sx+','+sy+')';
  function positionPill(){
   raf=0;
   const btn=activeButton();
   if(!btn||!btn.offsetWidth||!btn.offsetHeight||!nav.clientWidth||document.body.classList.contains('access-pending')){
    pillAnimation?.cancel();pillAnimation=null;lastBox=null;nav.classList.remove('lx-pill-ready','lx-pill-motion');return;
   }
   const box={btn,x:btn.offsetLeft,y:btn.offsetTop,w:btn.offsetWidth,h:btn.offsetHeight};
   if(lastBox&&['btn','x','y','w','h'].every(k=>box[k]===lastBox[k]))return;
   const old=lastBox?pill.getBoundingClientRect():null;
   const changed=lastBox&&lastBox.btn!==btn;
   pillAnimation?.cancel();pillAnimation=null;
   pill.style.width=box.w+'px';pill.style.height=box.h+'px';
   const end=transform(box.x,box.y);pill.style.transform=end;
   nav.classList.add('lx-pill-ready','lx-pill-motion');
   lastBox=box;
   if(!old||!changed||!motion()||typeof pill.animate!=='function')return;
   const target=pill.getBoundingClientRect();
   const dx=old.left-target.left,dy=old.top+old.height/2-target.top-target.height/2;
   const startX=box.x+dx, startY=box.y+dy;
   const ratio=Math.max(.35,Math.min(3,old.width/box.w));
   const dir=Math.sign(-dx)||1;
   const stretch=Math.min(.28,Math.abs(dx)/(box.w*5));
   // Leading edge pulls forward, the trailing edge catches up, then a small recoil.
   const pullX=box.x+dx*.34-(dir<0?box.w*stretch:0);
   pillAnimation=pill.animate([
    {transform:transform(startX,startY,ratio,old.height/box.h),offset:0},
    {transform:transform(pullX,box.y,1+stretch,.94),offset:.40},
    {transform:transform(box.x+dir*3,box.y,.98,1.015),offset:.78},
    {transform:end,offset:1}
   ],{duration:compact.matches?410:530,easing:ease,fill:'none'});
  }
  function schedulePill(){if(!raf)raf=requestAnimationFrame(positionPill)}
  const pages=Array.from(main.querySelectorAll(':scope > .page'));
  let previous=main.querySelector(':scope > .page.active'),previousButton=activeButton(),pageAnimation=null,headerAnimation=null;
  const cancelPage=()=>{pageAnimation?.cancel();headerAnimation?.cancel();pageAnimation=null;headerAnimation=null};
  const seen=new WeakSet(),observed=new Set();
  const revealSelector='.lx-directory-card,.core-card,.quick-actions > button,.basis-card,.term-card,.code-card,.territory-common-card,.territory-detail-card,.department-home-card,.uk-memo-library-card,.rule-card';
  const io='IntersectionObserver' in window?new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      const el=entry.target;io.unobserve(el);observed.delete(el);seen.add(el);
      if(!motion()||!el.closest('.page.active')||typeof el.animate!=='function'||pageAnimation?.playState==='running')continue;
      el.animate([{opacity:.88,translate:'0 6px'},{opacity:1,translate:'0 0'}],{duration:300,easing:ease,fill:'none'});
    }
  },{threshold:0,rootMargin:'0px 0px 24px 0px'}):null;
  let scanFrame=0,scanPage=null;
  function scan(page){
   scanPage=page;
   if(!scanFrame)scanFrame=requestAnimationFrame(()=>{
    scanFrame=0;
    const p=scanPage;
    if(!io||!p||!motion()||!p.classList.contains('active'))return;
    // Observe without a layout read per card; the browser batches visibility.
    for(const el of p.querySelectorAll(revealSelector)){
     if(seen.has(el)||observed.has(el))continue;
     observed.add(el);io.observe(el);
    }
   });
  }
  function onPage(){
   const next=main.querySelector(':scope > .page.active'),btn=activeButton();
   if(next&&next!==previous){
    const all=buttons(),before=all.indexOf(previousButton),after=all.indexOf(btn);
    const direction=before>=0&&after>=0&&before!==after?Math.sign(after-before):Math.sign(pages.indexOf(next)-pages.indexOf(previous))||1;
    cancelPage();
    if(motion()&&typeof next.animate==='function'&&previous){
     const distance=compact.matches?12:23;
     pageAnimation=next.animate([
      {opacity:.56,translate:(direction*distance)+'px 3px',offset:0},
      {opacity:.97,translate:(-direction*2)+'px 0',offset:.76},
      {opacity:1,translate:'0 0',offset:1}
     ],{duration:compact.matches?350:470,easing:ease,fill:'none'});
     // Blur only the small heading region: never rasterize a whole long law page.
     const header=next.querySelector(':scope > .hero .hero-center, :scope > .page-title-row, :scope > .section-head, :scope > .cheat-page-head');
     if(header&&header.getBoundingClientRect().height<350&&typeof header.animate==='function'){
      headerAnimation=header.animate([{filter:'blur(3px)'},{filter:'blur(0px)',offset:.72},{filter:'none'}],{duration:compact.matches?260:340,easing:ease,fill:'none'});
     }
    }
    for(const el of observed){if(!next.contains(el)){io?.unobserve(el);observed.delete(el)}}
    previous=next;
   }
   previousButton=btn;schedulePill();scan(next);
  }
  const pageObserver=new MutationObserver(onPage);
  pages.forEach(p=>pageObserver.observe(p,{attributes:true,attributeFilter:['class']}));
  new MutationObserver(schedulePill).observe(nav,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden','disabled']});
  new MutationObserver(()=>{schedulePill();scan(main.querySelector(':scope > .page.active'))}).observe(document.body,{attributes:true,attributeFilter:['class']});
  const directory=main.querySelector('.lx-directory');
  if(directory)new MutationObserver(()=>scan(main.querySelector(':scope > .page.active'))).observe(directory,{childList:true});
  if('ResizeObserver' in window){const ro=new ResizeObserver(schedulePill);ro.observe(nav);buttons().forEach(b=>ro.observe(b))}
  window.addEventListener('resize',schedulePill,{passive:true});
  reduced.addEventListener?.('change',()=>{if(reduced.matches){cancelPage();pillAnimation?.cancel();for(const el of observed)io?.unobserve(el);observed.clear()}else scan(main.querySelector(':scope > .page.active'))});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelPage();pillAnimation?.cancel()}else{schedulePill();scan(main.querySelector(':scope > .page.active'))}});
  document.fonts?.ready.then(schedulePill);
  onPage();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
