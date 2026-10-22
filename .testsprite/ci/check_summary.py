#!/usr/bin/env python3
"""Fail CI when any TestSprite test failed or timed out.

Reads the batch-run JSON reports produced by `testsprite test run --all ...`
and exits non-zero if the combined failure count is above zero.

A missing or unparseable report is a CI failure in its own right: a silently
absent report would let the pipeline go green without ever having run the
suite. The report files are uploaded as artifacts either way, so the failure
message stays actionable.
"""
import json
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from collect_run_ids import load_json_objects  # noqa: E402


def _summary(path):
    """Return the batch-run summary from a CLI output file.

    The CLI output is not a single JSON document — see
    ``collect_run_ids.load_json_objects`` for why — so scan every object in
    the file and take the first one that carries a summary block.
    """
    for payload in load_json_objects(path):
        if not isinstance(payload, dict):
            continue
        summary = payload.get("summary")
        if isinstance(summary, dict) and summary:
            return summary
    return {}


def main(argv):
    if len(argv) < 2:
        print(__doc__, file=sys.stderr)
        return 2

    failed = 0
    timed_out = 0
    total = 0
    problems = []

    for path in argv[1:]:
        summary = _summary(path)
        if not summary:
            problems.append(f"no summary found in {path}")
            print(f"::error::no TestSprite summary found in {path}")
            continue
        failed += int(summary.get("failed", 0) or 0)
        timed_out += int(summary.get("timedOut", 0) or 0)
        total += int(summary.get("total", 0) or 0)
        print(f"{path}: {summary}")

    print(f"Total tests: {total}, failed: {failed}, timed out: {timed_out}")

    if problems:
        print(
            "::error::TestSprite run report(s) missing or unparseable: "
            + "; ".join(problems)
        )
        return 1
    if failed or timed_out:
        print(
            f"::error::{failed + timed_out} TestSprite test(s) failed or timed out."
        )
        return 1
    if total == 0:
        print("::error::TestSprite reported 0 tests — the suite did not run.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
