import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { businessConfig } from '../../data/businessConfig';
import { useBookingModal } from '../../context/BookingModalContext';
import { 
  Flame, 
  Gamepad2, 
  Coffee, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Tv, 
  Layers 
} from 'lucide-react';

export const DualFloorToggle: React.FC = () => {
  const [activeFloor, setActiveFloor] = useState<'downstairs' | 'upstairs'>('downstairs');
  const { openBookingModal } = useBookingModal();

  const floor = businessConfig.floors[activeFloor];

  return (
    <div className="w-full bg-brand-surface rounded-3xl border border-brand-border overflow-hidden shadow-2xl">
      {/* Floor Selector Tab Bar */}
      <div className="grid grid-cols-2 p-2 bg-brand-dark/90 border-b border-brand-border/60">
        <button
          onClick={() => setActiveFloor('downstairs')}
          className={`py-3 sm:py-4 px-2 sm:px-4 rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2.5 transition-all text-xs sm:text-sm font-semibold uppercase tracking-wider ${
            activeFloor === 'downstairs'
              ? 'bg-brand-surfaceElevated text-white border border-brand-orange/50 shadow-luxury-orange'
              : 'text-brand-subtle hover:text-white'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeFloor === 'downstairs' ? 'text-brand-orange' : 'text-brand-muted'}`} />
          <span className="hidden xs:inline">Downstairs • Dine</span>
          <span className="xs:hidden">Dine</span>
        </button>

        <button
          onClick={() => setActiveFloor('upstairs')}
          className={`py-3 sm:py-4 px-2 sm:px-4 rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2.5 transition-all text-xs sm:text-sm font-semibold uppercase tracking-wider ${
            activeFloor === 'upstairs'
              ? 'bg-brand-surfaceElevated text-white border border-brand-blue/50 shadow-luxury-blue'
              : 'text-brand-subtle hover:text-white'
          }`}
        >
          <Gamepad2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeFloor === 'upstairs' ? 'text-brand-blue' : 'text-brand-muted'}`} />
          <span className="hidden xs:inline">Upstairs • Play</span>
          <span className="xs:hidden">Play</span>
        </button>
      </div>

      {/* Dynamic Floor Content with Framer Motion */}
      <div className="p-4 sm:p-8 lg:p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFloor}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
          >
            {/* Floor Visual Presentation (6 cols) */}
            <div className="lg:col-span-6 relative group rounded-2xl overflow-hidden border border-brand-border aspect-[4/3] sm:aspect-[16/10] bg-brand-dark">
              <img
                src={
                  activeFloor === 'downstairs'
                    ? 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80'
                    : '/assets/real/foosball_lounge.png'
                }
                alt={floor.name}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-90 group-hover:brightness-100"
              />
              
              {/* Overlay Badge */}
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-dark/90 backdrop-blur-md border border-brand-border text-xs font-semibold text-white">
                  <span className={`w-2 h-2 rounded-full ${activeFloor === 'downstairs' ? 'bg-brand-orange' : 'bg-brand-blue'}`} />
                  {floor.level}
                </span>
              </div>

              {/* Bottom Vibe Tag */}
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-brand-dark/85 backdrop-blur-md border border-brand-border/60 flex items-center justify-between text-xs">
                <span className="text-white font-medium">Vibe</span>
                <span className={`font-serif italic text-sm ${activeFloor === 'downstairs' ? 'text-brand-orange' : 'text-brand-blue'}`}>{floor.vibe}</span>
              </div>
            </div>

            {/* Floor Details & Key Features (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <span className={`text-xs uppercase tracking-[0.25em] font-semibold block mb-2 ${activeFloor === 'downstairs' ? 'text-brand-orange' : 'text-brand-blue'}`}>
                  {floor.level}
                </span>
                <h3 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
                  {floor.name}
                </h3>
              </div>

              <p className="text-brand-subtle text-sm sm:text-base font-light leading-relaxed">
                {floor.idealFor}
              </p>

              {/* Highlights List */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs uppercase tracking-widest text-white/80 font-semibold">
                  Key Experiences:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {floor.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-brand-surfaceElevated border border-brand-border/60 flex items-start gap-2.5"
                    >
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${activeFloor === 'downstairs' ? 'text-brand-orange' : 'text-brand-blue'}`} />
                      <span className="text-xs text-white font-medium leading-snug">
                        {h}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-brand-border/40">
                <button
                  onClick={() => openBookingModal(activeFloor === 'downstairs' ? 'dining' : 'gaming')}
                  className={`py-3.5 px-6 rounded-full font-semibold text-xs uppercase tracking-widest transition-all flex items-center gap-2 group ${
                    activeFloor === 'downstairs'
                      ? 'bg-brand-orange hover:bg-brand-orangeHover text-brand-charcoalDeep shadow-luxury-orange'
                      : 'bg-brand-blue hover:bg-brand-blueHover text-brand-charcoalDeep shadow-luxury-blue'
                  }`}
                >
                  <span>{activeFloor === 'downstairs' ? 'Reserve Dining Table' : 'Book Gaming Station'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <span className="text-xs text-brand-muted font-light">
                  {activeFloor === 'downstairs' ? 'Pizza fired at 450°C' : '4K 120Hz & Slate Pool'}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
