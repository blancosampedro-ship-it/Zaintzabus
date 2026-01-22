'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Inbox,
  Search,
  FileX,
  AlertCircle,
  Database,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  } | React.ReactNode;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: {
    container: 'py-8',
    icon: 'h-10 w-10',
    iconContainer: 'h-16 w-16',
    title: 'text-base',
    description: 'text-xs',
  },
  md: {
    container: 'py-12',
    icon: 'h-12 w-12',
    iconContainer: 'h-20 w-20',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'h-16 w-16',
    iconContainer: 'h-24 w-24',
    title: 'text-xl',
    description: 'text-base',
  },
};

export function EmptyState({
  icon: IconProp = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizes = sizeClasses[size];
  
  // Check if icon is a React element (already rendered) or a component
  const isIconElement = React.isValidElement(IconProp);
  
  // Check if action is a React element or an action config object
  const isActionElement = React.isValidElement(action);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      <div
        className={cn(
          'rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4',
          sizes.iconContainer
        )}
      >
        {isIconElement ? (
          IconProp
        ) : (
          <IconProp className={cn('text-slate-500', sizes.icon)} />
        )}
      </div>
      <h3 className={cn('font-semibold text-white mb-2', sizes.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-slate-400 max-w-sm mb-6', sizes.description)}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            isActionElement ? (
              action
            ) : (
              <Button 
                onClick={(action as { label: string; onClick: () => void; icon?: React.ReactNode }).onClick} 
                leftIcon={(action as { label: string; onClick: () => void; icon?: React.ReactNode }).icon}
              >
                {(action as { label: string; onClick: () => void; icon?: React.ReactNode }).label}
              </Button>
            )
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-built Empty States
export function NoResultsState({
  searchQuery,
  onClear,
  className,
}: {
  searchQuery?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Search}
      title="No se encontraron resultados"
      description={
        searchQuery
          ? `No hay resultados para "${searchQuery}". Intenta con otros términos de búsqueda.`
          : 'No se encontraron elementos que coincidan con tu búsqueda.'
      }
      action={
        onClear
          ? {
              label: 'Limpiar búsqueda',
              onClick: onClear,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NoDataState({
  entityName,
  onAdd,
  className,
}: {
  entityName: string;
  onAdd?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Database}
      title={`Sin ${entityName}`}
      description={`Aún no hay ${entityName.toLowerCase()} registrados. Comienza creando el primero.`}
      action={
        onAdd
          ? {
              label: `Crear ${entityName}`,
              onClick: onAdd,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function ErrorState({
  title = 'Algo salió mal',
  message = 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.',
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={message}
      action={
        onRetry
          ? {
              label: 'Reintentar',
              onClick: onRetry,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NotFoundState({
  entityName = 'elemento',
  onGoBack,
  className,
}: {
  entityName?: string;
  onGoBack?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={FileX}
      title={`${entityName} no encontrado`}
      description={`El ${entityName.toLowerCase()} que buscas no existe o ha sido eliminado.`}
      action={
        onGoBack
          ? {
              label: 'Volver',
              onClick: onGoBack,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function EmptyFolderState({
  folderName,
  onUpload,
  className,
}: {
  folderName?: string;
  onUpload?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="Carpeta vacía"
      description={
        folderName
          ? `La carpeta "${folderName}" está vacía.`
          : 'Esta carpeta no contiene ningún archivo.'
      }
      action={
        onUpload
          ? {
              label: 'Subir archivos',
              onClick: onUpload,
            }
          : undefined
      }
      className={className}
    />
  );
}
