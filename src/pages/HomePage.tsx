import React from 'react';
import { PageRoute } from '../types';
import { businessConfig } from '../data/businessConfig';
import { menuData } from '../data/menuData';
import { upcomingEvents } from '../data/eventsData';
import { testimonialsData } from '../data/testimonialsData';
import { useBookingModal } from '../context/BookingModalContext';
import { useOrderCart } from '../context/OrderCartContext';
import { SectionHeader } from '../components/ui/SectionHeader';
import { DualFloorToggle } from '../components/shared/DualFloorToggle';
import { PizzaFeatureCard } from '../components/shared/PizzaFeatureCard';
import { GamingHoverShowcase } from '../components/shared/GamingHoverShowcase';
import { ExperiencePlanner } from '../components/shared/ExperiencePlanner';
import { EventPackageCalculator } from '../components/shared/EventPackageCalculator';
import { InstagramGrid } from '../components/shared/InstagramGrid';
import { LocationMapCard } from '../components/shared/LocationMapCard';
import { InteractiveHeroText } from '../components/shared/InteractiveHeroText';
import { HeroScrollCanvas } from '../components/shared/HeroScrollCanvas';
import { WinnersButton } from '../components/ui/WinnersButton';
import { 
  Flame, 
  Gamepad2, 
  ShoppingBag, 
  CalendarDays, 
  ArrowRight, 
  Sparkles, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Trophy, 
  Star, 
  Check, 
  Clock, 
  Bike,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';

interface HomePageProps {
  onNavigate: (page: PageRoute) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { openBookingModal } = useBookingModal();
  const { openDrawer } = useOrderCart();

  const signaturePizzas = menuData.filter(i => i.category === 'pizza').slice(0, 3);

  return (
    <div className="min-h-screen bg-brand-dark text-white selection:bg-brand-pink selection:text-white">
      
      {/* 1. LUXURY SCROLL-SCRUBBED CANVAS HERO EXPERIENCE */}
      <HeroScrollCanvas />

      {/* 2. REPEATED HERO CONTENT SECTION (Appears naturally as the next section after the hero sequence) */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6 sm:space-y-8 border-b border-brand-border/40">
        {/* Location & Micro Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-surface/90 backdrop-blur-md border border-brand-pink/40 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-brand-pink font-bold">
            AYODHYA • SOCIAL DINING × GAMING LOUNGE
          </span>
          <span className="text-brand-pink/60 hidden sm:inline">•</span>
          <span className="text-xs text-white/90 hidden sm:inline font-mono font-medium">
            Open Daily 11 AM – 11 PM
          </span>
        </div>

        {/* Tri-concept Headline */}
        <div className="space-y-3 sm:space-y-4">
          <div className="text-xs sm:text-sm font-bold uppercase tracking-[0.35em] text-brand-pink">
            EAT. PLAY. CONNECT.
          </div>
          
          {/* Interactive Living Title with Spring Physics & Easter Egg */}
          <div className="w-full">
            <InteractiveHeroText sizeClassName="text-5xl sm:text-7xl md:text-8xl lg:text-9xl" />
          </div>
          
          <p className="font-italic-accent text-2xl sm:text-3xl md:text-4xl text-brand-orange font-semibold italic max-w-2xl mx-auto pt-1">
            Wood-fired pizza, good games and even better company.
          </p>
        </div>

        {/* Narrative Subtitle */}
        <p className="text-sm sm:text-base text-brand-subtle max-w-2xl mx-auto font-light leading-relaxed text-balance">
          Ayodhya’s modern social destination. Hand-stretched wood-fired pizzas & cozy café downstairs at <strong className="text-brand-orange font-bold">The Hearth</strong>. High-octane PS5 4K gaming, slate 8-ball pool & foosball upstairs at <strong className="text-brand-blue font-bold">The Arena</strong>.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => openBookingModal('dining')}
            className="w-full sm:w-auto py-3.5 px-8 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white font-semibold text-xs uppercase tracking-widest transition-all shadow-luxury-pink hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
          >
            <CalendarDays className="w-4 h-4" />
            <span>Book Table / Game Slot</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={openDrawer}
            className="w-full sm:w-auto py-3.5 px-8 rounded-full bg-brand-surface hover:bg-brand-surfaceElevated text-white border border-brand-orange/60 hover:border-brand-orange font-semibold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl hover:shadow-luxury-orange"
          >
            <ShoppingBag className="w-4 h-4 text-brand-orange" />
            <span>Order Wood-Fired Pizza</span>
          </button>
        </div>
      </section>

      {/* 3. "MORE THAN A CAFÉ" — DUAL FLOOR ARCHITECTURAL SPLIT */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <SectionHeader
          tag="Two Levels • One House"
          title="More Than A Café."
          titleItalic="Dinner downstairs. Competition upstairs."
          subtitle="GioCasa brings together slow, authentic wood-fired gastronomy and fast-paced gaming culture under one roof in Ayodhya."
          accentColor="pink"
        />

        <div className="mt-12 sm:mt-16">
          <DualFloorToggle />
        </div>
      </section>

      {/* 3. WOOD-FIRED PIZZA HERO PRODUCT SHOWCASE */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-brand-surface/40 border-y border-brand-border/40">
        <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <SectionHeader
              tag="Wood-Fired / Handcrafted"
              title="The Heart of GioCasa"
              titleItalic="Fired at 450°C."
              subtitle="48-hour slow fermented dough, San Marzano pomodoro, and hand-pulled mozzarella baked to airy, charred perfection."
              align="left"
              accentColor="orange"
              className="max-w-2xl"
            />

            <button
              onClick={() => onNavigate('menu')}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-orange hover:text-brand-orangeHover transition-colors shrink-0 group"
            >
              <span>Explore Full Menu</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Pizza Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {signaturePizzas.map(pizza => (
              <PizzaFeatureCard key={pizza.id} pizza={pizza} />
            ))}
          </div>

          {/* 48-Hour Fermentation Craft Callout */}
          <div className="p-6 sm:p-8 rounded-3xl bg-brand-surface border border-brand-border flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif text-xl font-bold text-white">
                  The 48-Hour Slow Fermentation Standard
                </h4>
                <p className="text-xs sm:text-sm text-brand-subtle font-light mt-0.5">
                  Light on the stomach, crisp on the crust, and deeply aromatic. We never rush the dough.
                </p>
              </div>
            </div>

            <button
              onClick={openDrawer}
              className="py-3 px-6 rounded-full bg-brand-orange hover:bg-brand-orangeHover text-brand-charcoalDeep text-xs font-bold uppercase tracking-wider transition-all shrink-0 shadow-luxury-orange"
            >
              Order Pizza Now
            </button>
          </div>
        </div>
      </section>

      {/* 4. PIZZA DELIVERY CONVERSION HUB */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-brand-surfaceElevated via-brand-surface to-brand-dark p-8 sm:p-12 lg:p-16 border border-brand-border shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-dark/80 border border-brand-border text-[11px] font-semibold text-brand-orange uppercase tracking-widest">
                <Bike className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ayodhya Doorstep Delivery</span>
              </div>

              <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                GioCasa, at Your Door.
              </h2>

              <p className="text-sm sm:text-base text-brand-subtle font-light max-w-xl leading-relaxed">
                Our wood-fired pizzas don’t need a reservation. Dispatched fresh from our oven to your doorstep with direct WhatsApp ordering and thermal heat packs.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={openDrawer}
                  className="py-3.5 px-7 rounded-full bg-brand-orange hover:bg-brand-orangeHover text-brand-charcoalDeep font-bold text-xs uppercase tracking-widest shadow-luxury-orange transition-all flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Order Pizza via Web / WhatsApp</span>
                </button>

                <a
                  href={`tel:${businessConfig.contact.phone}`}
                  className="py-3.5 px-6 rounded-full bg-brand-dark/80 hover:bg-brand-dark border border-brand-border text-white font-semibold text-xs uppercase tracking-widest transition-all flex items-center gap-2 hover:border-brand-pink"
                >
                  <Phone className="w-4 h-4 text-brand-pink" />
                  <span>Call to Order: {businessConfig.contact.displayPhone}</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-3 p-6 rounded-2xl bg-brand-dark/60 border border-brand-border/60 text-xs">
              <div className="text-brand-orange font-semibold uppercase tracking-wider font-mono">
                Delivery Specs:
              </div>
              <div className="flex items-center justify-between text-brand-subtle py-1 border-b border-brand-border/40">
                <span>Avg. Delivery Time</span>
                <span className="font-mono text-white">{businessConfig.delivery.avgDeliveryTime}</span>
              </div>
              <div className="flex items-center justify-between text-brand-subtle py-1 border-b border-brand-border/40">
                <span>Free Delivery Above</span>
                <span className="font-mono text-emerald-400 font-semibold">₹{businessConfig.delivery.freeDeliveryAbove}</span>
              </div>
              <div className="flex items-center justify-between text-brand-subtle py-1">
                <span>Direct Concierge</span>
                <span className="text-white">WhatsApp Verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. GAMING LOUNGE SECTION */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <SectionHeader
            tag="Level 1 • The Arena"
            title="Upstairs, Things Get Competitive."
            titleItalic="Play loud. Stay late."
            subtitle="Four dedicated entertainment zones crafted for casual friendly matches, high-stakes tournaments, and unhurried tabletop nights."
            accentColor="blue"
            align="left"
            className="max-w-2xl"
          />

          <WinnersButton
            onNavigate={onNavigate}
            variant="cta"
          />
        </div>

        <div>
          <GamingHoverShowcase />
        </div>
      </section>

      {/* 6. "CHOOSE YOUR NIGHT" EXPERIENCE PLANNER */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-brand-surface/30 border-t border-brand-border/40">
        <div className="max-w-7xl mx-auto space-y-12">
          <SectionHeader
            tag="Curated Social Itineraries"
            title="What Kind of Night Are You Having?"
            titleItalic="Choose your path."
            subtitle="Whether it’s an intimate dinner date, a high-octane PS5 duel, or an epic birthday bash, we tailor the floor to your group."
            accentColor="pink"
          />

          <ExperiencePlanner />
        </div>
      </section>

      {/* 7. UPCOMING EVENTS & COMMUNITY TOURNAMENTS */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <SectionHeader
            tag="Calendar & Tournaments"
            title="Something’s Always Happening."
            titleItalic="Join the community."
            subtitle="Weekly gaming leagues, Friday pool showdowns, and Sunday board game socials in Ayodhya."
            align="left"
            accentColor="blue"
            className="max-w-2xl"
          />

          <button
            onClick={() => onNavigate('events')}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-blue hover:text-brand-blueHover transition-colors shrink-0 group"
          >
            <span>View All Events</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingEvents.slice(0, 2).map(evt => (
            <div
              key={evt.id}
              className="p-6 sm:p-8 rounded-3xl bg-brand-surface border border-brand-border hover:border-brand-blue/60 transition-all duration-300 flex flex-col justify-between space-y-6 shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-3 py-1 rounded-full bg-brand-surfaceElevated border border-brand-blue/30 text-brand-blue font-mono font-bold">
                    {evt.date}
                  </span>
                  <span className="text-brand-subtle font-mono text-[11px]">
                    {evt.time}
                  </span>
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  {evt.title}
                </h3>

                <p className="text-xs sm:text-sm text-brand-subtle font-light leading-relaxed">
                  {evt.description}
                </p>

                {evt.prizePool && (
                  <div className="p-3 rounded-xl bg-brand-surfaceElevated border border-brand-border/60 text-xs text-brand-blue flex items-center gap-2 font-medium">
                    <Trophy className="w-4 h-4 text-brand-blue shrink-0" />
                    <span><strong>Prize Pool:</strong> {evt.prizePool}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-brand-border/40 flex items-center justify-between">
                <span className="text-xs text-white font-mono">
                  {evt.entryFee || 'Free entry'}
                </span>

                <button
                  onClick={() => openBookingModal('event')}
                  className="py-2.5 px-5 rounded-full bg-brand-pink text-white font-semibold text-xs uppercase tracking-wider hover:bg-brand-pinkHover transition-all shadow-luxury-pink"
                >
                  Register Slot
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. BIRTHDAY / PRIVATE CELEBRATIONS CALCULATOR */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-brand-surface/40 border-y border-brand-border/40">
        <div className="max-w-7xl mx-auto space-y-12">
          <SectionHeader
            tag="Private Celebrations"
            title="Make It A GioCasa Night."
            titleItalic="Celebrate your milestones."
            subtitle="From birthday celebrations to custom team gaming mixers, bring your people and make the lounge yours."
            accentColor="pink"
          />

          <EventPackageCalculator />
        </div>
      </section>

      {/* 9. SOCIAL PROOF & COMMUNITY STORIES */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <SectionHeader
          tag="Guest Impressions"
          title="Loved by Ayodhya"
          titleItalic="Genuine hospitality."
          subtitle="What people love about our wood-fired crust, cozy café ambiance, and gaming floor."
          accentColor="orange"
        />

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonialsData.map(test => (
            <div
              key={test.id}
              className="p-6 sm:p-8 rounded-3xl bg-brand-surface border border-brand-border flex flex-col justify-between space-y-6 shadow-xl"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-1 text-brand-orange">
                  {[...Array(test.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                <h4 className="font-serif text-lg font-bold text-white">
                  {test.highlight}
                </h4>

                <p className="text-xs sm:text-sm text-brand-subtle font-light leading-relaxed">
                  {test.comment}
                </p>
              </div>

              <div className="pt-4 border-t border-brand-border/40 flex items-center justify-between text-xs">
                <div>
                  <div className="text-white font-semibold">{test.name}</div>
                  <div className="text-[10px] text-brand-orange font-mono font-medium">{test.badge}</div>
                </div>
                <div className="text-[10px] text-brand-muted">{test.date}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 10. INSTAGRAM / SOCIAL GRID */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <SectionHeader
          tag="Visual Stories"
          title="Follow The House"
          titleItalic="@giocasa.ayodhya"
          subtitle="Glimpses of daily hearth firings, intense pool frames, and community gaming sessions."
          accentColor="pink"
        />

        <div className="mt-12">
          <InstagramGrid />
        </div>
      </section>

      {/* 11. LOCATION & VISIT MAP */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <LocationMapCard />
      </section>

    </div>
  );
};
