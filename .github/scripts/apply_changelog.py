#!/usr/bin/env python3
"""Replace release-please's commit-parsed changelog with rich rendering.

Run after the Release Please workflow completes. Detects an open release PR
and rewrites both surfaces release-please touches there:

    open release PR  ->  CHANGELOG.md on release branch + PR body

When the release PR is later merged, release-please uses the merged
CHANGELOG.md content for the GitHub Release body, so no post-merge patching
is needed. Naturally forward-only: existing releases are not touched.

Idempotent: re-running compares before writing, no-ops if already current.

Env: GH_REPO, GH_TOKEN required.
"""

from __future__ import annotations

import base64
import datetime as dt
import json
import os
import sys
import urllib.error

# sys.path mutation must precede the sibling import; the noqa keeps linters
# from re-ordering the import above the path insert.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_changelog import (  # noqa: E402
    GH,
    JsonValue,
    _resolve_tag_commit,
    collect_entries,
    collect_pr_numbers_in_range,
    render_section,
)

RELEASE_PR_PREFIX = "chore(main): release"
RELEASE_BRANCH_PREFIX = "release-please--branches--"
PR_BODY_TEMPLATE = (
    ":robot: I have created a release *beep* *boop*\n"
    "---\n"
    "\n"
    "\n"
    "{section}\n"
    "---\n"
    "This PR was generated with "
    "[Release Please](https://github.com/googleapis/release-please). "
    "See [documentation](https://github.com/googleapis/release-please#release-please)."
)


def find_release_pr(gh: GH, repo: str) -> dict[str, JsonValue] | None:
    """Locate release-please's open release PR.

    Three filters, all required, to keep a fork PR with a crafted title from
    hijacking the rewriter (it can match the title and a branch-name prefix,
    but the head repo cannot be spoofed):
      1. title prefix
      2. head.ref prefix (release-please's branch naming)
      3. head.repo.full_name == base repo (rejects fork PRs)
    """
    for pr in gh.get(f"/repos/{repo}/pulls?state=open&per_page=20"):
        title = pr.get("title", "") or ""
        head = pr.get("head") or {}
        head_ref = head.get("ref", "") or ""
        head_repo = (head.get("repo") or {}).get("full_name", "") or ""
        if (
            title.startswith(RELEASE_PR_PREFIX)
            and head_ref.startswith(RELEASE_BRANCH_PREFIX)
            and head_repo == repo
        ):
            return pr
    return None


def read_manifest_version(gh: GH, repo: str, ref: str) -> str:
    file = gh.get(f"/repos/{repo}/contents/.release-please-manifest.json?ref={ref}")
    return json.loads(base64.b64decode(file["content"]).decode())["."]


def fetch_file(gh: GH, repo: str, path: str, ref: str) -> tuple[str, str]:
    file = gh.get(f"/repos/{repo}/contents/{path}?ref={ref}")
    return base64.b64decode(file["content"]).decode(), file["sha"]


def build_new_changelog(main_changelog: str, prev_version: str, new_section: str) -> str:
    marker = f"## [{prev_version}]"
    idx = main_changelog.find(marker)
    if idx == -1:
        raise SystemExit(f"Could not find '{marker}' in main CHANGELOG.md")
    return main_changelog[:idx] + new_section + "\n" + main_changelog[idx:]


def render(gh: GH, repo: str, prev_version: str, new_version: str, head_sha: str) -> str:
    base_sha = _resolve_tag_commit(gh, repo, f"v{prev_version}")
    prs = collect_pr_numbers_in_range(gh, repo, base_sha, head_sha)
    by_section, breaking = collect_entries(gh, repo, prs)
    return render_section(
        repo, prev_version, new_version, dt.date.today().isoformat(), by_section, breaking
    )


def apply_to_release_pr(
    gh: GH, repo: str, pr: dict[str, JsonValue], head_sha: str
) -> None:
    """Rewrite CHANGELOG.md and PR body using `head_sha` as the upper bound.

    `head_sha` should be the commit that triggered the Release Please run we're
    reacting to (workflow_run.head_sha), not the live tip of main. Otherwise a
    second push during our run would silently include PRs Release Please has
    not seen yet.
    """
    pr_num = pr["number"]
    head_ref = pr["head"]["ref"]
    prev_version = read_manifest_version(gh, repo, head_sha)
    new_version = read_manifest_version(gh, repo, head_ref)

    section = render(gh, repo, prev_version, new_version, head_sha)
    main_changelog, _ = fetch_file(gh, repo, "CHANGELOG.md", head_sha)
    new_changelog = build_new_changelog(main_changelog, prev_version, section)

    head_changelog, head_blob_sha = fetch_file(gh, repo, "CHANGELOG.md", head_ref)
    if head_changelog == new_changelog:
        print(f"CHANGELOG.md on {head_ref} already current")
    else:
        gh.put(
            f"/repos/{repo}/contents/CHANGELOG.md",
            {
                "message": "ci(release-please): regenerate CHANGELOG with rich rendering",
                "content": base64.b64encode(new_changelog.encode()).decode(),
                "sha": head_blob_sha,
                "branch": head_ref,
            },
        )
        print(f"Updated CHANGELOG.md on {head_ref}")

    new_body = PR_BODY_TEMPLATE.format(section=section.rstrip())
    if (pr.get("body") or "").strip() == new_body.strip():
        print(f"PR #{pr_num} body already current")
    else:
        gh.patch(f"/repos/{repo}/pulls/{pr_num}", {"body": new_body})
        print(f"Updated PR #{pr_num} body")


def main() -> int:
    repo = os.environ.get("GH_REPO")
    token = os.environ.get("GH_TOKEN")
    head_sha = os.environ.get("GH_HEAD_SHA")
    if not repo or not token or not head_sha:
        print(
            "GH_REPO, GH_TOKEN, and GH_HEAD_SHA env vars are required",
            file=sys.stderr,
        )
        return 2

    gh = GH(token)
    try:
        pr = find_release_pr(gh, repo)
        if pr is None:
            print("No open release PR; nothing to do.")
            return 0
        apply_to_release_pr(gh, repo, pr, head_sha)
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode()[:500]
        except Exception:  # noqa: BLE001 - best-effort body extraction
            pass
        print(f"GitHub API call failed: {e.code} {e.reason} {body}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
