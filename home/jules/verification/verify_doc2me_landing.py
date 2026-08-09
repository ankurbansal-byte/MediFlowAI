import time
import sys
from playwright.sync_api import sync_playwright, expect

def run_verification():
    print("\n🚀 Starting E2E verification for Doc2Me Public Landing Page Integration...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # Set a high-resolution viewport for premium visual presentation
            page.set_viewport_size({"width": 1440, "height": 1800})

            # 1. Navigate to the root route
            print("🌐 Navigating to root landing page http://localhost:5173/...")
            page.goto("http://localhost:5173/")
            time.sleep(2) # wait for assets and animations to load

            # 2. Capture the landing page screenshot
            screenshot_path = "home/jules/verification/doc2me_landing_root.png"
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"📸 Captured landing page screenshot at {screenshot_path}")

            # 3. Verify that the hero title is present
            expect(page.locator("h1.giant-hero-title").first).to_be_visible()
            print("✅ Verified giant hero title is visible.")

            # 4. Click the 'Login' navigation CTA
            print("🖱️ Clicking 'Login' navigation CTA...")
            login_btn = page.locator("button:has-text('Login')").first
            login_btn.click()
            time.sleep(1) # wait for transition

            # 5. Confirm URL changes to view=login
            current_url = page.url
            print(f"🔗 Current browser URL: {current_url}")
            assert "view=login" in current_url, f"Expected 'view=login' in URL, got {current_url}"
            print("✅ Verified URL contains 'view=login'")

            # 6. Confirm that the Hospital Portal card is visible on the login screen
            expect(page.locator("text=Hospital Portal").first).to_be_visible()
            print("✅ Verified login screen with Portal Selector is visible.")

            # 7. Take screenshot of the transition success
            login_screenshot_path = "home/jules/verification/doc2me_landing_to_login.png"
            page.screenshot(path=login_screenshot_path)
            print(f"📸 Captured login transition screenshot at {login_screenshot_path}")

            print("\n🏁 Integration verification completed successfully!")

        except Exception as e:
            print(f"❌ Error encountered during E2E verification: {e}")
            page.screenshot(path="home/jules/verification/landing_integration_error.png")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
