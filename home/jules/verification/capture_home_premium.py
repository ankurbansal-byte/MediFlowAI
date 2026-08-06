import time
import sys
from playwright.sync_api import sync_playwright

def capture_homepage():
    print("🚀 Capturing Doc2Me Home Premium...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.set_viewport_size({"width": 1440, "height": 7500})

        try:
            page.goto("http://localhost:3000/design-preview/doc2me-home-premium")
            time.sleep(3) # allow images to load

            page.screenshot(path="/home/jules/verification/doc2me_home_premium_before.png", full_page=True)
            print("✅ Captured successfully!")
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    capture_homepage()
