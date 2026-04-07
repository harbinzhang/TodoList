import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, loading: true });
  });

  it('starts with null user and loading true', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.loading).toBe(true);
  });

  it('setUser sets the user', () => {
    const mockUser = {
      uid: 'abc123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
    };
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('setUser to null clears the user', () => {
    useAuthStore.getState().setUser({ uid: '1', email: 'a@b.com' });
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setLoading updates loading state', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().loading).toBe(false);
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().loading).toBe(true);
  });
});
