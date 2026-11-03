import React from 'react';
import { PageRoute } from '../types';
import { upcomingEvents } from '../data/eventsData';
import { eventPackages } from '../data/experiencesData';
import { useBookingModal } from '../context/BookingModalContext';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EventPackageCalculator } from '../components/shared/EventPackageCalculator';
import { 
  Trophy, 
  Calendar, 
  Clock, 
  PartyPopper, 
  Sparkles, 
  Users, 
  Check, 
  ArrowRight,
  Flame,
  Gamepad2 
} from 'lucide-react';

interface EventsPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({ onNavigate }) => {
  const { openBookingModal } = useBookingModal();

  return (
    <div className="min-h-screen bg-brand-dark text-brand-cream pt-28 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-terracotta selection:text-white">
      <div className="max-w-7xl mx-auto space-y-20 sm:space-y-28">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-[0.25em] text-brand-gold font-semibold block">
            Tournaments & Celebrations
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-brand-cream">
            Events at GioCasa
          </h1>
          <p className="font-italic-accent text-xl sm:text-2xl text-brand-terracotta italic">
            Where Ayodhya Gathers to Play & Celebrate
          </p>
          <p className="text-sm sm:text-base text-brand-subtle font-light max-w-xl mx-auto leading-relaxed">
            From official EA Sports FC gaming championships and pool knockouts to private birthday feasts and group mixers.
          </p>
        </div>

        {/* 1. UPCOMING TOURNAMENTS & GAME NIGHTS */}
        <div className="space-y-12">
          <SectionHeader
            tag="Official Schedule"
            title="Upcoming Community Events"
            titleItalic="Test your skills."
            subtitle="Register for tournament slots, prize pools, and community game nights."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {upcomingEvents.map(evt => (
              <div
                key={evt.id}
                className="bg-brand-surface rounded-3xl border border-brand-border overflow-hidden flex flex-col justify-between shadow-xl hover:border-brand-gold/50 transition-all duration-300 group"
              >
                <div className="relative aspect-[16/9] bg-brand-dark overflow-hidden">
                  <img
                    src={evt.image}
                    alt={evt.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover brightness-90 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 rounded-full bg-brand-dark/90 backdrop-blur-md border border-brand-border text-xs font-mono font-bold text-brand-gold">
                      {evt.date}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-brand-terracotta/90 backdrop-blur-md text-white text-[11px] font-semibold uppercase tracking-wider">
                      {evt.dayOfWeek}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-brand-gold font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{evt.time}</span>
                    </div>

                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-brand-cream group-hover:text-brand-gold transition-colors">
                      {evt.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-brand-subtle font-light leading-relaxed">
                      {evt.description}
                    </p>

                    {evt.prizePool && (
                      <div className="p-3.5 rounded-xl bg-brand-surfaceElevated border border-brand-border/60 text-xs text-brand-gold flex items-start gap-2.5">
                        <Trophy className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-brand-cream">Prize Pool & Honors:</strong>
                          <span>{evt.prizePool}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-brand-border/40 flex items-center justify-between">
                    <span className="text-xs text-brand-muted font-mono font-semibold">
                      {evt.entryFee || 'Free with order'}
                    </span>

                    <button
                      onClick={() => openBookingModal('event')}
                      className="py-2.5 px-6 rounded-full bg-brand-gold text-brand-dark font-bold text-xs uppercase tracking-widest hover:bg-[#D4AF37] transition-all shadow-md flex items-center gap-1.5"
                    >
                      <span>Register Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. PRIVATE BIRTHDAY & GROUP PACKAGES */}
        <div className="space-y-12">
          <SectionHeader
            tag="Celebrations & Partying"
            title="Curated Event Packages"
            titleItalic="Hassle-free group hosting."
            subtitle="Choose a package or use our interactive builder below to customize your celebration."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {eventPackages.map(pkg => (
              <div
                key={pkg.id}
                className={`p-8 rounded-3xl bg-brand-surface flex flex-col justify-between space-y-6 transition-all duration-300 shadow-xl ${
                  pkg.popular
                    ? 'border-2 border-brand-terracotta relative shadow-luxury-ember bg-brand-surfaceElevated'
                    : 'border border-brand-border'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-3.5 py-1 rounded-full bg-brand-terracotta text-white text-[10px] font-bold uppercase tracking-widest shadow-md">
                      Best for Birthdays
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-brand-gold font-mono block">
                      {pkg.guests}
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-brand-cream mt-1">
                      {pkg.name}
                    </h3>
                  </div>

                  <div className="font-mono text-3xl font-bold text-brand-cream">
                    ₹{pkg.pricePerPerson}
                    <span className="text-xs font-sans text-brand-subtle font-normal ml-1">/ person</span>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-brand-border/40 text-xs">
                    {pkg.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-brand-cream/80">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => openBookingModal('event')}
                  className={`w-full py-3.5 px-6 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${
                    pkg.popular
                      ? 'bg-brand-terracotta hover:bg-brand-terracottaHover text-white shadow-luxury-ember'
                      : 'bg-brand-surface border border-brand-border text-brand-cream hover:border-brand-gold'
                  }`}
                >
                  Book This Package
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. INTERACTIVE CUSTOM EVENT CALCULATOR */}
        <div>
          <EventPackageCalculator />
        </div>

      </div>
    </div>
  );
};
