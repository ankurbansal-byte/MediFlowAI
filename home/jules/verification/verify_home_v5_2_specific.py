import time
import sys
from playwright.sync_api import sync_playwright

def run_verification():
    print("\n🚀 Starting visual capture for Home V5.2 specified sections...")

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
            # Step 2: Navigate to V5.2 Route
            # ==========================================
            print("\n🚀 Navigating to V5.2 Design Preview Route (/design-preview/home-v5-2)...")
            page.goto("http://localhost:5173/design-preview/home-v5-2")

            # Wait for Patient Dashboard V5.2 element
            page.wait_for_selector(".dashboard--v5_2", timeout=15000)
            print("✅ V5.2 Dashboard is active!")

            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(2)

            # 1. Capture Top Header
            print("📸 Capturing Top Header...")
            header_elem = page.locator(".patient-top-header")
            header_elem.scroll_into_view_if_needed()
            time.sleep(0.5)
            header_elem.screenshot(path="home/jules/verification/v5_2_specific_header.png")
            header_elem.screenshot(path="/home/jules/verification/v5_2_specific_header.png")

            # 2. Capture Sidebar
            print("📸 Capturing Sidebar...")
            sidebar_elem = page.locator("aside.sidebar")
            sidebar_elem.screenshot(path="home/jules/verification/v5_2_specific_sidebar.png")
            sidebar_elem.screenshot(path="/home/jules/verification/v5_2_specific_sidebar.png")

            # 3. Capture Hero
            print("📸 Capturing Hero Section...")
            hero_elem = page.locator(".v52-hero-section")
            hero_elem.scroll_into_view_if_needed()
            time.sleep(0.5)
            hero_elem.screenshot(path="home/jules/verification/v5_2_specific_hero.png")
            hero_elem.screenshot(path="/home/jules/verification/v5_2_specific_hero.png")

            # 4. Capture Latest Health Snapshot
            print("📸 Capturing Latest Health Snapshot...")
            snapshot_elem = page.locator(".v52-bg-snapshot-panel")
            snapshot_elem.scroll_into_view_if_needed()
            time.sleep(0.5)
            snapshot_elem.screenshot(path="home/jules/verification/v5_2_specific_snapshot.png")
            snapshot_elem.screenshot(path="/home/jules/verification/v5_2_specific_snapshot.png")

            # 5. Capture Today's Health
            print("📸 Capturing Today's Health...")
            today_elem = page.locator(".v52-bg-today-panel")
            today_elem.scroll_into_view_if_needed()
            time.sleep(0.5)
            today_elem.screenshot(path="home/jules/verification/v5_2_specific_today.png")
            today_elem.screenshot(path="/home/jules/verification/v5_2_specific_today.png")

            # 6. Capture Your Health at a Glance
            print("📸 Capturing Your Health at a Glance...")
            summary_elem = page.locator(".v52-bg-summary-panel")
            summary_elem.scroll_into_view_if_needed()
            time.sleep(0.5)
            summary_elem.screenshot(path="home/jules/verification/v5_2_specific_summary.png")
            summary_elem.screenshot(path="/home/jules/verification/v5_2_specific_summary.png")

            # 7. Capture Lab Results
            print("📸 Capturing Lab Results...")
            labs_elem = page.locator(".v52-bg-labs-panel")
            labs_elem.scroll_into_view_if_needed()
            time.sleep(0.5)
            labs_elem.screenshot(path="home/jules/verification/v5_2_specific_labs.png")
            labs_elem.screenshot(path="/home/jules/verification/v5_2_specific_labs.png")

            # 8. Capture Full page as main reference
            print("📸 Capturing Full Page V5.2 as reference...")
            page.screenshot(path="home/jules/verification/v5_2_specific_full_page.png", full_page=True)
            page.screenshot(path="/home/jules/verification/v5_2_specific_full_page.png", full_page=True)

            print("\n🏁 Specified visual capture completed successfully!")

        except Exception as e:
            print(f"❌ Error during specific capture: {e}")
            page.screenshot(path="home/jules/verification/error_screenshot_specific.png")
            page.screenshot(path="/home/jules/verification/error_screenshot_specific.png")
            print("📸 Captured error_screenshot_specific.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
