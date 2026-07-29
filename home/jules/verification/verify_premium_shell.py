import time
import sys
from playwright.sync_api import sync_playwright, expect

def run_premium_shell_verification():
    print("🚀 Starting Playwright E2E visual verification for Premium Application Shell...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        try:
            # Overwrite the global Date object to return 2026-07-23 as "today"
            page.add_init_script("""
                const OriginalDate = window.Date;
                const FixedDate = class extends OriginalDate {
                    constructor(...args) {
                        if (args.length === 0) {
                            super('2026-07-23T15:00:00.000Z');
                        } else {
                            super(...args);
                        }
                    }
                };
                FixedDate.now = () => new OriginalDate('2026-07-23T15:00:00.000Z').getTime();
                window.Date = FixedDate;
            """)

            # 1. Login as Patient
            print("\n👤 Navigating to Login Page...")
            page.goto("http://localhost:5173")

            page.wait_for_selector("text=See how it works")
            page.click("text=Login")

            page.wait_for_selector("text=Patient Portal")
            page.click("text=Access Patient Portal")

            print("👤 Logging in as Patient PAT-36B...")
            page.wait_for_selector("#pat-username")
            page.fill("#pat-username", "PAT-36B")
            page.fill("#pat-password", "password")
            page.click("button.portal-submit-btn.patient-btn")

            # Wait for Patient Dashboard
            page.wait_for_selector("aside.sidebar", timeout=15000)
            print("✅ Logged in successfully!")

            # Set viewport to standard high-resolution desktop
            page.set_viewport_size({"width": 1280, "height": 900})
            time.sleep(1)

            # Screenshot 1: Desktop Patient Portal Shell
            print("📸 Capturing Screenshot 1: Desktop Premium Shell...")
            page.screenshot(path="/home/jules/verification/patient_desktop_premium_shell.png")

            # Screenshot 2: Collapsed Sidebar
            print("🎨 Collapsing Sidebar...")
            page.click("text=Collapse")
            time.sleep(0.5)
            print("📸 Capturing Screenshot 2: Collapsed Sidebar...")
            page.screenshot(path="/home/jules/verification/patient_collapsed_sidebar.png")

            # Expand Sidebar back
            page.click("button[aria-label='Expand sidebar']")
            time.sleep(0.5)

            # Screenshot 3: Account Menu Open
            print("🎨 Opening Account Dropdown...")
            page.click("button[aria-label='Account menu']")
            time.sleep(0.5)
            print("📸 Capturing Screenshot 3: Account Dropdown Menu...")
            page.screenshot(path="/home/jules/verification/patient_account_menu.png")

            # Screenshot 4: Logout Confirmation Dialog
            print("🎨 Triggering Sign Out Dialog...")
            page.click("text=Sign Out")
            time.sleep(0.5)
            print("📸 Capturing Screenshot 4: Logout Confirmation Dialog...")
            page.screenshot(path="/home/jules/verification/patient_logout_confirmation.png")

            # Dismiss Logout Dialog by clicking Cancel
            page.click("text=Cancel")
            time.sleep(0.5)

            # Screenshot 5: Mobile Viewport Patient Portal
            print("📱 Switching to mobile viewport (375x812)...")
            page.set_viewport_size({"width": 375, "height": 812})
            time.sleep(1)
            print("📸 Capturing Screenshot 5: Mobile Shell...")
            page.screenshot(path="/home/jules/verification/patient_mobile_shell.png")

            print("\n🏁 Premium shell E2E visual verification completed successfully!")

        except Exception as e:
            print(f"❌ Error encountered: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_premium_shell_verification()
