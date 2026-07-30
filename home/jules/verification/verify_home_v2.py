import time
import sys
from playwright.sync_api import sync_playwright, expect

def run_verification():
    print("\n🚀 Starting E2E verification for Old Home vs New V2 Home...")

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
            print("✅ V1 Hero is visible!")

            # Add a couple of health records via portal to ensure we have routine measurements today
            print("📝 Submitting a new BP health record through modal...")
            page.click(".whatsapp-info-hint")
            page.wait_for_selector("#param-select")
            page.select_option("#param-select", "blood_pressure")
            page.fill("input[placeholder='Sys (e.g. 120)']", "128")
            page.fill("input[placeholder='Dia (e.g. 80)']", "84")
            page.click("button:has-text('Save Record')")
            time.sleep(1.5)

            print("📝 Submitting a new sugar health record through modal...")
            page.click(".whatsapp-info-hint")
            page.wait_for_selector("#param-select")
            page.select_option("#param-select", "blood_sugar")
            page.fill("#param-value", "118")
            page.click("button:has-text('Save Record')")
            time.sleep(1.5)

            # Scroll and wait to let animations settle
            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(1)

            # Capture Patient Home V1 screenshot
            print("📸 Capturing V1 Home screenshot...")
            page.screenshot(path="/home/jules/verification/v1_home.png", full_page=True)
            print("📸 Captured /home/jules/verification/v1_home.png successfully!")

            # ==========================================
            # Step 2: Navigate to V2 Route
            # ==========================================
            print("\n🚀 Navigating to V2 Design Preview Route (/design-preview/home)...")
            page.goto("http://localhost:5173/design-preview/home")

            # Wait for Patient Dashboard V2 element
            page.wait_for_selector(".dashboard--v2", timeout=15000)
            print("✅ V2 Dashboard is active!")

            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(1)

            # Capture Patient Home V2 screenshot
            print("📸 Capturing V2 Home screenshot...")
            page.screenshot(path="/home/jules/verification/v2_home.png", full_page=True)
            print("📸 Captured /home/jules/verification/v2_home.png successfully!")

            print("\n🏁 E2E visual verification completed successfully!")

        except Exception as e:
            print(f"❌ Error encountered during E2E verification: {e}")
            page.screenshot(path="/home/jules/verification/error_screenshot_redesign.png")
            print("📸 Captured error_screenshot_redesign.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
