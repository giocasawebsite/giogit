import React from 'react';
import { businessConfig } from '../../data/businessConfig';
import { 
  MapPin, 
  Phone, 
  Clock, 
  Navigation, 
  Car, 
  Wifi, 
  Bike, 
  MessageCircle,
  Sparkles
} from 'lucide-react';

export const LocationMapCard: React.FC = () => {
  return (
    <div className="bg-brand-surface rounded-3xl border border-brand-border overflow-hidden shadow-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Venue & Practical Info (6 cols) */}
        <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 space-y-8 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-brand-terracotta" />
                <span className="text-[10px] uppercase tracking-[0.25em] text-brand-gold font-semibold">
                  Visit The House
                </span>
              </div>
              <h3 className="font-serif text-3xl sm:text-4xl font-bold text-brand-cream tracking-tight">
                Find Your Way to GioCasa
              </h3>
              <p className="text-brand-subtle text-sm font-light mt-2 leading-relaxed">
                Located in the vibrant center of Ayodhya, featuring our 1st Floor Dine-in Restaurant & Slate Pool Table, and Basement High-Octane Gaming Arena.
              </p>
            </div>

            {/* Address */}
            <div className="space-y-2 p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border/60">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-brand-terracotta shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <div className="text-brand-cream font-semibold text-sm">
                    {businessConfig.brandName} • Ayodhya
                  </div>
                  <div className="text-brand-subtle">
                    {businessConfig.location.addressLine1}, {businessConfig.location.addressLine2}
                  </div>
                  <div className="text-brand-gold font-mono text-[11px] pt-1">
                    Landmark: {businessConfig.location.landmark}
                  </div>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-widest text-brand-cream/80 font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-gold" />
                <span>Operating Hours</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {businessConfig.hours.map((h, i) => (
                  <div key={i} className="p-3 rounded-xl bg-brand-surfaceElevated border border-brand-border/40 space-y-0.5">
                    <span className="text-brand-cream font-medium block">{h.days}</span>
                    <span className="text-brand-gold font-mono text-sm block font-semibold">{h.timing}</span>
                    <span className="text-[10px] text-brand-muted">{h.note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities Pills */}
            <div className="flex flex-wrap gap-2 pt-1 text-xs text-brand-subtle">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-surfaceElevated border border-brand-border">
                <Car className="w-3.5 h-3.5 text-brand-terracotta" />
                Free Parking Available
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-surfaceElevated border border-brand-border">
                <Wifi className="w-3.5 h-3.5 text-brand-gold" />
                High-Speed Gamer Wi-Fi
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-surfaceElevated border border-brand-border">
                <Bike className="w-3.5 h-3.5 text-emerald-400" />
                Citywide Pizza Delivery
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-brand-border/40">
            <a
              href={businessConfig.location.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-6 rounded-full bg-brand-terracotta hover:bg-brand-terracottaHover text-brand-cream font-semibold text-xs uppercase tracking-wider transition-all shadow-luxury-ember flex items-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              <span>Get Directions</span>
            </a>

            <a
              href={`https://wa.me/${businessConfig.contact.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-5 rounded-full bg-brand-surfaceElevated hover:bg-brand-surface border border-brand-border text-brand-cream text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Chat Concierge</span>
            </a>
          </div>
        </div>

        {/* Right Custom Styled Visual Map (6 cols) */}
        <div className="lg:col-span-6 relative min-h-[360px] lg:min-h-full bg-brand-dark overflow-hidden border-t lg:border-t-0 lg:border-l border-brand-border flex items-center justify-center">
          {/* Stylized Architectural Map Graphic */}
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:20px_20px]" />
          
          <div className="relative z-10 text-center p-8 max-w-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-brand-terracotta/20 border border-brand-terracotta/50 flex items-center justify-center mx-auto text-brand-terracotta animate-pulse shadow-glow-subtle">
              <MapPin className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <div className="font-serif text-2xl font-bold text-brand-cream">
                GioCasa Social House
              </div>
              <div className="text-xs text-brand-gold font-mono uppercase tracking-widest">
                Heart of Ayodhya • Uttar Pradesh
              </div>
              <p className="text-xs text-brand-subtle font-light pt-1">
                2 Floors of Gastronomy & High-Speed Entertainment
              </p>
            </div>

            <a
              href={businessConfig.location.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-cream text-brand-dark text-xs font-bold uppercase tracking-wider hover:bg-brand-creamMuted transition-all shadow-lg"
            >
              <span>Open in Google Maps</span>
              <Navigation className="w-3.5 h-3.5 text-brand-terracotta" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
