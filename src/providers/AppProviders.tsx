import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { AuthProvider } from './AuthProvider';
import { AppDataProvider } from './AppDataProvider';
import { ToastProvider } from './ToastProvider';
import { ConfirmationDialogProvider } from './ConfirmationDialogProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppDataProvider>
          <ToastProvider>
            <ConfirmationDialogProvider>{children}</ConfirmationDialogProvider>
          </ToastProvider>
        </AppDataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
