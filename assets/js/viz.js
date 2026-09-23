// Графики на HTML: столбики, единичные сетки, шкалы, стеки. Сцены глав — набор слоёв, один на шаг.
import { $, fmt, scrolly, onVisible } from './core.js';

const card = (title, sub, body, note = '') =>
  `<div class="viz-card"><p class="viz-title">${title}</p><p class="viz-sub">${sub}</p>${body}${note ? `<p class="viz-note">${note}</p>` : ''}</div>`;
const legend = (items) => `<div class="viz-legend">${items.map(([c, t]) => `<span><i style="--c:${c}"></i>${t}</span>`).join('')}</div>`;

export function hbars(rows, { max, ticks = [], tick = (v) => v, limit } = {}) {
  const body = rows.map(r => {
    const w = r.value / max;
    const inside = w > 0.6; // длинный столбик — подпись внутри, чтобы не вылезала за карточку
    return `<div class="hb-row"><div class="hb-l">${r.label}</div><div class="hb-track" style="--w:${w}">
      <i class="hb-bar${r.emph ? ' emph' : ''}"></i><span class="hb-v${inside ? ' in' + (r.emph ? '' : ' lt') : ''}">${r.text}</span></div></div>`;
  }).join('');
  const axis = ticks.length ? `<div class="hb-axis">${ticks.map(t => `<span style="left:${t / max * 100}%">${tick(t)}</span>`).join('')}
    ${limit ? `<i class="hb-limit" style="left:${limit.value / max * 100}%;top:-${rows.length * 36 + 6}px"><span>${limit.label}</span></i>` : ''}</div>` : '';
  return `<div class="hb">${body}${axis}</div>`;
}

export function units(groups, { cols = 10, dots = false } = {}) {
  let k = 0, cells = '';
  for (const g of groups) for (let i = 0; i < g.n; i++) cells += `<i style="--c:${g.c};--k:${k++}"></i>`;
  return `<div class="units${dots ? ' dots' : ''}" style="--cols:${cols}">${cells}</div>`;
}

export function meter(label, value, segs) {
  const parts = segs || [{ w: value, c: 'var(--v-accent)' }];
  return `<div class="meter-row"><div class="ml"><span>${label}</span><b>${value}%</b></div>
    <div class="meter">${parts.map(p => `<i style="--w:${p.w}%;--c:${p.c}"></i>`).join('')}</div></div>`;
}

export function stackbar(segs, total) {
  return `<div class="stackbar">${segs.map(s => {
    const w = s.v / total * 100;
    const lab = w > 14 ? (s.short || '') : '';
    return `<i class="${s.dark ? 'dk' : ''}" style="--w:calc(${w}% - 2px);--c:${s.c}" title="${s.label}: ${fmt(s.v)} ₽">${lab}</i>`;
  }).join('')}</div>`;
}

// ---------- сцены глав
const CTX = [
  () => card('Среднее время в интернете в день', 'Mediascope, январь—март 2025, Россия, 12+',
    hbars([{ label: '12–24 года', value: 409, text: '6 ч 49 мин', emph: true }, { label: 'Все россияне 12+', value: 273, text: '4 ч 33 мин' }],
      { max: 540, ticks: [0, 120, 240, 360, 480], tick: (v) => v / 60 + ' ч' }),
    'Молодые проводят онлайн на 2 ч 16 мин больше — это +50%.'),
  () => card('Из 100 студентов вузов', 'VK Education и «Твой Ход», сентябрь 2026, 1 500 студентов из 8 федеральных округов',
    units([{ n: 32, c: 'var(--v1)' }, { n: 29, c: 'var(--v2)' }, { n: 39, c: 'var(--v-track)' }], { cols: 10 }) +
    legend([['var(--v1)', 'совмещают учёбу с постоянной работой — 32'], ['var(--v2)', 'с проектами и подработками — 29'], ['var(--v-track)', 'без работы — 39']]),
    'В источнике — «около 60%»; сумма 61 из-за округления.'),
  () => card('Игры и нейросети', 'РВИ, ИФСИ и НАФИ, октябрь 2025 · «Я — профессионал», февраль 2025',
    `<div class="meters">${meter('Играют в видеоигры, 18–24 года', 90)}
      ${meter('Пользуются нейросетями, студенты', 85, [{ w: 29.3, c: 'var(--ai-3)' }, { w: 35.4, c: 'var(--ai-2)' }, { w: 20.3, c: 'var(--ai-1)' }])}</div>` +
    legend([['var(--ai-3)', 'регулярно 29,3%'], ['var(--ai-2)', 'иногда 35,4%'], ['var(--ai-1)', 'редко 20,3%']]),
    'Из играющих 7 из 10 играют на телефоне или планшете; 43% студентов пишут с нейросетями курсовые и дипломы.'),
  () => card('237 уведомлений за день', 'медиана, подростки 11–17 лет, США · Common Sense Media, 2023',
    units([{ n: 59, c: 'var(--v1)' }, { n: 12, c: 'var(--v3)' }, { n: 166, c: 'var(--v-mute)' }], { cols: 24, dots: true }) +
    legend([['var(--v1)', 'в учебное время ≈ 59 (25%)'], ['var(--v3)', 'ночью ≈ 12 (5%)'], ['var(--v-mute)', 'в остальное время ≈ 166']]),
    'Один кружок — одно уведомление. Подростки реагируют примерно на каждое четвёртое.'),
];

