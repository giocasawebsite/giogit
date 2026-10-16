import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'pink' | 'orange' | 'blue' | 'charcoal' | 'terracotta' | 'gold' | 'olive' | 'dark' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'outline',
  size = 'sm',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 uppercase tracking-widest font-semibold',
    md: 'text-xs px-3.5 py-1 uppercase tracking-widest font-semibold',
  };

  const variantStyles = {
    pink: 'bg-brand-pink/15 text-brand-pink border border-brand-pink/30',
    orange: 'bg-brand-orange/15 text-brand-orange border border-brand-orange/30',
    blue: 'bg-brand-blue/15 text-brand-blue border border-brand-blue/30',
    charcoal: 'bg-brand-surfaceElevated text-brand-cream/90 border border-brand-border',
    terracotta: 'bg-brand-orange/15 text-brand-orange border border-brand-orange/30',
    gold: 'bg-brand-pink/15 text-brand-pink border border-brand-pink/30',
    olive: 'bg-brand-blue/15 text-brand-blue border border-brand-blue/30',
    dark: 'bg-brand-surfaceElevated text-brand-cream/90 border border-brand-border',
    outline: 'border border-brand-border text-brand-subtle bg-brand-surface/40',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
