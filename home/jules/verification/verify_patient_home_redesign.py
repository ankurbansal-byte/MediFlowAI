import time
import sys
from playwright.sync_api import sync_playwright, expect

def run_patient_home_redesign_verification():
    print("\n🚀 Starting E2E visual verification flow for Vibrant Premium Visual Redesign...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        try:
            # Set high-resolution viewport to capture full dashboard
            page.set_viewport_size({"width": 1280, "height": 2200})

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

            # Wait for the patient welcome section
            page.wait_for_selector(".patient-welcome-section-hero")
            print("✅ Hero welcomed the user!")

            # Add a couple of health records via portal to ensure we have routine measurements today
            print("📝 3. Submitting a new BP health record through modal...")
            page.click(".whatsapp-info-hint")
            page.wait_for_selector("#param-select")
            page.select_option("#param-select", "blood_pressure")
            page.fill("input[placeholder='Sys (e.g. 120)']", "128")
            page.fill("input[placeholder='Dia (e.g. 80)']", "84")
            page.click("button:has-text('Save Record')")
            time.sleep(1.5)

            print("📝 4. Submitting a new sugar health record through modal...")
            page.click(".whatsapp-info-hint")
            page.wait_for_selector("#param-select")
            page.select_option("#param-select", "blood_sugar")
            page.fill("#param-value", "118")
            page.click("button:has-text('Save Record')")
            time.sleep(1.5)

            # Scroll and wait to let animations settle
            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(1)

            # Capture Patient Home Premium Redesign screenshot
            page.screenshot(path="/home/jules/verification/patient_home_vibrant_redesign.png", full_page=True)
            print("📸 Captured /home/jules/verification/patient_home_vibrant_redesign.png successfully!")

            # Confirm sidebar elements and logo background
            print("📋 5. Verifying logout button and elements...")
            logout_btn = page.locator("aside >> text=Sign Out")
            expect(logout_btn).to_be_visible()

            print("\n🏁 E2E visual verification completed successfully!")

        except Exception as e:
            print(f"❌ Error encountered during E2E verification: {e}")
            page.screenshot(path="/home/jules/verification/error_screenshot_redesign.png")
            print("📸 Captured error_screenshot_redesign.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_patient_home_redesign_verification()
