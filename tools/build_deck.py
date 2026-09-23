"""Презентация: deck/index.html → assets/iqoo-flow-presentation.pdf и PNG-слайды в media/.

Запуск (локальный сервер из корня сайта на :8791, Google Chrome):
  python tools/build_deck.py
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = 'http://localhost:8791/deck/'
PNG = {1: 'slide-01-title', 4: 'slide-04-solution', 5: 'slide-05-scenario', 6: 'slide-06-scenario', 9: 'slide-09-price'}

async def main():
    (ROOT / 'media').mkdir(exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome')
        # окно выше слайда: если слайд ровно в размер окна, нижняя полоса при съёмке элемента выпадает из кадра
        pg = await b.new_page(viewport={'width': 1920, 'height': 1200}, device_scale_factor=1)
        await pg.goto(URL, wait_until='networkidle')
        await pg.wait_for_function('window.__ready === true', timeout=30000)
        await pg.wait_for_timeout(800)
        slides = pg.locator('section.slide')
        n = await slides.count()
        for i in range(n):
            if i + 1 in PNG:
                await slides.nth(i).screenshot(path=str(ROOT / 'media' / f'{PNG[i + 1]}.png'))
        await pg.emulate_media(media='print')
        await pg.pdf(path=str(ROOT / 'assets' / 'iqoo-flow-presentation.pdf'), width='1920px', height='1080px', print_background=True,
                     margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'})
        print('slides:', n)
        await b.close()
    stamp(ROOT / 'assets' / 'iqoo-flow-presentation.pdf')


def stamp(path):
    """Метаданные PDF: название и тема вместо служебных полей браузера."""
    from pypdf import PdfReader, PdfWriter
    r = PdfReader(str(path)); w = PdfWriter(clone_from=r)
    producer = (r.metadata or {}).get('/Producer', 'Skia/PDF')
    w.add_metadata({'/Title': 'iQOO Flow — концепт смартфона для молодого поколения', '/Subject': 'Смарт Кон iQOO 2026, второй этап',
                    '/Keywords': 'iQOO, смартфон, концепт, Смарт Кон', '/Creator': 'Google Chrome', '/Producer': producer})
    w.compress_identical_objects()
    with open(path, 'wb') as f:
        w.write(f)

asyncio.run(main())
