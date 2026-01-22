'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

export interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label?: string;
  };
  loading?: boolean;
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-cyan-400',
  trend,
  loading = false,
  className,
}: StatsCardProps) {
  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null;

  const trendColor = trend
    ? trend.value > 0
      ? 'text-green-400'
      : trend.value < 0
      ? 'text-red-400'
      : 'text-slate-400'
    : '';

  return (
    <div
      className={cn(
        'bg-slate-800 border border-slate-700 rounded-xl p-6 transition-shadow hover:shadow-industrial',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-700 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-3xl font-bold text-white mt-2">{value}</p>
          )}
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'p-3 rounded-xl bg-slate-700/50',
              iconColor.includes('cyan') && 'bg-cyan-500/10',
              iconColor.includes('green') && 'bg-green-500/10',
              iconColor.includes('amber') && 'bg-amber-500/10',
              iconColor.includes('red') && 'bg-red-500/10',
              iconColor.includes('blue') && 'bg-blue-500/10'
            )}
          >
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
        )}
      </div>
      {trend && TrendIcon && (
        <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-slate-700">
          <TrendIcon className={cn('h-4 w-4', trendColor)} />
          <span className={cn('text-sm font-medium', trendColor)}>
            {Math.abs(trend.value)}%
          </span>
          {trend.label && (
            <span className="text-xs text-slate-500">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Mini Stats for compact display
export interface MiniStatsProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function MiniStats({
  label,
  value,
  icon: Icon,
  iconColor = 'text-slate-400',
  className,
}: MiniStatsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3',
        className
      )}
    >
      {Icon && <Icon className={cn('h-5 w-5', iconColor)} />}
      <div>
        <p className="text-lg font-semibold text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

// Stats Grid
export interface StatsGridProps {
  stats: StatsCardProps[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ stats, columns = 4, className }: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  );
}

// Progress Stats
export interface ProgressStatsProps {
  label: string;
  value: number;
  max?: number;
  showPercentage?: boolean;
  color?: 'cyan' | 'green' | 'amber' | 'red' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressStats({
  label,
  value,
  max = 100,
  showPercentage = true,
  color = 'cyan',
  size = 'md',
  className,
}: ProgressStatsProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const colors = {
    cyan: 'bg-cyan-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  };

  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{label}</span>
        {showPercentage && (
          <span className="text-sm font-medium text-white">
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>
      <div className={cn('w-full bg-slate-700 rounded-full', heights[size])}>
        <div
          className={cn('rounded-full transition-all duration-500', colors[color], heights[size])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
