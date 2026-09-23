// 2D-телефон: корпус с тумблером на левой грани и экраны режимов. Используется в сценарии, интерактиве и презентации.
export const MODES = {
  play: { name: 'Игра', icon: '▲', color: 'var(--play)' },
  life: { name: 'Жизнь', icon: '●', color: 'var(--life)' },
  focus: { name: 'Фокус', icon: '▼', color: 'var(--focus)' },
};
const ORDER = ['play', 'life', 'focus'];

export function createPhone(host, { labels = true, interactive = false, onToggle } = {}) {
  host.innerHTML = `<div class="aura"></div>
    <div class="phone" data-mode="life">
      <div class="toggle"${interactive ? ' role="button" tabindex="0" aria-label="Тумблер на грани: переключить режим"' : ''}><b></b></div>
      ${labels ? '<div class="toggle-labels" aria-hidden="true"><span data-m="play">▲ Игра</span><span data-m="life">● Жизнь</span><span data-m="focus">▼ Фокус</span></div>' : ''}
      <div class="btn-side v"></div><div class="btn-side p"></div>
      <div class="screen"><div class="punch"></div></div>
    </div>`;
  const phone = host.querySelector('.phone');
  const screen = host.querySelector('.screen');
  let mode = 'life', current = null;
  const api = {
    el: phone,
    get mode() { return mode; },
    get layer() { return current; },
    setMode(m) {
      mode = m; phone.dataset.mode = m;
      host.style.setProperty('--mode', MODES[m].color);
      host.querySelectorAll('.toggle-labels span').forEach(s => s.classList.toggle('on', s.dataset.m === m));
    },
    // Новый экран ложится поверх старого и проявляется; старый остаётся со своими цветами и убирается после перехода.
    show(html, { instant = false, mode: m = mode } = {}) {
      const layer = document.createElement('div');
      layer.className = 'layer';
      layer.style.setProperty('--mode', MODES[m].color);
      layer.innerHTML = html;
      const old = [...screen.querySelectorAll('.layer')];
      current = layer;
      if (instant) { old.forEach(l => l.remove()); screen.appendChild(layer); return layer; }
      layer.classList.add('enter');
      screen.appendChild(layer);
      layer.getBoundingClientRect(); // фиксируем начальное состояние, чтобы сработал переход
      layer.classList.remove('enter');
      setTimeout(() => old.forEach(l => l.remove()), 320);
      return layer;
    },
    update(html) { if (current) current.innerHTML = html; return current; },
  };
  if (interactive) {
    const t = host.querySelector('.toggle');
    const cycle = (dir) => { const i = ORDER.indexOf(mode); const n = ORDER[(i + dir + 3) % 3]; onToggle?.(n); };
    t.addEventListener('click', (e) => { const r = t.getBoundingClientRect(); const y = (e.clientY - r.top) / r.height; onToggle?.(y < .34 ? 'play' : y > .66 ? 'focus' : 'life'); });
    t.addEventListener('keydown', (e) => { if (e.key === 'ArrowUp') { e.preventDefault(); cycle(-1); } if (e.key === 'ArrowDown') { e.preventDefault(); cycle(1); } if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(1); } });
  }
  api.setMode('life');
  return api;
}

// ---------- кусочки экрана
export const sb = (time, bat, low = false) =>
  `<div class="sb"><span class="sb-t">${time}</span><span class="bat${low ? ' low' : ''}"><span class="sb-b">${bat}</span>% <i style="--b:${bat}"></i></span></div>`;
export const modebar = (m, text) => `<div class="modebar"><i></i>${MODES[m].name}${text ? ' · ' + text : ''}</div>`;
export const ntf = ({ ic, c, who, text, tm = '', cls = '', tags = '' }) =>
  `<div class="ntf ${cls}"><div class="ic" style="--ic:${c}">${ic}</div><div class="tx"><b>${who}</b><span>${text}</span>${tags}</div><div class="tm">${tm}</div></div>`;
