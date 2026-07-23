import time
from playwright.sync_api import sync_playwright, expect

def run_sprint30_verification():
    print("🚀 Starting Playwright E2E visual verification flow for Sprint 30...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Step 1: Patient Login
        print("👤 1. Navigating to Login Page...")
        page.goto("http://localhost:5173")

        # Click Explore or Login from homepage
        page.wait_for_selector("text=See how it works")
        page.click("text=Login")

        # Access Patient Portal
        print("👤 2. Selecting Patient Portal...")
        page.wait_for_selector("text=Patient Portal")
        page.click("text=Access Patient Portal")

        # Fill credentials
        print("👤 3. Submitting credentials for PAT-101...")
        page.wait_for_selector("#pat-username")
        page.fill("#pat-username", "PAT-101")
        page.fill("#pat-password", "password")
        page.click("button.portal-submit-btn.patient-btn")

        # Wait for dashboard sidebar navigation
        page.wait_for_selector("aside.sidebar")
        print("✅ Logged in successfully as Patient PAT-101!")

        # Step 2: Verify Patient Welcome Greeting & Secondary ID
        print("📋 4. Verifying Greeting with Actual Name and Secondary Patient ID...")
        # Since PAT-101's full name is "Patient PAT-101"
        page.wait_for_selector("text=Welcome, Patient PAT-101")
        page.wait_for_selector("text=Patient ID: PAT-101")

        # Verify the WhatsApp hint
        print("💬 5. Verifying WhatsApp submission text...")
        page.wait_for_selector("text=Health updates are automatically organized from your connected WhatsApp submissions.")

        # Verify no prominent manual Add button in the header
        # The prominent button was "Add New Health Record"
        has_prominent_button = page.locator("button:has-text('Add New Health Record')").count() > 0
        print(f"🔍 6. Checking for prominent manual 'Add New Health Record' button: {'Found (unwanted)' if has_prominent_button else 'Not Found (expected)'}")
        assert not has_prominent_button, "Should not find the prominent 'Add New Health Record' button on the dashboard header!"

        # Verify other dashboard components are present
        page.wait_for_selector("text=⚡ Latest Health Snapshot")
        page.wait_for_selector("text=📊 Factual Clinical Summary (Last 30 Days)")
        page.wait_for_selector("text=Longitudinal Health History")

        # Capture Patient Dashboard screenshot
        page.screenshot(path="home/jules/verification/patient_dashboard_sprint30.png")
        print("📸 Captured patient_dashboard_sprint30.png!")

        # Step 3: Click to Detailed Trends and History
        print("📈 7. Clicking Detailed Trends & History navigation button...")
        page.click("text=Detailed Trends & History")
        page.wait_for_selector("text=Analytics Workspace")
        page.wait_for_selector("text=Health Summary Engine")

        # Verify complete chronological list is present at the bottom of the TrendsView
        print("🏥 8. Verifying complete chronological physiological list is present in Health / Trends...")
        page.wait_for_selector("text=Complete Physiological History")

        page.screenshot(path="home/jules/verification/patient_detailed_trends_sprint30.png")
        print("📸 Captured patient_detailed_trends_sprint30.png!")

        # Step 4: Timeframe switching
        print("📅 9. Clicking 'Last 7 Days' period filter button...")
        page.click("text=Last 7 Days")
        time.sleep(1)
        page.screenshot(path="home/jules/verification/patient_trends_7days_sprint30.png")
        print("📸 Captured patient_trends_7days_sprint30.png!")

        # Step 5: Switch to AI Insights tab
        print("✦ 10. Switching to AI Clinical Insights view...")
        page.click("aside.sidebar button:has-text('AI Insights')")
        page.wait_for_selector("text=✦ Clinical Observations Progress Note")
        page.screenshot(path="home/jules/verification/patient_ai_insights_sprint30.png")
        print("📸 Captured patient_ai_insights_sprint30.png!")

        # Step 6: Log out and verify Doctor login is still fully operational
        print("🩺 11. Logging out and testing Doctor login...")
        page.click("button.logout-button")
        page.wait_for_selector("text=See how it works")

        # Doctor Login
        page.click("text=Login")
        page.wait_for_selector("text=Hospital Portal")
        page.click("text=Access Hospital Portal")
        page.wait_for_selector("#doc-username")
        page.fill("#doc-username", "doctor1")
        page.fill("#doc-password", "password")
        page.click("button.portal-submit-btn.doctor-btn")

        page.wait_for_selector("text=My Assigned Patients")
        page.screenshot(path="home/jules/verification/doctor_dashboard_sprint30.png")
        print("📸 Captured doctor_dashboard_sprint30.png!")

        print("🏁 Sprint-30 visual verification completed successfully!")
        browser.close()

if __name__ == "__main__":
    run_sprint30_verification()
