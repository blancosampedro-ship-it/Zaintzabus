'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './Button';

// ==================== CONTEXT ====================

interface AlertDialogContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | undefined>(undefined);

function useAlertDialogContext() {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error('AlertDialog components must be used within an AlertDialog');
  }
  return context;
}

// ==================== ROOT ====================

interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

function AlertDialog({ 
  children, 
  open: controlledOpen, 
  onOpenChange, 
  defaultOpen = false 
}: AlertDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  
  const setOpen = React.useCallback((value: React.SetStateAction<boolean>) => {
    const newValue = typeof value === 'function' ? value(open) : value;
    if (!isControlled) {
      setUncontrolledOpen(newValue);
    }
    onOpenChange?.(newValue);
  }, [isControlled, open, onOpenChange]);

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

// ==================== TRIGGER ====================

interface AlertDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const AlertDialogTrigger = React.forwardRef<HTMLButtonElement, AlertDialogTriggerProps>(
  ({ children, asChild, onClick, ...props }, ref) => {
    const { setOpen } = useAlertDialogContext();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      setOpen(true);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        onClick: handleClick,
        ref,
      });
    }

    return (
      <button ref={ref} onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);

AlertDialogTrigger.displayName = 'AlertDialogTrigger';

// ==================== PORTAL & OVERLAY ====================

function AlertDialogPortal({ children }: { children: React.ReactNode }) {
  const { open } = useAlertDialogContext();
  
  if (!open) return null;
  
  return <>{children}</>;
}

const AlertDialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));

AlertDialogOverlay.displayName = 'AlertDialogOverlay';

// ==================== CONTENT ====================

interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onEscapeKeyDown?: (e: KeyboardEvent) => void;
}

const AlertDialogContent = React.forwardRef<HTMLDivElement, AlertDialogContentProps>(
  ({ className, children, onEscapeKeyDown, ...props }, ref) => {
    const { open, setOpen } = useAlertDialogContext();

    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onEscapeKeyDown?.(e);
          if (!e.defaultPrevented) {
            setOpen(false);
          }
        }
      };

      if (open) {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }, [open, setOpen, onEscapeKeyDown]);

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <AlertDialogOverlay onClick={() => setOpen(false)} />
        <div
          ref={ref}
          className={cn(
            'fixed z-50 grid w-full max-w-lg gap-4 border bg-white p-6 shadow-lg',
            'duration-200 sm:rounded-lg',
            'animate-in fade-in-0 zoom-in-95',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);

AlertDialogContent.displayName = 'AlertDialogContent';

// ==================== HEADER ====================

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}
    {...props}
  />
);

AlertDialogHeader.displayName = 'AlertDialogHeader';

// ==================== FOOTER ====================

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
);

AlertDialogFooter.displayName = 'AlertDialogFooter';

// ==================== TITLE ====================

const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-lg font-semibold', className)}
    {...props}
  />
));

AlertDialogTitle.displayName = 'AlertDialogTitle';

// ==================== DESCRIPTION ====================

const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-500', className)}
    {...props}
  />
));

AlertDialogDescription.displayName = 'AlertDialogDescription';

// ==================== ACTION & CANCEL ====================

const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { setOpen } = useAlertDialogContext();
  
  return (
    <Button
      ref={ref}
      className={className}
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.defaultPrevented) {
          setOpen(false);
        }
      }}
      {...props}
    />
  );
});

AlertDialogAction.displayName = 'AlertDialogAction';

const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { setOpen } = useAlertDialogContext();
  
  return (
    <Button
      ref={ref}
      variant="outline"
      className={cn('mt-2 sm:mt-0', className)}
      onClick={(e) => {
        props.onClick?.(e);
        setOpen(false);
      }}
      {...props}
    />
  );
});

AlertDialogCancel.displayName = 'AlertDialogCancel';

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
