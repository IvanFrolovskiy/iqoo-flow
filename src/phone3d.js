// 3D-модель iQOO Flow на платформе iQOO 15R: плоская металлическая рамка, стёкла с 2.5D-кромкой,
// квадратный остров камер с ободком и световым кольцом режима, тумблер на левой грани,
// экран с живым интерфейсом и «рентген» батареи с НЗ-зарядом.
// Свет — студийное окружение из софтбоксов, как на предметной съёмке. Собирается в assets/js/phone3d.js (tools/build3d.sh).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// размеры в сантиметрах, пропорции как у iQOO 15R
const W = 7.46, H = 15.76, D = 0.79, R = 0.98;
const EB = 0.055;           // радиус кромки рамки
const GI = 0.075;           // полоска рамки вокруг стёкол
const MODE = { play: 0xf0b419, life: 0xede7da, focus: 0x34d3c1 };
const KNOB = { play: 0.5, life: 0, focus: -0.5 };
const SWITCH_Y = H / 2 - 3.5;
// остров камер: сторона, радиус скругления, ширина ободка
const IS = 3.5, IR = 1.08, BW = 0.2;

function rr(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
function ring(outer, inner) { outer.holes.push(inner); return outer; }
// гладкие нормали для выдавленных деталей: кромки скруглены по дуге, поэтому стыков с изломом нет
function smooth(geo) {
  const p = geo.attributes.position, acc = new Map(), keys = new Array(p.count);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), cb = new THREE.Vector3();
  const key = (i) => `${Math.round(p.getX(i) * 2e4)},${Math.round(p.getY(i) * 2e4)},${Math.round(p.getZ(i) * 2e4)}`;
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    cb.subVectors(c, b).cross(ab.subVectors(a, b));
    for (let k = 0; k < 3; k++) { const kk = key(i + k); keys[i + k] = kk; const v = acc.get(kk); v ? v.add(cb) : acc.set(kk, cb.clone()); }
  }
  const n = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.copy(acc.get(keys[i])).normalize(); n[i * 3] = v.x; n[i * 3 + 1] = v.y; n[i * 3 + 2] = v.z; }
  geo.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return geo;
}
function slab(shape, depth, bevel, segs = 5, curve = 24) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: curve });
  g.translate(0, 0, -depth / 2);
  return smooth(g);
}
// UV лицевых граней выдавливания в долях прямоугольника w×h (для текстур экрана, вспышки и бороздок)
function capUV(geo, w, h) {
  const p = geo.attributes.position, uv = geo.attributes.uv, g0 = geo.groups[0];
  for (let i = g0.start; i < g0.start + g0.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  uv.needsUpdate = true;
  return geo;
}
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function radialTexture(stops) {
  return canvasTex(256, 256, (g) => {
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, a]) => grd.addColorStop(o, `rgba(255,255,255,${a})`));
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  });
}
// контур со свечением: скруглённый квадрат side×side в квадратной текстуре span×span
function contourTexture(side, rad, span, width, blur, alpha = 1, fill = false) {
  const N = 1024, k = N / span;
  return canvasTex(N, N, (g) => {
    const s = side * k, o = (N - s) / 2;
    g.shadowColor = '#fff'; g.shadowBlur = blur * k; g.globalAlpha = alpha;
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = width * k;
    for (let i = 0; i < 2; i++) { roundRect(g, o, o, s, s, rad * k); fill ? g.fill() : g.stroke(); }
  });
}
// линза: тёмное стекло, кольца элементов, синие отражения просветления и гравировка по ободку
function lensTexture(label) {
  return canvasTex(512, 512, (g) => {
    const C = 256;
    let grd = g.createRadialGradient(C, C, 8, C, C, C);
    grd.addColorStop(0, '#040506'); grd.addColorStop(.45, '#080a10'); grd.addColorStop(.72, '#11141b'); grd.addColorStop(.8, '#050506'); grd.addColorStop(1, '#101114');
    g.fillStyle = grd; g.beginPath(); g.arc(C, C, C, 0, Math.PI * 2); g.fill();
    [[.74, 'rgba(255,255,255,.1)', 2], [.6, 'rgba(90,120,255,.16)', 3], [.46, 'rgba(255,255,255,.06)', 2], [.32, 'rgba(60,110,230,.22)', 2]]
      .forEach(([k, col, lw]) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(C, C, C * k, 0, Math.PI * 2); g.stroke(); });
    g.globalCompositeOperation = 'lighter';
    const glint = (x, y, r, col) => { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, col); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    glint(C + 6, C - 4, 60, 'rgba(40,130,255,.75)'); glint(C + 10, C - 8, 16, 'rgba(190,230,255,.9)');
    const arc = (a0, a1, rad, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.arc(C, C, C * rad, a0, a1); g.stroke(); };
    arc(-2.6, -1.8, .5, 'rgba(90,70,255,.3)', 16); arc(.6, 1.2, .36, 'rgba(40,170,255,.22)', 10);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(200,205,215,.45)'; g.font = '600 18px "JetBrains Mono", monospace'; g.textAlign = 'center';
    const rad = C * .885, span = Math.PI * .8, a0 = -Math.PI / 2 - span / 2;
    [...label].forEach((ch, i) => { const a = a0 + span * (i + .5) / label.length; g.save(); g.translate(C + Math.cos(a) * rad, C + Math.sin(a) * rad); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 6); g.restore(); });
  });
}
function flashTexture() {
  return canvasTex(256, 96, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#fff8e2'); grd.addColorStop(1, '#e9cf86');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(150,115,40,.3)'; g.lineWidth = 2;
    for (let x = 6; x < w; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = 'rgba(255,196,60,.55)'; g.beginPath(); g.ellipse(w * .62, h / 2, 26, 22, 0, 0, Math.PI * 2); g.fill();
  });
}
// концентрические бороздки под стеклом острова (карта рельефа)
function grooveTexture() {
  return canvasTex(1024, 1024, (g, w) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, w);
    g.lineWidth = 2;
    for (let r = 4; r < 740; r += 4.2) { g.strokeStyle = `rgba(255,255,255,${.55 + .35 * Math.sin(r * .37)})`; g.beginPath(); g.arc(w / 2, w / 2, r, 0, Math.PI * 2); g.stroke(); }
  }, false);
}
function logoTexture() { // маска надписи на спинке
  return canvasTex(1024, 256, (g, w) => {
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '500 170px "Unbounded", sans-serif'; g.fillText('iQOO', w / 2, 190);
  }, false);
}
// ячейки батареи для «рентгена»
function cellsTexture() {
  return canvasTex(512, 1024, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#3a4452'); grd.addColorStop(1, '#262c36');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(190,205,225,.35)'; g.lineWidth = 3;
    for (let x = 0; x <= w; x += 42.6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.strokeStyle = 'rgba(190,205,225,.18)'; g.lineWidth = 2;
    for (let y = 0; y <= h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
}
// студийный свет: круговой софтбокс с мягкими пятнами по азимуту и узкие стрипы для граней рамки,
// поэтому стекло и металл дают плавные градиенты под любым углом поворота
function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x000000);
  const spots = [[-64, 24, 1], [42, 28, .8], [-128, 20, .7], [112, 18, .75], [178, 30, .3], [0, 34, .12]]; // азимут°, ширина°, сила
  const band = canvasTex(1024, 128, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let x = 0; x < w; x++) {
      const az = x / w * 360;
      let I = 0;
      for (const [c, s, k] of spots) { const d = ((az - c) % 360 + 540) % 360 - 180; I += k * Math.exp(-d * d / (2 * s * s)); }
      for (let y = 0; y < h; y++) {
        const v = 1 - y / (h - 1), V = Math.exp(-((v - .6) ** 2) / (2 * .15 ** 2));
        const o = (y * w + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(255 * Math.pow(Math.min(1, I) * V, 1 / 2.2)); img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 30, 96, 1, true), new THREE.MeshBasicMaterial({ map: band, side: THREE.BackSide }));
  cyl.material.color.multiplyScalar(3); env.add(cyl);
  const panel = (w, h, k, pos, color = 0xffffff) => {
    const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }); m.color.multiplyScalar(k);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(...pos); p.lookAt(0, 0, 0); env.add(p);
  };
  panel(24, 7, 2.2, [0, 17, 3]);             // верхний
  panel(1.3, 26, 7, [-16, 1, 3]);            // стрип слева
  panel(1.3, 26, 7, [16, 1, 3]);             // стрип справа
  panel(1.1, 22, 5, [-9, 1, -13]);           // контровые сзади
  panel(1.1, 22, 5, [9, 1, -13]);
  panel(4, 4, 3, [9, 11, 12], 0xfff3dc);     // тёплый ключ
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: 0x0e0e10 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -15; env.add(floor);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.03).texture;
  pm.dispose();
  return tex;
}

