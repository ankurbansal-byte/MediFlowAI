import time
import sys
from playwright.sync_api import sync_playwright, expect

def run_sprint36b_verification():
    print("🚀 Starting Playwright E2E visual verification flow for Sprint 36B...")

    with sync_playwright() as p:
        # Launch headless browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Listen to console messages
        page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        try:
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
            print("📋 4. Verifying Latest Health Snapshot is loaded with latest record (142 mg/dL · Random)...")
            page.wait_for_selector(".summary-grid div:has-text('Blood Sugar')")

            # Check for the friendly context label and value in the snapshot grid specifically
            sugar_card = page.locator(".summary-grid div:has-text('Blood Sugar')")
            expect(sugar_card).to_contain_text("142 mg/dL · Random")
            expect(sugar_card).to_contain_text("As of 23 Jul 2026")

            # Capture Patient Dashboard desktop screenshot
            page.screenshot(path="home/jules/verification/patient_dashboard_desktop_sprint36b.png")
            print("📸 Captured patient_dashboard_desktop_sprint36b.png!")

            # Go to Detailed Trends & History
            print("📈 5. Navigating to Health / Trends & Analysis...")
            page.click("text=Detailed Trends & History")
            page.wait_for_selector("text=Health Analytics")
            page.wait_for_selector("text=Complete Health History")

            # Verify that we can find the complete list of 5 readings in the detailed history list
            print("📈 6. Verifying Complete Health History list contains all 5 readings with correct times & contexts...")
            page.wait_for_selector(".table-row-hover:has-text('142 mg/dL')") # Random
            page.wait_for_selector(".table-row-hover:has-text('168 mg/dL')") # Post-meal
            page.wait_for_selector(".table-row-hover:has-text('125 mg/dL')") # Fasting
            page.wait_for_selector(".table-row-hover:has-text('118 mg/dL')") # Pre-meal
            page.wait_for_selector(".table-row-hover:has-text('110 mg/dL')") # Legacy record without context

            # Verify glucose context labels display correctly
            row_random = page.locator(".table-row-hover:has-text('142 mg/dL')")
            expect(row_random).to_contain_text("Random")
            expect(row_random).to_contain_text("23 Jul 2026")

            row_post = page.locator(".table-row-hover:has-text('168 mg/dL')")
            expect(row_post).to_contain_text("Post-meal")

            row_pre = page.locator(".table-row-hover:has-text('118 mg/dL')")
            expect(row_pre).to_contain_text("Pre-meal")

            row_fasting = page.locator(".table-row-hover:has-text('125 mg/dL')")
            expect(row_fasting).to_contain_text("Fasting")

            # Legacy should NOT contain any of the context words
            row_legacy = page.locator(".table-row-hover:has-text('110 mg/dL')")
            # Should have the legacy date and time
            expect(row_legacy).to_contain_text("22 Jul 2026")
            text_content = row_legacy.inner_text()
            assert "Fasting" not in text_content
            assert "Pre-meal" not in text_content
            assert "Post-meal" not in text_content
            assert "Random" not in text_content

            # Verify glucose context filters UI exists
            print("📈 7. Verifying glucose context trend filters UI...")
            page.wait_for_selector("text=Glucose Filter:")
            page.wait_for_selector("button:has-text('All')")
            page.wait_for_selector("button:has-text('Fasting')")
            page.wait_for_selector("button:has-text('Pre-meal')")
            page.wait_for_selector("button:has-text('Post-meal')")
            page.wait_for_selector("button:has-text('Random')")

            # Check Trend Claim on "All" (should show mixed contexts / not enough comparable readings)
            print("📈 8. Checking trend claims with 'All' filter selected...")
            # Let's locate the trend direction text
            page.wait_for_selector("text=Mixed glucose contexts")

            # Capture Patient Trends desktop screenshot
            page.screenshot(path="home/jules/verification/patient_trends_desktop_sprint36b.png")
            print("📸 Captured patient_trends_desktop_sprint36b.png!")

            # Filter by Fasting
            print("📈 9. Clicking on Fasting glucose filter...")
            page.click("button:has-text('Fasting')")
            time.sleep(1) # wait for render update
            page.wait_for_selector("text=Latest")
            page.wait_for_selector("text=Not enough comparable readings")

            # Filter by Post-meal
            print("📈 10. Clicking on Post-meal glucose filter...")
            page.click("button:has-text('Post-meal')")
            time.sleep(1)
            page.wait_for_selector("text=Not enough comparable readings")

            # Reset back to All
            page.click("button:has-text('All')")
            time.sleep(0.5)

            # Test Mobile Viewport for Patient view
            print("📱 11. Testing responsive/mobile viewport size...")
            page.set_viewport_size({"width": 375, "height": 812})
            time.sleep(1)
            page.screenshot(path="home/jules/verification/patient_trends_mobile_sprint36b.png")
            print("📸 Captured patient_trends_mobile_sprint36b.png!")

            # Restore viewport
            page.set_viewport_size({"width": 1280, "height": 800})

            # Logout Patient
            print("⏾ 12. Logging out Patient...")
            page.click("button.logout-button")
            page.wait_for_selector("text=See how it works")

            # ==========================================
            # Step 2: Doctor Login (doctor1)
            # ==========================================
            print("\n👤 13. Logging in as Doctor to verify Cross-Role Consistency...")
            page.click("text=Login")
            page.wait_for_selector("text=Hospital Portal")
            page.click("text=Access Hospital Portal")

            page.wait_for_selector("#doc-username")
            page.fill("#doc-username", "doctor1")
            page.fill("#doc-password", "password")
            page.click("button.portal-submit-btn.doctor-btn")

            # Wait for doctor landing page
            page.wait_for_selector("text=My Assigned Patients", timeout=15000)
            print("✅ Logged in successfully as Doctor!")

            # Search PAT-36B in Find Patient card
            print("👥 14. Searching PAT-36B in Doctor Hub...")
            page.fill("input[placeholder='Type Name, ID (e.g. PAT-101), or mobile...']", "PAT-36B")
            time.sleep(1)

            # Open patient workspace
            print("👥 15. Opening Patient Workspace for PAT-36B...")
            page.click("button:has-text('Open Workspace') >> nth=0")
            page.wait_for_selector("text=PRACTITIONER CLINICAL WORKSPACE")
            page.wait_for_selector("text=Patient ID: PAT-36B")

            # Verify Overview Vitals Snapshot shows identical values (142 mg/dL · Random and As of 23 Jul 2026)
            print("👥 16. Verifying Doctor Overview Tab matches Patient Dashboard exactly...")
            # Locate Blood Glucose summary card
            sugar_overview_card = page.locator("div:has-text('Blood Glucose') >> nth=1")
            expect(sugar_overview_card).to_contain_text("142 mg/dL")
            expect(sugar_overview_card).to_contain_text("Random")
            expect(sugar_overview_card).to_contain_text("As of 23 Jul 2026")

            # Take workspace overview screenshot
            page.screenshot(path="home/jules/verification/doctor_workspace_overview_sprint36b.png")
            print("📸 Captured doctor_workspace_overview_sprint36b.png!")

            # Switch to Timeline Tab
            print("👥 17. Switching to Historical Timeline Tab...")
            page.click("#ws-tab-timeline")
            page.wait_for_selector("text=Longitudinal Health History Timeline")

            # Verify timeline items are identical and match exactly
            page.wait_for_selector(".table-row-hover:has-text('142 mg/dL')") # Random
            page.wait_for_selector(".table-row-hover:has-text('168 mg/dL')") # Post-meal
            page.wait_for_selector(".table-row-hover:has-text('125 mg/dL')") # Fasting
            page.wait_for_selector(".table-row-hover:has-text('118 mg/dL')") # Pre-meal
            page.wait_for_selector(".table-row-hover:has-text('110 mg/dL')") # Legacy

            row_ws_random = page.locator(".table-row-hover:has-text('142 mg/dL')")
            expect(row_ws_random).to_contain_text("Random")
            expect(row_ws_random).to_contain_text("23 Jul 2026")

            row_ws_legacy = page.locator(".table-row-hover:has-text('110 mg/dL')")
            expect(row_ws_legacy).to_contain_text("22 Jul 2026")
            text_content_ws = row_ws_legacy.inner_text()
            assert "Fasting" not in text_content_ws
            assert "Pre-meal" not in text_content_ws
            assert "Post-meal" not in text_content_ws
            assert "Random" not in text_content_ws

            # Switch to Trends Tab
            print("👥 18. Switching to Trends Tab...")
            page.click("#ws-tab-trends")
            page.wait_for_selector("text=Select Health Parameter")

            # Verify glucose context filter row exists in doctor Trends tab and shows Mixed glucose contexts
            page.wait_for_selector("text=Glucose Filter:")
            page.wait_for_selector("text=Mixed glucose contexts")

            # Click Fasting filter in Doctor Workspace and verify stats update
            print("👥 19. Clicking Fasting glucose filter in Doctor Workspace...")
            page.click("button:has-text('Fasting')")
            time.sleep(1)
            page.wait_for_selector("text=Not enough comparable readings")

            # Capture workspace trends screenshot
            page.screenshot(path="home/jules/verification/doctor_workspace_trends_sprint36b.png")
            print("📸 Captured doctor_workspace_trends_sprint36b.png!")

            # Test workspace mobile viewport
            print("📱 20. Testing responsive/mobile viewport size for Doctor Workspace...")
            page.set_viewport_size({"width": 375, "height": 812})
            time.sleep(1)
            page.screenshot(path="home/jules/verification/doctor_workspace_trends_mobile_sprint36b.png")
            print("📸 Captured doctor_workspace_trends_mobile_sprint36b.png!")

            # Restore viewport and logout
            page.set_viewport_size({"width": 1280, "height": 800})
            print("⏾ 21. Logging out Doctor...")
            page.click("button:has-text('Back to list')")
            page.wait_for_selector("text=My Assigned Patients")
            page.click("button.logout-button")
            page.wait_for_selector("text=See how it works")

            print("\n🏁 Sprint 36B E2E visual verification completed successfully and matches perfectly!")

        except Exception as e:
            print(f"❌ Error encountered during E2E verification: {e}")
            page.screenshot(path="home/jules/verification/error_screenshot.png")
            print("📸 Captured error_screenshot.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_sprint36b_verification()
