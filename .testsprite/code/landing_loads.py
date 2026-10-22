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

        # @@ts-step {"i": 2, "type": "assertion", "action": "visible", "desc": "Hero h1 is visible"}
        await expect(page.locator("h1").first).to_be_visible(timeout=15000)

        # @@ts-step {"i": 3, "type": "assertion", "action": "text-contains", "desc": "Hero h1 reads 'Fund milestones. Release on evidence.'"}
        await expect(page.locator("h1").first).to_contain_text("Fund milestones")

        # @@ts-step {"i": 4, "type": "assertion", "action": "text-contains", "desc": "Hero h1 contains the accent phrase 'Release on evidence.'"}
        await expect(page.locator("h1").first).to_contain_text("Release on evidence")

        # @@ts-step {"i": 5, "type": "assertion", "action": "text-contains", "desc": "Landing page body contains the word 'Escrow'"}
        await expect(page.locator("body").first).to_contain_text("Escrow")

        # @@ts-step {"i": 6, "type": "assertion", "action": "visible", "desc": "Explorer link is visible in navigation"}
        await expect(page.locator("a[href='/explorer']").first).to_be_visible(timeout=15000)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