// ---------- экран
const SCR = { w: 640, h: 1396 };
function hexCss(hex) { return '#' + hex.toString(16).padStart(6, '0'); }
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawScreen(g, st) {
  const { w, h } = SCR, col = hexCss(MODE[st.mode]);
  g.clearRect(0, 0, w, h);
  if (st.view === 'off') { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); return; }
  const bg = g.createRadialGradient(w / 2, 0, 40, w / 2, 0, h * .9);
  bg.addColorStop(0, col + '55'); bg.addColorStop(.55, '#0b0b0e'); bg.addColorStop(1, '#040405');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(244,242,238,.8)'; g.font = '600 26px "JetBrains Mono", monospace'; g.textAlign = 'left';
  g.fillText(st.time || '19:25', 44, 62); g.textAlign = 'right'; g.fillText((st.bat ?? 58) + '%', w - 44, 62);
  g.textAlign = 'center';
  const chip = (y, text) => {
    g.font = '600 30px "Inter", sans-serif'; const tw = g.measureText(text).width + 70;
    roundRect(g, (w - tw) / 2, y - 36, tw, 54, 27); g.fillStyle = col + '30'; g.fill(); g.strokeStyle = col + 'aa'; g.lineWidth = 2; g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc((w - tw) / 2 + 30, y - 9, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f4f2ee'; g.fillText(text, w / 2 + 12, y);
  };
  const card = (y, hh, title, rows) => {
    roundRect(g, 40, y, w - 80, hh, 34); g.fillStyle = 'rgba(255,255,255,.07)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2; g.stroke();
    g.textAlign = 'left'; g.fillStyle = '#f4f2ee'; g.font = '650 32px "Inter", sans-serif'; g.fillText(title, 76, y + 62);
    rows.forEach(([a, b], i) => {
      const yy = y + 118 + i * 58;
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(76, yy - 40, w - 152, 2);
      g.font = '400 27px "Inter", sans-serif'; g.fillStyle = 'rgba(244,242,238,.7)'; g.fillText(a, 76, yy);
      g.textAlign = 'right'; g.font = '600 27px "Inter", sans-serif'; g.fillStyle = '#f4f2ee'; g.fillText(b, w - 76, yy); g.textAlign = 'left';
    });
    g.textAlign = 'center';
  };
  const name = { play: 'Игра', life: 'Жизнь', focus: 'Фокус' }[st.mode];
  if (st.view === 'game') { // интерфейс игры в альбомной ориентации: рисуем повёрнутым
    g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2);
    const LW = h, LH = w;
    const bg2 = g.createRadialGradient(0, 0, 20, 0, 0, LW * .6); bg2.addColorStop(0, 'rgba(240,180,25,.45)'); bg2.addColorStop(1, '#070503');
    g.fillStyle = bg2; g.fillRect(-LW / 2, -LH / 2, LW, LH);
    g.strokeStyle = 'rgba(240,180,25,.18)'; g.lineWidth = 2;
    for (let x = -LW / 2; x < LW / 2; x += 90) { g.beginPath(); g.moveTo(x, -LH / 2); g.lineTo(x + 160, LH / 2); g.stroke(); }
    g.fillStyle = '#fff'; g.font = '800 92px "Unbounded", sans-serif'; g.textAlign = 'center';
    g.shadowColor = 'rgba(240,180,25,.9)'; g.shadowBlur = 40; g.fillText('МАТЧ НАЙДЕН', 0, 30); g.shadowBlur = 0;
    g.font = '600 30px "JetBrains Mono", monospace'; g.fillStyle = '#f0b419';
    g.fillText('144 к/с  ·  Q2 1.5K  ·  ⚡ в обход батареи', 0, 110);
    g.fillStyle = 'rgba(244,242,238,.75)'; g.font = '500 28px "Inter", sans-serif'; g.fillText('звонят только близкие · уведомления ждут', 0, -120);
    g.restore(); return;
  }
  if (st.view === 'digest') {
    chip(170, 'Фокус · перерыв');
    card(250, 330, 'Сводка за 2 ч 20 мин', [['Пришло', '96'], ['Показано сразу', '2'], ['В сводке', '94 → 3 строки']]);
    const items = [['ПИ', '#9085e9', 'Группа', 'Пару в пятницу перенесли на 10:00'], ['W', '#7fdcb9', 'Работа', 'Макет согласован'], ['🎮', '#f0b419', 'Друзья', 'Собираются в 22:30']];
    items.forEach(([ic, c, who, txt], i) => {
      const y = 630 + i * 150;
      roundRect(g, 40, y, w - 80, 128, 30); g.fillStyle = 'rgba(255,255,255,.075)'; g.fill();
      roundRect(g, 66, y + 26, 76, 76, 20); g.fillStyle = c; g.fill();
      g.fillStyle = '#111'; g.font = '700 30px "Inter", sans-serif'; g.textAlign = 'center'; g.fillText(ic, 104, y + 76);
      g.textAlign = 'left'; g.fillStyle = '#f4f2ee'; g.font = '650 29px "Inter", sans-serif'; g.fillText(who, 168, y + 56);
      g.fillStyle = 'rgba(244,242,238,.72)'; g.font = '400 26px "Inter", sans-serif'; g.fillText(txt, 168, y + 96); g.textAlign = 'center';
    });
    g.fillStyle = 'rgba(244,242,238,.5)'; g.font = '400 25px "Inter", sans-serif'; g.fillText('остальное — реклама и ленты, ничего срочного', w / 2, 1130);
    return;
  }
  // экран блокировки
  g.fillStyle = '#f4f2ee'; g.font = '600 170px "Unbounded", sans-serif'; g.fillText(st.clock || '18:41', w / 2, 330);
  g.font = '400 30px "Inter", sans-serif'; g.fillStyle = 'rgba(244,242,238,.7)'; g.fillText('вторник, 13 октября', w / 2, 392);
  chip(490, st.mode === 'focus' ? 'Фокус · до 22:00' : st.mode === 'play' ? 'Игра · максимум' : 'Жизнь · как обычно');
  if (st.mode === 'focus') card(580, 330, 'Шумодав отложил 146', [['Сразу покажу', 'Лёша · научрук · мама'], ['На паузе', 'соцсети, игры'], ['Друзьям', '«В фокусе до 22:00»']]);
  else if (st.mode === 'play') card(580, 330, 'Режим игры', [['Кадры', '144 к/с · Q2'], ['Питание', 'в обход батареи'], ['Звонки', 'только близкие']]);
  else card(580, 330, `Режим «${name}»`, [['Уведомления', 'группами'], ['Шумодав', 'сортирует'], ['НЗ-заряд', '10% на дорогу']]);
}

