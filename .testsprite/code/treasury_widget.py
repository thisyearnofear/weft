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

        # @@ts-step {"i": 2, "type": "action", "action": "click", "desc": "Open the Operations link in the footer navigation"}
        elem = page.locator("footer a[href='/operations']").first
        await elem.scroll_into_view_if_needed(timeout=10000)
        await elem.click(timeout=10000)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass

        # @@ts-step {"i": 3, "type": "assertion", "action": "text-contains", "desc": "Operations dashboard shows a KPI card titled Revenue Earned with a dollar amount"}
        await expect(page.locator("body").first).to_contain_text("Revenue Earned")

        # @@ts-step {"i": 4, "type": "assertion", "action": "text-contains", "desc": "Operations dashboard shows a KPI card titled Net P&L with a dollar amount"}
        await expect(page.locator("body").first).to_contain_text("Net P&L")

        # @@ts-step {"i": 5, "type": "assertion", "action": "text-contains", "desc": "The Financial Ledger section is visible"}
        await expect(page.locator("body").first).to_contain_text("Financial Ledger")

        # @@ts-step {"i": 6, "type": "assertion", "action": "text-contains", "desc": "Financial Ledger lists at least one charge naming a milestone"}
        await expect(page.locator("body").first).to_contain_text("Reliable Execution")

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
