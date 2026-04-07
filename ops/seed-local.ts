import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, WriteBatch } from 'firebase-admin/firestore';

const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'todo-rea';
const shouldWrite = process.argv.includes('--fix');

const seedUser = {
  uid: 'seed-user-1',
  email: 'local@example.com',
  password: 'password123',
  displayName: 'Local User',
};

const seedDocuments = [
  {
    path: 'projects/local-project',
    data: {
      name: 'Local Project',
      color: '#3b82f6',
      userId: seedUser.uid,
      taskCount: 2,
      createdAt: Timestamp.fromDate(new Date('2026-01-01T09:00:00Z')),
    },
  },
  {
    path: 'labels/local-home',
    data: {
      name: 'Home',
      color: '#10b981',
      userId: seedUser.uid,
    },
  },
  {
    path: 'labels/local-work',
    data: {
      name: 'Work',
      color: '#f59e0b',
      userId: seedUser.uid,
    },
  },
  {
    path: 'tasks/local-task-1',
    data: {
      title: 'Review Firebase guide rollout',
      description: 'Confirm env and emulator defaults locally',
      completed: false,
      priority: 2,
      userId: seedUser.uid,
      projectId: 'local-project',
      labels: ['local-work'],
      subtasks: [],
      createdAt: Timestamp.fromDate(new Date('2026-01-02T09:00:00Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-01-02T09:00:00Z')),
      dueDate: Timestamp.fromDate(new Date('2026-04-08T08:00:00Z')),
    },
  },
  {
    path: 'tasks/local-task-2',
    data: {
      title: 'Buy groceries',
      completed: true,
      priority: 4,
      userId: seedUser.uid,
      labels: ['local-home'],
      subtasks: [],
      createdAt: Timestamp.fromDate(new Date('2026-01-03T09:00:00Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-01-03T09:00:00Z')),
      completedAt: Timestamp.fromDate(new Date('2026-04-06T18:00:00Z')),
    },
  },
];

function initAdmin(projectId: string) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';

  if (!getApps().length) {
    initializeApp({
      projectId,
    });
  }
}

async function ensureUser() {
  const auth = getAuth();

  try {
    await auth.getUser(seedUser.uid);
  } catch {
    await auth.createUser(seedUser);
  }
}

async function writeInChunks() {
  const db = getFirestore();
  const batchSize = 20;

  for (let index = 0; index < seedDocuments.length; index += batchSize) {
    const chunk = seedDocuments.slice(index, index + batchSize);
    const batch: WriteBatch = db.batch();

    for (const doc of chunk) {
      batch.set(db.doc(doc.path), doc.data, { merge: false });
    }

    await batch.commit();
  }
}

async function main() {
  console.info(`[seed-local] project=${DEFAULT_PROJECT_ID}`);
  console.info(`[seed-local] mode=${shouldWrite ? 'apply' : 'dry-run'}`);
  console.info(`[seed-local] docs=${seedDocuments.length}`);
  console.info(`[seed-local] user=${seedUser.email}`);

  if (!shouldWrite) {
    console.info('[seed-local] Dry run only. Re-run with --fix to write emulator data.');
    return;
  }

  initAdmin(DEFAULT_PROJECT_ID);
  await ensureUser();
  await writeInChunks();
  console.info('[seed-local] Local emulator data applied.');
}

main().catch((error) => {
  console.error('[seed-local] Failed to seed local data.');
  console.error(error);
  process.exitCode = 1;
});
