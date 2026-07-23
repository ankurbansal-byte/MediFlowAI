import time
import sys
from playwright.sync_api import sync_playwright, expect

def run_sprint31_verification():
    print("🚀 Starting Playwright E2E visual verification flow for Sprint 31 (with debugging)...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Listen to console messages
        page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        try:
            # Step 1: Admin Login
            print("👤 1. Navigating to Login Page...")
            page.goto("http://localhost:5173")

            # Public Home page login click
            page.wait_for_selector("text=See how it works")
            page.click("text=Login")

            # Portal selection click
            page.wait_for_selector("text=Hospital Portal")
            page.click("text=Access Hospital Portal")

            # Select Admin role
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

            # Step 2: Verify default landing on Refined Admin Dashboard
            print("📊 3. Verifying default landing screen is Admin Dashboard with simplified copy...")
            page.wait_for_selector("text=Hospital Admin Overview")
            page.wait_for_selector("text=Total Patients Enrolled")
            page.wait_for_selector("text=Total Active Doctors")
            page.wait_for_selector("text=Today's OPD Visits")
            page.wait_for_selector("text=⚡ Quick Navigation")
            page.wait_for_selector("text=Recently Enrolled Patients")
            page.wait_for_selector("text=Today's OPD Visits Queue")

            # Capture Admin Dashboard screenshot
            page.screenshot(path="home/jules/verification/admin_dashboard_sprint31.png")
            print("📸 Captured admin_dashboard_sprint31.png!")

            # Step 3: Verify navigation to Patients Directory
            print("♙ 4. Navigating to Patients Directory...")
            page.click("button:has-text('Manage Patients')")
            page.wait_for_selector("text=Patient Directory & Care Team Management")
            page.wait_for_selector("text=Enrolled Patients belong securely to this hospital tenant")

            # Capture Patient page screenshot
            page.screenshot(path="home/jules/verification/admin_patients_sprint31.png")
            print("📸 Captured admin_patients_sprint31.png!")

            # Open detailed profile of PAT-101
            print("♙ 5. Opening detailed profile of patient PAT-101...")
            # Since patient list has button "View Patient"
            page.click("button:has-text('View Patient') >> nth=0")
            page.wait_for_selector("text=Patient Directory File")
            page.wait_for_selector("text=Care Team")

            # Select "Care Team" tab
            print("♙ 6. Switching to Care Team tab...")
            page.click("#tab-care-team")
            page.wait_for_selector("text=Assign Doctor to Care Team")

            # Select "Medical History" tab
            print("♙ 7. Switching to Medical History tab and checking adjusted empty state...")
            page.click("#tab-history")
            page.wait_for_selector("text=Medical History Summary")

            # Select "Prescriptions" tab
            print("♙ 8. Switching to Prescriptions tab and checking adjusted empty state...")
            page.click("#tab-prescriptions")
            page.wait_for_selector("text=Prescription Records")

            # Select "Reports" tab
            print("♙ 9. Switching to Reports tab and checking adjusted empty state...")
            page.click("#tab-reports")
            page.wait_for_selector("text=Diagnostic Reports")

            # Step 4: Verify Doctors navigation from sidebar
            print("🩺 10. Navigating to Doctors directory...")
            page.click("aside.sidebar button:has-text('Doctors')")
            page.wait_for_selector("text=Manage Doctor Profiles & Assignments")
            page.wait_for_selector("text=Hospital Doctor Directory")

            # Capture Doctors page screenshot
            page.screenshot(path="home/jules/verification/admin_doctors_sprint31.png")
            print("📸 Captured admin_doctors_sprint31.png!")

            # Step 5: Verify OPD / Visits navigation from sidebar
            print("📆 11. Navigating to OPD / Visits registry...")
            page.click("aside.sidebar button:has-text('OPD / Visits')")
            page.wait_for_selector("text=Visit Registry & Active Consultations")
            page.wait_for_selector("text=OPD Visit Directory")

            # Capture OPD Registry page screenshot
            page.screenshot(path="home/jules/verification/admin_visits_sprint31.png")
            print("📸 Captured admin_visits_sprint31.png!")

            # Step 6: Verify Hospital Profile navigation from sidebar
            print("🏥 12. Navigating to Hospital Location Profile...")
            page.click("aside.sidebar button:has-text('Hospital')")
            page.wait_for_selector("text=Hospital Location Profile")
            page.wait_for_selector("text=Hospital Profile Management")

            # Capture Hospital profile page screenshot
            page.screenshot(path="home/jules/verification/admin_hospital_sprint31.png")
            print("📸 Captured admin_hospital_sprint31.png!")

            # Step 7: Go back to Dashboard and Logout
            print("▦ 13. Navigating back to Dashboard...")
            page.click("aside.sidebar button:has-text('Dashboard')")
            page.wait_for_selector("text=Hospital Admin Overview")

            print("⏾ 14. Logging out...")
            page.click("button.logout-button")
            page.wait_for_selector("text=See how it works")

            print("🏁 Sprint 31 E2E visual verification completed successfully!")

        except Exception as e:
            print(f"❌ Error encountered: {e}")
            page.screenshot(path="home/jules/verification/error_screenshot.png")
            print("📸 Captured error_screenshot.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_sprint31_verification()
