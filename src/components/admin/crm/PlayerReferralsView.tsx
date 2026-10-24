import React, { useState, useEffect, useCallback } from 'react';
import { useAdminLiveSync } from '../../../hooks/useAdminLiveSync';
import { Referral } from '../../../types';
import { playerCrmApi } from '../../../services/playerCrmApi';
import { Gift, Trophy, CheckCircle2, Clock, XCircle, Search, RefreshCw, AlertCircle, ArrowRight, User } from 'lucide-react';

interface PlayerReferralsViewProps {
  passcode: string;
  onViewPlayer?: (playerId: string) => void;
}

export const PlayerReferralsView: React.FC<PlayerReferralsViewProps> = ({ passcode, onViewPlayer }) => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [refs, leaders] = await Promise.all([
        playerCrmApi.getReferrals(passcode, { status: statusFilter }),
        playerCrmApi.getReferralLeaderboard(passcode, 10),
      ]);
      setReferrals(refs);
      setLeaderboard(leaders);
    } catch (err: any) {
      console.error('Failed to load referrals data:', err);
      setError(err.message || 'Unable to load referrals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleQualify = async (id: string) => {
    setActionLoading(id);
    try {
      await playerCrmApi.updateReferralStatus(passcode, id, 'qualified', 'Manually verified by Staff Admin');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update referral.');
    } finally {
      setActionLoading(null);
    }
  };

  const totalReferrals = referrals.length;
  const qualifiedReferrals = referrals.filter((r) => r.status === 'qualified').length;
  const pendingReferrals = referrals.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ED249B]/10 text-[#ED249B] flex items-center justify-center font-bold">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-brand-subtle block">Total Referrals</span>
            <span className="text-xl font-bold font-mono text-white">{totalReferrals}</span>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-brand-subtle block">Qualified & Rewarded</span>
            <span className="text-xl font-bold font-mono text-emerald-400">{qualifiedReferrals}</span>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-brand-subtle block">Pending 1st Activity</span>
            <span className="text-xl font-bold font-mono text-amber-400">{pendingReferrals}</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      {leaderboard.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-[#F9A20B]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Top Player Champions & Referrers
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {leaderboard.slice(0, 6).map((item, idx) => (
              <div
                key={item.playerId}
                className="p-3.5 rounded-2xl bg-brand-surfaceElevated border border-brand-border flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                    idx === 0
                      ? 'bg-amber-400 text-black'
                      : idx === 1
                      ? 'bg-neutral-300 text-black'
                      : idx === 2
                      ? 'bg-amber-700 text-white'
                      : 'bg-brand-surface text-brand-subtle'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{item.name}</span>
                    <span className="text-[10px] font-mono text-[#ED249B]">
                      {item.gioId} • @{item.gamerTag}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-emerald-400 block">
                    {item.successfulReferrals} Qualified
                  </span>
                  <span className="text-[10px] font-mono text-brand-subtle">
                    +{item.pointsEarned} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referrals Table */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Referral Pipeline & Records
            </h3>
            <p className="text-xs text-brand-subtle">
              Tracks referred friends and automatic reward qualification upon first booking or tournament.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-1.5 text-xs text-white font-mono"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="qualified">Qualified</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-brand-border bg-brand-dark/40 font-mono text-[10px] uppercase text-brand-subtle">
              <tr>
                <th className="py-3 px-3">Referrer</th>
                <th className="py-3 px-3">Referred Player</th>
                <th className="py-3 px-3">Referral Code</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Created</th>
                <th className="py-3 px-3">Qualified Date</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/30 text-white font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-brand-subtle">
                    Loading referrals...
                  </td>
                </tr>
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-brand-subtle">
                    No referral records found matching current filter.
                  </td>
                </tr>
              ) : (
                referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-brand-surfaceElevated/40">
                    <td className="py-3 px-3">
                      <div>
                        <strong className="text-white block font-sans">{r.referrerName || 'Player'}</strong>
                        <span className="text-[10px] text-[#ED249B]">{r.referrerGioId || r.referrerPlayerId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div>
                        <strong className="text-white block font-sans">{r.referredName || 'Player'}</strong>
                        <span className="text-[10px] text-[#5AA9E6]">{r.referredGioId || r.referredPlayerId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-brand-surfaceElevated border border-brand-border text-brand-orange font-bold">
                        {r.referralCode}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                        r.status === 'qualified'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : r.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-red-500/20 text-red-400 border border-red-500/40'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-brand-subtle text-[11px]">
                      {r.createdAt ? r.createdAt.slice(0, 10) : '—'}
                    </td>
                    <td className="py-3 px-3 text-brand-subtle text-[11px]">
                      {r.qualifiedAt ? r.qualifiedAt.slice(0, 10) : 'Pending'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {r.status === 'pending' && (
                        <button
                          type="button"
                          disabled={actionLoading === r.id}
                          onClick={() => handleQualify(r.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[10px] font-bold uppercase transition"
                        >
                          {actionLoading === r.id ? '...' : 'Mark Qualified'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
