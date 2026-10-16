import React, { useState, useEffect } from 'react';
import { PageRoute, RouteParams, Tournament } from '../types';
import { arenaApi } from '../services/arenaApi';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Sparkles,
  Award,
  Flame,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';

interface TournamentDetailPageProps {
  slug: string;
  onNavigate: (page: PageRoute, params?: RouteParams) => void;
}

export const TournamentDetailPage: React.FC<TournamentDetailPageProps> = ({ slug, onNavigate }) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    const loadTournament = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await arenaApi.getTournament(slug);
        setTournament(data);
      } catch (err: any) {
        console.error('Failed to load tournament detail:', err);
        setError(err.message || 'Tournament not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) loadTournament();
  }, [slug]);

  // Generate shareable link
  const currentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/#/tournaments/${slug}`
    : `https://giocasa.onrender.com/#/tournaments/${slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopyFeedback('Link Copied!');
      setTimeout(() => setCopyFeedback(null), 2500);
    });
  };

  const handleCopyDetails = () => {
    if (!tournament) return;
    const text = `🏆 ${tournament.title} at GioCasa Arena Ayodhya!\n🎮 Game: ${tournament.gameTitle} (${tournament.format})\n📅 Date: ${tournament.startDate} at ${tournament.startTime} IST\n📍 Venue: ${tournament.venue}\n💰 Prize Pool: ${tournament.prizePoolDetails}\n🔗 Register here: ${currentUrl}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback('Details Copied!');
      setTimeout(() => setCopyFeedback(null), 2500);
    });
  };

  const handleWhatsAppShare = () => {
    if (!tournament) return;
    const text = encodeURIComponent(
      `🏆 Join me at ${tournament.title} at GioCasa Arena!\n🎮 ${tournament.gameTitle} (${tournament.format})\n📅 ${tournament.startDate} at ${tournament.startTime} IST\n📍 ${tournament.venue}\n🔗 Register now: ${currentUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark text-brand-cream pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
          <div className="h-6 w-36 bg-brand-surfaceElevated rounded" />
          <div className="h-80 w-full bg-brand-surfaceElevated rounded-3xl" />
          <div className="h-10 w-3/4 bg-brand-surfaceElevated rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-brand-surfaceElevated rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-brand-dark text-brand-cream pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-brand-surface border border-red-500/30 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-brand-cream">Tournament Not Found</h2>
          <p className="text-xs text-brand-subtle">{error || 'This tournament does not exist or has not been published.'}</p>
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

  const spotsRemaining = Math.max(0, tournament.maxCapacity - (tournament.confirmedCount || 0));
  const capacityPercent = Math.min(100, Math.round(((tournament.confirmedCount || 0) / tournament.maxCapacity) * 100));

  return (
    <div className="min-h-screen bg-brand-dark text-white pt-28 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-pink selection:text-white">
      <div className="max-w-5xl mx-auto space-y-10 sm:space-y-14">

        {/* Back Link */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('tournaments')}
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-brand-muted hover:text-brand-pink transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to All Tournaments</span>
          </button>

          {/* Share Actions Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-blue text-brand-muted hover:text-white text-xs font-mono transition-colors relative"
              title="Copy shareable link"
            >
              {copyFeedback === 'Link Copied!' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono flex items-center gap-1.5 hover:bg-emerald-600/30 transition-colors"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handleCopyDetails}
              className="px-3 py-1.5 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-pink text-brand-muted hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{copyFeedback || 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Banner Hero */}
        <section className="relative rounded-3xl overflow-hidden border border-brand-border/80 shadow-2xl bg-brand-surface">
          <div className="relative aspect-[21/9] sm:aspect-[21/8] w-full bg-brand-dark">
            <img
              src={tournament.bannerImage}
              alt={tournament.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/real/ps5_setup.png';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-brand-dark/40 to-transparent" />

            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-brand-dark/85 backdrop-blur-md border border-brand-border text-xs font-mono font-bold uppercase text-brand-blue">
                {tournament.gameCategory.toUpperCase()} ARENA
              </span>

              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider backdrop-blur-md shadow ${
                  tournament.computedStatus === 'registration_open'
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                    : tournament.computedStatus === 'waitlist_open'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                    : tournament.computedStatus === 'live'
                    ? 'bg-brand-pink text-white border border-brand-pink animate-pulse'
                    : tournament.computedStatus === 'completed'
                    ? 'bg-brand-blue/25 text-brand-blue border border-brand-blue/50'
                    : 'bg-brand-dark/85 text-brand-muted border border-brand-border'
                }`}
              >
                {tournament.statusLabel || tournament.status}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-6">
            <div className="space-y-3">
              <span className="text-xs uppercase font-mono tracking-widest text-brand-blue font-bold block">
                {tournament.gameTitle} • {tournament.format}
              </span>
              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white">
                {tournament.title}
              </h1>
              <p className="text-sm sm:text-base text-white/80 font-light leading-relaxed max-w-3xl">
                {tournament.description}
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
              <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-brand-muted flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Tournament Date</span>
                </span>
                <strong className="text-sm font-mono text-white block">
                  {tournament.startDate}
                </strong>
                <span className="text-xs font-mono text-brand-blue">
                  {tournament.startTime} IST
                </span>
              </div>

              <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-brand-muted flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-pink" />
                  <span>Venue Arena</span>
                </span>
                <strong className="text-xs sm:text-sm font-sans text-white block line-clamp-1">
                  {tournament.venue}
                </strong>
                <span className="text-[10px] text-brand-muted block">Ayodhya, India</span>
              </div>

              <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-brand-muted flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-brand-orange" />
                  <span>Entry Fee</span>
                </span>
                <strong className="text-sm font-mono text-brand-orange block">
                  {tournament.entryFeePaise === 0 ? 'Free Entry' : `₹${tournament.entryFeePaise / 100}`}
                </strong>
                <span className="text-[10px] text-brand-muted block">
                  {tournament.teamType === 'team' ? 'Per Team' : 'Per Player'}
                </span>
              </div>

              <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-brand-muted flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Available Spots</span>
                </span>
                <div className="flex items-baseline gap-1.5">
                  <strong className="text-sm font-mono text-brand-blue">
                    {tournament.confirmedCount || 0}
                  </strong>
                  <span className="text-xs text-brand-muted font-mono">/ {tournament.maxCapacity}</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-brand-surface rounded-full h-1.5 overflow-hidden mt-1">
                  <div
                    className="bg-brand-pink h-full rounded-full transition-all duration-500"
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Registration CTA Actions */}
            <div className="pt-4 border-t border-brand-border/60 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs font-mono text-brand-muted">
                <span>Registration Deadline: </span>
                <strong className="text-white">
                  {tournament.registrationDeadlineDate} at {tournament.registrationDeadlineTime || '16:00'} IST
                </strong>
              </div>

              <div className="flex items-center gap-3">
                {tournament.isRegistrationAllowed ? (
                  <button
                    onClick={() => onNavigate('tournament-register', { slug: tournament.slug })}
                    className="px-8 py-3.5 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-bold uppercase tracking-wider transition-all shadow-luxury-pink hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <span>
                      {tournament.computedStatus === 'waitlist_open'
                        ? 'Join Official Waitlist'
                        : 'Register for Slot'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : tournament.status === 'completed' ? (
                  <button
                    onClick={() => onNavigate('tournament-results', { slug: tournament.slug })}
                    className="px-7 py-3 rounded-full bg-brand-blue/20 border border-brand-blue text-brand-blue text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-brand-blue/30 transition-colors"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>View Official Results</span>
                  </button>
                ) : (
                  <span className="px-6 py-3 rounded-full bg-brand-surfaceElevated border border-brand-border text-brand-muted text-xs font-mono">
                    {tournament.statusLabel || 'Registration Closed'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10">

          {/* Left Column: Rules, Eligibility, Schedule (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Rules & Guidelines */}
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 space-y-4">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-blue" />
                <span>Tournament Rules & Format</span>
              </h3>
              
              <ul className="space-y-2.5 text-xs sm:text-sm text-brand-muted">
                {tournament.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-2 shrink-0" />
                    <span className="leading-relaxed">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Eligibility Requirements */}
            {tournament.eligibilityRequirements && (
              <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 space-y-3">
                <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Contender Eligibility</span>
                </h3>
                <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                  {tournament.eligibilityRequirements}
                </p>
              </div>
            )}

            {/* Schedule & Important Instructions */}
            {tournament.scheduleInstructions && (
              <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 space-y-3">
                <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-blue" />
                  <span>Reporting & Matchday Schedule</span>
                </h3>
                <p className="text-xs sm:text-sm text-brand-muted leading-relaxed whitespace-pre-line">
                  {tournament.scheduleInstructions}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Prize Pool & Honors (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand-orange font-bold block">
                  PRIZE POOL
                </span>
                <h3 className="font-serif text-xl font-bold text-white">
                  Tournament Honors
                </h3>
              </div>

              <div className="p-4 rounded-xl bg-brand-surfaceElevated border border-brand-orange/40 text-xs font-mono text-brand-orange font-bold leading-relaxed">
                {tournament.prizePoolDetails}
              </div>

              {tournament.prizes && tournament.prizes.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-brand-muted block">
                    Breakdown by Rank:
                  </span>
                  <div className="space-y-2">
                    {tournament.prizes.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-brand-surfaceElevated border border-brand-border flex items-start gap-2.5 text-xs font-mono"
                      >
                        <Award className={`w-4 h-4 shrink-0 mt-0.5 ${
                          idx === 0 ? 'text-brand-orange' : idx === 1 ? 'text-slate-300' : 'text-amber-600'
                        }`} />
                        <div>
                          <strong className="text-white block">{p.rank}</strong>
                          <span className="text-brand-muted text-[11px]">{p.reward}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-brand-border/60">
                <button
                  onClick={handleCopyLink}
                  className="w-full py-2.5 rounded-xl bg-brand-surfaceElevated border border-brand-border hover:border-brand-pink text-white text-xs font-mono flex items-center justify-center gap-2 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-brand-pink" />
                  <span>{copyFeedback || 'Copy Registration Link'}</span>
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
