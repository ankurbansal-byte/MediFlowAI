import time
from playwright.sync_api import sync_playwright, expect

def run_sprint28_verification():
    print("🚀 Starting Playwright E2E visual verification flow for Sprint 28...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Step 1: Doctor Login
        print("🩺 1. Logging in as Doctor (doctor1 / password)...")
        page.goto("http://localhost:5173")

        # Click Explore or Login from homepage
        page.wait_for_selector("text=See how it works")
        page.click("text=Login")

        # Access Hospital Portal
        page.wait_for_selector("text=Hospital Portal")
        page.click("text=Access Hospital Portal")

        # Select Doctor role
        page.wait_for_selector("text=Doctor")
        page.click("text=Doctor")

        # Fill credentials
        page.wait_for_selector("#doc-username")
        page.fill("#doc-username", "doctor1")
        page.fill("#doc-password", "password")
        page.click("button.portal-submit-btn.doctor-btn")

        # Wait for dashboard sidebar navigation
        page.wait_for_selector("aside.sidebar")
        print("✅ Logged in successfully as Doctor!")

        # Step 2: Verify Doctor Dashboard Landing & Patient Search
        print("🔍 2. Verifying default landing screen and Find Patient box...")
        page.wait_for_selector("text=Find Patient")
        page.wait_for_selector("text=My Assigned Patients")
        page.screenshot(path="/home/jules/verification/doctor_dashboard.png")
        print("📸 Captured doctor_dashboard.png!")

        # Step 3: Search for a patient by ID
        print("🔍 3. Searching for PAT-101...")
        page.fill("input[placeholder*='Type Name']", "PAT-101")
        page.wait_for_selector("text=PAT-101")
        page.screenshot(path="/home/jules/verification/patient_search_results.png")
        print("📸 Captured patient_search_results.png!")

        # Step 4: Open Workspace
        print("🖥️ 4. Opening Clinical Workspace for PAT-101...")
        page.click("button:has-text('Open Workspace')")
        page.wait_for_selector("text=PRACTITIONER CLINICAL WORKSPACE")
        page.wait_for_selector("text=Latest Physiological Vitals")

        # Verify demographics are shown
        page.wait_for_selector("text=Patient ID: PAT-101")

        # Verify 30-day summary card is shown (Factual Clinical Summary)
        page.wait_for_selector("text=Factual Clinical Summary (Last 30 Days)")
        page.screenshot(path="/home/jules/verification/patient_workspace_overview.png")
        print("📸 Captured patient_workspace_overview.png!")

        # Step 5: Switch to Historical Timeline Tab
        print("`timeline` 5. Switching to Historical Timeline tab...")
        page.click("#ws-tab-timeline")
        page.wait_for_selector("text=Longitudinal Health History Timeline")
        page.screenshot(path="/home/jules/verification/patient_workspace_timeline.png")
        print("📸 Captured patient_workspace_timeline.png!")

        # Step 6: Switch to Health Trends Tab
        print("`trends` 6. Switching to Health Trends tab...")
        page.click("#ws-tab-trends")
        page.wait_for_selector("text=Health Trends")
        page.wait_for_selector("text=Trend Direction")
        page.screenshot(path="/home/jules/verification/patient_workspace_trends.png")
        print("📸 Captured patient_workspace_trends.png!")

        print("🏁 Sprint-28 visual verification completed successfully!")
        browser.close()

if __name__ == "__main__":
    run_sprint28_verification()
