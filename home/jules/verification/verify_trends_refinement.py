import time
import sys
from playwright.sync_api import sync_playwright, expect

def run_trends_refinement_verification():
    print("\n🚀 Starting Playwright E2E visual verification flow for Health Records / Trends refinement...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        try:
            # Set viewport
            page.set_viewport_size({"width": 1280, "height": 1600})

            # 1. Login
            print("\n👤 1. Navigating to Login Page...")
            page.goto("http://localhost:5173")

            page.wait_for_selector("text=See how it works")
            page.click("text=Login")

            page.wait_for_selector("text=Patient Portal")
            page.click("text=Access Patient Portal")

            print("👤 2. Logging in as Patient PAT-102...")
            page.wait_for_selector("#pat-username")
            page.fill("#pat-username", "PAT-102")
            page.fill("#pat-password", "password")
            page.click("button.portal-submit-btn.patient-btn")

            # Wait for Patient Dashboard
            page.wait_for_selector("aside.sidebar", timeout=15000)
            print("✅ Logged in successfully as Patient PAT-102!")

            # Go to Health Records / Trends page by clicking the navigation link
            print("\n📈 3. Navigating to detailed Health / Trends...")
            page.click("text=Detailed Trends & History")
            page.wait_for_selector("text=Health Analytics")

            # Wait for data to load
            print("⏳ Waiting for health records to load...")
            page.wait_for_selector("button:has-text('View more records')", timeout=15000)

            # Verify Section Visual Separation & Backgrounds
            print("🎨 4. Verifying section layout and styles...")
            page.wait_for_selector("text=Health Summary Engine")
            page.wait_for_selector("text=Complete Health History")

            # Verify initial date groups count is 3 (plus 1 for Calendar Navigation h3 = 4)
            print("📋 5. Checking that Complete Health History initially shows exactly 3 date groups (plus 1 calendar header)...")

            date_headers = page.locator("section[aria-labelledby='full-history-title'] h3:has-text('📅')")
            header_count_before = date_headers.count()
            print(f"   Initial Headers Visible: {header_count_before}")
            assert header_count_before == 4, f"Expected exactly 4 headers (3 date groups + 1 calendar), got {header_count_before}"

            # Verify 'View more records' button is visible
            view_more_btn = page.locator("button:has-text('View more records')")
            expect(view_more_btn).to_be_visible()
            print("✅ 'View more records' button is correctly visible.")

            # Capture initial view screenshot
            page.screenshot(path="/home/jules/verification/trends_initial_view.png")
            print("📸 Captured trends_initial_view.png!")

            # Click "View more records" to expand
            print("🖱️ 6. Clicking 'View more records' to expand groups by 5...")
            view_more_btn.click()
            time.sleep(1) # wait for click/re-render

            header_count_after = date_headers.count()
            print(f"   Expanded Headers Visible: {header_count_after}")
            assert header_count_after == 9, f"Expected exactly 9 headers (8 date groups + 1 calendar), got {header_count_after}"

            # Verify 'Show less' button is visible
            show_less_btn = page.locator("button:has-text('Show less')")
            expect(show_less_btn).to_be_visible()
            print("✅ 'Show less' button is correctly visible.")

            # Click 'Show less' to collapse back to 3
            print("🖱️ 7. Clicking 'Show less' to collapse back...")
            show_less_btn.click()
            time.sleep(1)

            header_count_collapsed = date_headers.count()
            print(f"   Headers Visible after collapse: {header_count_collapsed}")
            assert header_count_collapsed == 4, f"Expected 4 headers after collapse, got {header_count_collapsed}"

            # Expand again to show more data in the final screenshot
            print("🖱️ 8. Expanding again for final screenshot view...")
            page.locator("button:has-text('View more records')").click()
            time.sleep(1)

            # Capture final polished screenshot
            page.screenshot(path="/home/jules/verification/trends_refined_full.png")
            print("📸 Captured trends_refined_full.png!")

            print("\n🏁 Visual verification of all refinement requirements completed successfully!")

        except Exception as e:
            print(f"❌ Error encountered during E2E verification: {e}")
            page.screenshot(path="/home/jules/verification/error_screenshot.png")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_trends_refinement_verification()
