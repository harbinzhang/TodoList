---
description: Onboard a consumer repository to Agent Workflow Kit vendoring, skill routing, and repo-profile defaults
---

# Consumer Onboarding

Use this workflow to make a repository consume AWK through
`.agents/vendor/agent-workflow-kit/`, selected-skill catalog metadata, and
native Codex symlinks under `.agents/skills/`.

## Inputs

Required:

- target consumer repository root
- AWK ref to vendor, usually `HEAD`
- selected skills to expose

Optional:

- whether to add the consumer to `consumers.yaml`
- repo-profile values
- whether to commit and push consumer changes

## Preflight

From AWK:

```bash
git status --short --branch
git rev-parse <awk-ref>
node scripts/validate-catalog.mjs
```

From the consumer repo:

```bash
git status --short --branch
git rev-parse --show-toplevel
```

Rules:

- Target path must be the consumer repo root.
- Do not clean or revert consumer dirt.
- If committing later, stage only `.agents/vendor/agent-workflow-kit`, the
  generated `.agents/skills/<selected-skill>` symlinks, `.agents/catalog.yaml`,
  `.agents/repo-profile.yaml`, `.agents/conventions.md`, generated
  `.claude/commands/*`, and root `package.json` npm aliases that belong to this
  onboarding.

## Vendor AWK

Preview first:

```bash
node scripts/sync-to-repo.mjs --target <consumer-repo> --ref <awk-ref> --dry-run
```

Then sync:

```bash
node scripts/sync-to-repo.mjs --target <consumer-repo> --ref <awk-ref>
```

This writes `.agents/vendor/agent-workflow-kit/VENDORED_FROM.json`.

## Register Skills

For each selected vendored skill:

```bash
node scripts/install-skill-to-repo.mjs --target <consumer-repo> --skill <skill-name> --mode vendored
```

The installer keeps the vendored directory canonical and creates:

```text
.agents/skills/<skill-name> -> ../vendor/agent-workflow-kit/skills/<skill-name>
```

Codex discovers the skill through that symlink. The catalog remains AWK and
Claude adapter metadata. The installer stops rather than replacing an existing
local directory or unexpected symlink.

When `<skill-name>` is `pr-coding-loop` or `pr-review-loop`, the installer also
adds these root `package.json` aliases when the consumer has `package.json` and
the vendored helper exists:

```json
"agent-pr:status": "node .agents/vendor/agent-workflow-kit/scripts/agent-pr-status.mjs status",
"agent-pr:ready": "node .agents/vendor/agent-workflow-kit/scripts/agent-pr-status.mjs ready"
```

If the consumer has no `package.json`, agents can still run the vendored helper
directly with `node .agents/vendor/agent-workflow-kit/scripts/agent-pr-status.mjs`.

For each repo-local override that already exists at `.agents/skills/<skill-name>/SKILL.md`:

```bash
node scripts/install-skill-to-repo.mjs --target <consumer-repo> --skill <skill-name> --mode override
```

Do not register a skill whose target `SKILL.md` does not exist.

## Profile And Conventions

Ensure `.agents/repo-profile.yaml` exists. Start from `profiles/example.repo-profile.yaml` or a closer AWK profile, then set only repo-local facts:

- default branch
- branch prefix
- worktree root
- conventions path
- test/build/verify commands
- review fallback bases and risk paths

Create `.agents/conventions.md` only when the consumer has real repo-local rules to encode.

## Optional Registry Entry

If this consumer should receive regular broadcasts, add it to AWK `consumers.yaml`:

```yaml
  - name: <consumer-name>
    path: <absolute-repo-root>
    enabled: true
    syncVendor: true
    notes: <short purpose>
```

Use `allowDirtyUntracked` only for known generated paths that should not block sync readiness.

## Validation

From the consumer repo:

```bash
ruby -ryaml -e 'YAML.load_file(".agents/catalog.yaml"); YAML.load_file(".agents/repo-profile.yaml")'
test "$(readlink .agents/skills/<skill-name>)" = "../vendor/agent-workflow-kit/skills/<skill-name>"
test -f .agents/skills/<skill-name>/SKILL.md
git diff --check
```

If the consumer has its own catalog validator, run that too.

From AWK, if `consumers.yaml` changed:

```bash
node scripts/validate-catalog.mjs
node scripts/sync-consumers.mjs --consumer <consumer-name> --dry-run
```

## Commit And Push

Only if requested:

```bash
git status --short
git add .agents/vendor/agent-workflow-kit .agents/skills/<selected-skill> .agents/catalog.yaml .agents/repo-profile.yaml .agents/conventions.md .claude/commands package.json
git diff --cached --stat
git commit -m "chore: onboard agent workflow kit"
git push
```

If the branch has no upstream, push with an explicit branch name and report it.

## Report

Report:

- AWK ref vendored
- selected skills and routing mode
- profile/conventions files changed
- validations run
- consumer commit/push result, if requested
- unrelated consumer dirt left unstaged
