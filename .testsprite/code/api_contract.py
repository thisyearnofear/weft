import asyncio
import json
from playwright import async_api


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

        # -> Load the site root so the run has a base URL.
        # @@ts-step {"i": 1, "field": null, "selector": null, "value": null, "type": "action", "action": "navigate", "desc": "Navigate to VAR_{url}", "input": "VAR_{url}"}
        await page.goto("VAR_{url}")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass

        # -> Open /api/explorer/milestones and read the response body.
        # @@ts-step {"i": 2, "field": null, "selector": null, "value": null, "type": "action", "action": "navigate", "desc": "Navigate to VAR_{url}/api/explorer/milestones", "input": "VAR_{url}/api/explorer/milestones"}
        await page.goto("VAR_{url}" + "/api/explorer/milestones")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        body_text = await page.inner_text("body")

        # Assert: /api/explorer/milestones returns a body that parses as JSON.
        # @@ts-step {"i": 3, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json", "desc": "Verify /api/explorer/milestones returns a JSON body"}
        try:
            payload = json.loads(body_text)
        except Exception as exc:
            raise AssertionError(
                'Expected /api/explorer/milestones to return a JSON body, got %r: %s'
                % (body_text[:200], exc)
            )

        # Assert: /api/explorer/milestones exposes the schema keys ok, milestones.
        # @@ts-step {"i": 4, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json-keys", "desc": "Verify /api/explorer/milestones contains ok, milestones"}
        required_keys = ['ok', 'milestones']
        missing = [key for key in required_keys if key not in payload]
        assert not missing, (
            'Expected /api/explorer/milestones JSON to contain ok, milestones, missing %s'
            % (missing,)
        )

        # Assert: /api/explorer/milestones reports ok=true.
        # @@ts-step {"i": 5, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json-ok", "desc": "Verify /api/explorer/milestones reports ok is true"}
        assert payload.get("ok") is True, (
            'Expected /api/explorer/milestones to report ok=true, got %r'
            % (payload.get('ok'),)
        )

        # -> Open /api/operations and read the response body.
        # @@ts-step {"i": 6, "field": null, "selector": null, "value": null, "type": "action", "action": "navigate", "desc": "Navigate to VAR_{url}/api/operations", "input": "VAR_{url}/api/operations"}
        await page.goto("VAR_{url}" + "/api/operations")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        body_text = await page.inner_text("body")

        # Assert: /api/operations returns a body that parses as JSON.
        # @@ts-step {"i": 7, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json", "desc": "Verify /api/operations returns a JSON body"}
        try:
            payload = json.loads(body_text)
        except Exception as exc:
            raise AssertionError(
                'Expected /api/operations to return a JSON body, got %r: %s'
                % (body_text[:200], exc)
            )

        # Assert: /api/operations exposes the schema keys ok, treasury.
        # @@ts-step {"i": 8, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json-keys", "desc": "Verify /api/operations contains ok, treasury"}
        required_keys = ['ok', 'treasury']
        missing = [key for key in required_keys if key not in payload]
        assert not missing, (
            'Expected /api/operations JSON to contain ok, treasury, missing %s'
            % (missing,)
        )

        # Assert: /api/operations reports ok=true.
        # @@ts-step {"i": 9, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json-ok", "desc": "Verify /api/operations reports ok is true"}
        assert payload.get("ok") is True, (
            'Expected /api/operations to report ok=true, got %r'
            % (payload.get('ok'),)
        )

        # -> Open /api/sponsor and read the response body.
        # @@ts-step {"i": 10, "field": null, "selector": null, "value": null, "type": "action", "action": "navigate", "desc": "Navigate to VAR_{url}/api/sponsor", "input": "VAR_{url}/api/sponsor"}
        await page.goto("VAR_{url}" + "/api/sponsor")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        body_text = await page.inner_text("body")

        # Assert: /api/sponsor returns a body that parses as JSON.
        # @@ts-step {"i": 11, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json", "desc": "Verify /api/sponsor returns a JSON body"}
        try:
            payload = json.loads(body_text)
        except Exception as exc:
            raise AssertionError(
                'Expected /api/sponsor to return a JSON body, got %r: %s'
                % (body_text[:200], exc)
            )

        # Assert: /api/sponsor exposes the schema keys ok, milestones, summary.
        # @@ts-step {"i": 12, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json-keys", "desc": "Verify /api/sponsor contains ok, milestones, summary"}
        required_keys = ['ok', 'milestones', 'summary']
        missing = [key for key in required_keys if key not in payload]
        assert not missing, (
            'Expected /api/sponsor JSON to contain ok, milestones, summary, missing %s'
            % (missing,)
        )

        # Assert: /api/sponsor reports ok=true.
        # @@ts-step {"i": 13, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json-ok", "desc": "Verify /api/sponsor reports ok is true"}
        assert payload.get("ok") is True, (
            'Expected /api/sponsor to report ok=true, got %r'
            % (payload.get('ok'),)
        )

        # -> Open /api/activity and read the response body.
        # @@ts-step {"i": 14, "field": null, "selector": null, "value": null, "type": "action", "action": "navigate", "desc": "Navigate to VAR_{url}/api/activity", "input": "VAR_{url}/api/activity"}
        await page.goto("VAR_{url}" + "/api/activity")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        body_text = await page.inner_text("body")

        # Assert: /api/activity returns a body that parses as JSON.
        # @@ts-step {"i": 15, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json", "desc": "Verify /api/activity returns a JSON body"}
        try:
            payload = json.loads(body_text)
        except Exception as exc:
            raise AssertionError(
                'Expected /api/activity to return a JSON body, got %r: %s'
                % (body_text[:200], exc)
            )

        # Assert: /api/activity exposes the schema keys ok, events.
        # @@ts-step {"i": 16, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json-keys", "desc": "Verify /api/activity contains ok, events"}
        required_keys = ['ok', 'events']
        missing = [key for key in required_keys if key not in payload]
        assert not missing, (
            'Expected /api/activity JSON to contain ok, events, missing %s'
            % (missing,)
        )

        # Assert: /api/activity reports ok=true.
        # @@ts-step {"i": 17, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json-ok", "desc": "Verify /api/activity reports ok is true"}
        assert payload.get("ok") is True, (
            'Expected /api/activity to report ok=true, got %r'
            % (payload.get('ok'),)
        )

        # -> Open /api/verifiers and read the response body.
        # @@ts-step {"i": 18, "field": null, "selector": null, "value": null, "type": "action", "action": "navigate", "desc": "Navigate to VAR_{url}/api/verifiers", "input": "VAR_{url}/api/verifiers"}
        await page.goto("VAR_{url}" + "/api/verifiers")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        body_text = await page.inner_text("body")

        # Assert: /api/verifiers returns a body that parses as JSON.
        # @@ts-step {"i": 19, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json", "desc": "Verify /api/verifiers returns a JSON body"}
        try:
            payload = json.loads(body_text)
        except Exception as exc:
            raise AssertionError(
                'Expected /api/verifiers to return a JSON body, got %r: %s'
                % (body_text[:200], exc)
            )

        # Assert: /api/verifiers exposes the schema keys ok, verifiers, consensus.
        # @@ts-step {"i": 20, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json-keys", "desc": "Verify /api/verifiers contains ok, verifiers, consensus"}
        required_keys = ['ok', 'verifiers', 'consensus']
        missing = [key for key in required_keys if key not in payload]
        assert not missing, (
            'Expected /api/verifiers JSON to contain ok, verifiers, consensus, missing %s'
            % (missing,)
        )

        # Assert: /api/verifiers reports ok=true.
        # @@ts-step {"i": 21, "field": null, "selector": "body", "value": null, "type": "assertion", "action": "json-ok", "desc": "Verify /api/verifiers reports ok is true"}
        assert payload.get("ok") is True, (
            'Expected /api/verifiers to report ok=true, got %r'
            % (payload.get('ok'),)
        )

        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
