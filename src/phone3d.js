// 3D-модель iQOO Flow: корпус, тумблер на левой грани, остров камер со световым кольцом режима,
// экран с живым интерфейсом и «рентген» батареи с НЗ-зарядом. Собирается в assets/js/phone3d.js (tools/build3d.sh).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 7.4, H = 15.8, D = 0.82, R = 1.05, BEV = 0.17;
const MODE = { play: 0xf0b419, life: 0xede7da, focus: 0x34d3c1 };
const KNOB = { play: 0.56, life: 0, focus: -0.56 };
const SWITCH_Y = H / 2 - 3.5;

function rr(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
function flat(shape, w, h, seg = 48) { // плоская фигура с нормализованными UV
  const g = new THREE.ShapeGeometry(shape, seg), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  uv.needsUpdate = true;
  return g;
}
function radialTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, a]) => grd.addColorStop(o, `rgba(255,255,255,${a})`));
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function backTexture() { // матовое стекло: лёгкий вертикальный градиент и надпись
  const c = document.createElement('canvas'); c.width = 512; c.height = 1100;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 512, 1100);
  grd.addColorStop(0, '#34363d'); grd.addColorStop(.5, '#1b1c21'); grd.addColorStop(1, '#26282e');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 1100);
  g.globalAlpha = .05; for (let x = 0; x < 512; x += 6) { g.fillStyle = x % 12 ? '#fff' : '#000'; g.fillRect(x, 0, 2, 1100); }
  g.globalAlpha = .55; g.fillStyle = '#c9c9d0'; g.font = '600 34px "Unbounded", sans-serif'; g.textAlign = 'center';
  g.fillText('iQOO', 256, 930);
  g.globalAlpha = .35; g.font = '500 17px "JetBrains Mono", monospace'; g.fillText('FLOW', 256, 962);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---------- экран
