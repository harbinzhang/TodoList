# Perks React Upstream And Consumer Broadcast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the complete `perks-react` agent pack from commit `821cf1076de2c933225dddf2924a80988d319ec4`, promote portable skills into generic AWK, publish the result, broadcast it to all reachable consumers, and route `roadmap` in `company-ops`.

**Architecture:** A clean temporary `perks-react` checkout is the immutable read-only input. Repo-specific material is preserved under `packs/perks-react`, while generic behavior is implemented in canonical root skills, workflows, references, catalog entries, and thin Claude adapters. A published AWK commit is then vendored byte-for-byte into consumers; company-specific routing remains outside the vendored directory.

**Tech Stack:** Node.js ESM scripts and tests, Markdown skill/workflow files, YAML catalogs and profiles, Git/GitHub.

## Global Constraints

- Source snapshot is `/tmp/perks-react-latest.NOaD5Y` at exact commit `821cf1076de2c933225dddf2924a80988d319ec4`.
- Never modify `/Users/haibinzhang/mine/react/perks-react` outside its vendor directory; preserve its four `.agents` edits and untracked contract test.
- Pack snapshots may retain Perkmon-specific assumptions; generic root files may not contain `perks-react`, `perkly-staging`, or `dev6`.
- Do not promote card, release, staging, marketing, benefit, or deployment operations into generic root skills.
- Consumer commits and pushes are out of scope.
- For dirty consumers, modify only `.agents/vendor/agent-workflow-kit`.
- Missing consumer checkouts remain blocked and registered.
- Do not initialize `company-ops/docs/roadmap`; only install routing.

---

### Task 1: Refresh And Prove The Complete Perks React Pack

**Files:**
- Modify: `packs/perks-react/**`
- Test: `scripts/agent-workflow-kit.test.mjs`

**Interfaces:**
- Consumes: clean source snapshot commit `821cf1076de2c933225dddf2924a80988d319ec4`
- Produces: self-contained `packs/perks-react` snapshot and `BACKUP_FROM.json` pinned to that SHA

- [ ] **Step 1: Verify the immutable source and inventory**

Run:

```bash
git -C /tmp/perks-react-latest.NOaD5Y status --porcelain
git -C /tmp/perks-react-latest.NOaD5Y rev-parse HEAD
find /tmp/perks-react-latest.NOaD5Y/.agents/skills -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort
```

Expected: empty status, SHA `821cf1076de2c933225dddf2924a80988d319ec4`, and exactly 56 skill directories.

- [ ] **Step 2: Preview the generated pack**

Run:

```bash
node scripts/backup-repo-pack.mjs --source /tmp/perks-react-latest.NOaD5Y --pack perks-react --dry-run
```

Expected: source status sections are absent and the output includes all 56 skill directories plus referenced workflows, adapters, scripts, and references.

- [ ] **Step 3: Refresh the generated pack**

Run:

```bash
node scripts/backup-repo-pack.mjs --source /tmp/perks-react-latest.NOaD5Y --pack perks-react
```

Expected: `packs/perks-react/BACKUP_FROM.json` records the exact source SHA and empty `.agents`/`.claude` status.

- [ ] **Step 4: Verify pack completeness and generator behavior**

Run:

```bash
node --test scripts/agent-workflow-kit.test.mjs
node -e "const m=require('./packs/perks-react/BACKUP_FROM.json'); if(m.sourceCommit!=='821cf1076de2c933225dddf2924a80988d319ec4'||m.sourceAgentsStatus||m.sourceClaudeCommandsStatus) process.exit(1)"
ruby -ryaml -e 'YAML.load_file("packs/perks-react/.agents/catalog.yaml")'
```

Expected: all tests pass, metadata assertion exits zero, and the pack catalog parses.

- [ ] **Step 5: Commit the pack snapshot**

```bash
git add packs/perks-react
git diff --cached --check
git commit -m "chore: refresh perks-react agent pack"
```

### Task 2: Add Contract Tests For Portable Skill Promotion

**Files:**
- Modify: `scripts/agent-workflow-kit.test.mjs`
- Test: `scripts/agent-workflow-kit.test.mjs`

**Interfaces:**
- Consumes: approved generic skill names and catalog conventions
- Produces: regression tests that require all promoted skill files, workflows, references, adapters, and source-neutral content

- [ ] **Step 1: Add a failing promoted-skill contract test**

