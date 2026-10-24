import React, { useState, useEffect, useCallback } from 'react';
import { useAdminLiveSync } from '../../hooks/useAdminLiveSync';
import { Tournament, TournamentRegistration, TournamentResult, TournamentStatus, TournamentRegistrationStatus } from '../../types';
import { arenaApi } from '../../services/arenaApi';
import {
  Trophy,
  Users,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  Check,
  X,
  AlertTriangle,
  Download,
  Edit,
  Trash2,
  ExternalLink,
  Copy,
  Sparkles,
  Upload,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Award,
  DollarSign,
  Share2,
} from 'lucide-react';

interface AdminTournamentsManagerProps {
  passcode: string;
  initialTab?: string;
  initialTournamentId?: string;
  onNavigatePublic: (slug: string) => void;
}

export const AdminTournamentsManager: React.FC<AdminTournamentsManagerProps> = ({
  passcode,
  initialTab,
  initialTournamentId,
  onNavigatePublic,
}) => {
  // Navigation within tournaments manager: 'list' | 'new' | 'edit' | 'registrations' | 'results'
  const [view, setView] = useState<'list' | 'new' | 'edit' | 'registrations' | 'results'>('list');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  // Data state
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tournament Form state
  const [formTournament, setFormTournament] = useState<Partial<Tournament>>({
    title: '',
    slug: '',
    shortDescription: '',
    description: '',
    gameTitle: 'EA Sports FC 25',
    gameCategory: 'ps5',
    format: '1v1 Knockout',
    teamType: 'individual',
    teamSize: { min: 1, max: 1 },
    bannerImage: '/assets/real/ps5_setup.png',
    venue: 'GioCasa Upper Deck Gaming Lounge, Ayodhya',
    startDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    startTime: '18:00',
    registrationOpeningDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    registrationOpeningTime: '10:00',
    registrationDeadlineDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    registrationDeadlineTime: '16:00',
    maxCapacity: 16,
    waitlistEnabled: true,
    waitlistCapacity: 8,
    entryFeePaise: 19900, // ₹199
    prizePoolDetails: '₹5,000 Cash + GioCasa Trophy',
    rules: [
      'Standard competitive match settings apply.',
      'Reporting time is 30 minutes prior to scheduled start time.',
      'Fair play and respectful behavior are mandatory.',
    ],
    scheduleInstructions: 'Reporting at 5:30 PM IST. Matches kick off at 6:00 PM IST.',
    requiredFields: ['email', 'inGameId'],
    isFeatured: false,
    status: 'draft',
    isRegistrationApprovalRequired: false,
  });
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newRuleInput, setNewRuleInput] = useState<string>('');

  // Registrations state
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [regTournament, setRegTournament] = useState<Tournament | null>(null);
  const [regLoading, setRegLoading] = useState<boolean>(false);
  const [regSearch, setRegSearch] = useState<string>('');
  const [regStatusFilter, setRegStatusFilter] = useState<string>('all');

  // Results state
  const [resultsData, setResultsData] = useState<TournamentResult | null>(null);
  const [resultsTournament, setResultsTournament] = useState<Tournament | null>(null);
  const [resultsLoading, setResultsLoading] = useState<boolean>(false);
  const [resultsSubmitting, setResultsSubmitting] = useState<boolean>(false);
  const [resultsSuccess, setResultsSuccess] = useState<string | null>(null);

  // Sync initial sub-route props
  useEffect(() => {
    if (initialTab === 'tournament-new') {
      setView('new');
    } else if (initialTab === 'tournament-edit' && initialTournamentId) {
      setSelectedTournamentId(initialTournamentId);
      loadTournamentForEdit(initialTournamentId);
    } else if (initialTab === 'tournament-registrations' && initialTournamentId) {
      setSelectedTournamentId(initialTournamentId);
      loadRegistrations(initialTournamentId);
      setView('registrations');
    } else if (initialTab === 'tournament-results' && initialTournamentId) {
      setSelectedTournamentId(initialTournamentId);
      loadResults(initialTournamentId);
      setView('results');
    }
  }, [initialTab, initialTournamentId]);

  // Load all tournaments
  const loadTournaments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await arenaApi.getAdminTournaments(passcode);
      setTournaments(res.tournaments);
      setMetrics(res.metrics);
    } catch (err: any) {
      setError(err.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  // 3-Second Live Auto-Sync for Tournaments List, Registrations & Results
  const silentSyncTournaments = useCallback(async () => {
    if (!passcode) return;
    // Skip auto-sync when actively editing or creating a tournament to prevent form loss
    if (view === 'new' || view === 'edit') return;

    if (view === 'list') {
      const res = await arenaApi.getAdminTournaments(passcode);
      setTournaments(res.tournaments);
      setMetrics(res.metrics);
    } else if (view === 'registrations' && selectedTournamentId) {
      const res = await arenaApi.getAdminRegistrations(passcode, selectedTournamentId, {
        status: regStatusFilter,
        search: regSearch,
      });
      setRegistrations(res.registrations);
      setRegTournament(res.tournament);
    } else if (view === 'results' && selectedTournamentId) {
      const res = await arenaApi.getAdminResults(passcode, selectedTournamentId);
      setResultsTournament(res.tournament);
      setResultsData(res.results);
    }
  }, [passcode, view, selectedTournamentId, regStatusFilter, regSearch]);

  useAdminLiveSync({
    enabled: !!passcode,
    intervalMs: 3000,
    pauseWhenHidden: true,
    onSync: silentSyncTournaments,
  });

  useEffect(() => {
    loadTournaments();
  }, [passcode]);

  // ==========================================
  // CREATE / EDIT HANDLERS
  // ==========================================

  const loadTournamentForEdit = async (id: string) => {
    setLoading(true);
    try {
      const t = await arenaApi.getAdminTournament(passcode, id);
      setFormTournament(t);
      setSelectedTournamentId(t.id);
      setView('edit');
    } catch (err: any) {
      alert(err.message || 'Failed to load tournament for editing');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (view === 'new') {
        await arenaApi.createAdminTournament(passcode, formTournament);
      } else if (selectedTournamentId) {
        await arenaApi.updateAdminTournament(passcode, selectedTournamentId, formTournament);
      }
      await loadTournaments();
      setView('list');
    } catch (err: any) {
      setFormError(err.message || 'Failed to save tournament');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteTournament = async (t: Tournament) => {
    if (!window.confirm(`Are you sure you want to cancel or delete "${t.title}"?`)) return;

    try {
      await arenaApi.deleteAdminTournament(passcode, t.id);
      await loadTournaments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete tournament');
    }
  };

  // ==========================================
  // REGISTRATIONS HANDLERS
  // ==========================================

  const loadRegistrations = async (tournamentId: string) => {
    setRegLoading(true);
    try {
      const res = await arenaApi.getAdminRegistrations(passcode, tournamentId, {
        status: regStatusFilter,
        search: regSearch,
      });
      setRegistrations(res.registrations);
      setRegTournament(res.tournament);
      setSelectedTournamentId(tournamentId);
      setView('registrations');
    } catch (err: any) {
      alert(err.message || 'Failed to load registrations');
    } finally {
      setRegLoading(false);
    }
  };

  const handleUpdateRegStatus = async (regId: string, status: TournamentRegistrationStatus) => {
    if (!selectedTournamentId) return;
    try {
      await arenaApi.updateAdminRegistration(passcode, selectedTournamentId, regId, { status });
      await loadRegistrations(selectedTournamentId);
      await loadTournaments();
    } catch (err: any) {
      alert(err.message || 'Failed to update participant status');
    }
  };

  const handleTogglePayment = async (reg: TournamentRegistration) => {
    if (!selectedTournamentId) return;
    const nextPayment = reg.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await arenaApi.updateAdminRegistration(passcode, selectedTournamentId, reg.id, { paymentStatus: nextPayment });
      await loadRegistrations(selectedTournamentId);
    } catch (err: any) {
      alert(err.message || 'Failed to update payment status');
    }
  };

  const handleExportCsv = async () => {
    if (!selectedTournamentId || !regTournament) return;
    try {
      await arenaApi.exportAdminRegistrationsCsv(passcode, selectedTournamentId, regTournament.slug);
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    }
  };

  // ==========================================
  // RESULTS & STANDINGS HANDLERS
  // ==========================================

  const loadResults = async (tournamentId: string) => {
    setResultsLoading(true);
    setResultsSuccess(null);
    try {
      const res = await arenaApi.getAdminResults(passcode, tournamentId);
      setResultsTournament(res.tournament);
      setResultsData(res.results);
      setSelectedTournamentId(tournamentId);
      setView('results');
    } catch (err: any) {
      alert(err.message || 'Failed to load results');
    } finally {
      setResultsLoading(false);
    }
  };

  const handleSaveResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentId || !resultsData) return;
    setResultsSubmitting(true);
    try {
      await arenaApi.saveAdminResults(passcode, selectedTournamentId, resultsData);
      setResultsSuccess(resultsData.isPublished ? 'Results published to public website!' : 'Draft results saved successfully.');
      setTimeout(() => setResultsSuccess(null), 3000);
      await loadTournaments();
    } catch (err: any) {
      alert(err.message || 'Failed to save results');
    } finally {
      setResultsSubmitting(false);
    }
  };

  const handlePublishToHallOfFame = async () => {
    if (!selectedTournamentId) return;
    if (!window.confirm('Promote champion from these standings directly into the GioCasa Hall of Fame?')) return;
    try {
      const entry = await arenaApi.publishResultsToHallOfFame(passcode, selectedTournamentId);
      alert(`Champion "${entry.playerName}" published to GioCasa Hall of Fame!`);
    } catch (err: any) {
      alert(err.message || 'Failed to publish to Hall of Fame');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, targetField: 'bannerImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const uploadRes = await arenaApi.uploadAdminImage(passcode, base64, file.name);
        setFormTournament((prev) => ({ ...prev, [targetField]: uploadRes.url }));
      } catch (err: any) {
        alert(err.message || 'Image upload failed');
      }
    };
    reader.readAsDataURL(file);
  };

  // =========================================================================
  // RENDER SUBVIEWS
  // =========================================================================

  // 1. REGISTRATIONS VIEW
  if (view === 'registrations' && regTournament) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setView('list');
                loadTournaments();
              }}
              className="p-2 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-brand-cream"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-gold font-bold block">
                PARTICIPANT MANAGEMENT
              </span>
              <h2 className="font-serif text-2xl font-bold text-brand-cream">
                {regTournament.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-gold text-brand-cream text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-brand-gold" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => loadRegistrations(regTournament.id)}
              className="p-2 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-brand-cream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-brand-surface border border-brand-border rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-mono text-brand-subtle">Total Registered</span>
            <strong className="text-xl font-mono text-brand-cream block">{registrations.length}</strong>
          </div>
          <div className="bg-brand-surface border border-brand-border rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-mono text-brand-subtle">Confirmed</span>
            <strong className="text-xl font-mono text-emerald-400 block">
              {registrations.filter((r) => r.status === 'confirmed').length}
            </strong>
          </div>
          <div className="bg-brand-surface border border-brand-border rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-mono text-brand-subtle">Checked In</span>
            <strong className="text-xl font-mono text-brand-gold block">
              {registrations.filter((r) => r.status === 'checked_in').length}
            </strong>
          </div>
          <div className="bg-brand-surface border border-brand-border rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-mono text-brand-subtle">Waitlisted</span>
            <strong className="text-xl font-mono text-amber-400 block">
              {registrations.filter((r) => r.status === 'waitlisted').length}
            </strong>
          </div>
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-brand-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contender name, phone, ref..."
              value={regSearch}
              onChange={(e) => setRegSearch(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-brand-cream font-mono focus:outline-none focus:border-brand-terracotta"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {['all', 'confirmed', 'checked_in', 'waitlisted', 'pending_approval', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setRegStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase whitespace-nowrap transition-colors ${
                  regStatusFilter === st
                    ? 'bg-brand-terracotta text-brand-cream font-bold'
                    : 'bg-brand-surface border border-brand-border text-brand-subtle hover:text-brand-cream'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Registrations Table */}
        {registrations.length === 0 ? (
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 text-center text-xs text-brand-subtle font-mono">
            No registrations found matching the current search / filter.
          </div>
        ) : (
          <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-brand-surfaceElevated border-b border-brand-border text-[10px] text-brand-subtle uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ref Code</th>
                  <th className="py-3 px-4">Participant / Team</th>
                  <th className="py-3 px-4">Phone / In-Game ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {registrations.map((r) => (
                  <tr key={r.id} className="hover:bg-brand-surfaceElevated/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-brand-gold">
                      {r.registrationReference}
                    </td>

                    <td className="py-3 px-4">
                      <strong className="text-brand-cream block">{r.participantName}</strong>
                      {r.teamName && <span className="text-[11px] text-brand-subtle block">Team: {r.teamName}</span>}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-brand-cream block">{r.phone}</span>
                      {r.inGameId && <span className="text-brand-subtle text-[11px] block">{r.inGameId}</span>}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.status === 'checked_in'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : r.status === 'confirmed'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : r.status === 'waitlisted'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : r.status === 'pending_approval'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleTogglePayment(r)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                          r.paymentStatus === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-brand-surfaceElevated text-brand-subtle border border-brand-border hover:border-brand-gold'
                        }`}
                        title="Click to toggle payment status"
                      >
                        {r.paymentStatus}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status !== 'checked_in' && (
                          <button
                            onClick={() => handleUpdateRegStatus(r.id, 'checked_in')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase transition-colors"
                            title="Check-in participant at venue"
                          >
                            Check In
                          </button>
                        )}

                        {r.status === 'waitlisted' && (
                          <button
                            onClick={() => handleUpdateRegStatus(r.id, 'confirmed')}
                            className="px-2 py-1 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] uppercase font-bold"
                            title="Promote to confirmed"
                          >
                            Promote
                          </button>
                        )}

                        {r.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Cancel registration for ${r.participantName}?`)) {
                                handleUpdateRegStatus(r.id, 'cancelled');
                              }
                            }}
                            className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Cancel registration"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // 2. RESULTS & STANDINGS VIEW
  if (view === 'results' && resultsTournament && resultsData) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b border-brand-border/60 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setView('list');
                loadTournaments();
              }}
              className="p-2 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-brand-cream"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-gold font-bold block">
                STANDINGS & RESULTS CONDUCTOR
              </span>
              <h2 className="font-serif text-2xl font-bold text-brand-cream">
                {resultsTournament.title}
              </h2>
            </div>
          </div>

          <button
            onClick={handlePublishToHallOfFame}
            className="px-3.5 py-2 rounded-xl bg-brand-gold/15 border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/25 text-xs font-mono flex items-center gap-1.5 transition-colors"
            title="Promote champion to public Hall of Fame"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Publish to Hall of Fame</span>
          </button>
        </div>

        {resultsSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{resultsSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSaveResults} className="space-y-6">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase text-brand-gold font-bold">
                Tournament Summary Commentary
              </label>
              <label className="flex items-center gap-2 text-xs font-mono cursor-pointer">
                <input
                  type="checkbox"
                  checked={resultsData.isPublished}
                  onChange={(e) => setResultsData({ ...resultsData, isPublished: e.target.checked })}
                  className="rounded text-brand-terracotta"
                />
                <span className={resultsData.isPublished ? 'text-emerald-400 font-bold' : 'text-brand-subtle'}>
                  {resultsData.isPublished ? 'Published to Public' : 'Draft / Private'}
                </span>
              </label>
            </div>

            <textarea
              rows={3}
              placeholder="Describe the grand final scoreline, clutch moments, and champion performance..."
              value={resultsData.summary || ''}
              onChange={(e) => setResultsData({ ...resultsData, summary: e.target.value })}
              className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-cream focus:outline-none focus:border-brand-gold"
            />
          </div>

          {/* Standings list */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-brand-cream">
                Final Standings & Placements
              </h3>
              <button
                type="button"
                onClick={() => {
                  const newRank = (resultsData.standings?.length || 0) + 1;
                  const newRow = {
                    rank: newRank,
                    awardLabel: newRank === 1 ? 'Champion / 1st Place' : newRank === 2 ? 'Runner-up / 2nd Place' : newRank === 3 ? '3rd Place' : `Placement #${newRank}`,
                    participantName: '',
                    scoreOrRecord: '',
                  };
                  setResultsData({ ...resultsData, standings: [...(resultsData.standings || []), newRow] });
                }}
                className="px-3 py-1.5 rounded-lg bg-brand-surfaceElevated border border-brand-border text-brand-cream hover:border-brand-gold text-xs font-mono flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contender</span>
              </button>
            </div>

            {resultsData.standings && resultsData.standings.length === 0 ? (
              <p className="text-xs text-brand-subtle font-mono py-4 text-center">
                No standings entered yet. Click "Add Contender" to add the Champion, Runner-up, etc.
              </p>
            ) : (
              <div className="space-y-3">
                {resultsData.standings?.map((st, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-brand-surfaceElevated border border-brand-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-brand-gold">
                        #{st.rank} • {st.awardLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = resultsData.standings.filter((_, i) => i !== idx);
                          setResultsData({ ...resultsData, standings: updated });
                        }}
                        className="text-red-400 hover:text-red-300 text-xs font-mono"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                          Contender Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Aman Verma"
                          value={st.participantName}
                          onChange={(e) => {
                            const updated = [...resultsData.standings];
                            updated[idx].participantName = e.target.value;
                            setResultsData({ ...resultsData, standings: updated });
                          }}
                          className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-cream"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                          Final Score / Record
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 4 - 2 in Grand Final"
                          value={st.scoreOrRecord || ''}
                          onChange={(e) => {
                            const updated = [...resultsData.standings];
                            updated[idx].scoreOrRecord = e.target.value;
                            setResultsData({ ...resultsData, standings: updated });
                          }}
                          className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-cream font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                          Award Label
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Champion / 1st Place"
                          value={st.awardLabel}
                          onChange={(e) => {
                            const updated = [...resultsData.standings];
                            updated[idx].awardLabel = e.target.value;
                            setResultsData({ ...resultsData, standings: updated });
                          }}
                          className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-cream"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-5 py-2.5 rounded-xl border border-brand-border text-brand-subtle text-xs font-mono"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resultsSubmitting}
              className="px-6 py-2.5 rounded-xl bg-brand-terracotta hover:bg-brand-terracottaHover text-brand-cream text-xs font-bold uppercase tracking-wider transition-all"
            >
              {resultsSubmitting ? 'Saving...' : 'Save & Update Results'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // 3. CREATE / EDIT FORM VIEW
  if (view === 'new' || view === 'edit') {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div className="flex items-center gap-3 border-b border-brand-border/60 pb-4">
          <button
            onClick={() => setView('list')}
            className="p-2 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-brand-cream"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-gold font-bold block">
              {view === 'new' ? 'ANNOUNCE TOURNAMENT' : 'EDIT TOURNAMENT CONFIG'}
            </span>
            <h2 className="font-serif text-2xl font-bold text-brand-cream">
              {view === 'new' ? 'New Arena Competition' : formTournament.title || 'Edit Competition'}
            </h2>
          </div>
        </div>

        {formError && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
            {formError}
          </div>
        )}

        <form onSubmit={handleSaveTournament} className="space-y-6">
          
          {/* Basic Details */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4">
            <h3 className="font-serif text-base font-bold text-brand-cream">General Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  Tournament Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ayodhya FC 25 Championship"
                  value={formTournament.title || ''}
                  onChange={(e) => setFormTournament({ ...formTournament, title: e.target.value })}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream focus:outline-none focus:border-brand-terracotta"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  URL Slug (Unique)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ayodhya-fc-25-championship"
                  value={formTournament.slug || ''}
                  onChange={(e) => setFormTournament({ ...formTournament, slug: e.target.value })}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream font-mono focus:outline-none focus:border-brand-terracotta"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  Game Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EA Sports FC 25"
                  value={formTournament.gameTitle || ''}
                  onChange={(e) => setFormTournament({ ...formTournament, gameTitle: e.target.value })}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  Arena Category
                </label>
                <select
                  value={formTournament.gameCategory || 'ps5'}
                  onChange={(e) => setFormTournament({ ...formTournament, gameCategory: e.target.value as any })}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream"
                >
                  <option value="ps5">PS5 Console</option>
                  <option value="pool">Pool Hall</option>
                  <option value="foosball">Foosball Lounge</option>
                  <option value="boardgames">Tabletop</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  Format
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1v1 Knockout"
                  value={formTournament.format || ''}
                  onChange={(e) => setFormTournament({ ...formTournament, format: e.target.value })}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                Short Description
              </label>
              <input
                type="text"
                placeholder="Brief one-line summary for cards..."
                value={formTournament.shortDescription || ''}
                onChange={(e) => setFormTournament({ ...formTournament, shortDescription: e.target.value })}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                Full Description
              </label>
              <textarea
                rows={3}
                placeholder="Full tournament description and details..."
                value={formTournament.description || ''}
                onChange={(e) => setFormTournament({ ...formTournament, description: e.target.value })}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream"
              />
            </div>

            {/* Banner Image Selection */}
            <div>
              <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                Banner Image URL or Preset
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={formTournament.bannerImage || ''}
                  onChange={(e) => setFormTournament({ ...formTournament, bannerImage: e.target.value })}
                  className="flex-1 bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream font-mono"
                />
                <label className="px-4 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-gold text-brand-cream text-xs font-mono cursor-pointer flex items-center justify-center gap-1.5 shrink-0">
                  <Upload className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'bannerImage')}
                  />
                </label>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-[10px] font-mono text-brand-subtle">Quick presets:</span>
                {[
                  { label: 'PS5 Setup', url: '/assets/real/ps5_setup.png' },
                  { label: 'Pool Table', url: '/assets/real/pool_table.png' },
                  { label: 'Foosball', url: '/assets/real/foosball_lounge.png' },
                ].map((pr) => (
                  <button
                    key={pr.label}
                    type="button"
                    onClick={() => setFormTournament({ ...formTournament, bannerImage: pr.url })}
                    className="px-2.5 py-0.5 rounded-lg bg-brand-surface border border-brand-border text-[10px] font-mono text-brand-subtle hover:text-brand-cream"
                  >
                    {pr.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Schedule & Timing (Asia/Kolkata) */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4">
            <h3 className="font-serif text-base font-bold text-brand-cream">Matchday Schedule & Venue</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formTournament.startDate || ''}
                  onChange={(e) => setFormTournament({ ...formTournament, startDate: e.target.value })}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  Start Time (IST)
                </label>
                <input
                  type="time"
                  required
                  value={formTournament.startTime || '18:00'}
                  onChange={(e) => setFormTournament({ ...formTournament, startTime: e.target.value })}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  Venue Location
                </label>
                <input
                  type="text"
                  value={formTournament.venue || ''}
                  onChange={(e) => setFormTournament({ ...formTournament, venue: e.target.value })}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-brand-border/60">
              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  Registration Opening Date & Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={formTournament.registrationOpeningDate || ''}
                    onChange={(e) => setFormTournament({ ...formTournament, registrationOpeningDate: e.target.value })}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-cream font-mono"
                  />
                  <input
                    type="time"
                    value={formTournament.registrationOpeningTime || '10:00'}
                    onChange={(e) => setFormTournament({ ...formTournament, registrationOpeningTime: e.target.value })}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-cream font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  Registration Deadline Date & Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={formTournament.registrationDeadlineDate || ''}
                    onChange={(e) => setFormTournament({ ...formTournament, registrationDeadlineDate: e.target.value })}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-cream font-mono"
                  />
                  <input
                    type="time"
                    value={formTournament.registrationDeadlineTime || '16:00'}
                    onChange={(e) => setFormTournament({ ...formTournament, registrationDeadlineTime: e.target.value })}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-cream font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Capacity, Entry Fee & Prizes */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4">
            <h3 className="font-serif text-base font-bold text-brand-cream">Capacity, Fees & Rewards</h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  Max Capacity *
                </label>
                <input
                  type="number"
                  min={2}
                  required
                  value={formTournament.maxCapacity || 16}
                  onChange={(e) => setFormTournament({ ...formTournament, maxCapacity: Number(e.target.value) })}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  Waitlist Enabled
                </label>
                <select
                  value={formTournament.waitlistEnabled ? 'yes' : 'no'}
                  onChange={(e) => setFormTournament({ ...formTournament, waitlistEnabled: e.target.value === 'yes' })}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream"
                >
                  <option value="yes">Yes (Enabled)</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  Entry Fee (INR)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 199"
                  value={((formTournament.entryFeePaise || 0) / 100).toString()}
                  onChange={(e) => setFormTournament({ ...formTournament, entryFeePaise: Math.round(Number(e.target.value) * 100) })}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                  Status
                </label>
                <select
                  value={formTournament.status || 'draft'}
                  onChange={(e) => setFormTournament({ ...formTournament, status: e.target.value as TournamentStatus })}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream"
                >
                  <option value="draft">Draft (Private)</option>
                  <option value="published">Published</option>
                  <option value="live">Live Now</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-brand-subtle block mb-1">
                Prize Details Summary
              </label>
              <input
                type="text"
                placeholder="e.g. ₹5,000 Cash + GioCasa Golden Trophy + 1 Month Gaming Pass"
                value={formTournament.prizePoolDetails || ''}
                onChange={(e) => setFormTournament({ ...formTournament, prizePoolDetails: e.target.value })}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream font-mono"
              />
            </div>
          </div>

          {/* Rules Management */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4">
            <h3 className="font-serif text-base font-bold text-brand-cream">Rules & Guidelines</h3>

            <div className="space-y-2">
              {formTournament.rules?.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-brand-terracotta">{idx + 1}.</span>
                  <input
                    type="text"
                    value={rule}
                    onChange={(e) => {
                      const updated = [...(formTournament.rules || [])];
                      updated[idx] = e.target.value;
                      setFormTournament({ ...formTournament, rules: updated });
                    }}
                    className="flex-1 bg-brand-surfaceElevated border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-cream"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = formTournament.rules?.filter((_, i) => i !== idx);
                      setFormTournament({ ...formTournament, rules: updated });
                    }}
                    className="text-red-400 p-1 hover:text-red-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Add rule item..."
                value={newRuleInput}
                onChange={(e) => setNewRuleInput(e.target.value)}
                className="flex-1 bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-cream"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newRuleInput.trim()) return;
                  setFormTournament({ ...formTournament, rules: [...(formTournament.rules || []), newRuleInput.trim()] });
                  setNewRuleInput('');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-brand-surface border border-brand-border text-brand-cream hover:border-brand-gold text-xs font-mono"
              >
                Add Rule
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-brand-border/60">
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-5 py-2.5 rounded-xl border border-brand-border text-brand-subtle hover:text-brand-cream text-xs font-mono"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-7 py-2.5 rounded-xl bg-brand-terracotta hover:bg-brand-terracottaHover text-brand-cream text-xs font-bold uppercase tracking-wider transition-all shadow-luxury-ember"
            >
              {formSubmitting ? 'Saving...' : view === 'new' ? 'Create Tournament' : 'Update Tournament'}
            </button>
          </div>

        </form>
      </div>
    );
  }

  // 4. MAIN TOURNAMENTS LIST VIEW
  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-brand-gold font-bold block">
            GIOCASA ARENA CONTROLLERS
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-cream">
            Tournament Management
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTournaments}
            className="p-2.5 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-brand-cream transition-colors"
            title="Refresh tournaments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setFormTournament({
                title: '',
                slug: '',
                shortDescription: '',
                description: '',
                gameTitle: 'EA Sports FC 25',
                gameCategory: 'ps5',
                format: '1v1 Knockout',
                teamType: 'individual',
                teamSize: { min: 1, max: 1 },
                bannerImage: '/assets/real/ps5_setup.png',
                venue: 'GioCasa Upper Deck Gaming Lounge, Ayodhya',
                startDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
                startTime: '18:00',
                registrationOpeningDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
                registrationOpeningTime: '10:00',
                registrationDeadlineDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
                registrationDeadlineTime: '16:00',
                maxCapacity: 16,
                waitlistEnabled: true,
                waitlistCapacity: 8,
                entryFeePaise: 19900,
                prizePoolDetails: '₹5,000 Cash + GioCasa Trophy',
                rules: ['Standard competitive settings apply.', 'Reporting time is 30 mins prior to match time.'],
                requiredFields: ['email', 'inGameId'],
                isFeatured: false,
                status: 'draft',
              });
              setView('new');
            }}
            className="px-4 py-2.5 rounded-xl bg-brand-terracotta hover:bg-brand-terracottaHover text-brand-cream text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-luxury-ember transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Announce Tournament</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-brand-subtle block">Total Competitions</span>
            <strong className="text-2xl font-mono text-brand-cream block mt-1">{metrics.totalTournaments}</strong>
          </div>
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-brand-subtle block">Published</span>
            <strong className="text-2xl font-mono text-emerald-400 block mt-1">{metrics.totalPublished}</strong>
          </div>
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-brand-subtle block">Drafts (Private)</span>
            <strong className="text-2xl font-mono text-amber-400 block mt-1">{metrics.totalDrafts}</strong>
          </div>
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-brand-subtle block">Completed</span>
            <strong className="text-2xl font-mono text-brand-gold block mt-1">{metrics.totalCompleted}</strong>
          </div>
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-brand-subtle block">Registrations</span>
            <strong className="text-2xl font-mono text-brand-terracotta block mt-1">{metrics.totalRegistrations}</strong>
          </div>
        </div>
      )}

      {/* Tournaments List Table */}
      {loading ? (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-12 text-center text-xs font-mono text-brand-subtle">
          Loading tournaments...
        </div>
      ) : tournaments.length === 0 ? (
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-12 text-center space-y-4">
          <Trophy className="w-12 h-12 text-brand-gold mx-auto" />
          <h3 className="font-serif text-xl font-bold text-brand-cream">No Tournaments Configured</h3>
          <p className="text-xs text-brand-subtle max-w-sm mx-auto">
            Click "Announce Tournament" above to configure your first competitive event.
          </p>
        </div>
      ) : (
        <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-brand-surfaceElevated border-b border-brand-border text-[10px] text-brand-subtle uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Tournament Title & Game</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Fee / Prize</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {tournaments.map((t) => (
                <tr key={t.id} className="hover:bg-brand-surfaceElevated/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <strong className="text-brand-cream font-bold block text-sm">{t.title}</strong>
                    <span className="text-brand-gold text-[11px] block">
                      {t.gameTitle} • {t.format}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-brand-cream block">{t.startDate}</span>
                    <span className="text-brand-subtle text-[11px] block">{t.startTime} IST</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-brand-cream font-bold block">
                      {t.confirmedCount || 0} / {t.maxCapacity}
                    </span>
                    {(t.waitlistCount || 0) > 0 && (
                      <span className="text-amber-400 text-[10px] block">
                        +{t.waitlistCount} waitlist
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-brand-cream font-bold block">
                      {t.entryFeePaise === 0 ? 'Free' : `₹${t.entryFeePaise / 100}`}
                    </span>
                    <span className="text-brand-subtle text-[10px] block truncate max-w-[120px]">
                      {t.prizePoolDetails}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.status === 'published'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : t.status === 'live'
                          ? 'bg-brand-terracotta text-white border border-brand-terracotta'
                          : t.status === 'completed'
                          ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/40'
                          : t.status === 'draft'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Manage Registrations */}
                      <button
                        onClick={() => loadRegistrations(t.id)}
                        className="px-2.5 py-1 rounded-lg bg-brand-surfaceElevated border border-brand-border hover:border-brand-gold text-brand-cream text-[11px] font-bold transition-colors"
                        title="View & manage registrations"
                      >
                        Registrations ({t.confirmedCount || 0})
                      </button>

                      {/* Conduct Results */}
                      <button
                        onClick={() => loadResults(t.id)}
                        className="px-2.5 py-1 rounded-lg bg-brand-surfaceElevated border border-brand-border hover:border-brand-gold text-brand-gold text-[11px] font-bold transition-colors"
                        title="Standings & results"
                      >
                        Results
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => loadTournamentForEdit(t.id)}
                        className="p-1.5 rounded-lg hover:bg-brand-surfaceElevated text-brand-subtle hover:text-brand-cream transition-colors"
                        title="Edit tournament"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* View Public */}
                      <button
                        onClick={() => onNavigatePublic(t.slug)}
                        className="p-1.5 rounded-lg hover:bg-brand-surfaceElevated text-brand-subtle hover:text-brand-gold transition-colors"
                        title="View public page"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete / Cancel */}
                      <button
                        onClick={() => handleDeleteTournament(t)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Cancel tournament"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
