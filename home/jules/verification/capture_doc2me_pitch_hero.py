import time
from playwright.sync_api import sync_playwright

def capture_pitch_hero():
    print("🚀 Capturing Doc2Me Pitch Hero V1...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        # Single screen viewport
        page.set_viewport_size({"width": 1440, "height": 900})

        try:
            page.goto("http://localhost:3000/design-preview/doc2me-pitch-hero-v1")
            time.sleep(3) # allow animations to settle

            screenshot_path = "/home/jules/verification/doc2me_pitch_hero_v1.png"
            page.screenshot(path=screenshot_path)
            print(f"✅ Captured successfully at {screenshot_path}!")
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    capture_pitch_hero()
