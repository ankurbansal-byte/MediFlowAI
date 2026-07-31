import time
import sys
import subprocess
from playwright.sync_api import sync_playwright

def run_verification():
    print("\n🚀 Starting E2E verification for Profile and Settings V5.2...")

    # Start services in the background if they aren't already running, but since we're in a sandbox,
    # let's assume they might be running. We'll attempt a connection, but first let's launch them or make sure they're running.

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        try:
            # Set high-resolution viewport
            page.set_viewport_size({"width": 1280, "height": 1600})

            # ==========================================
            # Step 1: Login as Patient PAT-110
            # ==========================================
            print("\n👤 1. Navigating to Login Page...")
            page.goto("http://localhost:5173")

            page.wait_for_selector("text=Access Portals")
            page.click("text=Access Portals")

            page.wait_for_selector("text=Access Patient Portal")
            page.click("text=Access Patient Portal")

            print("👤 2. Logging in as Patient PAT-110...")
            page.wait_for_selector("#pat-username")
            page.fill("#pat-username", "PAT-110")
            page.fill("#pat-password", "password")
            page.click("button.portal-submit-btn.patient-btn")

            # Wait for Patient Dashboard
            page.wait_for_selector("aside.sidebar", timeout=15000)
            print("✅ Logged in successfully as Patient PAT-110!")

            # ==========================================
            # Step 2: Navigate to V5.2 Profile Route
            # ==========================================
            print("\n🚀 Navigating to V5.2 Profile Route (/design-preview/profile-v5-2)...")
            page.goto("http://localhost:5173/design-preview/profile-v5-2")

            # Wait for V5.2 elements
            page.wait_for_selector(".v52-profile-canvas", timeout=15000)
            print("✅ Profile V5.2 is active!")

            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(2.0)

            # Capture Profile V5.2 Full page
            print("📸 Capturing V5.2 Profile full-page screenshot...")
            page.screenshot(path="/home/jules/verification/v5_2_profile.png", full_page=True)
            print("📸 Captured /home/jules/verification/v5_2_profile.png successfully!")

            # Click Edit Profile button
            print("✏️ Clicking on 'Edit Details' button...")
            page.click("text=Edit Details")
            time.sleep(1.0)
            print("📸 Capturing Edit Profile V5.2 form view...")
            page.screenshot(path="/home/jules/verification/v5_2_profile_edit_form.png", full_page=True)

            # Cancel Edit Profile
            print("❌ Clicking Cancel on Edit Details...")
            page.click("text=Cancel")
            time.sleep(1.0)

            # ==========================================
            # Step 3: Navigate to V5.2 Settings Route
            # ==========================================
            print("\n🚀 Navigating to V5.2 Settings Route (/design-preview/settings-v5-2)...")
            page.goto("http://localhost:5173/design-preview/settings-v5-2")

            # Wait for Settings elements
            page.wait_for_selector(".v52-settings-canvas", timeout=15000)
            print("✅ Settings V5.2 is active!")

            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(2.0)

            # Capture Settings V5.2 Full page
            print("📸 Capturing V5.2 Settings full-page screenshot...")
            page.screenshot(path="/home/jules/verification/v5_2_settings.png", full_page=True)
            print("📸 Captured /home/jules/verification/v5_2_settings.png successfully!")

            print("\n🏁 E2E visual verification completed successfully!")

        except Exception as e:
            print(f"❌ Error encountered during E2E verification: {e}")
            page.screenshot(path="/home/jules/verification/error_screenshot_v5_2_profile_settings.png")
            print("📸 Captured error_screenshot_v5_2_profile_settings.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
