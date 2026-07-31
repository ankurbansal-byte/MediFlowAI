import time
import sys
from playwright.sync_api import sync_playwright

def run_verification():
    print("\n🚀 Starting visual capture for Home V5.1 specified sections...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

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
            # Step 2: Navigate to V5.1 Route
            # ==========================================
            print("\n🚀 Navigating to V5.1 Design Preview Route (/design-preview/home-v5.1)...")
            page.goto("http://localhost:5173/design-preview/home-v5.1")

            # Wait for Patient Dashboard V5.1 element
            page.wait_for_selector(".dashboard--v5_1", timeout=15000)
            print("✅ V5.1 Dashboard is active!")

            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(2)

            # 1. Capture Top Header
            print("📸 Capturing Top Header...")
            header_elem = page.locator(".patient-top-header")
            header_elem.scroll_into_view_if_needed()
            time.sleep(0.5)
            header_elem.screenshot(path="/home/jules/verification/v5_1_specific_header.png")

            # 2. Capture Sidebar
            print("📸 Capturing Sidebar...")
            sidebar_elem = page.locator("aside.sidebar")
            sidebar_elem.screenshot(path="/home/jules/verification/v5_1_specific_sidebar.png")

            # 3. Capture Hero
            print("📸 Capturing Hero Section...")
            hero_elem = page.locator(".v5-hero-wrapper")
            hero_elem.scroll_into_view_if_needed()
            time.sleep(0.5)
            hero_elem.screenshot(path="/home/jules/verification/v5_1_specific_hero.png")

            # 4. Capture Latest Health Snapshot
            print("📸 Capturing Latest Health Snapshot...")
            snapshot_elem = page.locator(".v5-snapshot-grid")
            snapshot_elem.scroll_into_view_if_needed()
            time.sleep(0.5)
            snapshot_elem.screenshot(path="/home/jules/verification/v5_1_specific_snapshot.png")

            # 5. Capture Today's Health
            print("📸 Capturing Today's Health...")
            today_elem = page.locator(".v5-today-box")
            today_elem.scroll_into_view_if_needed()
            time.sleep(0.5)
            today_elem.screenshot(path="/home/jules/verification/v5_1_specific_today.png")

            # 6. Capture Your Health at a Glance
            print("📸 Capturing Your Health at a Glance...")
            summary_elem = page.locator(".v5-summary-box")
            summary_elem.scroll_into_view_if_needed()
            time.sleep(0.5)
            summary_elem.screenshot(path="/home/jules/verification/v5_1_specific_summary.png")

            # 7. Capture Lab Results
            print("📸 Capturing Lab Results...")
            labs_elem = page.locator(".v5-lab-box")
            labs_elem.scroll_into_view_if_needed()
            time.sleep(0.5)
            labs_elem.screenshot(path="/home/jules/verification/v5_1_specific_labs.png")

            # 8. Capture AI Insights & Analyze Trends (CTA cards)
            print("📸 Capturing AI Insights & Analyze Trends CTA cards...")
            cta_elem = page.locator(".v5-cta-grid")
            cta_elem.scroll_into_view_if_needed()
            time.sleep(0.5)
            cta_elem.screenshot(path="/home/jules/verification/v5_1_specific_cta.png")

            # 9. Full page as main reference
            print("📸 Capturing Full Page V5.1 as reference...")
            page.screenshot(path="/home/jules/verification/v5_1_specific_full_page.png", full_page=True)

            print("\n🏁 Specified visual capture completed successfully!")

        except Exception as e:
            print(f"❌ Error during specific capture: {e}")
            page.screenshot(path="/home/jules/verification/error_screenshot_specific.png")
            print("📸 Captured error_screenshot_specific.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
