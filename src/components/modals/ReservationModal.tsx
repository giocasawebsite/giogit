import React, { useState, useEffect } from 'react';
import { useBookingModal } from '../../context/BookingModalContext';
import { ReservationType, DiningReservation, EventReservation } from '../../types';
import { businessConfig } from '../../data/businessConfig';
import { reservationApi } from '../../services/reservationApi';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  Utensils, 
  PartyPopper, 
  MessageCircle, 
  CheckCircle2, 
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Building,
  Gamepad2,
  Sparkles,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PlayerIdLookup, VerifiedPlayerData } from '../common/PlayerIdLookup';
import { PlayerRegistrationModal } from '../common/PlayerRegistrationModal';

export const ReservationModal: React.FC = () => {
  const { isOpen, reservationType: initialType, closeBookingModal } = useBookingModal();

  // Mode: 'choice' | 'dining' | 'event'
  const [mode, setMode] = useState<'choice' | 'dining' | 'event'>('choice');
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Submissions state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    type: 'dining' | 'event';
    referenceCode: string;
    whatsappUrl: string;
    details: {
      name: string;
      phone: string;
      date: string;
      time: string;
      guests: number;
      subtitle: string;
    };
  } | null>(null);

  // Dining Form Data
  const [diningData, setDiningData] = useState({
    name: '',
    phone: '',
    sameWhatsApp: true,
    whatsappPhone: '',
    email: '',
    guests: 2,
    date: new Date().toISOString().split('T')[0],
    time: '07:30 PM',
    seatingPreference: 'Main Dining Hall',
    specialRequests: ''
  });

  // Event Form Data
  const [eventData, setEventData] = useState({
    name: '',
    phone: '',
    sameWhatsApp: true,
    whatsappPhone: '',
    email: '',
    eventType: 'Birthday Party',
    date: new Date().toISOString().split('T')[0],
    time: '06:00 PM',
    expectedGuests: 15,
    estimatedBudget: '₹5,000 - ₹10,000',
    foodRequirements: '',
    decorationRequirements: '',
    additionalMessage: ''
  });

  // Synchronize when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialType === 'event') {
        setMode('event');
      } else if (initialType === 'dining') {
        setMode('dining');
      } else {
        setMode('choice');
      }
      setSubmitError(null);
      setSubmissionSuccess(null);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const handlePlayerVerified = (player: VerifiedPlayerData) => {
    if (mode === 'dining') {
      setDiningData(prev => ({
        ...prev,
        name: player.name || prev.name,
        phone: player.phone || prev.phone,
        email: player.email || prev.email,
        specialRequests: prev.specialRequests
          ? `${prev.specialRequests} [Gio ID: ${player.gioId}]`
          : `Gio ID: ${player.gioId} (@${player.gamerTag})`
      }));
    } else if (mode === 'event') {
      setEventData(prev => ({
        ...prev,
        name: player.name || prev.name,
        phone: player.phone || prev.phone,
        email: player.email || prev.email,
        additionalMessage: prev.additionalMessage
          ? `${prev.additionalMessage} [Gio ID: ${player.gioId}]`
          : `Gio ID: ${player.gioId} (@${player.gamerTag})`
      }));
    }
  };

  const timeSlots = [
    '12:00 PM', '01:00 PM', '02:30 PM', '04:00 PM', 
    '05:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '10:00 PM'
  ];

  const eventTypes = [
    'Birthday Party',
    'Anniversary',
    'Corporate Gathering',
    'Private Party',
    'Friends Meetup',
    'Family Get-Together',
    'Other Celebration'
  ];

  const seatingPreferences = [
    'Main Dining Hall',
    'Window View',
    'Cozy Corner / Booth',
    'Outdoor Lounge Table',
    'Any Available Table'
  ];

  const budgetRanges = [
    'Under ₹5,000',
    '₹5,000 - ₹10,000',
    '₹10,000 - ₹25,000',
    '₹25,000 - ₹50,000',
    '₹50,000+',
    'Flexible / Discuss with Manager'
  ];

  // Submit Dining Reservation
  const handleDiningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const cleanPhone = diningData.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        throw new Error('Please enter a valid 10-digit mobile phone number.');
      }

      const res: DiningReservation = await reservationApi.submitDiningReservation({
        customerName: diningData.name.trim(),
        phone: cleanPhone.slice(-10),
        whatsappPhone: diningData.sameWhatsApp ? cleanPhone.slice(-10) : diningData.whatsappPhone.replace(/\D/g, '').slice(-10) || undefined,
        email: diningData.email.trim() || undefined,
        guests: Number(diningData.guests),
        date: diningData.date,
        time: diningData.time,
        seatingPreference: diningData.seatingPreference,
        specialRequests: diningData.specialRequests.trim() || undefined
      });

      // WhatsApp link construction
      const ownerNumber = businessConfig.contact.whatsappNumber || '919696028522';
      const msg = 
