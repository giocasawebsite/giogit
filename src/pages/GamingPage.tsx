import React from 'react';
import { PageRoute } from '../types';
import { gamingZones, gamingPricingPackages } from '../data/gamingData';
import { useBookingModal } from '../context/BookingModalContext';
import { SectionHeader } from '../components/ui/SectionHeader';
import { GamingHoverShowcase } from '../components/shared/GamingHoverShowcase';
import { WinnersButton } from '../components/ui/WinnersButton';
import { 
  Gamepad2, 
  Tv, 
  CircleDot, 
  Trophy, 
  Sparkles, 
  Clock, 
  Users, 
  ShieldCheck, 
  CalendarDays, 
  Check, 
  ArrowRight,
  Flame
} from 'lucide-react';

interface GamingPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const GamingPage: React.FC<GamingPageProps> = ({ onNavigate }) => {
  const { openBookingModal } = useBookingModal();

  return (
    <div className="min-h-screen bg-brand-dark text-white pt-28 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-blue selection:text-brand-charcoalDeep">
      <div className="max-w-7xl mx-auto space-y-20 sm:space-y-28">
        
        {/* Page Header */}
        <div className="text-center max-w-4xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-[0.25em] text-brand-blue font-semibold block">
            Level 1 • The Arena
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-tight">
            The Gaming Lounge at GioCasa
          </h1>
          <p className="font-italic-accent text-xl sm:text-2xl text-brand-pink italic">
            PS5 4K HDR • Hot-Shot Slate Pool • Pro Foosball • 50+ Board Games
          </p>
          <p className="text-sm sm:text-base text-brand-subtle font-light max-w-2xl mx-auto leading-relaxed">
            A state-of-the-art social gaming destination in Ayodhya designed for competitive battles, friendly banter, tournament glory, and food served straight to your controllers.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => openBookingModal('gaming')}
              className="py-3 px-6 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-luxury-pink hover:-translate-y-0.5"
            >
              Reserve Game Station
            </button>
            <WinnersButton
              onNavigate={onNavigate}
              variant="cta"
            />
          </div>
        </div>

        {/* Interactive Zone Showcase */}
        <div>
          <GamingHoverShowcase />
        </div>

        {/* Detailed Zone Breakdown Grid */}
        <div className="space-y-12">
          <SectionHeader
            tag="Arena Breakdown"
            title="Gaming Arenas & Lounges"
            titleItalic="Choose your battlefield."
            subtitle="Equipped with top-tier hardware, tournament-standard tables, and cozy spectator banquettes."
            accentColor="blue"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {gamingZones.map(zone => (
              <div
                key={zone.id}
                className="bg-brand-surface rounded-3xl border border-brand-border overflow-hidden flex flex-col justify-between shadow-xl hover:border-brand-blue/50 transition-colors"
              >
                <div className="relative aspect-[16/10] bg-brand-dark overflow-hidden">
                  <img
                    src={zone.image}
                    alt={zone.name}
                    className="w-full h-full object-cover brightness-90 hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full bg-brand-dark/90 backdrop-blur-md border border-brand-border text-xs font-mono font-bold text-brand-blue">
                      {zone.ratePerHour}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-brand-blue font-semibold block">
                      {zone.subtitle}
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-white">
                      {zone.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-brand-subtle font-light leading-relaxed">
                      {zone.description}
                    </p>

                    {/* Hardware specs */}
                    <div className="space-y-1.5 pt-2">
                      {zone.specs.slice(0, 3).map((spec, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-white/90">
                          <Check className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                          <span>{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-brand-border/40 flex items-center justify-between">
                    <span className="text-xs text-brand-muted flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-brand-pink" />
                      {zone.playersCapacity}
                    </span>

                    <button
                      onClick={() => onNavigate('book')}
                      className="py-2.5 px-5 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-luxury-pink"
                    >
                      Book Slot
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing & Passes Section */}
        <div className="space-y-12">
          <SectionHeader
            tag="Rates & Passes"
            title="Lounge Passes & Packages"
            titleItalic="Simple, transparent rates."
            subtitle="Hourly rates and all-access value passes for individuals, duos, and groups."
            accentColor="blue"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gamingPricingPackages.map((pkg, idx) => (
              <div
                key={idx}
                className={`p-8 rounded-3xl flex flex-col justify-between space-y-6 transition-all duration-300 shadow-xl ${
                  pkg.popular
                    ? 'bg-brand-surfaceElevated border-2 border-brand-pink relative shadow-luxury-pink'
                    : 'bg-brand-surface border border-brand-border hover:border-brand-blue/50'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-3.5 py-1 rounded-full bg-brand-pink text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-brand-subtle font-mono block">
                      {pkg.duration} Pass
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-white mt-0.5">
                      {pkg.name}
                    </h3>
                  </div>

                  <div className="font-mono text-3xl font-bold text-brand-blue">
                    {pkg.price}
                    <span className="text-xs font-sans text-brand-muted font-normal ml-1">/ session</span>
                  </div>

                  <p className="text-xs text-brand-pink font-semibold">
                    {pkg.zone}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-brand-border/40 text-xs">
                    {pkg.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 text-white/80">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('book')}
                  className={`w-full py-3 px-6 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${
                    pkg.popular
                      ? 'bg-brand-pink text-white hover:bg-brand-pinkHover shadow-luxury-pink'
                      : 'bg-brand-surface border border-brand-border text-white hover:border-brand-blue hover:text-brand-blue'
                  }`}
                >
                  Reserve This Pass
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Lounge Rules & Ethics */}
        <div className="p-8 sm:p-10 rounded-3xl bg-brand-surface border border-brand-border space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-brand-blue" />
            <h3 className="font-serif text-2xl font-bold text-white">
              House Gaming Etiquette & Standards
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-brand-surfaceElevated border border-brand-border/40 space-y-1">
              <span className="font-semibold text-brand-blue block">1. Respect Hardware</span>
              <p className="text-brand-subtle font-light">
                Please handle DualSense controllers and custom cue sticks with care.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-brand-surfaceElevated border border-brand-border/40 space-y-1">
              <span className="font-semibold text-brand-blue block">2. Fair Queueing</span>
              <p className="text-brand-subtle font-light">
                During busy weekend nights, match slots are allocated fairly in 60-min increments.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-brand-surfaceElevated border border-brand-border/40 space-y-1">
              <span className="font-semibold text-brand-blue block">3. Food to Station</span>
              <p className="text-brand-subtle font-light">
                Use dedicated side tables and drink holders to keep game zones spotless.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-brand-surfaceElevated border border-brand-border/40 space-y-1">
              <span className="font-semibold text-brand-blue block">4. Friendly Spirit</span>
              <p className="text-brand-subtle font-light">
                Trash talk is welcomed; bad sportsmanship is not. Play with passion!
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
