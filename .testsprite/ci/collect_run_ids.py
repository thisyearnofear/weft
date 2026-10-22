#!/usr/bin/env python3
"""Collect TestSprite run ids from batch-run JSON output.

TestSprite artifacts (the §7 failure-context bundle: video, per-step HTML
snapshots, per-step JSON) are addressed by **run id**, not by test id. The
batch-run command prints the run id for every dispatched test, so this script
is the bridge between "the run finished" and "we can download its evidence".

Usage:
    python3 .testsprite/ci/collect_run_ids.py frontend-run.json backend-run.json

Output is TSV: run_id \t test_id \t status \t source_file
"""
import json
import sys

# Statuses that mean "this run has a failure bundle worth downloading".
FAILING_STATUSES = {"failed", "blocked", "cancelled", "timeout"}


def load_json_objects(path):
    """Load every JSON object in a CLI output file.

    `testsprite test run --all --output json` does NOT emit a single clean
    JSON document. It writes a human-readable preamble first
    ("idempotency-key: ...", "Dispatched N tests.", "Batch run complete: ...")
    and then appends a *second* JSON object carrying the CLI error envelope
    when the batch had failures. So we cannot just json.load() the file.

    Returns a list of decoded objects; unparseable files yield an empty list.
    """
    try:
        with open(path, "r", encoding="utf-8") as handle:
            raw = handle.read()
    except OSError:
        return []

    decoder = json.JSONDecoder()
    objects = []
    index = raw.find("{")
    while index != -1 and index < len(raw):
        try:
            obj, end = decoder.raw_decode(raw, index)
        except ValueError:
            index = raw.find("{", index + 1)
            continue
        objects.append(obj)
        nxt = raw.find("{", end)
        if nxt == -1:
            break
        index = nxt
    return objects


def _iter_runs(payload):
    """Yield run records from a batch-run payload.

    The CLI has used two shapes across versions: ``accepted`` (list of run
    records) and a bare list of run records. Support both.
    """
    if isinstance(payload, list):
        candidates = payload
    elif isinstance(payload, dict):
        candidates = (
            payload.get("accepted")
            or payload.get("runs")
            or payload.get("items")
            or []
        )
    else:
        candidates = []
    for entry in candidates:
        if isinstance(entry, dict) and entry.get("runId"):
            yield entry


def collect(paths):
    rows = []
    for path in paths:
        for payload in load_json_objects(path):
            for run in _iter_runs(payload):
                run_id = run.get("runId", "")
                test_id = run.get("testId", "")
                status = (run.get("status") or "").lower()
                rows.append((run_id, test_id, status, path))
    return rows


def main(argv):
    if len(argv) < 2:
        print(__doc__, file=sys.stderr)
        return 2

    rows = collect(argv[1:])
    for run_id, test_id, status, source in rows:
        print(f"{run_id}\t{test_id}\t{status}\t{source}")

    failing = [r for r in rows if r[2] in FAILING_STATUSES]
    print(
        f"# collected {len(rows)} run(s); {len(failing)} failing",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
