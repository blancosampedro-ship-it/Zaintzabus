'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const cardVariants = cva(
  'rounded-xl border transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-slate-700 bg-slate-800/50 backdrop-blur-sm',
        solid: 'border-slate-700 bg-slate-800',
        glass: 'border-slate-600/50 bg-slate-800/30 backdrop-blur-lg',
        outline: 'border-slate-600 bg-transparent',
        elevated: 'border-slate-700 bg-slate-800 shadow-lg shadow-black/20',
        interactive: 'border-slate-700 bg-slate-800/50 hover:border-cyan-500/50 hover:bg-slate-800 cursor-pointer',
      },
      padding: {
        none: '',
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'none',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, actions, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between p-6 pb-0', className)}
      {...props}
    >
      <div className="space-y-1">{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h3', ...props }, ref) => (
    <Component
      ref={ref}
      className={cn('text-lg font-semibold text-white', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-slate-400', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

const CardGrid = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
      {...props}
    />
  )
);
CardGrid.displayName = 'CardGrid';

export interface LinkCardProps extends CardProps {
  href: string;
  external?: boolean;
}

const LinkCard = React.forwardRef<HTMLAnchorElement, LinkCardProps>(
  ({ href, external, className, children, variant = 'interactive', padding, ...props }, ref) => {
    const content = (
      <div className={cn(cardVariants({ variant, padding, className }))}>
        {children}
      </div>
    );

    if (external) {
      return (
        <a
          ref={ref}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </a>
      );
    }

    return (
      <Link href={href} ref={ref as any} {...(props as any)}>
        {content}
      </Link>
    );
  }
);
LinkCard.displayName = 'LinkCard';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  href?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  href,
  trend,
  className,
}: StatCardProps) {
  const trendIcon = trend === 'up' ? (
    <TrendingUp className="h-3 w-3" />
  ) : trend === 'down' ? (
    <TrendingDown className="h-3 w-3" />
  ) : (
    <Minus className="h-3 w-3" />
  );

  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400';

  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        {icon && <div className="text-slate-500">{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {change !== undefined && (
          <span className={cn('inline-flex items-center gap-1 text-xs font-medium', trendColor)}>
            {trendIcon}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      {changeLabel && (
        <p className="mt-1 text-xs text-slate-500">{changeLabel}</p>
      )}
      {href && (
        <div className="mt-3 flex items-center text-xs text-cyan-400">
          Ver detalles
          <ArrowUpRight className="ml-1 h-3 w-3" />
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <LinkCard href={href} className={cn('p-4', className)}>
        {content}
      </LinkCard>
    );
  }

  return (
    <Card variant="default" className={cn('p-4', className)}>
      {content}
    </Card>
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardGrid,
  LinkCard,
  StatCard,
  cardVariants,
};