Append a Node test that defines:

```js
const promotedSkills = [
  'roadmap',
  'cc',
  'crc',
  'mcc',
  'multi-cc',
  'pall',
  'firebase-functions-best-practices',
  'prepare-agent-handoff',
  'stale-client-handling',
]
```

For every concrete name in `promotedSkills`, assert that its
`skills/${name}/SKILL.md` exists, contains matching frontmatter, is registered
in `catalog.yaml`, and contains none of `perks-react`, `perkly-staging`, or
`dev6`. Also assert:

```js
assert.equal(existsSync(join(kitRoot, 'workflows', 'codex-collaboration-core.md')), true)
assert.equal(existsSync(join(kitRoot, 'workflows', 'multi-cc.md')), true)
assert.equal(
  existsSync(join(kitRoot, 'skills', 'firebase-functions-best-practices', 'references', 'review-checklist.md')),
  true,
)
```

- [ ] **Step 2: Run the contract test and verify red**

Run:

```bash
node --test --test-name-pattern "portable perks-react skills" scripts/agent-workflow-kit.test.mjs
```

Expected: failure because `skills/roadmap/SKILL.md` and the other promoted roots do not exist.

- [ ] **Step 3: Keep the failing test uncommitted**

Run:

```bash
git diff --check -- scripts/agent-workflow-kit.test.mjs
```

Expected: exit zero. Do not commit until the implementation turns it green.

### Task 3: Generalize Roadmap And Collaboration Skills

**Files:**
- Create: `skills/roadmap/SKILL.md`
- Create: `skills/cc/SKILL.md`
- Create: `skills/cc/agents/openai.yaml`
- Create: `skills/crc/SKILL.md`
- Create: `skills/crc/agents/openai.yaml`
- Create: `skills/mcc/SKILL.md`
- Create: `skills/mcc/agents/openai.yaml`
- Create: `skills/multi-cc/SKILL.md`
- Create: `skills/multi-cc/agents/openai.yaml`
- Create: `skills/pall/SKILL.md`
- Create: `skills/pall/agents/openai.yaml`
- Create: `workflows/codex-collaboration-core.md`
- Create: `workflows/multi-cc.md`
- Modify: `skills/codex-relay/SKILL.md`
- Modify: `catalog.yaml`
- Create: `adapters/claude/commands/roadmap.md`
- Create: `adapters/claude/commands/cc.md`
- Create: `adapters/claude/commands/crc.md`
- Create: `adapters/claude/commands/mcc.md`
- Create: `adapters/claude/commands/multi-cc.md`
- Create: `adapters/claude/commands/pall.md`
- Test: `scripts/agent-workflow-kit.test.mjs`

**Interfaces:**
- Consumes: source skills and workflows from `/tmp/perks-react-latest.NOaD5Y/.agents`
- Produces: source-neutral roadmap and native Codex collaboration contracts registered in AWK

- [ ] **Step 1: Implement generic roadmap**

Create `skills/roadmap/SKILL.md` with:

```yaml
---
name: roadmap
description: Operate an in-repository epic roadmap under docs/roadmap, including current-state summaries, candidate triage, drift checks, idea capture, approved epic promotion, track updates, and plan-to-mission linkage.
---
```

Preserve the source-of-truth rules, status vocabularies, user-approval gates,
candidate verification, and docs-only safety boundary from the source. Replace
the Perkmon design-spec reference, fixed npm commands, `E00 Stability`, and
product rollout examples with:

```text
Use commands.roadmapStatus and commands.roadmapCheck from
.agents/repo-profile.yaml when configured. Otherwise use existing
roadmap:status / roadmap:check package scripts when present. If neither exists,
perform the documented structural checks directly and do not claim generated
progress is current.
```

- [ ] **Step 2: Generalize collaboration skills and workflows**

Copy the source safety, manifest, sequential-agent, exact-SHA review, and resume
contracts into the listed root files. Replace fixed `origin/dev` with the
consumer profile's default branch/upstream, replace `.agents/skills/...` with
root-canonical or vendored-compatible references, and remove Perkmon roadmap
script assumptions. Keep aliases thin: `mcc` loads `multi-cc`; `cc` and `crc`
load their canonical workflow.

- [ ] **Step 3: Register skills and thin adapters**

Add all six skills to `catalog.yaml`. Each Claude adapter must contain:

