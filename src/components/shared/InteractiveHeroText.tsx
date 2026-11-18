import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface LetterItem {
  char: string;
  index: number;
}

interface InteractiveHeroTextProps {
  className?: string;
  sizeClassName?: string;
}

export const InteractiveHeroText: React.FC<InteractiveHeroTextProps> = ({
  className = '',
  sizeClassName = 'text-3xl xs:text-4xl sm:text-6xl md:text-7xl lg:text-8xl',
}) => {
  const letters: LetterItem[] = 'GIOCASA'.split('').map((char, index) => ({ char, index }));

  return (
    <div className={`relative z-20 flex items-center justify-center text-center mx-auto ${sizeClassName} leading-none font-serif font-bold tracking-tight select-none pointer-events-auto w-full overflow-visible ${className}`}>
      {letters.map(({ char, index }) => (
        <IndividualInteractiveLetter key={index} char={char} index={index} />
      ))}
    </div>
  );
};

interface IndividualLetterProps {
  char: string;
  index: number;
}

const IndividualInteractiveLetter: React.FC<IndividualLetterProps> = ({ char, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [isExploded, setIsExploded] = useState(false);
  const [isRespawning, setIsRespawning] = useState(false);

  const spanRef = useRef<HTMLSpanElement>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset heat/anger back to calm state if idle for 2 seconds
  const resetCooldown = () => {
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setTapCount(0);
    }, 2000);
  };

  const handleTap = async (e: React.MouseEvent | React.TouchEvent) => {
    if (isExploded) return;

    const newCount = tapCount + 1;
    setTapCount(newCount);
    setIsPressed(true);

    // EXPLOSION TRIGGER AT 10 TAPS!
    if (newCount >= 10) {
      setIsExploded(true);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);

      // Dispatch Global Jerk / Shockwave Event for Hero & Navbar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('giocasa-letter-blast', {
          detail: { char, index }
        }));
      }

      // Trigger Confetti Blast from Exact Letter Position (Dynamically Loaded)
      if (spanRef.current) {
        const rect = spanRef.current.getBoundingClientRect();
        const originX = (rect.left + rect.width / 2) / window.innerWidth;
        const originY = (rect.top + rect.height / 2) / window.innerHeight;

        try {
          const { default: confetti } = await import('canvas-confetti');
          confetti({
            particleCount: 90,
            spread: 85,
            origin: { x: originX, y: originY },
            colors: ['#C85A32', '#C5A059', '#FBF8F3', '#FF3B30', '#53624D', '#FFA500'],
            startVelocity: 35,
            scalar: 1.15,
          });
        } catch {
          // graceful fallback
        }
      }

      // Respawn letter after explosion
      setTimeout(() => {
        setIsExploded(false);
        setIsRespawning(true);
        setTapCount(0);

        setTimeout(() => {
          setIsRespawning(false);
        }, 1200);
      }, 1200);

      return;
    }

    resetCooldown();
  };

  const springTransition = {
    type: 'spring' as const,
    stiffness: 450 + tapCount * 30,
    damping: 12,
    mass: 0.5,
  };

  const tiltAngle = index % 2 === 0 ? -6 : 6;

  // Escalating shake jitter array representing feeling & frustration
  const shakeIntensity = tapCount >= 8 ? 9 : tapCount >= 5 ? 5 : tapCount >= 2 ? 2.5 : 0;
  const shakeArray = tapCount >= 8
    ? [-shakeIntensity, shakeIntensity, -shakeIntensity * 0.7, shakeIntensity * 0.7, 0]
    : tapCount >= 4
    ? [-shakeIntensity, shakeIntensity, 0]
    : [0];

  // Dynamic Heat & Glow Color based on Tap Intensity (Optimized for Visibility)
  const getLetterColor = () => {
    if (tapCount >= 8) return '#FF3B30'; // Critical Overload Red
    if (tapCount >= 5) return '#FF9500'; // Hot Ember Orange
    if (tapCount >= 2) return '#E05A2B'; // Agitated Bright Terracotta
    if (isHovered) return '#C5A059'; // Warm Luxury Gold on hover
    return '#C85A32'; // Signature Brand Terracotta (High Contrast on White & Light Screens)
  };

  const getGlowFilter = () => {
    if (tapCount >= 8) return 'drop-shadow(0 4px 20px rgba(255,59,48,0.95)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))';
    if (tapCount >= 5) return 'drop-shadow(0 4px 18px rgba(255,149,0,0.85)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))';
    if (tapCount >= 2) return 'drop-shadow(0 4px 14px rgba(200,90,50,0.85)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))';
    if (isHovered) return 'drop-shadow(0 0 25px rgba(197,160,89,0.95)) drop-shadow(0 3px 8px rgba(0,0,0,0.6))';
    // Clean high-definition crisp drop shadow
    return 'drop-shadow(0 2px 10px rgba(0,0,0,0.4))';
  };

  const isInteracting = isHovered || isPressed || tapCount > 0 || isExploded || isRespawning;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${
        !isInteracting ? 'animate-subtle-float' : ''
      }`}
      style={!isInteracting ? { animationDelay: `${(index % 4) * 0.35}s` } : undefined}
    >
      {/* Main Interactive Living Letter with Feeling & Explosion Physics */}
      <motion.span
        ref={spanRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={handleTap}
        onMouseUp={() => setIsPressed(false)}
        onTouchStart={handleTap}
        onTouchEnd={() => setIsPressed(false)}
        animate={
          isExploded
            ? {
                scale: [1, 2.8, 0],
                rotate: [0, 180, 720],
                opacity: [1, 1, 0],
                filter: 'drop-shadow(0 0 60px rgba(255,255,255,1))',
              }
            : isRespawning
            ? {
                y: [-80, 10, -4, 0],
                scale: [0, 1.3, 0.95, 1],
                opacity: [0, 1, 1, 1],
                rotate: [0, -12, 6, 0],
                color: '#C5A059',
              }
            : isPressed
            ? {
                scaleX: 1.4 + tapCount * 0.05,
                scaleY: Math.max(0.4, 0.65 - tapCount * 0.03),
                y: 8,
                x: shakeArray,
                color: getLetterColor(),
                filter: getGlowFilter(),
              }
            : isHovered
            ? {
                scaleX: 0.82,
                scaleY: 1.28 + tapCount * 0.04,
                y: -16 - tapCount * 2,
                x: shakeArray,
                rotate: tiltAngle,
                color: getLetterColor(),
                filter: getGlowFilter(),
              }
            : {
                scaleX: 1 + tapCount * 0.02,
                scaleY: 1 + tapCount * 0.02,
                y: 0,
                x: shakeArray,
                color: getLetterColor(),
                filter: getGlowFilter(),
              }
        }
        transition={
          isExploded
            ? { duration: 0.35, ease: 'easeOut' }
            : isRespawning
            ? { duration: 0.7, ease: 'backOut' }
            : isHovered || isPressed || tapCount > 0
            ? springTransition
            : {
                duration: 0.2,
                scaleX: springTransition,
                scaleY: springTransition,
                color: { duration: 0.2 },
              }
        }
        className="relative z-30 inline-flex items-center justify-center origin-bottom cursor-pointer transition-colors duration-200 py-3 px-0.5 sm:px-1 pointer-events-auto touch-manipulation"
        style={{ touchAction: 'manipulation' }}
      >
        {char}
      </motion.span>
    </div>
  );
};
