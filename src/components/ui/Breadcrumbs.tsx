'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  separator?: React.ReactNode;
}

export function Breadcrumbs({
  items,
  className,
  showHome = true,
  separator = <ChevronRight className="h-4 w-4 text-slate-500" />,
}: BreadcrumbsProps) {
  const allItems = showHome
    ? [{ label: 'Inicio', href: '/', icon: <Home className="h-4 w-4" /> }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center gap-2">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;

          return (
            <li key={index} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'flex items-center gap-1.5 text-sm',
                    isLast ? 'text-white font-medium' : 'text-slate-400'
                  )}
                >
                  {item.icon}
                  {item.label}
                </span>
              )}
              {!isLast && separator}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Simple Breadcrumb from path
export function PathBreadcrumbs({
  path,
  labels,
  className,
}: {
  path: string;
  labels?: Record<string, string>;
  className?: string;
}) {
  const segments = path.split('/').filter(Boolean);
  
  const items: BreadcrumbItem[] = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = labels?.[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    return {
      label,
      href: index === segments.length - 1 ? undefined : href,
    };
  });

  return <Breadcrumbs items={items} className={className} />;
}