```markdown
---
description: Use the vendored agent-workflow-kit <skill-name> skill
---

Load `.agents/vendor/agent-workflow-kit/skills/<skill-name>/SKILL.md` and follow it from the current worktree.
```

Add workflow entries for `codex-collaboration-core` and `multi-cc`. Keep
`roadmap` skill-only because its complete generic contract lives in
`skills/roadmap/SKILL.md`.

- [ ] **Step 4: Run targeted and catalog checks**

Run:

```bash
node --test --test-name-pattern "portable perks-react skills" scripts/agent-workflow-kit.test.mjs
node scripts/validate-catalog.mjs
rg -n 'perks-react|perkly-staging|dev6' skills/roadmap skills/cc skills/crc skills/mcc skills/multi-cc skills/pall workflows/codex-collaboration-core.md workflows/multi-cc.md adapters/claude/commands/{roadmap,cc,crc,mcc,multi-cc,pall}.md
```

Expected: tests and catalog pass; `rg` returns no matches.

### Task 4: Generalize Portable Engineering And Operations Guidance

**Files:**
- Create: `skills/firebase-functions-best-practices/**`
- Create: `skills/prepare-agent-handoff/SKILL.md`
- Create: `skills/prepare-agent-handoff/agents/openai.yaml`
- Create: `skills/stale-client-handling/SKILL.md`
- Create: `adapters/claude/commands/firebase-functions-best-practices.md`
- Create: `adapters/claude/commands/prepare-agent-handoff.md`
- Create: `adapters/claude/commands/stale-client-handling.md`
- Modify: `catalog.yaml`
- Modify: `scripts/agent-workflow-kit.test.mjs`
- Test: `scripts/agent-workflow-kit.test.mjs`

**Interfaces:**
- Consumes: portable source review, handoff, and stale-client safety rules
- Produces: generic skills with profile-driven commands and no product data assumptions

- [ ] **Step 1: Generalize Firebase Functions guidance**

Copy the source skill, references, and agent metadata. Replace repository-only
Functions verification commands with `.agents/repo-profile.yaml` commands or
the narrowest discovered package command. Preserve authorization, App Check,
idempotency, retry, concurrency, capacity, measurement, and production-write
gates.

- [ ] **Step 2: Promote prepare-agent-handoff**

Copy its output contract, authorization preservation, compression targets,
uncertainty handling, and quality checklist unchanged except for root/vendored
path normalization.

- [ ] **Step 3: Generalize stale-client handling**

Retain read-only-by-default investigation, hashed durable identifiers, explicit
authorization for outreach or data repair, seen-before tracking, dry-run-first
mitigation, and structured reporting. Replace Perkmon collections, commands,
campaigns, paths, and project IDs with consumer-profile values or
repository-discovered equivalents; stop with an evidence-insufficient report
when those hooks are absent.

- [ ] **Step 4: Register entries and adapters**

Add the three catalog entries and thin Claude adapters using the same wrapper
shape as Task 3.

- [ ] **Step 5: Run the full AWK test gate**

Run:

```bash
node --test scripts/*.test.mjs
node scripts/validate-catalog.mjs
git diff --check
rg -n 'perks-react|perkly-staging|dev6' skills workflows catalog.yaml adapters
```

Expected: all tests and catalog validation pass, whitespace is clean, and the
source-specific scan returns no matches.

- [ ] **Step 6: Commit portable promotion**

```bash
git add skills workflows catalog.yaml adapters scripts/agent-workflow-kit.test.mjs
git diff --cached --check
git commit -m "feat: promote portable consumer skills"
```

### Task 5: Publish AWK And Broadcast Every Reachable Consumer

**Files:**
- Modify in consumers: `.agents/vendor/agent-workflow-kit/**`

**Interfaces:**
- Consumes: validated AWK `main` commit
- Produces: every reachable consumer pinned to the identical published SHA

- [ ] **Step 1: Verify and publish AWK**

Run:

```bash
node --test scripts/*.test.mjs
node scripts/validate-catalog.mjs
git diff --check
git status --short --branch
git push origin main
```

Expected: checks pass, AWK worktree is clean, and `origin/main` equals `HEAD`.

- [ ] **Step 2: Run the registry dry-run**

Run:

```bash
node scripts/sync-consumers.mjs --all --ref HEAD --dry-run
```

Expected: dirty consumers and missing paths are reported without writes.

- [ ] **Step 3: Direct-sync reachable consumers vendor-only**

