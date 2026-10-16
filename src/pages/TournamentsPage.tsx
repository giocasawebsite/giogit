import React, { useState, useEffect } from 'react';
import { PageRoute, RouteParams, Tournament } from '../types';
import { arenaApi } from '../services/arenaApi';
import { WinnersButton } from '../components/ui/WinnersButton';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Users,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Flame,
  Award,
} from 'lucide-react';

interface TournamentsPageProps {
  onNavigate: (page: PageRoute, params?: RouteParams) => void;
}

export const TournamentsPage: React.FC<TournamentsPageProps> = ({ onNavigate }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'registration_open' | 'upcoming' | 'live' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchTournaments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await arenaApi.getTournaments();
      setTournaments(data);
    } catch (err: any) {
      console.error('Failed to load tournaments:', err);
      setError(err.message || 'Unable to connect to GioCasa Arena. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  // Filter computation
  const filteredTournaments = tournaments.filter((t) => {
    // Status filter
    if (statusFilter === 'registration_open') {
      if (t.computedStatus !== 'registration_open' && t.computedStatus !== 'waitlist_open') return false;
    } else if (statusFilter === 'upcoming') {
      if (t.computedStatus !== 'upcoming_registration' && t.computedStatus !== 'registration_open') return false;
    } else if (statusFilter === 'live') {
      if (t.status !== 'live' && t.computedStatus !== 'live') return false;
    } else if (statusFilter === 'completed') {
      if (t.status !== 'completed' && t.computedStatus !== 'completed') return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && t.gameCategory !== categoryFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        t.title.toLowerCase().includes(q) ||
        t.gameTitle.toLowerCase().includes(q) ||
        t.format.toLowerCase().includes(q) ||
        t.venue.toLowerCase().includes(q);
      if (!matches) return false;
    }

    return true;
  });

  const featuredTournament = tournaments.find((t) => t.isFeatured && t.status !== 'completed') || null;

  // Counts for tabs
  const counts = {
    all: tournaments.length,
    registration_open: tournaments.filter((t) => t.computedStatus === 'registration_open' || t.computedStatus === 'waitlist_open').length,
    upcoming: tournaments.filter((t) => t.computedStatus === 'upcoming_registration' || t.computedStatus === 'registration_open').length,
    live: tournaments.filter((t) => t.status === 'live').length,
    completed: tournaments.filter((t) => t.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-brand-dark text-white pt-28 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-blue selection:text-brand-charcoalDeep">
      <div className="max-w-7xl mx-auto space-y-16 sm:space-y-24">
        
        {/* =========================================================================
            HERO SECTION (Phase 3 Requirements)
           ========================================================================= */}
        <section className="relative text-center max-w-4xl mx-auto space-y-6 pt-6 sm:pt-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-surface border border-brand-blue/40 text-[11px] font-mono text-brand-blue font-bold tracking-widest uppercase shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand-pink animate-pulse" />
            <span>GIOCASA ARENA</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08]">
            Your Game. Your People.<br />
            <span className="font-italic-accent text-brand-pink italic font-normal">
              Your Moment.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-brand-subtle font-light max-w-2xl mx-auto leading-relaxed">
            Local tournaments, friendly rivalries and unforgettable wins. Find your next competition at GioCasa.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => {
                const el = document.getElementById('arena-tournaments-grid');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-7 py-3.5 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs uppercase tracking-wider font-semibold transition-all shadow-luxury-pink hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span>Explore Tournaments</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <WinnersButton
              onNavigate={onNavigate}
              variant="cta"
            />
          </div>
        </section>

        {/* =========================================================================
            FEATURED TOURNAMENT (Phase 3 Requirement)
           ========================================================================= */}
        {featuredTournament && (
          <section className="relative overflow-hidden rounded-3xl bg-brand-surface border border-brand-border/80 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-blue/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 p-6 sm:p-10 lg:p-12 items-center">
              {/* Image side */}
              <div className="lg:col-span-5 relative group overflow-hidden rounded-2xl border border-brand-border/60 aspect-[16/10] lg:aspect-auto lg:h-full min-h-[280px]">
                <img
                  src={featuredTournament.bannerImage}
                  alt={featuredTournament.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/real/ps5_setup.png';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-transparent to-black/20" />
                
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pink text-white font-mono text-[10px] font-bold uppercase tracking-wider shadow-lg">
                    <Sparkles className="w-3 h-3 fill-current" />
                    <span>FEATURED SHOWDOWN</span>
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-xs font-mono text-white/90 flex items-center justify-between">
                  <span className="bg-brand-dark/80 backdrop-blur-md px-3 py-1 rounded-full border border-brand-border/50">
                    {featuredTournament.gameTitle}
                  </span>
                  <span className="bg-brand-dark/80 backdrop-blur-md px-3 py-1 rounded-full border border-brand-border/50 text-brand-blue font-semibold">
                    {featuredTournament.format}
                  </span>
                </div>
              </div>

              {/* Content side */}
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-blue/20 border border-brand-blue/40 text-[10px] font-mono text-brand-blue font-semibold uppercase">
                      {featuredTournament.gameCategory.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-brand-pink font-semibold">
                      • {featuredTournament.statusLabel || 'Registration Open'}
                    </span>
                  </div>

                  <h2 className="font-serif text-2xl sm:text-4xl font-bold text-white">
                    {featuredTournament.title}
                  </h2>

                  <p className="text-sm text-brand-subtle font-light leading-relaxed">
                    {featuredTournament.shortDescription || featuredTournament.description}
                  </p>
                </div>

                {/* Info Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-brand-subtle block">Date & Time</span>
                    <strong className="text-xs font-mono text-white block mt-0.5">
                      {featuredTournament.startDate}
                    </strong>
                    <span className="text-[11px] font-mono text-brand-blue font-semibold">
                      {featuredTournament.startTime} IST
                    </span>
                  </div>

                  <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-brand-subtle block">Entry Fee</span>
                    <strong className="text-xs font-mono text-white block mt-0.5">
                      {featuredTournament.entryFeePaise === 0 ? 'Free Entry' : `₹${featuredTournament.entryFeePaise / 100}`}
                    </strong>
                    <span className="text-[10px] text-brand-subtle block">per contender</span>
                  </div>

                  <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-brand-subtle block">Prize Honor</span>
                    <strong className="text-xs font-mono text-brand-pink block mt-0.5 line-clamp-1 font-bold">
                      {featuredTournament.prizePoolDetails || 'Trophy & Honors'}
                    </strong>
                    <span className="text-[10px] text-brand-subtle block">Cash + Awards</span>
                  </div>

                  <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-brand-subtle block">Capacity</span>
                    <strong className="text-xs font-mono text-white block mt-0.5">
                      {featuredTournament.confirmedCount || 0} / {featuredTournament.maxCapacity}
                    </strong>
                    <span className="text-[10px] text-brand-subtle block">
                      {featuredTournament.spotsRemaining ?? 0} spots left
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => onNavigate('tournament-detail', { slug: featuredTournament.slug })}
                    className="px-6 py-3 rounded-full bg-brand-surfaceElevated border border-brand-border hover:border-brand-blue text-white text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    View Details & Rules
                  </button>

                  {featuredTournament.isRegistrationAllowed ? (
                    <button
                      onClick={() => onNavigate('tournament-register', { slug: featuredTournament.slug })}
                      className="px-7 py-3 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-bold uppercase tracking-wider transition-all shadow-luxury-pink hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <span>
                        {featuredTournament.computedStatus === 'waitlist_open' ? 'Join Official Waitlist' : 'Register Now'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : featuredTournament.status === 'completed' ? (
                    <button
                      onClick={() => onNavigate('tournament-results', { slug: featuredTournament.slug })}
                      className="px-6 py-3 rounded-full bg-brand-blue/20 border border-brand-blue text-brand-blue text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>View Results</span>
                    </button>
                  ) : (
                    <span className="px-5 py-2.5 rounded-full bg-brand-surface border border-brand-border/40 text-brand-subtle text-xs font-mono">
                      {featuredTournament.statusLabel || 'Registration Unavailable'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =========================================================================
            FILTERS & SEARCH (Phase 3 Requirement)
           ========================================================================= */}
        <section id="arena-tournaments-grid" className="space-y-8 scroll-mt-28">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/60 pb-6">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-cream">
                All Arena Competitions
              </h2>
              <p className="text-xs text-brand-subtle mt-0.5">
                Official tournament brackets, entry details, and schedule in Ayodhya.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-brand-subtle absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search games, brackets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-brand-surface border border-brand-border rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-brand-subtle/70 focus:outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All Events', count: counts.all },
                { id: 'registration_open', label: 'Registration Open', count: counts.registration_open },
                { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
                { id: 'live', label: 'Live Now', count: counts.live },
                { id: 'completed', label: 'Completed', count: counts.completed },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? 'bg-brand-blue text-brand-charcoalDeep font-bold shadow-luxury-blue'
                      : 'bg-brand-surface border border-brand-border text-brand-subtle hover:text-white hover:border-brand-borderStrong'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === tab.id ? 'bg-black/25 text-brand-charcoalDeep font-bold' : 'bg-brand-surfaceElevated text-brand-subtle'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Game Category Dropdown / Pills */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-brand-subtle shrink-0" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-brand-surface border border-brand-border rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-blue cursor-pointer"
              >
                <option value="all">All Arenas</option>
                <option value="ps5">PS5 Gaming</option>
                <option value="pool">Italian Slate Pool</option>
                <option value="foosball">Foosball Lounge</option>
                <option value="boardgames">Tabletop & Board Games</option>
              </select>
            </div>
          </div>

          {/* =========================================================================
              TOURNAMENT CARDS GRID (Phase 3 Requirement: 1-col mobile, 2-col tablet, 3-col desktop)
             ========================================================================= */}
          {loading ? (
            /* Loading Skeleton */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-4 animate-pulse">
                  <div className="w-full h-44 bg-brand-surfaceElevated rounded-xl" />
                  <div className="h-5 bg-brand-surfaceElevated rounded w-3/4" />
                  <div className="h-4 bg-brand-surfaceElevated rounded w-1/2" />
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="h-10 bg-brand-surfaceElevated rounded" />
                    <div className="h-10 bg-brand-surfaceElevated rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* API Error State with Retry Button */
            <div className="bg-brand-surface border border-red-500/30 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-white">Unable to load tournaments</h3>
                <p className="text-xs text-brand-subtle">{error}</p>
              </div>
              <button
                onClick={fetchTournaments}
                className="px-5 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border hover:border-brand-blue text-white text-xs font-mono inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : filteredTournaments.length === 0 ? (
            /* Empty State */
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-brand-surfaceElevated border border-brand-border text-brand-blue flex items-center justify-center mx-auto">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-bold text-white">No tournaments found</h3>
                <p className="text-xs text-brand-subtle max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'No events match the selected filters. Try resetting your search or filter options.'
                    : 'Upcoming tournaments will be announced soon by GioCasa Arena staff.'}
                </p>
              </div>
              {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setCategoryFilter('all');
                  }}
                  className="px-4 py-2 rounded-full bg-brand-surfaceElevated border border-brand-border text-xs text-white hover:border-brand-blue transition-colors font-mono"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            /* Real Tournament Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTournaments.map((t) => (
                <div
                  key={t.id}
                  className="group bg-brand-surface border border-brand-border/80 hover:border-brand-blue/60 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* Banner Image */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-brand-dark">
                    <img
                      src={t.bannerImage}
                      alt={t.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/real/ps5_setup.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-black/30" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-dark/85 backdrop-blur-md border border-brand-border text-[10px] font-mono text-white font-semibold uppercase">
                        {t.gameCategory.toUpperCase()}
                      </span>

                      {/* Status indicator */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md shadow ${
                          t.computedStatus === 'registration_open'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : t.computedStatus === 'waitlist_open'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : t.computedStatus === 'live'
                            ? 'bg-brand-pink text-white border border-brand-pink animate-pulse'
                            : t.computedStatus === 'completed'
                            ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/40'
                            : 'bg-brand-dark/80 text-brand-subtle border border-brand-border'
                        }`}
                      >
                        {t.statusLabel || t.status}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <span className="text-[11px] font-mono text-brand-blue block font-semibold drop-shadow">
                        {t.gameTitle} • {t.format}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-serif text-lg font-bold text-white group-hover:text-brand-blue transition-colors line-clamp-2">
                        {t.title}
                      </h3>
                      <p className="text-xs text-brand-subtle line-clamp-2 font-light">
                        {t.shortDescription || t.description}
                      </p>
                    </div>

                    {/* Meta row */}
                    <div className="space-y-1.5 pt-2 border-t border-brand-border/60 text-xs font-mono">
                      <div className="flex items-center justify-between text-white">
                        <span className="flex items-center gap-1.5 text-brand-subtle">
                          <Calendar className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                          <span>Schedule</span>
                        </span>
                        <span>{t.startDate} • {t.startTime} IST</span>
                      </div>

                      <div className="flex items-center justify-between text-white">
                        <span className="flex items-center gap-1.5 text-brand-subtle">
                          <Users className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                          <span>Capacity</span>
                        </span>
                        <span>
                          {t.confirmedCount || 0} / {t.maxCapacity} players
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-white">
                        <span className="flex items-center gap-1.5 text-brand-subtle">
                          <Trophy className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                          <span>Fee / Prize</span>
                        </span>
                        <span className="text-brand-pink font-bold">
                          {t.entryFeePaise === 0 ? 'Free' : `₹${t.entryFeePaise / 100}`}
                        </span>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => onNavigate('tournament-detail', { slug: t.slug })}
                        className="flex-1 py-2.5 rounded-xl bg-brand-surfaceElevated border border-brand-border hover:border-brand-blue/50 text-white text-xs font-semibold uppercase tracking-wider transition-colors text-center"
                      >
                        Details
                      </button>

                      {t.isRegistrationAllowed ? (
                        <button
                          onClick={() => onNavigate('tournament-register', { slug: t.slug })}
                          className="flex-1 py-2.5 rounded-xl bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-bold uppercase tracking-wider transition-all shadow-luxury-pink text-center"
                        >
                          {t.computedStatus === 'waitlist_open' ? 'Waitlist' : 'Register'}
                        </button>
                      ) : t.status === 'completed' ? (
                        <button
                          onClick={() => onNavigate('tournament-results', { slug: t.slug })}
                          className="flex-1 py-2.5 rounded-xl bg-brand-blue/15 border border-brand-blue/40 text-brand-blue text-xs font-bold uppercase tracking-wider transition-colors text-center"
                        >
                          Results
                        </button>
                      ) : (
                        <span className="flex-1 py-2.5 rounded-xl bg-brand-surfaceElevated/60 text-brand-subtle/80 text-[11px] font-mono text-center">
                          Closed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
