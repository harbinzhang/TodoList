# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint (flat config, TS/TSX only)
npm run preview      # Preview production build

# Testing (Vitest + jsdom + React Testing Library)
npm test             # Run tests in watch mode
npx vitest run       # Run all tests once
npx vitest run src/components/tasks/__tests__/TaskItem.test.tsx  # Single test file
npm run test:coverage  # Coverage report

# Firebase Cloud Functions (separate project in functions/)
cd functions && npm run build    # Compile functions
cd functions && npm run serve    # Build + start emulators
firebase deploy --only hosting   # Deploy frontend
firebase deploy                  # Deploy everything
```

## Architecture

**React + TypeScript + Vite** frontend with **Firebase** backend (Firestore, Auth, Hosting).

### State Management
- **Zustand** stores (not Redux/Context): `authStore` for auth state, `taskStore` for tasks/projects/labels/views/filters
- Stores are plain — no middleware, no persistence. Firestore real-time subscriptions populate them via `onSnapshot` callbacks wired in `App.tsx`

### Data Flow
`App.tsx` listens to `onAuthStateChanged` → on login, subscribes to three Firestore collections (`tasks`, `projects`, `labels`) → callbacks push data into `taskStore` → components read from store. Writes go through service layer → Firestore → subscription fires → store updates.

### Service Layer
`src/services/` contains Firestore CRUD for each entity. Services use `serverTimestamp()` for created/updated fields and convert Firestore Timestamps to JS Dates on read. Each service exposes a `subscribeTo*` method returning an unsubscribe function.

### View System
`ViewType` = `'inbox' | 'today' | 'upcoming' | 'project' | 'label'`. `Sidebar` sets the view via `taskStore.setCurrentView()`, `MainContent` reads it and filters tasks accordingly.

### Testing
- All Firebase modules are globally mocked in `src/test/setup.ts` (firebase/app, firebase/auth, firebase/firestore)
- Tests use `@testing-library/react` + `vitest` with `jsdom` environment
- Test files live alongside source in `__tests__/` directories

### Firebase Config
- Environment variables prefixed with `VITE_FIREBASE_*` (see `.env.example`)
- Cloud Functions in `functions/` — separate TypeScript project with its own `package.json` (Node 22)
- Firestore security rules in `firestore.rules`
