# Agent Workflow Kit

Reusable agent skills and workflows for repository-local coding agents.

This repository is the upstream source for generic skills. Consumer repositories vendor a pinned copy into:

```text
.agents/vendor/agent-workflow-kit/
```

Consumer repositories keep their own routing and local policy:

```text
.agents/
  catalog.yaml
  repo-profile.yaml
  skills/
  workflows/
  vendor/agent-workflow-kit/
```

## Resolution Model

Use this precedence in every consumer repo:

1. Real repo-local override directory: `.agents/skills/<name>/SKILL.md`
2. Managed native link: `.agents/skills/<name>` points to the vendored generic
   skill at `.agents/vendor/agent-workflow-kit/skills/<name>`
3. Repo profile values: `.agents/repo-profile.yaml`

Do not edit vendored files for project-specific behavior. Add or update a repo-local override, then upstream the generalized part here only after it proves useful.

## Adapter Contract

`SKILL.md` is the canonical source. Agent-specific commands must stay thin:

- Codex/OpenAI discovers repository skills by scanning `.agents/skills/*/SKILL.md`.
- Vendored skills are exposed through relative `.agents/skills/<name>` symlinks
  that point to `.agents/vendor/agent-workflow-kit/skills/<name>`.
- `.agents/catalog.yaml` remains AWK's selected-skill and adapter metadata; it is
  not a Codex discovery source.
- Claude commands live under `.claude/commands/*.md`, include command frontmatter, and only load the canonical `SKILL.md`.
- Consumer repo catalog entries should declare the Claude adapter when one exists:

```yaml
skills:
  - name: rebase
    path: .agents/vendor/agent-workflow-kit/skills/rebase/SKILL.md
    description: Recreate the current worktree on a fresh branch reset to its upstream
    adapters:
      claude: .claude/commands/rebase.md
```

If a consumer repo overrides a generic skill, replace the managed symlink with a
real `.agents/skills/<name>/` directory, then change only the catalog `path` and
the Claude command's loaded path to `.agents/skills/<name>/SKILL.md`. Do not copy
the procedure into `.claude/commands/<name>.md`.

Generate or refresh that routing with:

```bash
node scripts/install-skill-to-repo.mjs --target /path/to/consumer-repo --skill rebase --mode vendored
node scripts/install-skill-to-repo.mjs --target /path/to/consumer-repo --skill rebase --mode override
```

`--mode vendored` expects the skill to already exist at
`.agents/vendor/agent-workflow-kit/skills/<name>/SKILL.md` in the consumer repo.
Run the vendoring step first. It creates or verifies this native Codex link:

```text
.agents/skills/<name> -> ../vendor/agent-workflow-kit/skills/<name>
```

The installer refuses to replace a real local skill directory or an unexpected
symlink. `--mode override` expects a real, non-symlinked repo-local skill at
`.agents/skills/<name>/SKILL.md`.

Installing `pr-coding-loop` or `pr-review-loop` also adds root npm aliases for
the shared read-only PR helper when the consumer has `package.json`:

```json
"agent-pr:status": "node .agents/vendor/agent-workflow-kit/scripts/agent-pr-status.mjs status",
"agent-pr:ready": "node .agents/vendor/agent-workflow-kit/scripts/agent-pr-status.mjs ready"
```

Without those aliases, agents can call the vendored helper directly with
`node .agents/vendor/agent-workflow-kit/scripts/agent-pr-status.mjs`.

The generic workflow skills also include slash-friendly aliases for common PR
and review flows:

- `pcl`: alias for `pr-coding-loop`
- `prl` and `reviewl`: aliases for `pr-review-loop`
- `pal`: alias for `pr-adversarial-loop`
- `cr`: alias for `codex-relay`

Install them with the same `install-skill-to-repo.mjs` command after vendoring.

## Profile Contract

Each consumer repo should provide `.agents/repo-profile.yaml`:

```yaml
repo:
  defaultBranch: main
  branchPrefix: codex/
  worktreeRoot: ~/.codex/worktrees
  conventionsPath: .agents/conventions.md

commands:
  test: npm run test
  verify: npm run verify
  build: npm run build

review:
  baseFallbacks:
    - origin/main
    - main
  riskPaths: []
```

Skills should read this file before assuming branches, commands, or risk paths.

## Validation

```bash
node scripts/validate-catalog.mjs
```

## Upstreaming From A Consumer Repo

Use `upstream-from-repo` when a consumer repo has a useful repo-local skill or
workflow that should become reusable AWK behavior.

The source repo is read-only. Read the requested source files, generalize the
behavior, and modify only this AWK repo's root `skills/`, `workflows/`,
`catalog.yaml`, and thin adapters.

Do not edit the consumer repo's `.agents`, `.claude`, or vendored kit copy while
upstreaming. Distribution back to consumer repos is a separate step after the AWK
change is committed.

Example request:

