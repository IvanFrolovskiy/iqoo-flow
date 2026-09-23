"""Видео с прокруткой сайта (около полутора минут): главы, сценарий и интерактив.

Запуск: python tools/record_tour.py [url]  (по умолчанию живой сайт)
Нужны Playwright, Google Chrome и ffmpeg с libx264 (например, из пакета imageio-ffmpeg).
Результат: media/iqoo-flow-tour.mp4
"""
import asyncio
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = sys.argv[1] if len(sys.argv) > 1 else 'https://ivanfrolovskiy.github.io/iqoo-flow/'
W, H = 1280, 720

SMOOTH = """window.__glide = (y, ms) => new Promise(res => {
  const y0 = scrollY, t0 = performance.now(), e = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
  const f = now => { const k = Math.min(1, (now - t0) / ms); window.scrollTo(0, y0 + (y - y0) * e(k)); k < 1 ? requestAnimationFrame(f) : res(); };
  requestAnimationFrame(f); });
window.__stepY = (key, i) => { const s = document.querySelectorAll(`[data-scrolly=${key}] .step`)[i]; const r = s.getBoundingClientRect();
  return r.top + scrollY - innerHeight * .49 + r.height / 2 - 40; };
window.__idY = (id) => document.getElementById(id).getBoundingClientRect().top + scrollY - 70; 0"""


async def main():
    tmp = Path(tempfile.mkdtemp())
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1,
                                  record_video_dir=str(tmp), record_video_size={'width': W, 'height': H})
        pg = await ctx.new_page()
        await pg.goto(URL, wait_until='networkidle')
        await pg.evaluate("document.documentElement.style.scrollBehavior='auto'")
        await pg.evaluate(SMOOTH)
        await pg.wait_for_timeout(4200)  # герой: кольцо меняет цвет вместе с режимом

        async def glide(expr, ms=1300, hold=1300):
            y = await pg.evaluate(expr)
            await pg.evaluate(f'__glide({y}, {ms})')
            await pg.wait_for_timeout(hold)

        await glide("__idY('problem')", 1400, 900)
        for i in range(4):
            await glide(f"__stepY('ctx', {i})", 950, 1150)
        for i in (0, 3):
            await glide(f"__stepY('cost', {i})", 1100, 1300)
        await glide("__stepY('ins', 2)", 1200, 1700)
        await glide("__idY('device')", 1200, 900)
        for i in range(4):
            await glide(f"__stepY('dev', {i})", 1050, 1700)
        await glide("__idY('scenario')", 1200, 1500)
        for i in range(7):
            await glide(f"__stepY('scn', {i})", 850, 1350)
        await glide("__idY('outcome')", 1000, 1600)
        await glide("document.querySelector('.demo').getBoundingClientRect().top + scrollY - 76", 1300, 2200)
        tap = lambda sel: pg.evaluate(f"document.querySelector('{sel}').click()")  # без автопрокрутки к кнопке
        await tap('#switcher [data-mode=focus]'); await pg.wait_for_timeout(3200)
        await tap('#switcher [data-mode=play]'); await pg.wait_for_timeout(2600)
        await tap('#demo-digest'); await pg.wait_for_timeout(2600)
        await glide("__idY('tech')", 1200, 1500)
        await glide("__idY('price')", 1200, 2200)
        await glide("__idY('launch')", 1100, 1600)
        await glide("document.documentElement.scrollHeight", 1400, 1500)
        video = await pg.video.path()
        await ctx.close(); await b.close()
    out = ROOT / 'media' / 'iqoo-flow-tour.mp4'
    ff = shutil.which('ffmpeg')
    if not ff:
        import imageio_ffmpeg
        ff = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ff, '-y', '-loglevel', 'error', '-i', video, '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
                    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', str(out)], check=True)
    print(out, out.stat().st_size)


asyncio.run(main())
