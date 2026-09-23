// Интерактив «Переключи тумблер»: поток входящих и правила режимов Шумодава в реальном времени.
import { $, $$, onVisible, reducedMotion } from './core.js';
import { createPhone, sb, modebar, ntf, MODES } from './phone.js';

const POOL = [
  { who: 'Мама', ic: 'М', c: '#ffd465', text: 'Позвони, как освободишься', kind: 'close', imp: true, w: 1 },
  { who: 'Лёша · проект', ic: 'Л', c: '#34d3c1', text: 'Добавил графики в главу 3, проверь', kind: 'study', imp: true, w: 1.1 },
  { who: 'Научрук', ic: 'АС', c: '#34d3c1', text: 'Жду черновик до 23:59', kind: 'study', imp: true, w: .5 },
  { who: 'Банк', ic: '₽', c: '#7fdcb9', text: 'Код для входа: 4821', kind: 'bank', imp: true, w: .5 },
  { who: 'Курьер', ic: 'К', c: '#9085e9', text: 'Буду через 10 минут, какой код домофона?', kind: 'close', imp: true, w: .5 },
  { who: 'Чат группы ПИ-31', ic: 'ПИ', c: '#9085e9', text: 'А лаба на завтра есть?', kind: 'group', imp: false, w: 2.6 },
  { who: 'Чат группы ПИ-31', ic: 'ПИ', c: '#9085e9', text: 'Скиньте кто-нибудь конспект', kind: 'group', imp: false, w: 2 },
  { who: 'Работа · SMM', ic: 'W', c: '#7fdcb9', text: 'Завтра пост в 12:00, ок?', kind: 'work', imp: false, w: 1.2 },
  { who: 'Друзья', ic: '🎮', c: '#f0b419', text: 'Катка в 22:30?', kind: 'friends', imp: false, w: 1.8 },
  { who: 'Друзья', ic: '🎮', c: '#f0b419', text: 'Смотри, какой мем 😂', kind: 'friends', imp: false, w: 2 },
  { who: 'Маркетплейс', ic: '%', c: '#ff8a6b', text: 'Скидки до 70% только до полуночи', kind: 'promo', imp: false, w: 2.3 },
  { who: 'Лента', ic: '▶', c: '#e87ba4', text: '12 новых видео для тебя', kind: 'feed', imp: false, w: 2.3 },
  { who: 'Игра', ic: '★', c: '#f0b419', text: 'Ежедневная награда ждёт!', kind: 'game', imp: false, w: 1.4 },
  { who: 'Доставка еды', ic: '%', c: '#ff8a6b', text: 'Промокод −30% на ужин', kind: 'promo', imp: false, w: 1.3 },
];
const TOTAL_W = POOL.reduce((a, p) => a + p.w, 0);
const pick = () => { let r = Math.random() * TOTAL_W; for (const p of POOL) { if ((r -= p.w) <= 0) return p; } return POOL[0]; };

// Правила режимов: show — как обычно, pass — Шумодав пропустил в режиме, quiet — тихий баннер в игре, hold — в сводку.
function route(m, mode) {
  if (mode === 'life') return 'show';
  if (mode === 'focus') return m.imp ? 'pass' : 'hold';
  if (m.kind === 'close' || m.kind === 'bank') return 'pass';
  return m.imp ? 'quiet' : 'hold';
}
const ST = { show: ['показано', 'show'], pass: ['пропущено Шумодавом', 'pass'], quiet: ['тихий баннер', 'pass'], hold: ['в сводку', 'hold'] };

