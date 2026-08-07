import asyncio
from playwright.async_api import async_playwright
import sys
import subprocess
import time

async def capture_screenshot():
    print("Launching dev server...")
    # Start dev server in background
    dev_server = subprocess.Popen(["bun", "run", "dev"], cwd="frontend", stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(3) # Wait for Vite to boot up

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        # Route directly to the new Sunrise design preview
        url = "http://localhost:5173/design-preview/doc2me-pitch-hero-v4-sunrise"
        print(f"Opening {url}...")
        try:
            await page.goto(url, timeout=15000)
            await page.wait_for_timeout(4000) # Wait for radial glows, typography, cards to render

            # Take a high quality full-screen viewport capture
            screenshot_path = "/home/jules/verification/doc2me_pitch_hero_v4_sunrise.png"
            await page.screenshot(path=screenshot_path)
            print(f"Screenshot captured at: {screenshot_path}")
        except Exception as e:
            print(f"Error during capture: {e}")
            sys.exit(1)
        finally:
            await browser.close()
            dev_server.terminate()

if __name__ == "__main__":
    asyncio.run(capture_screenshot())
