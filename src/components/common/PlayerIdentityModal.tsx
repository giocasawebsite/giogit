import React, { useState, useEffect } from 'react';
import { PlayerIdLookup, VerifiedPlayerData } from './PlayerIdLookup';
import { PlayerRegistrationModal } from './PlayerRegistrationModal';
import { X, Sparkles, ShieldCheck, Copy, Check, Share2, UserCheck, Gamepad2 } from 'lucide-react';

interface PlayerIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerIdentityModal: React.FC<PlayerIdentityModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'lookup' | 'register'>('lookup');
  const [verifiedPlayer, setVerifiedPlayer] = useState<VerifiedPlayerData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const cached = sessionStorage.getItem('giocasa_verified_player');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.gioId) {
            setVerifiedPlayer(parsed);
          }
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = (player: VerifiedPlayerData) => {
    const shareText = `🎮 Hey! I'm registered at GioCasa Ayodhya with Player ID: *${player.gioId}*! Register yours at https://giocasa1.netlify.app/ and use referral code *${player.referralCode}* to earn rewards! 🏆`;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleClear = () => {
    setVerifiedPlayer(null);
    try {
      sessionStorage.removeItem('giocasa_verified_player');
      sessionStorage.removeItem('giocasa_verify_token');
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#343233] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-700/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-[#4B494A]/10 via-[#ED249B]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ED249B] to-[#5AA9E6] text-white flex items-center justify-center shadow-md shadow-[#ED249B]/20">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base md:text-lg text-neutral-900 dark:text-white">
                GioCasa Player Pass
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Official Ayodhya Gaming Lounge & Rewards Identity
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 space-y-5">
          {verifiedPlayer ? (
            /* Verified Player Card */
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#4B494A] to-[#343233] text-white border border-neutral-700 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#5AA9E6] font-bold">
                      VERIFIED PLAYER PASS
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase bg-[#ED249B]/20 border border-[#ED249B]/40 text-[#ED249B] font-bold">
                    {verifiedPlayer.membershipTier || 'STANDARD'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif text-2xl font-bold tracking-tight text-white">
                    {verifiedPlayer.name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#ED249B] font-bold">
                      @{verifiedPlayer.gamerTag}
                    </span>
                    <span className="text-neutral-400 text-xs">•</span>
                    <span className="text-xs text-neutral-300">
                      {verifiedPlayer.favoriteGame || 'FC 25 & Pool'}
                    </span>
                  </div>
                </div>

                {/* Permanent Player ID */}
                <div className="p-3 rounded-xl bg-black/40 border border-neutral-700/80 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 block">
                      PLAYER ID
                    </span>
                    <span className="text-xl md:text-2xl font-black font-mono tracking-widest text-[#ED249B]">
                      {verifiedPlayer.gioId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyId(verifiedPlayer.gioId)}
                    className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition flex items-center gap-1.5 text-xs font-mono"
                    title="Copy Player ID"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Referral Code */}
                {verifiedPlayer.referralCode && (
                  <div className="flex items-center justify-between text-xs font-mono pt-1">
                    <span className="text-neutral-400">Referral Code:</span>
                    <span className="font-bold text-[#F9A20B]">{verifiedPlayer.referralCode}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(verifiedPlayer)}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#20ba59] transition flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20"
                >
                  <Share2 className="w-4 h-4" /> Share With Friends
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-3 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition border border-neutral-300 dark:border-neutral-700"
                >
                  Switch / Log Out
                </button>
              </div>
            </div>
          ) : (
            /* Switcher between Lookup & Register */
            <div className="space-y-4">
              <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('lookup')}
                  className={`py-2 rounded-xl transition ${
                    activeTab === 'lookup'
                      ? 'bg-white dark:bg-[#343233] text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  I Have a Player ID
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className={`py-2 rounded-xl transition ${
                    activeTab === 'register'
                      ? 'bg-gradient-to-r from-[#ED249B] to-[#F9A20B] text-white shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  New? Register (Free)
                </button>
              </div>

              {activeTab === 'lookup' ? (
                <PlayerIdLookup
                  onVerified={(player) => setVerifiedPlayer(player)}
                  onOpenRegister={() => setActiveTab('register')}
                />
              ) : (
                <PlayerRegistrationModal
                  isOpen={true}
                  onClose={onClose}
                  onRegistered={(player) => {
                    setVerifiedPlayer(player);
                    setActiveTab('lookup');
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
