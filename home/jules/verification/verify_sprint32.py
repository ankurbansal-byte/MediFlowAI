import time
import sys
from playwright.sync_api import sync_playwright, expect

def run_sprint32_verification():
    print("🚀 Starting Playwright E2E visual verification flow for Sprint 32...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Listen to console messages
        page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        try:
            # ==========================================
            # Step 1: Admin Login
            # ==========================================
            print("👤 1. Navigating to Login Page...")
            page.goto("http://localhost:5173")

            # Click Login from homepage
            page.wait_for_selector("text=See how it works")
            page.click("text=Login")

            # Click access Hospital Portal
            page.wait_for_selector("text=Hospital Portal")
            page.click("text=Access Hospital Portal")

            # Select Admin role tab
            page.wait_for_selector("text=Administrator")
            page.click("text=Administrator")

            # Fill Admin credentials
            print("👤 2. Submitting Admin credentials...")
            page.wait_for_selector("#doc-username")
            page.fill("#doc-username", "admin")
            page.fill("#doc-password", "password")
            page.click("button.portal-submit-btn.doctor-btn")

            # Wait for dashboard sidebar navigation
            page.wait_for_selector("aside.sidebar", timeout=15000)
            print("✅ Logged in successfully as Hospital Administrator!")

            # Verify Landing on Admin Dashboard
            page.wait_for_selector("text=Hospital Admin Overview")

            # ==========================================
            # Step 2: Enroll a Test Patient & Assign Doctor
            # ==========================================
            print("♙ 3. Navigating to Patient Directory & Care Team Management...")
            page.click("aside.sidebar button:has-text('Patients')")
            page.wait_for_selector("text=Patient Directory & Care Team Management")

            # Since PAT-101 is already registered, let's open PAT-101's profile directly
            print("♙ 4. Opening profile of PAT-101...")
            # Locate View Patient button for PAT-101 or search PAT-101
            page.fill("input[placeholder='Search patient by ID, Full Name, or Email...']", "PAT-101")
            page.click("button:has-text('Search')")
            time.sleep(1)

            page.click("button:has-text('View Patient') >> nth=0")
            page.wait_for_selector("text=Patient Directory File")

            # Check Care Team tab
            print("♙ 5. Switching to Care Team tab...")
            page.click("#tab-care-team")
            page.wait_for_selector("text=Assign Doctor to Care Team")

            # Ensure Doctor DOC-101 is assigned to PAT-101 (or assign if not active)
            has_doc = page.locator("text=DOC-101").count() > 0
            if not has_doc:
                print("🩺 6. Assigning doctor DOC-101 to patient's care team...")
                page.select_option("#assign-doctor-select", "DOC-101")
                page.click("#btn-confirm-assign-doctor")
                time.sleep(1)
                page.wait_for_selector("text=Doctor successfully assigned to this patient's care team!")
            else:
                print("🩺 6. Doctor DOC-101 is already assigned to PAT-101 care team.")

            # Back to dashboard and logout
            print("⏾ 7. Logging out Admin...")
            page.click("aside.sidebar button:has-text('Dashboard')")
            page.wait_for_selector("text=Hospital Admin Overview")
            page.click("button.logout-button")
            page.wait_for_selector("text=See how it works")

            # ==========================================
            # Step 3: Doctor Login & Patient Workspace
            # ==========================================
            print("👤 8. Logging in as Doctor...")
            page.click("text=Login")
            page.wait_for_selector("text=Hospital Portal")
            page.click("text=Access Hospital Portal")

            # Tab 'Doctor' is selected by default in Hospital Portal, let's submit credentials
            page.wait_for_selector("#doc-username")
            page.fill("#doc-username", "doctor1")
            page.fill("#doc-password", "password")
            page.click("button.portal-submit-btn.doctor-btn")

            # Wait for doctor landing page
            page.wait_for_selector("text=My Assigned Patients", timeout=15000)
            print("✅ Logged in successfully as Doctor!")

            # Verify assigned patient PAT-101 visibility in Find Patient card
            print("👥 9. Searching PAT-101 in Doctor Find Patient Hub...")
            page.fill("input[placeholder='Type Name, ID (e.g. PAT-101), or mobile...']", "PAT-101")
            time.sleep(1)

            # Open patient workspace
            print("👥 10. Opening Patient Workspace for PAT-101...")
            page.click("button:has-text('Open Workspace') >> nth=0")
            page.wait_for_selector("text=PRACTITIONER CLINICAL WORKSPACE")
            page.wait_for_selector("text=Patient ID: PAT-101")

            # Switch tabs to verify trends/timeline consistency
            print("👥 11. Checking workspace vital trends and historical records...")
            page.click("#ws-tab-timeline")
            page.wait_for_selector("text=Historical Timeline")

            # Return to dashboard and logout
            print("⏾ 12. Logging out Doctor...")
            page.click("button:has-text('Back to list')")
            page.wait_for_selector("text=My Assigned Patients")
            page.click("button.logout-button")
            page.wait_for_selector("text=See how it works")

            # ==========================================
            # Step 4: Patient Login & Consistency Check
            # ==========================================
            print("👤 13. Logging in as Patient PAT-101...")
            page.click("text=Login")
            page.wait_for_selector("text=Patient Portal")
            page.click("text=Access Patient Portal")

            # Submit Patient Credentials
            page.wait_for_selector("#pat-username")
            page.fill("#pat-username", "PAT-101")
            page.fill("#pat-password", "password")
            page.click("button.portal-submit-btn.patient-btn")

            # Wait for Patient Dashboard
            page.wait_for_selector("aside.sidebar", timeout=15000)
            print("✅ Logged in successfully as Patient PAT-101!")

            # Verify greeting & ID consistency
            print("📋 14. Verifying patient greeting and secondary ID...")
            page.wait_for_selector("text=Welcome, Patient PAT-101")
            page.wait_for_selector("text=Patient ID: PAT-101")

            # Verify Snapshot displays real values
            print("📋 15. Verifying Latest Health Snapshot is loaded...")
            page.wait_for_selector("text=⚡ Latest Health Snapshot")

            # Capture Patient Dashboard screenshot
            page.screenshot(path="home/jules/verification/patient_dashboard_sprint32.png")
            print("📸 Captured patient_dashboard_sprint32.png!")

            # Go to Detailed Trends & History
            print("📈 16. Navigating to Health / Trends & Analysis...")
            page.click("text=Detailed Trends & History")
            page.wait_for_selector("text=Health Analytics")
            page.wait_for_selector("text=Complete Health History")

            # Capture Patient Trends screenshot
            page.screenshot(path="home/jules/verification/patient_trends_sprint32.png")
            print("📸 Captured patient_trends_sprint32.png!")

            # Logout Patient
            print("⏾ 17. Logging out Patient...")
            page.click("button.logout-button")
            page.wait_for_selector("text=See how it works")

            print("🏁 Sprint 32 E2E cross-role visual verification completed successfully!")

        except Exception as e:
            print(f"❌ Error encountered: {e}")
            page.screenshot(path="home/jules/verification/error_screenshot.png")
            print("📸 Captured error_screenshot.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_sprint32_verification()
