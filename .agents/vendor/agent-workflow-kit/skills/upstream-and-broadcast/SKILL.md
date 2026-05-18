---
name: upstream-and-broadcast
description: "Run the full Agent Workflow Kit update cycle: upstream reusable behavior from a consumer repo, validate and commit AWK, broadcast the pushed AWK ref to registered consumers, then optionally commit and push vendor-only consumer updates."
---

# Upstream And Broadcast

Canonical workflow doc: `workflows/upstream-and-broadcast.md`.

Use this skill when the user wants the two-step flow: update AWK from a consumer repo, then broadcast the updated vendor bundle to registered consumers.

## Hard Rules

- Split the work into two phases: upstream first, broadcast second.
- Treat the source consumer repo as read-only during upstreaming.
- Generalize reusable behavior before adding it to AWK; keep repo-specific defaults, branch names, hosts, product names, and local commands out of generic root skills/workflows.
- Validate and commit AWK before broadcasting. Consumer `VENDORED_FROM.json` should point at a real AWK commit, preferably pushed.
- During broadcast commits, stage only `.agents/vendor/agent-workflow-kit` unless the user explicitly asks to update consumer routing/profile files too.
- Do not force-push. If a consumer branch is behind, rebase or merge safely while preserving unrelated local dirt, or stop and report the blocker.

## Execution

1. Load `workflows/upstream-and-broadcast.md`.
2. Identify source consumer repo, source skill/workflow files, broadcast consumers, and whether consumer commits/pushes are requested.
3. Run the upstream phase using `upstream-from-repo` rules.
4. Validate, commit, and push AWK when requested or when broadcasting from `HEAD`.
5. Broadcast with `scripts/sync-consumers.mjs --all --ref <awk-ref>` when readiness allows. If a consumer has non-vendor tracked dirt, either stop or intentionally sync that consumer's vendor directory directly and stage only vendor files.
6. Commit/push vendor-only consumer updates if requested.
7. Report AWK commit, consumer commits, push status, and any remaining local dirt.

## Outputs

- source repo and source files read
- AWK files changed and AWK commit/push status
- broadcast consumers and vendored AWK commit
- consumer commit/push status
- validation commands and results
- blockers, warnings, and unrelated dirt left untouched
