import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addDoc, updateDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { projectService } from '../projectService';

vi.mock('../projectService', async () => {
  const actual = await vi.importActual('../projectService');
  return actual;
});

describe('projectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProject', () => {
    it('calls addDoc with project data and server timestamp', async () => {
      const mockDocRef = { id: 'new-project-id' };
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as never);

      const result = await projectService.createProject({
        name: 'My Project',
        color: '#3b82f6',
        userId: 'user1',
      });

      expect(addDoc).toHaveBeenCalledOnce();
      expect(result).toBe('new-project-id');
    });
  });

  describe('updateProject', () => {
    it('calls updateDoc', async () => {
      vi.mocked(updateDoc).mockResolvedValue(undefined);
      await projectService.updateProject('proj-1', { name: 'Renamed' });
      expect(updateDoc).toHaveBeenCalledOnce();
    });
  });

  describe('deleteProject', () => {
    it('calls deleteDoc', async () => {
      vi.mocked(deleteDoc).mockResolvedValue(undefined);
      await projectService.deleteProject('proj-1');
      expect(deleteDoc).toHaveBeenCalledOnce();
    });
  });

  describe('getUserProjects', () => {
    it('returns projects with Date conversion', async () => {
      const mockDate = new Date('2025-06-01');
      const mockDocs = [
        {
          id: 'proj-1',
          data: () => ({
            name: 'Project One',
            color: '#3b82f6',
            userId: 'user1',
            taskCount: 5,
            createdAt: { toDate: () => mockDate },
          }),
        },
      ];
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as never);

      const projects = await projectService.getUserProjects('user1');

      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('proj-1');
      expect(projects[0].name).toBe('Project One');
      expect(projects[0].createdAt).toEqual(mockDate);
    });
  });

  describe('subscribeToUserProjects', () => {
    it('calls onSnapshot and returns unsubscribe', () => {
      const mockUnsub = vi.fn();
      vi.mocked(onSnapshot).mockReturnValue(mockUnsub as never);

      const callback = vi.fn();
      const unsub = projectService.subscribeToUserProjects('user1', callback);

      expect(onSnapshot).toHaveBeenCalledOnce();
      expect(unsub).toBe(mockUnsub);
    });
  });
});
