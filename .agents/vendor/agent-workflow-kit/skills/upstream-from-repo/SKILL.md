---
name: upstream-from-repo
description: "Upstream reusable skill or workflow behavior from a consumer repository into this Agent Workflow Kit repository. Use when the user asks to update AWK from specific skills or workflows in another repo while leaving that source repo unchanged."
---

# Upstream From Repo

Canonical workflow doc: `workflows/upstream-from-repo.md`.

Use this skill when a consumer repo has a useful repo-local skill or workflow and the user wants that behavior moved into Agent Workflow Kit for reuse by other repositories.

## Hard Rules

- Treat the named source repo as read-only. Do not edit its `.agents`, `.claude`, vendored kit copy, source files, or git state.
- Modify only the Agent Workflow Kit checkout that contains this skill.
- Do not copy repo-specific policy blindly. Generalize reusable behavior and remove project names, branch names, hosts, Firebase/project IDs, paths, and command assumptions that only apply to the source repo.
- Keep repo-specific behavior in source repo overrides, pack snapshots, or examples; do not add it to root AWK skills/workflows.
- If a source skill references a repo-local workflow, read both and upstream the reusable workflow behavior with it.
- Keep agent-specific adapters thin. Update `catalog.yaml` and any adapter only after the canonical AWK `SKILL.md` or workflow file is updated.

## Execution

1. Load `workflows/upstream-from-repo.md`.
2. Identify the source repo path and the exact source skill/workflow files to read.
3. Confirm the source repo will be read-only and the AWK repo is the only write target.
4. Read source files, AWK target files, `catalog.yaml`, and relevant adapters.
5. Update AWK canonical `skills/`, `workflows/`, catalog entries, and thin adapters as needed.
6. Validate with `node scripts/validate-catalog.mjs` and `git diff --check`.
7. Report exactly which AWK files changed and confirm the source repo was not modified.

## Output

- Source repo and source files read
- AWK files changed
- Repo-specific assumptions removed or generalized
- Validation commands and results
- Whether follow-up vendoring to consumer repos was requested or not