```text
Use upstream-from-repo. Source repo: /path/to/consumer-repo.
Read .agents/skills/example/SKILL.md and .agents/workflows/example.md.
Update only this Agent Workflow Kit repo with the reusable behavior.
Do not modify the source repo.
```

For the recurring full maintenance loop, use `upstream-and-broadcast`: upstream
the reusable behavior into AWK, refresh the source consumer's complete repo pack
including every `.agents/skills/*` entry, validate/commit/push AWK, then
broadcast that committed AWK ref to the registered consumers in
`consumers.yaml`. Repo-specific skills stay pack-only unless they are explicitly
generalized and registered in the root catalog.

```text
Use upstream-and-broadcast. Source repo: /path/to/consumer-repo.
Inventory and sync all repo-local .agents/skills/* entries, update reusable AWK
skills, refresh the source repo pack, commit and push AWK, then broadcast to all
enabled consumers and commit vendor-only consumer updates.
```

## Vendoring

Use vendoring to give another repository the generic skills and workflows from
this kit without copying those procedures into repo-local docs.

Consumers that should receive regular AWK vendor updates are listed in:

```text
consumers.yaml
```

Preview or sync every enabled consumer:

```bash
node scripts/sync-consumers.mjs --all --dry-run
node scripts/sync-consumers.mjs --all --ref HEAD
```

Sync one consumer by name:

```bash
node scripts/sync-consumers.mjs --consumer perkmon.com --dry-run
node scripts/sync-consumers.mjs --consumer perkmon.com --ref HEAD
```

`sync-consumers.mjs` is a batch wrapper around `sync-to-repo.mjs`. It blocks
tracked dirty files outside `.agents/vendor/agent-workflow-kit/`, reports
untracked files as warnings, and does not commit or push consumer repos. For
each consumer catalog entry that points into the vendored kit, sync also creates
or verifies the matching native Codex symlink under `.agents/skills/`. Consumers
without a catalog receive the vendor bundle without exposing any generic skill.

From this repository, first make sure the generic skill changes are committed.
`sync-to-repo.mjs` uses `git archive <ref>`, so uncommitted edits are not copied.

```bash
node scripts/sync-to-repo.mjs --target /path/to/consumer-repo --dry-run
node scripts/sync-to-repo.mjs --target /path/to/consumer-repo --ref HEAD
```

The sync writes `.agents/vendor/agent-workflow-kit/VENDORED_FROM.json` in the target repo.

Then register the skills the consumer repo should expose:

```bash
node scripts/install-skill-to-repo.mjs --target /path/to/consumer-repo --skill rebase --mode vendored
node scripts/install-skill-to-repo.mjs --target /path/to/consumer-repo --skill verify --mode vendored
```

Registration writes AWK/Claude routing metadata and the native Codex symlink.
Later broadcasts refresh the vendored target and reconcile links for those
selected catalog entries; they do not expose every AWK skill.

Registering `pr-coding-loop` or `pr-review-loop` after vendoring also wires the
`agent-pr:status` and `agent-pr:ready` npm aliases when the consumer has
`package.json`.

Finally, add or update `.agents/repo-profile.yaml` in the consumer repo with
that repo's branch, verification, and review defaults. Keep repo-specific
behavior in `.agents/skills/<name>/SKILL.md` overrides or `.agents/conventions.md`;
do not edit vendored files for local policy.

For first-time setup, use `consumer-onboarding`. It vendors AWK, registers only
the selected skills, creates or reviews `.agents/repo-profile.yaml`, validates
the routing, and keeps unrelated consumer repo dirt out of the onboarding
commit.

Before committing the consumer repo, validate the routing:

```bash
ruby -ryaml -e 'YAML.load_file(".agents/catalog.yaml"); YAML.load_file(".agents/repo-profile.yaml")'
test "$(readlink .agents/skills/rebase)" = "../vendor/agent-workflow-kit/skills/rebase"
test -f .agents/skills/rebase/SKILL.md
git diff --check
```

## Repository Packs

Repo-specific packs live under `packs/`. They are snapshots and examples, not part of the generic root catalog.

- `packs/perks-react/`: complete `.agents` skill/workflow snapshot from `perks-react`.

Use packs by copying selected files into a target repo and adapting repo-specific commands, project IDs, branch names, and safety rules.

Refresh a pack from its source repo:

```bash
node scripts/backup-repo-pack.mjs --source /path/to/source-repo --pack my-repo --dry-run
node scripts/backup-repo-pack.mjs --source /path/to/source-repo --pack my-repo
```

To backup, commit, and push in one command:

```bash
node scripts/backup-repo-pack.mjs --source /path/to/source-repo --pack my-repo --commit --push
```

The backup script copies `.agents` from the source repo, excludes `.agents/vendor`, rewrites vendored skill paths to pack-local `.agents/skills/...` paths, and writes `packs/<name>/BACKUP_FROM.json`.