export function initDemo() {
  const host = $('#demo-phone');
  if (!host) return;
  const log = $('#demo-log'), sw = $('#switcher');
  const s = { mode: 'life', t: 19 * 60, n: 0, shown: 0, held: [], lost: 0, recent: [], last: null, running: true, visible: false, digest: false };
  const phone = createPhone(host, { labels: false, interactive: true, onToggle: (m) => setMode(m) });
  const clock = () => `${String(Math.floor(s.t / 60) % 24).padStart(2, '0')}:${String(s.t % 60).padStart(2, '0')}`;
  const bat = () => Math.max(12, 64 - Math.floor(s.n / 3));

  const screen = () => {
    const t = clock();
    if (s.mode === 'life') {
      return `<div class="scr">${sb(t, bat())}<div class="clock">${t}</div>${modebar('life', 'всё как обычно')}
        <div class="stack" style="margin-top:5%">${s.recent.slice(0, 4).map(m => ntf({ ...m, tm: m.tm })).join('') || '<div class="more">пока тихо</div>'}
        ${s.recent.length > 4 ? `<div class="more">и ещё ${s.recent.length - 4}</div>` : ''}</div></div>`;
    }
    if (s.mode === 'focus') {
      const hot = s.last && s.last.route === 'pass' ? ntf({ ...s.last, cls: 'hot', tags: '<div class="tags"><span class="m">важное</span><span>пропущено Шумодавом</span></div>' }) : '';
      return `<div class="scr">${sb(t, bat())}${modebar('focus', 'до 22:00')}
        <div class="panel" style="margin-top:5%;text-align:center"><div style="font-size:.85em;color:var(--ink-2)">Шумодав держит</div>
          <div style="font-family:var(--display);font-size:2.6em;font-weight:700;letter-spacing:-.03em">${s.held.length}</div>
          <div style="font-size:.8em;color:var(--muted)">сообщений до перерыва</div></div>
        ${hot || '<div class="more" style="text-align:center;font-size:.72em;color:var(--muted)">важное появится здесь сразу</div>'}
        <div class="panel"><div class="row"><span>На паузе</span><b>ленты, игры, магазины</b></div><div class="row"><span>Друзьям</span><b>«В фокусе до 22:00»</b></div></div></div>`;
    }
    const ban = s.last && (s.last.route === 'pass' || s.last.route === 'quiet') ? ntf({ ...s.last, cls: s.last.route === 'pass' ? 'hot' : 'dim' }) : '';
    return `<div class="hud">${sb(t, bat())}<div class="modebar" style="margin-top:2%"><i></i>Игра · на полную</div>
      <div class="fps"><span>144 к/с</span><span>Q2 1.5K</span><span>звонят близкие</span></div>
      ${ban}<div class="arena">МАТЧ ИДЁТ</div>
      <div class="panel"><div class="row"><span>В сводке</span><b>${s.held.length}</b></div><div class="row"><span>Важное</span><b>тихим баннером</b></div></div></div>`;
  };
  const render = (fade = false) => { if (s.digest) return; fade ? phone.show(screen()) : phone.update(screen()); };

  const stats = () => {
    $('#st-in').textContent = s.n; $('#st-show').textContent = s.shown; $('#st-hold').textContent = s.held.length; $('#st-miss').textContent = s.lost;
  };
  const addLog = (html) => {
    const row = document.createElement('div'); row.className = 'it'; row.innerHTML = html;
    log.prepend(row);
    while (log.children.length > 9) log.lastChild.remove();
  };

  function setMode(m) {
    if (m === s.mode) return;
    s.mode = m; s.last = null; s.digest = false;
    phone.setMode(m);
    host.closest('.demo-phone').style.setProperty('--mode', MODES[m].color);
    $$('button', sw).forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === m)));
    addLog(`<span class="tm">${clock()}</span><span class="who"><b>Тумблер</b> <span>→ ${MODES[m].icon} ${MODES[m].name}</span></span><span class="st pass">щёлк</span>`);
    render(true);
  }

  function tick() {
    const m = pick();
    s.t += 1 + Math.floor(Math.random() * 3);
    s.n++;
    const r = route(m, s.mode);
    const item = { ...m, tm: clock(), route: r };
    if (r === 'hold') { s.held.push(item); if (m.imp) s.lost++; } else s.shown++;
    if (r !== 'hold') { s.recent.unshift(item); s.recent = s.recent.slice(0, 8); }
    s.last = r === 'hold' ? s.last : item;
    const [txt, cls] = ST[r];
    addLog(`<span class="tm">${item.tm}</span><span class="who"><b>${m.who}</b> <span>· ${m.text}</span></span><span class="st ${cls}">${txt}</span>`);
    stats(); render();
  }

  function showDigest() {
    const groups = {};
    s.held.forEach(m => { groups[m.who] = (groups[m.who] || 0) + 1; });
    const rows = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([w, n]) => `<div class="row"><span>${w}</span><b>${n}</b></div>`).join('') || '<p>Сводка пуста — всё уже показано.</p>';
    const imp = s.held.filter(m => m.imp).length;
    s.digest = true;
    phone.show(`<div class="scr">${sb(clock(), bat())}${modebar(s.mode, 'сводка')}
      <div class="panel" style="margin-top:5%"><h5><i></i>Сводка: ${s.held.length} сообщений</h5>${rows}</div>
      <div class="panel"><p>${imp ? `Важных: ${imp}` : 'Срочного нет: всё важное Шумодав уже показал.'}</p></div></div>`);
    addLog(`<span class="tm">${clock()}</span><span class="who"><b>Сводка</b> <span>· ${s.held.length} сообщений за 20 секунд</span></span><span class="st show">прочитано</span>`);
    s.held = []; stats();
    setTimeout(() => { s.digest = false; render(true); }, 4200);
  }

  let timer = 0;
  const loop = () => {
    clearTimeout(timer);
    if (s.running && s.visible && !document.hidden) tick();
    timer = setTimeout(loop, reducedMotion() ? 2600 : 1500);
  };

  $$('button', sw).forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  sw.addEventListener('keydown', (e) => {
    const order = ['play', 'life', 'focus'];
    const i = order.indexOf(s.mode);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setMode(order[(i + 1) % 3]); $(`[data-mode="${s.mode}"]`, sw).focus(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setMode(order[(i + 2) % 3]); $(`[data-mode="${s.mode}"]`, sw).focus(); }
  });
  $('#demo-pause').addEventListener('click', (e) => { s.running = !s.running; e.currentTarget.textContent = s.running ? 'Пауза' : 'Продолжить'; });
  $('#demo-reset').addEventListener('click', () => {
    Object.assign(s, { t: 19 * 60, n: 0, shown: 0, held: [], lost: 0, recent: [], last: null, digest: false });
    log.innerHTML = ''; stats(); render(true);
  });
  $('#demo-digest').addEventListener('click', showDigest);
  onVisible(host, (v) => { s.visible = v; }, '0px');

  host.closest('.demo-phone').style.setProperty('--mode', MODES.life.color);
  phone.setMode('life');
  phone.show(screen(), { instant: true });
  stats();
  loop();
}
