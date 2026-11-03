import React from 'react';
import { PageRoute } from '../types';
import { businessConfig } from '../data/businessConfig';
import { useBookingModal } from '../context/BookingModalContext';
import { SectionHeader } from '../components/ui/SectionHeader';
import { DualFloorToggle } from '../components/shared/DualFloorToggle';
import { 
  Flame, 
  Gamepad2, 
  Sun, 
  Moon, 
  Coffee, 
  Sparkles, 
  ArrowRight, 
  Users, 
  Clock, 
  CalendarDays, 
  ShieldCheck 
} from 'lucide-react';

interface ExperiencePageProps {
  onNavigate: (page: PageRoute) => void;
}

export const ExperiencePage: React.FC<ExperiencePageProps> = ({ onNavigate }) => {
  const { openBookingModal } = useBookingModal();

  const timelineSteps = [
    {
      time: '11:00 AM – 03:00 PM',
      title: 'Morning Brews, Work & Casual Bites',
      vibe: 'Calm, productive, aromatic',
      icon: Sun,
      description: 'Step into the 1st Floor restaurant for steaming Adrak Chai, roasted hazelnut espresso, light background acoustics, and fresh bun makhan or pasta while getting work done.'
    },
    {
      time: '03:00 PM – 07:00 PM',
      title: 'Afternoon Pizza & Casual Pool Frames',
      vibe: 'Social, upbeat, friendly',
      icon: Coffee,
      description: 'The wood-fired oven reaches peak heat. Groups gather on the 1st Floor for Margherita sharing platters, chilled strawberry smoothies, and casual games of 8-ball pool.'
    },
    {
      time: '07:00 PM – Late Night',
      title: 'High-Octane Gaming, Tournaments & Feasts',
      vibe: 'Competitive, energetic, electric',
      icon: Moon,
      description: 'The Basement turns into Ayodhya’s gaming central. PS5 4K stations and racing simulators light up with Tekken & FC 25 battles, burgers and loaded nachos arrive station-side, and laughter echoes across the arena.'
    }
  ];

  return (
    <div className="min-h-screen bg-brand-dark text-brand-cream pt-28 pb-20 px-4 sm:px-6 lg:px-8 selection:bg-brand-terracotta selection:text-white">
      <div className="max-w-7xl mx-auto space-y-20 sm:space-y-28">
        
        {/* Editorial Page Header */}
        <div className="text-center max-w-4xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-[0.25em] text-brand-gold font-semibold block">
            The GioCasa Experience
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-brand-cream leading-tight">
            Two Distinct Worlds.<br />
            <span className="font-italic-accent text-brand-terracotta italic font-normal">
              One Extraordinary House.
            </span>
          </h1>
          <p className="text-sm sm:text-lg text-brand-subtle font-light max-w-2xl mx-auto leading-relaxed">
            Designed as an escape where authentic Italian culinary craft meets next-generation gaming entertainment in the heart of Ayodhya.
          </p>
        </div>

        {/* Interactive Dual Floor Visualizer */}
        <div>
          <DualFloorToggle />
        </div>

        {/* Day-to-Night Atmosphere Flow */}
        <div className="space-y-12">
          <SectionHeader
            tag="A Day at GioCasa"
            title="From Morning Chai to Midnight Battles"
            titleItalic="The rhythm of the house."
            subtitle="Whether you visit for an unhurried solo lunch or an intense late-night multiplayer championship, there’s a table with your name on it."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {timelineSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="p-8 rounded-3xl bg-brand-surface border border-brand-border hover:border-brand-gold/50 transition-all duration-300 flex flex-col justify-between space-y-6 shadow-xl"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-brand-gold px-3 py-1 rounded-full bg-brand-surfaceElevated border border-brand-border">
                        {step.time}
                      </span>
                      <Icon className="w-5 h-5 text-brand-terracotta" />
                    </div>

                    <h3 className="font-serif text-2xl font-bold text-brand-cream">
                      {step.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-brand-subtle font-light leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-brand-border/40 text-xs text-brand-muted">
                    <strong className="text-brand-cream font-medium">Vibe:</strong> {step.vibe}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hospitality & Quality Philosophy */}
        <div className="rounded-3xl bg-gradient-to-r from-brand-surfaceElevated to-brand-surface p-8 sm:p-12 lg:p-16 border border-brand-border shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs uppercase tracking-[0.2em] text-brand-terracotta font-semibold block">
                Hospitality Standard
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-bold text-brand-cream tracking-tight">
                Crafted for People Who Love to Stay.
              </h2>
              <p className="text-sm sm:text-base text-brand-subtle font-light leading-relaxed">
                We believe the best social spaces are unhurried. At GioCasa, you never have to choose between a phenomenal meal and fun entertainment. Enjoy artisanal wood-fired dining and 8-ball pool on the 1st Floor, drop down to the Basement Gaming Arena for high-speed PS5 and racing action, and enjoy an evening built around genuine human connection.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-brand-dark/60 border border-brand-border/60 text-xs text-brand-cream flex items-center gap-2">
                  <Flame className="w-4 h-4 text-brand-terracotta shrink-0" />
                  <span>1st Floor • Wood-Fired Pizza at 450°C</span>
                </div>
                <div className="p-3 rounded-xl bg-brand-dark/60 border border-brand-border/60 text-xs text-brand-cream flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-brand-gold shrink-0" />
                  <span>Basement • PS5 4K & Racing Simulators</span>
                </div>
                <div className="p-3 rounded-xl bg-brand-dark/60 border border-brand-border/60 text-xs text-brand-cream flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-terracotta shrink-0" />
                  <span>1st Floor • Hot-Shot Slate Pool Table</span>
                </div>
                <div className="p-3 rounded-xl bg-brand-dark/60 border border-brand-border/60 text-xs text-brand-cream flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>100% Hygienic & Welcoming</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-4">
                <button
                  onClick={() => openBookingModal('choice')}
                  className="py-3.5 px-8 rounded-full bg-brand-terracotta hover:bg-brand-terracottaHover text-brand-cream font-semibold text-xs uppercase tracking-widest shadow-luxury-ember transition-all flex items-center gap-2"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>Reserve Table or Event</span>
                </button>
                <button
                  onClick={() => onNavigate('book')}
                  className="py-3.5 px-6 rounded-full bg-brand-surface border border-brand-border hover:border-brand-gold text-brand-cream font-semibold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <Gamepad2 className="w-4 h-4 text-brand-gold" />
                  <span>Book Gaming Slots</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 relative rounded-2xl overflow-hidden aspect-square border border-brand-border bg-brand-dark shadow-2xl">
              <img
                src="/assets/real/pool_table.png"
                alt="GioCasa Pool & Social Lounge"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover brightness-95"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
