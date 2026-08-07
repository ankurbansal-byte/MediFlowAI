import time
from playwright.sync_api import sync_playwright

def capture_pitch_hero_v2():
    print("🚀 Capturing Doc2Me Pitch Hero V2 Dark...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        # Single screen viewport
        page.set_viewport_size({"width": 1440, "height": 900})

        try:
            page.goto("http://localhost:3000/design-preview/doc2me-pitch-hero-v2-dark")
            time.sleep(3) # allow animations and transitions to settle

            screenshot_path = "/home/jules/verification/doc2me_pitch_hero_v2_dark.png"
            page.screenshot(path=screenshot_path)
            print(f"✅ Captured successfully at {screenshot_path}!")
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    capture_pitch_hero_v2()
