/* RO FSO. Decorative photographs. Does not alter navigation or reference materials. */
(() => {
  'use strict';
  const folder = './assets/ro/';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const groups = [
    {selector:'#page-home .hero', name:'hero', photos:['kremlin-panorama.webp']},
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
  function preload(file) {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(folder + file);
      image.onerror = () => resolve(null);
      image.src = folder + file;
    });
  }
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
      if (i > 0) img.loading = 'lazy';
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
    groups.forEach(async group => {
      const host = document.querySelector(group.selector);
      if (!host) return;
      const results = await Promise.all(group.photos.map(preload));
      createGallery(group, results.filter(Boolean));
    });
    accents.forEach(async group => {
      if (!document.querySelector(group.selector)) return;
      const url = await preload(group.photo);
      if (url) createAccent(group, url);
    });
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
 const heading=copy.querySelector('h1');if(heading){heading.replaceChildren(document.createTextNode('Всё для службы.'),document.createElement('br'),make('span','lx-gradient','В одном месте.'))}
 const desc=copy.querySelector('p');if(desc)desc.textContent='Памятка сотрудника ФСО. Законодательство, правовые основания, служебные материалы и личная шпаргалка.';
 const actions=make('div','lx-hero-actions');const lawCTA=mkButton('lx-primary','Открыть законодательство',()=>jump('laws'),'arrow');const serviceCTA=mkButton('lx-secondary','Материалы службы',()=>jump('territories'));actions.append(lawCTA,serviceCTA);copy.append(actions);
 const panel=make('div','lx-live-panel');const top=make('div','lx-live-top'),title=make('span');title.append(icon('book'),document.createTextNode('Правовая база'));top.append(title,make('small',null,'Памятка ФСО'));panel.append(top);
 const searchBox=home.querySelector('.smart-search-box');const searchTitle=home.querySelector('.smart-search-title');if(searchTitle)panel.append(searchTitle);if(searchBox)panel.append(searchBox); const hints=home.querySelector('.smart-search-hints'),results=home.querySelector('#homeSmartResults');if(hints)panel.append(hints);if(results)panel.append(results);
 const lawLabel=make('div','lx-law-label','ОСНОВНЫЕ ДОКУМЕНТЫ');const rows=make('div','lx-law-list');panel.append(lawLabel,rows);
 const photo=make('div','lx-hero-photo');const panorama=make('img');panorama.src='./assets/ro/kremlin-panorama.webp';panorama.alt='Панорама Московского Кремля';panorama.decoding='async';panorama.fetchPriority='high';photo.append(panorama);copy.prepend(photo);
 const foot=make('div','lx-live-bottom');const allLaws=mkButton('lx-text-link','Все документы',()=>jump('laws'),'arrow');foot.append(allLaws);panel.append(foot);hero.append(panel);hero.classList.add('lx-ready');
 const catalogHead=make('div','lx-directory-head'),headText=make('div');headText.append(make('h2',null,'Разделы памятки'));catalogHead.append(headText,mkButton('lx-text-link','Поиск по памятке',()=>document.getElementById('homeSmartSearch')?.focus()));
 const directory=make('div','lx-directory');const core=home.querySelector('.core-grid'),homeBlock=home.querySelector('.home-block');if(core){core.before(catalogHead,directory);const h=make('div','lx-directory-head');h.append(make('h2',null,'Основные материалы'));core.before(h)}else{home.append(catalogHead,directory)}
 const cards=[['laws','Законодательство','Кодексы, законы и нормативные документы.','book','moscow-skyline.webp'],['basis','Правовой справочник','Справочные карточки и связанные нормы.','shield','government-house.webp'],['territories','Гос. территории','Территории и материалы раздела.','map','spasskaya-tower.webp'],['convoys','Кортежи','Существующие материалы раздела.','car','motorcade.webp'],['departments','Подразделения','Памятки и материалы подразделений.','grid','fso-officer.webp'],['cheats','Личная шпаргалка','Сохранённые материалы и заметки.','bookmark',null],['process','Задержание и права','Справочные материалы и нормативная база.','layers','kremlin-tower-autumn.webp'],['terms','Понятия','Служебные и юридические понятия.','info','st-basil.webp'],['codes','Коды','Справочные материалы раздела.','doc','moscow-evening.webp'],['uk-memos','Памятки УК','Материалы управления кадров.','grid','hero-autumn.webp']];
 const docKeys=[['pk','Кодекс · ПК'],['uk','Кодекс · УК'],['koap','Кодекс · КоАП'],['fso','Федеральный закон · ФЗ ФСО']];
 let last='';function sync(){
  const keys=cards.filter(c=>isAvailable(sourceNav(c[0]))).map(c=>c[0]);const stamp=keys.join('|');
  lawCTA.hidden=!keys.includes('laws');serviceCTA.hidden=!keys.includes('territories');allLaws.hidden=!keys.includes('laws');
  if(stamp===last&&directory.children.length)return;last=stamp;directory.replaceChildren();rows.replaceChildren();
  for(const c of cards){const [key,label,detail,ico,img]=c;if(!keys.includes(key))continue;const b=mkButton('lx-directory-card'+(key==='laws'?' lx-featured':''),'',()=>jump(key));b.dataset.lxPage=key;if(img){b.classList.add('lx-has-photo');const photo=make('img','lx-card-photo');photo.src='./assets/ro/'+img;photo.alt='';photo.loading='lazy';b.append(photo)}const symbol=make('span','lx-card-symbol');symbol.append(icon(ico));b.append(symbol,make('strong',null,label),make('small',null,detail),icon('ne'));directory.append(b)}
  if(keys.includes('laws'))for(const [key,tag] of docKeys){const doc=document.querySelector('#page-laws .doc-btn[data-doc="'+key+'"]');if(!doc||doc.hidden||doc.disabled||doc.closest('[hidden]'))continue;const row=mkButton('lx-law-item','',()=>{if(!isAvailable(sourceNav('laws')))return;jump('laws');if(isAvailable(doc))doc.click()});const symbol=make('span','lx-law-symbol');symbol.append(icon('doc'));const text=make('span');text.append(make('strong',null,doc.textContent.trim()),make('small',null,tag));row.append(symbol,text,icon('arrow'));rows.append(row)}
  lawLabel.hidden=!rows.children.length;
 }
 sync();new MutationObserver(sync).observe(nav,{subtree:true,attributes:true,childList:true,attributeFilter:['class','style','hidden','disabled']});new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&!document.body.classList.contains('access-pending')&&isAvailable(sourceNav('home'))){event.preventDefault();jump('home');document.getElementById('homeSmartSearch')?.focus()}});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
