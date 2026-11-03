import React, { useState } from 'react';
import { PageRoute } from '../types';
import { businessConfig } from '../data/businessConfig';
import { faqData } from '../data/faqData';
import { SectionHeader } from '../components/ui/SectionHeader';
import { LocationMapCard } from '../components/shared/LocationMapCard';
import { 
  MapPin, 
  Phone, 
  Mail, 
  MessageCircle, 
  Clock, 
  ChevronDown, 
  Send, 
  CheckCircle2, 
  Navigation
} from 'lucide-react';
import { InstagramIcon } from '../components/ui/InstagramIcon';
import { useContactSettings } from '../context/ContactSettingsContext';
import confetti from 'canvas-confetti';

interface ContactPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => {
  const { settings } = useContactSettings();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeFaqCategory, setActiveFaqCategory] = useState<string>('all');
  
  const whatsappNumber = settings.whatsappNumber || businessConfig.contact.whatsappNumber;
  const phone = settings.phone || businessConfig.contact.phone;
  const displayPhone = settings.displayPhone || businessConfig.contact.displayPhone;
  const instagramUrl = settings.instagramUrl || businessConfig.contact.instagramUrl;
  const instagramHandle = settings.instagramHandle || businessConfig.contact.instagramHandle;
  
  // Contact form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const filteredFaqs = faqData.filter(faq => 
    activeFaqCategory === 'all' || faq.category === activeFaqCategory
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    try {
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.7 }
      });
    } catch {
      // ignore
    }
  };

  const generateWhatsAppMessageUrl = () => {
    const msg = 
`💬 *GIOCASA AYODHYA — MESSAGE / INQUIRY* 💬
------------------------------------
*From:* ${formData.name || 'Guest'}
*Phone:* ${formData.phone || 'Not specified'}
*Topic:* ${formData.subject}

*Message:*
${formData.message || 'Hello GioCasa team, I have a query regarding your venue.'}

Please get back to me! Thank you.`;

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-brand-dark text-brand-cream pt-28 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-terracotta selection:text-white">
      <div className="max-w-7xl mx-auto space-y-20 sm:space-y-28">
        
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-[0.25em] text-brand-gold font-semibold block">
            Ayodhya, India
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-brand-cream">
            Find & Contact Us
          </h1>
          <p className="font-italic-accent text-xl sm:text-2xl text-brand-terracotta italic">
            We'd Love to Welcome You
          </p>
          <p className="text-sm sm:text-base text-brand-subtle font-light max-w-xl mx-auto leading-relaxed">
            Have a question about table reservations, gaming rates, private birthday bookings, or wood-fired pizza delivery? Reach out directly.
          </p>
        </div>

        {/* Location Map & Venue Card */}
        <div>
          <LocationMapCard />
        </div>

        {/* Contact Form & Direct Touchpoints Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Direct Touchpoints (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-brand-gold font-semibold block mb-1">
                Direct Channels
              </span>
              <h2 className="font-serif text-3xl font-bold text-brand-cream">
                Instant Concierge
              </h2>
            </div>

            <div className="space-y-4 text-xs">
              {/* WhatsApp */}
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-2xl bg-brand-surface border border-brand-border hover:border-emerald-500/50 flex items-center justify-between transition-all group shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-brand-cream font-bold text-sm">WhatsApp Concierge</div>
                    <div className="text-brand-subtle">Instant responses for bookings & delivery</div>
                  </div>
                </div>
                <Navigation className="w-4 h-4 text-brand-muted group-hover:text-brand-cream transition-colors" />
              </a>

              {/* Phone */}
              <a
                href={`tel:${phone}`}
                className="p-5 rounded-2xl bg-brand-surface border border-brand-border hover:border-brand-gold/50 flex items-center justify-between transition-all group shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-gold/15 border border-brand-gold/30 text-brand-gold flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-brand-cream font-bold text-sm">Direct Phone Line</div>
                    <div className="text-brand-gold font-mono">{displayPhone}</div>
                  </div>
                </div>
                <Navigation className="w-4 h-4 text-brand-muted group-hover:text-brand-cream transition-colors" />
              </a>

              {/* Instagram */}
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-2xl bg-brand-surface border border-brand-border hover:border-brand-terracotta/50 flex items-center justify-between transition-all group shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-terracotta/15 border border-brand-terracotta/30 text-brand-terracotta flex items-center justify-center">
                    <InstagramIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-brand-cream font-bold text-sm">Instagram Community</div>
                    <div className="text-brand-subtle">{instagramHandle}</div>
                  </div>
                </div>
                <Navigation className="w-4 h-4 text-brand-muted group-hover:text-brand-cream transition-colors" />
              </a>
            </div>
          </div>

          {/* Right Inquiry Form (7 cols) */}
          <div className="lg:col-span-7 bg-brand-surface rounded-3xl border border-brand-border p-6 sm:p-10 shadow-2xl">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <span className="text-xs uppercase tracking-[0.2em] text-brand-terracotta font-semibold block mb-1">
                    Send A Message
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-brand-cream">
                    Drop Us A Note
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-brand-subtle font-semibold mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-xs focus:outline-none focus:border-brand-terracotta"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-brand-subtle font-semibold mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 00000"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-xs focus:outline-none focus:border-brand-terracotta"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-brand-subtle font-semibold mb-1">
                    Subject / Topic
                  </label>
                  <select
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-xs focus:outline-none focus:border-brand-terracotta"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Birthday / Event Booking">Birthday / Group Celebration</option>
                    <option value="Tournament Entry">Tournament Registration</option>
                    <option value="Pizza Catering & Bulk Orders">Pizza Catering & Bulk Orders</option>
                    <option value="Feedback / Suggestion">Feedback / Suggestion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-brand-subtle font-semibold mb-1">
                    Your Message *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell us what you have in mind..."
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-xs focus:outline-none focus:border-brand-terracotta resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-4 px-6 rounded-full bg-brand-terracotta hover:bg-brand-terracottaHover text-brand-cream font-semibold text-xs uppercase tracking-widest transition-all shadow-luxury-ember flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Message</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8 space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h4 className="font-serif text-3xl font-bold text-brand-cream">
                    Message Received!
                  </h4>
                  <p className="text-xs text-brand-subtle font-light max-w-sm mx-auto">
                    Thank you, {formData.name}. We will get in touch with you shortly.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-3">
                  <p className="text-xs text-brand-cream">
                    Need an immediate reply? Send your note directly to WhatsApp:
                  </p>
                  <a
                    href={generateWhatsAppMessageUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs uppercase tracking-wider"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Forward to WhatsApp</span>
                  </a>
                </div>

                <button
                  onClick={() => setIsSubmitted(false)}
                  className="text-xs text-brand-muted hover:text-brand-cream underline"
                >
                  Send another message
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comprehensive FAQ Section */}
        <div className="space-y-8 max-w-4xl mx-auto">
          <SectionHeader
            tag="Got Questions?"
            title="Frequently Asked Questions"
            titleItalic="Everything you need to know."
            subtitle="Clear answers regarding our menu, gaming lounge rules, table reservations, and delivery."
          />

          {/* FAQ Category Filter */}
          <div className="flex items-center gap-2 justify-center pb-2 overflow-x-auto">
            {[
              { id: 'all', label: 'All FAQs' },
              { id: 'general', label: 'General & Floors' },
              { id: 'pizza', label: 'Pizza & Food' },
              { id: 'gaming', label: 'Gaming & Rates' },
              { id: 'events', label: 'Private Events' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFaqCategory(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                  activeFaqCategory === tab.id
                    ? 'bg-brand-gold text-brand-dark'
                    : 'bg-brand-surface border border-brand-border text-brand-subtle hover:text-brand-cream'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* FAQ Accordion */}
          <div className="space-y-3">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-brand-surface border border-brand-border overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-serif text-lg sm:text-xl font-bold text-brand-cream hover:text-brand-gold transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-brand-subtle shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-brand-gold' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-brand-subtle font-light leading-relaxed border-t border-brand-border/40">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
