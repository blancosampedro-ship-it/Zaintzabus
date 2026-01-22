'use client';

import * as React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, AlertTriangle, CheckCircle, Info, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
  preventClose?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showClose = true,
  preventClose = false,
  className,
}: ModalProps) {
  const handleClose = () => {
    if (!preventClose) {
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  'w-full transform overflow-hidden rounded-xl bg-slate-800 border border-slate-700 p-6 text-left align-middle shadow-industrial-lg transition-all',
                  sizeClasses[size],
                  className
                )}
              >
                {showClose && !preventClose && (
                  <button
                    type="button"
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}

                {title && (
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold leading-6 text-white pr-8"
                  >
                    {title}
                  </Dialog.Title>
                )}

                {description && (
                  <Dialog.Description className="mt-2 text-sm text-slate-400">
                    {description}
                  </Dialog.Description>
                )}

                <div className={cn(title || description ? 'mt-4' : '')}>
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Modal Footer
export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn('flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-700', className)}>
      {children}
    </div>
  );
}

// Confirm Dialog
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

const confirmIcons = {
  danger: <Trash2 className="h-6 w-6 text-red-400" />,
  warning: <AlertTriangle className="h-6 w-6 text-amber-400" />,
  info: <Info className="h-6 w-6 text-blue-400" />,
  success: <CheckCircle className="h-6 w-6 text-green-400" />,
};

const confirmColors = {
  danger: 'bg-red-500/10 border-red-500/30',
  warning: 'bg-amber-500/10 border-amber-500/30',
  info: 'bg-blue-500/10 border-blue-500/30',
  success: 'bg-green-500/10 border-green-500/30',
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showClose={false}>
      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center border mb-4',
            confirmColors[variant]
          )}
        >
          {confirmIcons[variant]}
        </div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{message}</p>
        <div className="flex items-center gap-3 mt-6 w-full">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
