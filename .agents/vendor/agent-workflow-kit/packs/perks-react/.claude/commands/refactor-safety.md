---
name: refactor-safety
description: Prove an N/M-series consolidation refactor is behavior-preserving before merge.
---

Run the refactor-safety gate for a consolidation refactor.

Canonical procedure: `.agents/skills/refactor-safety/SKILL.md`. Follow it exactly —
populate `refactor-manifest.json`, run `npm run refactor:safety`, then complete the
behavior-preservation proof and semantic checklist against the PR diff.
