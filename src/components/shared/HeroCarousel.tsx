import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroSlide, PageRoute } from '../../types';
import { heroService } from '../../services/heroService';
import { DEFAULT_HERO_SLIDES } from '../../data/heroSlidesData';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Gamepad2, 
  CalendarDays, 
  Sparkles 
} from 'lucide-react';
import { useBookingModal } from '../../context/BookingModalContext';

interface HeroCarouselProps {
  onNavigate: (page: PageRoute) => void;
}

const AUTOPLAY_INTERVAL_MS = 5000;

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ onNavigate }) => {
  const { openBookingModal } = useBookingModal();

  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isTouching, setIsTouching] = useState<boolean>(false);
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Load active hero slides from backend API (falls back cleanly to DEFAULT_HERO_SLIDES)
  useEffect(() => {
    let isMounted = true;
    heroService.getHeroSlides(false).then((fetchedSlides) => {
      if (isMounted && Array.isArray(fetchedSlides) && fetchedSlides.length > 0) {
        const activeOnly = fetchedSlides.filter((s) => s.isActive).slice(0, 5);
        if (activeOnly.length > 0) {
          setSlides(activeOnly);
        }
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const totalSlides = slides.length || 1;

  // Listen for reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Listen for tab visibility changes to pause autoplay when page is in background
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Navigation handlers
  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Autoplay timer: pauses on user touch, mouse hover, hidden tab, or reduced motion
  useEffect(() => {
    if (isHovered || isTouching || isTabHidden || prefersReducedMotion || totalSlides <= 1) {
      return;
    }

    const timer = setInterval(() => {
      handleNext();
    }, AUTOPLAY_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isHovered, isTouching, isTabHidden, prefersReducedMotion, totalSlides, handleNext]);

  // Preload adjacent images to prevent transition flashes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth <= 1024;

    const nextIndex = (activeIndex + 1) % totalSlides;
    const prevIndex = (activeIndex - 1 + totalSlides) % totalSlides;

    [nextIndex, prevIndex].forEach((idx) => {
      const slide = slides[idx];
      if (!slide) return;

      const imgUrl = isMobile 
        ? (slide.mobileImageUrl || slide.desktopImageUrl)
        : isTablet
        ? (slide.tabletImageUrl || slide.desktopImageUrl)
        : slide.desktopImageUrl;

      if (imgUrl) {
        const preloader = new Image();
        preloader.src = imgUrl;
      }
    });
  }, [activeIndex, slides, totalSlides]);

  // Touch swipe gestures for mobile & tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouching(true);
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsTouching(false);
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - (touchStartY.current || touchEndY);

    // Only trigger horizontal swipe when horizontal distance is significant and dominant
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        handleNext(); // Swiped left -> next slide
      } else {
        handlePrev(); // Swiped right -> prev slide
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const activeSlide = slides[activeIndex] || slides[0];

  const handleCtaClick = (link?: string) => {
    if (!link) {
      onNavigate('book');
      return;
    }

    if (link === 'book' || link.startsWith('book')) {
      onNavigate('book');
    } else if (link === 'menu') {
      onNavigate('menu');
    } else if (link === 'experience') {
      onNavigate('experience');
    } else if (link === 'events') {
      onNavigate('events');
    } else if (link === 'games') {
      onNavigate('games');
    } else if (link === 'reservation') {
      openBookingModal('choice');
    } else {
      onNavigate('book');
    }
  };

  return (
    <section 
      aria-label="GioCasa Flagship Experiences"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-[85vh] sm:h-[90vh] lg:h-[92vh] min-h-[560px] max-h-[920px] overflow-hidden bg-brand-dark select-none flex items-center justify-center"
    >
      {/* Layer 1: 5 Slide Images with Responsive Picture Element & Complete Bleed Coverage */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-out will-change-transform overflow-hidden ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <picture className="absolute inset-0 w-full h-full block overflow-hidden">
                {/* Mobile portrait image (< 768px) */}
                {slide.mobileImageUrl && (
                  <source 
                    media="(max-width: 767px)" 
                    srcSet={slide.mobileImageUrl} 
                  />
                )}
                {/* Tablet landscape image (768px - 1024px) */}
                {(slide.tabletImageUrl || slide.desktopImageUrl) && (
                  <source 
                    media="(max-width: 1024px)" 
                    srcSet={slide.tabletImageUrl || slide.desktopImageUrl} 
                  />
                )}
                {/* Desktop high-res landscape image (> 1024px) */}
                <img
                  src={slide.desktopImageUrl}
                  alt={slide.title || `GioCasa Hero Slide ${index + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover object-center block transition-transform duration-1000 ease-out ${
                    isActive ? 'scale-100' : 'scale-105'
                  }`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                />
              </picture>
            </div>
          );
        })}
      </div>

      {/* Layer 2: Subtle Cinematic Scrim & Gradients (Ensures high text legibility without blacking out artwork) */}
      {/* Overall subtle dark tint */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-black/40" />
      {/* Soft top gradient for navbar contrast */}
      <div className="absolute top-0 inset-x-0 h-36 z-20 pointer-events-none bg-gradient-to-b from-brand-dark/85 via-brand-dark/25 to-transparent" />
      {/* Soft bottom gradient for indicator contrast — NOT a blackout void */}
      <div className="absolute bottom-0 inset-x-0 h-28 z-20 pointer-events-none bg-gradient-to-t from-brand-dark/70 to-transparent" />

      {/* Layer 3: Editorial Content Overlay */}
      <div className="relative z-30 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center space-y-4 sm:space-y-6 pt-16 sm:pt-20 pb-12 sm:pb-16">
        
        {/* Slide Micro Badge */}
        <AnimatePresence mode="wait">
          {activeSlide.badge && (
            <motion.div
              key={`badge-${activeSlide.id}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.35 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-surface/85 backdrop-blur-md border border-brand-pink/50 shadow-luxury-pink text-brand-pink text-[10px] sm:text-xs uppercase tracking-[0.25em] font-bold"
            >
              <Sparkles className="w-3 h-3 text-brand-pink animate-pulse" />
              <span>{activeSlide.badge}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slide Title */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={`title-${activeSlide.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.45 }}
            className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl font-serif font-bold text-white tracking-tight leading-[1.08] text-balance drop-shadow-md"
          >
            {activeSlide.title}
          </motion.h1>
        </AnimatePresence>

        {/* Slide Subtitle */}
        <AnimatePresence mode="wait">
          <motion.p
            key={`subtitle-${activeSlide.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.45, delay: prefersReducedMotion ? 0 : 0.05 }}
            className="text-xs sm:text-base md:text-lg text-white/90 max-w-2xl mx-auto font-light leading-relaxed text-balance drop-shadow-sm px-2"
          >
            {activeSlide.subtitle}
          </motion.p>
        </AnimatePresence>

        {/* Call to Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => handleCtaClick(activeSlide.ctaLink)}
            className="py-3 px-7 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white font-bold text-xs uppercase tracking-widest shadow-luxury-pink active:scale-95 transition-all flex items-center gap-2 group cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>{activeSlide.ctaText || 'Explore Now'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => openBookingModal('choice')}
            className="py-3 px-6 rounded-full bg-brand-surface/90 hover:bg-brand-surfaceElevated border border-brand-orange/50 text-white font-semibold text-xs uppercase tracking-widest hover:border-brand-orange shadow-lg active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <CalendarDays className="w-3.5 h-3.5 text-brand-orange" />
            <span>Reserve Table</span>
          </button>
        </div>

      </div>

      {/* Previous / Next Navigation Arrows (Desktop & Tablet) */}
      <div className="hidden sm:flex items-center justify-between absolute inset-x-4 md:inset-x-8 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
        <button
          onClick={handlePrev}
          aria-label="Previous slide"
          className="w-11 h-11 rounded-full bg-brand-surface/80 hover:bg-brand-surface border border-brand-border/50 text-white flex items-center justify-center transition-all pointer-events-auto backdrop-blur-md shadow-lg opacity-85 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleNext}
          aria-label="Next slide"
          className="w-11 h-11 rounded-full bg-brand-surface/80 hover:bg-brand-surface border border-brand-border/50 text-white flex items-center justify-center transition-all pointer-events-auto backdrop-blur-md shadow-lg opacity-85 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Bar: Slide Indicator Pills */}
      <div className="absolute bottom-5 sm:bottom-7 inset-x-0 z-30 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto px-3.5 py-1.5 rounded-full bg-brand-surface/80 backdrop-blur-md border border-brand-border/40 shadow-lg">
          {slides.map((slide, idx) => {
            const isCurrent = idx === activeIndex;
            return (
              <button
                key={slide.id}
                onClick={() => setActiveIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  isCurrent
                    ? 'w-8 bg-brand-pink shadow-[0_0_12px_rgba(237,36,155,0.7)]'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};
