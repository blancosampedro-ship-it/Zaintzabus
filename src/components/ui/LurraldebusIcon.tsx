'use client';

import { cn } from '@/lib/utils';

interface LurraldebusIconProps {
  className?: string;
  size?: number;
}

/**
 * Icono de la hoja de Lurraldebus
 * Basado en el logo oficial de Lurraldebus
 */
export default function LurraldebusIcon({ className, size = 24 }: LurraldebusIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-[#7cb342]', className)}
    >
      {/* Hoja verde característica de Lurraldebus */}
      <path
        d="M15 85 C15 85, 10 50, 35 25 C50 10, 75 5, 90 15 C90 15, 70 20, 55 40 C40 60, 35 85, 15 85 Z"
        fill="currentColor"
      />
      {/* Vena de la hoja */}
      <path
        d="M20 80 Q45 55, 80 20"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}