const COST = [
  () => card('Сколько секунд внимание держится на одном экране', 'в среднем · наблюдения Глории Марк, UC Irvine',
    `<div class="cols"><div class="c"><span class="cv">150</span><i style="--h:1"></i></div><div class="c"><span class="cv">75</span><i style="--h:.5"></i></div><div class="c emph"><span class="cv">47</span><i style="--h:${47 / 150}"></i></div></div>
     <div class="cols-x"><span>2003</span><span>2012</span><span>последние 5–6 лет</span></div>`,
    'За двадцать лет — в три раза короче.'),
  () => card('Час работы и два отвлечения', 'иллюстрация по оценке Г. Марк: возвращение к задаче ≈ 25 минут',
    `<div class="tl"><div class="tl-bar">
        <i style="--w:20%;--c:var(--v2)"></i><i class="int" style="--w:calc(41.6% - 2px);--c:var(--v-track)"></i><i style="--w:calc(13.4% - 2px);--c:var(--v2)"></i><i class="int" style="--w:calc(25% - 2px);--c:var(--v-track)"></i></div>
      <div class="tl-lab"><span style="--w:20%">12 мин дела</span><span style="--w:41.6%">уведомление → ≈25 мин, чтобы вернуться</span><span style="--w:13.4%">8 мин</span><span style="--w:25%">снова…</span></div>
      <div class="tl-ax"><span>0</span><span>15</span><span>30</span><span>45</span><span>60 мин</span></div></div>
     <div class="tl-sum"><div><b>20 мин</b>настоящей работы</div><div><b>40 мин</b>на возвращение</div></div>` +
    legend([['var(--v2)', 'работа в фокусе'], ['var(--v-track)', 'время на возвращение'], ['var(--v-accent)', 'отвлечение']]),
    'Иллюстрация, а не измерение: показывает, как складывается цена двух отвлечений.'),
  () => card('Контроль даётся тяжело', 'SuperJob, март 2026 · ORO для РИА Новости, май 2026',
    `<div class="tiles">
      <div class="tile"><div class="v">52%</div><div class="l">людей 18–34 лет признают зависимость от гаджетов</div><div class="meter" style="--p:.52"><b></b></div></div>
      <div class="tile"><div class="v">57%</div><div class="l">россиян даже не пытаются ограничивать использование</div><div class="meter" style="--p:.57"><b></b></div></div>
      <div class="tile"><div class="v">55%</div><div class="l">людей 18–35 лет жалуются на проблемы со сном</div><div class="meter" style="--p:.55"><b></b></div></div></div>`),
  () => card('Главный критерий выбора смартфона', 'доля ответов · Tecno, май 2026, 1 500+ человек 18–60 лет из городов-миллионников',
    hbars([
      { label: 'Автономность', value: 32, text: '32%', emph: true }, { label: 'Цена', value: 27, text: '27%' }, { label: 'Прочность', value: 12, text: '12%' },
      { label: 'ИИ-ассистент', value: 8, text: '8%' }, { label: 'Производительность', value: 5, text: '5%' }, { label: 'Камера', value: 3, text: '3%' }],
    { max: 40, ticks: [0, 10, 20, 30, 40], tick: (v) => v + '%' }),
    '58% выбрали связку «автономность + прочность + доступная цена».'),
];

const INS = [
  () => card('Как молодые уже борются с шумом', 'ВЦИОМ, 2023 · Go Mobile, ноябрь 2025',
    `<div class="meters">${meter('Отключались от сети на сутки и дольше за год, 18–24 года', 46)}
      ${meter('Отключают уведомления из-за спама, все россияне', 73)}</div>`,
    'Выключить уведомления — значит выключить и спам, и сообщение от научного руководителя.'),
  () => card('Люди платят за «трение»', 'Fortune, февраль 2026',
    `<div class="cards3">
      <div class="pcard"><div class="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="6" width="16" height="12" rx="3"/><path d="M8 12h8"/></svg></div><div class="pv">$39</div><div class="pl">Bloom — металлическая карточка: приложил к телефону, ленты закрылись. Продано 60&nbsp;000+</div><div class="minus">отдельный предмет, легко забыть дома</div></div>
      <div class="pcard"><div class="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="5" width="14" height="14" rx="4"/><circle cx="12" cy="12" r="2.5"/></svg></div><div class="pv">$59</div><div class="pl">Brick — магнитный блок: секунда, чтобы решить, нужно ли открывать приложение</div><div class="minus">ещё одно устройство и приложение</div></div>
      <div class="pcard"><div class="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 15h4M10 18h4"/></svg></div><div class="pv">0 приложений</div><div class="pl">Кнопочный телефон — радикальный детокс</div><div class="minus">без оплаты, карт, учёбы и игр</div></div></div>`),
  () => card('Где ничего нет', 'качественная оценка, а не данные',
    `<div class="matrix"><span class="ax x">мощность и возможности →</span><span class="ax y">контроль внимания →</span>
      <div class="pt" style="--x:16%;--y:84%"><i></i><span>кнопочный телефон</span></div>
      <div class="pt l" style="--x:86%;--y:16%"><i></i><span>игровой смартфон</span></div>
      <div class="pt" style="--x:54%;--y:48%"><i></i><span>смартфон + брелок</span></div>
      <div class="pt me l" style="--x:86%;--y:84%"><i></i><span>iQOO Flow</span></div></div>`,
    'Правый верхний угол пуст: мощный телефон, который умеет молчать.'),
];

