---
description: Run bundle budget check and analyze any violations. Required after dep changes, new routes, Vite config changes, PWA config changes, or large feature additions.
---

Run `npm run bundle:check` from the project root (this runs build:prod + bundle audit).

## If it PASSES
Report the key chunk sizes from the audit output. Note if any chunks are close to the budget limit (within 10%).

## If it FAILS
1. Show which specific chunks exceeded their budget and by how much
2. Suggest running `npm run build:analyze` to open the visual bundle analyzer at `dist/bundle-analysis.html`
3. Diagnose the likely cause by checking what changed:
   - New dependency? Check if it has a lighter alternative or can be tree-shaken
   - New route? Verify it uses `React.lazy()` + `Suspense` for code splitting
   - New icon set import? Should use individual icon imports, not barrel imports
   - New PWA asset? Check `vite.config.ts` precache manifest
4. Show the specific import that's likely the culprit if identifiable from the build output

## Common Fixes
- Replace `import * from 'lucide-react'` with individual icon imports
- Add `React.lazy(() => import('./FeaturePage'))` for heavy route components
- Move large data files (card products, etc.) to dynamic imports
- Check `rollupOptions.output.manualChunks` in `vite.config.ts` for splitting opportunities
