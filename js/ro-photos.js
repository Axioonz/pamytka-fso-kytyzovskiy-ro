/* RO FSO. Decorative photographs. Does not alter navigation or reference materials. */
(() => {
  'use strict';
  const folder = './assets/ro/';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const groups = [
    {selector:'#page-home .hero', name:'hero', photos:['kremlin-panorama.webp','hero-autumn.webp','moscow-evening.webp','moscow-skyline.webp','st-basil.webp']},
    {selector:'#page-territories > .section-head', name:'section', photos:['kremlin-tower-autumn.webp','government-house.webp','spasskaya-tower.webp']},
    {selector:'#page-convoys > .section-head', name:'section', photos:['motorcade.webp']},
    {selector:'#page-departments > .section-head', name:'section', photos:['fso-officer.webp']}
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
  function init() {
    groups.forEach(async group => {
      const host = document.querySelector(group.selector);
      if (!host) return;
      const results = await Promise.all(group.photos.map(preload));
      createGallery(group, results.filter(Boolean));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();