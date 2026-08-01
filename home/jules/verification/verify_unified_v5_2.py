import time
import sys
from playwright.sync_api import sync_playwright

def run_verification():
    print("\n🚀 Starting E2E verification for Unified V5.2 Preview Experience...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

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
            # Step 2: Navigate to V5.2 Preview Route
            # ==========================================
            print("\n🚀 Navigating to V5.2 Preview Route (/design-preview/home-v5-2)...")
            page.goto("http://localhost:5173/design-preview/home-v5-2")

            # Wait for Patient Dashboard V5.2 element
            page.wait_for_selector(".dashboard--v5_2", timeout=15000)
            print("✅ V5.2 Dashboard is active!")

            # Isolate Home V5.2
            print("📸 Capturing Unified Home V5.2...")
            page.screenshot(path="home/jules/verification/unified_home.png", full_page=False)
            time.sleep(1.0)

            # Click on "Health Records"
            print("➡️ Clicking on 'Health Records' sidebar tab...")
            page.click("aside.sidebar >> text=Health Records")
            page.wait_for_selector(".v52-records-canvas", timeout=10000)
            print("✅ Active tab switched to Health Records!")
            page.screenshot(path="home/jules/verification/unified_records.png", full_page=False)
            time.sleep(1.0)

            # Click on "Health Insights"
            print("➡️ Clicking on 'Health Insights' sidebar tab...")
            page.click("aside.sidebar >> text=Health Insights")
            page.wait_for_selector(".v52-insights-canvas", timeout=10000)
            print("✅ Active tab switched to Health Insights!")
            page.screenshot(path="home/jules/verification/unified_insights.png", full_page=False)
            time.sleep(1.0)

            # Click on "Profile"
            print("➡️ Clicking on 'Profile' sidebar tab...")
            page.click("aside.sidebar >> text=Profile")
            page.wait_for_selector(".v52-profile-canvas", timeout=10000)
            print("✅ Active tab switched to Profile!")
            page.screenshot(path="home/jules/verification/unified_profile.png", full_page=False)
            time.sleep(1.0)

            # Click on "Settings"
            print("➡️ Clicking on 'Settings' sidebar tab...")
            page.click("aside.sidebar >> text=Settings")
            page.wait_for_selector(".v52-settings-canvas", timeout=10000)
            print("✅ Active tab switched to Settings!")
            page.screenshot(path="home/jules/verification/unified_settings.png", full_page=False)
            time.sleep(1.0)

            print("\n🏁 Unified E2E verification completed successfully!")

        except Exception as e:
            print(f"❌ Error during specific capture: {e}")
            page.screenshot(path="home/jules/verification/unified_error.png")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
