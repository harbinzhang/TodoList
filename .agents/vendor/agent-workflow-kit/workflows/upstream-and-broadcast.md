---
description: Upstream reusable behavior from a consumer repo into AWK, then broadcast the committed AWK ref to registered consumers
---

# Upstream And Broadcast

Use this workflow for the repeated two-phase AWK maintenance loop:

1. Update AWK from a proven consumer repo behavior.
2. Broadcast the updated AWK vendor bundle to registered consumers.

## Inputs

Required:

- source consumer repo root
- source skill/workflow files or an instruction to compare all AWK-overlapping skills
- broadcast scope: all enabled consumers or named consumers

Optional:

- whether to commit and push AWK
- whether to commit and push consumer vendor updates
- commit messages

## Phase 1: Upstream From Consumer

Follow `workflows/upstream-from-repo.md`.

Preflight:

```bash
git status --short --branch
git -C <source-repo> status --short --branch
```

Read:

- source repo-local `SKILL.md` and referenced workflow files
- source vendored AWK files when they contain newer reusable behavior
- matching AWK root files
- `catalog.yaml` and relevant thin adapters

Generalize before editing AWK:

- remove product, repo, host, project, environment, account, and fixed branch assumptions
- keep safety rules, marker protocols, validation gates, and generic command shapes
- leave repo-specific behavior in source overrides, packs, or profiles

Validate AWK:

```bash
node scripts/validate-catalog.mjs
git diff --check
```

If scripts changed:

```bash
node --test scripts/*.test.mjs
```

Check changed AWK root files for source-specific strings.

## Phase 2: Commit AWK

Broadcasts should use a real AWK commit because `scripts/sync-to-repo.mjs` uses `git archive <ref>`.

```bash
git status --short
git add <intended AWK files>
git diff --cached --stat
git commit -m "<message>"
git push origin <branch>
AWK_REF=$(git rev-parse --short HEAD)
```

If the user explicitly wants a dry run only, skip commit/push and use `--dry-run`.

## Phase 3: Broadcast Vendor Bundle

Dry run first:

```bash
node scripts/sync-consumers.mjs --all --ref <awk-ref> --dry-run
```

For named consumers:

```bash
node scripts/sync-consumers.mjs --consumer <name> --ref <awk-ref> --dry-run
```

If readiness passes, sync:

```bash
node scripts/sync-consumers.mjs --all --ref <awk-ref>
```

If the batch wrapper blocks a consumer because of tracked non-vendor dirt, do not stage that dirt. Either:

- stop and report the blocker, or
- when the user has clearly asked to broadcast anyway, run `scripts/sync-to-repo.mjs --target <repo> --ref <awk-ref>` for that consumer and later stage only `.agents/vendor/agent-workflow-kit`.

## Phase 4: Commit And Push Consumers

Only if requested.

For each consumer:

```bash
git -C <repo> status --short --branch
git -C <repo> add .agents/vendor/agent-workflow-kit
git -C <repo> diff --cached --stat
git -C <repo> commit -m "chore: sync agent workflow kit"
git -C <repo> push
```

If the branch has no upstream, push explicitly:

```bash
git -C <repo> push -u origin <branch>
```

If push is rejected because the branch is behind:

```bash
git -C <repo> fetch origin <branch>
git -C <repo> rebase --autostash origin/<branch>
git -C <repo> push origin <branch>
```

Use rebase only when it preserves unrelated local dirt and the vendor-sync commit replays cleanly. If conflicts appear, stop and report them.

## Final Verification

Check AWK and all touched consumers:

```bash
git status --short --branch
cat .agents/vendor/agent-workflow-kit/VENDORED_FROM.json
```

Confirm every consumer `VENDORED_FROM.json` points at the AWK commit that was pushed.

## Report

Report:

- source repo and source files read
- AWK validation, commit, and push status
- AWK commit used for broadcast
- consumers synced
- consumer commits and push targets
- blocked consumers or direct-sync exceptions
- unrelated local dirt left untouched
