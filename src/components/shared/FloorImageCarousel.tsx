import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { WebsiteImageItem, WebsiteImageSectionId } from '../../types';
import { websiteImagesService } from '../../services/websiteImagesApi';
import { getWebsiteImagesBySection, DEFAULT_WEBSITE_IMAGES } from '../../data/websiteImagesData';

interface FloorImageCarouselProps {
  floorKey: 'firstFloor' | 'basement';
  section: WebsiteImageSectionId;
  floorLevel: string;
  floorName: string;
  vibe: string;
  accentColor: 'orange' | 'blue';
  autoPlayIntervalMs?: number;
}

export const FloorImageCarousel: React.FC<FloorImageCarouselProps> = ({
  floorKey,
  section,
  floorLevel,
  floorName,
  vibe,
  accentColor,
  autoPlayIntervalMs = 4500,
}) => {
  // Get initial fallback immediately to prevent any flicker or blank layout shift
  const initialSlides = getWebsiteImagesBySection(section, DEFAULT_WEBSITE_IMAGES);
  const [slides, setSlides] = useState<WebsiteImageItem[]>(initialSlides);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<any>(null);

  // Check prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // 1. Fetch latest published images from server with local fallback
  useEffect(() => {
    let mounted = true;
    websiteImagesService.getImages(section).then((items) => {
      if (mounted && items && items.length > 0) {
        setSlides(items);
      }
    }).catch(() => {
      // fallback already set
    });
    return () => {
      mounted = false;
    };
  }, [section]);

  // 2. Tab visibility listener: pause when browser tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabHidden(document.hidden);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, []);

  const totalSlides = slides.length;

  // Navigation handlers
  const goToNext = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    pauseTemporarily();
  };

  // Pause temporarily during user interaction, resume after 4s
  const pauseTemporarily = () => {
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 4000);
  };

  // 3. Autoplay Timer
  useEffect(() => {
    if (totalSlides <= 1 || isPaused || isTabHidden || prefersReducedMotion) {
      return;
    }

    const timer = setInterval(() => {
      goToNext();
    }, autoPlayIntervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [totalSlides, isPaused, isTabHidden, prefersReducedMotion, autoPlayIntervalMs, goToNext]);

  // Cleanup resume timer
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  // 4. Touch & Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    pauseTemporarily();
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Horizontal swipe threshold: 40px and more horizontal than vertical
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // 5. Image error fallback
  const handleImageError = (slideId: string) => {
    setImageErrorMap((prev) => ({ ...prev, [slideId]: true }));
  };

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <div
      className="relative group rounded-2xl overflow-hidden border border-brand-border aspect-[4/3] sm:aspect-[16/10] bg-brand-dark select-none"
      onPointerEnter={() => setIsPaused(true)}
      onPointerLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label={`${floorName} Image Carousel`}
    >
      {/* Slides Container */}
      <div className="absolute inset-0 w-full h-full">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          const isFailed = imageErrorMap[slide.id];
          const displayUrl = isFailed
            ? (floorKey === 'firstFloor' ? '/assets/real/pool_table.png' : '/assets/real/ps5_setup.png')
            : slide.imageUrl;

          return (
            <div
              key={slide.id || idx}
              aria-hidden={!isActive}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={displayUrl}
                alt={slide.altText || slide.title || floorName}
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onError={() => handleImageError(slide.id)}
                className={`w-full h-full object-cover object-center transition-transform duration-700 ${
                  isActive ? 'scale-100 group-hover:scale-105' : 'scale-105'
                } brightness-90 group-hover:brightness-100`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoalDeep/90 via-brand-charcoalDeep/25 to-black/30 pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* Top Overlay Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-dark/90 backdrop-blur-md border border-brand-border text-xs font-semibold text-white shadow-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              accentColor === 'orange' ? 'bg-brand-orange animate-pulse' : 'bg-brand-blue animate-pulse'
            }`}
          />
          {floorLevel}
        </span>

        {/* Live Slide Counter */}
        <span className="px-2.5 py-1 rounded-full bg-brand-dark/80 backdrop-blur-md border border-brand-border/60 text-[11px] font-mono text-brand-subtle">
          {currentIndex + 1} / {totalSlides}
        </span>
      </div>

      {/* Top Right Controls (Pause/Play toggle) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsPaused((prev) => !prev);
          }}
          title={isPaused ? 'Resume autoplay' : 'Pause autoplay'}
          aria-label={isPaused ? 'Resume autoplay' : 'Pause autoplay'}
          className="p-2 rounded-full bg-brand-dark/85 backdrop-blur-md border border-brand-border/80 text-white hover:text-brand-orange transition-colors"
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Arrows */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              pauseTemporarily();
              goToPrev();
            }}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-brand-dark/80 hover:bg-brand-dark text-white border border-brand-border/80 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-300 shadow-xl hover:scale-110"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              pauseTemporarily();
              goToNext();
            }}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-brand-dark/80 hover:bg-brand-dark text-white border border-brand-border/80 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-300 shadow-xl hover:scale-110"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Bottom Title & Vibe Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-20 p-3 sm:p-3.5 rounded-xl bg-brand-dark/85 backdrop-blur-md border border-brand-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
        <div className="truncate pr-2">
          <p className="text-white font-medium truncate text-xs sm:text-sm">
            {currentSlide?.title || floorName}
          </p>
          {currentSlide?.subtitle && (
            <p className="text-brand-subtle text-[11px] truncate hidden sm:block">
              {currentSlide.subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t border-brand-border/40 sm:border-0">
          <span className="text-brand-muted text-[11px] sm:hidden">Vibe:</span>
          <span
            className={`font-serif italic text-xs sm:text-sm ${
              accentColor === 'orange' ? 'text-brand-orange' : 'text-brand-blue'
            }`}
          >
            {vibe}
          </span>
        </div>
      </div>

      {/* Pagination Dot Indicators */}
      {totalSlides > 1 && (
        <div className="absolute bottom-1.5 left-0 right-0 z-20 flex justify-center items-center gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(idx);
              }}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? `w-6 ${accentColor === 'orange' ? 'bg-brand-orange' : 'bg-brand-blue'}`
                  : 'w-1.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
