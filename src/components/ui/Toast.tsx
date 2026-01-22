'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Transition } from '@headlessui/react';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

const toastIcons = {
  success: <CheckCircle className="h-5 w-5 text-green-400" />,
  error: <XCircle className="h-5 w-5 text-red-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
  info: <Info className="h-5 w-5 text-blue-400" />,
};

const toastColors = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [show, setShow] = React.useState(true);

  React.useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(() => onDismiss(toast.id), 200);
      }, toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  return (
    <Transition
      show={show}
      as={React.Fragment}
      enter="transform ease-out duration-200 transition"
      enterFrom="translate-x-full opacity-0"
      enterTo="translate-x-0 opacity-100"
      leave="transition ease-in duration-150"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div
        className={cn(
          'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border bg-slate-800 shadow-industrial-lg',
          toastColors[toast.type]
        )}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">{toastIcons[toast.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{toast.title}</p>
              {toast.message && (
                <p className="mt-1 text-sm text-slate-400">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              className="flex-shrink-0 p-1 text-slate-400 hover:text-white transition-colors rounded"
              onClick={() => {
                setShow(false);
                setTimeout(() => onDismiss(toast.id), 200);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  );
}

// Toast Container
interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

export function ToastContainer({
  toasts,
  onDismiss,
  position = 'top-right',
}: ToastContainerProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-live="assertive"
      className={cn(
        'pointer-events-none fixed z-[100] flex flex-col gap-3',
        positionClasses[position]
      )}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

// Hook for toast management
export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = React.useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'success', title, message });
    },
    [addToast]
  );

  const error = React.useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'error', title, message });
    },
    [addToast]
  );

  const warning = React.useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'warning', title, message });
    },
    [addToast]
  );

  const info = React.useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'info', title, message });
    },
    [addToast]
  );

  return {
    toasts,
    addToast,
    dismissToast,
    success,
    error,
    warning,
    info,
    ToastContainer: () => <ToastContainer toasts={toasts} onDismiss={dismissToast} />,
  };
}
