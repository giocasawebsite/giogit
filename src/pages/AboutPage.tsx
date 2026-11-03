import React from 'react';
import { PageRoute } from '../types';
import { businessConfig } from '../data/businessConfig';
import { SectionHeader } from '../components/ui/SectionHeader';
import { 
  Flame, 
  Gamepad2, 
  Heart, 
  Users, 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  ArrowRight,
  Coffee 
} from 'lucide-react';
import { useBookingModal } from '../context/BookingModalContext';

interface AboutPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const { openBookingModal } = useBookingModal();

  const pillars = [
    {
      icon: Flame,
      title: 'Artisanal Gastronomy',
      sub: '48-Hr Fermentation & 450°C Oven',
      description: 'We refuse shortcuts. Our pizza dough slow-ferments for two full days to achieve the delicate, airy, digestible crust of authentic Neapolitan baking.'
    },
    {
      icon: Gamepad2,
      title: 'Social Gaming Culture',
      sub: 'PS5 4K, Slate Pool & Tabletop Vault',
      description: 'Gaming is at its best when shared in person. We built an arena where digital competitive esports meet tactile slate pool and classic board games.'
    },
    {
      icon: Heart,
      title: 'Unhurried Hospitality',
      sub: 'Come Hungry. Leave Late.',
      description: 'GioCasa is designed as a second living room for Ayodhya. A space where conversation flows naturally and no one rushes you off the table.'
    }
  ];

  return (
    <div className="min-h-screen bg-brand-dark text-brand-cream pt-28 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-terracotta selection:text-white">
      <div className="max-w-7xl mx-auto space-y-20 sm:space-y-28">
        
        {/* Editorial Story Header */}
        <div className="text-center max-w-4xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-[0.25em] text-brand-terracotta font-semibold block">
            Our Story & Philosophy
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-brand-cream leading-tight">
            Born in Ayodhya.<br />
            <span className="font-italic-accent text-brand-gold italic font-normal">
              Built for Community & Play.
            </span>
          </h1>
          <p className="text-sm sm:text-lg text-brand-subtle font-light max-w-2xl mx-auto leading-relaxed">
            GioCasa was created out of a simple desire: to give Ayodhya a world-class hospitality space where authentic wood-fired cuisine and vibrant social entertainment live side by side.
          </p>
        </div>

        {/* The Narrative Story Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs uppercase tracking-[0.2em] text-brand-gold font-semibold block">
              The Vision
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-brand-cream leading-snug">
              Why We Built A Two-Floor Social Destination
            </h2>
            <p className="text-sm sm:text-base text-brand-subtle font-light leading-relaxed">
              Most cafés are either quiet dining rooms where you have to whisper, or noisy video game parlors with poor food. We believed you shouldn’t have to compromise.
            </p>
            <p className="text-sm sm:text-base text-brand-subtle font-light leading-relaxed">
              On the <strong>1st Floor</strong>, our <strong>Dine-in Restaurant & Hot-Shot Pool Table</strong> is warm, intimate, and welcoming. The wood-fired oven crackles at 450°C, artisanal coffee beans are freshly ground, friends challenge each other on the championship 8-ball slate pool table, and guests gather around comforting Italian dishes.
            </p>
            <p className="text-sm sm:text-base text-brand-subtle font-light leading-relaxed">
              In the <strong>Basement</strong>, our <strong>High-Octane Gaming Arena</strong> is where things get competitive. 4K HDR PS5 stations with DualSense controllers and force-feedback racing simulator cockpits bring squads and solo gamers together for hours of intense gameplay.
            </p>
          </div>

          <div className="lg:col-span-6 relative rounded-3xl overflow-hidden aspect-[4/3] border border-brand-border bg-brand-surface shadow-2xl">
            <img
              src="/assets/real/foosball_lounge.png"
              alt="GioCasa Interior Lounge in Ayodhya"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover brightness-95"
            />
            <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-brand-dark/90 backdrop-blur-md border border-brand-border text-xs text-brand-cream flex items-center justify-between">
              <span className="font-semibold">GioCasa Social Lounge</span>
              <span className="text-brand-gold font-mono">Ayodhya, India</span>
            </div>
          </div>
        </div>

        {/* 3 Core Pillars */}
        <div className="space-y-12">
          <SectionHeader
            tag="The House Foundations"
            title="The Three Pillars of GioCasa"
            titleItalic="Our promise to every guest."
            subtitle="Every recipe, gaming setup, and service gesture is guided by these principles."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="p-8 rounded-3xl bg-brand-surface border border-brand-border flex flex-col justify-between space-y-6 shadow-xl hover:border-brand-gold/50 transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-surfaceElevated border border-brand-border flex items-center justify-center text-brand-terracotta">
                      <Icon className="w-6 h-6" />
                    </div>

                    <div>
                      <h3 className="font-serif text-2xl font-bold text-brand-cream">
                        {p.title}
                      </h3>
                      <span className="text-[11px] font-mono text-brand-gold uppercase tracking-wider block mt-0.5">
                        {p.sub}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-brand-subtle font-light leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-brand-border/40 text-[10px] text-brand-muted font-mono uppercase tracking-widest">
                    Pillar 0{idx + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call to Action Banner */}
        <div className="p-8 sm:p-12 lg:p-16 rounded-3xl bg-gradient-to-r from-brand-surfaceElevated to-brand-surface border border-brand-border text-center space-y-6 shadow-2xl">
          <h3 className="font-serif text-3xl sm:text-5xl font-bold text-brand-cream max-w-2xl mx-auto leading-tight">
            Your Next Great Evening Has A Table.
          </h3>
          <p className="text-sm sm:text-base text-brand-subtle font-light max-w-xl mx-auto leading-relaxed">
            Whether for a piping hot Margherita pizza or a high-stakes FIFA championship, we are ready to welcome you.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => openBookingModal('dining')}
              className="py-4 px-8 rounded-full bg-brand-terracotta hover:bg-brand-terracottaHover text-brand-cream font-semibold text-xs uppercase tracking-widest shadow-luxury-ember transition-all flex items-center gap-2"
            >
              <span>Book Your Visit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="py-4 px-8 rounded-full bg-brand-surface hover:bg-brand-surfaceElevated text-brand-cream border border-brand-border font-semibold text-xs uppercase tracking-widest transition-all"
            >
              Get Location & Directions
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
