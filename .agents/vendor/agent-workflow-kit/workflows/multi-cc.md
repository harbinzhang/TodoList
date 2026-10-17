# Multi-CC Workflow

Canonical workflow for planning one outcome as several sequential Compact Codex
Collaboration PRs and finishing the complete mission.

## Invariants

- Target only `origin/<profile-default-branch>`. Never merge to `main`, deploy, or release.
- Use one current worktree sequentially. Never let implementation agents edit
  concurrently and never create stacked PRs.
- Treat GitHub PR state and Git SHAs as authoritative. The local mission
  manifest is a resumable execution ledger, not proof of merge or approval.
- Require every implementation PR to be independently useful, verifiable, and
  safe to merge before the next PR begins.
- Keep exactly one roadmap track for the mission. Track the implementation PRs
  as top-level checkboxes in the linked plan; do not link the same plan from
  several partially completed roadmap tracks.
- Use one human confirmation for the frozen mission. Review fixes within a
  confirmed PR unit do not need another confirmation. Material scope or design
  changes do.

## 1. Planning preflight

Before asking questions:

1. Read the repository instructions, `docs/current-data-contracts.md` when the
   goal changes persisted or shared data, `.agents/vendor/agent-workflow-kit/skills/roadmap/SKILL.md`,
   `.agents/vendor/agent-workflow-kit/skills/cc/SKILL.md`,
   `.agents/vendor/agent-workflow-kit/workflows/codex-collaboration-core.md`, and
   `.agents/vendor/agent-workflow-kit/skills/pall/SKILL.md`.
2. Resolve the repository root, current checkout, current SHA, worktree list,
   and `git status --short`.
3. Require native Codex collaboration tools. Do not substitute an external
   executor, another coordinator, or a plugin.
4. Fetch `origin/<profile-default-branch>` and record its exact SHA. Stop if it does not resolve.
5. Inspect `docs/roadmap/progress.md`, the relevant epic in
   `docs/roadmap/roadmap.md`, the relevant code, tests, history, and open PRs.
   Reuse an existing epic whenever one fits. If none fits, include the exact
   proposed epic in the synthesis; its confirmation is the explicit approval
   required by the roadmap workflow.
6. Require a clean worktree before execution, but allow planning from either a
   named feature branch or detached HEAD. Never stash, clean, reset, or absorb
   pre-existing work. Detached HEAD alone is not an execution blocker: after
   confirmation, the first unit creates its locked named feature branch from
   `origin/<profile-default-branch>`.

If live GitHub reads are unavailable, continue local inspection and label PR
state unverified, but do not begin execution until GitHub state and permissions
can be checked.

Planning preflight is read-only apart from fetching remote refs. It does not
authorize edits, tests, branch changes, agents, commits, pushes, PRs, or merges.

## 2. Compact mission intake

Inspect locally before asking anything. Ask only decisions that change scope,
PR boundaries, ordering, acceptance, rollout safety, or product behavior:

- Ask exactly one question per message.
- Include a recommended answer and a brief reason.
- Stop as soon as the mission is decision-complete.
- Ask at most eight questions. If material ambiguity remains, stop and
  recommend a narrower mission.
- Do not ask for repository facts that can be discovered.

Exclude deployment, release, production mutation, destructive migration, secret
rotation, and other separately approved operations from the mission. Record
them as follow-ups or stop if the goal cannot succeed without them.

## 3. Build the PR graph

Create two or more ordered implementation PR units. Prefer the smallest number
that preserves independent mergeability. Sequence even independent units so
only one worktree branch and one code-changing agent are active at a time.

Each implementation PR unit contains:

- `id`
- `title`
- `objective`
- `branch`
- `dependencies`
- `files`
- `acceptanceCriteria`
- `tasks`
- `finalTargetedVerificationCommands`
- `status`

Use branch names `codex/<mission-slug>-<two-digit-unit>` unless a repository
rule requires another feature-branch prefix. Lock every branch name in the
synthesis. `files` must contain exact paths or explicit directory prefixes.
Include the linked mission plan, `docs/roadmap/roadmap.md`, and
`docs/roadmap/progress.md` in each implementation unit's PR-level `files`
allowlist even though the root coordinator, not an implementation task, owns
those transitions.

Give each unit one to four ordered tasks. Each task uses the collaboration-core
contract:

