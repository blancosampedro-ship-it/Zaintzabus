'use client';

interface LurraldebusLogoProps {
  className?: string;
  width?: number;
  inverted?: boolean;
}

/**
 * Logo completo de Lurraldebus
 */
export default function LurraldebusLogo({ className, width = 200, inverted = false }: LurraldebusLogoProps) {
  const scale = width / 300;
  const height = 90 * scale;
  
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 300 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* LURRALDE - texto gris */}
      <text
        x="0"
        y="58"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="42"
        fontWeight="700"
        fontStyle="italic"
        fill={inverted ? '#ffffff' : '#6B7B8A'}
        letterSpacing="-1"
      >
        LURRALDE
      </text>
      
      {/* BUS - texto verde */}
      <text
        x="175"
        y="58"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="42"
        fontWeight="700"
        fontStyle="italic"
        fill="#7CB342"
        letterSpacing="-1"
      >
        BUS
      </text>
      
      {/* Hoja verde - media elipse a la derecha */}
      <ellipse
        cx="295"
        cy="45"
        rx="45"
        ry="42"
        fill="#7CB342"
        clipPath="url(#clipLeaf)"
      />
      <defs>
        <clipPath id="clipLeaf">
          <rect x="250" y="0" width="50" height="90" />
        </clipPath>
      </defs>
    </svg>
  );
}