export async function mount(container, opts = {}) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.still });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, opts.still ? 2 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  const key = new THREE.DirectionalLight(0xfff4e6, .8); key.position.set(8, 12, 10); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe8ff, .6); rim.position.set(-12, 6, -10); scene.add(rim);

  const camera = new THREE.PerspectiveCamera(24, 1, 2, 150);
  camera.position.set(0, 0, 44);

  try { await Promise.all(['500 40px "Unbounded"', '600 40px "Unbounded"', '600 30px "Inter"', '400 30px "Inter"', '600 26px "JetBrains Mono"'].map(f => document.fonts.load(f, 'АБВ iQOO 123'))); } catch (e) { /* шрифты подгрузятся позже */ }

  const phone = new THREE.Group(); scene.add(phone);
  const shells = []; // материалы корпуса, которые прозрачнеют в режиме «рентген»
  const shell = (m) => { shells.push(m); m.userData.baseOpacity = m.opacity ?? 1; m.userData.baseTransparent = m.transparent; return m; };
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = phone) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

  // ---------- материалы
  const metal = shell(new THREE.MeshPhysicalMaterial({ color: 0x8a8e96, metalness: 1, roughness: .22 }));
  const bezelMetal = shell(new THREE.MeshPhysicalMaterial({ color: 0x8f939b, metalness: 1, roughness: .14 }));
  const backGlass = shell(new THREE.MeshPhysicalMaterial({ color: 0x15171a, metalness: 0, roughness: .3 }));
  const glassEdge = shell(new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, metalness: 0, roughness: .08 }));
  const dark = shell(new THREE.MeshStandardMaterial({ color: 0x070708, roughness: .7 }));
  const antenna = shell(new THREE.MeshStandardMaterial({ color: 0x3d4148, roughness: .5 }));
  const knobMat = shell(new THREE.MeshPhysicalMaterial({ color: 0xe0a01e, metalness: 1, roughness: .32 }));

  // ---------- корпус: плоская рамка со скруглённой кромкой
  add(slab(rr(W - 2 * EB, H - 2 * EB, R - EB), D - 2 * EB, EB, 8, 32), metal);

  // стёкла с 2.5D-кромкой, чуть выше рамки
  const gw = W - 2 * GI - .04, gh = H - 2 * GI - .04, gr = R - GI - .02, GT = .02, GB = .022;
  const glassZ = D / 2 - .016, glassOut = glassZ + GT / 2 + GB;
  add(slab(rr(gw, gh, gr), GT, GB, 4, 32), [backGlass, glassEdge], 0, 0, -glassZ);

  // экран под передним стеклом: изображение светится через стекло, отражения студии ложатся сверху
  const sc = document.createElement('canvas'); sc.width = SCR.w; sc.height = SCR.h;
  const sg = sc.getContext('2d');
  const scrTex = new THREE.CanvasTexture(sc); scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = 8;
  const dw = gw - .24, dh = gh - .24;
  const frontGlass = shell(new THREE.MeshPhysicalMaterial({ color: 0x020203, metalness: 0, roughness: .03, emissive: 0xffffff, emissiveMap: scrTex, emissiveIntensity: 1, envMapIntensity: .22 }));
  add(capUV(slab(rr(gw, gh, gr), GT, GB, 4, 32), dw, dh), [frontGlass, glassEdge], 0, 0, glassZ);

  // ---------- остров камер на спине, в левом верхнем углу, если смотреть на спинку
  const island = new THREE.Group(); island.position.set(W / 2 - .5 - IS / 2, H / 2 - .5 - IS / 2, -glassOut); island.rotation.y = Math.PI; phone.add(island);
  const IH = .17, IB = .035, ITOP = IH - .03;          // высота ободка над стеклом, радиус его кромки, верх
  const inner = IS - 2 * BW, innerR = IR - BW;
  add(slab(ring(rr(IS, IS, IR), rr(inner, inner, innerR)), IH - 2 * IB, IB, 6, 32), bezelMetal, 0, 0, IH / 2 - .03, island);
  // тень у основания ободка
  const aoMat = new THREE.MeshBasicMaterial({ map: contourTexture(IS, IR, IS + 1.2, .02, .16, .9, true), color: 0x000000, transparent: true, depthWrite: false, opacity: .55 });
  aoMat.alphaMap = aoMat.map; aoMat.alphaMap.colorSpace = THREE.NoColorSpace; aoMat.map = null;
  add(new THREE.PlaneGeometry(IS + 1.2, IS + 1.2), aoMat, 0, 0, .004, island);
  // стекло острова с концентрическими бороздками
  const grooves = grooveTexture();
  const islandGlass = shell(new THREE.MeshPhysicalMaterial({ color: 0x141518, metalness: .4, roughness: .32, bumpMap: grooves, bumpScale: .35, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: .17 }));
  add(capUV(slab(rr(inner + .02, inner + .02, innerR + .01), .03, .01, 3, 32), inner + .02, inner + .02), [islandGlass, glassEdge], 0, 0, ITOP - .03 - .025, island);
  const deckTop = ITOP - .03 + .003;
  // площадка объективов
  const PW = 2.78, PH = 1.46;
  const deckMat = shell(new THREE.MeshPhysicalMaterial({ color: 0x020203, metalness: 0, roughness: .08, envMapIntensity: .25 }));
  add(new THREE.ShapeGeometry(rr(PW, PH, PH / 2), 48), deckMat, 0, 0, deckTop, island);
  const deckEdge = new THREE.LineBasicMaterial({ color: 0x2a2c31, transparent: true });
  const deckLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(rr(PW, PH, PH / 2).getPoints(48)), deckEdge); deckLine.position.z = deckTop + .001; island.add(deckLine);
  shells.push(deckEdge); deckEdge.userData.baseOpacity = 1;
  // объективы: металлическое кольцо и выпуклое стекло
  const lensRingMat = shell(new THREE.MeshPhysicalMaterial({ color: 0x33363c, metalness: 1, roughness: .18 }));
  const lensA = shell(new THREE.MeshPhysicalMaterial({ map: lensTexture('50MP · OIS · f/1.88'), metalness: 0, roughness: .03, iridescence: .35, iridescenceIOR: 1.6, iridescenceThicknessRange: [0, 210], envMapIntensity: .16 }));
  const lensB = shell(new THREE.MeshPhysicalMaterial({ map: lensTexture('8MP · ULTRA WIDE'), metalness: 0, roughness: .03, iridescence: .35, iridescenceIOR: 1.6, iridescenceThicknessRange: [0, 210], envMapIntensity: .16 }));
  const LR = .58, LG = .47;
  const ringProfile = [[LG - .01, 0], [LR, 0], [LR, .018], [LR - .02, .045], [LG + .02, .045], [LG, .03]].map(([x, y]) => new THREE.Vector2(x, y));
  const capH = .035, capRs = (LG * LG + capH * capH) / (2 * capH), capT = Math.asin(LG / capRs);
  const makeCap = () => {
    const g = new THREE.SphereGeometry(capRs, 72, 12, 0, Math.PI * 2, 0, capT);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * LG) + .5, -p.getZ(i) / (2 * LG) + .5);
    g.translate(0, .03 + capH - capRs, 0);
    return g;
  };
  [[.66, lensA], [-.66, lensB]].forEach(([x, mat]) => {
    const lens = new THREE.Group(); lens.position.set(x, 0, deckTop); lens.rotation.x = Math.PI / 2; island.add(lens);
    add(new THREE.LatheGeometry(ringProfile, 96), lensRingMat, 0, 0, 0, lens);
    add(makeCap(), mat, 0, 0, 0, lens);
  });
  // вспышка справа от острова
  const flashMat = shell(new THREE.MeshPhysicalMaterial({ map: flashTexture(), roughness: .2, clearcoat: 1, clearcoatRoughness: .05, emissive: 0x2a2208, emissiveIntensity: .5 }));
  add(capUV(slab(rr(.78, .28, .14), .016, .01, 3), .78, .28), [flashMat, glassEdge], IS / 2 + .85, 0, .006, island);

  // световое кольцо режима вокруг острова и ореол на стекле
  const ringMat = new THREE.MeshBasicMaterial({ color: MODE.play, toneMapped: false, transparent: true });
  add(new THREE.ShapeGeometry(ring(rr(IS + .26, IS + .26, IR + .13), rr(IS + .13, IS + .13, IR + .065)), 48), ringMat, 0, 0, .008, island);
  const GLOW = .5, WHITE = new THREE.Color(0xffffff);
  const glowMat = new THREE.MeshBasicMaterial({ map: contourTexture(IS + .2, IR + .1, IS + 2.4, .08, .42), color: MODE.play, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: GLOW });
  add(new THREE.PlaneGeometry(IS + 2.4, IS + 2.4), glowMat, 0, 0, .012, island);

  // надпись на спинке
  const logoMat = shell(new THREE.MeshPhysicalMaterial({ color: 0xa7abb2, metalness: 1, roughness: .34, alphaMap: logoTexture(), transparent: true, alphaTest: .2 }));
  const logo = add(new THREE.PlaneGeometry(1.7, 1.7 / 4), logoMat, 0, -H / 2 + 2.4, -glassOut - .004); logo.rotation.y = Math.PI;

  // ---------- тумблер на левой грани, кнопки на правой, антенные вставки, порт и динамик
  add(new RoundedBoxGeometry(.06, 1.62, .34, 4, .03), dark, -W / 2 + .02, SWITCH_Y, 0);
  const knob = add(new RoundedBoxGeometry(.17, .52, .28, 5, .07), knobMat, -W / 2 - .035, SWITCH_Y, 0);
  const grooveMat = shell(new THREE.MeshStandardMaterial({ color: 0x5a3c00, roughness: .6 }));
  for (let k = -1; k <= 1; k++) add(new THREE.BoxGeometry(.012, .02, .2), grooveMat, -.083, k * .09, 0, knob);
  [[H / 2 - 4.1, 1.55], [H / 2 - 6.1, .9]].forEach(([y, len]) => add(new RoundedBoxGeometry(.12, len, .27, 5, .05), metal, W / 2 + .03, y, 0));
  [-1, 1].forEach(sx => [-1, 1].forEach(sy => {
    add(new THREE.BoxGeometry(.014, .035, D - 2 * EB), antenna, sx * (W / 2 - .004), sy * (H / 2 - 1.15), 0);
    add(new THREE.BoxGeometry(.035, .014, D - 2 * EB), antenna, sx * (W / 2 - 1.3), sy * (H / 2 - .004), 0);
  }));
  add(new RoundedBoxGeometry(.9, .06, .3, 4, .13), dark, 0, -H / 2 + .02, 0);
  const hole = new THREE.CylinderGeometry(.03, .03, .05, 16);
  for (let i = 0; i < 6; i++) add(hole, dark, 1.25 + i * .17, -H / 2 + .012, 0);
  add(hole, dark, -1.4, -H / 2 + .012, 0); add(hole, dark, -1.0, H / 2 - .012, 0); add(hole, dark, 1.6, H / 2 - .012, 0);

  // ---------- экран
  const screen = { mode: opts.mode || 'play', view: 'lock', time: '19:25', clock: '18:41', bat: 58 };
  const redraw = () => {
    drawScreen(sg, screen);
    sg.save();
    sg.globalCompositeOperation = 'destination-in'; roundRect(sg, 0, 0, SCR.w, SCR.h, 70); sg.fill();
    sg.globalCompositeOperation = 'destination-over'; sg.fillStyle = '#000'; sg.fillRect(0, 0, SCR.w, SCR.h);
    sg.globalCompositeOperation = 'source-over';
    sg.fillStyle = '#000'; sg.beginPath(); sg.arc(SCR.w / 2, 40, 14, 0, Math.PI * 2); sg.fill();
    sg.strokeStyle = 'rgba(60,64,72,.9)'; sg.lineWidth = 1.5; sg.stroke();
    sg.strokeStyle = '#000'; sg.lineWidth = 6; sg.strokeRect(0, 0, SCR.w, SCR.h);
    sg.restore();
    scrTex.needsUpdate = true;
  };

  // батарея для «рентгена»: 90% ячейками и НЗ-резерв 10% бирюзой
  const bat = new THREE.Group(); bat.visible = false; phone.add(bat);
  const batH = H - 7.0, batW = W - 1.7;
  const batMain = new THREE.Mesh(new RoundedBoxGeometry(batW, batH * .9, 0.44, 4, 0.1), new THREE.MeshBasicMaterial({ map: cellsTexture(), transparent: true, toneMapped: false }));
  batMain.position.y = -1.2 + batH * .05; bat.add(batMain);
  const batRes = new THREE.Mesh(new RoundedBoxGeometry(batW, batH * .1 - 0.06, 0.44, 4, 0.1), new THREE.MeshBasicMaterial({ color: MODE.focus, toneMapped: false, transparent: true }));
  batRes.position.y = -1.2 - batH * .45 + (batH * .1) / 2; bat.add(batRes);
  const batGlow = new THREE.Mesh(new THREE.PlaneGeometry(batW * 1.3, 2.2), new THREE.MeshBasicMaterial({ map: radialTexture([[0, .8], [1, 0]]), color: MODE.focus, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  batGlow.position.set(0, batRes.position.y, 0.3); bat.add(batGlow);

  // контуры для «рентгена»: корпус, экран и остров камер как на чертеже
  const lineMat = new THREE.LineBasicMaterial({ color: 0xd6e6f2, transparent: true, opacity: 0, depthWrite: false });
  const outline = new THREE.Group(); outline.visible = false; phone.add(outline);
  const loop = (shape, x, y, z, n = 48) => { const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(shape.getPoints(n)), lineMat); l.position.set(x, y, z); outline.add(l); };
  loop(rr(W, H, R), 0, 0, D / 2 - EB * .3); loop(rr(W, H, R), 0, 0, -D / 2 + EB * .3); loop(rr(dw, dh, gr - .1), 0, 0, glassOut + .01);
  loop(rr(IS, IS, IR), island.position.x, island.position.y, -glassOut - .02, 32);
  const batEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(batW, batH * .9, 0.44)), new THREE.LineBasicMaterial({ color: 0xaab4c0, transparent: true, opacity: 0 }));
  batEdges.position.copy(batMain.position); bat.add(batEdges);
  const resEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(batW, batH * .1 - 0.06, 0.44)), new THREE.LineBasicMaterial({ color: MODE.focus, transparent: true, opacity: 0 }));
  resEdges.position.copy(batRes.position); bat.add(resEdges);
  const labelTex = canvasTex(512, 720, (g) => { // подписи на батарее
    g.textAlign = 'center'; g.fillStyle = 'rgba(244,242,238,.95)'; g.font = '700 70px "Inter", sans-serif'; g.fillText('8 000 мА·ч', 256, 330);
    g.fillStyle = 'rgba(244,242,238,.7)'; g.font = '500 30px "Inter", sans-serif'; g.fillText('кремний-углеродный анод', 256, 385);
    g.fillStyle = '#34d3c1'; g.font = '700 31px "Inter", sans-serif'; g.fillText('НЗ 10%: на дорогу домой', 256, 628);
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(batW, batW * 720 / 512), new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false, toneMapped: false }));
  label.position.set(0, batRes.position.y + batW * 720 / 512 / 2 - 0.55, 0.26); bat.add(label);

  // ---------- состояние и анимация
  const POSES = {
    hero: { ry: Math.PI - 0.62, rx: 0.1, rz: 0.06, x: 0, y: 0, cam: 44, xray: 0, view: 'lock' },
    side: { ry: Math.PI / 2 + 0.52, rx: 0.08, rz: 0, x: 0, y: -SWITCH_Y + 0.6, cam: 22, xray: 0, view: 'off' },
    front: { ry: -0.32, rx: 0.06, rz: 0, x: 0, y: 0, cam: 42, xray: 0, view: 'digest' },
    xray: { ry: 0.28, rx: 0.1, rz: 0, x: 0, y: 0, cam: 42, xray: 1, view: 'off' },
    game: { ry: -0.22, rx: 0.12, rz: -Math.PI / 2, x: 0, y: 0, cam: 38, xray: 0, view: 'game' },
    back: { ry: Math.PI + 0.35, rx: 0.12, rz: 0.04, x: 0, y: 0, cam: 42, xray: 0, view: 'lock' },
  };
  const STEP_POSES = ['side', 'front', 'xray', 'game'];
  const st = { mode: opts.mode || 'play', pose: opts.pose || (opts.variant === 'hero' ? 'hero' : 'side'), cycle: opts.variant !== 'hero' && !opts.still };
  const cur = { ...POSES[st.pose], knob: KNOB[st.mode], color: new THREE.Color(MODE[st.mode]) };
  const tgtColor = new THREE.Color(MODE[st.mode]);
  let tgt = { ...POSES[st.pose] };
  screen.mode = st.mode; screen.view = tgt.view;
  redraw();

  let pointer = { x: 0, y: 0 }, pSmooth = { x: 0, y: 0 };
  const onPointer = (e) => { const r = container.getBoundingClientRect(); pointer.x = ((e.clientX - r.left) / r.width - .5) * 2; pointer.y = ((e.clientY - r.top) / r.height - .5) * 2; };
  if (opts.variant === 'hero' && !opts.still) container.addEventListener('pointermove', onPointer);

  let sizeW = 0, sizeH = 0;
  const resize = () => { // вызывается из кадра, поэтому новый размер и отрисовка попадают в один кадр без пустого буфера
    const w = container.clientWidth || 600, h = container.clientHeight || 600;
    if (w === sizeW && h === sizeH) return;
    sizeW = w; sizeH = h;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    cur.fitK = Math.max(1, 0.78 / Math.min(1, w / h)); // узкий кадр — отъезжаем дальше
  };
  resize();
  const ro = new ResizeObserver(() => { if (!running) { resize(); renderer.render(scene, camera); } }); ro.observe(container);

  let xrayOn = false;
  const setXray = (v) => {
    const on = v > .002;
    if (on !== xrayOn) { // прозрачность входит в шейдер: при переключении материалы пересобираются
      xrayOn = on;
      for (const m of shells) { m.transparent = on || !!m.userData.baseTransparent; m.needsUpdate = true; }
    }
    for (const m of shells) { const o = m.userData.baseOpacity ?? 1; m.opacity = on ? o * (1 - .86 * v) : o; m.depthWrite = v < .5; }
    ringMat.opacity = 1 - .7 * v; glowMat.opacity = GLOW * (1 - v); aoMat.opacity = .55 * (1 - v);
    bat.visible = v > .02; bat.children.forEach(c => { if (c.material) c.material.opacity = c.isLineSegments ? .8 * v : v; });
    outline.visible = v > .02; lineMat.opacity = .55 * v;
  };

  let t0 = performance.now(), running = false, raf = 0, cycleT = 0, visible = true;
  const cyc = ['play', 'life', 'focus'];
  function frame(now) {
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    const k = opts.still ? 1 : 1 - Math.exp(-dt * 4.5);
    for (const p of ['ry', 'rx', 'rz', 'x', 'y', 'cam', 'xray']) cur[p] += (tgt[p] - cur[p]) * k;
    cur.knob += (KNOB[st.mode] - cur.knob) * (opts.still ? 1 : 1 - Math.exp(-dt * 14));
    cur.color.lerp(tgtColor, opts.still ? 1 : 1 - Math.exp(-dt * 3.5));
    pSmooth.x += (pointer.x - pSmooth.x) * k; pSmooth.y += (pointer.y - pSmooth.y) * k;
    const idle = opts.still ? 0 : now / 1000;
    const sway = st.pose === 'hero' ? Math.sin(idle * .5) * .12 : Math.sin(idle * .6) * .04;
    phone.rotation.set(cur.rx + pSmooth.y * .12 + Math.sin(idle * .7) * .02, cur.ry + sway + pSmooth.x * .22, cur.rz);
    phone.position.set(cur.x, cur.y + Math.sin(idle * .9) * (st.pose === 'hero' ? .18 : .05), 0);
    camera.position.z = cur.cam * (cur.fitK || 1);
    knob.position.y = SWITCH_Y + cur.knob;
    ringMat.color.copy(cur.color).lerp(WHITE, .35); glowMat.color.copy(cur.color);
    setXray(cur.xray);
    if (st.cycle && st.pose === 'side' && !opts.still) {
      cycleT += dt; if (cycleT > 2.6) { cycleT = 0; const n = cyc[(cyc.indexOf(st.mode) + 1) % 3]; api.setMode(n); }
    }
    resize();
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }
  const start = () => { if (running || opts.still) return; running = true; t0 = performance.now(); raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  // requestAnimationFrame сам засыпает в фоновой вкладке, поэтому останавливаемся только вне экрана
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible ? start() : stop(); }, { rootMargin: '100px' });
  if (!opts.still) io.observe(container);

  const api = {
    setMode(m) {
      if (!MODE[m]) return; st.mode = m; screen.mode = m; tgtColor.setHex(MODE[m]);
      if (container.style) container.style.setProperty('--mode', `var(--${m})`);
      redraw(); opts.onMode?.(m);
    },
    setPose(name) {
      if (!POSES[name]) return; st.pose = name; tgt = { ...POSES[name] };
      if (screen.view !== tgt.view) { screen.view = tgt.view; redraw(); }
      if (name === 'game' && st.mode !== 'play') api.setMode('play');
      if (name === 'xray' && st.mode !== 'focus') api.setMode('focus');
      if (name === 'front' && st.mode !== 'focus') api.setMode('focus');
    },
    setStep(i) { st.cycle = i === 0; api.setPose(STEP_POSES[i] || 'side'); },
    setScreen(patch) { Object.assign(screen, patch); redraw(); },
    renderOnce() { for (let i = 0; i < 3; i++) frame(performance.now()); return canvas; },
    state() { return { pose: st.pose, mode: st.mode, xray: +cur.xray.toFixed(2), cam: +cur.cam.toFixed(1), running, visible, view: screen.view }; },
    dispose() { stop(); ro.disconnect(); io.disconnect(); renderer.dispose(); },
    canvas,
  };
  api.setMode(st.mode);
  if (opts.still) api.renderOnce(); else start();
  requestAnimationFrame(() => container.classList.add('ready'));
  return api;
}
