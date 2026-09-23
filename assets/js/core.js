// Общие помощники: выборки, форматирование, навигация, прогресс, появление блоков и движок скроллителлинга.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isNarrow = () => matchMedia('(max-width: 900px)').matches;
const nf = new Intl.NumberFormat('ru-RU');
export const fmt = (n) => nf.format(n).replace(/ /g, ' ');

export function progressBar() {
  const bar = $('#progress');
  if (!bar) return;
  let raf = 0;
  const upd = () => {
    raf = 0;
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? clamp(scrollY / h, 0, 1) : 0})`;
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
  upd();
}

// Подсветка пункта меню и точек рейки по разделу, который сейчас в середине экрана.
const NAV_OF = { top: null, problem: 'problem', cost: 'problem', insight: 'problem', device: 'device', scenario: 'scenario', outcome: 'scenario',
  demo: 'demo', tech: 'tech', price: 'price', launch: 'launch', faq: 'launch', sources: 'sources' };
export function navigation() {
  const nav = $('#nav'), rail = $('#rail');
  const marks = $$('[data-rail]');
  if (rail) rail.innerHTML = marks.map(m => `<a href="#${m.id}" aria-label="${m.dataset.rail}"><span>${m.dataset.rail}</span></a>`).join('');
  const sections = $$('main > section[id]');
  let active = '';
  const setActive = (id) => {
    if (id === active) return; active = id;
    const navId = NAV_OF[id];
    $$('a', nav).forEach(a => a.classList.toggle('on', navId && a.getAttribute('href') === '#' + navId));
    if (rail) {
      let railId = id;
      if (!marks.some(m => m.id === id)) { // шаги без своей точки подсвечивают ближайшую главу выше
        const idx = sections.findIndex(s => s.id === id);
        for (let k = idx; k >= 0; k--) if (marks.some(m => m.id === sections[k].id)) { railId = sections[k].id; break; }
      }
      $$('a', rail).forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + railId));
    }
    const on = nav && $('a.on', nav);
    if (on && isNarrow()) nav.scrollTo({ left: on.offsetLeft - 20, behavior: 'smooth' });
  };
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) setActive(e.target.id || e.target.closest('section[id]')?.id);
  }, { rootMargin: '-45% 0px -54% 0px' });
  sections.forEach(s => io.observe(s));
  // сцены скроллителлинга без id относятся к главе-открывашке перед ними
  $$('main > section.scrolly').forEach(s => {
    let p = s.previousElementSibling; while (p && !p.id) p = p.previousElementSibling;
    if (p) { s.dataset.parent = p.id; new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) setActive(p.id); }, { rootMargin: '-45% 0px -54% 0px' }).observe(s); }
  });
}

export function reveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
}

// Шаг активен, когда пересекает «линию чтения»: середина экрана на десктопе, нижняя треть на телефоне (там сцена сверху).
export function scrolly(section, onStep) {
  const steps = $$('.step', section);
  let cur = -1;
  const set = (i) => {
    if (i < 0 || i === cur) return;
    cur = i;
    steps.forEach((s, k) => s.classList.toggle('on', k === i));
    onStep(i, steps[i]);
  };
  let io;
  const build = () => {
    io?.disconnect();
    const margin = isNarrow() ? '-72% 0px -26% 0px' : '-48% 0px -50% 0px';
    io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) set(steps.indexOf(e.target)); }, { rootMargin: margin });
    steps.forEach(s => io.observe(s));
  };
  build();
  matchMedia('(max-width: 900px)').addEventListener('change', build);
  set(0);
  return { get current() { return cur; }, set };
}

export function onVisible(el, cb, margin = '200px') {
  const io = new IntersectionObserver((es) => { for (const e of es) cb(e.isIntersecting, e); }, { rootMargin: margin });
  io.observe(el);
  return io;
}
