---
description: Audit workflow for repository-level SEO and GEO readiness across public surfaces, metadata, crawlability, rendering, structured data, and AI citation readiness
---

# SEO/GEO Audit Workflow

Use this workflow when the user wants a current-state SEO review, a GEO readiness assessment, or a concrete implementation plan for search and AI-answer-engine visibility.

## Definitions

- **SEO**: traditional search-engine discoverability, crawlability, indexing, and snippet quality
- **GEO**: Generative Engine Optimization, meaning how well the public site can be understood, cited, and reused by AI answer engines and LLM-powered search products

Treat GEO as adjacent to SEO, not a replacement for it.

## Audit Goals

Answer these questions in order:

1. What public content can a crawler actually discover today?
2. What technical SEO foundations exist or are missing?
3. Does the rendering strategy prevent reliable indexing?
4. Is there enough public, structured, citable content for GEO?
5. What is the shortest high-leverage implementation path?

## Inputs To Inspect

Start with the smallest set of files that can answer the question. Typical entry points:

- `index.html`
- `package.json`
- `vite.config.*`
- `firebase.json`
- `public/**`
- `src/main.*`
- `src/app/**`
- route definitions
- any files mentioning:
  - `Helmet`
  - `document.title`
  - `meta`
  - `canonical`
  - `og:`
  - `twitter:`
  - `robots`
  - `sitemap`
  - `application/ld+json`
  - `schema.org`
  - `prerender`
  - `ssr`
  - `ssg`

## Required Audit Sequence

### 1. Inventory public surfaces

Separate routes into:

- public and potentially indexable
- public but utility-only
- auth-gated or private
- admin-only

Public utility pages include examples such as:

- login
- referral redirects
- legal pages
- confirmation or verification pages

Call out when the repo has almost no meaningful public content surface. That is often the primary blocker and should not be buried under metadata details.

### 2. Check rendering and crawlability

Determine whether the site is:

- CSR-only SPA
- partially prerendered
- SSG
- SSR

Inspect:

- frontend router mode
- hosting rewrites
- JS-driven redirects
- whether route content exists in initial HTML or only after hydration

Risks to call out:

- all routes rewritten to a single HTML shell
- route content only appears after client-side JS
- public entry pages immediately redirect before exposing meaningful content
- no stable HTML content for non-JS or low-JS crawlers

### 3. Check metadata foundations

Verify whether the repo has:

- route-specific `<title>`
- route-specific `meta description`
- canonical URLs
- Open Graph tags
- Twitter card tags
- `meta robots` or route-level noindex decisions where appropriate
- app/site name consistency

Separate:

- global defaults
- route-level overrides

If only a single static `index.html` title/description exists, call that out directly.

### 4. Check crawl directives and discovery

Verify whether the repo provides:

- `robots.txt`
- `sitemap.xml`
- canonical host assumptions
- clean handling of duplicate or redirected routes

Flag when these are missing from `public/` or generated build output.

### 5. Check structured data

Look for JSON-LD or other schema usage such as:

- `Organization`
- `WebSite`
- `SoftwareApplication`
- `FAQPage`
- `Article`
- `BreadcrumbList`
- `Product`

If none exists, state that clearly. Do not over-prescribe schema that has no matching public page type.

### 6. Check content and GEO readiness

Evaluate whether the public site exposes content that answer engines can cite:

- clear product/entity description
- feature explanations
- comparison pages
- glossary or definitions
- FAQ content
- documentation or how-to pages
- author/source signals

Common GEO blockers:

- all valuable content hidden behind auth
- thin public pages
- public pages are redirects or legal-only
- no stable answer-oriented sections
- no structured data
- no canonical public URLs for core entities

### 7. Recommend by leverage

End with an implementation order. Use this priority model unless the repo clearly warrants a different order:

1. Public indexable surface strategy
2. Metadata and canonical basics
3. `robots.txt` and `sitemap.xml`
4. Route-level noindex/index policy
5. Structured data for real public pages
6. Prerender / SSR / SSG only where it unlocks meaningful public pages
7. GEO-oriented content expansion

Do not recommend expensive SSR work before confirming there are public pages worth indexing.

## Severity Guidance

Use practical severity, not theoretical severity.

- **High**:
  - no meaningful public content surface
  - all public pages depend on client JS with no prerender or SSR
  - no route-level metadata on public pages
  - missing robots/sitemap on a site expected to be indexed
- **Medium**:
  - missing canonical tags
  - missing OG/Twitter cards
  - missing structured data for established public pages
  - duplicate path patterns without canonical handling
- **Low**:
  - copy quality improvements
  - incremental schema refinements
  - social preview polish when fundamentals are still missing

## Output Format

Use this structure unless the user asks for a different format:

```md
## Verdict

Short summary of current SEO and GEO readiness.

## Findings

1. [Severity] ...
2. [Severity] ...
3. [Severity] ...

## Public Surface

- ...

## What Exists

- ...

## What Is Missing

- ...

## Recommended Order

1. ...
2. ...
3. ...
```

When helpful, include file references inline. Keep the report repo-specific and concrete.

## Rules

- Do not confuse app-store metadata with website SEO metadata.
- Do not assume a route is useful for SEO just because it is public.
- Do not bury the product-level blocker if there is no public content strategy.
- Prefer implementation order over exhaustive checklists.
- If the user asks for code changes after the audit, turn the top recommendations into the smallest viable implementation slice first.
