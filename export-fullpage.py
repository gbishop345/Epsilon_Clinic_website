#!/usr/bin/env python3
"""
Full-page website capture — one continuous high-res PNG per design
(same format as a long-scroll design export).
"""

from __future__ import annotations

import base64
import io
import time
from pathlib import Path

from PIL import Image
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "exports"
OUT.mkdir(exist_ok=True)

WIDTH = 1440
SCALE = 2
# Chrome texture limit is ~16384px; stay under at device pixels
MAX_DEVICE_PX = 15000

PAGES = [
    ("http://127.0.0.1:8080/", "Epsilon-Clinic-Design-A"),
    ("http://127.0.0.1:8081/", "Epsilon-Clinic-Design-B"),
]


def make_driver() -> webdriver.Chrome:
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--hide-scrollbars")
    options.add_argument("--font-render-hinting=none")
    options.add_argument(f"--window-size={WIDTH},900")
    options.binary_location = (
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    )
    return webdriver.Chrome(options=options)


def prepare_page(driver: webdriver.Chrome) -> None:
    driver.execute_script(
        """
        var header = document.querySelector('.site-header, header');
        if (header) {
          header.style.position = 'absolute';
          header.style.top = '0';
          header.style.left = '0';
          header.style.right = '0';
          header.classList.remove('is-scrolled');
        }
        document.querySelectorAll('.reveal').forEach(function (el) {
          el.classList.add('is-in');
          el.style.opacity = '1';
          el.style.transform = 'none';
        });
        var style = document.createElement('style');
        style.textContent = '* { animation: none !important; transition: none !important; }';
        document.head.appendChild(style);
        window.scrollTo(0, 0);
        """
    )


def screenshot_clip(driver: webdriver.Chrome, x: float, y: float, w: float, h: float) -> Image.Image:
    result = driver.execute_cdp_cmd(
        "Page.captureScreenshot",
        {
            "format": "png",
            "fromSurface": True,
            "captureBeyondViewport": True,
            "clip": {"x": x, "y": y, "width": w, "height": h, "scale": 1},
        },
    )
    return Image.open(io.BytesIO(base64.b64decode(result["data"]))).convert("RGB")


def capture_full_page(driver: webdriver.Chrome, url: str, name: str) -> Path:
    driver.get(url)
    WebDriverWait(driver, 25).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )
    time.sleep(2.0)
    prepare_page(driver)
    time.sleep(0.3)

    driver.execute_cdp_cmd(
        "Emulation.setDeviceMetricsOverride",
        {
            "width": WIDTH,
            "height": 900,
            "deviceScaleFactor": SCALE,
            "mobile": False,
        },
    )
    time.sleep(0.5)

    metrics = driver.execute_cdp_cmd("Page.getLayoutMetrics", {})
    size = metrics.get("cssContentSize") or metrics.get("contentSize")
    width = float(size["width"])
    height = float(size["height"])

    max_css_tile = MAX_DEVICE_PX / SCALE
    tiles: list[Image.Image] = []
    y = 0.0
    while y < height - 0.5:
        tile_h = min(max_css_tile, height - y)
        tiles.append(screenshot_clip(driver, 0, y, width, tile_h))
        y += tile_h

    if len(tiles) == 1:
        final = tiles[0]
    else:
        total_h = sum(t.size[1] for t in tiles)
        final = Image.new("RGB", (tiles[0].size[0], total_h))
        offset = 0
        for tile in tiles:
            final.paste(tile, (0, offset))
            offset += tile.size[1]

    out_path = OUT / f"{name}.png"
    final.save(out_path, "PNG", optimize=True)
    mb = out_path.stat().st_size / (1024 * 1024)
    print(
        f"✓ {out_path.name}  {width:.0f}×{height:.0f} css  "
        f"→ {final.size[0]}×{final.size[1]}px  ({mb:.1f} MB, {len(tiles)} tile(s))"
    )
    return out_path


def main() -> None:
    for old in OUT.glob("*"):
        if old.is_file():
            old.unlink()

    driver = make_driver()
    try:
        for url, name in PAGES:
            capture_full_page(driver, url, name)
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
