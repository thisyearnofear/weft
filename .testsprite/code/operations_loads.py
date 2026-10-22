import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        pw = await async_api.async_playwright().start()

        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        context = await browser.new_context()
        context.set_default_timeout(15000)

        page = await context.new_page()

        # @@ts-step {"i": 1, "type": "action", "action": "navigate", "desc": "Navigate to the Weft landing page"}
        await page.goto("VAR_{url}")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass

        # @@ts-step {"i": 2, "type": "action", "action": "click", "desc": "Click the Open program ops link"}
        elem = page.locator("a[href='/canton']").first
        await elem.scroll_into_view_if_needed(timeout=10000)
        await elem.click(timeout=10000)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass

        # @@ts-step {"i": 3, "type": "action", "action": "click", "desc": "Click the Operations link"}
        elem = page.locator("a[href='/operations']").first
        await elem.scroll_into_view_if_needed(timeout=10000)
        await elem.click(timeout=10000)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass

        # @@ts-step {"i": 4, "type": "assertion", "action": "text-contains", "desc": "Performance KPI cards are visible on the Operations page"}
        await expect(page.locator("body").first).to_contain_text("Performance")

        # @@ts-step {"i": 5, "type": "assertion", "action": "text-contains", "desc": "KPI cards include the Milestones Verified metric"}
        await expect(page.locator("body").first).to_contain_text("Milestones Verified")

        # @@ts-step {"i": 6, "type": "assertion", "action": "text-contains", "desc": "KPI cards include the Capital Processed metric"}
        await expect(page.locator("body").first).to_contain_text("Capital Processed")

        # @@ts-step {"i": 7, "type": "assertion", "action": "text-contains", "desc": "The Financial Ledger section is visible"}
        await expect(page.locator("body").first).to_contain_text("Financial Ledger")

        # @@ts-step {"i": 8, "type": "assertion", "action": "text-contains", "desc": "Financial Ledger includes a Reliable Execution transaction"}
        await expect(page.locator("body").first).to_contain_text("Reliable Execution")

        # @@ts-step {"i": 9, "type": "assertion", "action": "text-contains", "desc": "Operations metrics include Revenue Earned"}
        await expect(page.locator("body").first).to_contain_text("Revenue Earned")

        # @@ts-step {"i": 10, "type": "assertion", "action": "text-contains", "desc": "Operations metrics include Net P&L"}
        await expect(page.locator("body").first).to_contain_text("Net P&L")

        # @@ts-step {"i": 11, "type": "assertion", "action": "text-contains", "desc": "The Verification Log section is visible"}
        await expect(page.locator("body").first).to_contain_text("Verification Log")

        # @@ts-step {"i": 12, "type": "assertion", "action": "text-contains", "desc": "Verification Log lists the pending milestone"}
        await expect(page.locator("body").first).to_contain_text("0x709ab5f0")

        # @@ts-step {"i": 13, "type": "assertion", "action": "text-contains", "desc": "Infrastructure Health section is visible"}
        await expect(page.locator("body").first).to_contain_text("Infrastructure Health")

        # @@ts-step {"i": 14, "type": "assertion", "action": "text-contains", "desc": "Infrastructure Health displays the recovery-events indicator"}
        await expect(page.locator("body").first).to_contain_text("Recovery Events")

        # @@ts-step {"i": 15, "type": "assertion", "action": "text-contains", "desc": "Infrastructure Health displays the failures indicator"}
        await expect(page.locator("body").first).to_contain_text("Failures")

        # @@ts-step {"i": 16, "type": "assertion", "action": "text-contains", "desc": "Infrastructure Health displays the recoveries indicator"}
        await expect(page.locator("body").first).to_contain_text("Recoveries")

        # @@ts-step {"i": 17, "type": "assertion", "action": "text-contains", "desc": "Infrastructure Health displays Stripe status"}
        await expect(page.locator("body").first).to_contain_text("Stripe")

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
