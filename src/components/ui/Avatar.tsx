'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

const statusSizes = {
  xs: 'h-2 w-2 -right-0.5 -bottom-0.5',
  sm: 'h-2.5 w-2.5 -right-0.5 -bottom-0.5',
  md: 'h-3 w-3 -right-0.5 -bottom-0.5',
  lg: 'h-3.5 w-3.5 right-0 bottom-0',
  xl: 'h-4 w-4 right-0 bottom-0',
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-slate-500',
  busy: 'bg-red-500',
  away: 'bg-amber-500',
};

export function Avatar({
  src,
  alt = '',
  fallback,
  size = 'md',
  status,
  className,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const initials = React.useMemo(() => {
    if (fallback) return fallback.slice(0, 2).toUpperCase();
    if (alt) {
      return alt
        .split(' ')
        .map((word) => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    return '?';
  }, [fallback, alt]);

  const showImage = src && !imageError;

  return (
    <div
      className={cn('relative inline-flex shrink-0', className)}
      {...props}
    >
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-medium bg-slate-700 text-slate-300 overflow-hidden',
          sizeClasses[size]
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute rounded-full ring-2 ring-slate-900',
            statusSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

// Avatar Group
export interface AvatarGroupProps {
  avatars: Array<{
    src?: string | null;
    alt?: string;
    fallback?: string;
  }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function AvatarGroup({
  avatars,
  max = 5,
  size = 'md',
  className,
}: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          alt={avatar.alt}
          fallback={avatar.fallback}
          size={size}
          className="ring-2 ring-slate-900"
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-medium bg-slate-600 text-slate-200 ring-2 ring-slate-900',
            sizeClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
