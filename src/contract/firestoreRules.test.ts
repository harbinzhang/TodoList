import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'todo-rea-rules',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('firestore rules', () => {
  it('allows owners to read their own task', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'tasks/task-1'), {
        title: 'Owned task',
        completed: false,
        priority: 4,
        labels: [],
        subtasks: [],
        userId: 'user-1',
      });
    });

    const ownerDb = testEnv.authenticatedContext('user-1').firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'tasks/task-1')));
  });

  it('denies reads for non-owners', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'tasks/task-2'), {
        title: 'Private task',
        completed: false,
        priority: 4,
        labels: [],
        subtasks: [],
        userId: 'user-1',
      });
    });

    const otherUserDb = testEnv.authenticatedContext('user-2').firestore();
    await assertFails(getDoc(doc(otherUserDb, 'tasks/task-2')));
  });
});
