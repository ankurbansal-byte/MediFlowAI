import time
import sys
from playwright.sync_api import sync_playwright

def run_verification():
    print("\n🚀 Starting E2E verification for MediFlowAI Health Insights V5...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        try:
            # Set high-resolution viewport to capture full dashboard
            page.set_viewport_size({"width": 1280, "height": 1800})

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
            # Step 2: Navigate to V5 Health Insights Route
            # ==========================================
            print("\n🚀 Navigating to V5 Health Insights Design Preview Route (/design-preview/health-insights-v5)...")
            page.goto("http://localhost:5173/design-preview/health-insights-v5")

            # Wait for Patient Dashboard V5 element
            page.wait_for_selector(".dashboard--v5", timeout=15000)
            print("✅ V5 Dashboard is active!")

            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(2.0)

            # Capture full page under Blood Sugar (default)
            print("📸 Capturing V5 Health Insights Blood Sugar (default) screenshot...")
            page.screenshot(path="/home/jules/verification/v5_health_insights_blood_sugar.png", full_page=True)

            # Click on Blood Pressure selector to test interactivity
            print("🩺 Clicking on Blood Pressure Selector...")
            page.click("button:has-text('Blood Pressure')")
            time.sleep(1.0)
            page.screenshot(path="/home/jules/verification/v5_health_insights_blood_pressure.png", full_page=True)

            # Click on Heart Rate selector
            print("❤️ Clicking on Heart Rate Selector...")
            page.click("button:has-text('Heart Rate')")
            time.sleep(1.0)
            page.screenshot(path="/home/jules/verification/v5_health_insights_heart_rate.png", full_page=True)

            # Save main screenshot to standard location requested/expected
            page.screenshot(path="/home/jules/verification/v5_health_insights.png", full_page=True)
            print("📸 Captured /home/jules/verification/v5_health_insights.png successfully!")

            print("\n🏁 E2E visual verification completed successfully!")

        except Exception as e:
            print(f"❌ Error encountered during E2E verification: {e}")
            page.screenshot(path="/home/jules/verification/error_screenshot_v5_insights.png")
            print("📸 Captured error_screenshot_v5_insights.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
