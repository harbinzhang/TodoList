---
name: pr-retro-audit
description: Audit recent, open, merged, or closed GitHub pull requests for missed critical issues, review-comment quality, stale approvals, unresolved gaps, and risky post-merge follow-up needs. Use when the user asks to review recent PRs including closed/merged PRs, evaluate whether comments caught critical issues, score PR review quality, find gaps after merge, or comment retroactive findings back on PRs.
---

# PR Retro Audit

## Overview

Use this skill for retrospective PR audits. It is not a merge gate and must not post `GOOD_TO_GO`, approvals, or request-changes reviews. It can post normal PR conversation comments, including on merged or closed PRs, only when the user explicitly asks for PR comments.

## Scope

- If the user names PR numbers or URLs, audit exactly those PRs.
- If the user asks for "recent PRs" without a count, default to the 10 most recently updated PRs across `open`, `merged`, and `closed`.
- If the user asks for "even closed" or "merged/closed", include closed PRs through `gh pr list --state all`.
- If the user asks for comment-quality review, inspect top-level issue comments, formal review submissions, inline review comments, and GraphQL review threads.
- If the user asks to comment on PRs, comment only on PRs where the audit found a material issue, misleading review state, or explicit quality note worth preserving, unless the user asks to comment on every audited PR.

## Workflow

1. Resolve repository and PR scope.
   - Prefer the current local Git remote when the user does not name a repo.
   - Confirm `gh auth status` when using `gh`.
   - Use connector tools when available for structured PR metadata; use `gh` for gaps, closed PRs, diffs, and GraphQL review-thread state.

2. Gather evidence for each PR.
   - PR metadata: number, title, state, base, head SHA, merge commit, author, created/updated/merged/closed dates.
   - Diff/files: `gh pr diff <n>` or `gh api repos/<owner>/<repo>/pulls/<n>/files --paginate`.
   - Comments: `issues/<n>/comments`, `pulls/<n>/reviews`, `pulls/<n>/comments`, and GraphQL `reviewThreads`.
   - Existing markers: `AGENT-REVIEW:*`, `AGENT-CODING:*`, `GOOD_TO_GO`, `HUMAN_SUMMARY`, and any explicit blocker comments.
   - Checks/mergeability only as context. For closed PRs, do not treat old missing checks as current proof of failure.

3. Risk-rank PRs before deep review.
   - High risk: Cloud Functions, Firestore rules/indexes, contracts/runtime schemas, auth/security/privacy, user-data writes, migrations, tracking, extension background/provider sync, release/deploy paths, payment/billing, data deletion, generated vendor artifacts, and broad cross-surface refactors.
   - Medium risk: shared UI components, routing, i18n with runtime interpolation, admin review flows, tests that encode contracts, docs/specs that future agents will follow.
   - Low risk: isolated copy changes, doc-only updates not used as implementation guidance, small tests with no runtime path.

4. Evaluate review-comment quality.
   - Treat role markers as semantic roles; do not assume GitHub author login proves independence.
   - Good comments bind to a PR head or merge commit, cite exact file/line or thread, describe user/data/security impact, explain the failure mode, and state a concrete expected correction.
   - Weak comments are generic, only summarize the diff, rely on stale local state, miss the data path, fail to distinguish current-head vs outdated threads, or give `GOOD_TO_GO` without a current-head summary.
   - Mark false positives explicitly when later evidence proves the comment was stale or wrong.

5. Evaluate whether critical issues were caught.
   - Classify each material risk as `caught`, `partially caught`, `missed`, `false positive`, or `not material`.
   - A critical issue is a plausible production-impacting gap: data corruption/loss, privacy leak, auth/permission bypass, irreversible migration error, stale cloud/local projection, incorrect financial/reward accounting, provider account misattribution, production deploy breakage, or a merge conflict that invalidates approval.
   - For closed/merged PRs, distinguish "missed at review time" from "later fixed elsewhere"; verify with the PR diff and, when cheap, the current file state.

6. Report in Chinese unless the user asks otherwise.
   - Lead with verdict and score.
   - Include audited PR list and state.
   - Separate critical findings from review-quality observations.
   - Note evidence limits, such as API timeouts, unavailable diffs, or not running tests.

## Commenting On PRs

Commenting is allowed on merged or closed PRs when the user explicitly requests it. Before posting, re-check existing comments to avoid duplicates.

Use top-level PR conversation comments, not approvals or request-changes reviews. Never post `AGENT-REVIEW: GOOD_TO_GO` from this skill.

Use these markers:

- `AGENT-RETRO-AUDIT: FINDING` for a likely missed critical or important gap.
- `AGENT-RETRO-AUDIT: QUALITY` for review-process quality findings without a product bug.
- `AGENT-RETRO-AUDIT: NOTE` for lower-risk clarification the user explicitly wants preserved.

Comment format:

```text
AGENT-RETRO-AUDIT: FINDING

Audited PR: #<number>
Audited refs: head <sha>, merge commit <sha-or-none>
Severity: P0|P1|P2|P3
Status: missed | partially caught | stale-review-risk | follow-up-needed

<Concise finding with file/path evidence, why the original review missed or only partially covered it, and what follow-up should happen.>
```

If the PR is already merged or closed, phrase the ask as follow-up triage, not a merge blocker. Do not imply the PR can still be blocked.

## Stop Conditions

- Stop and ask only if the repo cannot be resolved, GitHub auth is unavailable, or commenting was requested but write permission is missing.
- Do not edit implementation files.
- Do not merge, reopen, close, or modify PR state.
- Do not run expensive test suites unless the user separately asks for verification beyond the retro audit.
