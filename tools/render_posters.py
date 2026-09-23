"""Постеры 3D-модели для запасного показа без WebGL, OG-картинки и презентации.

Запуск (нужен локальный сервер из корня сайта на :8791 и Google Chrome):
  python tools/render_posters.py
Кадры снимаются со страницы tools/render.html с прозрачным фоном.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'img'
BASE = 'http://localhost:8791/tools/render.html'
SHOTS = [  # имя, поза, режим, ширина, высота
    ('flow-hero', 'hero', 'play', 900, 970),
    ('flow-side', 'side', 'play', 900, 900),
    ('flow-front', 'front', 'focus', 900, 900),
    ('flow-xray', 'xray', 'focus', 900, 900),
    ('flow-game', 'game', 'play', 1300, 900),
    ('flow-back-focus', 'hero', 'focus', 900, 970),
    ('flow-back-life', 'hero', 'life', 900, 970),
]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'])
        for name, pose, mode, w, h in SHOTS:
            pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
            await pg.goto(f'{BASE}?pose={pose}&mode={mode}&w={w}&h={h}')
            await pg.wait_for_function('window.__ready === true', timeout=30000)
            await pg.wait_for_timeout(300)
            await pg.locator('#v').screenshot(path=str(OUT / f'{name}.png'), omit_background=True)
            await pg.close()
            print('ok', name)
        await b.close()

asyncio.run(main())
