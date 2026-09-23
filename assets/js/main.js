// Точка входа: навигация, главы, сценарий, интерактив, цена и ленивая загрузка 3D-модели.
import { $, $$, progressBar, navigation, reveal, scrolly, onVisible, reducedMotion } from './core.js';
import { initChapters, initPrice } from './viz.js';
import { initScenario } from './scenario.js';
import { initDemo } from './demo.js';

const safe = (name, fn) => { try { fn(); } catch (e) { console.error(name, e); } };
safe('progress', progressBar);
safe('nav', navigation);
safe('reveal', reveal);
safe('chapters', initChapters);
safe('scenario', initScenario);
safe('demo', initDemo);
safe('price', initPrice);

// ---------- герой: режимы и 3D
const heroEl = $('#hero3d'), devEl = $('#dev3d');
const ORDER = ['play', 'life', 'focus'];
const HERO_POSTERS = { play: 'assets/img/flow-hero.png', life: 'assets/img/flow-back-life.png', focus: 'assets/img/flow-back-focus.png' };
let hero3d = null, dev3d = null, heroMode = 'play', auto = !reducedMotion(), resume = 0;
function setHeroMode(m, byUser = false) {
  heroMode = m;
  heroEl?.style.setProperty('--mode', `var(--${m})`);
  $$('#heroModes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  if (hero3d) hero3d.setMode(m);
  else { const img = heroEl?.querySelector('.poster'); if (img) img.src = HERO_POSTERS[m]; } // без WebGL меняем постер
  if (byUser) { auto = false; clearTimeout(resume); resume = setTimeout(() => { auto = !reducedMotion(); }, 15000); }
}
$$('#heroModes button').forEach(b => b.addEventListener('click', () => setHeroMode(b.dataset.mode, true)));
setInterval(() => { if (auto && !document.hidden && scrollY < innerHeight) setHeroMode(ORDER[(ORDER.indexOf(heroMode) + 1) % 3]); }, 3600);

// ---------- решение: шаги двигают модель; без WebGL остаются постеры
const POSTERS = ['assets/img/flow-side.png', 'assets/img/flow-front.png', 'assets/img/flow-xray.png', 'assets/img/flow-game.png'];
let devStep = 0;
const devSection = document.querySelector('[data-scrolly="dev"]');
if (devSection) scrolly(devSection, (i) => {
  devStep = i;
  if (dev3d) dev3d.setStep(i);
  else { const img = devEl?.querySelector('.poster'); if (img) { img.style.display = ''; img.src = POSTERS[i]; } }
  devEl?.style.setProperty('--mode', `var(--${['play', 'focus', 'focus', 'play'][i]})`);
});

window.__flow = { hero: () => hero3d, dev: () => dev3d }; // доступ для автопроверки сцен
const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
if (webgl && heroEl) {
  let mod = null;
  const load = () => (mod ??= import('./phone3d.js'));
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 250));
  idle(async () => {
    try {
      const m = await load();
      hero3d = await m.mount(heroEl, { variant: 'hero', mode: heroMode });
    } catch (e) { console.warn('3D недоступно, остаётся постер', e); }
  });
  let devMounting = null;
  if (devEl) onVisible(devEl, (v) => {
    if (!v || devMounting) return;
    devMounting = (async () => {
      const m = await load();
      dev3d = await m.mount(devEl, { variant: 'device', pose: 'side', mode: 'play' });
      dev3d.setStep(devStep);
    })().catch((e) => console.warn('3D недоступно, остаются постеры', e));
  }, '800px');
}
