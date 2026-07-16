---
name: monthly-report
description: Use when drafting, updating, or reviewing Perkmon monthly reports for board members, investors, advisors, community updates, product snapshots, operational summaries, or docs under docs/monthly-reports.
---

# Monthly Report

## Overview

Create evidence-backed monthly Perkmon report drafts that are useful outside the codebase. Match the report to the audience: board updates should translate execution into business progress, community updates should read like polished product notes, and operational reports should read like concise scorecards.

## Inputs

Before drafting, establish:

- Reporting month and exact date range.
- Audience and language. Use Chinese for Chinese prompts or community/forum updates; otherwise match the user's language. If the audience is board members, investors, or advisors, default to board-update framing.
- Destination. Monthly reports normally live in `docs/monthly-reports/YYYY-MM-<topic>.md`; update `docs/monthly-reports/README.md` when adding a committed report.
- Evidence sources. Use existing docs, git history, release notes, analytics/admin summaries, or approved read-only scripts. Do not invent metrics.

## Evidence Rules

- Default to read-only collection. Do not send, publish, deploy, update production data, or run broad test suites unless the user explicitly asks.
- Report aggregate metrics only. Do not expose user IDs, emails, raw user records, or other PII.
- Label uncertain numbers as approximate or missing, and state the source for important claims.
- For board updates, prioritize user, revenue, distribution, retention, product milestone, reliability, and risk metrics. If those are unavailable, say the KPI pull is missing instead of substituting engineering activity metrics.
- For monthly test coverage reports, use `test-coverage-report` first and adapt its scorecard output into the monthly report.
- For production health, monitoring, benefit drift, weekly offers, or deploy readiness sections, use the matching repo skill instead of reconstructing that workflow.

## Report Shapes

Choose one primary shape.

| Shape | Use For | Structure |
|---|---|---|
| Board update | Board members, investors, advisors, fundraising or strategic update packs | One-page executive summary, KPI snapshot, business/product wins, risks, next-month priorities, asks/decisions, optional technical appendix |
| Community update | Public/community progress notes, launch follow-ups, forum posts | Human title, thanks/context, key usage metrics, feedback loop, trust/privacy note when relevant, next-month focus, soft call for feedback |
| Product progress | Internal or semi-public monthly product snapshot | Summary, shipped improvements, usage/engagement, known gaps, next priorities |
| Operational scorecard | Testing, quality, monitoring, release-readiness, support | Generated date, snapshot table, area scorecard, strongest surfaces, gaps/risks, next best actions, commands/evidence |

## Board Update Rules

When the audience is board members, investors, or advisors:

- Lead with what changed in the business, not what changed in the code.
- Convert technical work into business capability: automation, data moat, retention, distribution, reliability, cost control, compliance, or speed of execution.
- Keep the main memo to one page or a short executive section. Move git activity, test internals, implementation names, commands, and detailed evidence into an appendix.
- Do not use commits, PR counts, test counts, or release counts as headline KPIs. They can support execution velocity only after user/business metrics.
- Use KPI placeholders when production data is not available: active users, cards added, benefits tracked, benefits redeemed, reminders sent/opened/clicked, extension installs, sync attempts/successes, AI conversations, card-update suggestions, revenue/subscription signals.
- End with concrete board-relevant asks or decisions: growth versus depth, extension rollout risk appetite, hiring/contractor needs, data/partnership priorities, or metrics instrumentation gaps.

## Writing Guidance

- Lead with what changed or what the month shows, not with process.
- Prefer a few meaningful metrics over a long metric dump.
- Explain why metrics matter in user terms: cards added, benefits tracked, reminders sent, issues resolved, tests covering user journeys.
- For board-member reports, use business language: milestone, adoption, retention, distribution, margin/cost, reliability, compliance, risk, and ask.
- Keep public community copy warm but concrete. Avoid overclaiming, hype, or internal implementation detail.
- Keep operational reports scannable with tables and priority-ranked gaps.
- End with practical next steps, not a generic conclusion.

## Quality Check

Before finishing:

- Confirm the month/date range is explicit.
- Confirm every important number has a source or is marked missing.
- Confirm the report does not contain PII, secrets, private tokens, or raw production records.
- Confirm the tone matches the destination: public/community, internal product, or operational.
- If a file was added under `docs/monthly-reports/`, confirm the README index was updated.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Inventing metrics to make the story complete | Leave placeholders or state what data is missing |
| Sending a board member an engineering changelog | Rewrite into business outcomes, risks, and decisions; move technical detail to appendix |
| Treating commit or PR counts as board KPIs | Use product/business metrics first; mention engineering velocity only as supporting context |
| Mixing public marketing copy with internal debugging detail | Split into public summary and internal notes, or choose one audience |
| Treating test file counts as confidence | Emphasize behavioral coverage and user journeys |
| Publishing or sending from the report task | Stop at draft/report unless the user separately approves publication |
