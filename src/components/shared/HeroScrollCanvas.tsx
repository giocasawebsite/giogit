import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';
import { InteractiveHeroText } from './InteractiveHeroText';

const TOTAL_FRAMES = 80;

export const HeroScrollCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isBlastJerk, setIsBlastJerk] = useState(false);
  const [isInView, setIsInView] = useState(true);

  const lastRenderedFrameRef = useRef<number>(-1);
  const canvasDimensionsRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  // Listen for Letter Blast Shockwave Event
  useEffect(() => {
    const handleBlast = () => {
      setIsBlastJerk(true);
      setTimeout(() => setIsBlastJerk(false), 550);
    };

    window.addEventListener('giocasa-letter-blast', handleBlast);
    return () => window.removeEventListener('giocasa-letter-blast', handleBlast);
  }, []);

  // Framer motion scroll progress for the hero track
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Transform scroll progress [0, 1] to frame index [0, 79]
  const frameIndexProgress = useTransform(scrollYProgress, [0, 1], [0, TOTAL_FRAMES - 1]);

  // Headline Opacity & Y transforms
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.10], [1, 0]);
  const headlineY = useTransform(scrollYProgress, [0, 0.10], [0, -40]);
  const headlinePointerEvents = useTransform(scrollYProgress, val => (val <= 0.05 ? 'auto' : 'none'));

  // IntersectionObserver to pause rendering when scrolled past the hero section
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries[0]?.isIntersecting ?? true;
        setIsInView(isVisible);
      },
      { rootMargin: '100px 0px 100px 0px', threshold: 0 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Sync canvas dimensions with display pixel ratio — ONLY on resize or mount (Never in rAF loop)
  const syncCanvasResolution = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for mobile GPU battery & performance
    const physicalWidth = Math.round(rect.width * dpr);
    const physicalHeight = Math.round(rect.height * dpr);

    if (
      canvas.width !== physicalWidth ||
      canvas.height !== physicalHeight ||
      canvasDimensionsRef.current.dpr !== dpr
    ) {
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
      canvasDimensionsRef.current = {
        width: physicalWidth,
        height: physicalHeight,
        dpr,
      };
      // Invalidate last rendered frame so canvas redraws at new dimensions
      lastRenderedFrameRef.current = -1;
    }
  }, []);

  // Handle Resize passively
  useEffect(() => {
    syncCanvasResolution();
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(syncCanvasResolution, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [syncCanvasResolution]);

  // Mobile-Optimized Progressive Frame Preloader
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const loadedImages: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    let isCancelled = false;

    // 1. Load First Frame IMMEDIATELY so hero is visible in < 50ms
    const firstImg = new Image();
    firstImg.src = '/assets/finalgiocasa_000/finalgiocasa_000.jpg';
    firstImg.onload = () => {
      if (isCancelled) return;
      loadedImages[0] = firstImg;
      setImages([...loadedImages]);
      setIsReady(true);
    };

    // 2. Progressive background batching
    // On mobile screens, scrub resolution of 25-27 keyframes feels visually identical while saving 75% memory & data
    const step = isMobile ? 3 : 1;
    const frameQueue: number[] = [];
    for (let i = 1; i < TOTAL_FRAMES; i += step) {
      frameQueue.push(i);
    }

    let currentIndex = 0;
    const BATCH_SIZE = isMobile ? 3 : 5;

    const loadNextBatch = () => {
      if (isCancelled || currentIndex >= frameQueue.length) return;

      const end = Math.min(currentIndex + BATCH_SIZE, frameQueue.length);
      const batchPromises: Promise<void>[] = [];

      for (let j = currentIndex; j < end; j++) {
        const frameIndex = frameQueue[j];
        const p = new Promise<void>((resolve) => {
          const img = new Image();
          const frameNum = String(frameIndex).padStart(3, '0');
          img.src = `/assets/finalgiocasa_000/finalgiocasa_${frameNum}.jpg`;

          if (typeof img.decode === 'function') {
            img.decode().then(() => {
              if (!isCancelled) loadedImages[frameIndex] = img;
              resolve();
            }).catch(() => {
              img.onload = () => {
                if (!isCancelled) loadedImages[frameIndex] = img;
                resolve();
              };
              img.onerror = () => resolve();
            });
          } else {
            img.onload = () => {
              if (!isCancelled) loadedImages[frameIndex] = img;
              resolve();
            };
            img.onerror = () => resolve();
          }
        });
        batchPromises.push(p);
      }

      currentIndex = end;

      Promise.all(batchPromises).then(() => {
        if (!isCancelled) {
          setImages([...loadedImages]);
          // Schedule next batch during idle time or slight delay
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            (window as any).requestIdleCallback(loadNextBatch, { timeout: 250 });
          } else {
            setTimeout(loadNextBatch, 40);
          }
        }
      });
    };

    // Kick off progressive background loader shortly after initial mount
    const startTimer = setTimeout(loadNextBatch, 80);

    return () => {
      isCancelled = true;
      clearTimeout(startTimer);
    };
  }, []);

  // Frame Render Function (Executes ONLY when frame index changes or on viewport entry)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isInView) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      if (!isInView) return;

      const progress = frameIndexProgress.get();
      const targetFrame = Math.min(
        TOTAL_FRAMES - 1,
        Math.max(0, Math.round(progress))
      );

      // Only draw if target frame has changed or canvas was invalidated
      if (targetFrame !== lastRenderedFrameRef.current) {
        // Find exact image or fallback to closest loaded image
        let img = images[targetFrame];
        if (!img || !img.complete || img.naturalWidth === 0) {
          // Search backwards for nearest ready frame
          for (let f = targetFrame - 1; f >= 0; f--) {
            if (images[f] && images[f].complete && images[f].naturalWidth > 0) {
              img = images[f];
              break;
            }
          }
        }

        if (img && img.complete && img.naturalWidth > 0) {
          const { width: canvasWidth, height: canvasHeight } = canvasDimensionsRef.current;

          if (canvasWidth > 0 && canvasHeight > 0) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium'; // 'medium' is 3x faster than 'high' on mobile GPUs with 0 visible loss

            const imgRatio = img.naturalWidth / img.naturalHeight;
            const canvasRatio = canvasWidth / canvasHeight;

            let renderWidth: number;
            let renderHeight: number;
            let offsetX = 0;
            let offsetY = 0;

            if (canvasRatio > imgRatio) {
              renderWidth = canvasWidth;
              renderHeight = Math.round(canvasWidth / imgRatio);
              offsetY = Math.round((canvasHeight - renderHeight) / 2);
            } else {
              renderHeight = canvasHeight;
              renderWidth = Math.round(canvasHeight * imgRatio);
              offsetX = Math.round((canvasWidth - renderWidth) / 2);
            }

            ctx.drawImage(
              img,
              0,
              0,
              img.naturalWidth,
              img.naturalHeight,
              offsetX,
              offsetY,
              renderWidth,
              renderHeight
            );

            lastRenderedFrameRef.current = targetFrame;
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [images, frameIndexProgress, isInView, isReady]);

  return (
    <div ref={containerRef} className="relative h-[180vh] sm:h-[260vh] bg-brand-dark">
      
      {/* Sticky Pinned Viewport Container with Explosion Jerk Shockwave */}
      <motion.div 
        animate={
          isBlastJerk
            ? {
                x: [0, -22, 22, -16, 14, -8, 4, 0],
                y: [0, 16, -16, 11, -8, 5, -2, 0],
                rotate: [0, -1.8, 1.8, -1.1, 0.7, -0.3, 0],
                scale: [1, 1.04, 0.985, 1.02, 1],
              }
            : { x: 0, y: 0, rotate: 0, scale: 1 }
        }
        transition={{ duration: 0.52, ease: 'easeOut' }}
        className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center will-change-transform"
      >
        {/* Flash Impact Glow on Blast */}
        {isBlastJerk && (
          <motion.div
            initial={{ opacity: 0.85, scale: 0.7 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="absolute inset-0 z-30 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0%,rgba(200,90,50,0.35)_40%,transparent_75%)] pointer-events-none"
          />
        )}
        
        {/* Background High-DPI Image Sequence Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ imageRendering: 'auto' }}
        />

        {/* Lightweight Cinematic Scrim (Preserving Full Natural Video Clarity) */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-transparent to-brand-dark/40 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(18,16,14,0.6)_100%)] pointer-events-none" />

        {/* HERO BRANDING ONLY: Sized and aligned precisely inside the TV screen display */}
        <motion.div
          style={{ 
            opacity: headlineOpacity, 
            y: headlineY,
            pointerEvents: headlinePointerEvents as any,
          }}
          className="relative z-10 w-[82vw] xs:w-[72vw] sm:w-[50vw] md:w-[40vw] max-w-[460px] mx-auto text-center my-auto -translate-y-2 sm:-translate-y-4 flex items-center justify-center pointer-events-auto overflow-visible"
        >
          <InteractiveHeroText sizeClassName="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl" />
        </motion.div>

      </motion.div>
    </div>
  );
};
