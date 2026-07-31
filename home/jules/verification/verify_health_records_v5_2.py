import time
import sys
from playwright.sync_api import sync_playwright, expect

def run_verification():
    print("\n🚀 Starting visual capture for Health Records V5.2...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # Set high-resolution viewport to capture full dashboard
            page.set_viewport_size({"width": 1280, "height": 3800})

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

            # Add a couple of health records via portal to ensure we have routine measurements today
            print("📝 Submitting a new BP health record through modal...")
            page.click(".whatsapp-info-hint")
            page.wait_for_selector("#param-select")
            page.select_option("#param-select", "blood_pressure")
            page.fill("input[placeholder='Sys (e.g. 120)']", "125")
            page.fill("input[placeholder='Dia (e.g. 80)']", "82")
            page.click("button:has-text('Save Record')")
            time.sleep(1.5)

            print("📝 Submitting a new sugar health record through modal...")
            page.click(".whatsapp-info-hint")
            page.wait_for_selector("#param-select")
            page.select_option("#param-select", "blood_sugar")
            page.fill("#param-value", "112")
            page.click("button:has-text('Save Record')")
            time.sleep(1.5)

            # ==========================================
            # Step 2: Navigate to V5.2 Records Route
            # ==========================================
            print("\n🚀 Navigating to V5.2 Records Design Preview Route...")
            page.goto("http://localhost:5173/design-preview/health-records-v5-2")

            # Wait for Patient Dashboard V5.2 element
            page.wait_for_selector(".v52-records-canvas", timeout=15000)
            print("✅ V5.2 Health Records is active!")

            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(2)

            # Capture Full page as main reference
            print("📸 Capturing Full Page V5.2 Records as reference...")
            page.screenshot(path="/home/jules/verification/v5_2_records_full_page.png", full_page=True)

            print("\n🏁 Specified visual capture completed successfully!")

        except Exception as e:
            print(f"❌ Error during specific capture: {e}")
            page.screenshot(path="/home/jules/verification/error_screenshot_records_v5_2.png")
            print("📸 Captured error_screenshot_records_v5_2.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
