import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useScroll, motion, useMotionValueEvent } from 'framer-motion';
import { HeroSlide, PageRoute } from '../../types';
import { heroService } from '../../services/heroService';
import { DEFAULT_HERO_SLIDES } from '../../data/heroSlidesData';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Gamepad2, 
  CalendarDays, 
  Utensils, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useBookingModal } from '../../context/BookingModalContext';

interface HeroCarouselProps {
  onNavigate: (page: PageRoute) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ onNavigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { openBookingModal } = useBookingModal();

  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [hasScrolled, setHasScrolled] = useState<boolean>(false);

  // Load custom slides from backend API (falls back to DEFAULT_HERO_SLIDES)
  useEffect(() => {
    let isMounted = true;
    heroService.getHeroSlides(false).then((fetchedSlides) => {
      if (isMounted && Array.isArray(fetchedSlides) && fetchedSlides.length > 0) {
        // Ensure only active slides are displayed, up to 5
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

  // Preload adjacent slide images to eliminate any transition flicker
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

  // Framer Motion native scroll tracking across the hero track
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Track scroll progress to compute active index without hijacking native scrolling
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (latest > 0.02 && !hasScrolled) {
      setHasScrolled(true);
    } else if (latest <= 0.01 && hasScrolled) {
      setHasScrolled(false);
    }

    // Divide [0, 1] evenly among totalSlides
    // E.g., for 5 slides: 0..0.2 -> 0, 0.2..0.4 -> 1, 0.4..0.6 -> 2, 0.6..0.8 -> 3, 0.8..1.0 -> 4
    const computedIndex = Math.min(
      totalSlides - 1,
      Math.max(0, Math.floor(latest * totalSlides))
    );

    if (computedIndex !== activeIndex) {
      setActiveIndex(computedIndex);
    }
  });

  // Scroll smoothly to a target slide index when clicking indicator pills or arrows
  const scrollToSlide = useCallback((targetIndex: number) => {
    if (!containerRef.current) return;
    const boundedIndex = Math.min(totalSlides - 1, Math.max(0, targetIndex));
    const container = containerRef.current;
    const containerTop = container.offsetTop;
    const scrollableDistance = container.offsetHeight - window.innerHeight;

    if (scrollableDistance <= 0) return;

    // Calculate position inside the slice: place at the center of the slice for stability
    const sliceSize = scrollableDistance / totalSlides;
    const targetScrollY = containerTop + (boundedIndex * sliceSize) + (sliceSize * 0.3);

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth',
    });
  }, [totalSlides]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    scrollToSlide(activeIndex - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    scrollToSlide(activeIndex + 1);
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
    // Outer scroll track: 400vh on desktop (80vh per slide), 320vh on mobile for brisk responsiveness
    <section 
      ref={containerRef} 
      className="relative h-[320vh] sm:h-[400vh] bg-brand-dark select-none"
    >
      {/* Sticky Fullscreen Pinned Viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        
        {/* Layer 1: 5 Slide Images with Responsive Picture Element & Smooth Crossfade */}
        <div className="absolute inset-0 w-full h-full">
          {slides.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-out will-change-transform ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <picture className="w-full h-full block">
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
                    className={`w-full h-full object-cover transition-transform duration-1000 ease-out ${
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

        {/* Layer 2: Cinematic Dual Gradients (Legibility without Muddying Artwork) */}
        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent opacity-95" />
        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-brand-dark/80 via-transparent to-transparent opacity-70" />
        <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(20,18,19,0.5)_100%)]" />

        {/* Layer 3: Elegant Editorial Content Overlay */}
        <div className="relative z-30 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center space-y-4 sm:space-y-6 pt-16 sm:pt-20">
          
          {/* Slide Micro Badge */}
          {activeSlide.badge && (
            <motion.div
              key={`badge-${activeSlide.id}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-surface/85 backdrop-blur-md border border-brand-pink/50 shadow-luxury-pink text-brand-pink text-[10px] sm:text-xs uppercase tracking-[0.25em] font-bold"
            >
              <Sparkles className="w-3 h-3 text-brand-pink animate-pulse" />
              <span>{activeSlide.badge}</span>
            </motion.div>
          )}

          {/* Slide Title */}
          <motion.h1
            key={`title-${activeSlide.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl font-serif font-bold text-white tracking-tight leading-[1.08] text-balance drop-shadow-md"
          >
            {activeSlide.title}
          </motion.h1>

          {/* Slide Subtitle */}
          <motion.p
            key={`subtitle-${activeSlide.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xs sm:text-base md:text-lg text-white/90 max-w-2xl mx-auto font-light leading-relaxed text-balance drop-shadow-sm px-2"
          >
            {activeSlide.subtitle}
          </motion.p>

          {/* Call to Action Button */}
          <motion.div
            key={`cta-${activeSlide.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="pt-2 flex flex-wrap items-center justify-center gap-3"
          >
            <button
              onClick={() => handleCtaClick(activeSlide.ctaLink)}
              className="py-3 px-7 rounded-full bg-brand-blue hover:bg-brand-blueHover text-brand-charcoalDeep font-bold text-xs uppercase tracking-widest shadow-luxury-blue hover:-translate-y-0.5 transition-all flex items-center gap-2 group cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>{activeSlide.ctaText || 'Explore Now'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => openBookingModal('choice')}
              className="py-3 px-6 rounded-full bg-brand-surface/90 hover:bg-brand-surfaceElevated border border-brand-pink/50 text-white font-semibold text-xs uppercase tracking-widest hover:border-brand-pink shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CalendarDays className="w-3.5 h-3.5 text-brand-pink" />
              <span>Reserve Table</span>
            </button>
          </motion.div>

        </div>

        {/* Previous / Next Navigation Arrows (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center justify-between absolute inset-x-4 md:inset-x-8 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <button
            onClick={handlePrev}
            disabled={activeIndex === 0}
            aria-label="Previous slide"
            className={`w-11 h-11 rounded-full bg-brand-surface/80 hover:bg-brand-surface border border-brand-border/40 text-white flex items-center justify-center transition-all pointer-events-auto backdrop-blur-md shadow-lg ${
              activeIndex === 0 ? 'opacity-25 cursor-not-allowed' : 'opacity-90 hover:scale-105 active:scale-95'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleNext}
            disabled={activeIndex === totalSlides - 1}
            aria-label="Next slide"
            className={`w-11 h-11 rounded-full bg-brand-surface/80 hover:bg-brand-surface border border-brand-border/40 text-white flex items-center justify-center transition-all pointer-events-auto backdrop-blur-md shadow-lg ${
              activeIndex === totalSlides - 1 ? 'opacity-25 cursor-not-allowed' : 'opacity-90 hover:scale-105 active:scale-95'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Bar: Slide Indicators & Scroll Hint */}
        <div className="absolute bottom-6 sm:bottom-8 inset-x-0 z-30 flex flex-col items-center justify-center gap-3 pointer-events-none">
          
          {/* Slide Indicator Pills */}
          <div className="flex items-center gap-2 pointer-events-auto px-3 py-1.5 rounded-full bg-brand-surface/70 backdrop-blur-md border border-brand-border/30">
            {slides.map((slide, idx) => {
              const isCurrent = idx === activeIndex;
              return (
                <button
                  key={slide.id}
                  onClick={() => scrollToSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    isCurrent
                      ? 'w-7 bg-brand-pink shadow-[0_0_12px_rgba(237,36,155,0.7)]'
                      : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                />
              );
            })}
          </div>

          {/* Subtle Natural Scroll Hint (Fades out once user starts scrolling) */}
          <div className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.2em] text-white/60 transition-opacity duration-500 ${
            hasScrolled ? 'opacity-0' : 'opacity-80'
          }`}>
            <span>Scroll down for 5 flagship experiences</span>
            <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
          </div>

        </div>

      </div>
    </section>
  );
};
