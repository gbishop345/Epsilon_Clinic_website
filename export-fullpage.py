#!/usr/bin/env python3
"""
Full-page website capture — one continuous high-res PNG per active design.

Starts local servers for designs A–E, captures, then stops them.
"""

from __future__ import annotations

import base64
import io
import signal
import subprocess
import time
import urllib.request
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

DESIGNS = [
    ("design-a", 8080, "Epsilon-Clinic-Design-A"),
    ("design-b", 8081, "Epsilon-Clinic-Design-B"),
    ("design-c", 8082, "Epsilon-Clinic-Design-C"),
    ("design-d", 8083, "Epsilon-Clinic-Design-D"),
    ("design-e", 8084, "Epsilon-Clinic-Design-E"),
]


def wait_for_url(url: str, timeout: float = 15.0) -> None:
    deadline = time.time() + timeout
    last_err: Exception | None = None
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1.5) as resp:
                if resp.status == 200:
                    return
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            time.sleep(0.2)
    raise RuntimeError(f"Server not ready at {url}: {last_err}")


def start_servers() -> list[subprocess.Popen]:
    procs: list[subprocess.Popen] = []
    for folder, port, _name in DESIGNS:
        directory = ROOT / folder
        proc = subprocess.Popen(
            ["python3", "-m", "http.server", str(port), "--bind", "127.0.0.1"],
            cwd=str(directory),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        procs.append(proc)
        wait_for_url(f"http://127.0.0.1:{port}/")
    return procs


def stop_servers(procs: list[subprocess.Popen]) -> None:
    for proc in procs:
        try:
            os_kill_group(proc)
        except ProcessLookupError:
            pass
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            os_kill_group(proc, force=True)
            proc.wait(timeout=3)


def os_kill_group(proc: subprocess.Popen, force: bool = False) -> None:
    sig = signal.SIGKILL if force else signal.SIGTERM
    try:
        import os

        os.killpg(proc.pid, sig)
    except ProcessLookupError:
        if proc.poll() is None:
            proc.kill()


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

    procs = start_servers()
    driver = None
    try:
        driver = make_driver()
        for _folder, port, name in DESIGNS:
            capture_full_page(driver, f"http://127.0.0.1:{port}/", name)
    finally:
        if driver is not None:
            driver.quit()
        stop_servers(procs)


if __name__ == "__main__":
    main()
