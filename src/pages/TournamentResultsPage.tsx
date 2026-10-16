import React, { useState, useEffect } from 'react';
import { PageRoute, RouteParams, Tournament, TournamentResult } from '../types';
import { arenaApi } from '../services/arenaApi';
import {
  Trophy,
  Calendar,
  Award,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Users,
} from 'lucide-react';

interface TournamentResultsPageProps {
  slug: string;
  onNavigate: (page: PageRoute, params?: RouteParams) => void;
}

export const TournamentResultsPage: React.FC<TournamentResultsPageProps> = ({ slug, onNavigate }) => {
  const [data, setData] = useState<{ tournament: Partial<Tournament>; results: TournamentResult } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await arenaApi.getTournamentResults(slug);
        setData(res);
      } catch (err: any) {
        console.error('Failed to load tournament results:', err);
        setError(err.message || 'Results have not been published for this tournament yet.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) loadResults();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark text-brand-cream pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-6 w-36 bg-brand-surfaceElevated rounded" />
          <div className="h-72 w-full bg-brand-surfaceElevated rounded-3xl" />
          <div className="h-40 w-full bg-brand-surfaceElevated rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data || !data.results.isPublished) {
    return (
      <div className="min-h-screen bg-brand-dark text-brand-cream pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-brand-surface border border-brand-border rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <Trophy className="w-12 h-12 text-brand-gold mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-brand-cream">Standings In Progress</h2>
          <p className="text-xs text-brand-subtle leading-relaxed">
            {error || 'Official standings and results have not been finalized and published by the venue directors.'}
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

  const { tournament, results } = data;
  const champion = results.standings.find((s) => s.rank === 1) || results.standings[0];
  const runnerUp = results.standings.find((s) => s.rank === 2);
  const thirdPlace = results.standings.find((s) => s.rank === 3);
  const otherStandings = results.standings.filter((s) => s.rank > 3);

  return (
    <div className="min-h-screen bg-brand-dark text-white pt-28 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-pink selection:text-white">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Top Back Link */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('tournaments')}
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-brand-muted hover:text-brand-pink transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Tournaments</span>
          </button>

          <button
            onClick={() => onNavigate('hall-of-fame')}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand-surface border border-brand-pink/40 text-brand-pink text-xs font-mono hover:bg-brand-pink/15 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>GioCasa Hall of Fame</span>
          </button>
        </div>

        {/* Header & Editorial Spotlight */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-surface border border-brand-pink/40 text-[10px] font-mono text-brand-pink uppercase tracking-widest font-bold">
            <Sparkles className="w-3 h-3 fill-current" />
            <span>OFFICIAL ARENA RESULTS</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white">
            {tournament.title}
          </h1>

          <p className="text-xs sm:text-sm font-mono text-brand-blue">
            {tournament.gameTitle} • {tournament.format} • Concluded on {tournament.startDate}
          </p>

          {results.summary && (
            <p className="text-sm sm:text-base text-white/80 font-light max-w-2xl mx-auto leading-relaxed pt-2">
              "{results.summary}"
            </p>
          )}
        </div>

        {/* Champion Spotlight Banner */}
        {champion && (
          <div className="relative rounded-3xl overflow-hidden bg-brand-surface border border-brand-pink/50 p-6 sm:p-10 shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-pink/10 rounded-full blur-[90px] pointer-events-none" />

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-8 items-center">
              {/* Champion Portrait or Trophy */}
              <div className="sm:col-span-4 relative aspect-square rounded-2xl overflow-hidden bg-brand-dark border border-brand-pink/40 shadow-xl">
                <img
                  src={champion.photoUrl || tournament.bannerImage || '/assets/real/ps5_setup.png'}
                  alt={champion.participantName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/real/ps5_setup.png';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pink text-white font-mono text-[10px] font-bold uppercase tracking-wider shadow">
                    <Trophy className="w-3.5 h-3.5 fill-current" />
                    <span>CHAMPION</span>
                  </span>
                </div>
              </div>

              {/* Champion Narrative */}
              <div className="sm:col-span-8 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-brand-pink font-bold block">
                    1ST PLACE • {champion.awardLabel || 'ARENA CHAMPION'}
                  </span>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
                    {champion.participantName}
                  </h2>
                  {champion.teamName && (
                    <span className="text-xs font-mono text-brand-muted block">
                      Team: <strong className="text-white">{champion.teamName}</strong>
                    </span>
                  )}
                  {champion.inGameId && (
                    <span className="text-xs font-mono text-brand-blue block">
                      Gamertag: {champion.inGameId}
                    </span>
                  )}
                </div>

                {champion.scoreOrRecord && (
                  <div className="p-3.5 rounded-xl bg-brand-surfaceElevated border border-brand-border text-xs font-mono text-white">
                    <span className="text-brand-muted text-[10px] uppercase block mb-0.5">Final Record / Score</span>
                    <strong>{champion.scoreOrRecord}</strong>
                  </div>
                )}

                {champion.notes && (
                  <p className="text-xs text-brand-muted font-light leading-relaxed">
                    {champion.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Standings Podium Cards (Runner-up, 3rd, and Others) */}
        <div className="space-y-6">
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-white border-b border-brand-border/60 pb-3">
            Final Tournament Standings
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {runnerUp && (
              <div className="bg-brand-surface border border-brand-blue/30 rounded-2xl p-5 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-blue/15 border border-brand-blue/40 text-[10px] font-mono text-brand-blue font-bold uppercase tracking-wider">
                    2nd Place • Runner-Up
                  </span>
                  <Award className="w-5 h-5 text-brand-blue" />
                </div>
                <h4 className="font-serif text-xl font-bold text-white">{runnerUp.participantName}</h4>
                {runnerUp.teamName && <p className="text-xs font-mono text-brand-muted">Team: {runnerUp.teamName}</p>}
                {runnerUp.scoreOrRecord && (
                  <p className="text-xs font-mono text-brand-blue">{runnerUp.scoreOrRecord}</p>
                )}
                {runnerUp.notes && <p className="text-xs text-brand-muted">{runnerUp.notes}</p>}
              </div>
            )}

            {thirdPlace && (
              <div className="bg-brand-surface border border-brand-orange/30 rounded-2xl p-5 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-orange/15 border border-brand-orange/40 text-[10px] font-mono text-brand-orange font-bold uppercase tracking-wider">
                    3rd Place • Bronze
                  </span>
                  <Award className="w-5 h-5 text-brand-orange" />
                </div>
                <h4 className="font-serif text-xl font-bold text-white">{thirdPlace.participantName}</h4>
                {thirdPlace.teamName && <p className="text-xs font-mono text-brand-muted">Team: {thirdPlace.teamName}</p>}
                {thirdPlace.scoreOrRecord && (
                  <p className="text-xs font-mono text-brand-orange">{thirdPlace.scoreOrRecord}</p>
                )}
                {thirdPlace.notes && <p className="text-xs text-brand-muted">{thirdPlace.notes}</p>}
              </div>
            )}
          </div>

          {/* Further Standings Table */}
          {otherStandings.length > 0 && (
            <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-brand-surfaceElevated border-b border-brand-border text-brand-muted uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Contender</th>
                    <th className="py-3 px-4">Award / Placement</th>
                    <th className="py-3 px-4">Score / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {otherStandings.map((s, idx) => (
                    <tr key={idx} className="hover:bg-brand-surfaceElevated/50 transition-colors">
                      <td className="py-3 px-4 text-brand-blue font-bold">#{s.rank}</td>
                      <td className="py-3 px-4 text-white font-bold">
                        {s.participantName}
                        {s.teamName && <span className="text-brand-muted font-normal block text-[11px]">{s.teamName}</span>}
                      </td>
                      <td className="py-3 px-4 text-brand-muted">{s.awardLabel}</td>
                      <td className="py-3 px-4 text-white/80">{s.scoreOrRecord || s.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
