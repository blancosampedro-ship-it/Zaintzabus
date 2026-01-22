import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | { toDate: () => Date } | null | undefined): string {
  if (!date) return '-';
  
  const d = 'toDate' in date ? date.toDate() : date;
  
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | { toDate: () => Date } | null | undefined): string {
  if (!date) return '-';
  
  const d = 'toDate' in date ? date.toDate() : date;
  
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '-';
  
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours < 24) {
    return `${hours}h ${mins}m`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return `${days}d ${remainingHours}h`;
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(1)}%`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function formatDistanceToNow(date: Date | { toDate: () => Date } | null | undefined): string {
  if (!date) return '-';
  
  const d = 'toDate' in date ? date.toDate() : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSeconds < 60) {
    return 'hace unos segundos';
  } else if (diffMinutes < 60) {
    return `hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
  } else if (diffHours < 24) {
    return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  } else if (diffDays < 30) {
    return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  } else if (diffMonths < 12) {
    return `hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
  } else {
    return `hace ${diffYears} ${diffYears === 1 ? 'año' : 'años'}`;
  }
}