`🏛️ *GIOCASA AYODHYA — DINING RESERVATION* 🏛️
-----------------------------------------
*Booking Ref:* #${res.referenceCode}
*Location:* GioCasa Dine-in Restaurant — 1st Floor
*Date:* ${res.date}
*Time Slot:* ${res.time}
*Guests:* ${res.guests} Persons
*Seating:* ${res.seatingPreference || 'Standard'}

*Guest Details:*
• Name: ${res.customerName}
• Phone: ${res.phone}
${res.whatsappPhone ? `• WhatsApp: ${res.whatsappPhone}` : ''}
${res.email ? `• Email: ${res.email}` : ''}
${res.specialRequests ? `• Requests: ${res.specialRequests}` : ''}

Please confirm availability for our table. Thank you!`;

      const whatsappUrl = `https://wa.me/${ownerNumber}?text=${encodeURIComponent(msg)}`;

      setSubmissionSuccess({
        type: 'dining',
        referenceCode: res.referenceCode,
        whatsappUrl,
        details: {
          name: res.customerName,
          phone: res.phone,
          date: res.date,
          time: res.time,
          guests: res.guests,
          subtitle: 'GioCasa Dine-in Restaurant — 1st Floor'
        }
      });

      try {
        confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }

      // Try automatic open
      try {
        window.open(whatsappUrl, '_blank');
      } catch {
        // user popup blocker handled by fallback button
      }

    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit dining reservation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Event Reservation
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const cleanPhone = eventData.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        throw new Error('Please enter a valid 10-digit mobile phone number.');
      }
      if (!eventData.email.trim()) {
        throw new Error('Email address is required for event quotes and scheduling.');
      }

      const res: EventReservation = await reservationApi.submitEventReservation({
        customerName: eventData.name.trim(),
        phone: cleanPhone.slice(-10),
        whatsappPhone: eventData.sameWhatsApp ? cleanPhone.slice(-10) : eventData.whatsappPhone.replace(/\D/g, '').slice(-10) || undefined,
        email: eventData.email.trim(),
        eventType: eventData.eventType,
        date: eventData.date,
        time: eventData.time,
        expectedGuests: Number(eventData.expectedGuests),
        estimatedBudget: eventData.estimatedBudget,
        foodRequirements: eventData.foodRequirements.trim() || undefined,
        decorationRequirements: eventData.decorationRequirements.trim() || undefined,
        additionalMessage: eventData.additionalMessage.trim() || undefined
      });

      // WhatsApp link construction
      const ownerNumber = businessConfig.contact.whatsappNumber || '919696028522';
      const msg = 
