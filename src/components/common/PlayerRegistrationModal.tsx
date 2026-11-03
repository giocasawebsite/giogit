import React, { useState, useEffect } from 'react';
import { playerCrmApi } from '../../services/playerCrmApi';
import { VerifiedPlayerData } from './PlayerIdLookup';
import { X, Sparkles, Copy, Check, Share2, ShieldCheck, Trophy, AlertCircle, Loader2 } from 'lucide-react';

interface PlayerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered?: (player: VerifiedPlayerData) => void;
}

export const PlayerRegistrationModal: React.FC<PlayerRegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegistered,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [customGioId, setCustomGioId] = useState('');
  const [idChecking, setIdChecking] = useState(false);
  const [idStatus, setIdStatus] = useState<{ available?: boolean; message?: string; error?: string } | null>(null);
  const [gamerTag, setGamerTag] = useState('');
  const [email, setEmail] = useState('');
  const [favoriteGame, setFavoriteGame] = useState('EA Sports FC 25');
  const [favoritePlatform, setFavoritePlatform] = useState('ps5');
  const [referredBy, setReferredBy] = useState('');
  const [whatsappUpdates, setWhatsappUpdates] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPlayer, setCreatedPlayer] = useState<VerifiedPlayerData | null>(null);
  const [copied, setCopied] = useState(false);

  // Live availability feedback for custom Gio ID
  useEffect(() => {
    const trimmed = customGioId.trim().toUpperCase();
    if (!trimmed) {
      setIdStatus(null);
      setIdChecking(false);
      return;
    }

    if (!trimmed.startsWith('GIO')) {
      setIdStatus({ available: false, error: 'Must start with GIO (e.g. GIOKING23)' });
      setIdChecking(false);
      return;
    }
    if (trimmed.length < 6) {
      setIdStatus({ available: false, error: 'At least 6 characters (e.g. GIOFC24)' });
      setIdChecking(false);
      return;
    }
    if (trimmed.length > 20) {
      setIdStatus({ available: false, error: 'Maximum 20 characters allowed' });
      setIdChecking(false);
      return;
    }
    const suffix = trimmed.slice(3);
    if (!/^[A-Z0-9]+$/.test(suffix)) {
      setIdStatus({ available: false, error: 'Only uppercase letters and numbers after GIO (no special characters)' });
      setIdChecking(false);
      return;
    }

    setIdChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await playerCrmApi.checkGioIdAvailability(trimmed);
        if (res.available) {
          setIdStatus({ available: true, message: 'This Gio ID is available!' });
        } else {
          setIdStatus({ available: false, error: res.error || 'This Gio ID is already taken. Please choose another.' });
        }
      } catch {
        setIdStatus({ available: false, error: 'Could not verify ID availability.' });
      } finally {
        setIdChecking(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [customGioId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('A valid 10-digit mobile number is required.');
      return;
    }
    if (customGioId.trim() && idStatus && !idStatus.available) {
      setError(idStatus.error || 'Please choose an available Gio ID before continuing.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await playerCrmApi.publicRegisterPlayer({
        name: name.trim(),
        gamerTag: gamerTag.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        customGioId: customGioId.trim().toUpperCase() || undefined,
        favoriteGame,
        favoritePlatform,
        referredBy: referredBy.trim() || undefined,
        consent: { whatsappUpdates, emailUpdates: true },
      });

      const player: VerifiedPlayerData = {
        id: res.player.id,
        gioId: res.player.gioId,
        referralCode: res.player.referralCode,
        name: res.player.name,
        gamerTag: res.player.gamerTag,
        phone: res.player.phone,
        email: res.player.email,
        favoriteGame: res.player.favoriteGame,
        favoritePlatform: res.player.favoritePlatform,
        membershipTier: res.player.membershipTier,
      };

      setCreatedPlayer(player);

      // Cache verified session
      try {
        sessionStorage.setItem('giocasa_verified_player', JSON.stringify(player));
        if (res.token) {
          sessionStorage.setItem('giocasa_verify_token', res.token);
        }
      } catch {
        // ignore
      }

      if (onRegistered) {
        onRegistered(player);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    if (!createdPlayer) return;
    navigator.clipboard.writeText(createdPlayer.gioId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!createdPlayer) return;
    const shareText = `🎮 Hey! I just got my official GioCasa Player ID: *${createdPlayer.gioId}*! Register yours at https://giocasa1.netlify.app/ and use my referral code *${createdPlayer.referralCode}* to earn rewards! 🏆`;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#343233] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-700/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-[#4B494A]/10 via-[#ED249B]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ED249B] to-[#F9A20B] text-white flex items-center justify-center shadow-md shadow-[#ED249B]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base md:text-lg text-neutral-900 dark:text-white">
                {createdPlayer ? 'Welcome to GioCasa!' : 'Get Your GioCasa Player ID'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {createdPlayer
                  ? 'Your permanent gamer identity & rewards profile is active'
                  : '1-time signup for instant 1-click booking autofill & rewards'}
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

        {/* Content */}
        {createdPlayer ? (
          <div className="p-6 md:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center ring-8 ring-emerald-500/5">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-neutral-400">Your Permanent Player ID</span>
              <div className="flex items-center justify-center gap-3 mt-1.5">
                <span className="text-3xl md:text-4xl font-black font-mono tracking-widest text-[#ED249B] bg-[#ED249B]/10 px-4 py-2 rounded-2xl border border-[#ED249B]/30 shadow-inner">
                  {createdPlayer.gioId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-[#ED249B] transition"
                  title="Copy Player ID"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60 text-left space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
              <p>👤 <strong>Name:</strong> {createdPlayer.name} (@{createdPlayer.gamerTag})</p>
              <p>📱 <strong>Mobile:</strong> {createdPlayer.phone}</p>
              <p>🎁 <strong>Your Referral Code:</strong> <span className="font-mono font-bold text-[#F9A20B]">{createdPlayer.referralCode}</span></p>
              <p className="text-neutral-500 dark:text-neutral-400 pt-1">
                Share your referral code with friends — earn bonus points when they play!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#25D366] hover:bg-[#20ba59] transition flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20"
              >
                <Share2 className="w-4 h-4" /> Share with Friends
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#ED249B] to-[#F9A20B] hover:opacity-95 transition shadow-md shadow-[#ED249B]/20"
              >
                Done & Continue
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sahil Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED249B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED249B]"
                />
              </div>
            </div>

            {/* Custom Gio ID Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Custom Player ID (Optional)
                </label>
                <span className="text-[10px] text-neutral-400">
                  Must start with GIO • Leave blank to auto-generate
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. GIOKING23, GIOPLAYER101, GIOFC24"
                  value={customGioId}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    setCustomGioId(clean);
                  }}
                  maxLength={20}
                  className={`w-full px-3 py-2 text-xs font-mono uppercase tracking-wider rounded-xl border bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 ${
                    idStatus?.available
                      ? 'border-emerald-500 focus:ring-emerald-500'
                      : idStatus && !idStatus.available
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-neutral-300 dark:border-neutral-700 focus:ring-[#ED249B]'
                  }`}
                />
                {idChecking && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
                  </div>
                )}
                {!idChecking && idStatus?.available && (
                  <div className="absolute right-3 top-2.5 text-emerald-500">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
              {idStatus && (
                <div
                  className={`mt-1 text-[11px] font-medium flex items-center gap-1 ${
                    idStatus.available ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {idStatus.available ? (
                    <>
                      <span>✓</span>
                      <span>{idStatus.message}</span>
                    </>
                  ) : (
                    <>
                      <span>⚠</span>
                      <span>{idStatus.error}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Gamer Tag / Handle (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Striker99"
                  value={gamerTag}
                  onChange={(e) => setGamerTag(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED249B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED249B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Favorite Game
                </label>
                <select
                  value={favoriteGame}
                  onChange={(e) => setFavoriteGame(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED249B]"
                >
                  <option value="EA Sports FC 25">EA Sports FC 25</option>
                  <option value="Tekken 8">Tekken 8</option>
                  <option value="Mortal Kombat 1">Mortal Kombat 1</option>
                  <option value="Gran Turismo 7">Gran Turismo 7</option>
                  <option value="Pool / Billiards">8-Ball Pool / Billiards</option>
                  <option value="GTA V">Grand Theft Auto V</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Referral Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="REF-XXXXXX or GIO-XXXXXX"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono uppercase tracking-wider rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ED249B]"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-600 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={whatsappUpdates}
                  onChange={(e) => setWhatsappUpdates(e.target.checked)}
                  className="w-4 h-4 rounded text-[#ED249B] focus:ring-[#ED249B]"
                />
                <span>Receive booking confirmations & tournament updates on WhatsApp</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#ED249B] to-[#F9A20B] hover:opacity-95 disabled:opacity-50 transition shadow-lg shadow-[#ED249B]/20 flex items-center justify-center gap-2"
              >
                {loading ? 'Creating Your ID...' : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create My GioCasa Player ID</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
