import { create } from 'zustand';

export interface UndoableAction {
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

const MAX_STACK_SIZE = 50;

interface UndoState {
  undoStack: UndoableAction[];
  redoStack: UndoableAction[];
  push: (action: UndoableAction) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useUndoStore = create<UndoState>((set, get) => ({
  undoStack: [],
  redoStack: [],

  push: (action) =>
    set((state) => ({
      undoStack: [...state.undoStack.slice(-MAX_STACK_SIZE + 1), action],
      redoStack: [],
    })),

  undo: async () => {
    const { undoStack, redoStack } = get();
    const action = undoStack[undoStack.length - 1];
    if (!action) return;
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, action],
    });
    await action.undo();
  },

  redo: async () => {
    const { undoStack, redoStack } = get();
    const action = redoStack[redoStack.length - 1];
    if (!action) return;
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, action],
    });
    await action.redo();
  },

  clear: () => set({ undoStack: [], redoStack: [] }),

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
}));