const tagline = (arr) => `<div class="tags">${arr.map(([t, m]) => `<span class="${m ? 'm' : ''}">${t}</span>`).join('')}</div>`;
const dock = (cap) => `<div class="dock"><div class="cap">${cap}</div><div class="apps">${[['▶', 'Лента'], ['🎬', 'Клипы'], ['🎮', 'Игры'], ['%', 'Магазин']]
  .map(([i, t]) => `<div class="app"><i>${i}</i>${t}</div>`).join('')}</div></div>`;
const replies = (arr) => `<div class="replies">${arr.map(([t, m]) => `<span class="${m ? 'm' : ''}">${t}</span>`).join('')}</div>`;
export const nzbat = (f) => `<div class="nzbat"><div class="cap"><span>заряд ${f}%</span><span>НЗ 10% не тратится</span></div>
  <div class="bar"><i class="nz"></i><i class="fill" style="--f:${Math.max(0, f - 10)}"></i></div>
  <div class="legend"><span><b>■</b> резерв на оплату, навигацию, звонки и мессенджеры</span></div></div>`;
const ring = (p, big, small) => `<div class="ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="6"/>
  <circle cx="50" cy="50" r="44" fill="none" stroke="var(--mode)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * 44}" stroke-dashoffset="${2 * Math.PI * 44 * (1 - p)}"/></svg>
  <div class="rv"><div><b>${big}</b>${small}</div></div></div>`;

