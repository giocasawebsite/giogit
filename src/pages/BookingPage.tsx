import React, { useState, useEffect } from 'react';
import { PageRoute } from '../types';
import { bookingApi, GamingResource, TimeSlot } from '../services/bookingApi';
import { useOrderCart } from '../context/OrderCartContext';
import { businessConfig } from '../data/businessConfig';
import { calculateBookingPrice, getPricingDescription } from '../utils/pricing';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Gamepad2,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Search,
  Sparkles,
  ShoppingBag,
  Phone,
  Copy,
  Check,
  RefreshCw,
  XCircle,
  ChevronRight,
  CalendarDays,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';

interface BookingPageProps {
  onNavigate: (page: PageRoute) => void;
  initialResourceId?: string;
}

export const BookingPage: React.FC<BookingPageProps> = ({ onNavigate, initialResourceId }) => {
  const { openDrawer } = useOrderCart();

  // Mode: 'booking' or 'lookup'
  const [activeTab, setActiveTab] = useState<'booking' | 'lookup'>('booking');

  // Multi-step State (1: Experience, 2: Date, 3: Duration, 4: Time, 5: Details, 6: Summary)
  const [step, setStep] = useState<number>(1);

  // Resources state
  const [resources, setResources] = useState<GamingResource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedResource, setSelectedResource] = useState<GamingResource | null>(null);

  // Date & Duration state
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  // Availability state
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [operatingHours, setOperatingHours] = useState<{ open: string; close: string }>({
    open: '11:00',
    close: '23:00',
  });

  // Customer Details Form
  const [customerName, setCustomerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [numberOfPeople, setNumberOfPeople] = useState<number>(2);
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // Form Validation & Submission
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Lookup State
  const [lookupQuery, setLookupQuery] = useState<string>('');
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // 1. Fetch Resources on Mount
  useEffect(() => {
    async function loadResources() {
      try {
        const data = await bookingApi.getResources();
        setResources(data);
        if (initialResourceId) {
          const match = data.find((r) => r.id === initialResourceId && !r.isMaintenance);
          if (match) setSelectedResource(match);
        } else if (data.length > 0) {
          const firstActive = data.find((r) => !r.isMaintenance) || data[0];
          setSelectedResource(firstActive);
        }
      } catch (err: any) {
        console.error('Failed to load resources:', err);
      }
    }
    loadResources();
  }, [initialResourceId]);

  // Adjust number of people when resource changes
  useEffect(() => {
    if (selectedResource) {
      setNumberOfPeople(Math.max(selectedResource.playersCapacity.min, Math.min(numberOfPeople, selectedResource.playersCapacity.max)));
    }
  }, [selectedResource]);

  // 2. Fetch Slots whenever Resource, Date, or Duration changes
  useEffect(() => {
    if (!selectedResource || !selectedDate) return;

    let isMounted = true;
    async function loadSlots() {
      setLoadingSlots(true);
      setSlotsError(null);
      setSelectedSlot(null);
      try {
        const res = await bookingApi.getAvailability(selectedResource!.id, selectedDate, durationMinutes);
        if (isMounted) {
          setSlots(res.slots);
          setOperatingHours(res.operatingHours);
        }
      } catch (err: any) {
        if (isMounted) {
          setSlotsError(err.message || 'Could not load slots for this date.');
          setSlots([]);
        }
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    }

    loadSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedResource?.id, selectedDate, durationMinutes]);

  // Calculate dynamic price
  const calculateTotal = (): number => {
    if (!selectedResource) return 0;
    return calculateBookingPrice(
      selectedResource.category,
      durationMinutes,
      numberOfPeople,
      selectedResource.ratePerHour
    );
  };

  // Format 24h to 12h
  const formatTime12 = (time24: string): string => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m || 0).padStart(2, '0')} ${period}`;
  };

  // Quick date presets (Today, Tomorrow, Day after)
  const getDatePreset = (offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  };

  const getReadableDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Handle Form Submission
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource || !selectedDate || !selectedSlot) return;

    if (!customerName.trim() || customerName.trim().length < 2) {
      setSubmissionError('Please enter your full name.');
      setStep(3);
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setSubmissionError('Please enter a valid 10-digit mobile number.');
      setStep(3);
      return;
    }

    setSubmitting(true);
    setSubmissionError(null);

    try {
      const result = await bookingApi.createBooking({
        customerName: customerName.trim(),
        phone: cleanPhone.slice(-10),
        email: email ? email.trim() : undefined,
        resourceId: selectedResource.id,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        durationMinutes,
        numberOfPeople,
        notes: specialRequests.trim() || undefined,
      });

      setConfirmedBooking(result);
      setSubmitting(false);

      // Trigger Celebration Confetti
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#C85A32', '#C5A059', '#FBF8F3', '#53624D', '#FFA500'],
      });
    } catch (err: any) {
      setSubmitting(false);
      setSubmissionError(err.message || 'Booking conflict or server error. Please select another slot.');
      // Refresh slots immediately in case someone else booked it
      if (selectedResource) {
        bookingApi.getAvailability(selectedResource.id, selectedDate, durationMinutes).then((res) => {
          setSlots(res.slots);
        });
      }
    }
  };

  // Handle Customer Lookup
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;

    setLookupLoading(true);
    setLookupError(null);
    setActionSuccessMsg(null);
    try {
      const results = await bookingApi.lookupBooking(lookupQuery.trim());
      setLookupResults(results);
    } catch (err: any) {
      setLookupError(err.message || 'No booking found matching that ID or phone number.');
      setLookupResults([]);
    } finally {
      setLookupLoading(false);
    }
  };

  // Handle Booking Extension
  const handleExtend = async (bookingId: string, additionalMinutes: number) => {
    setExtendingId(bookingId);
    setActionSuccessMsg(null);
    setLookupError(null);
    try {
      const updated = await bookingApi.extendBooking(bookingId, additionalMinutes);
      setLookupResults((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      setActionSuccessMsg(`Booking ${bookingId} successfully extended by ${additionalMinutes} mins!`);
    } catch (err: any) {
      setLookupError(err.message || 'Extension unavailable. Slot is already booked.');
    } finally {
      setExtendingId(null);
    }
  };

  // Handle Booking Cancellation
  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const updated = await bookingApi.cancelBooking(bookingId, 'Customer requested cancellation via portal');
      setLookupResults((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      setActionSuccessMsg(`Booking ${bookingId} has been cancelled.`);
    } catch (err: any) {
      setLookupError(err.message || 'Failed to cancel booking.');
    }
  };

  const copyBookingId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Filtered resources based on category pill
  const filteredResources = resources.filter((r) => {
    if (selectedCategory === 'all') return true;
    return r.category === selectedCategory;
  });

  return (
    <div className="min-h-screen bg-brand-dark text-white pt-28 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-pink selection:text-white">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-surface border border-brand-blue/40 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-brand-blue font-bold">
              LEVEL 1 • THE ARENA • LIVE BOOKING
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            Reserve Your Gaming Station
          </h1>

          <p className="font-italic-accent text-lg sm:text-xl text-brand-pink italic">
            PlayStation 5 Pro • Hot-Shot Slate Championship Pool • The Arena
          </p>

          <p className="text-xs sm:text-sm text-brand-muted max-w-xl mx-auto font-light leading-relaxed">
            Real-time automated slot reservation with double-booking protection. Select your station, choose your
            duration, and step straight into the competition.
          </p>

          {/* Primary View Switcher: Book vs Lookup */}
          <div className="inline-flex p-1 rounded-2xl bg-brand-surface border border-brand-border shadow-xl mt-4">
            <button
              onClick={() => {
                setActiveTab('booking');
                setConfirmedBooking(null);
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'booking'
                  ? 'bg-brand-pink text-white shadow-luxury-pink'
                  : 'text-brand-muted hover:text-white'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Book A Station</span>
            </button>

            <button
              onClick={() => setActiveTab('lookup')}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'lookup'
                  ? 'bg-brand-pink text-white shadow-luxury-pink'
                  : 'text-brand-muted hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Find / Manage Booking</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: 3-STEP STREAMLINED BOOKING FLOW */}
        {/* ========================================================================= */}
        {activeTab === 'booking' && !confirmedBooking && (
          <div className="space-y-8">
            {/* Step Progress Bar */}
            <div className="bg-brand-surface/60 border border-brand-border/60 rounded-2xl p-4 max-w-xl mx-auto shadow-xl">
              <div className="grid grid-cols-3 gap-2 sm:gap-6 text-center">
                {[
                  { num: 1, label: 'Station' },
                  { num: 2, label: 'Schedule' },
                  { num: 3, label: 'Confirm' },
                ].map((s) => (
                  <button
                    key={s.num}
                    onClick={() => {
                      if (s.num < step) setStep(s.num);
                    }}
                    disabled={s.num > step}
                    className={`flex flex-col items-center gap-1 transition-all ${
                      step === s.num
                        ? 'text-brand-pink font-bold'
                        : step > s.num
                        ? 'text-brand-blue cursor-pointer hover:opacity-80'
                        : 'text-brand-muted/40 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                        step === s.num
                          ? 'bg-brand-pink text-white ring-2 ring-brand-pink/40 scale-105 shadow-luxury-pink'
                          : step > s.num
                          ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/40'
                          : 'bg-brand-surfaceElevated text-brand-muted/40 border border-brand-border/40'
                      }`}
                    >
                      {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                    </div>
                    <span className="text-[11px] sm:text-xs font-mono uppercase tracking-wider">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step Content Card */}
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 md:p-10 max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
              {/* STEP 1: CHOOSE EXPERIENCE & STATION */}
              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border/60">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-brand-blue font-bold">Step 1 of 3</span>
                      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                        Choose Gaming Equipment
                      </h2>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'all', label: 'All Equipment' },
                        ...(resources.some((r) => r.category === 'ps5') ? [{ id: 'ps5', label: 'PS5 Pro (3 Units)' }] : []),
                        ...(resources.some((r) => r.category === 'pool') ? [{ id: 'pool', label: '8-Ball Slate Pool' }] : []),
                        ...(resources.some((r) => r.category === 'foosball') ? [{ id: 'foosball', label: 'Foosball' }] : []),
                        ...(resources.some((r) => r.category === 'boardgames') ? [{ id: 'boardgames', label: 'Tabletop Vault' }] : []),
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-mono tracking-wider transition-all ${
                            selectedCategory === cat.id
                              ? 'bg-brand-blue text-white font-bold shadow-md'
                              : 'bg-brand-surfaceElevated border border-brand-border text-brand-muted hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Station Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {filteredResources.map((res) => {
                      const isSelected = selectedResource?.id === res.id;
                      const isMaint = res.isMaintenance;

                      return (
                        <div
                          key={res.id}
                          onClick={() => {
                            if (!isMaint) setSelectedResource(res);
                          }}
                          className={`rounded-2xl border transition-all p-5 flex flex-col justify-between relative cursor-pointer ${
                            isMaint
                              ? 'opacity-60 bg-brand-surfaceElevated/50 border-red-900/40 cursor-not-allowed'
                              : isSelected
                              ? 'bg-brand-surfaceElevated border-brand-pink ring-2 ring-brand-pink/40 shadow-xl -translate-y-0.5'
                              : 'bg-brand-surfaceElevated/60 border-brand-border hover:border-brand-blue/60 hover:bg-brand-surfaceElevated'
                          }`}
                        >
                          {/* Image & Price Header */}
                          <div className="space-y-3">
                            <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-brand-dark">
                              <img
                                src={res.image}
                                alt={res.name}
                                className="w-full h-full object-cover brightness-90"
                              />
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-full bg-brand-dark/90 backdrop-blur-md border border-brand-border text-[11px] font-mono font-bold text-brand-blue shadow-md">
                                  {getPricingDescription(res.category)}
                                </span>
                              </div>

                              {isMaint ? (
                                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-red-950/90 border border-red-600 text-red-300 text-[10px] font-mono font-bold flex items-center gap-1 shadow-md">
                                  <AlertCircle className="w-3 h-3 text-red-400" />
                                  <span>Maintenance</span>
                                </div>
                              ) : isSelected ? (
                                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-brand-pink text-white text-[10px] font-mono font-bold flex items-center gap-1 shadow-md">
                                  <Check className="w-3 h-3" />
                                  <span>Selected</span>
                                </div>
                              ) : null}
                            </div>

                            <div>
                              <h3 className="font-serif text-lg font-bold text-white">{res.name}</h3>
                              <p className="text-[11px] font-mono text-brand-pink mt-0.5 font-semibold">
                                Capacity: {res.playersCapacity.min} – {res.playersCapacity.max} Players
                              </p>
                            </div>

                            <ul className="space-y-1 text-xs text-brand-muted pt-1">
                              {res.specs.slice(0, 3).map((spec, idx) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                                  <span>{spec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Footer Action */}
                          <div className="pt-4 mt-3 border-t border-brand-border/40 flex items-center justify-between">
                            <span className="text-[11px] font-mono text-brand-muted">
                              Min: {res.minDurationMinutes}m • Max: {res.maxDurationMinutes / 60}h
                            </span>
                            <span
                              className={`text-xs font-semibold uppercase tracking-wider ${
                                isMaint
                                  ? 'text-red-400'
                                  : isSelected
                                  ? 'text-brand-pink font-bold'
                                  : 'text-white'
                              }`}
                            >
                              {isMaint ? 'Unavailable' : isSelected ? 'Station Chosen' : 'Select'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-6 flex justify-end">
                    <button
                      onClick={() => setStep(2)}
                      disabled={!selectedResource || selectedResource.isMaintenance}
                      className="px-8 py-3.5 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white font-semibold text-xs uppercase tracking-widest transition-all shadow-luxury-pink flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Proceed to Schedule</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CHOOSE SCHEDULE (DATE, DURATION & TIME SLOT ON SAME STEP) */}
              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-brand-border/60">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-brand-blue font-bold">Step 2 of 3</span>
                      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                        Choose Date, Duration & Time
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-brand-muted">
                      Station: <strong className="text-brand-blue">{selectedResource?.name}</strong>
                    </span>
                  </div>

                  {/* 1. Date Selection */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono uppercase tracking-wider text-brand-muted flex items-center gap-1.5 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-brand-blue" />
                        <span>1. Select Date</span>
                      </label>
                      <span className="text-xs font-serif text-white font-bold">
                        {getReadableDate(selectedDate)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                      {[
                        { label: 'Today', offset: 0 },
                        { label: 'Tomorrow', offset: 1 },
                        { label: 'Day After', offset: 2 },
                      ].map((p) => {
                        const pDate = getDatePreset(p.offset);
                        const isSelected = selectedDate === pDate;
                        return (
                          <button
                            key={p.offset}
                            type="button"
                            onClick={() => {
                              setSelectedDate(pDate);
                              setSelectedSlot(null);
                            }}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              isSelected
                                ? 'bg-brand-surfaceElevated border-brand-blue ring-2 ring-brand-blue/40 text-white shadow-md'
                                : 'bg-brand-surfaceElevated/50 border-brand-border text-brand-muted hover:text-white hover:bg-brand-surfaceElevated'
                            }`}
                          >
                            <span className="text-[11px] font-bold uppercase tracking-wider block text-brand-pink">
                              {p.label}
                            </span>
                            <span className="text-xs font-mono font-medium text-white mt-0.5 block truncate">
                              {pDate.slice(5)}
                            </span>
                          </button>
                        );
                      })}

                      {/* Custom Date Input */}
                      <div className="relative">
                        <input
                          type="date"
                          min={todayStr}
                          value={selectedDate}
                          onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setSelectedSlot(null);
                          }}
                          className="w-full h-full min-h-[52px] bg-brand-surfaceElevated/50 border border-brand-border rounded-xl px-2.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-brand-pink text-center cursor-pointer hover:bg-brand-surfaceElevated"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Duration Selection */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono uppercase tracking-wider text-brand-muted flex items-center gap-1.5 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-brand-blue" />
                        <span>2. Select Duration</span>
                      </label>
                      <span className="text-xs font-mono text-brand-blue font-bold">
                        {selectedResource ? getPricingDescription(selectedResource.category) : 'Select Station'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                      {[
                        { mins: 30, label: '30 Mins', badge: 'Quick Match' },
                        { mins: 60, label: '1 Hour', badge: 'Most Popular', popular: true },
                        { mins: 90, label: '1.5 Hours', badge: 'Extended Session' },
                        { mins: 120, label: '2 Hours', badge: 'Championship' },
                      ].map((opt) => {
                        const isSelected = durationMinutes === opt.mins;
                        const cost = selectedResource
                          ? calculateBookingPrice(selectedResource.category, opt.mins, numberOfPeople, selectedResource.ratePerHour)
                          : 0;

                        return (
                          <button
                            key={opt.mins}
                            type="button"
                            onClick={() => {
                              setDurationMinutes(opt.mins);
                              setSelectedSlot(null);
                            }}
                            className={`p-3 rounded-xl border text-center transition-all cursor-pointer relative flex flex-col justify-between ${
                              isSelected
                                ? 'bg-brand-surfaceElevated border-brand-blue ring-2 ring-brand-blue/40 text-white shadow-md -translate-y-0.5'
                                : 'bg-brand-surfaceElevated/50 border-brand-border text-brand-muted hover:text-white hover:bg-brand-surfaceElevated'
                            }`}
                          >
                            {opt.popular && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-brand-pink text-white text-[8px] font-mono font-bold uppercase tracking-wider shadow">
                                {opt.badge}
                              </span>
                            )}
                            <div className="font-serif text-sm sm:text-base font-bold text-white">
                              {opt.label}
                            </div>
                            <div className="text-xs font-mono font-bold text-brand-pink mt-1">
                              ₹{cost}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Live Time Slots Grid */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                      <label className="text-xs font-mono uppercase tracking-wider text-brand-muted flex items-center gap-1.5 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                        <span>3. Pick Available Time Slot</span>
                      </label>

                      {/* Legend */}
                      <div className="flex items-center gap-3 text-[10px] font-mono">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Available
                        </span>
                        <span className="flex items-center gap-1 text-red-400">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Booked
                        </span>
                        <span className="flex items-center gap-1 text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Playing Now
                        </span>
                      </div>
                    </div>

                    {loadingSlots ? (
                      <div className="py-12 text-center space-y-2 bg-brand-dark/40 rounded-2xl border border-brand-border/40">
                        <RefreshCw className="w-6 h-6 text-brand-blue animate-spin mx-auto" />
                        <p className="text-xs font-mono text-brand-muted">
                          Checking real-time slot availability from database...
                        </p>
                      </div>
                    ) : slotsError ? (
                      <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-center space-y-1">
                        <AlertCircle className="w-5 h-5 text-red-400 mx-auto" />
                        <p className="text-xs text-red-200">{slotsError}</p>
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="py-8 text-center text-xs text-brand-muted bg-brand-dark/40 rounded-2xl border border-brand-border/40">
                        No slots available for this date and duration. Please select another date.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                        {slots.map((s, idx) => {
                          const isSelected = selectedSlot?.startTime === s.startTime;
                          const isAvailable = s.status === 'available';

                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => {
                                if (isAvailable) setSelectedSlot(s);
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-brand-blue text-white border-brand-blue ring-2 ring-brand-blue/40 shadow-lg scale-102'
                                  : s.status === 'available'
                                  ? 'bg-brand-surfaceElevated border-emerald-900/40 text-white hover:border-emerald-500 hover:bg-emerald-950/20 cursor-pointer'
                                  : s.status === 'playing'
                                  ? 'bg-amber-950/20 border-amber-900/30 text-amber-500/60 cursor-not-allowed opacity-60'
                                  : s.status === 'booked'
                                  ? 'bg-red-950/20 border-red-900/30 text-red-500/60 cursor-not-allowed opacity-60'
                                  : 'bg-stone-900/40 border-stone-800 text-stone-600 cursor-not-allowed opacity-40'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-mono text-xs font-bold">
                                  {formatTime12(s.startTime)}
                                </span>
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isSelected
                                      ? 'bg-white'
                                      : s.status === 'available'
                                      ? 'bg-emerald-400'
                                      : s.status === 'playing'
                                      ? 'bg-amber-400'
                                      : s.status === 'booked'
                                      ? 'bg-red-400'
                                      : 'bg-stone-600'
                                  }`}
                                />
                              </div>

                              <div className="flex items-center justify-between mt-1 text-[10px] font-mono opacity-80">
                                <span>to {formatTime12(s.endTime)}</span>
                                <span className="uppercase text-[9px]">
                                  {isSelected ? '✓ Selected' : s.status}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected Slot Callout Pill */}
                  {selectedSlot && (
                    <div className="p-3.5 rounded-2xl bg-brand-surfaceElevated border border-brand-blue/60 flex items-center justify-between text-xs animate-fade-in shadow-md">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-white font-medium">
                          Selected Slot: <strong className="text-brand-blue">{formatTime12(selectedSlot.startTime)} – {formatTime12(selectedSlot.endTime)}</strong> ({durationMinutes} mins)
                        </span>
                      </div>
                      <span className="font-mono font-bold text-brand-pink text-sm">
                        ₹{calculateTotal()}
                      </span>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="pt-4 flex items-center justify-between border-t border-brand-border/40">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-3 rounded-full bg-brand-surfaceElevated border border-brand-border text-white text-xs uppercase tracking-wider font-semibold flex items-center gap-2 hover:bg-brand-surface transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Station</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={!selectedSlot}
                      className="px-8 py-3.5 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white font-semibold text-xs uppercase tracking-widest transition-all shadow-luxury-pink flex items-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>Next: Enter Details</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: GUEST DETAILS & INSTANT CONFIRMATION */}
              {step === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="pb-4 border-b border-brand-border/60">
                    <span className="text-xs font-mono uppercase tracking-widest text-brand-blue font-bold">Step 3 of 3</span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                      Guest Details & Review
                    </h2>
                  </div>

                  {submissionError && (
                    <div className="p-4 rounded-xl bg-red-950/60 border border-red-700 text-xs text-red-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{submissionError}</span>
                    </div>
                  )}

                  {/* 2-Column Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Form Details (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Full Name */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs font-mono uppercase tracking-wider text-brand-muted">
                            Full Name <span className="text-brand-pink">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Rahul Sharma"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-pink"
                          />
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs font-mono uppercase tracking-wider text-brand-muted">
                            Mobile Number (+91) <span className="text-brand-pink">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-brand-muted">
                              +91
                            </span>
                            <input
                              type="tel"
                              required
                              maxLength={10}
                              placeholder="98765 43210"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                              className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl pl-12 pr-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-brand-pink"
                            />
                          </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs font-mono uppercase tracking-wider text-brand-muted">
                            Email Address <span className="text-brand-muted/70 text-[10px]">(Optional for receipt)</span>
                          </label>
                          <input
                            type="email"
                            placeholder="rahul@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-pink"
                          />
                        </div>

                        {/* Number of Players */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs font-mono uppercase tracking-wider text-brand-muted">
                            Number of Players (Max {selectedResource?.playersCapacity.max})
                          </label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setNumberOfPeople(Math.max(selectedResource?.playersCapacity.min || 1, numberOfPeople - 1))}
                              className="w-11 h-11 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white font-bold text-lg flex items-center justify-center hover:bg-brand-surface"
                            >
                              -
                            </button>
                            <span className="font-mono text-lg font-bold text-brand-blue w-8 text-center">
                              {numberOfPeople}
                            </span>
                            <button
                              type="button"
                              onClick={() => setNumberOfPeople(Math.min(selectedResource?.playersCapacity.max || 4, numberOfPeople + 1))}
                              className="w-11 h-11 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white font-bold text-lg flex items-center justify-center hover:bg-brand-surface"
                            >
                              +
                            </button>
                            <span className="text-xs text-brand-muted font-mono">
                              ({selectedResource?.playersCapacity.min}–{selectedResource?.playersCapacity.max} allowed)
                            </span>
                          </div>
                        </div>

                        {/* Special Requests */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs font-mono uppercase tracking-wider text-brand-muted">
                            Special Requests / Notes <span className="text-brand-muted/70 text-[10px]">(Optional)</span>
                          </label>
                          <textarea
                            rows={2}
                            placeholder="e.g. Need 4 controllers for FIFA, tournament setup..."
                            value={specialRequests}
                            onChange={(e) => setSpecialRequests(e.target.value)}
                            className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-brand-pink"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Live Boarding Pass Summary & Confirm (5 cols) */}
                    <div className="lg:col-span-5 rounded-2xl bg-brand-dark/95 border border-brand-border/90 p-5 space-y-4 shadow-xl">
                      <div className="pb-3 border-b border-brand-border/40">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-brand-blue block font-bold">
                          Reservation Ticket
                        </span>
                        <h3 className="font-serif text-lg font-bold text-white mt-0.5">
                          {selectedResource?.name}
                        </h3>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-brand-border/30">
                          <span className="text-brand-muted">Date:</span>
                          <span className="font-semibold text-white">{getReadableDate(selectedDate)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-brand-border/30">
                          <span className="text-brand-muted">Time Slot:</span>
                          <span className="font-semibold text-brand-blue font-mono">
                            {selectedSlot ? `${formatTime12(selectedSlot.startTime)} – ${formatTime12(selectedSlot.endTime)}` : ''}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-brand-border/30">
                          <span className="text-brand-muted">Duration:</span>
                          <span className="font-mono text-white">{durationMinutes} Minutes</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-brand-border/30">
                          <span className="text-brand-muted">Players:</span>
                          <span className="font-mono text-white">{numberOfPeople} Guests</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-brand-border/30">
                          <span className="text-brand-muted">Payment Mode:</span>
                          <span className="font-semibold text-emerald-400">Pay at Venue</span>
                        </div>
                      </div>

                      {/* Total Price Callout */}
                      <div className="p-3.5 rounded-xl bg-brand-surfaceElevated border border-brand-border/60 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-brand-muted block">Total Amount</span>
                          <span className="text-[10px] text-emerald-400">✓ Zero deposit required</span>
                        </div>
                        <span className="font-serif text-2xl font-bold text-brand-pink">
                          ₹{calculateTotal()}
                        </span>
                      </div>

                      {/* Big Submit Button */}
                      <button
                        type="button"
                        onClick={handleConfirmBooking}
                        disabled={submitting}
                        className="w-full py-4 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white font-bold text-xs uppercase tracking-widest transition-all shadow-luxury-pink flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Locking Your Slot...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>CONFIRM BOOKING</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="w-full text-center text-xs text-brand-muted hover:text-white transition-colors pt-1"
                      >
                        ← Change Schedule
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* POST-BOOKING CONFIRMATION SCREEN (Requirement 11 & 21) */}
        {/* ========================================================================= */}
        {activeTab === 'booking' && confirmedBooking && (
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            {/* Confirmation Ticket Card */}
            <div className="bg-brand-surface border border-brand-pink/60 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <span className="text-xs font-mono uppercase tracking-[0.25em] text-brand-pink font-bold block">
                  BOOKING CONFIRMED
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
                  {confirmedBooking.resourceName}
                </h2>
                <p className="text-xs text-brand-muted">
                  Your gaming slot is officially locked into our live database.
                </p>
              </div>

              {/* Booking ID Banner with 1-Click Copy */}
              <div className="p-4 rounded-2xl bg-brand-dark border border-brand-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-brand-muted uppercase block">Booking Pass ID</span>
                  <span className="font-mono text-xl font-bold text-brand-pink tracking-widest">
                    {confirmedBooking.id}
                  </span>
                </div>
                <button
                  onClick={() => copyBookingId(confirmedBooking.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-brand-surfaceElevated border border-brand-border text-xs font-mono text-white hover:text-brand-pink transition-colors flex items-center gap-1.5"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
                </button>
              </div>

              {/* Receipt Details */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div>
                  <span className="text-[10px] font-mono text-brand-muted block uppercase">Date</span>
                  <span className="font-semibold text-white mt-0.5 block">
                    {getReadableDate(confirmedBooking.date)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-brand-muted block uppercase">Reserved Slot</span>
                  <span className="font-semibold text-brand-blue mt-0.5 block">
                    {formatTime12(confirmedBooking.startTime)} – {formatTime12(confirmedBooking.endTime)} ({confirmedBooking.durationMinutes}m)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-brand-muted block uppercase">Guest Name</span>
                  <span className="font-semibold text-white mt-0.5 block">
                    {confirmedBooking.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-brand-muted block uppercase">Contact Phone</span>
                  <span className="font-mono font-semibold text-white mt-0.5 block">
                    +91 {confirmedBooking.phone}
                  </span>
                </div>
              </div>

              {/* Cross-Sell Experience Callout (Requirement 21) */}
              <div className="p-5 rounded-2xl bg-brand-dark/80 border border-brand-orange/40 space-y-3 pt-4">
                <span className="text-[11px] font-mono uppercase tracking-widest text-brand-orange font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                  <span>Make it a Full GioCasa Night</span>
                </span>
                <p className="text-xs text-white/90 leading-relaxed font-light">
                  Enhance your session with wood-fired sourdough pizzas & specialty cold coffee brewed downstairs at The Hearth, served straight to your game station.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={openDrawer}
                    className="py-2.5 px-4 rounded-xl bg-brand-surfaceElevated hover:bg-brand-surface border border-brand-orange/40 text-brand-orange font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-brand-orange" />
                    <span>Pre-order Wood-Fired Pizza</span>
                  </button>

                  <a
                    href={`https://wa.me/${businessConfig.contact.whatsappNumber}?text=${encodeURIComponent(
                      `Ciao GioCasa! I just booked station ${confirmedBooking.id} for ${confirmedBooking.date}. Can I ask about birthday/snack setups?`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-brand-surfaceElevated hover:bg-brand-surface border border-brand-border text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Inquire Birthday / Group Setup</span>
                  </a>
                </div>
              </div>

              {/* Confirmation Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-brand-border/40">
                <button
                  onClick={() => {
                    setConfirmedBooking(null);
                    setStep(1);
                  }}
                  className="w-full sm:w-1/2 py-3.5 rounded-full bg-brand-surfaceElevated border border-brand-border text-white font-semibold text-xs uppercase tracking-wider hover:bg-brand-surface transition-colors"
                >
                  Book Another Experience
                </button>

                <button
                  onClick={() => onNavigate('home')}
                  className="w-full sm:w-1/2 py-3.5 rounded-full bg-brand-pink text-white font-semibold text-xs uppercase tracking-wider shadow-luxury-pink hover:bg-brand-pinkHover transition-colors"
                >
                  Back to GioCasa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CUSTOMER BOOKING LOOKUP & EXTENSION (Requirement 12 & 6) */}
        {/* ========================================================================= */}
        {activeTab === 'lookup' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
            {/* Search Card */}
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-white">
                  Find Your Reservation
                </h2>
                <p className="text-xs text-brand-muted mt-1">
                  Enter your Booking Pass ID (e.g. <code>GC-NV572Y</code>) or your 10-digit mobile number.
                </p>
              </div>

              <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-brand-muted absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter Booking ID (e.g. GC-XXXXXX) or Phone"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-2xl pl-11 pr-4 py-3.5 text-white font-mono text-sm focus:outline-none focus:border-brand-pink"
                  />
                </div>
                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="py-3.5 px-8 rounded-2xl bg-brand-pink hover:bg-brand-pinkHover text-white font-semibold text-xs uppercase tracking-wider shadow-luxury-pink flex items-center justify-center gap-2 shrink-0 disabled:opacity-60"
                >
                  {lookupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Search</span>
                </button>
              </form>

              {lookupError && (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-700 text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}

              {actionSuccessMsg && (
                <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* Results List */}
            {lookupResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-widest text-brand-blue font-bold">
                  Found {lookupResults.length} Reservation(s)
                </h3>

                {lookupResults.map((b) => (
                  <div
                    key={b.id}
                    className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-brand-border/40">
                      <div>
                        <span className="font-mono text-sm font-bold text-brand-blue">{b.id}</span>
                        <h4 className="font-serif text-lg font-bold text-white mt-0.5">{b.resourceName}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                            b.status === 'confirmed'
                              ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                              : b.status === 'active'
                              ? 'bg-amber-950 border border-amber-600 text-amber-300 animate-pulse'
                              : b.status === 'completed'
                              ? 'bg-stone-900 border border-stone-700 text-stone-400'
                              : 'bg-red-950 border border-red-700 text-red-400'
                          }`}
                        >
                          {b.status === 'active' ? '● Playing Now' : b.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-brand-muted block uppercase">Date</span>
                        <span className="font-semibold text-white">{getReadableDate(b.date)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-brand-muted block uppercase">Time</span>
                        <span className="font-semibold text-brand-blue">
                          {formatTime12(b.startTime)} – {formatTime12(b.endTime)} ({b.durationMinutes}m)
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-brand-muted block uppercase">Guest</span>
                        <span className="font-semibold text-white">{b.customerName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-brand-muted block uppercase">Amount</span>
                        <span className="font-mono font-bold text-brand-pink">₹{b.totalAmount}</span>
                      </div>
                    </div>

                    {/* Booking Actions: Extend or Cancel (if active or upcoming) */}
                    {(b.status === 'confirmed' || b.status === 'active') && (
                      <div className="pt-3 border-t border-brand-border/40 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleExtend(b.id, 30)}
                            disabled={extendingId === b.id}
                            className="px-3.5 py-1.5 rounded-lg bg-brand-surfaceElevated border border-brand-blue/40 text-brand-blue text-xs font-mono font-bold hover:bg-brand-surface transition-colors flex items-center gap-1.5"
                          >
                            {extendingId === b.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                            <span>Extend +30m</span>
                          </button>

                          <button
                            onClick={() => handleExtend(b.id, 60)}
                            disabled={extendingId === b.id}
                            className="px-3.5 py-1.5 rounded-lg bg-brand-surfaceElevated border border-brand-blue/40 text-brand-blue text-xs font-mono font-bold hover:bg-brand-surface transition-colors flex items-center gap-1.5"
                          >
                            {extendingId === b.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                            <span>Extend +1h</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-mono text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Booking</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
