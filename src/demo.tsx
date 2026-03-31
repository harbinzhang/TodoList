import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { useMindmapStore } from './store/mindmapStore';
import { useTaskStore } from './store/taskStore';
import { useAuthStore } from './store/authStore';
import { itemService } from './services/itemService';
import MindmapCanvas from './components/mindmap/MindmapCanvas';
import type { Item, Mindmap } from './types';

// Monkey-patch the service to work on local store (no Firestore)
let nodeIdCounter = 100;

const originalCreate = itemService.create;
itemService.create = async (ctx, data) => {
  if (ctx !== 'mindmap') return originalCreate.call(itemService, ctx, data);
  const id = `node-${++nodeIdCounter}`;
  useMindmapStore.getState().addNode({
    ...data,
    id,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Item);
  return id;
};

const originalUpdate = itemService.update;
itemService.update = async (ctx, nodeId, updates) => {
  if (ctx !== 'mindmap') return originalUpdate.call(itemService, ctx, nodeId, updates);
  useMindmapStore.getState().updateNode(nodeId, updates);
};

const originalToggle = itemService.toggleCompletion;
itemService.toggleCompletion = async (ctx, nodeId, completed) => {
  if (ctx !== 'mindmap') return originalToggle.call(itemService, ctx, nodeId, completed);
  useMindmapStore.getState().updateNode(nodeId, { completed });
};

// Patch treeService for demo
import { treeService } from './services/treeService';
const originalDeleteNode = treeService.deleteNode;
treeService.deleteNode = async (nodeId, allNodes) => {
  void originalDeleteNode; // suppress unused warning
  const idsToDelete = new Set<string>([nodeId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of allNodes) {
      if (n.parentId && idsToDelete.has(n.parentId) && !idsToDelete.has(n.id)) {
        idsToDelete.add(n.id);
        changed = true;
      }
    }
  }
  const store = useMindmapStore.getState();
  const remaining = store.nodes.filter((n) => !idsToDelete.has(n.id));
  store.setNodes(remaining);
};

const MOCK_MINDMAP: Mindmap = {
  id: 'demo-mindmap-1',
  name: 'Project Roadmap',
  color: '#3b82f6',
  userId: 'demo-user',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_NODES: Item[] = [
  {
    id: 'root',
    mindmapId: 'demo-mindmap-1',
    userId: 'demo-user',
    parentId: null,
    sortOrder: 0,
    title: 'Project Roadmap',
    completed: false,
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'design',
    mindmapId: 'demo-mindmap-1',
    userId: 'demo-user',
    parentId: 'root',
    sortOrder: 0,
    title: 'Design Phase',
    completed: true,
    priority: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'design-wireframes',
    mindmapId: 'demo-mindmap-1',
    userId: 'demo-user',
    parentId: 'design',
    sortOrder: 0,
    title: 'Create wireframes',
    completed: true,
    priority: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'design-review',
    mindmapId: 'demo-mindmap-1',
    userId: 'demo-user',
    parentId: 'design',
    sortOrder: 1,
    title: 'Design review',
    completed: true,
    priority: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dev',
    mindmapId: 'demo-mindmap-1',
    userId: 'demo-user',
    parentId: 'root',
    sortOrder: 1,
    title: 'Development',
    completed: false,
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dev-frontend',
    mindmapId: 'demo-mindmap-1',
    userId: 'demo-user',
    parentId: 'dev',
    sortOrder: 0,
    title: 'Frontend implementation',
    completed: false,
    priority: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dev-backend',
    mindmapId: 'demo-mindmap-1',
    userId: 'demo-user',
    parentId: 'dev',
    sortOrder: 1,
    title: 'Backend API',
    completed: false,
    priority: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dev-testing',
    mindmapId: 'demo-mindmap-1',
    userId: 'demo-user',
    parentId: 'dev',
    sortOrder: 2,
    title: 'Write tests',
    completed: false,
    priority: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'launch',
    mindmapId: 'demo-mindmap-1',
    userId: 'demo-user',
    parentId: 'root',
    sortOrder: 2,
    title: 'Launch',
    completed: false,
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'launch-deploy',
    mindmapId: 'demo-mindmap-1',
    userId: 'demo-user',
    parentId: 'launch',
    sortOrder: 0,
    title: 'Deploy to production',
    completed: false,
    priority: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'launch-announce',
    mindmapId: 'demo-mindmap-1',
    userId: 'demo-user',
    parentId: 'launch',
    sortOrder: 1,
    title: 'Announce release',
    completed: false,
    priority: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function DemoApp() {
  const { setNodes, setCurrentMindmapId, setMindmaps } = useMindmapStore();
  const { setCurrentView } = useTaskStore();
  const { setUser } = useAuthStore();

  useEffect(() => {
    setUser({ uid: 'demo-user', email: 'demo@example.com', displayName: 'Demo User' });
    setMindmaps([MOCK_MINDMAP]);
    setCurrentMindmapId('demo-mindmap-1');
    setNodes(MOCK_NODES);
    setCurrentView('mindmap', 'demo-mindmap-1');
  }, [setUser, setNodes, setCurrentMindmapId, setMindmaps, setCurrentView]);

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex flex-col flex-1">
        <div className="p-6 border-b border-gray-200 bg-white">
          <h1 className="text-2xl font-bold text-gray-900">Project Roadmap</h1>
          <p className="text-sm text-gray-500 mt-1">Mindmap Demo — click nodes, use keyboard arrows, Space to check, Tab to add child, Enter to add sibling</p>
        </div>
        <MindmapCanvas />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoApp />
  </React.StrictMode>
);
