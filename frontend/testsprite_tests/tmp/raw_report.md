
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** weft-frontend
- **Date:** 2026-07-01
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Landing page loads with hero title
- **Test Code:** [TC001_Landing_page_loads_with_hero_title.py](./TC001_Landing_page_loads_with_hero_title.py)
- **Test Error:** TEST FAILURE

A text input with the placeholder containing 'milestone hash' was not found on the landing page.

Observations:
- The landing page loaded and an h1 heading 'Escrow that' is visible.
- A search for the phrase 'milestone hash' returned 0 matches on the page.
- Attempts to read input placeholder text were attempted but could not locate an input with that placeholder (placeholder reads unavailable after repeated attempts).
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/43bfaf67-931e-4d7f-b5c0-0063a9ade62f/46b9f95e-a5c9-4d2c-8856-5e42d8f64f3b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Navigation links are visible and functional
- **Test Code:** [TC002_Navigation_links_are_visible_and_functional.py](./TC002_Navigation_links_are_visible_and_functional.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/43bfaf67-931e-4d7f-b5c0-0063a9ade62f/446a8c31-85af-44c9-84cf-187ee87466ca
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Explorer page loads with milestone table
- **Test Code:** [TC003_Explorer_page_loads_with_milestone_table.py](./TC003_Explorer_page_loads_with_milestone_table.py)
- **Test Error:** TEST BLOCKED

The Explorer page could not load milestone data due to a server error, preventing verification of the milestone list.

Observations:
- The page heading 'Every milestone. Publicly auditable.' and header navigation are visible.
- The UI shows an explicit error: 'Failed to load milestones: Explorer fetch failed: 500'.
- No milestone rows, cards, or table entries are displayed (milestone list absent).
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/43bfaf67-931e-4d7f-b5c0-0063a9ade62f/709a0e4e-febd-4ede-8bb1-98428ad99520
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Explorer filter buttons work
- **Test Code:** [TC004_Explorer_filter_buttons_work.py](./TC004_Explorer_filter_buttons_work.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/43bfaf67-931e-4d7f-b5c0-0063a9ade62f/b5b87134-773a-42f3-a6da-6d842d7ccf7c
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Operations dashboard loads with KPIs
- **Test Code:** [TC005_Operations_dashboard_loads_with_KPIs.py](./TC005_Operations_dashboard_loads_with_KPIs.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/43bfaf67-931e-4d7f-b5c0-0063a9ade62f/cbc93819-80ee-4f9b-981f-c1da5d41623c
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Sponsor dashboard loads with capital flow
- **Test Code:** [TC006_Sponsor_dashboard_loads_with_capital_flow.py](./TC006_Sponsor_dashboard_loads_with_capital_flow.py)
- **Test Error:** TEST FAILURE

The Sponsor page is reachable but the sponsor data failed to load and KPI cards are not displayed.

Observations:
- The page heading shows "Your capital, verified." (page title contains 'capital').
- A 'Refresh' button is visible on the page.
- The page displays an error: "Failed to load: Sponsor fetch failed: 500", and no KPI cards or metrics are shown.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/43bfaf67-931e-4d7f-b5c0-0063a9ade62f/bcbb1d65-ee62-4f85-ad3a-6d3ce015826c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Activity feed loads with timeline
- **Test Code:** [TC007_Activity_feed_loads_with_timeline.py](./TC007_Activity_feed_loads_with_timeline.py)
- **Test Error:** TEST FAILURE

The Activity page loaded, but the timeline of events is not present as required.

Observations:
- The page heading displays "Every action, timestamped." (title/heading requirement satisfied).
- The feed area shows the text "No activity recorded yet.", so no timeline events are visible (timeline events requirement not satisfied).
- A 'Refresh' button is visible on the page (Refresh button requirement satisfied).
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/43bfaf67-931e-4d7f-b5c0-0063a9ade62f/933cd82d-bd65-4cf2-a29e-dfe218cb831a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Verifier network page loads
- **Test Code:** [TC008_Verifier_network_page_loads.py](./TC008_Verifier_network_page_loads.py)
- **Test Error:** TEST FAILURE

Verifier network data failed to load — the page shows a server error and the KPI cards are not displayed.

Observations:
- The page displays the heading 'The swarm that signs your capital.' and the 'Refresh' button is visible.
- A red error message is visible: 'Failed to load: Verifiers fetch failed: 500'.
- The verifier KPI/network cards and data are missing from the page.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/43bfaf67-931e-4d7f-b5c0-0063a9ade62f/1724ef15-2261-4cbe-8c67-8c96fc7c73d1
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 API docs page loads
- **Test Code:** [TC009_API_docs_page_loads.py](./TC009_API_docs_page_loads.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/43bfaf67-931e-4d7f-b5c0-0063a9ade62f/05a2af0d-d9ad-4b4e-bb78-cd9fc137a24e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Recovery page loads with timeline
- **Test Code:** [TC010_Recovery_page_loads_with_timeline.py](./TC010_Recovery_page_loads_with_timeline.py)
- **Test Error:** TEST BLOCKED

The Recovery page is reachable and its UI is present, but the demo backend is unavailable, preventing the live demo from running.

Observations:
- The page displays a red banner: "Recovery API returned 502".
- Recovery UI elements are visible: heading "Break everything. Watch it recover.", a "Run The Demo" button, and supporting recovery content are present.

Conclusion: The Recovery page loaded and recovery-related content is visible, but the backend API error (502) blocks exercising the demo. The test is BLOCKED because the demo cannot be run due to the server error.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/43bfaf67-931e-4d7f-b5c0-0063a9ade62f/970306e4-93c2-4b31-b085-fea1fca9ff86
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Builder lookup page loads
- **Test Code:** [TC011_Builder_lookup_page_loads.py](./TC011_Builder_lookup_page_loads.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/43bfaf67-931e-4d7f-b5c0-0063a9ade62f/ef2b34cd-b8db-4671-9e64-978e1138f229
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 All pages return HTTP 200
- **Test Code:** [TC012_All_pages_return_HTTP_200.py](./TC012_All_pages_return_HTTP_200.py)
- **Test Error:** Result summary for verification of main pages (based only on UI content observed in this session):

- Landing (/): PASS — page rendered with no obvious error message.
- Explorer (/explorer): FAIL — page rendered but shows in-page error 'Explorer fetch failed: 500'.
- Operations (/operations): PASS — page rendered with visible content and no in-page fetch error.
- Sponsor (/sponsor): FAIL — page rendered but shows in-page error 'Sponsor fetch failed: 500'.
- Activity (/activity): PASS — page rendered and a search for 'fetch failed' returned no matches.
- Verifiers (/verifiers): FAIL — page rendered but shows in-page error 'Verifiers fetch failed: 500'.
- API docs (/api): PASS — API Reference content visible; no 'fetch failed' message observed.
- Resilience/Recovery (/recovery): FAIL — page opened and the UI shows 'Recovery API returned 502' (visible red banner in the screenshot).

Conclusion: Not all main pages meet the user's "no error page" assertion. Several routes display backend 5xx error banners (Explorer, Sponsor, Verifiers show 500; Recovery shows 502). Per the task instructions, the run stops here.

TEST OUTCOME: success=false (the requirement that all main pages load successfully without error messages was not met).
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/43bfaf67-931e-4d7f-b5c0-0063a9ade62f/fe5a4012-ad3f-4065-a161-fe7c3479414e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **41.67** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---