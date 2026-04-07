---
description: How to create a release (PR → merge → version bump → tag → push)
---

# Git Release Workflow

Creates a PR from the current branch to `main`, merges it, bumps the version, tags the release, pushes everything, and returns you to your working branch.

## Prerequisites

- GitHub CLI installed and authenticated (`gh auth status`)
- Clean working tree (commit or stash changes first)
- Current branch is up to date with remote

---

## Steps

// turbo
1. Verify clean working tree and save current branch name:
```bash
git status --porcelain | grep -q . && echo "ERROR: Working tree is dirty. Commit or stash changes first." && exit 1 || echo "Working tree is clean"
```

// turbo
2. Push current branch to remote:
```bash
git push origin HEAD
```

// turbo
3. Create a Pull Request to `main`:
```bash
gh pr create --base main --fill
```

// turbo
4. Merge the Pull Request (squash merge for a clean history):
```bash
gh pr merge --squash --delete-branch=false
```

// turbo
5. Switch to `main` and pull the latest:
```bash
git checkout main && git pull origin main
```

6. Bump the version — pick **one** of the following:

**Patch** (bug fixes, e.g. `0.4.2` → `0.4.3`):
```bash
npm version patch
```

**Minor** (new features, backward-compatible, e.g. `0.4.2` → `0.5.0`):
```bash
npm version minor
```

**Major** (breaking changes, e.g. `0.4.2` → `1.0.0`):
```bash
npm version major
```

> **What this does:** `npm version` automatically updates `package.json`, creates a git commit, and creates an annotated git tag (e.g. `v0.4.3`).

7. Push the version commit and tag to remote:
```bash
git push origin main --follow-tags
```

// turbo
8. Switch back to your working branch and merge main to pick up the version bump:
```bash
git checkout - && git merge main
```

> [!IMPORTANT]
> **You must merge main back** — `npm version` only updates `package.json` on `main`. Without this merge, your dev branch keeps the old version and any subsequent deploy will show a stale version number.

---

## Quick Reference

| Version Bump | When to Use | Example |
|-------------|-------------|---------|
| `patch` | Bug fixes, typos, small tweaks | `0.4.2` → `0.4.3` |
| `minor` | New features, non-breaking changes | `0.4.2` → `0.5.0` |
| `major` | Breaking changes, major rewrites | `0.4.2` → `1.0.0` |

## Post-Release Checklist

- [ ] Verify the tag appears on GitHub: `gh release list` or check the repo's releases page
- [ ] Deploy the new release using `/deploy` if needed
- [ ] Verify `package.json` version is correct on `main`
