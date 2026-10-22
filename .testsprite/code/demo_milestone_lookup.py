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

        # @@ts-step {"i": 2, "type": "action", "action": "navigate", "desc": "Navigate to the demo milestone detail page"}
        await page.goto("VAR_{url}" + "/project/0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass

        # @@ts-step {"i": 3, "type": "assertion", "action": "text-contains", "desc": "Milestone heading displays 'Weft demo milestone'"}
        await expect(page.locator("body").first).to_contain_text("Weft demo milestone")

        # @@ts-step {"i": 4, "type": "assertion", "action": "text-contains", "desc": "Milestone status is Verified"}
        await expect(page.locator("body").first).to_contain_text("Verified")

        # @@ts-step {"i": 5, "type": "assertion", "action": "text-contains", "desc": "Milestone amount is 0.0100 ETH"}
        await expect(page.locator("body").first).to_contain_text("0.0100")

        # @@ts-step {"i": 6, "type": "assertion", "action": "text-contains", "desc": "Builder ENS is weft.thisyearnofear.eth"}
        await expect(page.locator("body").first).to_contain_text("weft.thisyearnofear.eth")

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
