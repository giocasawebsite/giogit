import React, { ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'pink' | 'orange' | 'blue' | 'outline' | 'ghost' | 'gold' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium tracking-wide transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-pink/40 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-4 py-2 gap-1.5 min-h-[38px]',
    md: 'text-sm px-6 py-3 gap-2 min-h-[46px]',
    lg: 'text-base px-8 py-4 gap-2.5 min-h-[54px] uppercase tracking-wider',
  };

  const variantStyles = {
    primary: 'bg-brand-pink text-white hover:bg-brand-pinkHover shadow-luxury-pink hover:shadow-glow-subtle hover:-translate-y-0.5 font-semibold',
    pink: 'bg-brand-pink text-white hover:bg-brand-pinkHover shadow-luxury-pink hover:shadow-glow-subtle hover:-translate-y-0.5 font-semibold',
    orange: 'bg-brand-orange text-brand-charcoalDeep hover:bg-brand-orangeHover shadow-luxury-orange hover:shadow-glow-orange hover:-translate-y-0.5 font-bold',
    blue: 'bg-brand-blue text-brand-charcoalDeep hover:bg-brand-blueHover shadow-luxury-blue hover:shadow-glow-blue hover:-translate-y-0.5 font-bold',
    secondary: 'bg-white text-brand-charcoalDeep hover:bg-brand-offwhite hover:shadow-luxury hover:-translate-y-0.5 font-semibold',
    outline: 'border border-white/30 text-white hover:border-brand-pink hover:text-brand-pink hover:bg-brand-pink/10',
    ghost: 'text-white/80 hover:text-white hover:bg-white/10',
    gold: 'bg-brand-orange text-brand-charcoalDeep hover:bg-brand-orangeHover font-bold shadow-luxury-orange hover:-translate-y-0.5',
    glass: 'bg-brand-surface/75 backdrop-blur-md border border-brand-border text-white hover:bg-brand-surfaceElevated hover:border-brand-borderStrong'
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...(props as any)}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      
      {!isLoading && icon && iconPosition === 'left' && (
        <span className="transition-transform duration-200 group-hover:-translate-x-0.5">{icon}</span>
      )}
      
      <span>{children}</span>
      
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="transition-transform duration-200 group-hover:translate-x-0.5">{icon}</span>
      )}
    </motion.button>
  );
};