export function chapterStage(section, stageEl, builders) {
  stageEl.innerHTML = builders.map((b, i) => `<div class="viz-layer" data-i="${i}">${b()}</div>`).join('');
  // на телефоне график встаёт прямо в шаг: липкая сцена там отнимала бы полэкрана у текста
  const steps = [...section.querySelectorAll('.step')];
  steps.forEach((st, i) => { const d = document.createElement('div'); d.className = 'viz-inline'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = builders[i](); st.prepend(d); });
  section.classList.add('charts');
  const layers = [...stageEl.children];
  const fit = () => { // высота сцены = самый высокий слой, чтобы ничего не прыгало
    let h = 0; layers.forEach(l => { l.style.position = 'relative'; h = Math.max(h, l.offsetHeight); l.style.position = ''; });
    stageEl.style.height = h + 'px';
  };
  fit(); addEventListener('resize', fit);
  document.fonts?.ready.then(fit);
  scrolly(section, (i) => { layers.forEach((l, k) => l.classList.toggle('on', k === i)); steps[i]?.querySelector('.viz-inline')?.classList.add('on'); });
}

export function initChapters() {
  const map = { ctx: CTX, cost: COST, ins: INS };
  for (const [key, builders] of Object.entries(map)) {
    const section = document.querySelector(`[data-scrolly="${key}"]`);
    const stage = $('#stage-' + key);
    if (section && stage) chapterStage(section, stage, builders);
  }
}

// ---------- цена
const STRUCT = [
  { label: 'Себестоимость: компоненты и сборка', short: 'себестоимость', v: 30720, c: 'var(--v-accent)' },
  { label: 'Бренд: логистика, сертификация, гарантия, маркетинг, лицензии', short: 'бренд', v: 7360, c: '#8a8a93', dark: true },
  { label: 'Маржа бренда', v: 5190, c: '#6e6e77', dark: true },
  { label: 'Розница и маркетплейсы', v: 5900, c: '#55555d', dark: true },
  { label: 'НДС 22%', short: 'НДС', v: 10820, c: '#3e3e45', dark: true },
];
export function initPrice() {
  const lineup = $('#viz-lineup'), struct = $('#viz-structure');
  if (lineup) {
    lineup.innerHTML = `<p class="viz-title">Цены iQOO в России и лимит чемпионата</p><p class="viz-sub">официальные цены на старте продаж, ₽</p>` +
      hbars([
        { label: 'iQOO Z11 · 8/256', value: 38999, text: '38 999' },
        { label: 'iQOO 15R · 12/256', value: 59990, text: '59 990' },
        { label: '<b>iQOO Flow · 12/256</b>', value: 59990, text: '59 990', emph: true },
        { label: 'iQOO 15 · 12/256', value: 79999, text: '79 999' },
        { label: 'iQOO 15 · 16/512', value: 89999, text: '89 999' }],
      { max: 122000, ticks: [0, 25000, 50000, 75000, 100000], tick: (v) => v ? v / 1000 + ' тыс.' : '0', limit: { value: 100000, label: 'лимит' } }) +
      `<p class="viz-note">Источники: iQOO Россия, Hi-Tech Mail, РБК Life <a class="ref" href="#src-18">18</a><a class="ref" href="#src-19">19</a>. Flow — концепт.</p>`;
  }
  if (struct) {
    const total = 59990;
    struct.innerHTML = `<p class="viz-title">Из чего складываются 59 990 ₽</p><p class="viz-sub">модельная оценка по открытым данным · курс 84 ₽/$</p>` +
      stackbar(STRUCT, total) +
      `<table class="vtable">${STRUCT.map(s => `<tr><td><i style="--c:${s.c}"></i>${s.label}</td><td>${fmt(s.v)} ₽</td></tr>`).join('')}</table>
       <p class="viz-note">Себестоимость ≈ $365. Допущения: розница 12% от цены без НДС, расходы бренда 17% и маржа 12% от оптовой цены. Фактическую структуру цены iQOO не раскрывает.</p>`;
  }
  [lineup, struct].forEach(el => el && onVisible(el, (v) => v && el.classList.add('on'), '-10% 0px'));
}
