import { useAuthStore } from '../store/authStore';

export function useAuthSession() {
  return useAuthStore();
}
