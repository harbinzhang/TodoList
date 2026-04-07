import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addDoc, updateDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { labelService } from '../labelService';

vi.mock('../labelService', async () => {
  const actual = await vi.importActual('../labelService');
  return actual;
});

describe('labelService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLabel', () => {
    it('calls addDoc with label data', async () => {
      const mockDocRef = { id: 'new-label-id' };
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as never);

      const result = await labelService.createLabel({
        name: 'urgent',
        color: '#ef4444',
        userId: 'user1',
      });

      expect(addDoc).toHaveBeenCalledOnce();
      expect(result).toBe('new-label-id');
    });
  });

  describe('updateLabel', () => {
    it('calls updateDoc', async () => {
      vi.mocked(updateDoc).mockResolvedValue(undefined);
      await labelService.updateLabel('lbl-1', { name: 'renamed' });
      expect(updateDoc).toHaveBeenCalledOnce();
    });
  });

  describe('deleteLabel', () => {
    it('calls deleteDoc', async () => {
      vi.mocked(deleteDoc).mockResolvedValue(undefined);
      await labelService.deleteLabel('lbl-1');
      expect(deleteDoc).toHaveBeenCalledOnce();
    });
  });

  describe('getUserLabels', () => {
    it('returns labels from Firestore', async () => {
      const mockDocs = [
        {
          id: 'lbl-1',
          data: () => ({
            name: 'work',
            color: '#3b82f6',
            userId: 'user1',
          }),
        },
      ];
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as never);

      const labels = await labelService.getUserLabels('user1');

      expect(labels).toHaveLength(1);
      expect(labels[0].id).toBe('lbl-1');
      expect(labels[0].name).toBe('work');
    });
  });

  describe('subscribeToUserLabels', () => {
    it('calls onSnapshot and returns unsubscribe', () => {
      const mockUnsub = vi.fn();
      vi.mocked(onSnapshot).mockReturnValue(mockUnsub as never);

      const callback = vi.fn();
      const unsub = labelService.subscribeToUserLabels('user1', callback);

      expect(onSnapshot).toHaveBeenCalledOnce();
      expect(unsub).toBe(mockUnsub);
    });
  });
});
