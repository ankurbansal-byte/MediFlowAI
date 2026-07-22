import time
from playwright.sync_api import sync_playwright, expect

def run_public_verification():
    print("🚀 Starting Playwright E2E visual verification flow for Sprint-26 Public Landing Page...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # Step 1: Visit Public Homepage
        print("🌍 1. Navigating to Public Home Page...")
        page.goto("http://localhost:5173")
        page.wait_for_selector("text=Explore MediFlowAI")

        # Verify the title and sections are there
        page.wait_for_selector("text=Health records that build themselves.")
        page.wait_for_selector("text=How MediFlowAI Works")
        page.wait_for_selector("text=Simply Share")

        page.screenshot(path="/home/jules/verification/sprint26_homepage.png")
        print("📸 Captured sprint26_homepage.png!")

        # Step 2: Open Portal Selection (Login Gateway)
        print("🔑 2. Clicking Login Button...")
        page.click("text=Login")
        page.wait_for_selector("text=Hospital Portal")
        page.wait_for_selector("text=Patient Portal")

        page.screenshot(path="/home/jules/verification/sprint26_portal_selection.png")
        print("📸 Captured sprint26_portal_selection.png!")

        # Step 3: Open Hospital Portal
        print("🏥 3. Navigating to Hospital Portal...")
        page.click("text=Access Hospital Portal")
        page.wait_for_selector("text=Currently logging in as Doctor")

        page.screenshot(path="/home/jules/verification/sprint26_hospital_portal.png")
        print("📸 Captured sprint26_hospital_portal.png!")

        # Step 4: Toggle to Administrator Role
        print("🛠️ 4. Toggling to Administrator role...")
        page.click("text=Administrator")
        page.wait_for_selector("text=Currently logging in as Administrator")

        page.screenshot(path="/home/jules/verification/sprint26_admin_login.png")
        print("📸 Captured sprint26_admin_login.png!")

        # Step 5: Back to Portals & Open Patient Portal
        print("👤 5. Going back to Portal Selection and accessing Patient Portal...")
        page.click("text=Back to Portals")
        page.wait_for_selector("text=Patient Portal")
        page.click("text=Access Patient Portal")
        page.wait_for_selector("text=Patient ID or Email")

        page.screenshot(path="/home/jules/verification/sprint26_patient_login.png")
        print("📸 Captured sprint26_patient_login.png!")

        print("🏁 Visual verification of new homepage and portals completed perfectly!")
        browser.close()

if __name__ == "__main__":
    run_public_verification()
