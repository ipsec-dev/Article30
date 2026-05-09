#!/usr/bin/env python3
"""Render a release-please-style changelog section from PRs merged in a range.

Walks each PR's inner commits (via the GitHub API, not the squash body) so
multi-commit squash-merged PRs render every conventional entry. Output matches
release-please's CHANGELOG.md format exactly so this is a drop-in replacement
for the rendered section.

Pure: takes args, prints Markdown, no side effects.

Usage:
    render_changelog.py \\
        --repo OWNER/REPO \\
        --prev-version 2.0.0 \\
        --new-version 2.0.1 \\
        --head-sha c75ad68... \\
        [--date 2026-05-08]

Env: GH_TOKEN must be set (for GitHub API calls).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import urllib.error
import urllib.request
from collections import defaultdict

CHANGELOG_SECTIONS: list[tuple[str, str, bool]] = [
    ("feat", "Features", False),
    ("fix", "Bug Fixes", False),
    ("perf", "Performance Improvements", False),
    ("revert", "Reverts", False),
    ("chore", "Maintenance & Dependencies", False),
    ("build", "Build System", False),
    ("docs", "Documentation", True),
    ("style", "Styles", True),
    ("refactor", "Code Refactoring", True),
    ("test", "Tests", True),
    ("ci", "Continuous Integration", True),
]

SECTION_BY_TYPE: dict[str, tuple[str, bool]] = {
    t: (name, hidden) for t, name, hidden in CHANGELOG_SECTIONS
}

CONVENTIONAL_RE = re.compile(
    r"^(?P<type>[a-z]+)"
    r"(?:\((?P<scope>[^)]+)\))?"
    r"(?P<bang>!)?"
    r": (?P<subject>.+)$"
)
PR_REF_RE = re.compile(r"\s*\(#(\d+)\)\s*$")
BREAKING_FOOTER_RE = re.compile(
    r"^BREAKING[ -]CHANGE:\s*(?P<text>.+?)\s*$",
    re.MULTILINE,
)

JsonValue = (
    dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None
)
Entry = dict[str, str | int | bool | None]


class GH(object):
    def __init__(self, token: str) -> None:
        self._token = token

    def _open(
        self, method: str, path: str, body: dict[str, JsonValue] | None = None
    ) -> tuple[bytes, dict[str, str]]:
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            f"https://api.github.com{path}" if path.startswith("/") else path,
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {self._token}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        with urllib.request.urlopen(req) as resp:
            return resp.read(), dict(resp.headers)

    def request(
        self, method: str, path: str, body: dict[str, JsonValue] | None = None
    ) -> JsonValue:
        raw, _ = self._open(method, path, body)
        return json.loads(raw) if raw else None

    def get(self, path: str) -> JsonValue:
        return self.request("GET", path)

    def get_paginated(self, path: str, per_page: int = 100) -> list:
        """Walk Link: rel=\"next\" headers until exhausted; returns concatenated list.

        For endpoints that return a top-level JSON array (PRs, commits, etc.).
        """
        sep = "&" if "?" in path else "?"
        url = f"https://api.github.com{path}{sep}per_page={per_page}"
        out: list = []
        while url:
            raw, headers = self._open("GET", url)
            page = json.loads(raw) if raw else []
            if not isinstance(page, list):
                raise RuntimeError(f"Expected list from {url}, got {type(page).__name__}")
            out.extend(page)
            url = _next_link(headers.get("Link") or headers.get("link") or "")
        return out

    def get_compare_commits(self, repo: str, base: str, head: str) -> list:
        """Walk paginated compare results, returning the concatenated commits list."""
        url = f"https://api.github.com/repos/{repo}/compare/{base}...{head}?per_page=100"
        out: list = []
        while url:
            raw, headers = self._open("GET", url)
            data = json.loads(raw)
            out.extend(data.get("commits", []))
            url = _next_link(headers.get("Link") or headers.get("link") or "")
        return out

    def patch(self, path: str, body: dict[str, JsonValue]) -> JsonValue:
        return self.request("PATCH", path, body)

    def put(self, path: str, body: dict[str, JsonValue]) -> JsonValue:
        return self.request("PUT", path, body)


def _next_link(link_header: str) -> str | None:
    for part in link_header.split(","):
        seg = part.strip()
        if not seg:
            continue
        url_part, _, rest = seg.partition(";")
        if 'rel="next"' in rest.replace(" ", ""):
            url_part = url_part.strip()
            if url_part.startswith("<") and url_part.endswith(">"):
                return url_part[1:-1]
    return None


def parse_conventional(subject: str) -> dict[str, str | bool | None] | None:
    cleaned = PR_REF_RE.sub("", subject).strip()
    m = CONVENTIONAL_RE.match(cleaned)
    if not m:
        return None
    return {
        "type": m.group("type"),
        "scope": m.group("scope"),
        "subject": m.group("subject"),
        "bang": bool(m.group("bang")),
    }


def extract_breaking_text(message: str) -> str | None:
    m = BREAKING_FOOTER_RE.search(message)
    return m.group("text") if m else None


def collect_pr_numbers_in_range(
    gh: GH, repo: str, base_sha: str, head_sha: str
) -> list[tuple[int, str]]:
    """Return [(pr_number, squash_sha), ...] for commits in (base_sha, head_sha]."""
    out: list[tuple[int, str]] = []
    for commit in gh.get_compare_commits(repo, base_sha, head_sha):
        first_line = commit["commit"]["message"].split("\n", 1)[0]
        m = PR_REF_RE.search(first_line)
        if m:
            out.append((int(m.group(1)), commit["sha"]))
    return out


def _collect_pr_entries(
    gh: GH, repo: str, pr_num: int, squash_sha: str
) -> tuple[list[tuple[str, Entry]], list[Entry]]:
    """Returns (visible_entries, breaking_entries) for one PR."""
    pr = gh.get(f"/repos/{repo}/pulls/{pr_num}")
    if pr.get("title", "").startswith("chore(main): release"):
        return [], []

    visible: list[tuple[str, Entry]] = []
    breaking: list[Entry] = []
    for ic in gh.get_paginated(f"/repos/{repo}/pulls/{pr_num}/commits"):
        full_msg = ic["commit"]["message"]
        parsed = parse_conventional(full_msg.split("\n", 1)[0])
        if not parsed:
            continue

        section_info = SECTION_BY_TYPE.get(parsed["type"])
        if section_info is None:
            continue
        section_name, hidden = section_info

        entry: Entry = {
            "scope": parsed["scope"],
            "subject": parsed["subject"],
            "pr": pr_num,
            "sha": squash_sha,
            "bang": parsed["bang"],
        }

        breaking_text = extract_breaking_text(full_msg)
        if parsed["bang"] or breaking_text:
            breaking.append({**entry, "breaking_text": breaking_text or parsed["subject"]})

        if not hidden:
            visible.append((section_name, entry))
    return visible, breaking


def collect_entries(
    gh: GH, repo: str, prs: list[tuple[int, str]]
) -> tuple[dict[str, list[Entry]], list[Entry]]:
    by_section: dict[str, list[Entry]] = defaultdict(list)
    breaking: list[Entry] = []
    for pr_num, squash_sha in prs:
        visible, pr_breaking = _collect_pr_entries(gh, repo, pr_num, squash_sha)
        for section_name, entry in visible:
            by_section[section_name].append(entry)
        breaking.extend(pr_breaking)
    return by_section, breaking


def render_entry(entry: Entry, repo: str, with_sha: bool) -> str:
    scope = f"**{entry['scope']}:** " if entry["scope"] else ""
    pr_link = f"[#{entry['pr']}](https://github.com/{repo}/issues/{entry['pr']})"
    line = f"* {scope}{entry['subject']} ({pr_link})"
    if with_sha:
        sha = str(entry["sha"])
        line += f" ([{sha[:7]}](https://github.com/{repo}/commit/{sha}))"
    return line


def render_breaking_entry(entry: Entry, repo: str) -> str:
    scope = f"**{entry['scope']}:** " if entry["scope"] else ""
    pr_link = f"[#{entry['pr']}](https://github.com/{repo}/issues/{entry['pr']})"
    return f"* {scope}{entry['breaking_text']} ({pr_link})"


def render_section(
    repo: str,
    prev_version: str,
    new_version: str,
    date: str,
    by_section: dict[str, list[Entry]],
    breaking: list[Entry],
) -> str:
    compare = f"https://github.com/{repo}/compare/v{prev_version}...v{new_version}"
    lines: list[str] = [f"## [{new_version}]({compare}) ({date})", ""]

    if breaking:
        lines += ["", "### ⚠ BREAKING CHANGES", ""]
        lines += [render_breaking_entry(e, repo) for e in breaking]

    for _, name, hidden in CHANGELOG_SECTIONS:
        if hidden or not by_section.get(name):
            continue
        lines += ["", f"### {name}", ""]
        lines += [render_entry(e, repo, with_sha=True) for e in by_section[name]]

    lines.append("")
    return "\n".join(lines)


def _resolve_tag_commit(gh: GH, repo: str, tag: str) -> str:
    ref = gh.get(f"/repos/{repo}/git/ref/tags/{tag}")
    obj = ref["object"]
    if obj["type"] == "tag":
        return gh.get(f"/repos/{repo}/git/tags/{obj['sha']}")["object"]["sha"]
    return obj["sha"]


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--repo", default=os.environ.get("GH_REPO"))
    p.add_argument("--prev-version", required=True)
    p.add_argument("--new-version", required=True)
    p.add_argument("--head-sha", required=True)
    p.add_argument("--date", default=dt.date.today().isoformat())
    args = p.parse_args()

    error: str | None = None
    if not args.repo:
        error = "--repo or GH_REPO is required"
    token = os.environ.get("GH_TOKEN")
    if not token and not error:
        error = "GH_TOKEN env var is required"
    if error:
        print(error, file=sys.stderr)
        return 2

    gh = GH(token)
    try:
        base_sha = _resolve_tag_commit(gh, args.repo, f"v{args.prev_version}")
    except urllib.error.HTTPError as e:
        print(f"Could not find tag v{args.prev_version}: {e}", file=sys.stderr)
        return 1

    prs = collect_pr_numbers_in_range(gh, args.repo, base_sha, args.head_sha)
    by_section, breaking = collect_entries(gh, args.repo, prs)
    print(
        render_section(
            args.repo, args.prev_version, args.new_version, args.date, by_section, breaking
        ),
        end="",
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