- `id`
- `objective`
- `files`
- `dependencies`
- `acceptanceCriteria`
- `verificationCommand`
- `status`

Dependencies may point only to earlier tasks or earlier PR units. Every
verification command must be exact and scoped. If a PR needs more than four
natural tasks, split the PR. If the result is only one implementation PR,
recommend `$cc` and stop Multi-CC intake.

Add one final coordinator-owned `roadmap-closure` PR:

- branch `codex/<mission-slug>-close`;
- depends on every implementation PR;
- changes only the linked mission plan, `docs/roadmap/roadmap.md`, and generated
  `docs/roadmap/progress.md`;
- checks every implementation-PR checkbox, marks the single mission track
  `[x]` while retaining the last merged implementation PR number, regenerates
  progress, and runs `npm run roadmap:check`;
- is not itself added as another roadmap track or mission-plan checkbox;
- does not run through the collaboration core because it is root-owned roadmap
  bookkeeping, but does run through the same `$pall` review and merge gate.

Define `finalVerificationCommands` that prove the combined result on the
closure branch created from the latest `origin/<profile-default-branch>`. Do not rely only on the
per-PR checks.

## 4. Synthesis and one confirmation

Present one shared-understanding synthesis containing:

- mission goal and slug;
- locked decisions and explicit exclusions;
- roadmap epic and the single proposed mission track;
- linked plan path
  `docs/superpowers/plans/<YYYY-MM-DD>-<mission-slug>.md`;
- ordered implementation PR units with their branches, dependencies, file
  bounds, tasks, acceptance criteria, and checks;
- the roadmap-closure PR;
- final cross-PR verification commands;
- stop conditions and residual follow-ups.

Explain that the implementation PRs merge sequentially into `dev`, and that the
closure PR publishes completion after the final implementation PR is already
merged.

Ask the user to confirm the synthesis. That single explicit confirmation
authorizes the intended branch switches, mission/roadmap documentation, scoped
edits, agents, checks, commits, pushes, PR creation, review comments, safe
review fixes, and guarded merges for all frozen units. Do not add another
routine gate.

Any user-requested or discovered material change to goal, PR boundaries,
persisted contracts, external behavior, or acceptance requires a revised
synthesis and a new confirmation.

## 5. Persist the confirmed mission

After confirmation, sanitize the mission slug to `[a-z0-9-]` and write
`tmp/multi-cc/<mission-slug>.md` with:

- `missionVersion: 1`
- repository root
- exact goal, slug, decisions, exclusions, and roadmap linkage
- `base: origin/<profile-default-branch>` and confirmed `startingDevSHA`
- original checkout kind, ref, and SHA
- all PR units and task contracts
- `finalVerificationCommands`
- current unit and mission status
- for every unit: branch, PR URL/number, head SHA, approval SHA, merge SHA,
  verification results, review cycles, and status

Use unit statuses `planned`, `active`, `reviewing`, `merged`, or `blocked`.
Update the manifest immediately after every branch creation, task transition,
checkpoint, push, PR event, verification result, approval, merge, and roadmap
transition.

Create the linked mission plan on the first implementation branch after its
code tasks pass and before final review. Give it frontmatter containing only:

```yaml
---
mission: <mission-slug>
epic: E<NN>
---
```

Include the mission goal, locked decisions, final verification commands, and
one top-level unchecked checkbox per implementation PR. Keep task detail nested
or in prose so roadmap mission progress counts PRs rather than internal tasks.

On that same first PR, create or update the one roadmap track as `[>]`, link the
plan, and set `PR:#<first-pr>`. Regenerate `docs/roadmap/progress.md`. Later
implementation PRs check completed predecessor boxes and move the same track's
PR link to the current PR while keeping `[>]`.

## 6. Execute each implementation PR

For every implementation unit in order:

1. Confirm all dependency PRs are merged. Fetch `origin/<profile-default-branch>` and verify their
   merge commits are represented in the new base.
2. Require the current worktree to be clean. Create the locked feature branch
   from the exact latest `origin/<profile-default-branch>`. In a secondary worktree, never check out
   local `main` or `dev`.
3. Never overwrite, force-reset, or reuse an existing branch unless resuming the
   exact manifest unit and its local/remote/PR SHAs reconcile. Stop on a branch
   collision.
