import React, { useState, useEffect } from 'react';
import { playerCrmApi } from '../../services/playerCrmApi';
import { Player } from '../../types';
import { UserCheck, Sparkles, Search, ShieldCheck, KeyRound, AlertCircle, ArrowRight, X, PhoneCall } from 'lucide-react';

export interface VerifiedPlayerData {
  id: string;
  gioId: string;
  referralCode: string;
  name: string;
  gamerTag: string;
  phone: string;
  email?: string;
  favoriteGame?: string;
  favoritePlatform?: string;
  membershipTier?: string;
  dateOfBirth?: string;
}

interface PlayerIdLookupProps {
  onVerified: (player: VerifiedPlayerData) => void;
  onClear?: () => void;
  onOpenRegister?: () => void;
  className?: string;
  compact?: boolean;
}

export const PlayerIdLookup: React.FC<PlayerIdLookupProps> = ({
  onVerified,
  onClear,
  onOpenRegister,
  className = '',
  compact = false,
}) => {
  const [gioIdInput, setGioIdInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Challenge state
  const [lookupResult, setLookupResult] = useState<{
    player: {
      gioId: string;
      name: string;
      gamerTag: string;
      phoneMasked: string;
      emailMasked?: string;
      favoriteGame?: string;
      favoritePlatform?: string;
      membershipTier: string;
    };
    challenge: {
      type: string;
      prompt: string;
    };
  } | null>(null);

  const [phoneLast4, setPhoneLast4] = useState('');
  const [verifiedPlayer, setVerifiedPlayer] = useState<VerifiedPlayerData | null>(null);

  // Recovery Mode
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);

  // Check sessionStorage for cached verified player on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('giocasa_verified_player');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.gioId) {
          setVerifiedPlayer(parsed);
          onVerified(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Format GIO ID input automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (val && !val.startsWith('GIO-') && !val.startsWith('GIO') && val.length <= 6) {
      // Allow raw 6-character code typing or GIO- prefix
    }
    setGioIdInput(val);
    setError(null);
  };

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!gioIdInput.trim()) {
      setError('Please enter your GioCasa Player ID.');
      return;
    }

    let searchId = gioIdInput.trim().toUpperCase();
    if (!searchId.startsWith('GIO-') && searchId.length === 6) {
      searchId = `GIO-${searchId}`;
    }

    setLookupLoading(true);
    setError(null);
    try {
      const data = await playerCrmApi.publicLookupPlayer(searchId);
      setLookupResult(data);
      setPhoneLast4('');
    } catch (err: any) {
      setError(err.message || 'Player ID not found. Check your code or register below.');
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupResult) return;

    if (!phoneLast4 || phoneLast4.trim().length !== 4) {
      setError('Please enter the last 4 digits of your registered mobile number.');
      return;
    }

    setVerifyLoading(true);
    setError(null);
    try {
      const res = await playerCrmApi.publicVerifyPlayer(lookupResult.player.gioId, phoneLast4.trim());
      const player = res.player;
      setVerifiedPlayer(player);
      setLookupResult(null);
      setGioIdInput(player.gioId);

      // Cache session verification
      try {
        sessionStorage.setItem('giocasa_verified_player', JSON.stringify(player));
        if (res.token) {
          sessionStorage.setItem('giocasa_verify_token', res.token);
        }
      } catch {
        // ignore storage errors
      }

      onVerified(player);
    } catch (err: any) {
      setError(err.message || 'Digits did not match. Please verify and try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleClear = () => {
    setVerifiedPlayer(null);
    setLookupResult(null);
    setGioIdInput('');
    setPhoneLast4('');
    setError(null);
    try {
      sessionStorage.removeItem('giocasa_verified_player');
      sessionStorage.removeItem('giocasa_verify_token');
    } catch {
      // ignore
    }
    if (onClear) onClear();
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryPhone || recoveryPhone.trim().length < 10) {
      setError('Please enter your 10-digit mobile number.');
      return;
    }

    setRecoverLoading(true);
    setError(null);
    setRecoverySuccess(null);
    try {
      const res = await playerCrmApi.publicRecoverPlayerId(recoveryPhone.trim());
      setRecoverySuccess(res.message || `Your Player ID is ${res.gioId}`);
      if (res.gioId) {
        setGioIdInput(res.gioId);
      }
    } catch (err: any) {
      setError(err.message || 'No Player ID found for this number.');
    } finally {
      setRecoverLoading(false);
    }
  };

  // State 1: Verified Player Card
  if (verifiedPlayer) {
    return (
      <div
        className={`rounded-2xl p-4 border bg-gradient-to-r from-[#4B494A]/10 via-[#ED249B]/5 to-transparent border-[#ED249B]/30 ${className}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ED249B] to-[#F9A20B] flex items-center justify-center text-white shadow-md shadow-[#ED249B]/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-900 dark:text-white">{verifiedPlayer.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-[#ED249B]/10 text-[#ED249B] border border-[#ED249B]/20">
                  {verifiedPlayer.gioId}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  @{verifiedPlayer.gamerTag}
                </span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 inline" /> Auto-filled from your verified GioCasa Player ID
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-red-500 hover:border-red-400 transition"
          >
            Change Player
          </button>
        </div>
      </div>
    );
  }

  // State 2: Phone Challenge Modal/Inline Form
  if (lookupResult) {
    return (
      <div
        className={`rounded-2xl p-4 md:p-5 border bg-white dark:bg-[#343233] border-[#5AA9E6]/40 shadow-lg shadow-[#5AA9E6]/5 ${className}`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5AA9E6]/10 text-[#5AA9E6] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Verify Your Identity</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Found profile for <strong className="text-neutral-800 dark:text-neutral-200">{lookupResult.player.name}</strong> ({lookupResult.player.gioId})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLookupResult(null)}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="space-y-3">
          <p className="text-xs text-neutral-600 dark:text-neutral-300">
            {lookupResult.challenge.prompt}
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="e.g. 1234"
              value={phoneLast4}
              onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-32 px-3 py-2 text-center text-lg tracking-widest font-mono font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5AA9E6]"
              autoFocus
            />
            <button
              type="submit"
              disabled={verifyLoading || phoneLast4.length !== 4}
              className="flex-1 px-4 py-2 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-[#ED249B] to-[#F9A20B] hover:opacity-95 disabled:opacity-50 transition shadow-sm"
            >
              {verifyLoading ? 'Verifying...' : 'Unlock & Auto-Fill'}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 inline shrink-0" /> {error}
            </p>
          )}
        </form>
      </div>
    );
  }

  // State 3: Recovery Mode
  if (recoveryMode) {
    return (
      <div className={`rounded-2xl p-4 border bg-neutral-50 dark:bg-[#343233]/70 border-neutral-200 dark:border-neutral-800 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-[#F9A20B]" /> Recover GioCasa Player ID
          </span>
          <button
            type="button"
            onClick={() => {
              setRecoveryMode(false);
              setError(null);
              setRecoverySuccess(null);
            }}
            className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Back to ID lookup
          </button>
        </div>

        {recoverySuccess ? (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/50 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">{recoverySuccess}</p>
            <button
              type="button"
              onClick={() => {
                setRecoveryMode(false);
                handleLookup();
              }}
              className="text-xs font-bold px-3 py-1.5 bg-[#ED249B] text-white rounded-lg shadow-sm"
            >
              Verify & Auto-Fill Now
            </button>
          </div>
        ) : (
          <form onSubmit={handleRecover} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="Enter registered mobile number"
                value={recoveryPhone}
                onChange={(e) => setRecoveryPhone(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={recoverLoading}
                className="px-3 py-1.5 text-xs font-bold text-white bg-[#4B494A] hover:bg-neutral-800 rounded-xl transition"
              >
                {recoverLoading ? 'Finding...' : 'Find ID'}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-500 font-medium">{error}</p>
            )}
          </form>
        )}
      </div>
    );
  }

  // State 4: Default ID Lookup Bar
  return (
    <div
      className={`rounded-2xl p-3.5 md:p-4 border bg-neutral-50/80 dark:bg-[#343233]/40 border-neutral-200 dark:border-neutral-800 transition ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#ED249B]/10 text-[#ED249B] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-neutral-900 dark:text-white">Have a GioCasa Player ID?</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[#ED249B]/10 text-[#ED249B]">
                1-CLICK AUTO-FILL
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Enter your ID to instantly fill your name, contact & gaming profile.
            </p>
          </div>
        </div>

        <form onSubmit={handleLookup} className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. GIO-7A2B9C"
              value={gioIdInput}
              onChange={handleInputChange}
              className="w-36 md:w-40 px-3 py-1.5 text-xs font-mono font-bold tracking-wider uppercase rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED249B]"
            />
          </div>
          <button
            type="submit"
            disabled={lookupLoading || !gioIdInput.trim()}
            className="px-3 py-1.5 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-[#ED249B] to-[#F9A20B] hover:opacity-90 disabled:opacity-40 transition shadow-sm flex items-center gap-1 shrink-0"
          >
            {lookupLoading ? '...' : (
              <>
                <span>Autofill</span>
                <ArrowRight className="w-3 h-3" />
              </>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-500 font-medium flex items-center justify-between gap-2">
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 inline shrink-0" /> {error}
          </span>
          <button
            type="button"
            onClick={() => setRecoveryMode(true)}
            className="text-xs underline text-[#5AA9E6] hover:text-[#5AA9E6]/80 font-medium"
          >
            Forgot ID?
          </button>
        </div>
      )}

      {!error && (
        <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
          <button
            type="button"
            onClick={() => setRecoveryMode(true)}
            className="hover:underline text-neutral-500 dark:text-neutral-400 hover:text-[#5AA9E6]"
          >
            Forgot your Player ID?
          </button>

          {onOpenRegister && (
            <button
              type="button"
              onClick={onOpenRegister}
              className="font-bold text-[#ED249B] hover:underline"
            >
              Don't have an ID? Register in 30s →
            </button>
          )}
        </div>
      )}
    </div>
  );
};
