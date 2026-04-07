import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';
import type { User } from '../types';

interface AuthSessionValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthSessionValue | undefined>(undefined);

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ? mapAuthUser(firebaseUser) : null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthSession() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuthSession must be used within AuthProvider');
  }

  return value;
}
