import React, { useState, useEffect } from 'react';
import { PageRoute, RouteParams, HallOfFameEntry } from '../types';
import { arenaApi } from '../services/arenaApi';
import {
  Trophy,
  Award,
  Sparkles,
  Calendar,
  Filter,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Flame,
  ShieldCheck,
} from 'lucide-react';

interface HallOfFamePageProps {
  onNavigate: (page: PageRoute, params?: RouteParams) => void;
}

export const HallOfFamePage: React.FC<HallOfFamePageProps> = ({ onNavigate }) => {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');

  const fetchHallOfFame = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await arenaApi.getHallOfFame();
      setEntries(data);
    } catch (err: any) {
      console.error('Failed to load Hall of Fame:', err);
      setError(err.message || 'Unable to load Hall of Fame gallery.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHallOfFame();
  }, []);

  const seasons = Array.from(new Set(entries.map((e) => e.season).filter(Boolean)));

  const filteredEntries = entries.filter((e) => {
    if (categoryFilter !== 'all' && e.gameCategory !== categoryFilter) return false;
    if (seasonFilter !== 'all' && e.season !== seasonFilter) return false;
    return true;
  });

  const featuredChampion = entries.find((e) => e.isFeatured) || entries[0] || null;

  return (
    <div className="min-h-screen bg-brand-dark text-white pt-28 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-pink selection:text-white">
      <div className="max-w-7xl mx-auto space-y-16 sm:space-y-20">

        {/* =========================================================================
            EDITORIAL HERO (Phase 9 Requirement)
           ========================================================================= */}
        <section className="text-center max-w-3xl mx-auto space-y-4 pt-4 sm:pt-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-surface border border-brand-pink/40 text-[10px] font-mono text-brand-pink font-bold uppercase tracking-widest shadow-sm">
            <Trophy className="w-3.5 h-3.5 fill-current" />
            <span>THE LEGACY OF COMPETITION</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white">
            GioCasa Hall of Fame
          </h1>

          <p className="font-italic-accent text-xl sm:text-2xl text-brand-pink italic">
            Where Ayodhya Champions Are Etched in Stone
          </p>

          <p className="text-sm sm:text-base text-brand-subtle font-light max-w-xl mx-auto leading-relaxed">
            Honoring the tournament winners, record-holders and masters of the arena. Every champion here earned their victory on our screens and tables.
          </p>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('tournaments')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-surface border border-brand-border hover:border-brand-blue text-white text-xs font-mono uppercase tracking-wider transition-colors hover:text-brand-blue"
            >
              <span>Explore Active Tournaments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* =========================================================================
            FEATURED CHAMPION SPOTLIGHT (Phase 9 Requirement)
           ========================================================================= */}
        {featuredChampion && (
          <section className="relative overflow-hidden rounded-3xl bg-brand-surface border border-brand-pink/50 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-pink/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 p-6 sm:p-10 lg:p-12 items-center">
              {/* Photo Showcase */}
              <div className="lg:col-span-5 relative aspect-[4/5] sm:aspect-square lg:aspect-[4/5] rounded-2xl overflow-hidden bg-brand-dark border border-brand-pink/40 shadow-xl group">
                <img
                  src={featuredChampion.photoUrl}
                  alt={featuredChampion.playerName}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/real/ps5_setup.png';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/95 via-brand-dark/20 to-transparent" />

                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pink text-white font-mono text-[10px] font-bold uppercase tracking-wider shadow-lg">
                    <Sparkles className="w-3 h-3 fill-current" />
                    <span>FEATURED CHAMPION</span>
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-xs font-mono text-brand-pink uppercase tracking-wider block font-semibold">
                    {featuredChampion.season}
                  </span>
                  <strong className="font-serif text-2xl text-white block">
                    {featuredChampion.playerName}
                  </strong>
                </div>
              </div>

              {/* Narrative Content */}
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-0.5 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-[10px] font-mono text-brand-pink font-bold uppercase tracking-wider">
                      {featuredChampion.award}
                    </span>
                    <span className="text-xs font-mono text-brand-blue font-semibold">
                      • {featuredChampion.gameTitle}
                    </span>
                  </div>

                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
                    {featuredChampion.tournamentTitle}
                  </h2>

                  {featuredChampion.teamName && (
                    <p className="text-sm font-mono text-brand-orange">
                      Representing Team: <strong>{featuredChampion.teamName}</strong>
                    </p>
                  )}
                </div>

                {featuredChampion.scoreDescription && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-brand-surfaceElevated border border-brand-border/70 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand-orange block font-semibold">
                      Victory Narrative & Achievement
                    </span>
                    <p className="text-xs sm:text-sm text-white/90 font-light leading-relaxed">
                      "{featuredChampion.scoreDescription}"
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono pt-2">
                  <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-xl p-3">
                    <span className="text-[10px] text-brand-subtle uppercase block">Season</span>
                    <strong className="text-white block mt-0.5">{featuredChampion.season}</strong>
                  </div>

                  <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-xl p-3">
                    <span className="text-[10px] text-brand-subtle uppercase block">Event Date</span>
                    <strong className="text-white block mt-0.5">{featuredChampion.eventDate}</strong>
                  </div>

                  <div className="bg-brand-surfaceElevated border border-brand-border/60 rounded-xl p-3">
                    <span className="text-[10px] text-brand-subtle uppercase block">Arena Category</span>
                    <strong className="text-brand-blue block mt-0.5 uppercase">{featuredChampion.gameCategory}</strong>
                  </div>
                </div>

                {featuredChampion.tournamentSlug && (
                  <div className="pt-2">
                    <button
                      onClick={() => onNavigate('tournament-results', { slug: featuredChampion.tournamentSlug })}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-surfaceElevated border border-brand-border hover:border-brand-blue text-white text-xs font-mono transition-colors hover:text-brand-blue"
                    >
                      <span>View Official Bracket Standings</span>
                      <ExternalLink className="w-3.5 h-3.5 text-brand-blue" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* =========================================================================
            GALLERY FILTERS & WINNERS GRID
           ========================================================================= */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-6">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-cream">
                All Honored Champions
              </h2>
              <p className="text-xs text-brand-subtle mt-0.5">
                Filtered archive of historic winners and podium finishes at GioCasa.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Category */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-brand-subtle" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-brand-surface border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-cream font-mono focus:outline-none focus:border-brand-terracotta cursor-pointer"
                >
                  <option value="all">All Games</option>
                  <option value="ps5">PS5 Gaming</option>
                  <option value="pool">Pool Hall</option>
                  <option value="foosball">Foosball</option>
                  <option value="boardgames">Tabletop</option>
                </select>
              </div>

              {/* Season */}
              {seasons.length > 0 && (
                <select
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value)}
                  className="bg-brand-surface border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-cream font-mono focus:outline-none focus:border-brand-terracotta cursor-pointer"
                >
                  <option value="all">All Seasons</option>
                  {seasons.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-4 animate-pulse">
                  <div className="aspect-[4/3] bg-brand-surfaceElevated rounded-xl" />
                  <div className="h-5 bg-brand-surfaceElevated rounded w-3/4" />
                  <div className="h-4 bg-brand-surfaceElevated rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto">
              <Trophy className="w-10 h-10 text-brand-gold mx-auto" />
              <h3 className="font-serif text-xl font-bold text-brand-cream">No Champions Found</h3>
              <p className="text-xs text-brand-subtle">
                No published Hall of Fame records match your selected filter criteria.
              </p>
              {(categoryFilter !== 'all' || seasonFilter !== 'all') && (
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setSeasonFilter('all');
                  }}
                  className="px-4 py-2 rounded-full bg-brand-surfaceElevated border border-brand-border text-xs text-brand-cream font-mono"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEntries.map((winner) => (
                <div
                  key={winner.id}
                  className="group bg-brand-surface border border-brand-border/80 hover:border-brand-gold/60 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* Portrait Photograph */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-dark">
                    <img
                      src={winner.photoUrl}
                      alt={winner.playerName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/real/ps5_setup.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-black/30" />

                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-dark/85 backdrop-blur-md border border-brand-border text-[10px] font-mono text-brand-gold font-bold uppercase">
                        {winner.award}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full bg-brand-dark/85 backdrop-blur-md border border-brand-border text-[10px] font-mono text-brand-cream font-semibold">
                        {winner.season}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <span className="text-[11px] font-mono text-brand-gold drop-shadow block font-semibold">
                        {winner.gameTitle}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="font-serif text-xl font-bold text-brand-cream group-hover:text-brand-gold transition-colors">
                        {winner.playerName}
                      </h3>

                      {winner.teamName && (
                        <p className="text-xs font-mono text-brand-terracotta">
                          Team: {winner.teamName}
                        </p>
                      )}

                      <p className="text-xs text-brand-subtle font-mono">
                        Tournament: {winner.tournamentTitle}
                      </p>

                      {winner.scoreDescription && (
                        <p className="text-xs text-brand-subtle/90 font-light line-clamp-3 pt-1 italic">
                          "{winner.scoreDescription}"
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-brand-border/60 flex items-center justify-between text-xs font-mono">
                      <span className="text-brand-subtle text-[11px]">
                        {winner.eventDate}
                      </span>

                      {winner.tournamentSlug ? (
                        <button
                          onClick={() => onNavigate('tournament-results', { slug: winner.tournamentSlug })}
                          className="text-brand-gold hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <span>Results</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-brand-gold flex items-center gap-1 text-[11px]">
                          <Trophy className="w-3 h-3" />
                          <span>Champion</span>
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
