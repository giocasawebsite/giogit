import React, { useEffect, useRef, useState } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';
import { InteractiveHeroText } from './InteractiveHeroText';

const TOTAL_FRAMES = 80;

export const HeroScrollCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isBlastJerk, setIsBlastJerk] = useState(false);

  // Listen for Letter Blast Shockwave Event
  useEffect(() => {
    const handleBlast = () => {
      setIsBlastJerk(true);
      setTimeout(() => setIsBlastJerk(false), 550);
    };

    window.addEventListener('giocasa-letter-blast', handleBlast);
    return () => window.removeEventListener('giocasa-letter-blast', handleBlast);
  }, []);

  // Framer motion scroll progress for the 260vh hero track
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Transform scroll progress [0, 1] to frame index [0, 79]
  const frameIndexProgress = useTransform(scrollYProgress, [0, 1], [0, TOTAL_FRAMES - 1]);

  // STATE 1 & 2: Hero Intro Content is 100% visible at 0%, fades and moves up between 0% and 10% scroll, completely gone at 10%
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.10], [1, 0]);
  const headlineY = useTransform(scrollYProgress, [0, 0.10], [0, -40]);
  const headlinePointerEvents = useTransform(scrollYProgress, val => (val <= 0.05 ? 'auto' : 'none'));

  // Preload and decode high-quality image sequence asynchronously
  useEffect(() => {
    let loadedCount = 0;
    const loadedImages: HTMLImageElement[] = [];

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = String(i).padStart(3, '0');
      img.src = `/assets/finalgiocasa_000/finalgiocasa_${frameNum}.jpg`;

      // Use async decoding for maximum GPU rasterization quality & zero jank
      if (typeof img.decode === 'function') {
        img.decode()
          .then(() => {
            loadedCount++;
            if (loadedCount >= 10 && !isReady) {
              setIsReady(true);
            }
          })
          .catch(() => {
            img.onload = () => {
              loadedCount++;
              if (loadedCount >= 10 && !isReady) {
                setIsReady(true);
              }
            };
          });
      } else {
        img.onload = () => {
          loadedCount++;
          if (loadedCount >= 10 && !isReady) {
            setIsReady(true);
          }
        };
      }

      img.onerror = () => {
        loadedCount++;
      };

      loadedImages.push(img);
    }

    setImages(loadedImages);
  }, []);

  // Handle Resize and Retina Device Pixel Ratio synchronization
  const lastDimensions = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  const syncCanvasResolution = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5); // Optimal high-DPI scaling

    const physicalWidth = Math.round(rect.width * dpr);
    const physicalHeight = Math.round(rect.height * dpr);

    if (
      canvas.width !== physicalWidth ||
      canvas.height !== physicalHeight ||
      lastDimensions.current.dpr !== dpr
    ) {
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
      lastDimensions.current = {
        width: physicalWidth,
        height: physicalHeight,
        dpr: dpr,
      };
    }
  };

  useEffect(() => {
    syncCanvasResolution();
    window.addEventListener('resize', syncCanvasResolution, { passive: true });
    return () => window.removeEventListener('resize', syncCanvasResolution);
  }, []);

  // High-Quality Frame Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const progress = frameIndexProgress.get();
      const currentFrame = Math.min(
        TOTAL_FRAMES - 1,
        Math.max(0, Math.round(progress))
      );

      const img = images[currentFrame];

      if (img && img.complete && img.naturalWidth > 0) {
        syncCanvasResolution();

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        if (canvasWidth > 0 && canvasHeight > 0) {
          // Enable maximum bicubic/lanczos high quality image interpolation
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Exact pixel-perfect aspect ratio cover math
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
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrameId);
  }, [images, frameIndexProgress, isReady]);

  return (
    <div ref={containerRef} className="relative h-[260vh] bg-brand-dark">
      
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
        className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center"
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
