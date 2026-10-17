---
name: upstream-and-broadcast
description: "Run the full Agent Workflow Kit update cycle: inventory every repo-local consumer skill, refresh its repo pack, upstream reusable behavior, validate and commit AWK, broadcast the pushed AWK ref to registered consumers, then optionally commit and push vendor-only consumer updates."
---

# Upstream And Broadcast

Canonical workflow doc: `workflows/upstream-and-broadcast.md`.

Use this skill when the user wants the two-step flow: update AWK from a consumer repo, then broadcast the updated vendor bundle to registered consumers.

## Hard Rules

- Split the work into two phases: upstream first, broadcast second.
- Treat the source consumer repo as read-only during upstreaming.
- Inventory every source `.agents/skills/*` entry, including skills that do not yet overlap the AWK root catalog.
- Refresh the source repo's pack under `packs/<consumer>/` so the complete repo-local skill tree stays in sync. Pack snapshots may remain repo-specific and are not automatically registered in the generic root catalog.
- Generalize reusable behavior before adding it to AWK; keep repo-specific defaults, branch names, hosts, product names, and local commands out of generic root skills/workflows.
- Validate and commit AWK before broadcasting. Consumer `VENDORED_FROM.json` should point at a real AWK commit, preferably pushed.
- During broadcast commits, stage only `.agents/vendor/agent-workflow-kit` unless the user explicitly asks to update consumer routing/profile files too.
- Do not force-push. If a consumer branch is behind, rebase or merge safely while preserving unrelated local dirt, or stop and report the blocker.

## Execution

1. Load `workflows/upstream-and-broadcast.md`.
2. Identify the source consumer repo, inventory its full `.agents/skills/*` tree, identify referenced workflows, choose the matching pack name, identify broadcast consumers, and determine whether consumer commits/pushes are requested.
3. Refresh `packs/<consumer>/` with `scripts/backup-repo-pack.mjs`, then classify every repo-local skill as an existing AWK overlap, a new reusable candidate, or repo-specific pack-only behavior.
4. Run the upstream phase using `upstream-from-repo` rules for existing overlaps and reusable candidates. Do not promote repo-specific pack-only behavior.
5. Validate, commit, and push AWK when requested or when broadcasting from `HEAD`.
6. Broadcast with `scripts/sync-consumers.mjs --all --ref <awk-ref>` when readiness allows. If a consumer has non-vendor tracked dirt, either stop or intentionally sync that consumer's vendor directory directly and stage only vendor files.
7. Commit/push vendor-only consumer updates if requested.
8. Report the complete skill inventory/classification, refreshed pack, AWK commit, consumer commits, push status, and any remaining local dirt.

## Outputs

- source repo and complete repo-local skill inventory
- refreshed repo pack and skills kept pack-only
- AWK files changed and AWK commit/push status
- broadcast consumers and vendored AWK commit
- consumer commit/push status
- validation commands and results
- blockers, warnings, and unrelated dirt left untouched
