import time
from playwright.sync_api import sync_playwright, expect

def run_sprint18_flow():
    print("🚀 Starting Playwright E2E visual verification flow for Sprint-18...")

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
        print("✅ Logged in successfully as Hospital Admin!")

        # Step 2: Navigate to OPD / Visits
        print("📆 2. Navigating to OPD / Visits module...")
        page.click("text=OPD / Visits")
        page.wait_for_selector("text=Hospital Patient Directory", state="detached") # ensure directory is visits, not patients
        page.wait_for_selector("text=OPD Visit & Clinical Encounters")

        # Take screenshot of OPD Directory view
        page.screenshot(path="/home/jules/verification/admin_visits_directory.png")
        print("📸 Captured admin_visits_directory.png!")

        # Step 3: Register New Visit
        print("📝 3. Enrolling a new OPD consultation visit...")
        page.select_option("#reg-patient", "PAT-103")
        page.select_option("#reg-doctor", "DOC-101")
        page.select_option("#reg-type", "OPD Consultation")
        page.fill("#reg-complaint", "Playwright verification: diabetes checkup and glucose monitor")
        page.click("button:has-text('Create OPD Encounter')")

        # Wait for success banner
        page.wait_for_selector("text=OPD Visit Registered Successfully!")
        page.screenshot(path="/home/jules/verification/admin_visit_success.png")
        print("📸 Captured admin_visit_success.png!")

        # Acknowledge the success banner
        page.click("button:has-text('Acknowledge & Close')")

        # Step 4: Logout Admin
        print("⏾ 4. Logging out Admin...")
        page.click("text=Log Out")
        page.wait_for_selector("#doc-username")

        # Step 5: Log in as Doctor1
        print("🩺 5. Logging in as Dr. Demo (DOC-101)...")
        page.fill("#doc-username", "doctor1")
        page.fill("#doc-password", "password")
        page.click("button.portal-submit-btn.doctor-btn")
        page.wait_for_selector("aside.sidebar")
        print("✅ Logged in successfully as Doctor!")

        # Step 6: Navigate to doctor Visits Workspace
        print("📆 6. Navigating to practitioner Visits / Consultations...")
        page.click("text=Visits / Consultations")
        page.wait_for_selector("text=Today's Scheduled OPD Consultations")
        page.screenshot(path="/home/jules/verification/doctor_visits_schedule.png")
        print("📸 Captured doctor_visits_schedule.png!")

        # Step 7: Open consultation workspace
        print("🖥️ 7. Starting Consultation Workspace for PAT-103...")
        page.click("button:has-text('Start Consultation Workspace')")
        page.wait_for_selector("text=PRACTITIONER CLINICAL WORKSPACE")

        # Prefill and Save Draft
        print("✍️ 8. Entering symptoms and saving Draft...")
        page.fill("#ws-symptoms", "Complaining of mild thirst and early morning fatigue.")
        page.fill("#ws-diagnosis", "Type 2 Diabetes mellitus - Improving")
        page.fill("#ws-notes", "Advised strictly monitoring fasting and postprandial sugar. Maintain walking plan.")
        page.click("button:has-text('Save Draft')")

        # Wait for draft saved success alert
        page.wait_for_selector("text=Consultation details saved successfully as Draft.")
        page.screenshot(path="/home/jules/verification/doctor_workspace_draft.png")
        print("📸 Captured doctor_workspace_draft.png!")

        # Step 8: Finalize Consultation
        print("🔒 9. Finalizing Consultation...")

        # Override the native window.confirm to return True automatically
        page.evaluate("window.confirm = () => true")
        page.click("button:has-text('Complete Consultation')")

        # Wait for finalized secure block
        page.wait_for_selector("text=Clinical consultation finalized and closed successfully.")
        page.wait_for_selector("text=Encounter File Finalized and Closed")
        page.screenshot(path="/home/jules/verification/doctor_workspace_completed.png")
        print("📸 Captured doctor_workspace_completed.png!")

        # Step 9: Logout Doctor
        print("⏾ 10. Logging out Doctor...")
        page.click("text=Log Out")
        page.wait_for_selector("#doc-username")

        # Step 10: Log in as Admin to verify Patient Profile Visits
        print("👤 11. Logging back in as Admin to verify Patient Profile visits history...")
        page.fill("#doc-username", "admin")
        page.fill("#doc-password", "password")
        page.click("button.portal-submit-btn.doctor-btn")
        page.wait_for_selector("aside.sidebar")

        # Go to Patients View
        page.click("text=Patients")
        page.wait_for_selector("text=Hospital Patient Directory")

        # Select Patient PAT-103
        page.click("tr:has-text('PAT-103') button:has-text('View Patient')")
        page.wait_for_selector("text=Dedicated Patient File Foundation")

        # Open Visits tab
        page.click("#tab-care-team") # Wait, tab-care-team is there, let's look for visits tab text
        page.click("button:has-text('Visits')")
        page.wait_for_selector("text=Clinical Outpatient Visit History")
        page.wait_for_selector("text=completed")
        page.screenshot(path="/home/jules/verification/admin_patient_visits_history.png")
        print("📸 Captured admin_patient_visits_history.png!")

        # Click View on the completed visit to open detail modal
        print("🔍 12. Opening permitted completed encounter file details modal...")
        page.click("tr:has-text('completed') button:has-text('View')")
        page.wait_for_selector("text=Clinical Encounter File (")
        page.screenshot(path="/home/jules/verification/admin_patient_visit_modal_detail.png")
        print("📸 Captured admin_patient_visit_modal_detail.png!")

        # Close Modal
        page.click("button:has-text('Close File')")

        # Step 11: Verify Doctor Profile consultation history
        print("🩺 13. Verifying Admin Doctor Profile consultation history...")
        page.click("text=Doctors")
        page.wait_for_selector("text=Hospital Doctor Directory")

        # Select Dr. Demo
        page.click("tr:has-text('DOC-101') button:has-text('View Doctor')")
        page.wait_for_selector("text=Dedicated Doctor Profile")

        # Open Consultations History tab
        page.click("button:has-text('Consultations History')")
        page.wait_for_selector("text=Doctor OPD Consultation Logs")
        page.wait_for_selector("text=PAT-103")
        page.screenshot(path="/home/jules/verification/admin_doctor_visits_history.png")
        print("📸 Captured admin_doctor_visits_history.png!")

        print("🏁 Flow completed perfectly! Closing browser.")
        browser.close()

if __name__ == "__main__":
    run_sprint18_flow()
