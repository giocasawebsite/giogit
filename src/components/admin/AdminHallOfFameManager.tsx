import React, { useState, useEffect, useCallback } from 'react';
import { useAdminLiveSync } from '../../hooks/useAdminLiveSync';
import { HallOfFameEntry } from '../../types';
import { arenaApi } from '../../services/arenaApi';
import {
  Trophy,
  Plus,
  Edit,
  Trash2,
  Upload,
  RefreshCw,
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Award,
} from 'lucide-react';

interface AdminHallOfFameManagerProps {
  passcode: string;
}

export const AdminHallOfFameManager: React.FC<AdminHallOfFameManagerProps> = ({ passcode }) => {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<HallOfFameEntry>>({
    playerName: '',
    teamName: '',
    award: 'Champion / 1st Place',
    tournamentTitle: 'GioCasa Arena Championship',
    gameTitle: 'EA Sports FC 25',
    gameCategory: 'ps5',
    season: `${new Date().getFullYear()} Season`,
    eventDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    scoreDescription: '',
    photoUrl: '/assets/real/ps5_setup.png',
    isFeatured: false,
    isPublished: true,
    order: 1,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await arenaApi.getAdminHallOfFame(passcode);
      setEntries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load Hall of Fame entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [passcode]);

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      playerName: '',
      teamName: '',
      award: 'Champion / 1st Place',
      tournamentTitle: 'GioCasa Arena Championship',
      gameTitle: 'EA Sports FC 25',
      gameCategory: 'ps5',
      season: `${new Date().getFullYear()} Season`,
      eventDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
      scoreDescription: '',
      photoUrl: '/assets/real/ps5_setup.png',
      isFeatured: false,
      isPublished: true,
      order: entries.length + 1,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (entry: HallOfFameEntry) => {
    setEditingId(entry.id);
    setFormData(entry);
    setModalError(null);
    setShowModal(true);
  };

  const handleDelete = async (entry: HallOfFameEntry) => {
    if (!window.confirm(`Remove champion "${entry.playerName}" from the Hall of Fame?`)) return;

    try {
      await arenaApi.deleteAdminHallOfFame(passcode, entry.id);
      await loadEntries();
    } catch (err: any) {
      alert(err.message || 'Failed to delete Hall of Fame entry');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.playerName?.trim()) {
      setModalError('Please enter the champion / player name.');
      return;
    }

    setSubmitting(true);
    setModalError(null);
    try {
      if (editingId) {
        await arenaApi.updateAdminHallOfFame(passcode, editingId, formData);
      } else {
        await arenaApi.createAdminHallOfFame(passcode, formData);
      }
      setShowModal(false);
      await loadEntries();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save Hall of Fame entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setFormData((prev) => ({ ...prev, photoUrl: uploadRes.url }));
      } catch (err: any) {
        alert(err.message || 'Image upload failed');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-brand-gold font-bold block">
            PUBLIC CHAMPIONS ARCHIVE
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-cream">
            Hall of Fame Management
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadEntries}
            className="p-2.5 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-brand-cream transition-colors"
            title="Refresh Hall of Fame"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenNew}
            className="px-4 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-gold/90 text-brand-dark text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Induct Champion</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Entries Table */}
      {loading ? (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-12 text-center text-xs font-mono text-brand-subtle">
          Loading Hall of Fame records...
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-12 text-center space-y-3">
          <Trophy className="w-12 h-12 text-brand-gold mx-auto" />
          <h3 className="font-serif text-xl font-bold text-brand-cream">No Champions Inducted Yet</h3>
          <p className="text-xs text-brand-subtle max-w-sm mx-auto">
            Click "Induct Champion" to add your inaugural tournament winners to the public gallery.
          </p>
        </div>
      ) : (
        <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-brand-surfaceElevated border-b border-brand-border text-[10px] text-brand-subtle uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Champion / Contender</th>
                <th className="py-3 px-4">Award & Tournament</th>
                <th className="py-3 px-4">Game & Season</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-brand-surfaceElevated/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={entry.photoUrl}
                        alt={entry.playerName}
                        className="w-10 h-10 rounded-xl object-cover border border-brand-border shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/assets/real/ps5_setup.png';
                        }}
                      />
                      <div>
                        <strong className="text-brand-cream font-bold block text-sm">{entry.playerName}</strong>
                        {entry.teamName && (
                          <span className="text-brand-gold text-[11px] block">Team: {entry.teamName}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-brand-gold font-bold block">{entry.award}</span>
                    <span className="text-brand-subtle text-[11px] block">{entry.tournamentTitle}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-brand-cream block">{entry.gameTitle}</span>
                    <span className="text-brand-subtle text-[11px] block">{entry.season}</span>
                  </td>

                  <td className="py-3.5 px-4 text-brand-cream">
                    {entry.eventDate}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase w-fit ${
                          entry.isPublished
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-brand-surfaceElevated text-brand-subtle border border-brand-border'
                        }`}
                      >
                        {entry.isPublished ? 'Published' : 'Draft'}
                      </span>
                      {entry.isFeatured && (
                        <span className="text-[10px] text-brand-gold font-bold">★ Featured</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(entry)}
                        className="p-1.5 rounded-lg hover:bg-brand-surfaceElevated text-brand-subtle hover:text-brand-cream"
                        title="Edit entry"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(entry)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"
                        title="Delete entry"
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

      {/* Modal for Add / Edit Hall of Fame Entry */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-brand-dark/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/15 border border-brand-gold/40 flex items-center justify-center text-brand-gold">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-brand-cream">
                    {editingId ? 'Edit Hall of Fame Entry' : 'Induct New Champion'}
                  </h3>
                  <p className="text-xs text-brand-subtle">Permanent public record of competitive excellence.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-brand-subtle hover:text-brand-cream p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase text-brand-subtle block mb-1">
                    Champion Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aman Verma"
                    value={formData.playerName || ''}
                    onChange={(e) => setFormData({ ...formData, playerName: e.target.value })}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-brand-subtle block mb-1">
                    Team Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ayodhya Dynamos"
                    value={formData.teamName || ''}
                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream focus:outline-none focus:border-brand-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase text-brand-subtle block mb-1">
                    Award / Placement
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Champion / 1st Place"
                    value={formData.award || ''}
                    onChange={(e) => setFormData({ ...formData, award: e.target.value })}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-brand-subtle block mb-1">
                    Tournament Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ayodhya FC 25 Championship"
                    value={formData.tournamentTitle || ''}
                    onChange={(e) => setFormData({ ...formData, tournamentTitle: e.target.value })}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream focus:outline-none focus:border-brand-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase text-brand-subtle block mb-1">
                    Game Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EA Sports FC 25"
                    value={formData.gameTitle || ''}
                    onChange={(e) => setFormData({ ...formData, gameTitle: e.target.value })}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-brand-subtle block mb-1">
                    Season
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Summer 2026 Season"
                    value={formData.season || ''}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-brand-subtle block mb-1">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={formData.eventDate || ''}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-cream font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-brand-subtle block mb-1">
                  Victory Achievement & Story
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Undefeated 6-0 run through double elimination bracket, concluding with a 4-2 thriller in the grand final..."
                  value={formData.scoreDescription || ''}
                  onChange={(e) => setFormData({ ...formData, scoreDescription: e.target.value })}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream focus:outline-none focus:border-brand-gold"
                />
              </div>

              {/* Photo Upload & Presets */}
              <div>
                <label className="text-xs font-mono uppercase text-brand-subtle block mb-1">
                  Champion Portrait Photo URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.photoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    className="flex-1 bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-cream font-mono"
                  />
                  <label className="px-4 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-gold text-brand-cream text-xs font-mono cursor-pointer flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5 text-brand-gold" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-mono cursor-pointer bg-brand-surfaceElevated p-3 rounded-xl border border-brand-border">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured || false}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded text-brand-gold"
                  />
                  <span className="text-brand-cream">Feature on Hall of Fame Top Hero</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-mono cursor-pointer bg-brand-surfaceElevated p-3 rounded-xl border border-brand-border">
                  <input
                    type="checkbox"
                    checked={formData.isPublished !== false}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="rounded text-emerald-500"
                  />
                  <span className="text-brand-cream">Published to Public Website</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-brand-border/60">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-brand-border text-brand-subtle text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-gold/90 text-brand-dark text-xs font-bold uppercase tracking-wider transition-all"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Champion' : 'Induct Champion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
