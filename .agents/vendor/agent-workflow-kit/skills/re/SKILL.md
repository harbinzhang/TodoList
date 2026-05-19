---
name: re
description: "Review current-worktree git changes against the branch upstream or repo-profile fallback bases. Use when the user asks to review current changes, check a diff, or audit work that belongs to the active branch."
---

# Review Skill

Use this skill to review only the active worktree and active branch.

## Setup

Read `.agents/repo-profile.yaml` if present.

Defaults:
- `repo.conventionsPath`: `.agents/conventions.md`
- `review.baseFallbacks`: `origin/main`, then `main`
- `review.riskPaths`: `[]`

## Execution

1. Establish branch and comparison base:
   ```bash
   git branch --show-current
   git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true
   ```
   Prefer the branch upstream. If absent, use the first existing `review.baseFallbacks` entry.

2. Collect only current-worktree/current-branch diffs:
   ```bash
   git diff
   git diff --cached
   git merge-base HEAD <comparison-base>
   git diff <merge-base>..HEAD
   ```
   If all are empty, report no current-branch changes and stop.

3. Load project conventions from `repo.conventionsPath` when it exists.

4. Load relevant repo-local instruction files, such as `CLAUDE.md`, when they exist near the changed surface.

5. Review for bugs, security issues, boundary failures, missing error handling, and changed files matching `review.riskPaths`.

6. Keep findings grounded in changed lines. Do not inspect sibling worktrees or unrelated local state unless the user asks. Do not flag pre-existing issues in unchanged code unless they make the current change unsafe.

## Output

```md
## Review: <branch name>

### Critical Issues
- [file:line] ...

### Important Issues
- [file:line] ...

### Suggestions
- [file:line] ...

### Summary
X file(s) reviewed, Y issue(s) found.
```

If no issues are found, report a clean review and mention any verification not run.
