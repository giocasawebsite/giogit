import React, { useState, useEffect } from 'react';
import { PageRoute, RouteParams, Tournament, TournamentRegistration } from '../types';
import { arenaApi } from '../services/arenaApi';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Copy,
  Check,
  Share2,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  MessageCircle,
  Lock,
} from 'lucide-react';

interface TournamentConfirmationPageProps {
  slug: string;
  registrationId: string;
  token?: string;
  onNavigate: (page: PageRoute, params?: RouteParams) => void;
}

export const TournamentConfirmationPage: React.FC<TournamentConfirmationPageProps> = ({
  slug,
  registrationId,
  token,
  onNavigate,
}) => {
  const [data, setData] = useState<{ registration: TournamentRegistration; tournament: Tournament } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    const loadConfirmation = async () => {
      setLoading(true);
      setError(null);
      try {
        const storedPasscode = localStorage.getItem('giocasa_admin_passcode') || undefined;
        const res = await arenaApi.getRegistrationConfirmation(slug, registrationId, token, storedPasscode);
        setData(res);
      } catch (err: any) {
        console.error('Failed to load registration confirmation:', err);
        setError(err.message || 'Private confirmation access expired or token invalid.');
      } finally {
        setLoading(false);
      }
    };

    if (slug && registrationId) {
      loadConfirmation();
    }
  }, [slug, registrationId, token]);

  const currentConfirmationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/#/tournaments/${slug}/confirmation/${registrationId}${token ? `?token=${token}` : ''}`
    : '';

  const handleCopyReference = () => {
    if (!data?.registration) return;
    navigator.clipboard.writeText(data.registration.registrationReference).then(() => {
      setCopyFeedback('Reference Copied!');
      setTimeout(() => setCopyFeedback(null), 2500);
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentConfirmationUrl).then(() => {
      setCopyFeedback('Link Copied!');
      setTimeout(() => setCopyFeedback(null), 2500);
    });
  };

  const handleWhatsAppShare = () => {
    if (!data) return;
    const text = encodeURIComponent(
      `🏆 Registered for ${data.tournament.title} at GioCasa Arena!\n` +
      `🎟️ Reference ID: ${data.registration.registrationReference}\n` +
      `👤 Contender: ${data.registration.participantName}\n` +
      `📅 Date: ${data.tournament.startDate} at ${data.tournament.startTime} IST\n` +
      `📍 Venue: ${data.tournament.venue}\n` +
      `🔗 Confirmation: ${currentConfirmationUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark text-brand-cream pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
          <div className="h-20 w-full bg-brand-surfaceElevated rounded-2xl" />
          <div className="h-80 w-full bg-brand-surfaceElevated rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-brand-dark text-brand-cream pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-brand-surface border border-red-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <Lock className="w-12 h-12 text-brand-gold mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-brand-cream">Protected Confirmation</h2>
          <p className="text-xs text-brand-subtle leading-relaxed">
            {error || 'This registration is private. A valid high-entropy access token or admin passcode is required to view.'}
          </p>
          <button
            onClick={() => onNavigate('tournaments')}
            className="px-6 py-2.5 rounded-full bg-brand-surfaceElevated border border-brand-border text-brand-cream text-xs font-mono inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Tournaments</span>
          </button>
        </div>
      </div>
    );
  }

  const { registration, tournament } = data;
  const isWaitlist = registration.status === 'waitlisted';

  return (
    <div className="min-h-screen bg-brand-dark text-white pt-28 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-pink selection:text-white">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Top Header Card */}
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-10 text-center space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-pink/10 rounded-full blur-[80px] pointer-events-none" />

          {/* Icon Badge */}
          <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center border shadow-lg ${
            isWaitlist
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
          }`}>
            {isWaitlist ? <Sparkles className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>

          <div className="space-y-1.5">
            <span className={`text-[10px] font-mono uppercase tracking-widest font-bold px-3 py-1 rounded-full border ${
              isWaitlist
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {isWaitlist ? 'WAITLIST POSITION CONFIRMED' : 'OFFICIAL REGISTRATION CONFIRMED'}
            </span>

            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white pt-2">
              {isWaitlist ? 'You are on the Waitlist!' : 'You are in the Tournament!'}
            </h1>

            <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto font-light leading-relaxed">
              {isWaitlist
                ? 'Your registration has been placed in the priority waitlist queue. If a slot opens up, we will notify you immediately.'
                : 'Your slot has been reserved in the official bracket. Show your registration reference code at the arena desk upon arrival.'}
            </p>
          </div>

          {/* Reference Badge Highlight */}
          <div className="bg-brand-surfaceElevated border border-brand-pink/40 rounded-2xl p-5 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-pink block font-bold">
              REGISTRATION REFERENCE CODE
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-white tracking-wider">
                {registration.registrationReference}
              </span>
              <button
                onClick={handleCopyReference}
                className="p-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-pink text-brand-pink transition-colors"
                title="Copy reference code"
              >
                {copyFeedback === 'Reference Copied!' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            {copyFeedback && (
              <span className="text-[11px] font-mono text-brand-pink block animate-fade-in font-bold">
                {copyFeedback}
              </span>
            )}
          </div>
        </div>

        {/* Tournament & Contender Summary */}
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <h2 className="font-serif text-lg sm:text-xl font-bold text-white border-b border-brand-border/60 pb-3">
            Contender & Matchday Overview
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase text-brand-muted block">Contender Name</span>
              <strong className="text-sm text-white block">{registration.participantName}</strong>
              {registration.teamName && (
                <span className="text-brand-blue text-[11px] block">Team: {registration.teamName}</span>
              )}
            </div>

            <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase text-brand-muted block">Mobile Contact</span>
              <strong className="text-sm text-white block">{registration.phone}</strong>
              {registration.inGameId && (
                <span className="text-brand-muted text-[11px] block">ID: {registration.inGameId}</span>
              )}
            </div>

            <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase text-brand-muted block">Event Date & Reporting</span>
              <strong className="text-sm text-white block">{tournament.startDate}</strong>
              <span className="text-brand-blue text-[11px] block">Matches start at {tournament.startTime} IST</span>
            </div>

            <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase text-brand-muted block">Venue Location</span>
              <strong className="text-sm text-white block line-clamp-1">{tournament.venue}</strong>
              <span className="text-brand-muted text-[11px] block">Ayodhya, India</span>
            </div>
          </div>

          {/* Payment & Venue Check-in Note */}
          <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border/60 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-brand-blue font-mono font-bold uppercase tracking-wider text-[11px]">
              <ShieldCheck className="w-4 h-4 text-brand-blue" />
              <span>Matchday Check-in & Entry Fee</span>
            </div>
            <p className="text-brand-muted leading-relaxed">
              {tournament.entryFeePaise === 0
                ? 'Entry is completely free of charge. Bring your government photo ID and report to the desk 30 minutes prior to kickoff.'
                : `Entry fee of ₹${tournament.entryFeePaise / 100} is settled in-person upon venue check-in on matchday (Cash or UPI accepted). Please arrive 30 minutes prior to match time.`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleWhatsAppShare}
              className="px-4 py-2.5 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono flex items-center gap-2 hover:bg-emerald-600/30 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Share Confirmation</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-full bg-brand-surfaceElevated border border-brand-border hover:border-brand-pink text-white text-xs font-mono flex items-center gap-2 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-brand-pink" />
              <span>Save Private Link</span>
            </button>

            <button
              onClick={() => onNavigate('tournaments')}
              className="px-5 py-2.5 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-luxury-pink"
            >
              Explore More Tournaments
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
