import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gamingZones } from '../../data/gamingData';
import { useBookingModal } from '../../context/BookingModalContext';
import { 
  Tv, 
  Sparkles, 
  Gamepad2, 
  CircleDot, 
  Users, 
  Trophy, 
  ArrowRight, 
  CheckCircle2 
} from 'lucide-react';

export const GamingHoverShowcase: React.FC = () => {
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);
  const { openBookingModal } = useBookingModal();

  const currentZone = gamingZones[activeZoneIndex];

  const zoneIcons = [
    { type: 'ps5', icon: Gamepad2, label: 'PS5 4K Arena' },
    { type: 'pool', icon: CircleDot, label: '8-Ball Slate Pool' },
    { type: 'foosball', icon: Trophy, label: 'Pro Foosball' },
    { type: 'boardgames', icon: Sparkles, label: '50+ Board Games' },
  ];

  return (
    <div className="w-full bg-brand-surface rounded-3xl border border-brand-border overflow-hidden shadow-2xl">
      {/* Zone Interactive Header Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 p-2 bg-brand-dark/95 border-b border-brand-border/60 gap-1.5">
        {gamingZones.map((zone, idx) => {
          const isSelected = activeZoneIndex === idx;
          const iconObj = zoneIcons.find(z => z.type === zone.type) || { icon: Gamepad2 };
          const Icon = iconObj.icon;

          return (
            <button
              key={zone.id}
              onClick={() => setActiveZoneIndex(idx)}
              onMouseEnter={() => setActiveZoneIndex(idx)}
              className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl text-left transition-all duration-300 flex items-center gap-2 sm:gap-3 ${
                isSelected
                  ? 'bg-brand-surfaceElevated border border-brand-blue/60 shadow-luxury-blue'
                  : 'hover:bg-brand-surface/60 border border-transparent text-brand-subtle'
              }`}
            >
              <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0 ${isSelected ? 'bg-brand-blue text-brand-charcoalDeep font-bold' : 'bg-brand-dark text-brand-subtle'}`}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-brand-blue font-semibold block">
                  0{idx + 1}
                </span>
                <span className={`font-serif text-xs sm:text-base font-bold block truncate ${isSelected ? 'text-white' : 'text-brand-subtle'}`}>
                  {zone.name.split(' ')[0]} {zone.name.split(' ')[1] || ''}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content Visualizer */}
      <div className="p-4 sm:p-8 lg:p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentZone.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
          >
            {/* Real Venue Photo Display (6 cols) */}
            <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-brand-border bg-brand-dark aspect-[4/3] group shadow-2xl">
              <img
                src={currentZone.image}
                alt={currentZone.name}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-90 group-hover:brightness-100"
              />

              {/* Top Rate Pill */}
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-dark/90 backdrop-blur-md border border-brand-border text-xs font-mono font-bold text-brand-blue">
                  {currentZone.ratePerHour}
                </span>
              </div>

              {/* Bottom Capacity Pill */}
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-brand-dark/85 backdrop-blur-md border border-brand-border/60 flex items-center justify-between text-xs">
                <span className="text-brand-subtle flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-brand-pink" />
                  {currentZone.playersCapacity}
                </span>
                <span className="text-white font-medium">Ayodhya 1st Floor Lounge</span>
              </div>
            </div>

            {/* Zone Specs & Titles (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-brand-pink font-semibold block mb-1">
                  {currentZone.subtitle}
                </span>
                <h3 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  {currentZone.name}
                </h3>
              </div>

              <p className="text-sm sm:text-base text-brand-subtle font-light leading-relaxed">
                {currentZone.description}
              </p>

              {/* Hardware / Facility Specs */}
              <div className="space-y-2.5">
                <span className="text-xs uppercase tracking-widest text-brand-blue font-semibold block">
                  Hardware & Setup:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentZone.specs.map((spec, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-2.5 rounded-xl bg-brand-surfaceElevated border border-brand-border/60 text-xs text-white flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-blue shrink-0 mt-0.5" />
                      <span className="leading-snug">{spec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular Games / Highlights Tags */}
              {currentZone.popularGames && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs uppercase tracking-widest text-brand-subtle font-semibold block">
                    Featured Titles:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentZone.popularGames.slice(0, 6).map((g, gIdx) => (
                      <span
                        key={gIdx}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-brand-surfaceElevated border border-brand-border text-white"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-brand-border/40 flex items-center gap-4">
                <button
                  onClick={() => openBookingModal('gaming')}
                  className="py-3.5 px-6 rounded-full bg-brand-pink text-white font-semibold text-xs uppercase tracking-widest hover:bg-brand-pinkHover transition-all shadow-luxury-pink flex items-center gap-2 group"
                >
                  <span>Book This Zone</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <span className="text-xs text-brand-muted font-light">
                  Direct food service to station
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
