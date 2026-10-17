# Perks React Upstream And Consumer Broadcast Design

**Status:** Approved

**Source snapshot:** `git@github.com:harbinzhang/perks-react.git` branch `dev`, commit `821cf1076de2c933225dddf2924a80988d319ec4`

## Goal

Refresh Agent Workflow Kit from the latest committed `perks-react` agent
workflow tree, promote portable behavior into generic AWK skills, publish one
validated AWK commit, and broadcast that exact commit to every reachable
enabled consumer. Make the generic `roadmap` skill available to
`company-ops`.

## Source Isolation

Use the clean temporary checkout of `perks-react` commit `821cf107` as the
source. Do not edit the user's local `perks-react` checkout, which is behind
its remote and contains unrelated local changes.

Snapshot the complete source `.agents` tree and `.claude/commands` tree into
`packs/perks-react`. The pack is a faithful repo-specific reference and may
retain Perkmon product names, branches, commands, hosts, and operational
assumptions.

## Skill Classification

Classify all 56 source skills before changing generic AWK behavior.

### Generic promotion candidates

Promote portable behavior from:

- `roadmap`
- `cc`
- `crc`
- `mcc`
- `multi-cc`
- `pall`
- `firebase-functions-best-practices`
- `prepare-agent-handoff`
- `stale-client-handling`

Compare existing generic AWK overlaps and merge only reusable differences:

- `adversarial-review`
- `codex-relay`
- `cr`
- `feature`
- `pal`
- `pcl`
- `pr-adversarial-loop`
- `pr-coding-loop`
- `pr-retro-audit`
- `pr-review-loop`
- `prl`
- `re`
- `rebase`
- `reviewl`
- `test-quality-audit`

### Perks-react pack-only skills

Keep the following repo-specific behavior in the pack:

- `add-card`
- `android-release`
- `android-screenshots`
- `benefit-drift-audit`
- `chrome-extension-provider-replay`
- `chrome-extension-release`
- `deploy`
- `email-campaign-ops`
- `firestore`
- `generate-card-update-suggestion`
- `hotfix`
- `i18n-staging-sync`
- `ios-release`
- `local-emulator-admin-setup`
- `marketing-recordings`
- `monitor`
- `monthly-report`
- `native-staging-verification`
- `prod-deploy`
- `refactor-safety`
- `release`
- `seo-geo-audit`
- `ship`
- `shipc`
- `staging-diff-verification`
- `staging-qa`
- `staging-tracker-verification`
- `staging-user-journey-verification`
- `suggestion-approval-ops`
- `suggestion-approval-tracking-audit`
- `test-coverage-report`
- `weekly-offer-candidates`

## Generic Roadmap Contract

The generic `roadmap` skill uses these conventional files:

- `docs/roadmap/roadmap.md` as the hand-maintained source of truth
- `docs/roadmap/progress.md` as a derived summary
- `docs/roadmap/ideas.md` as the unpromoted idea pool

Repositories may provide `roadmap:status` and `roadmap:check` commands. The
skill uses them when configured or available and otherwise performs documented
structural checks directly. Generic instructions must not require Perkmon
branches, scripts, product terminology, or GitHub conventions.

The skill may initialize missing roadmap files only after an explicit user
request to create or adopt a roadmap. It does not create epics, change
priorities, or promote ideas without user approval.

## AWK Publication

Update canonical root skills, workflows, catalog entries, and thin adapters
only for portable behavior. Validate:

- root catalog integrity
- pack catalog integrity
- YAML syntax
- whitespace
- relevant Node tests when scripts change
- absence of Perkmon-specific strings in changed generic files

Commit only the intended AWK files and push `main`. Broadcast from the full
published commit SHA so every `VENDORED_FROM.json` has a real immutable source.

## Consumer Broadcast

Dry-run all enabled consumers first. For a consumer with tracked changes
outside the vendor directory, use direct vendor-only sync because the user
explicitly requested a broadcast; never stage or modify unrelated paths.

For missing registered checkout paths, report the consumer as blocked. Do not
invent replacement paths or silently remove registry entries.

Consumer commits and pushes are outside this request. Leave vendor updates
local and uncommitted.

## Company Ops Routing

After broadcasting the published AWK ref to `company-ops`, register the generic
`roadmap` skill in `.agents/catalog.yaml` and create or update
`.agents/repo-profile.yaml` with repository-local branch and verification
facts. Preserve the existing
`california-first-w2-employee-onboarding` repo-local skill and route it as an
override.

Do not initialize company roadmap content until the user separately asks to
create a roadmap.

## Verification

Confirm:

- the source temporary checkout remains clean at `821cf107`
- the user's local `perks-react` checkout is unchanged
- the refreshed pack records the clean temporary source commit
- generic files contain no Perkmon-specific assumptions
- AWK tests and validation pass
- AWK `main` and `origin/main` point to the published commit
- every successfully synced consumer metadata file points to that commit
- `company-ops` catalog resolves both the local onboarding skill and vendored
  `roadmap` skill
- unrelated consumer changes remain unstaged and unmodified
