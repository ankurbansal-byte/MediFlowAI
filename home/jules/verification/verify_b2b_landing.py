import time
from playwright.sync_api import sync_playwright, expect

def run_verification():
    print("🚀 Starting Playwright verification script for new B2B landing page...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # Handle console messages
        page.on("console", lambda msg: print(f"CONSOLE: [{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        # Step 1: Visit B2B Landing Page
        print("🌍 1. Navigating to B2B Landing Page...")
        page.goto("http://localhost:5173")
        page.wait_for_selector("text=Empower Your Hospital with")

        # Verify key elements
        expect(page.locator("text=Empower Your Hospital with")).to_be_visible()
        expect(page.locator("text=Why Hospitals & Clinics Choose Doc2Me")).to_be_visible()
        expect(page.locator("text=7 Core Vitals Covered on WhatsApp")).to_be_visible()

        page.screenshot(path="home/jules/verification/doc2me_b2b_landing.png")
        print("📸 Captured doc2me_b2b_landing.png!")

        # Step 2: Click Login button
        print("🔑 2. Clicking Login Button...")
        # Let's find all buttons containing the text 'Login' and click the first one that is visible
        login_btn = page.locator("header button:has-text('Login')")
        print(f"Locator match count: {login_btn.count()}")
        login_btn.first.click()

        print("Waiting 2 seconds for state transition...")
        time.sleep(2)

        print(f"Current URL after click: {page.url}")
        page.screenshot(path="home/jules/verification/doc2me_b2b_after_click.png")

        # Let's see if the login page was rendered
        print("Checking if 'Patient ID or Email' exists...")
        has_id_label = page.locator("text=Patient ID or Email").count() > 0
        print(f"Has Patient ID or Email label: {has_id_label}")

        page.screenshot(path="home/jules/verification/doc2me_b2b_to_login.png")
        print("📸 Captured doc2me_b2b_to_login.png!")

        print("🏁 Visual verification completed!")
        browser.close()

if __name__ == "__main__":
    run_verification()
