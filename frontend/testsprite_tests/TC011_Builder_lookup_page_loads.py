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
        await page.goto("http://localhost:3001/")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Open the 'Builder' page by navigating to http://localhost:3001/builder and check that the page loads and a search input or lookup form is visible.
        await page.goto("http://localhost:3001/builder")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the 'Look up an existing builder profile' button to reveal the lookup/search input or form.
        # Look up an existing builder profile button
        elem = page.get_by_role('button', name='Look up an existing builder profile', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the page loads without error
        await page.locator("xpath=/html/body/div[2]/main/div/div/section[2]/div/form").nth(0).scroll_into_view_if_needed()
        # Assert: The builder lookup form is visible on the page.
        await expect(page.locator("xpath=/html/body/div[2]/main/div/div/section[2]/div/form").nth(0)).to_be_visible(timeout=15000), "The builder lookup form is visible on the page."
        await page.locator("xpath=/html/body/div[2]/main/div/div/section[2]/div/form/div/input").nth(0).scroll_into_view_if_needed()
        # Assert: The search input for ENS or 0x address is visible on the page.
        await expect(page.locator("xpath=/html/body/div[2]/main/div/div/section[2]/div/form/div/input").nth(0)).to_be_visible(timeout=15000), "The search input for ENS or 0x address is visible on the page."
        
        # --> Verify a search input or lookup form is visible
        await page.locator("xpath=/html/body/div[2]/main/div/div/section[2]/div/form").nth(0).scroll_into_view_if_needed()
        # Assert: Lookup form is visible on the Builder page.
        await expect(page.locator("xpath=/html/body/div[2]/main/div/div/section[2]/div/form").nth(0)).to_be_visible(timeout=15000), "Lookup form is visible on the Builder page."
        await page.locator("xpath=/html/body/div[2]/main/div/div/section[2]/div/form/div/input").nth(0).scroll_into_view_if_needed()
        # Assert: Search input with placeholder 'weft.thisyearnofear.eth or 0x1234...' is visible.
        await expect(page.locator("xpath=/html/body/div[2]/main/div/div/section[2]/div/form/div/input").nth(0)).to_be_visible(timeout=15000), "Search input with placeholder 'weft.thisyearnofear.eth or 0x1234...' is visible."
        await page.locator("xpath=/html/body/div[2]/main/div/div/section[2]/div/form/button").nth(0).scroll_into_view_if_needed()
        # Assert: The 'View profile' submit button is visible.
        await expect(page.locator("xpath=/html/body/div[2]/main/div/div/section[2]/div/form/button").nth(0)).to_be_visible(timeout=15000), "The 'View profile' submit button is visible."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    