"""OG-картинка 1200×630 для превью ссылки: tools/og.html → assets/img/og.png (нужен сервер на :8791)."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome')
        pg = await b.new_page(viewport={'width': 1200, 'height': 630})
        await pg.goto('http://localhost:8791/tools/og.html', wait_until='networkidle')
        await pg.wait_for_function('window.__ready === true')
        await pg.wait_for_timeout(300)
        await pg.locator('#og').screenshot(path=str(ROOT / 'assets' / 'img' / 'og.png'))
        await b.close()
asyncio.run(main())
