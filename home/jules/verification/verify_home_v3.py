import time
import sys
from playwright.sync_api import sync_playwright

def run_verification():
    print("\n🚀 Starting E2E verification for MediFlowAI Home V3...")

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
            # Step 2: Navigate to V3 Route
            # ==========================================
            print("\n🚀 Navigating to V3 Design Preview Route (/design-preview/home-v3)...")
            page.goto("http://localhost:5173/design-preview/home-v3")

            # Wait for Patient Dashboard V3 element
            page.wait_for_selector(".dashboard--v3", timeout=15000)
            print("✅ V3 Dashboard is active!")

            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(1.5)

            # 1. Full-page V3
            print("📸 Capturing V3 Full-page screenshot...")
            page.screenshot(path="/home/jules/verification/v3_home.png", full_page=True)
            print("📸 Captured /home/jules/verification/v3_home.png successfully!")

            # 2. Hero + Sidebar
            print("📸 Capturing Hero + Sidebar screenshot...")
            # We crop/viewport to top
            page.set_viewport_size({"width": 1280, "height": 700})
            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(0.5)
            page.screenshot(path="/home/jules/verification/v3_hero_sidebar.png")

            # 3. Latest Health Snapshot
            print("📸 Capturing Latest Health Snapshot screenshot...")
            snapshot_elem = page.locator(".v3-snapshot-grid")
            if snapshot_elem.is_visible():
                snapshot_elem.scroll_into_view_if_needed()
                time.sleep(0.5)
                page.screenshot(path="/home/jules/verification/v3_snapshot.png")

            # 4. Today's Health
            print("📸 Capturing Today's Health screenshot...")
            today_elem = page.locator(".v3-today-box")
            if today_elem.is_visible():
                today_elem.scroll_into_view_if_needed()
                time.sleep(0.5)
                page.screenshot(path="/home/jules/verification/v3_today.png")

            # 5. 30-Day Health Summary
            print("📸 Capturing 30-Day Health Summary screenshot...")
            summary_elem = page.locator(".v3-summary-box")
            if summary_elem.is_visible():
                summary_elem.scroll_into_view_if_needed()
                time.sleep(0.5)
                page.screenshot(path="/home/jules/verification/v3_summary.png")

            # 6. Lab Results
            print("📸 Capturing Lab Results screenshot...")
            labs_elem = page.locator(".v3-lab-box")
            if labs_elem.is_visible():
                labs_elem.scroll_into_view_if_needed()
                time.sleep(0.5)
                page.screenshot(path="/home/jules/verification/v3_labs.png")

            # 7. CTA / footer
            print("📸 Capturing CTA & footer screenshot...")
            cta_elem = page.locator(".v3-cta-grid")
            if cta_elem.is_visible():
                cta_elem.scroll_into_view_if_needed()
                time.sleep(0.5)
                page.screenshot(path="/home/jules/verification/v3_cta_footer.png")

            print("\n🏁 E2E visual verification completed successfully!")

        except Exception as e:
            print(f"❌ Error encountered during E2E verification: {e}")
            page.screenshot(path="/home/jules/verification/error_screenshot_v3.png")
            print("📸 Captured error_screenshot_v3.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
