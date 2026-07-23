import time
from playwright.sync_api import sync_playwright, expect

def run_sprint29_verification():
    print("🚀 Starting Playwright E2E visual verification flow for Sprint 29 (Patient Dashboard)...")

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

        # Step 2: Verify Patient Welcome Greeting
        print("📋 4. Verifying Greeting, Latest Health Snapshot and Factual Clinical Summary...")
        page.wait_for_selector("text=Welcome, PAT-101")
        page.wait_for_selector("text=⚡ Latest Health Snapshot")
        page.wait_for_selector("text=📊 Factual Clinical Summary (Last 30 Days)")
        page.wait_for_selector("text=Longitudinal Health History")

        # Capture Patient Dashboard screenshot
        page.screenshot(path="/home/jules/verification/patient_dashboard_overview.png")
        print("📸 Captured patient_dashboard_overview.png!")

        # Step 3: Click to Detailed Trends and History
        print("📈 5. Clicking Detailed Trends & History navigation button...")
        page.click("text=Detailed Trends & History")
        page.wait_for_selector("text=Analytics Workspace")
        page.wait_for_selector("text=Health Summary Engine")
        page.screenshot(path="/home/jules/verification/patient_detailed_trends.png")
        print("📸 Captured patient_detailed_trends.png!")

        # Step 4: Timeframe switching
        print("📅 6. Clicking 'Last 7 Days' period filter button...")
        page.click("text=Last 7 Days")
        time.sleep(1)
        page.screenshot(path="/home/jules/verification/patient_trends_7days.png")
        print("📸 Captured patient_trends_7days.png!")

        # Step 5: Switch to AI Insights tab
        print("✦ 7. Switching to AI Clinical Insights view...")
        # Since sidebar label is "AI Insights", let's click it in the sidebar
        page.click("aside.sidebar button:has-text('AI Insights')")
        page.wait_for_selector("text=✦ Clinical Observations Progress Note")
        page.screenshot(path="/home/jules/verification/patient_ai_insights.png")
        print("📸 Captured patient_ai_insights.png!")

        # Step 6: Log out and verify Doctor login is still fully operational
        print("🩺 8. Logging out and testing Doctor login...")
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
        page.screenshot(path="/home/jules/verification/doctor_dashboard_post_sprint29.png")
        print("📸 Captured doctor_dashboard_post_sprint29.png!")

        print("🏁 Sprint-29 visual verification completed successfully!")
        browser.close()

if __name__ == "__main__":
    run_sprint29_verification()
