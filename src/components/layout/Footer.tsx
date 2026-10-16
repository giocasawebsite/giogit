import React from 'react';
import { PageRoute } from '../../types';
import { businessConfig } from '../../data/businessConfig';
import { 
  MapPin, 
  Phone, 
  Mail, 
  MessageCircle, 
  ArrowUpRight, 
  Flame, 
  Gamepad2, 
  Heart,
  Clock
} from 'lucide-react';
import { InstagramIcon } from '../ui/InstagramIcon';
import { useBookingModal } from '../../context/BookingModalContext';
import { useOrderCart } from '../../context/OrderCartContext';

interface FooterProps {
  onNavigate: (page: PageRoute) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { openBookingModal } = useBookingModal();
  const { openDrawer } = useOrderCart();

  const handleNav = (page: PageRoute) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-brand-darker text-brand-cream border-t border-brand-border/60 relative overflow-hidden">
      {/* Subtle background ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-brand-terracotta/5 blur-[120px] pointer-events-none" />

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-16 border-b border-brand-border/40">
          
          {/* Brand & Editorial Mission (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-terracotta" />
                <span className="text-[10px] uppercase tracking-[0.25em] text-brand-gold font-semibold">
                  Ayodhya • India
                </span>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-brand-surfaceElevated border border-brand-border/80 overflow-hidden shrink-0 shadow-md">
                  <img
                    src="/assets/giocasa_logo_circle.png"
                    alt="GioCasa Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-brand-cream leading-tight">
                    GIOCASA
                  </h2>
                  <p className="font-italic-accent text-base sm:text-lg text-brand-terracotta italic leading-tight">
                    {businessConfig.tagline}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-brand-subtle text-sm leading-relaxed max-w-md font-light">
              Italian-inspired wood-fired dining in the basement, high-energy gaming lounge on the first floor. A modern social destination crafted for slow meals, fast matches, and unforgettable nights in Ayodhya.
            </p>

            {/* Quick Action Pills */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                onClick={() => openBookingModal('dining')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-surface border border-brand-border hover:border-brand-terracotta text-xs font-semibold uppercase tracking-wider text-brand-cream hover:text-brand-terracotta transition-colors"
              >
                <Flame className="w-3.5 h-3.5 text-brand-terracotta" />
                <span>Reserve Table</span>
              </button>
              <button
                onClick={() => handleNav('book')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-surface border border-brand-border hover:border-brand-gold text-xs font-semibold uppercase tracking-wider text-brand-cream hover:text-brand-gold transition-colors"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-brand-gold" />
                <span>Book Gaming Slot</span>
              </button>
              <button
                onClick={openDrawer}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-terracotta/20 border border-brand-border hover:bg-brand-terracotta text-xs font-semibold uppercase tracking-wider text-brand-cream transition-colors"
              >
                <span>Order Pizza</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Navigation Links (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs uppercase tracking-[0.2em] text-brand-cream font-semibold border-b border-brand-border/40 pb-2">
              Explore
            </h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { id: 'home' as PageRoute, label: 'Home Page' },
                { id: 'experience' as PageRoute, label: 'The 2-Level House' },
                { id: 'menu' as PageRoute, label: 'Wood-Fired Menu' },
                { id: 'gaming' as PageRoute, label: 'PS5 & Pool Arena' },
                { id: 'tournaments' as PageRoute, label: 'GioCasa Arena' },
                { id: 'hall-of-fame' as PageRoute, label: 'Hall of Fame' },
                { id: 'book' as PageRoute, label: 'Book Station / Slot' },
                { id: 'events' as PageRoute, label: 'Events & Screenings' },
                { id: 'about' as PageRoute, label: 'Our Story' },
                { id: 'contact' as PageRoute, label: 'Find Us' },
              ].map(link => (
                <li key={link.id}>
                  <button
                    onClick={() => handleNav(link.id)}
                    className="text-brand-subtle hover:text-brand-terracotta transition-colors flex items-center gap-1 group text-xs uppercase tracking-wider"
                  >
                    <span>{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours & Schedule (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs uppercase tracking-[0.2em] text-brand-cream font-semibold border-b border-brand-border/40 pb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-gold" />
              <span>Hours</span>
            </h3>
            <div className="space-y-3 text-xs">
              {businessConfig.hours.map((h, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="text-brand-cream font-medium">{h.days}</div>
                  <div className="text-brand-gold font-mono">{h.timing}</div>
                  <div className="text-[11px] text-brand-muted">{h.note}</div>
                </div>
              ))}
              <div className="pt-2 text-[11px] text-brand-subtle">
                Wood-fired pizza delivery available daily until 11:00 PM.
              </div>
            </div>
          </div>

          {/* Contact & Social (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs uppercase tracking-[0.2em] text-brand-cream font-semibold border-b border-brand-border/40 pb-2">
              Connect
            </h3>
            <ul className="space-y-3 text-xs">
              <li>
                <a
                  href={businessConfig.location.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-subtle hover:text-brand-cream flex items-start gap-2.5 group"
                >
                  <MapPin className="w-4 h-4 text-brand-terracotta shrink-0 mt-0.5" />
                  <span>
                    {businessConfig.location.addressLine1}, {businessConfig.location.city}, {businessConfig.location.state}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${businessConfig.contact.phone}`}
                  className="text-brand-subtle hover:text-brand-cream flex items-center gap-2.5 group"
                >
                  <Phone className="w-4 h-4 text-brand-gold shrink-0" />
                  <span className="font-mono">{businessConfig.contact.displayPhone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${businessConfig.contact.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-subtle hover:text-brand-cream flex items-center gap-2.5 group"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>WhatsApp Direct Concierge</span>
                </a>
              </li>
              <li>
                <a
                  href={businessConfig.contact.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-subtle hover:text-brand-cream flex items-center gap-2.5 group"
                >
                  <InstagramIcon className="w-4 h-4 text-brand-terracotta shrink-0" />
                  <span>{businessConfig.contact.instagramHandle}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Oversized Brand Watermark Statement */}
        <div className="pt-12 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-brand-muted border-b border-brand-border/30">
          <div>
            <span className="text-brand-cream font-medium">GioCasa Hospitality</span> • Ayodhya, Uttar Pradesh, India
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Crafted for great food, epic games & true company</span>
          </div>
          <div className="flex items-center gap-3">
            <span>© {new Date().getFullYear()} GioCasa. All rights reserved.</span>
            <span>•</span>
            <button
              onClick={() => handleNav('admin')}
              className="text-[10px] text-brand-muted/50 hover:text-brand-gold transition-colors underline-offset-2 hover:underline"
            >
              Staff Arena Desk
            </button>
          </div>
        </div>

        {/* Big Subtle Editorial Type Background - Perfectly Centered Full Width */}
        <div className="mt-8 pt-4 w-full flex items-center justify-center text-center select-none pointer-events-none opacity-[0.07] font-serif text-[16vw] sm:text-[18vw] leading-none font-bold tracking-[-0.03em] text-brand-cream overflow-hidden">
          GIOCASA
        </div>
      </div>
    </footer>
  );
};