`🎉 *GIOCASA AYODHYA — EVENT ENQUIRY* 🎉
-----------------------------------------
*Enquiry Ref:* #${res.referenceCode}
*Status:* Pending Confirmation
*Event Type:* ${res.eventType}
*Date:* ${res.date}
*Time Slot:* ${res.time}
*Expected Guests:* ${res.expectedGuests} Persons
${res.estimatedBudget ? `*Estimated Budget:* ${res.estimatedBudget}` : ''}

*Contact Details:*
• Name: ${res.customerName}
• Phone: ${res.phone}
${res.whatsappPhone ? `• WhatsApp: ${res.whatsappPhone}` : ''}
• Email: ${res.email}

${res.foodRequirements ? `*Food & Catering:* ${res.foodRequirements}` : ''}
${res.decorationRequirements ? `*Decor / Setup:* ${res.decorationRequirements}` : ''}
${res.additionalMessage ? `*Notes:* ${res.additionalMessage}` : ''}

Please review this event enquiry and provide confirmation/quote. Thank you!`;

      const whatsappUrl = `https://wa.me/${ownerNumber}?text=${encodeURIComponent(msg)}`;

      setSubmissionSuccess({
        type: 'event',
        referenceCode: res.referenceCode,
        whatsappUrl,
        details: {
          name: res.customerName,
          phone: res.phone,
          date: res.date,
          time: res.time,
          guests: res.expectedGuests,
          subtitle: `${res.eventType} • Pending Confirmation`
        }
      });

      try {
        confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }

      // Try automatic open
      try {
        window.open(whatsappUrl, '_blank');
      } catch {
        // user popup blocker handled by fallback button
      }

    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit event enquiry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyRef = () => {
    if (submissionSuccess?.referenceCode) {
      navigator.clipboard.writeText(submissionSuccess.referenceCode);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const handleGoToGamingSlots = () => {
    closeBookingModal();
    window.location.hash = '#/book';
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
        <div className="p-4 sm:p-5 bg-gradient-to-r from-brand-surfaceElevated to-brand-surface border-b border-brand-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {mode !== 'choice' && !submissionSuccess && (
              <button
                type="button"
                onClick={() => setMode('choice')}
                className="p-1.5 rounded-lg bg-brand-dark/60 border border-brand-border text-brand-muted hover:text-white hover:border-brand-pink transition-colors mr-1"
                aria-label="Back to choices"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-pink" />
                <span className="text-[10px] uppercase tracking-[0.25em] text-brand-pink font-semibold">
                  GioCasa Ayodhya
                </span>
              </div>
              <h3 className="font-serif text-lg sm:text-2xl font-bold text-white tracking-tight">
                {submissionSuccess
                  ? 'Reservation Recorded'
                  : mode === 'choice'
                  ? 'Reserve Table or Event'
                  : mode === 'dining'
                  ? 'Dining Table Reservation'
                  : 'Host an Event or Celebration'}
              </h3>
            </div>
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
          {/* Submission Success View */}
          {submissionSuccess ? (
            <div className="text-center py-4 space-y-4 sm:space-y-5">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">
                  {submissionSuccess.type === 'dining' ? 'Table Reserved' : 'Event Request Received'}
                </span>
                <h4 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  Grazie, {submissionSuccess.details.name}!
                </h4>
                <p className="text-xs text-brand-muted max-w-md mx-auto font-light leading-relaxed">
                  Your reservation is saved permanently in our system. Reference code:
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-dark border border-brand-border mt-1">
                  <span className="font-mono text-sm font-bold text-brand-pink">
                    #{submissionSuccess.referenceCode}
                  </span>
                  <button
                    onClick={handleCopyRef}
                    className="p-1 text-brand-muted hover:text-white transition-colors"
                    title="Copy reference code"
                  >
                    {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Reservation summary card */}
              <div className="p-3.5 rounded-2xl bg-brand-dark/60 border border-brand-border text-left text-xs space-y-2">
                <div className="flex items-center justify-between text-brand-muted text-[11px] border-b border-brand-border/60 pb-1.5">
                  <span className="text-white font-medium">{submissionSuccess.details.subtitle}</span>
                  <span className="capitalize text-amber-400 font-medium">
                    {submissionSuccess.type === 'dining' ? 'Confirmed' : 'Pending Confirmation'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-brand-muted block">Date & Time:</span>
                    <span className="text-white font-medium">{submissionSuccess.details.date} • {submissionSuccess.details.time}</span>
                  </div>
                  <div>
                    <span className="text-brand-muted block">Party Size:</span>
                    <span className="text-white font-medium">{submissionSuccess.details.guests} Guests</span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Confirmation Section */}
              <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-2.5">
                <p className="text-xs text-white font-medium">
                  We have pre-filled your reservation details for the GioCasa owner:
                </p>
                <a
                  href={submissionSuccess.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send Details on WhatsApp (9696028522)</span>
                </a>
                <p className="text-[10px] text-brand-muted">
                  Opening in WhatsApp ensures instant host notification and real-time confirmation.
                </p>
              </div>

              <div className="flex items-center justify-center gap-4 pt-1">
                <button
                  onClick={() => {
                    setSubmissionSuccess(null);
                    setMode('choice');
                  }}
                  className="text-xs text-brand-pink hover:text-white transition-colors"
                >
                  Make another booking
                </button>
                <span className="text-brand-muted">•</span>
                <button
                  onClick={closeBookingModal}
                  className="text-xs text-brand-muted hover:text-white underline uppercase tracking-wider"
                >
                  Back to Website
                </button>
              </div>
            </div>
          ) : mode === 'choice' ? (
            /* CHOICE SCREEN - EXACTLY 2 OPTIONS */
            <div className="space-y-4 sm:space-y-5">
              <div className="text-center space-y-1">
                <h4 className="font-serif text-lg sm:text-xl font-bold text-white">
                  What would you like to reserve?
                </h4>
                <p className="text-xs text-brand-muted">
                  Select dining tables or host a celebration at GioCasa Ayodhya.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Option A: Dining Reservation */}
                <button
                  type="button"
                  onClick={() => setMode('dining')}
                  className="group p-4 sm:p-5 rounded-2xl bg-brand-surfaceElevated/60 hover:bg-brand-surfaceElevated border border-brand-border hover:border-brand-pink transition-all text-left flex flex-col justify-between space-y-3 shadow-lg hover:shadow-luxury-pink"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/30 text-brand-orange flex items-center justify-center">
                      <Utensils className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-brand-orange/15 text-brand-orange border border-brand-orange/30">
                      1st Floor
                    </span>
                  </div>

                  <div>
                    <h5 className="font-serif text-base sm:text-lg font-bold text-white group-hover:text-brand-pink transition-colors">
                      Dining Reservation
                    </h5>
                    <p className="text-[11px] text-brand-pink font-medium mt-0.5">
                      GioCasa Dine-in Restaurant — 1st Floor
                    </p>
                    <p className="text-xs text-brand-muted mt-1.5 leading-relaxed">
                      Wood-fired pizzas, artisanal burgers, specialty café brews, pastas and fresh mocktails.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-brand-pink font-semibold pt-1">
                    <span>Reserve Dining Table</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Option B: Event Reservation */}
                <button
                  type="button"
                  onClick={() => setMode('event')}
                  className="group p-4 sm:p-5 rounded-2xl bg-brand-surfaceElevated/60 hover:bg-brand-surfaceElevated border border-brand-border hover:border-emerald-400 transition-all text-left flex flex-col justify-between space-y-3 shadow-lg hover:shadow-emerald-950/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <PartyPopper className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Special Events
                    </span>
                  </div>

                  <div>
                    <h5 className="font-serif text-base sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                      Event Reservation
                    </h5>
                    <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                      Celebrations, Birthdays & Group Gatherings
                    </p>
                    <p className="text-xs text-brand-muted mt-1.5 leading-relaxed">
                      Custom group menus, dedicated party hosting, themed decor setups and corporate celebrations.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold pt-1">
                    <span>Plan Event Enquiry</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Notice regarding Gaming Slot Booking */}
              <div className="p-3.5 rounded-2xl bg-brand-dark/70 border border-brand-border flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Gamepad2 className="w-4 h-4 text-brand-blue shrink-0" />
                  <div>
                    <span className="text-white font-medium block">Want to play games instead?</span>
                    <span className="text-[10px] text-brand-muted">PS5 Arena, Racing Simulators & Pool Table</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGoToGamingSlots}
                  className="px-3 py-1.5 rounded-xl bg-brand-blue/20 hover:bg-brand-blue/30 border border-brand-blue/40 text-brand-blue font-semibold text-xs whitespace-nowrap transition-colors flex items-center gap-1"
                >
                  <span>Book Gaming</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : mode === 'dining' ? (
            /* DINING RESERVATION FORM */
            <form onSubmit={handleDiningSubmit} className="space-y-4">
              {/* Floor location banner */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-orange/10 border border-brand-orange/30 text-xs">
                <Building className="w-4 h-4 text-brand-orange shrink-0" />
                <span className="text-white font-medium">
                  Facility Location: <strong className="text-brand-orange">GioCasa Dine-in Restaurant — 1st Floor</strong>
                </span>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Player ID 1-Click Autofill */}
              <PlayerIdLookup
                onVerified={handlePlayerVerified}
                onOpenRegister={() => setRegModalOpen(true)}
                className="mb-1"
              />

              {/* Customer Contact */}
              <div className="space-y-2.5">
                <label className="block text-[10px] uppercase tracking-widest text-brand-muted font-semibold">
                  1. Guest Information
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Your Full Name *"
                      value={diningData.name}
                      onChange={e => setDiningData({ ...diningData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink placeholder:text-brand-muted"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit Phone Number *"
                      value={diningData.phone}
                      onChange={e => setDiningData({ ...diningData, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink placeholder:text-brand-muted"
                    />
                  </div>
                </div>

                {/* Same WhatsApp Toggle */}
                <div className="flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    id="diningSameWhatsApp"
                    checked={diningData.sameWhatsApp}
                    onChange={e => setDiningData({ ...diningData, sameWhatsApp: e.target.checked })}
                    className="w-3.5 h-3.5 rounded bg-brand-dark border-brand-border text-brand-pink focus:ring-0"
                  />
                  <label htmlFor="diningSameWhatsApp" className="text-[11px] text-brand-muted cursor-pointer select-none">
                    WhatsApp is the same as above
                  </label>
                </div>

                {!diningData.sameWhatsApp && (
                  <div>
                    <input
                      type="tel"
                      placeholder="WhatsApp Number (if different)"
                      value={diningData.whatsappPhone}
                      onChange={e => setDiningData({ ...diningData, whatsappPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink placeholder:text-brand-muted"
                    />
                  </div>
                )}

                <div>
                  <input
                    type="email"
                    placeholder="Email Address (optional)"
                    value={diningData.email}
                    onChange={e => setDiningData({ ...diningData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink placeholder:text-brand-muted"
                  />
                </div>
              </div>

              {/* Table Details */}
              <div className="space-y-2.5">
                <label className="block text-[10px] uppercase tracking-widest text-brand-muted font-semibold">
                  2. Table & Schedule
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-brand-orange" />
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={diningData.date}
                      onChange={e => setDiningData({ ...diningData, date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-brand-blue" />
                      Time Slot
                    </label>
                    <select
                      value={diningData.time}
                      onChange={e => setDiningData({ ...diningData, time: e.target.value })}
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
                      value={diningData.guests}
                      onChange={e => setDiningData({ ...diningData, guests: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
                    Seating Preference
                  </label>
                  <select
                    value={diningData.seatingPreference}
                    onChange={e => setDiningData({ ...diningData, seatingPreference: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink"
                  >
                    {seatingPreferences.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <textarea
                  rows={2}
                  placeholder="Special requests (e.g. Birthday slice with candle, high chair, dietary notes)..."
                  value={diningData.specialRequests}
                  onChange={e => setDiningData({ ...diningData, specialRequests: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink placeholder:text-brand-muted resize-none"
                />
              </div>

              {/* Policy notice */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-surfaceElevated/60 border border-brand-border text-[11px] text-brand-muted">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero advance deposit required. Tables held for 15 minutes past booking time.</span>
              </div>

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-full bg-brand-pink text-white font-bold text-xs uppercase tracking-wider hover:bg-brand-pinkHover active:scale-98 transition-all shadow-luxury-pink flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Securing Table...</span>
                  ) : (
                    <>
                      <span>Confirm 1st Floor Dining Reservation</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* EVENT RESERVATION ENQUIRY FORM */
            <form onSubmit={handleEventSubmit} className="space-y-4">
              {/* Event Pending Notice */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="leading-relaxed">
                  <strong className="block text-white font-medium mb-0.5">Custom Event Coordination</strong>
                  Event reservations are reviewed by our operations manager to coordinate private space, custom menu catering, and decor setup. We will reach out on WhatsApp.
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Player ID 1-Click Autofill */}
              <PlayerIdLookup
                onVerified={handlePlayerVerified}
                onOpenRegister={() => setRegModalOpen(true)}
                className="mb-1"
              />

              {/* Organizer Contact */}
              <div className="space-y-2.5">
                <label className="block text-[10px] uppercase tracking-widest text-brand-muted font-semibold">
                  1. Organizer Contact
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Organizer Full Name *"
                      value={eventData.name}
                      onChange={e => setEventData({ ...eventData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-emerald-400 placeholder:text-brand-muted"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit Phone Number *"
                      value={eventData.phone}
                      onChange={e => setEventData({ ...eventData, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-emerald-400 placeholder:text-brand-muted"
                    />
                  </div>
                </div>

                {/* Same WhatsApp Toggle */}
                <div className="flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    id="eventSameWhatsApp"
                    checked={eventData.sameWhatsApp}
                    onChange={e => setEventData({ ...eventData, sameWhatsApp: e.target.checked })}
                    className="w-3.5 h-3.5 rounded bg-brand-dark border-brand-border text-emerald-400 focus:ring-0"
                  />
                  <label htmlFor="eventSameWhatsApp" className="text-[11px] text-brand-muted cursor-pointer select-none">
                    WhatsApp is the same as above
                  </label>
                </div>

                {!eventData.sameWhatsApp && (
                  <div>
                    <input
                      type="tel"
                      placeholder="WhatsApp Number (if different)"
                      value={eventData.whatsappPhone}
                      onChange={e => setEventData({ ...eventData, whatsappPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-emerald-400 placeholder:text-brand-muted"
                    />
                  </div>
                )}

                <div>
                  <input
                    type="email"
                    required
                    placeholder="Email Address (required for event quote) *"
                    value={eventData.email}
                    onChange={e => setEventData({ ...eventData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-emerald-400 placeholder:text-brand-muted"
                  />
                </div>
              </div>

              {/* Event Details */}
              <div className="space-y-2.5">
                <label className="block text-[10px] uppercase tracking-widest text-brand-muted font-semibold">
                  2. Event Details & Timing
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
                      Event Type
                    </label>
                    <select
                      value={eventData.eventType}
                      onChange={e => setEventData({ ...eventData, eventType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-emerald-400"
                    >
                      {eventTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
                      Estimated Guests
                    </label>
                    <input
                      type="number"
                      required
                      min={5}
                      max={150}
                      value={eventData.expectedGuests}
                      onChange={e => setEventData({ ...eventData, expectedGuests: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-400" />
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={eventData.date}
                      onChange={e => setEventData({ ...eventData, date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      Approx. Time
                    </label>
                    <select
                      value={eventData.time}
                      onChange={e => setEventData({ ...eventData, time: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-emerald-400"
                    >
                      {timeSlots.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
                    Estimated Budget
                  </label>
                  <select
                    value={eventData.estimatedBudget}
                    onChange={e => setEventData({ ...eventData, estimatedBudget: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-emerald-400"
                  >
                    {budgetRanges.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Food & Catering Wishes (e.g. Custom Pizza Platters, Mocktails, Cake)..."
                    value={eventData.foodRequirements}
                    onChange={e => setEventData({ ...eventData, foodRequirements: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-emerald-400 placeholder:text-brand-muted"
                  />
                </div>

                <textarea
                  rows={2}
                  placeholder="Decor, AV, or Special Instructions (e.g. Balloon arch, music playlist, projector)..."
                  value={eventData.decorationRequirements}
                  onChange={e => setEventData({ ...eventData, decorationRequirements: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-emerald-400 placeholder:text-brand-muted resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider active:scale-98 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Submitting Enquiry...</span>
                  ) : (
                    <>
                      <span>Submit Event Enquiry & Message Host</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Quick Player Registration Modal */}
      <PlayerRegistrationModal
        isOpen={regModalOpen}
        onClose={() => setRegModalOpen(false)}
        onRegistered={handlePlayerVerified}
      />
    </div>
  );
};