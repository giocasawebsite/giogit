import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Plus,
  Edit2,
  Trash2,
  Search,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Tv,
  Save,
  X,
  Upload,
  RefreshCw,
  AlertCircle,
  Star,
  ExternalLink,
} from 'lucide-react';
import { GameItem, GamingResource, GameAvailabilityStatus } from '../../types';
import { compressImage, imageUploadService } from '../../services/imageUploadService';

interface AdminGamesManagerProps {
  passcode: string;
}

export const AdminGamesManager: React.FC<AdminGamesManagerProps> = ({ passcode }) => {
  const [games, setGames] = useState<GameItem[]>([]);
  const [resources, setResources] = useState<GamingResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal / Form state for Add or Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingGame, setEditingGame] = useState<GameItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState<{
    id?: string;
    title: string;
    category: string;
    genre: string;
    description: string;
    image: string;
    heroImage?: string;
    imagePublicId?: string;
    availabilityStatus: GameAvailabilityStatus;
    isFeatured: boolean;
    resourceId: string;
    resourceName: string;
    playOptionsText: string;
    badge: string;
    minPlayers: number;
    maxPlayers: number;
    order: number;
  }>({
    title: '',
    category: 'ps5',
    genre: 'Action',
    description: '',
    image: '',
    heroImage: '',
    availabilityStatus: 'available',
    isFeatured: false,
    resourceId: '',
    resourceName: '',
    playOptionsText: '4K 120Hz, DualSense Haptics, Local Co-op',
    badge: '',
    minPlayers: 1,
    maxPlayers: 2,
    order: 50,
  });

  // Fetch games & stations
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [gamesRes, resRes] = await Promise.all([
        fetch('/api/admin/games', {
          headers: { 'x-admin-passcode': passcode },
        }),
        fetch('/api/admin/resources', {
          headers: { 'x-admin-passcode': passcode },
        }),
      ]);

      if (gamesRes.ok) {
        const json = await gamesRes.json();
        if (json.success && Array.isArray(json.data)) {
          setGames(json.data);
        }
      }

      if (resRes.ok) {
        const json = await resRes.json();
        if (json.success && Array.isArray(json.data)) {
          setResources(json.data);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load games from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [passcode]);

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingGame(null);
    setFormData({
      title: '',
      category: 'ps5',
      genre: 'Action',
      description: '',
      image: '/assets/games/gta-5_cover.jpg',
      heroImage: '/assets/games/gta-5_hero.jpg',
      availabilityStatus: 'available',
      isFeatured: false,
      resourceId: resources[0]?.id || 'ps5-station-1',
      resourceName: resources[0]?.name || 'PS5 Pro Station 1',
      playOptionsText: '4K 120Hz, DualSense Haptics, Local Multiplayer',
      badge: '',
      minPlayers: 1,
      maxPlayers: 2,
      order: games.length + 1,
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (game: GameItem) => {
    setEditingGame(game);
    setFormData({
      id: game.id,
      title: game.title,
      category: game.category || 'ps5',
      genre: game.genre || 'Action',
      description: game.description || '',
      image: game.image || '',
      heroImage: game.heroImage || '',
      imagePublicId: game.imagePublicId,
      availabilityStatus: game.availabilityStatus || (game.isAvailable ? 'available' : 'coming_soon'),
      isFeatured: Boolean(game.isFeatured),
      resourceId: game.resourceId || '',
      resourceName: game.resourceName || '',
      playOptionsText: Array.isArray(game.playOptions) ? game.playOptions.join(', ') : '',
      badge: game.badge || '',
      minPlayers: game.minPlayers || 1,
      maxPlayers: game.maxPlayers || 2,
      order: game.order || 50,
    });
    setIsModalOpen(true);
  };

  // Handle station selection to sync resourceName
  const handleResourceChange = (selectedId: string) => {
    const matched = resources.find((r) => r.id === selectedId);
    setFormData((prev) => ({
      ...prev,
      resourceId: selectedId,
      resourceName: matched ? matched.name : '',
    }));
  };

  // Handle image upload to Cloudinary
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Image file size must be less than 10MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const base64 = await compressImage(file, 1600, 1200, 0.85);
      const res = await imageUploadService.uploadImage({
        passcode,
        imageBase64: base64,
        filename: file.name,
        folder: 'tournaments',
        previousPublicId: formData.imagePublicId,
      });

      setFormData((prev) => ({
        ...prev,
        image: res.secureUrl || res.url,
        imagePublicId: res.publicId,
      }));
      showToast('Image uploaded and optimized successfully.');
    } catch (err: any) {
      alert(err.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Submit Form (Save or Create)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Game title is required.');
      return;
    }

    const playOptions = formData.playOptionsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title: formData.title.trim(),
      category: formData.category,
      genre: formData.genre.trim(),
      description: formData.description.trim(),
      image: formData.image.trim(),
      heroImage: formData.heroImage?.trim() || '',
      imagePublicId: formData.imagePublicId,
      availabilityStatus: formData.availabilityStatus,
      isAvailable: formData.availabilityStatus === 'available',
      isFeatured: formData.isFeatured,
      resourceId: formData.resourceId,
      resourceName: formData.resourceName,
      playOptions,
      badge: formData.badge.trim(),
      minPlayers: Number(formData.minPlayers) || 1,
      maxPlayers: Number(formData.maxPlayers) || 2,
      order: Number(formData.order) || 50,
    };

    try {
      if (editingGame) {
        // PUT /api/admin/games/:id
        const res = await fetch(`/api/admin/games/${editingGame.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-passcode': passcode,
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update game.');

        setGames((prev) => prev.map((g) => (g.id === editingGame.id ? json.data : g)));
        showToast(`Game "${payload.title}" updated successfully.`);
      } else {
        // POST /api/admin/games
        const res = await fetch('/api/admin/games', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-passcode': passcode,
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to add game.');

        setGames((prev) => [...prev, json.data]);
        showToast(`Game "${payload.title}" created successfully.`);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Operation failed.');
    }
  };

  // Delete Game
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" from the Gaming Wall?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-passcode': passcode },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete game.');

      setGames((prev) => prev.filter((g) => g.id !== id));
      showToast(`Game "${title}" deleted successfully.`);
    } catch (err: any) {
      alert(err.message || 'Failed to delete game.');
    }
  };

  const filteredGames = games.filter(
    (g) =>
      !search ||
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      (g.genre && g.genre.toLowerCase().includes(search.toLowerCase())) ||
      (g.badge && g.badge.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-brand-surface border border-brand-border">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-brand-pink font-semibold block">
            Gaming Wall Manager
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Flagship Games Catalogue ({games.length} Titles)
          </h2>
          <p className="text-xs text-brand-subtle font-light mt-1">
            Configure titles, artwork, availability, genres, and physical station assignments in MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-white transition-colors"
            title="Refresh catalogue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="py-2.5 px-4 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-luxury-pink flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Game</span>
          </button>
        </div>
      </div>

      {/* Notifications / Toast */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtle" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter games by name, genre, badge..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-brand-surface border border-brand-border text-xs text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-pink transition-colors"
        />
      </div>

      {/* Games Table / Cards Grid */}
      <div className="rounded-3xl border border-brand-border bg-brand-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-charcoalDeep/90 text-brand-subtle uppercase tracking-wider border-b border-brand-border font-mono text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Game</th>
                <th className="py-3.5 px-4">Genre</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Station Assignment</th>
                <th className="py-3.5 px-4">Featured</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40">
              {filteredGames.map((game) => (
                <tr key={game.id} className="hover:bg-brand-surfaceElevated/50 transition-colors">
                  {/* Artwork & Title */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-14 rounded-lg overflow-hidden bg-brand-darker shrink-0 border border-brand-border/60">
                        <img
                          src={game.image}
                          alt={game.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white text-sm flex items-center gap-1.5">
                          <span>{game.title}</span>
                          {game.badge && (
                            <span className="px-1.5 py-0.5 rounded bg-brand-orange/20 text-brand-orange text-[10px] font-mono">
                              {game.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-brand-subtle font-mono truncate max-w-xs">
                          {game.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Genre */}
                  <td className="py-3 px-4 font-mono text-brand-cream/80">
                    {game.genre || 'Action'}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    {game.availabilityStatus === 'coming_soon' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase">
                        Coming Soon
                      </span>
                    ) : game.availabilityStatus === 'unavailable' ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] uppercase">
                        Unavailable
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase">
                        Available
                      </span>
                    )}
                  </td>

                  {/* Station */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-mono text-brand-blue">
                      <Tv className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[180px]">
                        {game.resourceName || game.resourceId || 'Unassigned'}
                      </span>
                    </div>
                  </td>

                  {/* Featured */}
                  <td className="py-3 px-4">
                    {game.isFeatured ? (
                      <span className="inline-flex items-center gap-1 text-brand-pink font-semibold">
                        <Star className="w-3.5 h-3.5 fill-brand-pink" />
                        <span>Featured</span>
                      </span>
                    ) : (
                      <span className="text-brand-muted">Standard</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(game)}
                        className="p-1.5 rounded-lg bg-brand-surfaceElevated hover:bg-brand-blue/20 text-brand-subtle hover:text-brand-blue transition-colors"
                        title="Edit game details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(game.id, game.title)}
                        className="p-1.5 rounded-lg bg-brand-surfaceElevated hover:bg-rose-500/20 text-brand-subtle hover:text-rose-400 transition-colors"
                        title="Delete game"
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
      </div>

      {/* ========================================================================= */}
      {/* EDIT / CREATE MODAL                                                       */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-brand-surface rounded-3xl border border-brand-border p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-brand-pink font-semibold block">
                  {editingGame ? 'Update Gaming Wall Entry' : 'Add New Game'}
                </span>
                <h3 className="font-serif text-2xl font-bold text-white">
                  {editingGame ? `Edit "${editingGame.title}"` : 'New Game Profile'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-brand-surfaceElevated hover:bg-brand-border text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Title & Genre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-subtle uppercase tracking-wider">
                    Game Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. GTA 6, Tekken 8, FIFA 2K26"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-darker border border-brand-border text-xs text-white focus:outline-none focus:border-brand-pink"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-subtle uppercase tracking-wider">
                    Genre
                  </label>
                  <select
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-darker border border-brand-border text-xs text-white focus:outline-none focus:border-brand-pink"
                  >
                    <option value="Action">Action</option>
                    <option value="Racing">Racing</option>
                    <option value="Fighting">Fighting</option>
                    <option value="Sports">Sports</option>
                    <option value="Adventure">Adventure</option>
                    <option value="Sandbox">Sandbox</option>
                    <option value="Shooter">Shooter</option>
                    <option value="Strategy">Strategy</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Status & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-subtle uppercase tracking-wider">
                    Availability Status
                  </label>
                  <select
                    value={formData.availabilityStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        availabilityStatus: e.target.value as GameAvailabilityStatus,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-darker border border-brand-border text-xs text-white focus:outline-none focus:border-brand-pink font-semibold"
                  >
                    <option value="available">Available (Playable Now)</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="unavailable">Unavailable / Hidden</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-subtle uppercase tracking-wider">
                    Hardware Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-darker border border-brand-border text-xs text-white focus:outline-none focus:border-brand-pink"
                  >
                    <option value="ps5">PS5 Arena</option>
                    <option value="racing">Racing Sim</option>
                    <option value="pool">Pool / Billiards</option>
                    <option value="foosball">Foosball</option>
                    <option value="boardgames">Board Games</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-subtle uppercase tracking-wider">
                    Badge / Tag
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="e.g. Esports, Coming Soon, Classic"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-darker border border-brand-border text-xs text-white focus:outline-none focus:border-brand-pink"
                  />
                </div>
              </div>

              {/* Row 3: Equipment Mapping */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-subtle uppercase tracking-wider flex items-center justify-between">
                  <span>Assigned Station / Equipment</span>
                  <span className="text-[10px] text-brand-muted font-normal">
                    Connects directly to booking flow
                  </span>
                </label>
                <select
                  value={formData.resourceId}
                  onChange={(e) => handleResourceChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-darker border border-brand-border text-xs text-white focus:outline-none focus:border-brand-pink font-mono"
                >
                  <option value="">-- None / Unassigned --</option>
                  {resources.map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.name} ({res.floorLocation || res.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 4: Artwork Image & Cloudinary Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-brand-subtle uppercase tracking-wider">
                    Game Cover Art (Portrait)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="/assets/games/... or https://"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-brand-darker border border-brand-border text-xs text-white focus:outline-none focus:border-brand-pink font-mono"
                    />
                    <label className="py-2.5 px-3.5 rounded-xl bg-brand-surfaceElevated hover:bg-brand-charcoal border border-brand-border text-xs font-semibold text-white cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-brand-pink" />
                      <span>{uploadingImage ? '...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-brand-subtle uppercase tracking-wider">
                    Hero / Backdrop Art (Landscape)
                  </label>
                  <input
                    type="text"
                    value={formData.heroImage || ''}
                    onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                    placeholder="/assets/games/... or https://"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-darker border border-brand-border text-xs text-white focus:outline-none focus:border-brand-pink font-mono"
                  />
                </div>
              </div>

              {/* Row 5: Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-subtle uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Cinematic description highlighting gameplay, graphics, local multiplayer, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-darker border border-brand-border text-xs text-white focus:outline-none focus:border-brand-pink leading-relaxed"
                />
              </div>

              {/* Row 6: Play Options Specs */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-subtle uppercase tracking-wider flex items-center justify-between">
                  <span>Available Play Options (Comma separated)</span>
                  <span className="text-[10px] text-brand-muted font-normal">
                    e.g. 4K 120Hz, DualSense Haptics, 1-4 Players
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.playOptionsText}
                  onChange={(e) => setFormData({ ...formData, playOptionsText: e.target.value })}
                  placeholder="Single Player, 4K 60FPS, DualSense Vibration, Local Co-op"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-darker border border-brand-border text-xs text-white focus:outline-none focus:border-brand-pink font-mono"
                />
              </div>

              {/* Row 7: Featured & Order */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-brand-subtle hover:text-white">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-pink focus:ring-0 bg-brand-darker border-brand-border"
                  />
                  <span>Mark as Featured Spotlight Game</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-brand-subtle font-mono">Display Order:</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-16 px-2 py-1 rounded bg-brand-darker border border-brand-border text-xs text-white text-center font-mono"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-brand-border/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-brand-surfaceElevated text-xs font-semibold uppercase tracking-wider text-brand-subtle hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-luxury-pink flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Game</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