const SCR = { w: 640, h: 1430 };
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1.05;
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(6, 10, 12); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe7b0, 1.1); rim.position.set(-10, 4, -8); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xbfe9ff, .5); fill.position.set(-6, -8, 10); scene.add(fill);

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
  camera.position.set(0, 0, 44);

  try { await Promise.all(['600 40px "Unbounded"', '600 30px "Inter"', '400 30px "Inter"', '600 26px "JetBrains Mono"'].map(f => document.fonts.load(f, 'АБВ 123'))); } catch (e) { /* шрифты подгрузятся позже */ }

  const phone = new THREE.Group(); scene.add(phone);
  const shells = []; // материалы корпуса, которые прозрачнеют в режиме «рентген»
  const shell = (m) => { shells.push(m); m.userData.baseOpacity = m.opacity ?? 1; m.userData.baseTransparent = m.transparent; return m; };

  // корпус с металлической скруглённой рамкой
  const bodyGeo = new THREE.ExtrudeGeometry(rr(W - 2 * BEV, H - 2 * BEV, R - BEV), { depth: D - 2 * BEV, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 12, curveSegments: 64 });
  bodyGeo.translate(0, 0, -(D - 2 * BEV) / 2);
  const frameMat = shell(new THREE.MeshPhysicalMaterial({ color: 0x8a8d95, metalness: 1, roughness: .22, clearcoat: .5, clearcoatRoughness: .15 }));
  phone.add(new THREE.Mesh(bodyGeo, frameMat));

  // задняя панель: матовое стекло
  const bw = W - 2 * BEV - 0.03, bh = H - 2 * BEV - 0.03;
  const backMat = shell(new THREE.MeshPhysicalMaterial({ map: backTexture(), roughness: .36, metalness: .2, clearcoat: 1, clearcoatRoughness: .22 }));
  const back = new THREE.Mesh(flat(rr(bw, bh, R - BEV), bw, bh), backMat);
  back.position.z = -D / 2 - 0.004; back.rotation.y = Math.PI; phone.add(back);

  // лицевая сторона: чёрное стекло и активная область экрана
  const frontMat = shell(new THREE.MeshPhysicalMaterial({ color: 0x030304, roughness: .06, metalness: .1, clearcoat: 1, clearcoatRoughness: .04 }));
  const front = new THREE.Mesh(flat(rr(bw, bh, R - BEV), bw, bh), frontMat); front.position.z = D / 2 + 0.004; phone.add(front);
  const sc = document.createElement('canvas'); sc.width = SCR.w; sc.height = SCR.h;
  const sg = sc.getContext('2d');
  const scrTex = new THREE.CanvasTexture(sc); scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = 8;
  const dw = bw - 0.26, dh = bh - 0.26;
  const scrMat = shell(new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false, transparent: true }));
  const display = new THREE.Mesh(flat(rr(dw, dh, R - BEV - 0.1), dw, dh, 64), scrMat); display.position.z = D / 2 + 0.006; phone.add(display);
  const punch = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), shell(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true })));
  punch.position.set(0, dh / 2 - 0.45, D / 2 + 0.008); phone.add(punch);

  // остров камер (на спине — у правой, если смотреть на экран, грани)
  const iw = 2.55, ih = 4.5, ir = 1.2;
  const island = new THREE.Group(); island.position.set(W / 2 - BEV - 0.42 - iw / 2, H / 2 - BEV - 0.42 - ih / 2, -D / 2 - 0.004); phone.add(island);
  const isGeo = new THREE.ExtrudeGeometry(rr(iw - 0.08, ih - 0.08, ir - 0.04), { depth: 0.1, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 6, curveSegments: 48 });
  isGeo.rotateY(Math.PI);
  const isMat = shell(new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: .1, metalness: .3, clearcoat: 1, clearcoatRoughness: .05 }));
  island.add(new THREE.Mesh(isGeo, isMat));
  const ringShape = rr(iw + 0.46, ih + 0.46, ir + 0.23); ringShape.holes.push(rr(iw + 0.08, ih + 0.08, ir + 0.04));
  const ringMat = new THREE.MeshBasicMaterial({ color: MODE.play, toneMapped: false, transparent: true });
  const ring = new THREE.Mesh(new THREE.ShapeGeometry(ringShape, 64), ringMat); ring.rotation.y = Math.PI; ring.position.z = -0.003; island.add(ring);
  const glowMat = new THREE.MeshBasicMaterial({ map: radialTexture([[0, .9], [.35, .35], [1, 0]]), color: MODE.play, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: .9 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(iw * 3.0, ih * 2.1), glowMat); glow.rotation.y = Math.PI; glow.position.z = -0.02; island.add(glow);
  const lensRing = new THREE.MeshPhysicalMaterial({ color: 0xb4b6bd, metalness: 1, roughness: .18 });
  const lensGlass = new THREE.MeshPhysicalMaterial({ color: 0x040406, metalness: .4, roughness: .02, clearcoat: 1, clearcoatRoughness: 0, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [200, 600] });
  const lensCore = new THREE.MeshPhysicalMaterial({ color: 0x0b1030, metalness: .2, roughness: .05, clearcoat: 1, iridescence: .8 });
  [lensRing, lensGlass, lensCore].forEach(shell);
  [[1.05, .86], [-1.05, .78]].forEach(([y, r]) => {
    const g = new THREE.Group(); g.position.set(0, y, -0.16);
    const c1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .16, 72), lensRing); c1.rotation.x = Math.PI / 2; g.add(c1);
    const c2 = new THREE.Mesh(new THREE.CylinderGeometry(r * .82, r * .82, .18, 72), lensGlass); c2.rotation.x = Math.PI / 2; c2.position.z = -0.01; g.add(c2);
    const c3 = new THREE.Mesh(new THREE.CircleGeometry(r * .36, 48), lensCore); c3.rotation.y = Math.PI; c3.position.z = -0.105; g.add(c3);
    island.add(g);
  });
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), shell(new THREE.MeshPhysicalMaterial({ color: 0xfff1c9, roughness: .3, emissive: 0x332a10 })));
  flash.rotation.y = Math.PI; flash.position.set(-iw / 2 - 0.55, ih / 2 - 0.55, -0.008); island.add(flash);

  // тумблер на левой грани и кнопки на правой
  const slotMat = shell(new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: .7 }));
  const slot = new THREE.Mesh(new RoundedBoxGeometry(0.1, 1.75, 0.36, 4, 0.04), slotMat); slot.position.set(-W / 2 + 0.02, SWITCH_Y, 0); phone.add(slot);
  const knobMat = shell(new THREE.MeshPhysicalMaterial({ color: 0xf0b419, metalness: .75, roughness: .3, clearcoat: .6, emissive: 0x3b2500, emissiveIntensity: .6 }));
  const knob = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.56, 0.3, 4, 0.07), knobMat); knob.position.set(-W / 2 - 0.035, SWITCH_Y, 0); phone.add(knob);
  for (let k = -1; k <= 1; k++) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.025, 0.24), shell(new THREE.MeshStandardMaterial({ color: 0x8a5d00, roughness: .5 }))); g.position.set(0, k * 0.1, 0); knob.add(g); }
  [[H / 2 - 4.1, 1.6], [H / 2 - 6.15, 0.95]].forEach(([y, len]) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.14, len, 0.26, 4, 0.06), frameMat); b.position.set(W / 2 + 0.02, y, 0); phone.add(b);
  });
  const port = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.08, 0.3, 4, 0.13), slotMat); port.position.set(0, -H / 2 + 0.02, 0); phone.add(port);

  // батарея для «рентгена»: 90% серым и НЗ-резерв 10% бирюзой
  const bat = new THREE.Group(); bat.visible = false; phone.add(bat);
  const batH = H - 7.0, batW = W - 1.7;
  const batMain = new THREE.Mesh(new RoundedBoxGeometry(batW, batH * .9, 0.46, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x4a4f5a, roughness: .45, metalness: .5, emissive: 0x151820, transparent: true }));
  batMain.position.y = -1.2 + batH * .05; bat.add(batMain);
  const batRes = new THREE.Mesh(new RoundedBoxGeometry(batW, batH * .1 - 0.06, 0.46, 4, 0.12), new THREE.MeshBasicMaterial({ color: MODE.focus, toneMapped: false, transparent: true }));
  batRes.position.y = -1.2 - batH * .45 + (batH * .1) / 2; bat.add(batRes);
  const batGlow = new THREE.Mesh(new THREE.PlaneGeometry(batW * 1.3, 2.2), new THREE.MeshBasicMaterial({ map: radialTexture([[0, .8], [1, 0]]), color: MODE.focus, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  batGlow.position.set(0, batRes.position.y, 0.3); bat.add(batGlow);

  // контуры для «рентгена»: корпус, экран и остров камер как на чертеже
  const lineMat = new THREE.LineBasicMaterial({ color: 0xd6e6f2, transparent: true, opacity: 0, depthWrite: false });
  const outline = new THREE.Group(); outline.visible = false; phone.add(outline);
  const loop = (shape, z, n = 96) => { const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(shape.getPoints(n)), lineMat); l.position.z = z; outline.add(l); };
  loop(rr(W, H, R), D / 2 - BEV * .3); loop(rr(W, H, R), -D / 2 + BEV * .3); loop(rr(dw, dh, R - BEV - 0.1), D / 2 + 0.01);
  const isl = island.position; const il = rr(iw + 0.46, ih + 0.46, ir + 0.23);
  const ilLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(il.getPoints(64)), lineMat); ilLine.position.set(isl.x, isl.y, -D / 2 - 0.02); outline.add(ilLine);
  const batEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(batW, batH * .9, 0.46)), new THREE.LineBasicMaterial({ color: 0xaab4c0, transparent: true, opacity: 0 }));
  batEdges.position.copy(batMain.position); bat.add(batEdges);
  const resEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(batW, batH * .1 - 0.06, 0.46)), new THREE.LineBasicMaterial({ color: MODE.focus, transparent: true, opacity: 0 }));
  resEdges.position.copy(batRes.position); bat.add(resEdges);
  const labelTex = (() => { // подписи на батарее
    const c = document.createElement('canvas'); c.width = 512; c.height = 720; const g = c.getContext('2d');
    g.textAlign = 'center'; g.fillStyle = 'rgba(244,242,238,.92)'; g.font = '700 70px "Inter", sans-serif'; g.fillText('8 000 мА·ч', 256, 330);
    g.fillStyle = 'rgba(244,242,238,.6)'; g.font = '500 30px "Inter", sans-serif'; g.fillText('кремний-углеродный анод', 256, 385);
    g.fillStyle = '#34d3c1'; g.font = '700 31px "Inter", sans-serif'; g.fillText('НЗ 10%: на дорогу домой', 256, 628);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
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
  const screen = { mode: st.mode, view: tgt.view, time: '19:25', clock: '18:41', bat: 58 };
  const redraw = () => { drawScreen(sg, screen); scrTex.needsUpdate = true; };
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

  const setXray = (v) => {
    const on = v > .002;
    for (const m of shells) { const o = m.userData.baseOpacity ?? 1; m.transparent = on || m.userData.baseTransparent; m.opacity = on ? o * (1 - .86 * v) : o; m.depthWrite = v < .5; }
    ringMat.opacity = 1 - .7 * v; glowMat.opacity = .9 * (1 - v);
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
    ringMat.color.copy(cur.color); glowMat.color.copy(cur.color);
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
