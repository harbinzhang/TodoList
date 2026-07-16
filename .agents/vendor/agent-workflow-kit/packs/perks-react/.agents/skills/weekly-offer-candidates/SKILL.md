---
name: weekly-offer-candidates
description: Find and rank high-value weekly offer candidates for Perkmon consumer emails, offer roundups, and "offers to check this week" blocks. Use when the user asks for good offers, offer candidates, weekly offers, deal candidates, merchant offers, issuer offers, Paze-style promos, or a consumer handoff that is about actionable savings rather than card-benefit news.
---

# Weekly Offer Candidates

Use this skill to find offers that a Perkmon user has a real reason to check this week. This is not the same as benefit-news curation: select actionable savings, targeted issuer offers, merchant promos, expiring opportunities, and high-friction offer caveats.

## Safety

- Default to read-only research and report writing.
- Do not publish, send email, open PRs, trigger Scheduler jobs, deploy, or update production data unless the user explicitly asks.
- Treat community/blog/social posts as discovery and heat signals, not final truth.
- Do not call a promotion "confirmed" unless an issuer, network, wallet, merchant, or partner page confirms the offer terms.
- Label targeted offers as targeted. Never imply every user has an issuer offer just because some users saw it.
- Keep PII out of reports. Internal artifacts are aggregated; do not seek or expose user-level offer ownership.

## Inputs

Accept any of:

- "find offer candidates for this week"
- "do we have offers for the weekly email?"
- a merchant, wallet, issuer, or theme such as Paze, Amex Offers, Chase Offers, dining, travel, back-to-school, Prime Day
- a handoff request for `Offers to check this week`

If the user does not specify a date range, use the next 7 days plus offers with meaningful near-term deadlines.

## Workflow

1. Read recent local context before searching:
   - `/Users/haibinzhang/.codex/automations/weekly-card-benefit-news-candidates/memory.md`
   - `/Users/haibinzhang/.codex/automations/daily-card-benefit-update-intel-2/memory.md`
   - Any current handoff report under `/Users/haibinzhang/.codex/automations/weekly-card-benefit-news-candidates/reports/`
2. Check internal Perkmon offer signals when available:
   - Verify the production outbox read-only:
     ```bash
     cd functions && npx tsx ../exp/functions-scripts/verify-offer-outbox.ts --project=perks-react --bucket=perks-react-offer-outbox
     ```
   - Inspect the current snapshot read-only:
     ```bash
     gcloud storage cat gs://perks-react-offer-outbox/merchant-offers/manifests/latest.json
     gcloud storage cat gs://perks-react-offer-outbox/merchant-offers/snapshots/weekly/<version>/trending.json | jq '.trending[0:30]'
     gcloud storage cat gs://perks-react-offer-outbox/merchant-offers/snapshots/weekly/<version>/offers.json \
       | jq '[.offers[] | select(.userCountBucket=="5-9") | {merchant,details,expiresAt,issuers,categoryGroup,userCountBucket,sourceCountBucket}] | .[0:40]'
     ```
   - Use the outbox as a ranking signal only when it is accessible and current. Its entrypoint is `merchant-offers/manifests/latest.json`; source data is aggregated `userCustomCardBenefits` issuer offers, not user-level data.
   - Prefer offers with broad merchant recognition, high source count, clear expiry, clean terms, and obvious user value. Label these as internal/targeted unless public terms also confirm broad eligibility.
3. Scan external heat:
   - Deal/points sources: Doctor of Credit, Frequent Miler, The Points Guy, View from the Wing, One Mile at a Time.
   - Communities: Reddit r/CreditCards, r/ChaseSapphire, r/amex, r/churning, r/awardtravel, FlyerTalk when relevant.
   - Official/wallet/merchant pages: Paze, Chase Offers, Amex Offers terms surfaced to users, merchant promo pages, network offer pages.
   - Search terms: `<merchant> offer`, `<wallet> spend get`, `credit card offer expiring`, `Amex offer`, `Chase offer`, `Paze`, `merchant gift card warning`, `stack`, `statement credit`.
   - If broad Reddit search returns stale or irrelevant noise, switch to targeted subreddit scans and known thread reads instead of treating search rank as signal.
4. Verify only the strongest candidates against official or partner sources.
5. Score and select 3-5 candidates, with exactly 1-2 marked `重点推荐` when producing a weekly shortlist.
6. Write a concise report or handoff. If this is an automation run, append memory only to the relevant automation memory file; do not edit repository files for routine curation.

## What Makes A Good Offer

Score each candidate from 0-3 on these axes:

- **Real value:** clear dollar savings, high rebate rate, or unusually useful statement credit.
- **Reach:** broad enough for a meaningful user segment, or highly relevant to a valuable niche.
- **Timing:** expiring soon, newly launched, or tied to a current shopping/travel season.
- **Stackability:** can combine with issuer rewards, wallet promos, merchant sales, portal rewards, or card category bonuses.
- **Friction value:** users are likely to misunderstand eligibility, activation, merchant category, gift-card, checkout, renewal, or cap rules.
- **Perkmon fit:** Perkmon can help users remember, verify, track, or avoid a bad assumption.

Promote candidates with total score `>= 10`. Use judgment for a lower score only when the offer is unusually timely or strategically important.

## Candidate Classes

- **Confirmed broad offer:** official public terms exist and many users can check it. Best for lead items.
- **Targeted issuer offer:** valuable but account-specific. Use only with clear targeted language.
- **Wallet or network promo:** useful when checkout visibility and merchant eligibility are clear.
- **Stack/watch opportunity:** high upside but needs explicit caveats.
- **Terms mismatch/watch:** useful only when the user risk is concrete; do not call it a confirmed offer.

## Exclude

- Signup-bonus-only items unless they change durable card availability or a limited-time product decision.
- Generic portal-rate noise without unusual value or a strong card-benefit angle.
- Ordinary recurring credit reminders unless a new promo, deadline, or confusing term change creates fresh urgency.
- Offers with no verifiable terms, no clear user value, or only affiliate-card-ranking value.
- Pure benefit/product news. Route those to weekly card-benefit news curation instead.

## Output

Use Chinese when the user prompts in Chinese. Keep the structure compact:

```markdown
### 结论
- X 个 offer candidates；Y 个重点推荐。

### Offer Candidates
For each candidate:
- 推荐级别:
- status:
- offer:
- deadline:
- who should check:
- why users care:
- caveats:
- Perkmon implication:
- email copy guardrails:
- source URLs:

### 不采用 / 观察
- Excluded or watch-only items with the reason.

### 已检查来源
- Internal artifact status, external sources, official pages, and access failures.

### 建议动作
- 1-3 concrete next steps.
```

For a consumer-team handoff, include final ordering and short copy, and explicitly state that the report is not approval to send, publish, open a PR, or update production data.
