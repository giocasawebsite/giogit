import React, { useState, useEffect } from 'react';
import { Player, MembershipTier, PlayerStatus, ResourceCategory } from '../../../types';
import { X, User, Phone, Mail, Gamepad2, Award, Tag, Check, AlertCircle } from 'lucide-react';

interface PlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Player>) => Promise<void>;
  initialData?: Player | null;
  mode: 'create' | 'edit';
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}) => {
  const [name, setName] = useState('');
  const [gamerTag, setGamerTag] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [favoriteGame, setFavoriteGame] = useState('EA Sports FC 25');
  const [favoritePlatform, setFavoritePlatform] = useState<ResourceCategory | 'other'>('ps5');
  const [membershipTier, setMembershipTier] = useState<MembershipTier>('standard');
  const [status, setStatus] = useState<PlayerStatus>('active');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [whatsappUpdates, setWhatsappUpdates] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setName(initialData.name || '');
      setGamerTag(initialData.gamerTag || '');
      setPhone(initialData.phone || '');
      setEmail(initialData.email || '');
      setFavoriteGame(initialData.favoriteGame || 'EA Sports FC 25');
      setFavoritePlatform(initialData.favoritePlatform || 'ps5');
      setMembershipTier(initialData.membershipTier || 'standard');
      setStatus(initialData.status || 'active');
      setTags(initialData.tags || []);
      setWhatsappUpdates(initialData.consent?.whatsappUpdates ?? true);
      setEmailUpdates(initialData.consent?.emailUpdates ?? true);
    } else {
      setName('');
      setGamerTag('');
      setPhone('');
      setEmail('');
      setFavoriteGame('EA Sports FC 25');
      setFavoritePlatform('ps5');
      setMembershipTier('standard');
      setStatus('active');
      setTags(['New Player']);
      setWhatsappUpdates(true);
      setEmailUpdates(true);
    }
    setError(null);
  }, [initialData, mode, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const clean = tagInput.trim();
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tToRemove: string) => {
    setTags(tags.filter((t) => t !== tToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Player full name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Mobile phone number is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        gamerTag: gamerTag.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        favoriteGame: favoriteGame.trim(),
        favoritePlatform,
        membershipTier,
        status,
        tags,
        consent: {
          whatsappUpdates,
          emailUpdates,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save player details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-brand-surface border border-brand-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-brand-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange to-brand-pink flex items-center justify-center text-white shadow-luxury-pink">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-white">
                {mode === 'create' ? 'Register New Player' : `Edit Player: ${initialData?.name}`}
              </h2>
              <p className="text-xs text-brand-subtle">
                {mode === 'create'
                  ? 'Create an official GioCasa customer CRM profile.'
                  : `ID: ${initialData?.id} • Verified Player Record`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-brand-surfaceElevated hover:bg-brand-surface border border-brand-border text-brand-subtle hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-mono uppercase text-brand-subtle mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sahil Mishra"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-pink transition-colors"
              />
            </div>

            {/* Gamer Tag */}
            <div>
              <label className="block text-xs font-mono uppercase text-brand-subtle mb-1">
                Gamer Tag / In-Game ID
              </label>
              <input
                type="text"
                placeholder="e.g. Striker_99"
                value={gamerTag}
                onChange={(e) => setGamerTag(e.target.value)}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-pink transition-colors font-mono"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-mono uppercase text-brand-subtle mb-1">
                Mobile Number (WhatsApp) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-brand-subtle absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-pink transition-colors font-mono"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-mono uppercase text-brand-subtle mb-1">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-brand-subtle absolute left-3.5 top-3" />
                <input
                  type="email"
                  placeholder="e.g. player@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-pink transition-colors"
                />
              </div>
            </div>

            {/* Favorite Game */}
            <div>
              <label className="block text-xs font-mono uppercase text-brand-subtle mb-1">
                Favorite Game
              </label>
              <input
                type="text"
                placeholder="e.g. EA Sports FC 25, Tekken 8, Pool"
                value={favoriteGame}
                onChange={(e) => setFavoriteGame(e.target.value)}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-pink transition-colors"
              />
            </div>

            {/* Favorite Platform */}
            <div>
              <label className="block text-xs font-mono uppercase text-brand-subtle mb-1">
                Primary Platform / Zone
              </label>
              <select
                value={favoritePlatform}
                onChange={(e) => setFavoritePlatform(e.target.value as any)}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-pink transition-colors"
              >
                <option value="ps5">PS5 4K Pro Arena</option>
                <option value="pool">Hot-Shot 8-Ball Slate Pool</option>
                <option value="racing">Pro Racing Simulator Rig</option>
                <option value="foosball">Pro Tournament Foosball</option>
                <option value="boardgames">Tabletop & Board Games</option>
                <option value="other">General / All-Rounder</option>
              </select>
            </div>

            {/* Membership Tier */}
            <div>
              <label className="block text-xs font-mono uppercase text-brand-subtle mb-1">
                Membership Tier
              </label>
              <select
                value={membershipTier}
                onChange={(e) => setMembershipTier(e.target.value as MembershipTier)}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-pink transition-colors uppercase font-mono text-xs font-semibold"
              >
                <option value="standard">Standard Member</option>
                <option value="bronze">Bronze Tier (500+ pts)</option>
                <option value="silver">Silver Tier (1,000+ pts)</option>
                <option value="gold">Gold Tier (2,500+ pts)</option>
                <option value="vip">VIP Platinum Tier (5,000+ pts)</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-mono uppercase text-brand-subtle mb-1">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PlayerStatus)}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-pink transition-colors font-mono text-xs font-semibold"
              >
                <option value="active">Active Guest</option>
                <option value="inactive">Inactive</option>
                <option value="banned">Banned / Restricted</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-mono uppercase text-brand-subtle">
              Player Tags & Segments
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add tag (e.g. VIP, Weekend Regular, Pool Shark)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-brand-pink"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white text-xs font-mono hover:border-brand-pink transition-colors"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-surfaceElevated border border-brand-border text-xs text-white"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-brand-subtle hover:text-red-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Consent Checkboxes */}
          <div className="pt-2 border-t border-brand-border/40 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-brand-subtle">
              <input
                type="checkbox"
                checked={whatsappUpdates}
                onChange={(e) => setWhatsappUpdates(e.target.checked)}
                className="rounded border-brand-border bg-brand-surface text-brand-pink focus:ring-brand-pink"
              />
              <span>Customer consented to receive WhatsApp tournament and event updates</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-brand-subtle">
              <input
                type="checkbox"
                checked={emailUpdates}
                onChange={(e) => setEmailUpdates(e.target.checked)}
                className="rounded border-brand-border bg-brand-surface text-brand-pink focus:ring-brand-pink"
              />
              <span>Customer consented to receive email notifications</span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-full bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-white text-xs uppercase tracking-wider font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs uppercase tracking-wider font-semibold transition-all shadow-luxury-pink hover:-translate-y-0.5"
            >
              {loading ? 'Saving...' : mode === 'create' ? 'Create Player' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
