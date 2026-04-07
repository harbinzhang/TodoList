import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

interface ConfirmationDialogState extends ConfirmationOptions {
  open: boolean;
}

interface ConfirmationContextValue {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextValue | undefined>(undefined);

const initialState: ConfirmationDialogState = {
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  tone: 'default',
};

export function ConfirmationDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmationDialogState>(initialState);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setDialog(initialState);
  }, []);

  const confirm = useCallback((options: ConfirmationOptions) => {
    setDialog({
      open: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      tone: options.tone ?? 'default',
    });

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmationContext.Provider value={value}>
      {children}
      {dialog.open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{dialog.title}</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{dialog.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {dialog.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-sm text-white ${
                  dialog.tone === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirmationDialog() {
  const value = useContext(ConfirmationContext);

  if (!value) {
    throw new Error('useConfirmationDialog must be used within ConfirmationDialogProvider');
  }

  return value;
}
