import React, { useState, useEffect } from 'react';
import { LoyaltyRules } from '../../../types';
import { playerCrmApi } from '../../../services/playerCrmApi';
import { X, Sparkles, Save, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface LoyaltyRulesModalProps {
  isOpen: boolean;
  passcode: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export const LoyaltyRulesModal: React.FC<LoyaltyRulesModalProps> = ({
  isOpen,
  passcode,
  onClose,
  onUpdated,
}) => {
  const [rules, setRules] = useState<LoyaltyRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadRules();
    }
  }, [isOpen]);

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await playerCrmApi.getLoyaltyRules(passcode);
      setRules(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load loyalty rules.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rules) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await playerCrmApi.updateLoyaltyRules(passcode, rules);
      setRules(updated);
      setSuccess('Loyalty rules updated successfully.');
      if (onUpdated) onUpdated();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save loyalty rules.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-border bg-gradient-to-r from-brand-pink/10 via-brand-orange/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-pink/20 border border-brand-pink/40 text-brand-pink flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Loyalty Points Engine Rules</h3>
              <p className="text-xs text-brand-subtle font-mono">
                Automated, auditable points rules & bonus values
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-brand-subtle hover:text-white hover:bg-brand-surfaceElevated transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {loading || !rules ? (
          <div className="p-12 text-center text-brand-subtle font-mono">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-pink mb-2" />
            <span>Loading rules...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2 font-mono">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Rule 1: Gaming Session Points */}
            <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-white block">Gaming Session Completed</label>
                  <span className="text-[11px] text-brand-subtle block">Points awarded ONLY after booking status is completed.</span>
                </div>
                <input
                  type="checkbox"
                  checked={rules.rulesEnabled.gamingSession}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      rulesEnabled: { ...rules.rulesEnabled, gamingSession: e.target.checked },
                    })
                  }
                  className="w-4 h-4 rounded text-brand-pink"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-brand-subtle font-mono">Points per completed session:</span>
                <input
                  type="number"
                  min={0}
                  value={rules.gamingSessionPoints}
                  onChange={(e) => setRules({ ...rules, gamingSessionPoints: parseInt(e.target.value, 10) || 0 })}
                  className="w-24 px-3 py-1.5 text-xs font-mono font-bold rounded-xl bg-brand-dark border border-brand-border text-white text-right"
                />
              </div>
            </div>

            {/* Rule 2: Tournament Check-In */}
            <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-white block">Tournament Participation (Checked In)</label>
                  <span className="text-[11px] text-brand-subtle block">Awarded when contender checks in at the venue.</span>
                </div>
                <input
                  type="checkbox"
                  checked={rules.rulesEnabled.tournamentParticipation}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      rulesEnabled: { ...rules.rulesEnabled, tournamentParticipation: e.target.checked },
                    })
                  }
                  className="w-4 h-4 rounded text-brand-pink"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-brand-subtle font-mono">Participation points:</span>
                <input
                  type="number"
                  min={0}
                  value={rules.tournamentParticipationPoints}
                  onChange={(e) =>
                    setRules({ ...rules, tournamentParticipationPoints: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-24 px-3 py-1.5 text-xs font-mono font-bold rounded-xl bg-brand-dark border border-brand-border text-white text-right"
                />
              </div>
            </div>

            {/* Rule 3: Placement Bonuses */}
            <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-white block">Tournament Placement Bonuses</label>
                  <span className="text-[11px] text-brand-subtle block">Awarded when tournament standings are finalized & published.</span>
                </div>
                <input
                  type="checkbox"
                  checked={rules.rulesEnabled.tournamentPlacement}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      rulesEnabled: { ...rules.rulesEnabled, tournamentPlacement: e.target.checked },
                    })
                  }
                  className="w-4 h-4 rounded text-brand-pink"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-brand-orange block">🥇 1st Place</span>
                  <input
                    type="number"
                    min={0}
                    value={rules.tournamentPlacementBonus.first}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        tournamentPlacementBonus: {
                          ...rules.tournamentPlacementBonus,
                          first: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 font-bold rounded-xl bg-brand-dark border border-brand-border text-white text-right"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-300 block">🥈 2nd Place</span>
                  <input
                    type="number"
                    min={0}
                    value={rules.tournamentPlacementBonus.second}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        tournamentPlacementBonus: {
                          ...rules.tournamentPlacementBonus,
                          second: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 font-bold rounded-xl bg-brand-dark border border-brand-border text-white text-right"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-amber-600 block">🥉 3rd Place</span>
                  <input
                    type="number"
                    min={0}
                    value={rules.tournamentPlacementBonus.third}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        tournamentPlacementBonus: {
                          ...rules.tournamentPlacementBonus,
                          third: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 font-bold rounded-xl bg-brand-dark border border-brand-border text-white text-right"
                  />
                </div>
              </div>
            </div>

            {/* Rule 4: Referral Rewards */}
            <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-white block">Referral Qualification Reward</label>
                  <span className="text-[11px] text-brand-subtle block">Awarded to referring player when friend completes first visit.</span>
                </div>
                <input
                  type="checkbox"
                  checked={rules.rulesEnabled.referral}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      rulesEnabled: { ...rules.rulesEnabled, referral: e.target.checked },
                    })
                  }
                  className="w-4 h-4 rounded text-brand-pink"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-brand-subtle font-mono">Referrer points bonus:</span>
                <input
                  type="number"
                  min={0}
                  value={rules.referralPoints}
                  onChange={(e) => setRules({ ...rules, referralPoints: parseInt(e.target.value, 10) || 0 })}
                  className="w-24 px-3 py-1.5 text-xs font-mono font-bold rounded-xl bg-brand-dark border border-brand-border text-white text-right"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-mono text-brand-subtle hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-mono uppercase font-bold flex items-center gap-2 shadow-luxury-pink"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Loyalty Rules'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
