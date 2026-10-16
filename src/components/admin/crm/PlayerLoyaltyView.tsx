import React, { useState, useEffect } from 'react';
import { LoyaltyLedgerEntry } from '../../../types';
import { playerCrmApi } from '../../../services/playerCrmApi';
import { Sparkles, Award, ShieldCheck, RefreshCw, Clock, ArrowRight } from 'lucide-react';

interface PlayerLoyaltyViewProps {
  passcode: string;
}

export const PlayerLoyaltyView: React.FC<PlayerLoyaltyViewProps> = ({ passcode }) => {
  const [recentTransactions, setRecentTransactions] = useState<LoyaltyLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecent = async () => {
    setLoading(true);
    try {
      const data = await playerCrmApi.getRecentLoyalty(passcode);
      setRecentTransactions(data);
    } catch (err) {
      console.warn('Failed to load recent loyalty ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, [passcode]);

  const tiers = [
    {
      name: 'Standard Member',
      req: '0 - 499 Lifetime Pts',
      color: 'subtle',
      perks: ['Earn 1 pt per ₹10 spent on gaming', 'Access to open community tournaments', 'Direct WhatsApp booking concierge'],
    },
    {
      name: 'Bronze Tier',
      req: '500 - 999 Lifetime Pts',
      color: 'amber',
      perks: ['5% discount on station extensions', 'Early bracket notification for FC25 tournaments', 'Birthday month complimentary beverage'],
    },
    {
      name: 'Silver Tier',
      req: '1,000 - 2,499 Lifetime Pts',
      color: 'slate',
      perks: ['10% discount on weekday gaming sessions', 'Guaranteed waitlist priority', 'Exclusive GioCasa member decal'],
    },
    {
      name: 'Gold Tier',
      req: '2,500 - 4,999 Lifetime Pts',
      color: 'orange',
      perks: ['15% discount on all bookings', 'Free table reservation for birthday tournaments', 'Direct line to station manager'],
    },
    {
      name: 'VIP Platinum',
      req: '5,000+ Lifetime Pts',
      color: 'pink',
      perks: ['20% venue discount across pizza and gaming', 'Guaranteed controller & rig reservation on weekends', 'Custom Hall of Fame engraved profile tag'],
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-bold text-white">
            GioCasa Loyalty & Rewards Program
          </h2>
          <p className="text-xs text-brand-subtle max-w-2xl">
            Points-based player retention with auditable ledger tracking. Points are earned automatically on verified gaming spend and tournament participation.
          </p>
        </div>

        <button
          onClick={fetchRecent}
          className="p-2 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-white transition-colors"
          title="Refresh Ledger"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tier Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {tiers.map((t, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-2xl bg-brand-surface border transition-all space-y-3 flex flex-col justify-between ${
              t.color === 'pink'
                ? 'border-brand-pink shadow-luxury-pink'
                : t.color === 'orange'
                ? 'border-brand-orange/60'
                : 'border-brand-border'
            }`}
          >
            <div className="space-y-2">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
                t.color === 'pink' ? 'text-brand-pink' : t.color === 'orange' ? 'text-brand-orange' : 'text-brand-subtle'
              }`}>
                Tier 0{idx + 1}
              </span>
              <h3 className="font-serif text-lg font-bold text-white">{t.name}</h3>
              <div className="text-xs font-mono text-white/90 font-semibold">{t.req}</div>
              <ul className="text-[11px] text-brand-subtle space-y-1.5 pt-2 border-t border-brand-border/40 font-light">
                {t.perks.map((p, pIdx) => (
                  <li key={pIdx} className="flex items-start gap-1.5">
                    <span className="text-brand-pink font-bold">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Points Ledger */}
      <div className="p-6 rounded-3xl bg-brand-surface border border-brand-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl font-bold text-white">Global Recent Points Ledger</h3>
          <span className="text-xs font-mono text-brand-subtle">Last 50 transactions across all guests</span>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-brand-subtle font-mono text-xs">
            No loyalty transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-brand-dark/95 border-b border-brand-border text-brand-subtle text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Player ID</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Points Delta</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 text-white">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-brand-surfaceElevated/50">
                    <td className="py-3 px-3 text-brand-subtle">
                      {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 font-bold text-brand-blue">{tx.playerId}</td>
                    <td className="py-3 px-3 uppercase text-brand-pink font-semibold">
                      {tx.type}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`font-bold ${tx.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                      </span>
                    </td>
                    <td className="py-3 px-3 text-white">{tx.reason}</td>
                    <td className="py-3 px-3 text-brand-subtle">{tx.referenceId || 'Manual'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
