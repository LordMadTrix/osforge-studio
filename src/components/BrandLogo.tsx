import React from 'react';
import type { BrandLogo as BrandLogoData } from '../data/logos';

interface BrandLogoProps {
  logo?: BrandLogoData;
  size?: number;
  monochrome?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ logo, size = 20, monochrome = false, className }) => {
  if (!logo) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={monochrome ? 'currentColor' : `#${logo.hex}`}
      className={className}
      role="img"
      aria-label={logo.title}
      style={{ flexShrink: 0 }}
    >
      <title>{logo.title}</title>
      <path d={logo.path} />
    </svg>
  );
};
