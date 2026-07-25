import time
import sys
import json
import urllib.request
from playwright.sync_api import sync_playwright, expect

def seed_e2e_records():
    print("🌱 Seeding E2E WhatsApp records via webhook POST request...")
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "id": "msg-e2e-bp-tc",
                                    "from": "1234567890", # last 10 digits of PAT-101 (+1234567890)
                                    "type": "text",
                                    "text": {
                                        "body": "BP morning 130/80, evening 140/90"
                                    },
                                    "timestamp": "1784541600" # 2026-07-20T10:00:00Z
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }

    try:
        req = urllib.request.Request(
            "http://localhost:5000/webhook",
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as response:
            print(f"✅ Webhook POST status: {response.status}")
    except Exception as e:
        print(f"❌ Failed to seed records via webhook: {e}")
        sys.exit(1)

def run_sprint39_2_verification():
    print("\n🚀 Starting Playwright E2E visual verification flow for Sprint 39.2...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        try:
            # Set high-resolution viewport to capture full dashboard
            page.set_viewport_size({"width": 1280, "height": 1200})

            # Overwrite the global Date object to return 2026-07-20 as "today"
            page.add_init_script("""
                const OriginalDate = window.Date;
                const FixedDate = class extends OriginalDate {
                    constructor(...args) {
                        if (args.length === 0) {
                            super('2026-07-20T15:00:00.000Z');
                        } else {
                            super(...args);
                        }
                    }
                };
                FixedDate.now = () => new OriginalDate('2026-07-20T15:00:00.000Z').getTime();
                window.Date = FixedDate;
            """)

            # ==========================================
            # Step 1: Patient Dashboard Verification
            # ==========================================
            print("\n👤 1. Navigating to Login Page...")
            page.goto("http://localhost:5173")

            page.wait_for_selector("text=See how it works")
            page.click("text=Login")

            page.wait_for_selector("text=Patient Portal")
            page.click("text=Access Patient Portal")

            print("👤 2. Logging in as Patient PAT-101...")
            page.wait_for_selector("#pat-username")
            page.fill("#pat-username", "PAT-101")
            page.fill("#pat-password", "password")
            page.click("button.portal-submit-btn.patient-btn")

            # Wait for Patient Dashboard
            page.wait_for_selector("aside.sidebar", timeout=15000)
            print("✅ Logged in successfully as Patient PAT-101!")

            # Verify greeting & ID consistency
            print("📋 3. Verifying patient greeting and secondary ID...")
            page.wait_for_selector("text=Welcome, Patient PAT-101")
            page.wait_for_selector("text=Patient ID: PAT-101")

            # Verify "Today's Health" Section
            print("📋 4. Verifying Today's Health section lists morning and evening BP records with semantic qualifiers...")
            page.wait_for_selector("text=Today's Health")

            # Morning and Evening BP records should be clearly displayed with their qualifiers instead of submission times
            row_morning = page.locator(".today-record-row:has-text('130/80')")
            expect(row_morning).to_contain_text("Morning")
            expect(row_morning).not_to_contain_text("5:27 PM")
            expect(row_morning).not_to_contain_text("5:30 PM")

            row_evening = page.locator(".today-record-row:has-text('140/90')")
            expect(row_evening).to_contain_text("Evening")
            expect(row_evening).not_to_contain_text("5:27 PM")
            expect(row_evening).not_to_contain_text("5:30 PM")

            # Capture Patient Dashboard screenshot showing Today's Health section
            page.screenshot(path="/home/jules/verification/patient_dashboard_sprint39_2.png")
            print("📸 Captured patient_dashboard_sprint39_2.png!")

            # ==========================================
            # Step 2: Patient Health / Trends Grouped History
            # ==========================================
            print("\n📈 5. Navigating to detailed Health / Trends...")
            page.click("text=View today's records")
            page.wait_for_selector("text=Health Analytics")

            # Verify Date-Grouped history list exists
            print("📈 6. Verifying Date-Grouped History highlights the morning/evening semantic qualifiers...")
            page.wait_for_selector("text=20 JUL 2026")

            bp_history_morning = page.locator("div:has-text('20 JUL 2026') >> text=Morning")
            bp_history_evening = page.locator("div:has-text('20 JUL 2026') >> text=Evening")
            expect(bp_history_morning).to_be_visible()
            expect(bp_history_evening).to_be_visible()

            # Capture Patient Trends screenshot
            page.screenshot(path="/home/jules/verification/patient_trends_sprint39_2.png")
            print("📸 Captured patient_trends_sprint39_2.png!")

            # Logout Patient
            print("⏾ 7. Logging out Patient...")
            page.click("button.logout-button")
            page.wait_for_selector("text=See how it works")

            # ==========================================
            # Step 3: Doctor Workspace Verification
            # ==========================================
            print("\n🩺 8. Logging in as Doctor to verify Cross-Role Display consistency...")
            page.click("text=Login")
            page.wait_for_selector("text=Hospital Portal")
            page.click("text=Access Hospital Portal")

            print("🩺 9. Submitting Doctor credentials...")
            page.wait_for_selector("#doc-username")
            page.fill("#doc-username", "doctor1")
            page.fill("#doc-password", "password")
            page.click("button.portal-submit-btn.doctor-btn")

            # Wait for doctor workspace list
            page.wait_for_selector("text=My Assigned Patients", timeout=15000)
            print("✅ Logged in successfully as Doctor!")

            # Select patient PAT-101 from list
            print("🩺 10. Navigating to PAT-101 Workspace...")
            page.click("button:has-text('Open Workspace') >> nth=0")
            page.wait_for_selector("text=Patient Identity Context")

            # Switch to "Historical Timeline" tab
            print("🩺 11. Opening Historical Timeline tab...")
            page.click("#ws-tab-timeline")
            page.wait_for_selector("text=Longitudinal Health History Timeline")

            # Verify that both BP observations show Morning / Evening clearly in the timeline list
            timeline_morning = page.locator("div:has-text('Longitudinal Health History Timeline') >> text=Morning")
            timeline_evening = page.locator("div:has-text('Longitudinal Health History Timeline') >> text=Evening")
            expect(timeline_morning).to_be_visible()
            expect(timeline_evening).to_be_visible()

            # Capture Doctor Workspace timeline screenshot
            page.screenshot(path="/home/jules/verification/doctor_workspace_sprint39_2.png")
            print("📸 Captured doctor_workspace_sprint39_2.png!")

            print("\n🏁 Sprint 39.2 E2E visual verification completed successfully and matches perfectly!")

        except Exception as e:
            print(f"❌ Error encountered during E2E verification: {e}")
            page.screenshot(path="/home/jules/verification/error_screenshot_sprint39_2.png")
            print("📸 Captured error_screenshot_sprint39_2.png for diagnostics.")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_sprint39_2_verification()
