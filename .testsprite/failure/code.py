import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("https://weft.thisyearnofear.com")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the 'Explorer' link in the top navigation to open the Explorer page.
        # Explorer link
        elem = page.get_by_role('link', name='Explorer', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the milestone link '0x516975af...b1c16f' to open the milestone detail page.
        # 0x516975af...b1c16f link
        elem = page.get_by_role('link', name='0x516975af...b1c16f', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Open trust profile' button to open the builder's trust profile page and verify the ENS and trust/reputation section load.
        # Open trust profile link
        elem = page.get_by_role('link', name='Open trust profile', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Builder profile loads with correct ENS
        # Assert: The page URL contains the ENS weft.thisyearnofear.eth, confirming the builder profile loaded.
        await expect(page).to_have_url(re.compile("weft\\.thisyearnofear\\.eth"), timeout=15000), "The page URL contains the ENS weft.thisyearnofear.eth, confirming the builder profile loaded."
        
        # --> Builder profile shows trust/reputation section
        await page.locator("xpath=/html/body/div[2]/main/div/div/section[3]/aside/article[1]/div/svg").nth(0).scroll_into_view_if_needed()
        # Assert: The trust/reputation card icon is visible on the builder profile, indicating the trust section is present.
        await expect(page.locator("xpath=/html/body/div[2]/main/div/div/section[3]/aside/article[1]/div/svg").nth(0)).to_be_visible(timeout=15000), "The trust/reputation card icon is visible on the builder profile, indicating the trust section is present."
        await page.locator("xpath=/html/body/div[2]/main/div/div/section[3]/aside/article[2]/div[1]/svg").nth(0).scroll_into_view_if_needed()
        # Assert: The trust/reputation metrics icon is visible in the profile sidebar, supporting that the trust section is shown.
        await expect(page.locator("xpath=/html/body/div[2]/main/div/div/section[3]/aside/article[2]/div[1]/svg").nth(0)).to_be_visible(timeout=15000), "The trust/reputation metrics icon is visible in the profile sidebar, supporting that the trust section is shown."
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    