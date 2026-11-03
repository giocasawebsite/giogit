import React, { useState } from 'react';
import { nightExperiences } from '../../data/experiencesData';
import { useBookingModal } from '../../context/BookingModalContext';
import { 
  Sparkles, 
  Clock, 
  Users, 
  ArrowRight, 
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ExperiencePlanner: React.FC = () => {
  const [selectedNightId, setSelectedNightId] = useState(nightExperiences[0].id);
  const { openBookingModal } = useBookingModal();

  const currentNight = nightExperiences.find(n => n.id === selectedNightId) || nightExperiences[0];

  return (
    <div className="space-y-8">
      {/* Experience Selection Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start lg:justify-center">
        {nightExperiences.map(exp => {
          const isSelected = selectedNightId === exp.id;
          return (
            <button
              key={exp.id}
              onClick={() => setSelectedNightId(exp.id)}
              className={`px-3.5 py-2 sm:px-5 sm:py-3 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                isSelected
                  ? 'bg-brand-terracotta text-brand-cream shadow-luxury-ember border border-brand-terracotta'
                  : 'bg-brand-surface border border-brand-border text-brand-subtle hover:text-brand-cream hover:border-brand-borderStrong'
              }`}
            >
              <span>{exp.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active Experience Card */}
      <div className="bg-brand-surface rounded-3xl border border-brand-border overflow-hidden shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentNight.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 p-4 sm:p-8 lg:p-10 items-center"
          >
            {/* Image (5 cols) */}
            <div className="lg:col-span-5 relative rounded-2xl overflow-hidden aspect-[4/3] bg-brand-dark border border-brand-border">
              <img
                src={currentNight.image}
                alt={currentNight.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover brightness-95"
              />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-full bg-brand-dark/90 backdrop-blur-md border border-brand-border text-[11px] font-medium text-brand-gold">
                  {currentNight.duration}
                </span>
              </div>
            </div>

            {/* Details (7 cols) */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5">
              <div>
                <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-brand-terracotta font-semibold block mb-1">
                  Ideal For: {currentNight.idealFor}
                </span>
                <h3 className="font-serif text-2xl sm:text-4xl font-bold text-brand-cream tracking-tight">
                  {currentNight.title}
                </h3>
                <p className="font-italic-accent text-lg text-brand-gold italic mt-1">
                  {currentNight.tagline}
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <span className="text-xs uppercase tracking-widest text-brand-subtle font-semibold block">
                  What’s Included in This Experience:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentNight.includes.map((inc, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-brand-surfaceElevated border border-brand-border/60 text-xs text-brand-cream flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-terracotta shrink-0 mt-0.5" />
                      <span className="leading-snug">{inc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking Action */}
              <div className="pt-4 border-t border-brand-border/40 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => openBookingModal(currentNight.bookingType)}
                  className="py-3.5 px-6 rounded-full bg-brand-terracotta text-brand-cream font-semibold text-xs uppercase tracking-widest hover:bg-brand-terracottaHover transition-all shadow-luxury-ember flex items-center gap-2 group"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>Plan Your {currentNight.title.split(' ')[1] || 'Night'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <span className="text-xs text-brand-muted font-mono">
                  Custom group coordination included
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
