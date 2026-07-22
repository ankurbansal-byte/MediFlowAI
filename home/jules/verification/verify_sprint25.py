import time
from playwright.sync_api import sync_playwright, expect

def run_sprint25_verification():
    print("🚀 Starting Playwright E2E visual verification flow for Sprint-25 (Hospital Admin Dashboard)...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Step 1: Admin Login
        print("👤 1. Logging in as Hospital Admin...")
        page.goto("http://localhost:5173")
        page.wait_for_selector("#doc-username")
        page.fill("#doc-username", "admin")
        page.fill("#doc-password", "password")
        page.click("button.portal-submit-btn.doctor-btn")

        # Wait for dashboard sidebar navigation
        page.wait_for_selector("aside.sidebar")
        print("✅ Logged in successfully!")

        # Step 2: Verify default landing on Admin Dashboard
        print("📊 2. Verifying default landing screen is Admin Dashboard...")
        page.wait_for_selector("text=Hospital Operational Overview")
        page.wait_for_selector("text=Total Patients Enrolled")
        page.wait_for_selector("text=Total Active Doctors")
        page.wait_for_selector("text=Today's OPD Visits")

        # Take screenshot of the Admin Dashboard landing page
        page.screenshot(path="/home/jules/verification/admin_dashboard_landing.png")
        print("📸 Captured admin_dashboard_landing.png!")

        # Step 3: Verify shortcut to Patients
        print("♙ 3. Verifying shortcut navigation to Patients...")
        page.click("button:has-text('Manage Patients')")
        page.wait_for_selector("text=Patient Management & Enrollment")
        print("✅ Shortcut to Patients works perfectly!")

        # Step 4: Verify Doctors navigation from sidebar
        print("🩺 4. Verifying sidebar navigation to Doctors...")
        page.click("text=Doctors")
        page.wait_for_selector("text=Hospital Doctor Directory")
        print("✅ Sidebar to Doctors works perfectly!")

        # Step 5: Verify OPD / Visits navigation from sidebar
        print("📆 5. Verifying sidebar navigation to OPD / Visits...")
        page.click("text=OPD / Visits")
        page.wait_for_selector("text=OPD Visit & Clinical Encounters")
        print("✅ Sidebar to OPD / Visits works perfectly!")

        # Step 6: Verify Hospital Profile navigation from sidebar
        print("🏥 6. Verifying sidebar navigation to Hospital Profile...")
        page.click("text=Hospital")
        page.wait_for_selector("text=Hospital Profile Management")
        print("✅ Sidebar to Hospital works perfectly!")

        # Step 7: Verify returning to Dashboard
        print("▦ 7. Verifying returning to Dashboard...")
        page.click("text=Dashboard")
        page.wait_for_selector("text=Hospital Operational Overview")
        print("✅ Sidebar back to Dashboard works perfectly!")

        # Take final screenshot
        page.screenshot(path="/home/jules/verification/admin_dashboard_final.png")
        print("📸 Captured admin_dashboard_final.png!")

        # Step 8: Logout Admin
        print("⏾ 8. Logging out Admin...")
        page.click("text=Log Out")
        page.wait_for_selector("#doc-username")
        print("✅ Admin logged out successfully!")

        print("🏁 Sprint-25 E2E Flow completed perfectly!")
        browser.close()

if __name__ == "__main__":
    run_sprint25_verification()
