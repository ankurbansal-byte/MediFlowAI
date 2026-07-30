import time
import sys
from playwright.sync_api import sync_playwright

def verify_and_capture_v2_sections():
    print("\n📸 Starting dedicated visual captures for V2 Home sections...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # High-resolution desktop viewport
            page.set_viewport_size({"width": 1280, "height": 1000})

            print("👤 Navigating and logging in...")
            page.goto("http://localhost:5173")
            page.wait_for_selector("text=Access Portals")
            page.click("text=Access Portals")
            page.wait_for_selector("text=Access Patient Portal")
            page.click("text=Access Patient Portal")

            page.wait_for_selector("#pat-username")
            page.fill("#pat-username", "PAT-110")
            page.fill("#pat-password", "password")
            page.click("button.portal-submit-btn.patient-btn")

            # Wait for login
            page.wait_for_selector("aside.sidebar", timeout=15000)

            # Navigate to V2
            print("🚀 Navigating to /design-preview/home...")
            page.goto("http://localhost:5173/design-preview/home")
            page.wait_for_selector(".dashboard--v2", timeout=15000)
            time.sleep(2) # Let animations settle

            # 1. Capture Sidebar + Hero
            print("📸 1. Capturing Sidebar + Hero...")
            hero_el = page.query_selector(".v2-hero")
            if hero_el:
                hero_el.screenshot(path="/home/jules/verification/v2_sidebar_hero.png")
            else:
                page.screenshot(path="/home/jules/verification/v2_sidebar_hero.png")

            # 2. Capture Latest Health Snapshot
            print("📸 2. Capturing Latest Health Snapshot...")
            snapshot_heading = page.query_selector("h2:has-text('Latest Health Snapshot')")
            if snapshot_heading:
                snapshot_heading.scroll_into_view_if_needed()
                time.sleep(0.5)
            snapshot_grid = page.query_selector(".v2-snapshot-grid")
            if snapshot_grid:
                snapshot_grid.screenshot(path="/home/jules/verification/v2_snapshot.png")

            # 3. Capture Today's Health
            print("📸 3. Capturing Today's Health...")
            today_section = page.query_selector(".v2-today-health")
            if today_section:
                today_section.scroll_into_view_if_needed()
                time.sleep(0.5)
                today_section.screenshot(path="/home/jules/verification/v2_todays_health.png")

            # 4. Capture 30-Day Health Summary
            print("📸 4. Capturing 30-Day Health Summary...")
            thirty_day_section = page.query_selector(".v2-intel-section")
            if thirty_day_section:
                thirty_day_section.scroll_into_view_if_needed()
                time.sleep(0.5)
                thirty_day_section.screenshot(path="/home/jules/verification/v2_thirty_day_summary.png")

            # 5. Capture Lab Results
            print("📸 5. Capturing Lab Results...")
            lab_section = page.query_selector(".v2-labs")
            if lab_section:
                lab_section.scroll_into_view_if_needed()
                time.sleep(0.5)
                lab_section.screenshot(path="/home/jules/verification/v2_lab_results.png")

            # 6. Capture CTA + Footer
            print("📸 6. Capturing CTA + Footer...")
            ctas_section = page.query_selector(".v2-ctas")
            if ctas_section:
                ctas_section.scroll_into_view_if_needed()
                time.sleep(0.5)
                ctas_section.screenshot(path="/home/jules/verification/v2_cta_footer.png")

            print("\n✅ All V2 section screenshots captured successfully!")

        except Exception as e:
            print(f"❌ Error during capture: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    verify_and_capture_v2_sections()
