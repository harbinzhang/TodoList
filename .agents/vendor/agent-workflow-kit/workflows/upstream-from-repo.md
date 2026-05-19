---
description: Read selected consumer-repo skill or workflow files and upstream reusable behavior into Agent Workflow Kit without modifying the source repo
---

# Upstream From Repo

Use this workflow to turn a proven repo-local skill or workflow into a reusable Agent Workflow Kit skill/workflow.

The source repository is evidence, not the write target. All edits happen in the Agent Workflow Kit repository.

## Inputs

Required:

- Source repository root, such as `/path/to/consumer-repo`
- Source files to read, such as `.agents/skills/<name>/SKILL.md` or `.agents/workflows/<name>.md`
- Target AWK skill or workflow name

Optional:

- Whether to create a new AWK skill/workflow or update an existing one
- Consumer repos to sync after the AWK change is committed

## Preflight

From the AWK repo:

```bash
git status --short --branch
```

From the source repo, read only:

```bash
git -C <source-repo> status --short --branch
```

Rules:

- Do not run write commands in the source repo.
- Do not run `git restore`, `git checkout`, `git reset`, formatters, generators, install scripts, or patch tools against the source repo.
- If the source repo has dirty files, still read the requested source files. Mention that the source snapshot may include uncommitted local edits.
- If the source file is inside `.agents/vendor/agent-workflow-kit/`, treat it as vendored reference and prefer the AWK root file as the canonical target.

## Read Phase

Read:

- Requested source skill/workflow files.
- Any workflow files referenced by those source skills.
- AWK target `skills/<name>/SKILL.md` and `workflows/<name>.md`, if they already exist.
- `catalog.yaml`.
- Relevant adapter files under `adapters/`.

Use source files to identify behavior, safety constraints, invocation rules, and output formats. Do not treat source file paths as target paths unless they are already AWK root paths.

## Generalization Rules

Before writing to AWK, remove or abstract:

- Product, company, repo, project, environment, host, and collection names.
- Branch names other than generic examples like `main`.
- Commands that only exist in one consumer repo, unless described as optional helpers.
- Paths that only exist in the source repo.
- User-specific preferences that should remain in consumer repo overrides.

Preserve behavior that is broadly reusable:

- Safety rules.
- Source-of-truth rules.
- Marker protocols.
- Validation expectations.
- Adapter-thinness rules.
- Generic command shapes and optional helper patterns.

If behavior is useful but repo-specific, document it as a consumer profile value, optional helper, or local override responsibility instead of baking it into AWK.

## Write Phase

Only edit files under the AWK repo root.

When updating an existing skill:

1. Update `skills/<name>/SKILL.md`.
2. Update any shared workflow in `workflows/<name>.md`.
3. Update `catalog.yaml` descriptions when behavior changed.
4. Update `adapters/` only to keep thin command wrappers pointing at the canonical skill.

When adding a new skill:

1. Create `skills/<name>/SKILL.md` with frontmatter `name` and `description`.
2. Create `workflows/<name>.md` if the procedure is long or reusable.
3. Register both in `catalog.yaml`.
4. Add thin adapters only when this kit supports that runtime for the skill.

Do not update a consumer repo's `.agents/catalog.yaml` or `.claude/commands` in this workflow. That is a separate vendoring/install step after the AWK change is committed.

## Validation

Run:

```bash
node scripts/validate-catalog.mjs
git diff --check
```

If the change adds scripts or changes existing scripts, run the relevant script tests:

```bash
node --test scripts/*.test.mjs
```

Check for accidental source-specific strings in changed AWK root files:

```bash
rg -n '<source-repo-name>|<source-project-name>|<source-branch-name>' skills workflows catalog.yaml adapters
```

Use the real source strings from the request or source files. Existing pack snapshots under `packs/` may remain repo-specific.

## Optional Distribution

Only after the AWK change is committed, and only if the user asks to distribute it:

```bash
node scripts/sync-to-repo.mjs --target <consumer-repo> --dry-run
node scripts/sync-to-repo.mjs --target <consumer-repo> --ref HEAD
node scripts/install-skill-to-repo.mjs --target <consumer-repo> --skill <name> --mode vendored
```

`sync-to-repo.mjs` uses `git archive <ref>`, so uncommitted AWK edits are not copied.

## Report

Report:

- Source repo and source files read.
- AWK files changed.
- Repo-specific assumptions removed or generalized.
- Validation commands and results.
- Confirmation that the source repo was not modified.
- Whether distribution to any consumer repo was skipped or completed.
