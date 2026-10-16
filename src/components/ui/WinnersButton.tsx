import React from 'react';
import { Trophy, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { PageRoute } from '../../types';

interface WinnersButtonProps {
  onNavigate: (page: PageRoute) => void;
  isActive?: boolean;
  variant?: 'header' | 'mobile-header' | 'mobile-drawer' | 'cta';
  className?: string;
}

export const WinnersButton: React.FC<WinnersButtonProps> = ({
  onNavigate,
  isActive = false,
  variant = 'header',
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate('hall-of-fame');
  };

  // 1. Mobile top bar compact button
  if (variant === 'mobile-header') {
    return (
      <button
        onClick={handleClick}
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-200 active:scale-95 ${
          isActive
            ? 'bg-brand-surfaceElevated border-brand-pink text-white shadow-luxury-pink'
            : 'bg-brand-surface/90 hover:bg-brand-surfaceElevated border-brand-pink/50 hover:border-brand-pink text-white'
        } ${className}`}
        aria-label="GioCasa Winners & Hall of Fame"
        title="🏆 WINNERS — Meet the Champions"
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-orange to-brand-pink flex items-center justify-center shrink-0 shadow-sm">
          <Trophy className="w-3 h-3 text-white" />
        </div>
        <span className="text-[10px] font-bold tracking-wider uppercase text-white">
          WINNERS
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
      </button>
    );
  }

  // 2. Mobile drawer full-width card button
  if (variant === 'mobile-drawer') {
    return (
      <button
        onClick={handleClick}
        className={`w-full p-3 rounded-2xl bg-gradient-to-r from-brand-surfaceElevated via-brand-surface to-brand-dark border transition-all duration-300 text-left flex items-center justify-between group active:scale-[0.98] ${
          isActive
            ? 'border-brand-pink shadow-luxury-pink'
            : 'border-brand-pink/40 hover:border-brand-pink shadow-md'
        } ${className}`}
        aria-label="GioCasa Winners & Hall of Fame"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange to-brand-pink flex items-center justify-center shadow-luxury-pink text-white shrink-0 group-hover:scale-105 transition-transform">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm font-bold text-white tracking-wide">
                🏆 WINNERS
              </span>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-brand-pink/20 text-brand-pink font-mono font-bold uppercase tracking-wider border border-brand-pink/30">
                Hall of Fame
              </span>
            </div>
            <span className="text-[10px] text-brand-subtle block font-light mt-0.5">
              Meet the Champions & Tournament Legends
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-brand-pink group-hover:translate-x-1 transition-transform" />
      </button>
    );
  }

  // 3. CTA button (for Hero/Sections)
  if (variant === 'cta') {
    return (
      <button
        onClick={handleClick}
        className={`group relative inline-flex items-center gap-2.5 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-brand-surfaceElevated border transition-all duration-300 shadow-md hover:shadow-luxury-pink shrink-0 overflow-hidden active:scale-95 hover:-translate-y-0.5 ${
          isActive
            ? 'border-brand-pink shadow-luxury-pink'
            : 'border-brand-pink/50 hover:border-brand-pink'
        } ${className}`}
        title="GioCasa Hall of Fame & Arena Champions"
      >
        {/* Subtle celebratory shimmer sweep on hover */}
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-orange to-brand-pink flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
          <Trophy className="w-3.5 h-3.5 text-white" />
        </div>

        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-white block leading-none">
              🏆 WINNERS
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
          </div>
          <span className="text-[9px] text-brand-pink font-mono tracking-tight font-medium mt-0.5 block leading-none">
            Meet the Champions
          </span>
        </div>

        <ArrowRight className="w-3.5 h-3.5 text-brand-pink group-hover:translate-x-1 transition-transform ml-1" />
      </button>
    );
  }

  // 4. Default: Desktop Header pill button
  return (
    <button
      onClick={handleClick}
      className={`group relative inline-flex items-center gap-2 px-3.5 py-2 rounded-full border transition-all duration-300 overflow-hidden active:scale-95 hover:-translate-y-0.5 ${
        isActive
          ? 'bg-brand-surfaceElevated border-brand-pink text-white shadow-luxury-pink'
          : 'bg-brand-surface/90 hover:bg-brand-surfaceElevated border-brand-pink/40 hover:border-brand-pink text-white shadow-sm hover:shadow-luxury-pink/50'
      } ${className}`}
      title="🏆 GioCasa Hall of Fame — Meet the Champions"
    >
      {/* Subtle celebratory shimmer sweep on hover */}
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-orange via-brand-pink to-brand-pink flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
        <Trophy className="w-3.5 h-3.5 text-white" />
      </div>

      <div className="flex flex-col text-left leading-none pr-1">
        <span className="text-[11px] font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
          WINNERS
          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
        </span>
        <span className="text-[8px] text-brand-pink font-mono tracking-tight font-medium mt-0.5">
          Meet Champions
        </span>
      </div>
    </button>
  );
};
