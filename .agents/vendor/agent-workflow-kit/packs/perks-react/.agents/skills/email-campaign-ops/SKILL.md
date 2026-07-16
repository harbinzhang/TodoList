---
name: email-campaign-ops
description: "Prepare and operate Perkmon email campaigns: create or update Firestore campaign drafts, adapt email templates, send admin test emails, filter unsubscribe requests, preview audience, and send only after explicit approval."
---

# Email Campaign Ops

Use this skill when preparing a one-off Perkmon email campaign, especially when the user wants to create a draft, adapt template copy, test-send, exclude unsubscribes, preview audience, or send the final campaign.

## Safety

- Use the `firestore` skill rules for any production Firestore read/write.
- Default to dry-run/read-only. Write only with an explicit `--fix`, `--send`, or user instruction.
- Unified campaign draft scripts only create or update `unifiedEmailCampaigns` drafts. They must not final-send.
- For unified campaigns, use the admin page/callables for preview, test email, and send only after the deployed renderer/send path is current.
- Before unified final send, verify campaign status, recipient count, unsubscribe exclusions, delivery claims/log expectations, and `config/unifiedEmailCampaign.sendEnabled`.
- Never include raw audience exports in final chat unless the user asked for the list.

## Current Campaign Surfaces

The current scripted path for the June 2026 Amex Platinum last-call campaign is the unified email campaign model. Legacy benefit reminder campaign scripts remain available for historical benefit-reminder operations, but new ops should prefer `unifiedEmailCampaigns` unless the user explicitly asks for the legacy campaign family.

- Unified campaign draft script: `exp/functions-scripts/create-amex-platinum-unified-email-campaign.ts`
- Unified campaign renderer: `functions/src/unifiedEmailCampaign/template.ts`
- Unified audience/send path: `functions/src/unifiedEmailCampaign/recipients.ts`, `functions/src/unifiedEmailCampaign/sendUnifiedEmailCampaign.ts`
- Admin UI/API test email path: `src/features/admin/pages/UnifiedEmailCampaignPage.tsx`, `src/api/unifiedEmailCampaign.ts`
- Batch unsubscribe script: `exp/functions-scripts/mark-email-unsubscribed.ts`
- Weekly-picks layout: `functions/src/templates/combinedWeeklyDigestTemplate.ts`
- Email compliance footer: `functions/src/templates/emailCompliance.ts`
- Legacy benefit-reminder draft script: `exp/functions-scripts/create-amex-platinum-june-benefit-campaign.ts`
- Legacy benefit-reminder test/send scripts: `exp/functions-scripts/send-amex-platinum-june-benefit-campaign-test.ts`, `exp/functions-scripts/preview-amex-platinum-june-benefit-campaign-audience.ts`

## Draft Workflow

1. Confirm the campaign goal: campaign family, target audience, content blocks, deadline, source URLs, subject/title, CTA target, and environment.
2. Research any external news URL with `agent-reach` or primary/public sources when facts may be stale.
3. Create or update the campaign draft with dry-run first:

```bash
cd functions
node --import tsx ../exp/functions-scripts/create-amex-platinum-unified-email-campaign.ts --project perkly-staging-7dab8
node --import tsx ../exp/functions-scripts/create-amex-platinum-unified-email-campaign.ts --project perkly-staging-7dab8 --fix
```

4. Production unified campaign writes require explicit production approval and `--allow-prod`:

```bash
cd functions
node --import tsx ../exp/functions-scripts/create-amex-platinum-unified-email-campaign.ts --project perks-react --allow-prod
node --import tsx ../exp/functions-scripts/create-amex-platinum-unified-email-campaign.ts --project perks-react --allow-prod --fix
```

5. Use the admin UI/callable for unified campaign preview and test email. Do not send the final audience from a local draft script.
6. Update renderer tests with the exact user-visible copy, CTA labels, URLs, price rows, deadlines, and excluded sections.
7. Run focused tests:

```bash
cd functions
node --test --import tsx src/unifiedEmailCampaign/*.test.ts
```

## Unified Preview, Test, And Send

For unified campaigns, preview, test email, and final send go through the admin page/callables once deployed:

- Collection: `unifiedEmailCampaigns`
- Draft script only: `exp/functions-scripts/create-amex-platinum-unified-email-campaign.ts`
- Preview/test/send callable path: `functions/src/unifiedEmailCampaign/sendUnifiedEmailCampaign.ts`
- Admin page/API path: `src/features/admin/pages/UnifiedEmailCampaignPage.tsx`, `src/api/unifiedEmailCampaign.ts`
- Final send requires explicit user approval, `status: approved`, and `config/unifiedEmailCampaign.sendEnabled: true`.
- Do not use legacy benefit-reminder local send scripts for unified campaigns.

Required pre-send checks:

- Campaign exists in `unifiedEmailCampaigns/{campaignId}`
- `status` is `approved`
- `config/unifiedEmailCampaign.sendEnabled` is `true`
- Preview/test email has been reviewed from the deployed unified renderer
- Recipient counts and unsubscribe exclusions match expectations
- Existing delivery claims/logs are understood before send
- User explicitly asked to send

## Unsubscribe Filtering

If the user provides unsubscribe-request emails, apply the shared email opt-out rather than only a campaign-local skip, unless they explicitly ask for campaign-only suppression.

```bash
cd functions
node --import tsx ../exp/functions-scripts/mark-email-unsubscribed.ts --project perks-react --emails email1@example.com,email2@example.com
node --import tsx ../exp/functions-scripts/mark-email-unsubscribed.ts --project perks-react --emails email1@example.com,email2@example.com --fix
```

Report matched users, updated users, and audit writes. Validate that the target list no longer appears in campaign audience.

## Legacy Benefit-Reminder Scripts

These scripts are for the old `benefitReminderCampaigns` flow only. Do not use them for unified campaigns.

Legacy local test email:

```bash
cd functions
node --import tsx ../exp/functions-scripts/send-amex-platinum-june-benefit-campaign-test.ts --project perks-react --to admin@example.com
node --import tsx ../exp/functions-scripts/send-amex-platinum-june-benefit-campaign-test.ts --project perks-react --to admin@example.com --send
```

Legacy audience preview:

```bash
cd functions
node --import tsx ../exp/functions-scripts/preview-amex-platinum-june-benefit-campaign-audience.ts --project perks-react --emails excluded1@example.com,excluded2@example.com
```

Legacy final send:

```bash
cd functions
node --import tsx ../exp/functions-scripts/preview-amex-platinum-june-benefit-campaign-audience.ts --project perks-react --emails excluded1@example.com,excluded2@example.com --send
```

For legacy sends only, rerun the dry-run after send and report:

- final campaign status
- sent count
- `reminderOutbox` evidence count
- `recipientsToSend`
- excluded list remaining in audience

## Example: June 2026 Oura Benefit Campaign

The June 2026 Oura campaign replaced the original simple benefit-list email with a weekly-picks style email:

- News first, using a Perkmon blog link.
- `Read more` CTA for news.
- A price table inside the news item with sale, regular, and discount columns.
- A single benefits CTA to `/benefits-tracker`.
- `Use Perkmon anywhere` footer hidden for this campaign only.
- Batch unsubscribe handling before final send.
- Direct local send path used because the latest template was not deployed.
