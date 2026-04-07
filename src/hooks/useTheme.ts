import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  // Add transition class for smooth switch
  root.classList.add('theme-transition');
  
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Remove transition class after animation completes
  setTimeout(() => {
    root.classList.remove('theme-transition');
  }, 250);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const stored = getStoredTheme();
    return stored === 'system' ? getSystemTheme() : stored;
  });

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    setThemeState(newTheme);
    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent) => {
      if (getStoredTheme() === 'system') {
        const resolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Apply theme on mount (in case the inline script didn't cover edge cases)
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    // Don't use applyTheme here (no transition on mount)
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { theme, setTheme, resolvedTheme };
}
