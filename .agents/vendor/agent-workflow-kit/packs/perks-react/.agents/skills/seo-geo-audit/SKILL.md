---
name: seo-geo-audit
description: Audit the repository's website SEO and GEO readiness, including public indexable surfaces, metadata, crawlability, structured data, rendering strategy, and AI citation readiness.
---

# SEO/GEO Audit Skill

Canonical workflow doc: `.agents/workflows/seo-geo-audit.md`

Use this skill when the user asks to:

- audit website SEO
- improve search visibility
- review metadata, sitemap, robots, canonical tags, or structured data
- assess GEO (Generative Engine Optimization) or AI search readiness
- understand whether the app is indexable or citable by search engines and LLM-based answer engines

## Scope

This skill is for repository-level audit and implementation planning. It should answer:

- what public, indexable surfaces exist today
- what technical SEO foundations exist or are missing
- whether the rendering strategy limits crawlability
- whether public content is strong enough for GEO / AI citation
- what changes are highest leverage next

## Safety

- Distinguish clearly between:
  - current implementation found in the repo
  - inferred runtime behavior
  - proposed improvements
- Do not imply that auth-gated, admin-only, or client-only routes are meaningfully indexable unless the audit finds a public server-rendered or prerendered surface.
- Treat "GEO" as AI-answer-engine readiness, not geolocation, unless the user clearly means something else.
- Do not claim live-site indexing status, rankings, or crawler behavior from local code alone. If the user asks about the live deployed site, verify separately.
- Default to code and config evidence. Prefer file references over generic advice.

## Execution

1. Load `.agents/workflows/seo-geo-audit.md`.
2. Inventory public routes, auth-gated routes, and any likely indexable content surfaces.
3. Inspect metadata, canonical handling, social metadata, robots, sitemap, and structured data.
4. Inspect rendering and hosting strategy for crawlability risks:
   - SPA-only routing
   - SSR / SSG / prerender
   - route rewrites
   - JS-dependent redirects
5. Evaluate GEO readiness:
   - public answerable content
   - entity clarity
   - FAQ / glossary / comparison content
   - schema coverage
6. Report findings in priority order with concrete file references.
7. Finish with an implementation sequence, not just a problem list.

## Outputs

- Current-state SEO / GEO assessment
- High-priority findings with file references
- Public-surface and crawlability summary
- Recommended implementation order