4. Create the unit's confirmed collaboration manifest at
   `tmp/codex-collaboration/<sanitized-branch>.md`. The mission confirmation is
   the unit's confirmation; do not repeat `/cc` grilling.
5. Pass the unit manifest to
   `.agents/vendor/agent-workflow-kit/workflows/codex-collaboration-core.md` beginning with its input
   contract and sequential native execution. The root owns repository state,
   checks, commits, pushes, PR changes, and user reporting.
6. At the core's roadmap preparation step:
   - on the first PR, create the mission plan and single `[>]` roadmap track;
   - on later PRs, mark already merged PR checkboxes complete and update that
     same track to the current PR number;
   - regenerate `docs/roadmap/progress.md` and commit the plan, roadmap source,
     and projection in the current PR.
7. Run the unit's final targeted commands, push the intended head, and invoke
   `$pall <PR>` as required by the collaboration core.
8. Let PALL own fresh exact-SHA adversarial review, full repository
   verification, approval, and expected-head guarded merge. Convert valid
   blockers into fresh scoped collaboration tasks as the core requires.
9. After GitHub confirms merge, record the merge SHA, fetch `origin/<profile-default-branch>`,
   verify the merged result is present, mark the unit `merged`, and continue
   without another user confirmation.

Never begin the next implementation unit while the current PR is open,
unapproved, unmerged, or not represented in `origin/<profile-default-branch>`.

## 7. Close the roadmap mission

After every implementation PR is merged:

1. Fetch the latest `origin/<profile-default-branch>`, require a clean worktree, and create the locked
   closure branch from that exact SHA.
2. Run every `finalVerificationCommand` against the combined implementation.
   Stop without marking the mission done if any command fails.
3. Check every implementation-PR box in the mission plan. Because `status` is
   omitted from frontmatter, the roadmap parser now infers `done`.
4. Mark the single roadmap track `[x]` and retain `PR:#<last-merged-
   implementation-pr>`. Do not point it at the still-open closure PR.
5. Regenerate `docs/roadmap/progress.md`, run `npm run roadmap:check`, and
   require clean output.
6. Commit only the mission plan, `docs/roadmap/roadmap.md`, and
   `docs/roadmap/progress.md`. Push, open the closure PR against `dev`, and run
   `$pall` through guarded merge.
7. Fetch `origin/<profile-default-branch>`, verify the closure merge is present, and mark the mission
   complete in the local manifest.

The closure PR receives the same exact-head review and merge protection as code
PRs even though it is documentation-only.

## 8. Resume

For `$multi-cc resume <mission-slug>`:

1. Load `tmp/multi-cc/<mission-slug>.md`.
2. Require `missionVersion: 1`, matching repository root, and a clean worktree.
3. Reconcile every recorded PR through live GitHub state and every SHA through
   Git. Advance status only from current evidence.
4. If a unit PR is open, switch to its exact branch only when the local,
   remote, and PR heads reconcile, then resume its collaboration/PALL stage.
5. If a unit is merged, verify it is in `origin/<profile-default-branch>` and continue to the next
   planned unit.
6. Stop on missing branches, divergent heads, closed-unmerged PRs, stale
   manifests, or scope drift. Never repair those states with destructive Git
   operations.

## 9. Stop conditions

Stop and preserve evidence for:

- dirty or wrong worktree state;
- a material mission or PR-boundary change;
- an unconfirmed new persisted contract or product decision;
- missing native implementation/review agents;
- branch, base, or SHA divergence;
- unresolved review blockers outside the confirmed unit;
- red verification that remains after one scoped continuation;
- permissions, merge conflicts, external approvals, deployment, release, or
  production operations.

Do not call the mission complete while a required PR is merely open, approved,
or locally committed.

## 10. Report

During execution, report each PR in one or two lines. At completion report:

- mission slug, roadmap epic/track, and linked plan;
- every implementation and closure PR URL;
- branch, final head, approval SHA, merge SHA, targeted checks, and review
  cycles for each PR;
- final cross-PR verification results;
- confirmation that the roadmap mission is done and the closure PR merged;
- excluded follow-ups and residual risk;
- the checkout left active, including any reason the original checkout could
  not be restored safely.

Restore the original checkout only when it still resolves and the worktree is
clean. Never force restoration or discard state.
