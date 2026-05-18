---
name: consumer-onboarding
description: "Onboard a new consumer repository to Agent Workflow Kit by vendoring the kit, registering selected skills, creating repo-profile routing, validating catalog wiring, and preparing a focused consumer commit."
---

# Consumer Onboarding

Canonical workflow doc: `workflows/consumer-onboarding.md`.

Use this skill when a repository should start consuming Agent Workflow Kit through `.agents/vendor/agent-workflow-kit/`.

## Hard Rules

- Work from the Agent Workflow Kit checkout.
- Treat the consumer repo's existing source changes as user-owned. Do not stage unrelated files.
- Vendor from a real AWK git ref. If the requested AWK changes are uncommitted, commit AWK first or stop and explain that `sync-to-repo.mjs` uses `git archive`.
- Keep consumer-specific policy in `.agents/repo-profile.yaml`, `.agents/conventions.md`, or repo-local `.agents/skills/<name>/SKILL.md` overrides. Do not edit vendored files for local policy.
- Install only the skills the consumer should expose. Do not register every AWK skill by default.
- When registering `pr-coding-loop` or `pr-review-loop`, expect the installer to add root `package.json` `agent-pr:*` aliases if the consumer has `package.json`; include that file in the focused onboarding scope only when those aliases changed.

## Execution

1. Load `workflows/consumer-onboarding.md`.
2. Confirm target repo root, selected skills, and whether each skill should route to vendored or repo-local override mode.
3. Run the workflow's preflight and vendoring steps.
4. Register selected skills with `scripts/install-skill-to-repo.mjs`.
5. Add or review `.agents/repo-profile.yaml`.
6. Validate catalog/profile YAML and `git diff --check` in the consumer repo.
7. Report consumer files changed, selected skills, validation results, and any local dirt intentionally left unstaged.

## Outputs

- target consumer repo and branch
- vendored AWK commit in `VENDORED_FROM.json`
- registered skill list and routing mode
- profile/conventions status
- validation commands and results
- commit/push status, if requested
