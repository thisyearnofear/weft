#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
GitHub evidence collector for Weft milestone verification.
Looks up commits and merged PRs in a milestone time window.
"""

from __future__ import annotations

import os
import subprocess
import urllib.request
import urllib.parse
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class Commit:
    sha: str
    message: str
    author: str
    date: str


@dataclass(frozen=True)
class MergedPR:
    number: int
    title: str
    merged_at: str


@dataclass(frozen=True)
class GithubEvidence:
    repo: str
    window_since: str
    window_until: str
    commit_count: int
    merged_pr_count: int
    commits: List[Commit]
    prs: List[MergedPR]
    passed: bool


def _gh_cli_available() -> bool:
    """Check if gh CLI is available (preferred over raw requests)."""
    try:
        subprocess.run(["gh", "version"], capture_output=True, check=True)
        return True
    except Exception:
        return False


def _github_api(
    path: str,
    params: Optional[Dict[str, str]] = None,
    token: Optional[str] = None,
) -> Any:
    """Make an authenticated GitHub API request."""
    url = f"https://api.github.com{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)

    headers: Dict[str, str] = {
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        url,
        headers=headers,
        method="GET",
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _commits_via_gh_cli(
    owner: str,
    repo: str,
    since: str,
    until: str,
) -> List[Dict[str, Any]]:
    """Use gh CLI to fetch commits (handles auth automatically)."""
    result = subprocess.run(
        [
            "gh", "api",
            f"repos/{owner}/{repo}/commits",
            "--jq", ".[] | {sha: .sha, message: .commit.message, author: .commit.author.name, date: .commit.author.date}",
            "--paginate",
            "-F", f"since={since}",
            "-F", f"until={until}",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return []
    try:
        return json.loads(result.stdout)
    except Exception:
        return []


def collect_github_evidence(
    repo_url: str,
    since: str,
    until: str,
    gh_token: Optional[str] = None,
) -> GithubEvidence:
    """
    Collect GitHub evidence for a milestone window.

    Args:
        repo_url: e.g. https://github.com/owner/repo
        since:    ISO 8601 timestamp (milestone start)
        until:   ISO 8601 timestamp (deadline)
        gh_token: GitHub token (or set GITHUB_TOKEN env var)

    Returns a GithubEvidence dataclass.
    """
    token = gh_token or os.environ.get("GITHUB_TOKEN") or ""

    parts = repo_url.rstrip("/").replace("https://github.com/", "").split("/")
    owner, repo = parts[-2], parts[-1]

    commits_raw: List[Dict[str, Any]] = []
    prs_raw: List[Dict[str, Any]] = []

    if _gh_cli_available():
        commits_raw = _commits_via_gh_cli(owner, repo, since, until)
        if token:
            pr_result = subprocess.run(
                ["gh", "api",
                 f"repos/{owner}/{repo}/pulls",
                 "--jq", ".[] | select(.merged_at != null and .merged_at >= \"{since}\" and .merged_at <= \"{until}\")",
                 "--paginate"],
                capture_output=True, text=True,
                env={**os.environ, "GH_TOKEN": token},
            )
            if pr_result.returncode == 0:
                try:
                    prs_raw = json.loads(pr_result.stdout)
                except Exception:
                    prs_raw = []
    else:
        try:
            commits_raw = _github_api(
                f"/repos/{owner}/{repo}/commits",
                {"since": since, "until": until, "per_page": "100"},
                token=token,
            )
        except Exception:
            commits_raw = []

        try:
            all_prs = _github_api(
                f"/repos/{owner}/{repo}/pulls",
                {"state": "closed", "sort": "updated", "direction": "desc", "per_page": "50"},
                token=token,
            )
            prs_raw = [
                p for p in all_prs
                if p.get("merged_at") and since <= p["merged_at"] <= until
            ]
        except Exception:
            prs_raw = []

    commits = [
        Commit(
            sha=c["sha"][:8],
            message=(c.get("message") or "")[:120],
            author=c.get("author") or c.get("commit", {}).get("author", {}).get("name", ""),
            date=c.get("date") or c.get("commit", {}).get("author", {}).get("date", ""),
        )
        for c in commits_raw[:30]
    ]
    prs = [
        MergedPR(
            number=p["number"],
            title=p.get("title", ""),
            merged_at=p["merged_at"],
        )
        for p in prs_raw[:20]
    ]

    return GithubEvidence(
        repo=f"{owner}/{repo}",
        window_since=since,
        window_until=until,
        commit_count=len(commits_raw),
        merged_pr_count=len(prs_raw),
        commits=commits,
        prs=prs,
        passed=len(prs_raw) >= 1 or len(commits_raw) >= 5,
    )


def evidence_to_dict(ev: GithubEvidence) -> Dict[str, Any]:
    """Serialize GithubEvidence to dict matching mvp.md schema."""
    return {
        "source": "github",
        "repo": ev.repo,
        "window": {"since": ev.window_since, "until": ev.window_until},
        "commitCount": ev.commit_count,
        "mergedPrCount": ev.merged_pr_count,
        "commits": [
            {"sha": c.sha, "message": c.message, "author": c.author, "date": c.date}
            for c in ev.commits
        ],
        "prs": [
            {"number": p.number, "title": p.title, "mergedAt": p.merged_at}
            for p in ev.prs
        ],
        "passed": ev.passed,
    }