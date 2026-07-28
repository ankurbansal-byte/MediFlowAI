import time
import sys
from playwright.sync_api import sync_playwright, expect

def run_sprint45_verification():
    print("\n🚀 Starting Playwright E2E visual verification flow for Sprint 45 (Unified Timeline & Long History)...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        try:
            # Set high-resolution viewport to capture full dashboard
            page.set_viewport_size({"width": 1280, "height": 1800})

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

            # Verify greeting & ID consistency
            print("📋 3. Verifying patient greeting and secondary ID...")
            page.wait_for_selector("text=Welcome, Patient PAT-110")
            page.wait_for_selector("text=Patient ID: PAT-110")

            # Add a couple of health records via portal to ensure we have routine measurements
            print("📝 4. Submitting a new BP health record through modal...")
            page.click(".whatsapp-info-hint")
            page.wait_for_selector("#param-select")
            page.select_option("#param-select", "blood_pressure")
            page.fill("input[placeholder='Sys (e.g. 120)']", "125")
            page.fill("input[placeholder='Dia (e.g. 80)']", "80")
            page.click("button:has-text('Save Record')")
            time.sleep(1)

            print("📝 5. Submitting a new sugar health record through modal...")
            page.click(".whatsapp-info-hint")
            page.wait_for_selector("#param-select")
            page.select_option("#param-select", "blood_sugar")
            page.fill("#param-value", "122")
            page.click("button:has-text('Save Record')")
            time.sleep(1)

            # Navigate to detailed Health / Trends
            print("\n📈 6. Navigating to Health / Trends tab...")
            page.click("aside >> text=Health / Trends")
            page.wait_for_selector("text=Health Analytics")

            # Wait for Complete Health History title
            page.wait_for_selector("text=Complete Health History")

            # Verify that both routine records are displayed in the chronological history
            print("📋 7. Verifying unified timeline displays routine readings...")

            # Check Routine entry (Blood Pressure)
            bp_item = page.locator(".table-row-hover:has-text('ROUTINE'):has-text('Blood Pressure')").first
            expect(bp_item).to_be_visible()

            # Check Routine entry (Blood Sugar)
            sugar_item = page.locator(".table-row-hover:has-text('ROUTINE'):has-text('Blood Sugar')").first
            expect(sugar_item).to_be_visible()

            # Check empty state for lab results as no reports have been parsed in the dev session yet
            lab_empty_state = page.locator("text=No laboratory records found")
            expect(lab_empty_state).to_be_visible()
            print("✅ Lab observations empty state verified successfully!")

            # Scroll complete health history into view so screenshot captures it
            page.locator("text=Complete Health History").scroll_into_view_if_needed()
            time.sleep(1)

            # Capture Patient Trends screenshot showing filters and routine entries
            page.screenshot(path="/home/jules/verification/patient_trends_sprint45.png")
            print("📸 Captured patient_trends_sprint45.png!")

            # Test Category Filter: click "Blood Pressure" filter using unique ID
            print("🎨 8. Clicking 'Blood Pressure' category filter...")
            page.click("#cat-filter-blood_pressure")
            time.sleep(1)

            # BP items should be visible, Sugar items should NOT be visible
            expect(bp_item).to_be_visible()
            expect(sugar_item).not_to_be_visible()
            print("✅ Category filtering verified: Sugar items excluded successfully!")

            # Test resetting category filter using unique ID
            print("🎨 9. Clicking 'All Records' category filter...")
            page.click("#cat-filter-all")
            time.sleep(1)
            expect(bp_item).to_be_visible()
            expect(sugar_item).to_be_visible()

            # ==========================================
            # Step 3: Doctor-Side Authorized Workspace View
            # ==========================================
            print("\n🩺 10. Logging out to log in as Doctor...")
            page.click(".logout-button")
            time.sleep(1)

            print("🩺 11. Logging in as Doctor doctor1...")
            page.goto("http://localhost:5173")
            page.wait_for_selector("text=Access Portals")
            page.click("text=Access Portals")
            page.wait_for_selector("text=Access Hospital Portal")
            page.click("text=Access Hospital Portal")

            page.wait_for_selector("#doc-username")
            page.fill("#doc-username", "doctor1")
            page.fill("#doc-password", "password")
            page.click("button.portal-submit-btn.doctor-btn")

            # Wait for Doctor Workspace/dashboard
            page.wait_for_selector("text=Doctor Dashboard", timeout=15000)
            print("✅ Logged in successfully as Doctor!")

            # Go to My Patients tab
            print("🩺 12. Opening Patient PAT-110 workspace...")
            page.click("aside >> text=My Patients")
            page.wait_for_selector("text=My Assigned Patients Directory")

            # Click view icon/button for PAT-110
            page.click("tr:has-text('PAT-110') >> button:has-text('Open Workspace')")

            # Wait for workspace layout
            page.wait_for_selector("text=Patient Identity Context")
            print("✅ Patient Workspace loaded successfully for PAT-110!")

            # Click "Historical Timeline" tab
            print("🩺 13. Accessing 'Historical Timeline' Tab...")
            page.click("button#ws-tab-timeline")
            time.sleep(1)

            # Verify that both routine readings are rendered clearly in doctor timeline too
            print("📋 14. Verifying doctor's view shows consistent unified timeline with Routine tag...")
            doc_bp_item = page.locator(".table-row-hover:has-text('ROUTINE'):has-text('Blood Pressure')").first
            expect(doc_bp_item).to_be_visible()

            # Capture Doctor Workspace timeline screenshot
            page.screenshot(path="/home/jules/verification/doctor_timeline_sprint45.png")
            print("📸 Captured doctor_timeline_sprint45.png!")

            print("\n🏁 Sprint 45 E2E visual verification completed successfully!")

        except Exception as e:
            print(f"❌ Error encountered during E2E verification: {e}")
            page.screenshot(path="/home/jules/verification/error_screenshot_sprint45.png")
            print("📸 Captured error_screenshot_sprint45.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_sprint45_verification()
