// Сценарий «Делу — время, потехе — час»: шаги прокрутки переключают режим и экран 2D-телефона.
import { $, scrolly } from './core.js';
import { createPhone, SCENES } from './phone.js';

export function initScenario() {
  const host = $('#scn-phone');
  const section = document.querySelector('[data-scrolly="scn"]');
  if (!host || !section) return;
  const phone = createPhone(host, { labels: true });
  let shown = -1;
  const go = (i) => {
    if (i === shown) return;
    const first = shown < 0;
    shown = i;
    const s = SCENES[i];
    phone.setMode(s.mode);
    phone.show(s.html(), { instant: first, mode: s.mode });
  };
  scrolly(section, go);
}