// ---------- экраны сценария «Делу — время, потехе — час»
export const SCENES = [
  { mode: 'life', html: () => `<div class="scr">${sb('18:40', 31)}
      <div class="clock">18:40</div><div class="date">вторник, 13 октября</div>
      <div class="stack" style="margin-top:4%">
        ${ntf({ ic: '🎮', c: '#f0b419', who: 'Друзья', text: 'Катка в 19:00? Нас уже четверо', tm: 'сейчас' })}
        ${ntf({ ic: 'ПИ', c: '#9085e9', who: 'Чат группы ПИ-31', text: '28 новых: кто знает, что с парой в пятницу?', tm: '2 мин' })}
        ${ntf({ ic: '%', c: '#ff8a6b', who: 'Маркетплейс', text: 'Скидки до 70% только до полуночи', tm: '5 мин' })}
        ${ntf({ ic: 'W', c: '#7fdcb9', who: 'Работа · SMM', text: 'Посмотришь макет до завтра?', tm: '12 мин' })}
        ${ntf({ ic: '▶', c: '#e87ba4', who: 'Лента', text: '12 новых видео специально для тебя', tm: '14 мин' })}
        <div class="more">и ещё 141 уведомление</div></div></div>` },
  { mode: 'focus', html: () => `<div class="scr">${sb('18:41', 31)}${modebar('focus', 'до 22:00')}
      ${ring(.98, '3:19', 'осталось')}
      <div class="panel"><h5><i></i>Шумодав отложил 146</h5>
        <div class="row"><span>Сразу покажу</span><b>Лёша · научрук · мама · банк</b></div>
        <div class="row"><span>На паузе</span><b>ленты, игры, маркетплейсы</b></div>
        <div class="row"><span>Друзьям</span><b>«В фокусе до 22:00»</b></div></div>
      ${dock('на паузе до 22:00')}</div>` },
  { mode: 'focus', html: () => `<div class="scr">${sb('19:25', 27)}${modebar('focus', 'ещё 2:35')}
      <div style="margin-top:6%"></div>
      ${ntf({ ic: 'Л', c: '#34d3c1', who: 'Лёша · проект', text: 'Скинул правки к главе 3 — глянь таблицу 2, сдаём сегодня', tm: '19:25', cls: 'hot',
        tags: tagline([['проект', 1], ['сдача сегодня', 1], ['показано сразу', 0]]) })}
      <div class="panel" style="margin-top:4%"><h5><i></i>Новых в сводке: 40</h5>
        <div class="row"><span>Чат группы</span><b>17</b></div><div class="row"><span>Друзья</span><b>9</b></div>
        <div class="row"><span>Маркетплейсы и ленты</span><b>14</b></div></div>
      ${dock('на паузе ещё 2 ч 35 мин')}</div>` },
  { mode: 'focus', html: () => `<div class="scr">${sb('20:10', 24)}${modebar('focus', 'ещё 1:50')}
      ${ntf({ ic: 'АС', c: '#34d3c1', who: 'Анна Сергеевна · научрук', text: 'Голосовое сообщение · 2:14', tm: '20:10', cls: 'hot' })}
      <div class="panel"><div class="wave">${Array.from({ length: 34 }, (_, i) => `<i style="height:${22 + Math.round(70 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * .45)))}%"></i>`).join('')}</div>
        <p style="margin-top:.5em">«Лиза, посмотрела черновик. Во второй главе добавьте сравнение с 2024 годом, а список литературы оформите по ГОСТу…»</p></div>
      <div class="panel"><h5><i></i>Задачи из голосового</h5><div class="checks"><div>Сравнение с 2024 годом — глава 2</div><div>Литература по ГОСТу</div></div>
        ${tagline([['расшифровано на телефоне', 1], ['без интернета', 0]])}</div>
      ${replies([['✓ в чек-лист', 1], ['«Спасибо, исправлю!»', 0], ['напомнить в 21:00', 0]])}</div>` },
  { mode: 'focus', html: () => `<div class="scr">${sb('21:00', 21)}${modebar('focus', 'перерыв 10 мин')}<div class="tags" style="justify-content:center;margin-top:-1%"><span class="m">⚡ на зарядке · 100 Вт</span></div>
      <div class="panel" style="margin-top:4%"><h5><i></i>Сводка за 2 ч 20 мин</h5>
        <div class="row"><span>Пришло</span><b>96</b></div><div class="row"><span>Показано сразу</span><b>2</b></div><div class="row"><span>В сводке</span><b>94 → 3 строки</b></div></div>
      <div class="stack">
        ${ntf({ ic: 'ПИ', c: '#9085e9', who: 'Группа', text: 'Пару в пятницу перенесли на 10:00' })}
        ${ntf({ ic: 'W', c: '#7fdcb9', who: 'Работа', text: 'Макет согласован, правок нет' })}
        ${ntf({ ic: '🎮', c: '#f0b419', who: 'Друзья', text: 'Собираются в 22:30' })}
        <div class="more">остальное — реклама, ленты и мемы, ничего срочного</div></div>
      <div class="checks" style="font-size:.78em;margin-top:2%"><div class="done">Сравнение с 2024 годом — глава 2</div><div>Литература по ГОСТу</div></div></div>` },
  { mode: 'play', html: () => `<div class="hud">${sb('22:35', 58)}
      <div class="modebar" style="margin-top:2%"><i></i>Игра</div>
      <div class="fps"><span>144 к/с</span><span>Q2 1.5K</span><span>⚡ в обход батареи</span></div>
      <div class="arena">МАТЧ НАЙДЕН</div>
      <div class="panel"><div class="row"><span>Звонки</span><b>только близкие</b></div><div class="row"><span>Уведомления</span><b>тихо, до конца матча</b></div>
        <div class="row"><span>Курсовая</span><b>сдана в 22:35 ✓</b></div></div></div>` },
  { mode: 'focus', html: () => `<div class="scr night">${sb('00:30', 58)}
      <div class="clock" style="margin-top:8%">00:30</div>${modebar('focus', 'сон до 8:00')}
      <div class="panel" style="margin-top:6%"><h5><i></i>Шумодав на утро</h5>
        <div class="row"><span>Завтра</span><b>пара в 10:00 · из чата группы</b></div>
        <div class="row"><span>Будильник</span><b>8:15</b></div>
        <div class="row"><span>НЗ-заряд</span><b>10% — на дорогу</b></div>
        <div class="row"><span>Уведомления</span><b>ждут до 8:00</b></div></div>
      ${nzbat(58)}</div>` },
];
