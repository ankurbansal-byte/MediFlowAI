import time
import sys
from playwright.sync_api import sync_playwright, expect

def run_sprint44_5_verification():
    print("\n🚀 Starting Playwright E2E visual verification flow for Sprint 44.5...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        try:
            # Set high-resolution viewport to capture full dashboard
            page.set_viewport_size({"width": 1280, "height": 1400})

            # ==========================================
            # Step 1: Login
            # ==========================================
            print("\n👤 1. Navigating to Login Page...")
            page.goto("http://localhost:5173")

            page.wait_for_selector("text=See how it works")
            page.click("text=Login")

            page.wait_for_selector("text=Patient Portal")
            page.click("text=Access Patient Portal")

            print("👤 2. Logging in as Patient PAT-110...")
            page.wait_for_selector("#pat-username")
            page.fill("#pat-username", "PAT-110")
            page.fill("#pat-password", "password")
            page.click("button.portal-submit-btn.patient-btn")

            # Wait for Patient Dashboard
            page.wait_for_selector("aside.sidebar", timeout=15000)
            print("✅ Logged in successfully as Patient PAT-110!")

            # Verify greeting & ID consistency
            print("📋 3. Verifying patient greeting and secondary ID...")
            page.wait_for_selector("text=Welcome, Patient PAT-110")
            page.wait_for_selector("text=Patient ID: PAT-110")

            # Verify "Your Lab Results" Section on Dashboard
            print("📋 4. Verifying Your Lab Results section is visible on Dashboard...")
            page.wait_for_selector("text=Your Lab Results")

            # Verify the fbs and ppbs observations are displayed separately
            fbs_row = page.locator("section:has-text('Your Lab Results') >> text=Fasting Blood Glucose")
            ppbs_row = page.locator("section:has-text('Your Lab Results') >> text=Postprandial Blood Glucose")
            expect(fbs_row).to_be_visible()
            expect(ppbs_row).to_be_visible()

            # Capture Patient Dashboard screenshot showing Your Lab Results section
            page.screenshot(path="/home/jules/verification/patient_dashboard_sprint44_5.png")
            print("📸 Captured patient_dashboard_sprint44_5.png!")

            # ==========================================
            # Step 2: Patient Health / Trends History
            # ==========================================
            print("\n📈 5. Navigating to detailed Health / Trends...")
            page.click("text=View today's records")
            page.wait_for_selector("text=Health Analytics")

            # Verify "Your Lab Results" Section on Trends
            print("📋 6. Verifying Your Lab Results section is visible on Trends...")
            page.wait_for_selector("text=Your Lab Results")

            fbs_trends = page.locator("section:has-text('Your Lab Results') >> text=Fasting Blood Glucose")
            expect(fbs_trends).to_be_visible()

            # Capture Patient Trends screenshot
            page.screenshot(path="/home/jules/verification/patient_trends_sprint44_5.png")
            print("📸 Captured patient_trends_sprint44_5.png!")

            print("\n🏁 Sprint 44.5 E2E visual verification completed successfully!")

        except Exception as e:
            print(f"❌ Error encountered during E2E verification: {e}")
            page.screenshot(path="/home/jules/verification/error_screenshot_sprint44_5.png")
            print("📸 Captured error_screenshot_sprint44_5.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_sprint44_5_verification()
