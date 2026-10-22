#!/usr/bin/env python3
"""Fail CI when a *passed* frontend TestSprite run executed no assertions.

A frontend test can "pass" while asserting nothing: the plan compiler folds
assertion steps into action comments, so the run reports `passed` with a
handful of `navigate`/`click` steps and zero checks. Such a run is a silent
pass — it would let a broken page go green.

This guard reads the per-test step list of every *passed* frontend run and
requires at least one assertion step (a `visible` / `expect` / `assert`-style
step). Action-only steps (`navigate`, `click`, `scroll`, `fill`, ...) do not
count. Runs that already ended `failed`/`blocked`/etc. are skipped — they are
check_summary.py's problem, not a silent pass.

Usage:
    python3 .testsprite/ci/check_assertions.py frontend-run.json

Exits 0 when every passed frontend run executed at least one assertion, 1
otherwise (including when the run report cannot be parsed or a passed run's
steps cannot be fetched).
"""
import json
import subprocess
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from collect_run_ids import collect  # noqa: E402

# Step actions that only move the browser around and verify nothing.
NON_ASSERTION_ACTIONS = {
    "navigate",
    "click",
    "scroll",
    "fill",
    "type",
    "hover",
    "select",
    "press",
    "wait",
    "wait_for",
    "screenshot",
    "sleep",
}


def _frontend_rows(paths):
    """Return (run_id, test_id, title) for every run in the given reports."""
    rows = []
    for run_id, test_id, status, _source in collect(paths):
        rows.append((run_id, test_id, status))
    return rows


def _fetch_steps(test_id, run_id):
    """Return the step list for a run, or None when it cannot be fetched."""
    cmd = ["testsprite", "test", "steps", test_id, "--run-id", run_id,
           "--output", "json"]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    except (OSError, subprocess.SubprocessError):
        return None
    try:
        payload = json.loads(proc.stdout)
    except ValueError:
        return None
    items = payload.get("items")
    if not isinstance(items, list):
        return None
    return items


def _assertion_count(items):
    """Count steps that actually assert something."""
    count = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        action = (item.get("action") or "").strip().lower()
        if action and action not in NON_ASSERTION_ACTIONS:
            count += 1
    return count


def _code_assertion_count(test_id):
    """Count assertion statements in the test's stored code.

    Verbatim replay runs (`--no-auto-heal`) don't leave a per-step trail —
    `test steps` returns an empty list — so a passed replay run is vouched
    for by the stored code itself: expect()/assert statements that executed
    top-to-bottom.
    """
    cmd = ["testsprite", "test", "code", "get", test_id, "--output", "json"]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        payload = json.loads(proc.stdout)
    except (OSError, subprocess.SubprocessError, ValueError):
        return None
    code = payload.get("code") or ""
    import re
    return len(re.findall(r"await expect\(|^\s*assert |raise AssertionError",
                          code, re.M))


def main(argv):
    if len(argv) < 2:
        print(__doc__, file=sys.stderr)
        return 2

    rows = _frontend_rows(argv[1:])
    if not rows:
        print("::error::No frontend runs found to check for assertions.")
        return 1

    problems = []
    checked = 0
    skipped = 0

    for run_id, test_id, status in rows:
        # Only a `passed` verdict can be a silent pass. A run that already
        # failed/blocked is surfaced by check_summary.py; flagging it here
        # would double-count and misdescribe the failure.
        if status != "passed":
            skipped += 1
            print("skip: test %s run %s ended %s" % (test_id, run_id, status))
            continue
        items = _fetch_steps(test_id, run_id)
        if items is None:
            problems.append(
                "could not fetch steps for passed test %s (run %s) — "
                "cannot prove it asserted anything" % (test_id, run_id)
            )
            continue
        checked += 1
        count = _assertion_count(items)
        if count == 0 and not items:
            # Verbatim replay runs leave no step trail; check stored code.
            code_count = _code_assertion_count(test_id)
            if code_count is None:
                problems.append(
                    "passed run %s (test %s) has no step trail and its "
                    "stored code could not be inspected" % (run_id, test_id)
                )
                continue
            if code_count > 0:
                print("ok: test %s replayed stored code with %d assertion(s)"
                      % (test_id, code_count))
                continue
        if count == 0:
            problems.append(
                "test %s (run %s) executed 0 assertions — "
                "it passed without verifying anything" % (test_id, run_id)
            )
        else:
            print("ok: test %s executed %d assertion(s)" % (test_id, count))

    if problems:
        for problem in problems:
            print("::error::%s" % problem)
        return 1

    print("Checked %d passed run(s) (%d skipped, non-passed); "
          "all executed at least one assertion." % (checked, skipped))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
