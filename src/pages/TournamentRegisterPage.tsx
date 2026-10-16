import React, { useState, useEffect } from 'react';
import { PageRoute, RouteParams, Tournament } from '../types';
import { arenaApi, RegisterTournamentPayload } from '../services/arenaApi';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Users,
  CheckCircle2,
  Sparkles,
  Lock,
} from 'lucide-react';

interface TournamentRegisterPageProps {
  slug: string;
  onNavigate: (page: PageRoute, params?: RouteParams) => void;
}

export const TournamentRegisterPage: React.FC<TournamentRegisterPageProps> = ({ slug, onNavigate }) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [participantName, setParticipantName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [inGameId, setInGameId] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');
  const [teammate1Name, setTeammate1Name] = useState<string>('');
  const [teammate1Phone, setTeammate1Phone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [rulesAccepted, setRulesAccepted] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const loadTournament = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await arenaApi.getTournament(slug);
        setTournament(data);
      } catch (err: any) {
        console.error('Failed to load tournament for registration:', err);
        setError(err.message || 'Tournament unavailable.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) loadTournament();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!participantName.trim()) {
      setSubmitError('Please enter your full name.');
      return;
    }

    const cleanPhone = phone.replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setSubmitError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!rulesAccepted) {
      setSubmitError('You must read and accept the tournament rules to register.');
      return;
    }

    if (tournament?.teamType === 'team' && !teamName.trim()) {
      setSubmitError('Please enter your official team name.');
      return;
    }

    const teammates = teammate1Name.trim()
      ? [{ name: teammate1Name.trim(), phone: teammate1Phone.trim() }]
      : [];

    const payload: RegisterTournamentPayload = {
      participantName: participantName.trim(),
      phone: cleanPhone,
      email: email.trim() || undefined,
      inGameId: inGameId.trim() || undefined,
      teamName: teamName.trim() || undefined,
      teammates,
      notes: notes.trim() || undefined,
      rulesAccepted: true,
    };

    setSubmitting(true);
    try {
      const res = await arenaApi.registerForTournament(slug, payload);
      // Navigate directly to private secure confirmation page
      onNavigate('tournament-confirmation', {
        slug: tournament?.slug || slug,
        registrationId: res.registration.id,
        token: res.registration.accessToken,
      });
    } catch (err: any) {
      console.error('Registration submission failed:', err);
      setSubmitError(err.message || 'Failed to complete registration. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark text-brand-cream pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
          <div className="h-6 w-36 bg-brand-surfaceElevated rounded" />
          <div className="h-10 w-3/4 bg-brand-surfaceElevated rounded" />
          <div className="h-96 w-full bg-brand-surfaceElevated rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-brand-dark text-brand-cream pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-brand-surface border border-red-500/30 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-brand-cream">Unable to Register</h2>
          <p className="text-xs text-brand-subtle">{error || 'Tournament is not open for registration.'}</p>
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

  const isWaitlist = tournament.computedStatus === 'waitlist_open';

  return (
    <div className="min-h-screen bg-brand-dark text-white pt-28 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-pink selection:text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Back navigation */}
        <button
          onClick={() => onNavigate('tournament-detail', { slug: tournament.slug })}
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-brand-muted hover:text-brand-pink transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Tournament Overview</span>
        </button>

        {/* Tournament Summary Card */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="px-3 py-1 rounded-full bg-brand-blue/15 border border-brand-blue/30 text-[10px] font-mono text-brand-blue font-bold uppercase tracking-wider">
              {tournament.gameCategory.toUpperCase()} • {tournament.format}
            </span>

            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                isWaitlist
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {isWaitlist ? 'Waitlist Mode' : 'Registration Open'}
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            {tournament.title}
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono pt-2 border-t border-brand-border/50">
            <div>
              <span className="text-brand-muted text-[10px] uppercase block">Event Date</span>
              <strong className="text-white">{tournament.startDate} • {tournament.startTime} IST</strong>
            </div>

            <div>
              <span className="text-brand-muted text-[10px] uppercase block">Venue</span>
              <strong className="text-white line-clamp-1">{tournament.venue}</strong>
            </div>

            <div>
              <span className="text-brand-muted text-[10px] uppercase block">Entry Fee</span>
              <strong className="text-brand-orange">
                {tournament.entryFeePaise === 0 ? 'Free Entry' : `₹${tournament.entryFeePaise / 100}`}
              </strong>
            </div>
          </div>

          {isWaitlist && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Standard capacity is full. You will be registered on the official GioCasa Arena waitlist. If a registered player cancels, waitlisted contenders are promoted in order of registration.
              </span>
            </div>
          )}
        </div>

        {/* Registration Form */}
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="border-b border-brand-border/60 pb-4 space-y-1">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
              Contender Registration
            </h2>
            <p className="text-xs text-brand-muted font-light">
              Enter your accurate details for tournament brackets and venue check-in.
            </p>
          </div>

          {submitError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Primary Registrant Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-brand-muted block mb-1.5">
                  Full Name <span className="text-brand-pink">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aman Verma"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-pink"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-brand-muted block mb-1.5">
                  Mobile Number (WhatsApp) <span className="text-brand-pink">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-brand-pink"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-brand-muted block mb-1.5">
                  Email Address {tournament.requiredFields.includes('email') && <span className="text-brand-pink">*</span>}
                </label>
                <input
                  type="email"
                  required={tournament.requiredFields.includes('email')}
                  placeholder="contender@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-pink"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-brand-muted block mb-1.5">
                  In-Game Username / PSN ID {tournament.requiredFields.includes('inGameId') && <span className="text-brand-pink">*</span>}
                </label>
                <input
                  type="text"
                  required={tournament.requiredFields.includes('inGameId')}
                  placeholder="e.g. Striker_Ayodhya"
                  value={inGameId}
                  onChange={(e) => setInGameId(e.target.value)}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-brand-pink"
                />
              </div>
            </div>

            {/* Team Tournament Fields */}
            {tournament.teamType === 'team' && (
              <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-4">
                <span className="text-xs font-mono uppercase text-brand-blue font-bold block">
                  Team Contender Information
                </span>

                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-brand-muted block mb-1.5">
                    Team Name <span className="text-brand-pink">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ayodhya Dynamos"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-blue"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-brand-muted block mb-1.5">
                      Teammate 2 Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Teammate name"
                      value={teammate1Name}
                      onChange={(e) => setTeammate1Name(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-blue"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-brand-muted block mb-1.5">
                      Teammate 2 Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="Teammate phone"
                      value={teammate1Phone}
                      onChange={(e) => setTeammate1Phone(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-brand-blue"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-brand-muted block mb-1.5">
                Special Requests or Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Controller preference, preferred seat or special requirements..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-pink"
              />
            </div>

            {/* Rules Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  required
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-brand-border text-brand-pink focus:ring-brand-pink bg-brand-surfaceElevated cursor-pointer"
                />
                <span className="text-xs text-brand-muted leading-relaxed group-hover:text-white transition-colors">
                  I agree to abide by the GioCasa Arena competitive rules, respect fellow contenders and staff, and arrive on time. I understand entry fees are settled at venue check-in.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-brand-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-mono text-brand-muted flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-brand-blue" />
                <span>Private & secure registration reference generated on submit.</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white font-bold text-xs uppercase tracking-wider transition-all shadow-luxury-pink hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'Reserving Slot...'
                  : isWaitlist
                  ? 'Join Tournament Waitlist'
                  : 'Confirm Tournament Registration'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};
