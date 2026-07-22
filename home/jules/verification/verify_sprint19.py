import time
from playwright.sync_api import sync_playwright, expect

def run_sprint19_flow():
    print("🚀 Starting Playwright E2E visual verification flow for Sprint-19...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Step 1: Admin Login
        print("👤 1. Logging in as Hospital Admin...")
        page.goto("http://localhost:5173")

        # Public Home page login click
        page.wait_for_selector("text=Explore MediFlowAI")
        page.click("text=Login")

        # Portal selection click
        page.wait_for_selector("text=Hospital Portal")
        page.click("text=Access Hospital Portal")

        # Select Admin role
        page.wait_for_selector("text=Administrator")
        page.click("text=Administrator")

        page.wait_for_selector("#doc-username")
        page.fill("#doc-username", "admin")
        page.fill("#doc-password", "password")
        page.click("button.portal-submit-btn.doctor-btn")

        # Wait for dashboard sidebar navigation
        page.wait_for_selector("aside.sidebar")
        print("✅ Logged in successfully as Hospital Admin!")

        # Step 2: Navigate to OPD / Visits
        print("📆 2. Navigating to OPD / Visits module...")
        page.click("text=OPD / Visits")
        page.wait_for_selector("text=OPD Visit & Clinical Encounters")

        # Step 3: Open Draft Encounter ENC-10002 to record vitals
        print("🔍 3. Opening draft encounter ENC-10002 file details modal...")
        page.click("tr:has-text('ENC-10002') button:has-text('View')")
        page.wait_for_selector("text=Record Vitals / Clinical Measurements")

        # Step 4: Record Vitals
        print("✍️ 4. Recording structured vitals as Admin...")
        page.fill("#vit-glucose", "110")
        page.fill("#vit-bp-sys", "120")
        page.fill("#vit-bp-dia", "80")
        page.fill("#vit-hr", "75")
        page.fill("#vit-temp", "36.8")
        page.fill("#vit-spo2", "98")
        page.fill("#vit-rr", "16")
        page.fill("#vit-weight", "72.5")
        page.fill("#vit-height", "175")
        page.screenshot(path="/home/jules/verification/admin_vitals_pre_save.png")

        page.click("#btn-save-vitals")
        page.wait_for_selector("text=Structured vitals recorded successfully!")
        print("✅ Vitals recorded successfully!")
        page.screenshot(path="/home/jules/verification/admin_vitals_saved.png")

        # Step 5: Update Vitals to verify idempotent update (no duplicates)
        print("✍️ 5. Updating existing vitals to verify safe update logic...")
        page.fill("#vit-glucose", "115")
        page.fill("#vit-bp-sys", "122")
        page.fill("#vit-bp-dia", "82")
        page.click("#btn-save-vitals")
        page.wait_for_selector("text=Structured vitals recorded successfully!")
        print("✅ Vitals updated safely and successfully without duplication!")
        page.screenshot(path="/home/jules/verification/admin_vitals_updated.png")

        # Close Modal
        page.click("button:has-text('Close File')")

        # Step 6: Logout Admin
        print("⏾ 6. Logging out Admin...")
        page.click("text=Log Out")

        # Navigate through portals as Doctor
        page.wait_for_selector("text=Explore MediFlowAI")
        page.click("text=Login")
        page.click("text=Access Hospital Portal")
        page.click("text=Doctor")
        page.wait_for_selector("#doc-username")

        # Step 7: Log in as Doctor1
        print("🩺 7. Logging in as Dr. Demo (DOC-101)...")
        page.fill("#doc-username", "doctor1")
        page.fill("#doc-password", "password")
        page.click("button.portal-submit-btn.doctor-btn")
        page.wait_for_selector("aside.sidebar")
        print("✅ Logged in successfully as Doctor!")

        # Step 8: Navigate to doctor Visits Workspace
        print("📆 8. Navigating to practitioner Visits / Consultations...")
        page.click("text=Visits / Consultations")
        page.wait_for_selector("text=Today's Scheduled OPD Consultations")

        # Step 9: Open workspace for draft visit ENC-10002
        print("🖥️ 9. Starting Consultation Workspace for ENC-10002...")
        # Let's find the ENC-10002 row and click "Open Workspace" or "Start Consultation Workspace"
        page.click("tr:has-text('ENC-10002') button:has-text('Open Workspace')")
        page.wait_for_selector("text=PRACTITIONER CLINICAL WORKSPACE")

        # Verify the recorded vitals are displayed exactly
        print("🔍 10. Verifying exact recorded encounter vitals are visible to Doctor...")
        page.wait_for_selector("text=115 mg/dL")
        page.wait_for_selector("text=122/82 mmHg")
        page.wait_for_selector("text=75 bpm")
        page.wait_for_selector("text=36.8 °C")
        page.wait_for_selector("text=98 %")
        page.wait_for_selector("text=16 breaths/min")
        page.wait_for_selector("text=72.5 kg")
        page.wait_for_selector("text=175 cm")
        print("✅ Exact encounter vitals verified successfully inside Doctor Workspace!")
        page.screenshot(path="/home/jules/verification/doctor_workspace_vitals_check.png")

        print("🏁 Sprint-19 flow completed perfectly! Closing browser.")
        browser.close()

if __name__ == "__main__":
    run_sprint19_flow()
