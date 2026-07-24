import time
import sys
from playwright.sync_api import sync_playwright, expect

def run_sprint36c_verification():
    print("🚀 Starting Playwright E2E visual verification flow for Sprint 36C...")

    with sync_playwright() as p:
        # Launch headless browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Listen to console messages
        page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        try:
            # Overwrite the global Date object to return 2026-07-23 as "today"
            # so that seeded records for PAT-36B on 2026-07-23 are detected as "Today's Health".
            page.add_init_script("""
                const OriginalDate = window.Date;
                const FixedDate = class extends OriginalDate {
                    constructor(...args) {
                        if (args.length === 0) {
                            super('2026-07-23T15:00:00.000Z');
                        } else {
                            super(...args);
                        }
                    }
                };
                FixedDate.now = () => new OriginalDate('2026-07-23T15:00:00.000Z').getTime();
                window.Date = FixedDate;
            """)

            # ==========================================
            # Step 1: Patient Login (PAT-36B)
            # ==========================================
            print("\n👤 1. Navigating to Login Page...")
            page.goto("http://localhost:5173")

            page.wait_for_selector("text=See how it works")
            page.click("text=Login")

            page.wait_for_selector("text=Patient Portal")
            page.click("text=Access Patient Portal")

            print("👤 2. Logging in as Patient PAT-36B...")
            page.wait_for_selector("#pat-username")
            page.fill("#pat-username", "PAT-36B")
            page.fill("#pat-password", "password")
            page.click("button.portal-submit-btn.patient-btn")

            # Wait for Patient Dashboard
            page.wait_for_selector("aside.sidebar", timeout=15000)
            print("✅ Logged in successfully as Patient PAT-36B!")

            # Verify greeting & ID consistency
            print("📋 3. Verifying patient greeting and secondary ID...")
            page.wait_for_selector("text=Welcome, Patient PAT-36B")
            page.wait_for_selector("text=Patient ID: PAT-36B")

            # Verify Latest Health Snapshot is loaded with the latest reading (142 mg/dL · Random)
            print("📋 4. Verifying Latest Health Snapshot is loaded...")
            page.wait_for_selector(".summary-grid div:has-text('Blood Sugar')")

            # Check for the friendly context label and value in the snapshot grid
            sugar_card = page.locator(".summary-grid div:has-text('Blood Sugar')")
            expect(sugar_card).to_contain_text("142 mg/dL")
            expect(sugar_card).to_contain_text("Random")
            expect(sugar_card).to_contain_text("As of 23 Jul 2026")

            # Verify "Today's Health" Section
            print("📋 5. Verifying Today's Health section is present immediately after the Snapshot...")
            page.wait_for_selector("text=Today's Health")
            page.wait_for_selector("text=23 July 2026 · 4 records")

            # Verify that all 4 readings are present in Today's Health with their respective times and contexts
            print("📋 6. Verifying all 4 readings for today are displayed separately...")
            row_1 = page.locator(".today-record-row:has-text('142 mg/dL')") # Random
            expect(row_1).to_contain_text("Random")
            expect(row_1).to_contain_text("BLOOD SUGAR")

            row_2 = page.locator(".today-record-row:has-text('118 mg/dL')") # Pre-meal
            expect(row_2).to_contain_text("Pre-meal")

            row_3 = page.locator(".today-record-row:has-text('168 mg/dL')") # Post-meal
            expect(row_3).to_contain_text("Post-meal")

            row_4 = page.locator(".today-record-row:has-text('125 mg/dL')") # Fasting
            expect(row_4).to_contain_text("Fasting")

            # Verify 30-Day Health Summary is positioned lower (below Today's Health)
            print("📋 7. Verifying 30-Day Health Summary is present lower in the hierarchy...")
            page.wait_for_selector("text=30-Day Health Summary")

            # Verify that Dashboard does not contain the old flat Longitudinal Health History list
            print("📋 8. Verifying flat Longitudinal Health History is not present on the Dashboard...")
            expect(page.locator("text=Longitudinal Health History")).not_to_be_visible()

            # Capture Patient Dashboard desktop screenshot
            page.screenshot(path="home/jules/verification/patient_dashboard_desktop_sprint36c.png")
            print("📸 Captured patient_dashboard_desktop_sprint36c.png!")

            # Test Mobile Viewport for Patient Dashboard
            print("📱 9. Testing responsive/mobile viewport size for Dashboard...")
            page.set_viewport_size({"width": 375, "height": 812})
            time.sleep(1)
            page.screenshot(path="home/jules/verification/patient_dashboard_mobile_sprint36c.png")
            print("📸 Captured patient_dashboard_mobile_sprint36c.png!")

            # Restore viewport
            page.set_viewport_size({"width": 1280, "height": 800})

            # Navigate via Today's Health button
            print("📈 10. Navigating from Today's Health to detailed Health / Trends...")
            page.click("text=View today's records")
            page.wait_for_selector("text=Health Analytics")

            # Verify Date-Grouped history list exists
            print("📈 11. Verifying Date-Grouped History exists in Health / Trends...")
            page.wait_for_selector("text=23 JUL 2026")
            page.wait_for_selector("text=4 HEALTH RECORDS")

            # Verify Calendar / Date Navigator is present and has selected day active
            print("📈 12. Verifying Calendar widget highlights selected day and shows count...")
            page.wait_for_selector(".calendar-widget-container")
            # Day 23 should be highlighted as selected (active class)
            selected_day = page.locator(".calendar-day-btn--selected")
            expect(selected_day).to_contain_text("23")
            expect(selected_day).to_contain_text("4 recs")

            # Verify only records for 23 July are shown when selected
            print("📈 13. Verifying only 23 July records are shown when selected...")
            page.wait_for_selector("text=Showing records for 23 July 2026")
            expect(page.locator("text=22 JUL 2026")).not_to_be_visible()

            # Capture Patient Trends desktop selected day screenshot
            page.screenshot(path="home/jules/verification/patient_trends_desktop_sprint36c.png")
            print("📸 Captured patient_trends_desktop_sprint36c.png!")

            # Test Mobile Viewport for Trends and Calendar
            print("📱 14. Testing responsive/mobile viewport size for Trends & Calendar...")
            page.set_viewport_size({"width": 375, "height": 812})
            time.sleep(1)
            page.screenshot(path="home/jules/verification/patient_trends_mobile_sprint36c.png")
            print("📸 Captured patient_trends_mobile_sprint36c.png!")

            # Restore viewport
            page.set_viewport_size({"width": 1280, "height": 800})

            # Clear calendar selection by clicking 'Show All Dates'
            print("📈 15. Clearing calendar selection to verify All Dates are shown...")
            page.click("text=Show All Dates")
            time.sleep(0.5)

            # Verify that legacy records from other days (e.g. 22 JUL) reappear
            page.wait_for_selector("text=22 JUL 2026")
            page.wait_for_selector("text=1 HEALTH RECORD")

            # Verify existing glucose context trend filters still work and do not conflict
            print("📈 16. Verifying glucose context trend filters still work...")
            page.wait_for_selector("text=Glucose Filter:")
            page.click("button:has-text('Fasting')")
            time.sleep(1)
            page.wait_for_selector("text=Not enough comparable readings")

            # Switch back to All
            page.click("button:has-text('All')")
            time.sleep(0.5)

            # Logout Patient
            print("⏾ 17. Logging out Patient...")
            page.click("button.logout-button")
            page.wait_for_selector("text=See how it works")

            print("\n🏁 Sprint 36C E2E visual verification completed successfully and matches perfectly!")

        except Exception as e:
            print(f"❌ Error encountered during E2E verification: {e}")
            page.screenshot(path="home/jules/verification/error_screenshot_sprint36c.png")
            print("📸 Captured error_screenshot_sprint36c.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_sprint36c_verification()