Run `scripts/sync-to-repo.mjs --ref HEAD` for:

```text
/Users/haibinzhang/mine/react/perks-react
/Users/haibinzhang/mine/react/ai-exploration-mentor
/Users/haibinzhang/mine/react/TodoList
/Users/haibinzhang/mine/ops/company-ops
```

Before and after each command, capture `git status --short` and confirm that no
path outside `.agents/vendor/agent-workflow-kit` changed because of the sync.

- [ ] **Step 4: Record blocked consumers**

Confirm these registered roots are unavailable:

```text
/Users/haibinzhang/mine/html/perkmon.com
/Users/haibinzhang/mine/pipeline/hotel-pipeline
```

Do not alter their registry entries.

### Task 6: Route Roadmap In Company Ops And Verify The Broadcast

**Files:**
- Create: `/Users/haibinzhang/mine/ops/company-ops/.agents/catalog.yaml`
- Create: `/Users/haibinzhang/mine/ops/company-ops/.agents/repo-profile.yaml`
- Create: `/Users/haibinzhang/mine/ops/company-ops/.claude/commands/roadmap.md`
- Create: `/Users/haibinzhang/mine/ops/company-ops/.claude/commands/california-first-w2-employee-onboarding.md`

**Interfaces:**
- Consumes: published vendored `roadmap` skill and existing repo-local onboarding skill
- Produces: resolvable company-ops routing without roadmap content initialization

- [ ] **Step 1: Install vendored roadmap routing**

Run:

```bash
node scripts/install-skill-to-repo.mjs --target /Users/haibinzhang/mine/ops/company-ops --skill roadmap --mode vendored
```

Expected: `.agents/catalog.yaml` and `.claude/commands/roadmap.md` reference the
vendored roadmap skill.

- [ ] **Step 2: Add company repository profile**

Create `.agents/repo-profile.yaml` with:

```yaml
repo:
  defaultBranch: dev
  branchPrefix: codex/
  worktreeRoot: ~/.codex/worktrees
  conventionsPath: CONTRIBUTING.md

commands:
  test: git diff --check
  verify: git diff --check
  build: git diff --check

review:
  baseFallbacks:
    - origin/dev
    - dev
  riskPaths:
    - legal/
    - people/
    - compliance/
    - employee-onboarding/
```

- [ ] **Step 3: Route the existing local onboarding skill**

Add this catalog entry without changing the local skill:

```yaml
  - name: california-first-w2-employee-onboarding
    path: .agents/skills/california-first-w2-employee-onboarding/SKILL.md
    description: Use when a California business is preparing its first W-2 employee hire or creating onboarding materials covering payroll, workers' compensation, wage-hour practices, paid sick leave, expense reimbursement, new-hire reporting, CalSavers, remote work, or an ICHRA.
    adapters:
      claude: .claude/commands/california-first-w2-employee-onboarding.md
```

Create a thin Claude adapter that loads that exact repo-local path.

- [ ] **Step 4: Validate company routing**

Run:

```bash
ruby -ryaml -e 'YAML.load_file(".agents/catalog.yaml"); YAML.load_file(".agents/repo-profile.yaml")'
test -f .agents/vendor/agent-workflow-kit/skills/roadmap/SKILL.md
test -f .agents/skills/california-first-w2-employee-onboarding/SKILL.md
rg -n 'name: roadmap|agent-workflow-kit/skills/roadmap|california-first-w2-employee-onboarding' .agents/catalog.yaml .claude/commands
git diff --check
```

Expected: YAML parses, both skill paths exist, routing matches, and whitespace is clean.

- [ ] **Step 5: Verify exact broadcast pins and preserved dirt**

For each reachable consumer, read
`.agents/vendor/agent-workflow-kit/VENDORED_FROM.json` and require `commit` to
equal AWK `git rev-parse HEAD`. Re-run `git status --short` in AWK, the local
`perks-react`, `ai-exploration-mentor`, `TodoList`, and `company-ops`; compare
against preflight and report every pre-existing non-vendor change unchanged.

- [ ] **Step 6: Final report**

Report:

- source snapshot SHA and all 56 skill classifications;
- refreshed pack commit and portable-promotion commit;
- AWK push status and broadcast SHA;
- four synced consumers and two blocked missing checkouts;
- company-ops roadmap/onboarding routing;
- consumer changes left uncommitted;
- exact validation commands and results.
