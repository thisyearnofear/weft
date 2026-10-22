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

        # @@ts-step {"i": 2, "type": "action", "action": "click", "desc": "Click the Explorer link"}
        elem = page.locator("a[href='/explorer']").first
        await elem.scroll_into_view_if_needed(timeout=10000)
        await elem.click(timeout=10000)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass

        # @@ts-step {"i": 3, "type": "action", "action": "click", "desc": "Click the 0x709ab5f0...d99891 milestone link"}
        elem = page.locator("a[href='/project/0x709ab5f0c3ddd703a9ce74a4156840204df267bc5812dbdbb96e1eafd4d99891']").first
        await elem.scroll_into_view_if_needed(timeout=10000)
        await elem.click(timeout=10000)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass

        # @@ts-step {"i": 4, "type": "action", "action": "click", "desc": "Click the Open trust profile link"}
        elem = page.locator("a[href='/builder/weft.thisyearnofear.eth']").first
        await elem.scroll_into_view_if_needed(timeout=10000)
        await elem.click(timeout=10000)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass

        # @@ts-step {"i": 5, "type": "assertion", "action": "text-contains", "desc": "The builder profile page heading is visible"}
        await expect(page.locator("body").first).to_contain_text("Builder profile")

        # @@ts-step {"i": 6, "type": "assertion", "action": "text-contains", "desc": "The builder profile identifies weft.thisyearnofear.eth"}
        await expect(page.locator("body").first).to_contain_text("weft.thisyearnofear.eth")

        # @@ts-step {"i": 7, "type": "assertion", "action": "text-contains", "desc": "The builder profile displays a reputation score"}
        await expect(page.locator("body").first).to_contain_text("Reputation Score")

        # @@ts-step {"i": 8, "type": "assertion", "action": "text-contains", "desc": "Reputation score is 85"}
        await expect(page.locator("body").first).to_contain_text("85")

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
