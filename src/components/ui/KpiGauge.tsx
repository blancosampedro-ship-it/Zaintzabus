'use client';

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils/index';

interface KpiGaugeProps {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'default' | 'large';
}

export default function KpiGauge({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  status = 'neutral',
  size = 'default',
}: KpiGaugeProps) {
  const statusColors = {
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      icon: 'text-green-500',
      value: 'text-green-400',
      glow: 'shadow-green-500/20',
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      icon: 'text-yellow-500',
      value: 'text-yellow-400',
      glow: 'shadow-yellow-500/20',
    },
    danger: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: 'text-red-500',
      value: 'text-red-400',
      glow: 'shadow-red-500/20',
    },
    neutral: {
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30',
      icon: 'text-slate-400',
      value: 'text-white',
      glow: 'shadow-slate-500/20',
    },
  };

  const colors = statusColors[status];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={cn(
      'relative rounded-xl border p-5 transition-all',
      'bg-slate-800/50 backdrop-blur-sm',
      colors.border,
      'hover:shadow-lg',
      colors.glow
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <Icon className={cn('w-4 h-4', colors.icon)} />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-end gap-2">
        <span className={cn(
          'font-mono font-bold tracking-tight',
          colors.value,
          size === 'large' ? 'text-4xl' : 'text-3xl'
        )}>
          {value}
        </span>
        
        {trend && (
          <div className={cn(
            'flex items-center gap-1 mb-1 text-xs font-medium',
            trend === 'up' ? 'text-green-400' : 
            trend === 'down' ? 'text-red-400' : 'text-slate-500'
          )}>
            <TrendIcon className="w-3 h-3" />
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      )}

      {/* Decorative element */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 h-1 rounded-b-xl',
        status === 'success' && 'bg-gradient-to-r from-green-500/50 to-green-500/0',
        status === 'warning' && 'bg-gradient-to-r from-yellow-500/50 to-yellow-500/0',
        status === 'danger' && 'bg-gradient-to-r from-red-500/50 to-red-500/0',
        status === 'neutral' && 'bg-gradient-to-r from-slate-500/30 to-slate-500/0',
      )} />
    </div>
  );
}
