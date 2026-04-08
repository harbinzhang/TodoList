---
description: How to deploy the application to Firebase (hosting, functions, rules)
---

# Deploy to Firebase

## Prerequisites

- Firebase CLI installed and authenticated (`firebase login`)
- `.env.production` configured with real Firebase credentials
- `VITE_USE_EMULATORS=false` in `.env.production`
- `npm run verify:env:prod` passes

---

## Full Deploy (Hosting + Rules)

Deploys the built frontend and Firestore rules.

// turbo
1. Build the app:
```bash
npm run build
```

// turbo
2. Deploy everything:
```bash
firebase deploy
```

---

## Selective Deploy

Use these when you only changed one part of the system:

### Hosting Only (frontend changes)

// turbo
1. Build and deploy hosting:
```bash
npm run build:prod && firebase deploy --only hosting
```

### Firestore Rules Only

// turbo
1. Deploy security rules:
```bash
firebase deploy --only firestore:rules
```

### Functions Only (if Cloud Functions are added)

// turbo
1. Deploy functions:
```bash
firebase deploy --only functions
```

---

## Pre-Deploy Checklist

- [ ] `npm run lint` passes with no errors
- [ ] `npm run verify:env:prod` passes
- [ ] `npm run build` completes successfully
- [ ] `npm test -- --run` passes
- [ ] Verify `VITE_USE_EMULATORS=false` in production env
- [ ] No secrets or `.env` files committed

## Post-Deploy Verification

- [ ] Visit the live site and verify pages load
- [ ] Check Firebase Console → Hosting for the new deployment entry
- [ ] Test login, task creation, project/label CRUD

## Reference

| Item | Details |
|------|---------|
| Firebase project | `todo-rea` |
| Hosting public dir | `dist/` |
| Firestore rules | `firestore.rules` |
| Firebase config | `firebase.json` |
| Functions source | `functions/` (if needed) |
