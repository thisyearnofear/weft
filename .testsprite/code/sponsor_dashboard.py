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

        # @@ts-step {"i": 2, "type": "action", "action": "click", "desc": "Click the Sponsor dashboard link"}
        elem = page.locator("a[href='/sponsor']").first
        await elem.scroll_into_view_if_needed(timeout=10000)
        await elem.click(timeout=10000)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass

        # @@ts-step {"i": 3, "type": "assertion", "action": "text-contains", "desc": "Capital Flow section is visible on the sponsor dashboard"}
        await expect(page.locator("body").first).to_contain_text("Capital Flow")

        # @@ts-step {"i": 4, "type": "assertion", "action": "text-contains", "desc": "Total Funded KPI is visible"}
        await expect(page.locator("body").first).to_contain_text("Total Funded")

        # @@ts-step {"i": 5, "type": "assertion", "action": "text-contains", "desc": "Capital Released KPI is visible"}
        await expect(page.locator("body").first).to_contain_text("Capital Released")

        # @@ts-step {"i": 6, "type": "assertion", "action": "text-contains", "desc": "Capital Locked KPI is visible"}
        await expect(page.locator("body").first).to_contain_text("Capital Locked")

        # @@ts-step {"i": 7, "type": "assertion", "action": "text-contains", "desc": "Verified Rate KPI is visible"}
        await expect(page.locator("body").first).to_contain_text("Verified Rate")

        # @@ts-step {"i": 8, "type": "assertion", "action": "text-contains", "desc": "Dashboard shows 0.0010 ETH funded and locked"}
        await expect(page.locator("body").first).to_contain_text("0.0010")

        # @@ts-step {"i": 9, "type": "assertion", "action": "text-contains", "desc": "Dashboard shows a 0% verified rate"}
        await expect(page.locator("body").first).to_contain_text("0%")

        # @@ts-step {"i": 10, "type": "assertion", "action": "text-contains", "desc": "The funded milestone card is visible"}
        await expect(page.locator("body").first).to_contain_text("Program Milestones")

        # @@ts-step {"i": 11, "type": "assertion", "action": "text-contains", "desc": "The milestone card shows 0x709ab5f0...d99891"}
        await expect(page.locator("body").first).to_contain_text("0x709ab5f0")

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
