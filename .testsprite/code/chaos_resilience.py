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

        # @@ts-step {"i": 2, "type": "action", "action": "click", "desc": "Click the Developers dropdown button"}
        elem = page.locator("button[aria-haspopup='true']").first
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

        # @@ts-step {"i": 4, "type": "assertion", "action": "text-contains", "desc": "Infrastructure Health section is visible"}
        await expect(page.locator("body").first).to_contain_text("Infrastructure Health")

        # @@ts-step {"i": 5, "type": "assertion", "action": "text-contains", "desc": "Infrastructure Health reports zero failures"}
        await expect(page.locator("body").first).to_contain_text(re.compile(r"Failures\s*0"))

        # @@ts-step {"i": 6, "type": "assertion", "action": "text-contains", "desc": "Recovery events indicator is present"}
        await expect(page.locator("body").first).to_contain_text("Recovery Events")

        # @@ts-step {"i": 7, "type": "assertion", "action": "text-contains", "desc": "Chaos status indicator is present"}
        await expect(page.locator("body").first).to_contain_text("Chaos Active")

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
