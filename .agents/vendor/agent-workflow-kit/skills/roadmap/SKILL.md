---
name: roadmap
description: Operate an in-repository epic roadmap under docs/roadmap, including current-state summaries, candidate triage, drift checks, idea capture, approved epic promotion, track updates, and plan-to-mission linkage.
---

# Roadmap

Use `docs/roadmap/roadmap.md` as the only hand-maintained epic source,
`docs/roadmap/progress.md` as its derived projection, and
`docs/roadmap/ideas.md` as the lightweight pool of unpromoted ideas. Plans may
opt into roadmap tracking with `mission`, `epic`, and optional `status`
frontmatter.

## Repository hooks

Read `.agents/repo-profile.yaml` first. Prefer `commands.roadmapStatus` to
regenerate the projection and `commands.roadmapCheck` to validate it. When
those keys are absent, use existing `roadmap:status` and `roadmap:check`
package scripts. If neither hook exists, perform the structural checks below
directly and state that generated progress could not be verified.

Do not initialize missing roadmap files unless the user explicitly asks to
create or adopt a roadmap.

## Intents

- **Show state:** summarize Now, Next, Blocked, and Recently shipped from
  `progress.md`; consult the matching epic for judgment questions.
- **Triage candidates:** treat notes, issues, PRs, branches, and keyword hits as
  leads. Verify current evidence, deduplicate by outcome, remove shipped or
  superseded work, and route multi-PR outcomes to an existing epic first.
- **Capture an idea:** add a title and one sentence to `ideas.md`; do not add
  priority scoring.
- **Promote an idea:** explain why no existing epic fits and obtain explicit
  approval before moving it into `roadmap.md`.
- **Update a track:** preserve its plan, PR, and evidence links; regenerate and
  validate the projection after editing.
- **Track a mission:** add `mission`, `epic`, and optional
  `planned | in-progress | done | blocked` status frontmatter to the plan.

## Structural contract

Epic headings use unique monotonic `E<NN>` identifiers. Required fields are
`status`, `goal`, and `next`. Status is one of
`planned | active | blocked | shipped | paused | dropped`; blocked epics also
state `blocked-by`, and shipped epics state `shipped`.

Track lines use:

```text
- [marker] title · driver · plan:<path|—> · PR:<#N|—> · evidence:<reference|—>
```

Markers are `[ ]` planned, `[>]` in progress, `[x]` done, `[~]` blocked, and
`[-]` dropped. Confirm referenced plans exist and that recorded PR state is
current before changing completion markers.

Never hand-edit `progress.md` when a generator exists. After an approved edit,
run the repository status hook, then the check hook, and stage only the roadmap
source, generated projection, idea file, and linked plan files intentionally
changed.

## Safety and report

This skill edits roadmap documentation only. Git and GitHub reads used to
verify candidates are read-only; deployments, releases, production mutations,
and code edits require separate authorization.

Report the action, evidence inspected, validation hook or manual checks used,
changed files, and any state that remains unverified.
