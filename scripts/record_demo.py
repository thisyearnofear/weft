#!/usr/bin/env python3
"""Record a focused demo — just the milestone detail page."""

import asyncio, os, httpx
from browser_use_sdk.v3 import AsyncBrowserUse

API_KEY = os.environ.get("BROWSER_USE_API_KEY", "bu_y3KhuQObfWrBy6zIufCftRRy6RBZXBrfFmYSqDZrwO0")
APP_URL = os.environ.get("WEFT_APP_URL", "https://brochure-roughly-somewhere-lights.trycloudflare.com")
DEMO_HASH = "0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f"

TASK = f"""
Go to {APP_URL}/project/{DEMO_HASH}. This is a milestone detail page on Weft.

1. Wait for the page to load. It may show skeleton/loading indicators first because it reads data from the blockchain.
2. After waiting 5 seconds, scroll down to see if content has appeared.
3. After another 5 seconds, scroll again.
4. Keep waiting and scrolling until you see the page content or until 25 seconds have passed.
5. Take a screenshot of whatever is visible.
6. Describe what you see — especially whether you see the Evidence breakdown, Settlement panel, and Trust profile sections.

If only the header/nav is visible, describe that. If the full content loaded with onchain data, describe that too.
"""


async def main():
    client = AsyncBrowserUse(api_key=API_KEY)
    print(f"Recording project page at {APP_URL}/project/{DEMO_HASH}")
    result = await client.run(TASK, enable_recording=True)
    print(f"Output: {result.output[:500]}")
    print("Waiting for recording...")
    await asyncio.sleep(8)
    try:
        urls = await client.sessions.wait_for_recording(result.id)
        if urls:
            out_path = "weft-demo-project.mp4"
            async with httpx.AsyncClient() as http:
                resp = await http.get(urls[0])
                resp.raise_for_status()
                with open(out_path, "wb") as f:
                    f.write(resp.content)
            print(f"Saved: {out_path} ({len(resp.content)/1024/1024:.1f} MB)")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
