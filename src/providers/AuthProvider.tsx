import { useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

function mapAuthUser(firebaseUser: FirebaseUser): User {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || undefined,
    displayName: firebaseUser.displayName || undefined,
    photoURL: firebaseUser.photoURL || undefined,
    isAnonymous: firebaseUser.isAnonymous,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ? mapAuthUser(firebaseUser) : null);
      setLoading(false);
    });

    return unsubscribe;
  }, [setLoading, setUser]);

  return <>{children}</>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthSession() {
  return useAuthStore();
}
