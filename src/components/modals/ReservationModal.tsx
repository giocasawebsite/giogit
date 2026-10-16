import React, { useState, useEffect } from 'react';
import { useBookingModal } from '../../context/BookingModalContext';
import { ReservationType, BookingFormData } from '../../types';
import { businessConfig } from '../../data/businessConfig';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  Flame, 
  Gamepad2, 
  PartyPopper, 
  Sparkles, 
  MessageCircle, 
  Phone, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ReservationModal: React.FC = () => {
  const { isOpen, reservationType: initialType, closeBookingModal } = useBookingModal();
  
  const [selectedType, setSelectedType] = useState<ReservationType>(initialType);
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    phone: '',
    email: '',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    guests: 2,
    reservationType: initialType,
    preferredLevel: 'any',
    specialRequests: ''
  });
  
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedType(initialType);
      setFormData(prev => ({
        ...prev,
        reservationType: initialType,
        preferredLevel: initialType === 'gaming' ? 'upstairs-gaming' : initialType === 'dining' ? 'downstairs-dine' : 'any'
      }));
      setIsSubmitted(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const reservationOptions = [
    {
      id: 'dining' as ReservationType,
      label: 'Dine & Café',
      sub: 'Basement Hearth • Pizza',
      icon: Flame,
      color: 'text-brand-orange'
    },
    {
      id: 'gaming' as ReservationType,
      label: 'Gaming Lounge',
      sub: '1st Floor • PS5 / Pool',
      icon: Gamepad2,
      color: 'text-brand-blue'
    },
    {
      id: 'combo' as ReservationType,
      label: 'Eat + Play',
      sub: 'Pizza + Reserved Station',
      icon: Sparkles,
      color: 'text-brand-pink'
    },
    {
      id: 'event' as ReservationType,
      label: 'Celebration',
      sub: 'Birthdays & Tournaments',
      icon: PartyPopper,
      color: 'text-emerald-400'
    }
  ];

  const timeSlots = [
    '12:00 PM', '01:00 PM', '02:30 PM', '04:00 PM', 
    '05:30 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  };

  const generateWhatsAppUrl = () => {
    const typeLabel = 
      selectedType === 'dining' ? 'Dine-In (Wood-Fired Pizza & Café)' :
      selectedType === 'gaming' ? 'Gaming Lounge (PS5 / Pool / Games)' :
      selectedType === 'combo' ? 'Eat + Play Combo Experience' : 'Birthday / Private Group Celebration';

    const msg = 
`🏛️ *GIOCASA AYODHYA — TABLE & LOUNGE RESERVATION* 🏛️
-----------------------------------------
*Experience:* ${typeLabel}
*Date:* ${formData.date}
*Time Slot:* ${formData.time}
*Guests:* ${formData.guests} Persons
*Preferred Area:* ${formData.preferredLevel.replace('-', ' ').toUpperCase()}

*Guest Details:*
• Name: ${formData.name}
• Phone: ${formData.phone}
${formData.specialRequests ? `• Special Requests: ${formData.specialRequests}` : ''}

Please confirm availability for our booking. Thank you!`;

    return `https://wa.me/${businessConfig.contact.whatsappNumber}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-brand-darker/85 backdrop-blur-md animate-fade-in selection:bg-brand-pink selection:text-white">
      <div 
        className="relative w-full max-w-xl max-h-[92dvh] bg-brand-surface rounded-2xl sm:rounded-3xl border border-brand-border shadow-2xl overflow-hidden my-auto flex flex-col text-white"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header Ribbon */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-brand-surfaceElevated to-brand-surface border-b border-brand-border flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-pink" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-brand-pink font-semibold">
                GioCasa Ayodhya
              </span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-tight">
              {isSubmitted ? 'Reservation Requested' : 'Reserve Table or Station'}
            </h3>
          </div>
          <button
            onClick={closeBookingModal}
            className="p-2 rounded-full bg-brand-surface border border-brand-border text-brand-muted hover:text-white hover:border-brand-pink transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Step 1: Select Experience */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brand-muted font-semibold mb-2">
                  1. Select Experience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {reservationOptions.map(opt => {
                    const Icon = opt.icon;
                    const isSelected = selectedType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedType(opt.id);
                          setFormData(prev => ({ ...prev, reservationType: opt.id }));
                        }}
                        className={`p-2.5 sm:p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-brand-surfaceElevated border-brand-pink shadow-luxury-pink'
                            : 'bg-brand-dark/50 border-brand-border hover:border-brand-borderStrong'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${opt.color}`} />
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-brand-pink bg-brand-pink' : 'border-brand-border'
                          }`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div>
                          <div className="font-serif text-sm sm:text-base font-semibold text-white leading-tight">
                            {opt.label}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-brand-muted line-clamp-1 mt-0.5">
                            {opt.sub}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Date, Time, Guests */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-brand-orange" />
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-brand-blue" />
                    Time Slot
                  </label>
                  <select
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink"
                  >
                    {timeSlots.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3 text-brand-pink" />
                    Guests
                  </label>
                  <select
                    value={formData.guests}
                    onChange={e => setFormData({ ...formData, guests: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 3: Contact Details */}
              <div className="space-y-2.5">
                <label className="block text-[10px] uppercase tracking-widest text-brand-muted font-semibold">
                  2. Contact Details
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Your Full Name *"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink placeholder:text-brand-muted"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      required
                      placeholder="Phone / WhatsApp *"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink placeholder:text-brand-muted"
                    />
                  </div>
                </div>

                <textarea
                  rows={2}
                  placeholder="Special notes (e.g. Birthday setup, FIFA tournament, quiet booth)..."
                  value={formData.specialRequests}
                  onChange={e => setFormData({ ...formData, specialRequests: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink placeholder:text-brand-muted resize-none"
                />
              </div>

              {/* Notice */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-surfaceElevated/60 border border-brand-border text-[11px] text-brand-muted">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero advance deposit. We hold slots for 15 mins.</span>
              </div>

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-full bg-brand-pink text-white font-bold text-xs uppercase tracking-wider hover:bg-brand-pinkHover active:scale-98 transition-all shadow-luxury-pink flex items-center justify-center gap-2 group"
                >
                  <span>Request Instant Reservation</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          ) : (
            /* Success confirmation screen */
            <div className="text-center py-4 sm:py-6 space-y-4 sm:space-y-5">
              <div className="w-12 h-12 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink flex items-center justify-center mx-auto animate-pulse">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-brand-pink font-semibold">
                  Booking Request Recorded
                </span>
                <h4 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  Grazie, {formData.name}!
                </h4>
                <p className="text-xs text-brand-muted max-w-md mx-auto font-light leading-relaxed">
                  We have noted your reservation for <strong className="text-white">{formData.guests} guests</strong> on <strong className="text-white">{formData.date} at {formData.time}</strong>.
                </p>
              </div>

              {/* Direct WhatsApp Confirmation Link */}
              <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-2.5">
                <p className="text-xs text-white font-medium">
                  Confirm immediately via WhatsApp for instant allocation:
                </p>
                <a
                  href={generateWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send on WhatsApp</span>
                </a>
              </div>

              <button
                onClick={closeBookingModal}
                className="text-xs text-brand-muted hover:text-white underline uppercase tracking-wider"
              >
                Back to Site
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
