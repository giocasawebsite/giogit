import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  UserCheck,
  Clock,
  MapPin,
  Calendar,
  Users,
  Gamepad2,
  Utensils,
  Trophy,
  PartyPopper,
  DollarSign,
  FileText,
  RotateCcw,
  Check,
  Copy,
  ExternalLink,
  Phone,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react';
import { VerifiedGuestBooking, PaymentMethod, PaymentStatus } from '../../types';
import { verificationApi } from '../../services/verificationApi';

interface AdminGuestVerificationProps {
  passcode?: string;
  adminUser?: string;
}

export const AdminGuestVerification: React.FC<AdminGuestVerificationProps> = ({
  passcode,
  adminUser = 'Staff',
}) => {
  // Search state
  const [code, setCode] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Active verified booking state
  const [booking, setBooking] = useState<VerifiedGuestBooking | null>(null);

  // Action states
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Payment Verification Sheet/Modal state
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus>('paid');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [staffName, setStaffName] = useState<string>(adminUser || 'Front Desk Staff');
  const [isUpdatingPayment, setIsUpdatingPayment] = useState<boolean>(false);
  const [paymentUpdateError, setPaymentUpdateError] = useState<string | null>(null);

  // Recent Verifications
  const [recentList, setRecentList] = useState<VerifiedGuestBooking[]>([]);
  const [loadingRecent, setLoadingRecent] = useState<boolean>(false);

  // Copy feedback
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent verifications on mount
  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    try {
      setLoadingRecent(true);
      const res = await verificationApi.getRecentVerifications(15, passcode);
      setRecentList(res);
    } catch {
      // Non-fatal
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleLookup = async (lookupCode: string = code) => {
    const clean = lookupCode.trim();
    if (!/^\d{4}$/.test(clean)) {
      setSearchError('Please enter a complete 4-digit numeric code.');
      return;
    }

    try {
      setIsSearching(true);
      setSearchError(null);
      setCheckInError(null);
      setActionSuccessMsg(null);

      const result = await verificationApi.lookupGuestCode(clean, passcode);
      setBooking(result);
      setSelectedPaymentStatus(result.paymentStatus || 'unpaid');
      setSelectedPaymentMethod(result.paymentMethod || 'cash');
      setPaymentReference(result.paymentReference || '');
    } catch (err: any) {
      setBooking(null);
      setSearchError(err.message || 'No booking found for this code.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCode(val);
    setSearchError(null);
    if (val.length === 4) {
      handleLookup(val);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLookup();
    }
  };

  const handleClear = () => {
    setCode('');
    setBooking(null);
    setSearchError(null);
    setCheckInError(null);
    setActionSuccessMsg(null);
    if (inputRef.current) inputRef.current.focus();
  };

  // Button 1: Confirm Booking / Guest Arrived
  const handleCheckIn = async () => {
    if (!booking) return;

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      setCheckInError('Cannot check in a cancelled booking.');
      return;
    }

    if (booking.checkInStatus === 'checked_in') {
      setCheckInError('Guest is already checked in.');
      return;
    }

    try {
      setIsCheckingIn(true);
      setCheckInError(null);
      setActionSuccessMsg(null);

      const updated = await verificationApi.checkInGuest(
        {
          bookingType: booking.bookingType,
          id: booking.id,
          staffName: staffName || adminUser || 'Staff',
        },
        passcode
      );

      setBooking(updated);
      setActionSuccessMsg(`✓ Guest ${updated.customerName} successfully checked in!`);
      loadRecent();
    } catch (err: any) {
      setCheckInError(err.message || 'Failed to check in guest.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Button 2: Verify Payment action
  const handleOpenPaymentModal = () => {
    if (!booking) return;
    const initialStatus = booking.paymentStatus === 'unpaid' ? 'paid' : booking.paymentStatus;
    setSelectedPaymentStatus(initialStatus);
    setSelectedPaymentMethod(booking.paymentMethod || 'cash');
    setPaymentReference(booking.paymentReference || '');

    const rem = booking.remainingBalance !== undefined
      ? booking.remainingBalance
      : (booking.paymentStatus === 'paid' ? 0 : (booking.totalAmount || 0));
    setAmountReceived(rem > 0 ? String(rem) : String(booking.totalAmount || 0));

    setPaymentUpdateError(null);
    setShowPaymentModal(true);
  };

  const handleSavePayment = async () => {
    if (!booking) return;

    try {
      setIsUpdatingPayment(true);
      setPaymentUpdateError(null);

      const parsedAmount =
        selectedPaymentStatus === 'paid' && amountReceived.trim() !== ''
          ? Number(amountReceived)
          : undefined;

      const result = await verificationApi.verifyPayment(
        {
          bookingType: booking.bookingType,
          id: booking.id,
          paymentStatus: selectedPaymentStatus,
          paymentMethod: selectedPaymentStatus === 'paid' ? selectedPaymentMethod : undefined,
          paymentReference: selectedPaymentStatus === 'paid' ? paymentReference.trim() || undefined : undefined,
          staffName: staffName || adminUser || 'Staff',
          amount: parsedAmount,
        },
        passcode
      );

      setBooking(result.data);
      setShowPaymentModal(false);

      if (result.pointsAwarded && result.pointsAwarded > 0) {
        setActionSuccessMsg(
          `✓ Payment of ₹${parsedAmount ?? result.data.paidAmount ?? result.data.totalAmount} confirmed! Awarded +${result.pointsAwarded} loyalty pts (Player balance: ${result.playerLoyaltyBalance ?? 'Updated'} pts).`
        );
      } else {
        setActionSuccessMsg(`✓ Payment status updated to ${selectedPaymentStatus.toUpperCase()}!`);
      }
      loadRecent();
    } catch (err: any) {
      setPaymentUpdateError(err.message || 'Failed to update payment status.');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const getBookingTypeIcon = (type: string) => {
    switch (type) {
      case 'gaming':
        return <Gamepad2 className="w-5 h-5 text-brand-pink" />;
      case 'dining':
        return <Utensils className="w-5 h-5 text-brand-orange" />;
      case 'event':
        return <PartyPopper className="w-5 h-5 text-purple-400" />;
      case 'tournament':
        return <Trophy className="w-5 h-5 text-brand-gold" />;
      default:
        return <Calendar className="w-5 h-5 text-brand-blue" />;
    }
  };

  const getBookingTypeBadge = (type: string) => {
    switch (type) {
      case 'gaming':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-brand-pink/15 text-brand-pink border border-brand-pink/30 flex items-center gap-1">
            <Gamepad2 className="w-3 h-3" /> Gaming Session
          </span>
        );
      case 'dining':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-brand-orange/15 text-brand-orange border border-brand-orange/30 flex items-center gap-1">
            <Utensils className="w-3 h-3" /> Dine-in Table
          </span>
        );
      case 'event':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1">
            <PartyPopper className="w-3 h-3" /> Private Event
          </span>
        );
      case 'tournament':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-brand-gold/15 text-brand-gold border border-brand-gold/30 flex items-center gap-1">
            <Trophy className="w-3 h-3" /> Tournament Contender
          </span>
        );
      default:
        return null;
    }
  };

  const isCancelled = booking?.status === 'cancelled' || booking?.status === 'rejected';
  const isCheckedIn = booking?.checkInStatus === 'checked_in';
  const isPaid = booking?.paymentStatus === 'paid' || booking?.paymentStatus === 'waived';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-brand-gold/15 text-brand-gold border border-brand-gold/30">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand-gold font-bold block">
                  FRONT DESK OPERATIONS
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  4-Digit Guest Verification & Check-in
                </h2>
              </div>
            </div>
            <p className="text-xs text-brand-muted max-w-xl font-light">
              Enter the guest's 4-digit code provided on their booking confirmation to verify their reservation, confirm arrival, and process payments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadRecent}
              disabled={loadingRecent}
              className="px-3.5 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-xs font-mono text-brand-subtle hover:text-white transition-colors flex items-center gap-1.5"
              title="Refresh Recent Verifications"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRecent ? 'animate-spin text-brand-gold' : ''}`} />
              <span>Refresh Feed</span>
            </button>
          </div>
        </div>

        {/* 4-Digit Input Bar */}
        <div className="mt-6 pt-6 border-t border-brand-border/60">
          <div className="max-w-xl mx-auto space-y-3">
            <label className="block text-center text-xs font-mono uppercase tracking-wider text-brand-muted">
              Enter 4-Digit Guest Verification Code
            </label>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={code}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g. 4829"
                  autoFocus
                  className="w-full text-center text-3xl sm:text-4xl font-mono font-extrabold tracking-[0.4em] py-3.5 px-4 rounded-2xl bg-brand-dark border-2 border-brand-border focus:border-brand-gold focus:outline-none text-white shadow-inner placeholder:text-brand-muted/30 placeholder:tracking-normal transition-all"
                />
                {code && (
                  <button
                    onClick={handleClear}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-brand-muted hover:text-white transition-colors rounded-lg bg-brand-surfaceElevated/80"
                    title="Clear"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleLookup()}
                disabled={isSearching || code.length !== 4}
                className="py-4 px-6 rounded-2xl bg-brand-gold hover:bg-brand-gold/90 disabled:opacity-40 disabled:hover:bg-brand-gold text-brand-dark font-mono font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg whitespace-nowrap"
              >
                {isSearching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Verify</span>
              </button>
            </div>

            {/* Quick Numeric Keypad for Venue Tablets / Mobile Staff */}
            <div className="flex sm:hidden justify-center gap-1.5 pt-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (code.length < 4) {
                      const updated = `${code}${num}`;
                      setCode(updated);
                      if (updated.length === 4) handleLookup(updated);
                    }
                  }}
                  className="w-8 h-8 rounded-lg bg-brand-surfaceElevated border border-brand-border text-xs font-mono text-white active:bg-brand-gold active:text-brand-dark transition-colors"
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Search Feedback */}
            {searchError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-mono flex items-center gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}
            {actionSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs font-mono flex items-center gap-2.5 animate-fade-in font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VERIFIED GUEST POPUP / RESULT CARD */}
      {booking && (
        <div className="bg-brand-surface border-2 border-brand-gold/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden animate-fade-in">
          {/* Cancelled Warning Banner */}
          {isCancelled && (
            <div className="p-4 rounded-2xl bg-red-500/15 border-2 border-red-500/60 text-red-300 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span>⚠️ BOOKING CANCELLED</span>
              </div>
              <p className="text-xs text-red-300/90 leading-relaxed font-light">
                This booking was cancelled and is no longer valid. Guest check-in cannot be confirmed for cancelled reservations.
              </p>
            </div>
          )}

          {/* Card Header: Guest Identity & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-brand-surfaceElevated border border-brand-border flex items-center justify-center shrink-0">
                {getBookingTypeIcon(booking.bookingType)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-2xl font-bold text-white">
                    {booking.customerName}
                  </h3>
                  {getBookingTypeBadge(booking.bookingType)}
                </div>
                <div className="flex items-center gap-3 text-xs text-brand-muted mt-0.5">
                  <a
                    href={`tel:${booking.phone}`}
                    className="hover:text-brand-gold transition-colors flex items-center gap-1 font-mono"
                  >
                    <Phone className="w-3 h-3" />
                    <span>+91 {booking.phone}</span>
                  </a>
                  {booking.email && (
                    <span className="hidden sm:inline font-mono">• {booking.email}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Code Display Badge */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-dark border border-brand-gold/50 text-right">
                <span className="text-[9px] font-mono uppercase text-brand-gold tracking-widest block font-bold">
                  VERIFIED CODE
                </span>
                <span className="font-mono text-2xl font-extrabold text-white tracking-[0.25em]">
                  {booking.guestCode}
                </span>
              </div>
            </div>
          </div>

          {/* Core Booking Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            {/* Reference / ID */}
            <div className="p-3.5 rounded-2xl bg-brand-surfaceElevated border border-brand-border/80 space-y-1">
              <span className="text-[10px] text-brand-muted uppercase block">Booking Reference</span>
              <div className="flex items-center justify-between">
                <strong className="text-white font-bold">{booking.reference || booking.id}</strong>
                <button
                  type="button"
                  onClick={() => handleCopy(booking.reference || booking.id)}
                  className="p-1 text-brand-muted hover:text-brand-pink transition-colors"
                  title="Copy ID"
                >
                  {copiedText === (booking.reference || booking.id) ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Floor Location */}
            <div className="p-3.5 rounded-2xl bg-brand-surfaceElevated border border-brand-border/80 space-y-1">
              <span className="text-[10px] text-brand-muted uppercase block">Facility Location</span>
              <div className="flex items-center gap-1.5 text-brand-gold font-bold">
                <MapPin className="w-3.5 h-3.5 text-brand-gold" />
                <span>{booking.location || 'GioCasa Hub'}</span>
              </div>
            </div>

            {/* Date & Time Slot */}
            <div className="p-3.5 rounded-2xl bg-brand-surfaceElevated border border-brand-border/80 space-y-1">
              <span className="text-[10px] text-brand-muted uppercase block">Date & Time Slot</span>
              <div className="flex items-center gap-1.5 text-brand-blue font-bold">
                <Clock className="w-3.5 h-3.5 text-brand-blue" />
                <span>
                  {booking.date} • {booking.time}
                  {booking.endTime ? ` – ${booking.endTime}` : ''}
                </span>
              </div>
            </div>

            {/* Guests / Capacity */}
            <div className="p-3.5 rounded-2xl bg-brand-surfaceElevated border border-brand-border/80 space-y-1">
              <span className="text-[10px] text-brand-muted uppercase block">Guests / Seats</span>
              <div className="flex items-center gap-1.5 text-white font-bold">
                <Users className="w-3.5 h-3.5 text-brand-muted" />
                <span>
                  {booking.numberOfPeople || booking.guests || booking.expectedGuests || 1} Guests
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Details: Equipment / Event Info / Notes */}
          <div className="p-4 rounded-2xl bg-brand-dark/70 border border-brand-border/60 text-xs space-y-2">
            {booking.resourceName && (
              <div className="flex items-center justify-between border-b border-brand-border/40 pb-2">
                <span className="text-brand-muted">Assigned Equipment:</span>
                <span className="font-bold text-white">{booking.resourceName}</span>
              </div>
            )}
            {booking.eventType && (
              <div className="flex items-center justify-between border-b border-brand-border/40 pb-2">
                <span className="text-brand-muted">Event Occasion:</span>
                <span className="font-bold text-purple-300">{booking.eventType}</span>
              </div>
            )}
            {booking.notes && (
              <div className="flex items-start justify-between gap-4 pt-1">
                <span className="text-brand-muted shrink-0">Requests & Notes:</span>
                <span className="text-brand-subtle text-right">{booking.notes}</span>
              </div>
            )}
          </div>

          {/* Status Banners (Check-in & Payment Status) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Check-in Status Card */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                isCheckedIn
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/40 text-amber-400'
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider block font-bold">
                  Check-in Status
                </span>
                <strong className="text-sm font-bold flex items-center gap-1.5">
                  {isCheckedIn ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Checked In</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Pending Arrival</span>
                    </>
                  )}
                </strong>
                {isCheckedIn && booking.checkedInAt && (
                  <span className="text-[10px] text-brand-muted block font-mono">
                    At {new Date(booking.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {booking.checkedInBy ? ` by ${booking.checkedInBy}` : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Payment Status Card */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                isPaid
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/40 text-red-400'
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider block font-bold">
                  Payment Status
                </span>
                <strong className="text-sm font-bold flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  <span className="uppercase">{booking.paymentStatus || 'UNPAID'}</span>
                  {booking.totalAmount !== undefined && (
                    <span className="text-white ml-1">(₹{booking.totalAmount})</span>
                  )}
                </strong>
                {isPaid && (
                  <span className="text-[10px] text-brand-muted block font-mono">
                    Method: {(booking.paymentMethod || 'cash').toUpperCase()}
                    {booking.paymentReference ? ` • Ref: ${booking.paymentReference}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* TWO PRIMARY ACTION BUTTONS (Requirements 3) */}
          <div className="pt-2 border-t border-brand-border/60 flex flex-col sm:flex-row items-center gap-3.5">
            {/* Button 1: Confirm Booking / Guest Arrived */}
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={isCheckingIn || isCheckedIn || isCancelled}
              className={`flex-1 w-full py-4 px-6 rounded-2xl font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                isCheckedIn
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                  : isCancelled
                  ? 'bg-brand-surfaceElevated text-brand-muted border border-brand-border cursor-not-allowed opacity-50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.99]'
              }`}
            >
              {isCheckingIn ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isCheckedIn ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              <span>
                {isCheckedIn
                  ? `Guest Already Checked In (${booking.checkedInBy || 'Staff'})`
                  : 'Confirm Booking / Guest Arrived'}
              </span>
            </button>

            {/* Button 2: Verify Payment */}
            <button
              type="button"
              onClick={handleOpenPaymentModal}
              disabled={isCancelled}
              className="flex-1 w-full py-4 px-6 rounded-2xl bg-brand-surfaceElevated hover:bg-brand-surface border border-brand-gold/60 text-brand-gold font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4 text-brand-gold" />
              <span>Verify / Update Payment</span>
            </button>
          </div>

          {/* Action error banner */}
          {checkInError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-mono flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{checkInError}</span>
            </div>
          )}

          {/* Audit History Log */}
          {booking.auditLogs && booking.auditLogs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-brand-border/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-muted block mb-2 font-bold">
                Verification & Status Audit History
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {booking.auditLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-brand-dark/40 border border-brand-border/40 text-[11px] font-mono flex items-center justify-between text-brand-muted"
                  >
                    <span>
                      <strong className="text-white capitalize mr-1.5">{log.action.replace('_', ' ')}:</strong>
                      {typeof log.details === 'string' ? log.details : log.details ? JSON.stringify(log.details) : ''}
                    </span>
                    <span className="text-[10px] shrink-0 text-brand-subtle ml-2">
                      {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} (by {log.performedBy})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAYMENT VERIFICATION MODAL / SHEET */}
      {showPaymentModal && booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-darker/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-surface border-2 border-brand-gold/60 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-brand-gold" />
                <h3 className="font-serif text-xl font-bold text-white">
                  Verify Payment Status
                </h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 text-brand-muted hover:text-white transition-colors rounded-lg bg-brand-surfaceElevated"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Financial Balance Summary */}
              <div className="p-3.5 rounded-xl bg-brand-dark border border-brand-border space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-brand-muted block uppercase">Guest & Reference</span>
                    <strong className="text-white text-sm">{booking.customerName}</strong>
                  </div>
                  {booking.totalAmount !== undefined && (
                    <div className="text-right">
                      <span className="text-[10px] text-brand-muted block uppercase">Total Amount</span>
                      <strong className="text-white text-sm font-bold">₹{booking.totalAmount}</strong>
                    </div>
                  )}
                </div>
                {booking.totalAmount !== undefined && (
                  <div className="pt-2 border-t border-brand-border/40 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[10px] text-brand-muted block uppercase">Paid So Far</span>
                      <span className="text-emerald-400 font-bold">
                        ₹{booking.paidAmount !== undefined ? booking.paidAmount : (booking.paymentStatus === 'paid' ? booking.totalAmount : 0)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-brand-muted block uppercase">Remaining Balance</span>
                      <span className={`font-bold ${(booking.remainingBalance ?? (booking.paymentStatus === 'paid' ? 0 : booking.totalAmount)) > 0 ? 'text-brand-orange' : 'text-emerald-400'}`}>
                        ₹{booking.remainingBalance !== undefined ? booking.remainingBalance : (booking.paymentStatus === 'paid' ? 0 : booking.totalAmount)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Radio Choice */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-brand-muted block font-bold">
                  Select Payment Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['paid', 'unpaid', 'pending', 'waived'] as PaymentStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setSelectedPaymentStatus(status)}
                      className={`p-3 rounded-xl border text-center uppercase tracking-wider text-xs font-bold transition-all ${
                        selectedPaymentStatus === status
                          ? 'border-brand-gold bg-brand-gold/20 text-brand-gold'
                          : 'border-brand-border bg-brand-surfaceElevated text-brand-muted hover:text-white'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount to Receive (shown if Paid) */}
              {selectedPaymentStatus === 'paid' && (
                <div className="space-y-2 animate-fade-in p-3 rounded-xl bg-brand-dark/60 border border-brand-border">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase text-brand-muted block font-bold">
                      Amount Received (₹)
                    </label>
                    <div className="flex items-center gap-1.5">
                      {booking.remainingBalance !== undefined && booking.remainingBalance > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setAmountReceived(String(booking.remainingBalance))}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-brand-surfaceElevated border border-brand-border text-brand-gold hover:bg-brand-gold/10"
                          >
                            Full: ₹{booking.remainingBalance}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAmountReceived(String(Math.ceil((booking.remainingBalance || 0) / 2)))}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-brand-surfaceElevated border border-brand-border text-brand-blue hover:bg-brand-blue/10"
                          >
                            Half: ₹{Math.ceil((booking.remainingBalance || 0) / 2)}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="Enter amount in ₹"
                    className="w-full py-2 px-3 rounded-xl bg-brand-dark border border-brand-border focus:border-brand-gold focus:outline-none text-white font-bold text-sm"
                  />
                  {/* Live Points Preview Calculation */}
                  <div className="p-2.5 rounded-lg bg-brand-pink/10 border border-brand-pink/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                      <span className="text-[11px] text-brand-subtle">
                        Loyalty Points to Award:{' '}
                        <strong className="text-brand-pink font-bold">
                          +{Math.floor(((Number(amountReceived) || 0) * 10) / 100)} pts
                        </strong>
                      </span>
                    </div>
                    <span className="text-[9px] text-brand-muted font-mono">1 pt per ₹10 received</span>
                  </div>
                </div>
              )}

              {/* Payment Method Selector (shown if Paid) */}
              {selectedPaymentStatus === 'paid' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[10px] uppercase text-brand-muted block font-bold">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['cash', 'upi', 'card', 'other'] as PaymentMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(method)}
                        className={`p-2.5 rounded-xl border text-center uppercase tracking-wider text-xs font-bold transition-all ${
                          selectedPaymentMethod === method
                            ? 'border-brand-blue bg-brand-blue/20 text-brand-blue'
                            : 'border-brand-border bg-brand-surfaceElevated text-brand-muted hover:text-white'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction Reference (Optional) */}
              {selectedPaymentStatus === 'paid' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[10px] uppercase text-brand-muted block font-bold">
                    Transaction Reference (Optional UTR / Receipt No.)
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. UPI-1234567890"
                    className="w-full py-2.5 px-3.5 rounded-xl bg-brand-dark border border-brand-border focus:border-brand-gold focus:outline-none text-white text-xs"
                  />
                </div>
              )}

              {/* Staff Member */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-brand-muted block font-bold">
                  Verifying Staff Member
                </label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Staff / Admin Name"
                  className="w-full py-2.5 px-3.5 rounded-xl bg-brand-dark border border-brand-border focus:border-brand-gold focus:outline-none text-white text-xs"
                />
              </div>

              {/* Previous Payment History (if any) */}
              {Array.isArray(booking.payments) && booking.payments.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] uppercase text-brand-muted block font-bold">
                    Recorded Payments ({booking.payments.length})
                  </label>
                  <div className="max-h-28 overflow-y-auto rounded-xl border border-brand-border bg-brand-dark p-2 space-y-1">
                    {booking.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-[11px] py-1 border-b border-brand-border/30 last:border-none">
                        <span className="text-white font-bold">₹{p.amount} <span className="text-brand-muted text-[10px] uppercase font-normal">({p.paymentMethod || 'cash'})</span></span>
                        <div className="flex items-center gap-2">
                          {p.pointsAwarded !== undefined && p.pointsAwarded > 0 && (
                            <span className="text-brand-pink font-semibold text-[10px]">+{p.pointsAwarded} pts</span>
                          )}
                          <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${p.paymentStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {p.paymentStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {paymentUpdateError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentUpdateError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-surfaceElevated border border-brand-border text-xs font-mono text-brand-muted hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                disabled={isUpdatingPayment}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-gold hover:bg-brand-gold/90 text-brand-dark font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg"
              >
                {isUpdatingPayment ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Confirm Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECENT VERIFICATIONS / ARRIVALS FEED */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-brand-gold" />
            <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
              Recent Front Desk Check-ins & Verifications
            </h3>
          </div>
          <span className="text-xs font-mono text-brand-muted">
            {recentList.length} recent record{recentList.length === 1 ? '' : 's'}
          </span>
        </div>

        {recentList.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-brand-dark/40 border border-brand-border/40 text-xs font-mono text-brand-muted">
            No guest check-ins recorded yet today. Enter a 4-digit code above to check in arriving guests.
          </div>
        ) : (
          <div className="divide-y divide-brand-border/40">
            {recentList.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setBooking(item);
                  setCode(item.guestCode);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className="py-3.5 px-3 rounded-xl hover:bg-brand-surfaceElevated/60 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-surfaceElevated border border-brand-border flex items-center justify-center shrink-0">
                    {getBookingTypeIcon(item.bookingType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-white font-bold">{item.customerName}</strong>
                      <span className="px-1.5 py-0.5 rounded bg-brand-gold/15 text-brand-gold font-bold text-[10px] tracking-wider">
                        #{item.guestCode}
                      </span>
                    </div>
                    <span className="text-[11px] text-brand-muted block">
                      {item.resourceName || item.location || 'GioCasa'} • {item.date} {item.time}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                      item.checkInStatus === 'checked_in'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {item.checkInStatus === 'checked_in' ? 'Checked In' : 'Pending'}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                      item.paymentStatus === 'paid'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {item.paymentStatus || 'UNPAID'}
                  </span>

                  <span className="text-[10px] text-brand-subtle">
                    {item.checkedInAt
                      ? new Date(item.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
