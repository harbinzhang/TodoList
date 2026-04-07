import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { AuthProvider } from './AuthProvider';
import { AppDataProvider } from './AppDataProvider';
import { ToastProvider } from './ToastProvider';
import { ConfirmationDialogProvider } from './ConfirmationDialogProvider';
import { MindmapProvider } from './MindmapProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MindmapProvider>
          <AppDataProvider>
            <ToastProvider>
              <ConfirmationDialogProvider>{children}</ConfirmationDialogProvider>
            </ToastProvider>
          </AppDataProvider>
        </MindmapProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
