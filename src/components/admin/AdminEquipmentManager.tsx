import React, { useState, useEffect, useMemo } from 'react';
import { 
  Gamepad2, 
  Plus, 
  Trash2, 
  Edit3, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Users, 
  Sparkles, 
  Search, 
  X, 
  Save, 
  Layers, 
  Tv, 
  Trophy, 
  RefreshCw,
  Sliders,
  DollarSign,
  Tag,
  ShieldCheck,
  Flame,
  Upload
} from 'lucide-react';
import { GamingResource, GameItem, EquipmentSummary } from '../../types';
import { equipmentApi } from '../../services/equipmentApi';
import { imageUploadService, compressImage } from '../../services/imageUploadService';

interface AdminEquipmentManagerProps {
  passcode: string;
  onRefreshData?: () => void;
}

export const AdminEquipmentManager: React.FC<AdminEquipmentManagerProps> = ({ passcode, onRefreshData }) => {
  const [activeSubTab, setActiveSubTab] = useState<'machines' | 'games'>('machines');
  
  // Data states
  const [summary, setSummary] = useState<EquipmentSummary[]>([]);
  const [resources, setResources] = useState<GamingResource[]>([]);
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Search
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showMachineModal, setShowMachineModal] = useState<boolean>(false);
  const [editingMachine, setEditingMachine] = useState<GamingResource | null>(null);
  const [machineForm, setManualMachineForm] = useState({
    name: '',
    category: 'ps5',
    ratePerHour: 150,
    minPlayers: 1,
    maxPlayers: 4,
    machineIdentifier: '',
    specs: '',
    image: '/assets/real/ps5_setup.png',
  });

  const [showGameModal, setShowGameModal] = useState<boolean>(false);
  const [editingGame, setEditingGame] = useState<GameItem | null>(null);
  const [gameForm, setGameForm] = useState({
    title: '',
    category: 'ps5',
    genre: 'Sports',
    description: '',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 2,
    isAvailable: true,
  });

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'equipment' | 'game';
    id: string;
    name: string;
    category?: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [maintenanceTarget, setMaintenanceTarget] = useState<GamingResource | null>(null);
  const [maintenanceReasonInput, setMaintenanceReasonInput] = useState<string>('');

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [machineUploading, setMachineUploading] = useState<boolean>(false);
  const [gameUploading, setGameUploading] = useState<boolean>(false);

  const handleMachineImageUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file size must be less than 10MB.');
      return;
    }
    setMachineUploading(true);
    try {
      const base64 = await compressImage(file, 1600, 1200, 0.85);
      const res = await imageUploadService.uploadImage({
        passcode,
        imageBase64: base64,
        filename: file.name,
        folder: 'equipment',
      });
      setManualMachineForm((prev) => ({ ...prev, image: res.secureUrl || res.url }));
    } catch (err: any) {
      alert(err.message || 'Image upload failed');
    } finally {
      setMachineUploading(false);
    }
  };

  const handleGameImageUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file size must be less than 10MB.');
      return;
    }
    setGameUploading(true);
    try {
      const base64 = await compressImage(file, 1200, 1600, 0.85);
      const res = await imageUploadService.uploadImage({
        passcode,
        imageBase64: base64,
        filename: file.name,
        folder: 'equipment',
      });
      setGameForm((prev) => ({ ...prev, image: res.secureUrl || res.url }));
    } catch (err: any) {
      alert(err.message || 'Game cover upload failed');
    } finally {
      setGameUploading(false);
    }
  };

  // Load data
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [eqData, gamesData] = await Promise.all([
        equipmentApi.getEquipmentSummary(passcode),
        equipmentApi.getAdminGames(passcode),
      ]);
      setSummary(eqData.summary || []);
      setResources(eqData.resources || []);
      setGames(gamesData || []);
    } catch (err: any) {
      console.error('Failed to load equipment data:', err);
      setError(err?.message || 'Failed to load equipment and games.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (passcode) {
      loadData();
    }
  }, [passcode]);

  // Toast auto-clear
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Aggregated Overall Metrics
  const totalMachinesCount = resources.filter(r => r.active).length;
  const availableMachinesCount = summary.reduce((acc, curr) => acc + curr.availableMachines, 0);
  const bookedMachinesCount = summary.reduce((acc, curr) => acc + curr.bookedMachines, 0);
  const maintenanceMachinesCount = resources.filter(r => r.active && r.isMaintenance).length;

  // Filtered Machines
  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      if (!r.active) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchId = (r.machineIdentifier || r.id).toLowerCase().includes(q);
        const matchCategory = r.category.toLowerCase().includes(q);
        return matchName || matchId || matchCategory;
      }
      return true;
    });
  }, [resources, categoryFilter, searchQuery]);

  // Filtered Games
  const filteredGames = useMemo(() => {
    return games.filter(g => {
      if (categoryFilter !== 'all' && g.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = g.title.toLowerCase().includes(q);
        const matchGenre = (g.genre || '').toLowerCase().includes(q);
        const matchDesc = g.description.toLowerCase().includes(q);
        return matchTitle || matchGenre || matchDesc;
      }
      return true;
    });
  }, [games, categoryFilter, searchQuery]);

  // Unique categories across resources and games
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    resources.forEach(r => { if (r.active) set.add(r.category); });
    games.forEach(g => set.add(g.category));
    return Array.from(set);
  }, [resources, games]);

  // ==========================================
  // HANDLERS: QUANTITY ADJUSTMENT
  // ==========================================
  const handleAdjustQuantity = async (category: string, delta: number) => {
    setActionLoadingId(`qty-${category}-${delta}`);
    setError(null);
    try {
      const res = await equipmentApi.adjustQuantity(passcode, category, delta);
      if (!res.success) {
        setError(res.error || 'Failed to adjust quantity.');
        return;
      }
      setSuccessMsg(delta > 0 ? `Added 1 machine to ${category.toUpperCase()}` : `Removed 1 machine from ${category.toUpperCase()}`);
      await loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setError(err?.message || 'Failed to adjust quantity.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ==========================================
  // HANDLERS: MAINTENANCE TOGGLE
  // ==========================================
  const handleOpenMaintenance = (resource: GamingResource) => {
    setMaintenanceTarget(resource);
    setMaintenanceReasonInput(resource.maintenanceReason || '');
  };

  const handleConfirmMaintenance = async () => {
    if (!maintenanceTarget) return;
    const nextState = !maintenanceTarget.isMaintenance;
    setActionLoadingId(maintenanceTarget.id);
    setError(null);

    try {
      await equipmentApi.toggleMaintenance(
        passcode,
        maintenanceTarget.id,
        nextState,
        nextState ? (maintenanceReasonInput.trim() || 'Scheduled servicing') : ''
      );
      setSuccessMsg(`Station "${maintenanceTarget.name}" is now ${nextState ? 'UNDER MAINTENANCE' : 'ACTIVE & BOOKABLE'}.`);
      setMaintenanceTarget(null);
      await loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update maintenance status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ==========================================
  // HANDLERS: ADD/EDIT MACHINE
  // ==========================================
  const handleOpenAddMachine = (prefillCategory?: string) => {
    setEditingMachine(null);
    const cat = prefillCategory || (categoryFilter !== 'all' ? categoryFilter : 'ps5');
    const existing = resources.filter(r => r.category === cat);
    const nextNum = existing.length + 1;
    setManualMachineForm({
      name: `${cat.toUpperCase()} Station ${nextNum}`,
      category: cat,
      ratePerHour: existing[0]?.ratePerHour || 150,
      minPlayers: existing[0]?.playersCapacity?.min || 1,
      maxPlayers: existing[0]?.playersCapacity?.max || 4,
      machineIdentifier: `${cat.toUpperCase()}-${String(nextNum).padStart(2, '0')}`,
      specs: existing[0]?.specs?.join(', ') || 'High Performance Setup',
      image: existing[0]?.image || '/assets/real/ps5_setup.png',
    });
    setShowMachineModal(true);
  };

  const handleOpenEditMachine = (resource: GamingResource) => {
    setEditingMachine(resource);
    setManualMachineForm({
      name: resource.name,
      category: resource.category,
      ratePerHour: resource.ratePerHour,
      minPlayers: resource.playersCapacity.min,
      maxPlayers: resource.playersCapacity.max,
      machineIdentifier: resource.machineIdentifier || resource.id.toUpperCase(),
      specs: (resource.specs || []).join(', '),
      image: resource.image || '/assets/real/ps5_setup.png',
    });
    setShowMachineModal(true);
  };

  const handleSaveMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActionLoadingId('saving-machine');

    try {
      const payload: Partial<GamingResource> = {
        name: machineForm.name.trim(),
        category: machineForm.category.trim().toLowerCase() as any,
        ratePerHour: Number(machineForm.ratePerHour) || 150,
        playersCapacity: {
          min: Math.max(1, Number(machineForm.minPlayers) || 1),
          max: Math.max(Number(machineForm.minPlayers) || 1, Number(machineForm.maxPlayers) || 4),
        },
        machineIdentifier: machineForm.machineIdentifier.trim() || undefined,
        specs: machineForm.specs.split(',').map(s => s.trim()).filter(Boolean),
        image: machineForm.image.trim() || '/assets/real/ps5_setup.png',
      };

      if (editingMachine) {
        await equipmentApi.updateEquipment(passcode, editingMachine.id, payload);
        setSuccessMsg(`Station "${payload.name}" updated successfully.`);
      } else {
        await equipmentApi.createEquipment(passcode, payload);
        setSuccessMsg(`New station "${payload.name}" created and added to live booking.`);
      }

      setShowMachineModal(false);
      await loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save machine.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ==========================================
  // HANDLERS: ADD/EDIT GAME
  // ==========================================
  const handleOpenAddGame = () => {
    setEditingGame(null);
    setGameForm({
      title: '',
      category: categoryFilter !== 'all' ? categoryFilter : 'ps5',
      genre: 'Sports',
      description: '',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
      minPlayers: 1,
      maxPlayers: 2,
      isAvailable: true,
    });
    setShowGameModal(true);
  };

  const handleOpenEditGame = (game: GameItem) => {
    setEditingGame(game);
    setGameForm({
      title: game.title,
      category: game.category,
      genre: game.genre || 'Action',
      description: game.description,
      image: game.image,
      minPlayers: game.minPlayers || 1,
      maxPlayers: game.maxPlayers || 2,
      isAvailable: game.isAvailable,
    });
    setShowGameModal(true);
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameForm.title.trim()) {
      setError('Game title is required.');
      return;
    }

    setError(null);
    setActionLoadingId('saving-game');

    try {
      const payload: Partial<GameItem> = {
        title: gameForm.title.trim(),
        category: gameForm.category.trim().toLowerCase(),
        genre: gameForm.genre.trim(),
        description: gameForm.description.trim(),
        image: gameForm.image.trim(),
        minPlayers: Number(gameForm.minPlayers) || 1,
        maxPlayers: Number(gameForm.maxPlayers) || 2,
        isAvailable: gameForm.isAvailable,
      };

      if (editingGame) {
        await equipmentApi.updateGame(passcode, editingGame.id, payload);
        setSuccessMsg(`Game "${payload.title}" updated.`);
      } else {
        await equipmentApi.createGame(passcode, payload);
        setSuccessMsg(`Game "${payload.title}" added to library.`);
      }

      setShowGameModal(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save game.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleGameAvailability = async (game: GameItem) => {
    setActionLoadingId(game.id);
    try {
      await equipmentApi.updateGame(passcode, game.id, { isAvailable: !game.isAvailable });
      setSuccessMsg(`Game "${game.title}" marked as ${!game.isAvailable ? 'AVAILABLE' : 'DISABLED'}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update game availability.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ==========================================
  // HANDLERS: DELETE CONFIRMATION
  // ==========================================
  const handleOpenDelete = (type: 'equipment' | 'game', id: string, name: string, category?: string) => {
    setDeleteConfirmTarget({ type, id, name, category });
    setDeleteError(null);
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmTarget) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      if (deleteConfirmTarget.type === 'equipment') {
        const res = await equipmentApi.deleteEquipment(passcode, deleteConfirmTarget.id);
        if (!res.success) {
          setDeleteError(res.error || 'Failed to delete equipment.');
          setIsDeleting(false);
          return;
        }
        setSuccessMsg(`Equipment "${deleteConfirmTarget.name}" deleted successfully.`);
      } else {
        await equipmentApi.deleteGame(passcode, deleteConfirmTarget.id);
        setSuccessMsg(`Game "${deleteConfirmTarget.name}" removed from library.`);
      }

      setDeleteConfirmTarget(null);
      await loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setDeleteError(err?.message || 'Deletion failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications / Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-brand-pink/15 border border-brand-pink/50 text-white flex items-start gap-3 animate-fade-in shadow-md">
          <AlertTriangle className="w-5 h-5 text-brand-pink shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{error}</div>
          <button onClick={() => setError(null)} className="text-brand-subtle hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-surfaceElevated via-brand-surface to-[#0D0D12] border border-brand-border/70 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-brand-blue font-bold px-2.5 py-0.5 rounded-full bg-brand-blue/10 border border-brand-blue/30">
                Arena Infrastructure
              </span>
              <span className="text-xs text-brand-subtle">• MongoDB Live Sync</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              Gaming Equipment & Games Manager
            </h2>
            <p className="text-xs sm:text-sm text-brand-subtle font-light mt-1">
              Manage physical machines, machine counts, maintenance flags, and game titles with live booking safety.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-white hover:border-brand-blue/40 transition-all flex items-center gap-1.5 text-xs font-mono"
              title="Refresh equipment and games"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-blue' : ''}`} />
              <span className="hidden sm:inline">Sync Live</span>
            </button>

            {activeSubTab === 'machines' ? (
              <button
                onClick={() => handleOpenAddMachine()}
                className="py-2.5 px-4 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Equipment</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddGame}
                className="py-2.5 px-4 rounded-xl bg-brand-pink hover:bg-brand-pinkHover text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-luxury-pink active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Game</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Live Station Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-brand-border/40">
          <div className="p-3.5 rounded-2xl bg-brand-surface/60 border border-brand-border/50">
            <div className="text-[10px] uppercase font-mono tracking-wider text-brand-subtle">Total Machines</div>
            <div className="text-2xl font-bold font-mono text-white mt-0.5">{totalMachinesCount}</div>
            <div className="text-[10px] text-brand-subtle mt-0.5">Across all categories</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-400">Available Now</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">{availableMachinesCount}</div>
            <div className="text-[10px] text-emerald-300/80 mt-0.5">Ready for booking</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-brand-blue/10 border border-brand-blue/30">
            <div className="text-[10px] uppercase font-mono tracking-wider text-brand-blue">Active Sessions</div>
            <div className="text-2xl font-bold font-mono text-brand-blue mt-0.5">{bookedMachinesCount}</div>
            <div className="text-[10px] text-brand-blue/80 mt-0.5">Currently in play</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="text-[10px] uppercase font-mono tracking-wider text-amber-400">Maintenance</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">{maintenanceMachinesCount}</div>
            <div className="text-[10px] text-amber-300/80 mt-0.5">Locked from booking</div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs & Filtering Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-brand-surface/80 border border-brand-border/60 self-start">
          <button
            onClick={() => setActiveSubTab('machines')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
              activeSubTab === 'machines'
                ? 'bg-brand-blue text-white shadow-md'
                : 'text-brand-subtle hover:text-white'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Equipment & Machines ({totalMachinesCount})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('games')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
              activeSubTab === 'games'
                ? 'bg-brand-pink text-white shadow-luxury-pink'
                : 'text-brand-subtle hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Games Library ({games.length})</span>
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-brand-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeSubTab === 'machines' ? 'Search station or ID (e.g. PS5-01)...' : 'Search games (e.g. Tekken)...'}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-brand-surface border border-brand-border text-white text-xs placeholder:text-brand-subtle/60 focus:outline-none focus:border-brand-blue/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-subtle hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-2 px-3 rounded-xl bg-brand-surface border border-brand-border text-xs text-white focus:outline-none focus:border-brand-blue/60 uppercase font-mono"
          >
            <option value="all">All Arenas</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: MACHINES & STATIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'machines' && (
        <div className="space-y-6">
          {/* Category Quantity Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary
              .filter(s => categoryFilter === 'all' || s.category === categoryFilter)
              .map(catSummary => {
                const isOperating = catSummary.availableMachines > 0;
                return (
                  <div
                    key={catSummary.category}
                    className="p-5 rounded-2xl bg-brand-surface border border-brand-border/70 hover:border-brand-blue/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-brand-blue px-2 py-0.5 rounded-full bg-brand-blue/10 border border-brand-blue/30">
                            {catSummary.category}
                          </span>
                          <h3 className="text-base font-bold text-white mt-1 group-hover:text-brand-blue transition-colors">
                            {catSummary.name}
                          </h3>
                        </div>
                        <span className="text-xs font-mono font-bold text-brand-gold bg-brand-surfaceElevated px-2 py-1 rounded-lg border border-brand-border">
                          ₹{catSummary.ratePerHour}/hr
                        </span>
                      </div>

                      {/* Quantity Breakdown Grid */}
                      <div className="grid grid-cols-4 gap-1.5 mt-4 text-center">
                        <div className="p-2 rounded-xl bg-brand-surfaceElevated border border-brand-border/40">
                          <span className="text-[9px] text-brand-subtle uppercase block font-mono">Total</span>
                          <span className="text-base font-bold font-mono text-white">{catSummary.totalMachines}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                          <span className="text-[9px] text-emerald-400 uppercase block font-mono">Ready</span>
                          <span className="text-base font-bold font-mono text-emerald-400">{catSummary.availableMachines}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-brand-blue/10 border border-brand-blue/30">
                          <span className="text-[9px] text-brand-blue uppercase block font-mono">Booked</span>
                          <span className="text-base font-bold font-mono text-brand-blue">{catSummary.bookedMachines}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                          <span className="text-[9px] text-amber-400 uppercase block font-mono">Maint.</span>
                          <span className="text-base font-bold font-mono text-amber-400">{catSummary.maintenanceMachines}</span>
                        </div>
                      </div>
                    </div>

                    {/* Machine Quantity Control Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-brand-border/50">
                      <div className="text-[11px] text-brand-subtle flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{catSummary.minPlayers}-{catSummary.maxPlayers} players</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Decrease quantity button */}
                        <button
                          onClick={() => handleAdjustQuantity(catSummary.category, -1)}
                          disabled={actionLoadingId === `qty-${catSummary.category}--1` || catSummary.totalMachines <= 1}
                          className="w-8 h-8 rounded-lg bg-brand-surfaceElevated border border-brand-border/70 hover:border-brand-pink/60 text-brand-subtle hover:text-brand-pink flex items-center justify-center font-bold text-sm disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all"
                          title="Decrease available machines (safe check)"
                        >
                          -
                        </button>

                        <span className="font-mono text-xs font-bold text-white px-2">
                          {catSummary.totalMachines} Units
                        </span>

                        {/* Increase quantity button */}
                        <button
                          onClick={() => handleAdjustQuantity(catSummary.category, 1)}
                          disabled={actionLoadingId === `qty-${catSummary.category}-1`}
                          className="w-8 h-8 rounded-lg bg-brand-blue/20 border border-brand-blue/50 hover:bg-brand-blue text-brand-blue hover:text-white flex items-center justify-center font-bold text-sm active:scale-95 transition-all"
                          title="Add new machine unit"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Individual Machines Detailed List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm uppercase font-mono tracking-wider text-brand-subtle font-semibold">
                Individual Station Units ({filteredResources.length})
              </h3>
              <span className="text-xs text-brand-subtle/80">
                Click wrench to toggle maintenance • Click edit to rename or adjust price
              </span>
            </div>

            <div className="bg-brand-surface rounded-2xl border border-brand-border/80 overflow-hidden divide-y divide-brand-border/40 shadow-xl">
              {filteredResources.length === 0 ? (
                <div className="p-8 text-center text-brand-subtle text-xs">
                  No machine stations match the current filter or search query.
                </div>
              ) : (
                filteredResources.map((res) => {
                  const isMaintenance = res.isMaintenance;
                  const isBusy = actionLoadingId === res.id;

                  return (
                    <div
                      key={res.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-brand-surfaceElevated/50 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Machine Identifier Badge */}
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 border ${
                          isMaintenance
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                            : 'bg-brand-surfaceElevated border-brand-blue/40 text-brand-blue'
                        }`}>
                          {res.machineIdentifier || res.id.slice(0, 6).toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-white">{res.name}</span>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-brand-surfaceElevated border border-brand-border text-brand-subtle">
                              {res.category}
                            </span>
                            <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                              (res.floorLocation === '1st Floor' || res.category === 'pool')
                                ? 'bg-brand-orange/15 border-brand-orange/40 text-brand-orange font-bold'
                                : 'bg-brand-blue/15 border-brand-blue/40 text-brand-blue font-bold'
                            }`}>
                              {res.floorLocation || (res.category === 'pool' ? '1st Floor' : 'Basement')}
                            </span>
                            {isMaintenance && (
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                                Under Maintenance
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-subtle mt-0.5">
                            <span>₹{res.ratePerHour}/hr</span>
                            <span>•</span>
                            <span>{res.playersCapacity.min}-{res.playersCapacity.max} Players</span>
                            <span>•</span>
                            <span>ID: <code className="text-white/80 font-mono text-[11px]">{res.id}</code></span>
                            {res.maintenanceReason && isMaintenance && (
                              <>
                                <span>•</span>
                                <span className="text-amber-300 font-italic-accent">Reason: {res.maintenanceReason}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons for station */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* Maintenance Toggle */}
                        <button
                          onClick={() => handleOpenMaintenance(res)}
                          disabled={isBusy}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isMaintenance
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/25'
                              : 'bg-amber-500/15 border-amber-500/50 text-amber-400 hover:bg-amber-500/25'
                          }`}
                          title={isMaintenance ? 'Clear maintenance & reactivate station' : 'Mark machine under maintenance'}
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>{isMaintenance ? 'Reactivate' : 'Maintenance'}</span>
                        </button>

                        {/* Edit Machine */}
                        <button
                          onClick={() => handleOpenEditMachine(res)}
                          className="p-2 rounded-xl bg-brand-surfaceElevated border border-brand-border hover:border-brand-blue/60 text-brand-subtle hover:text-white transition-all"
                          title="Edit station details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Machine */}
                        <button
                          onClick={() => handleOpenDelete('equipment', res.id, res.name, res.category)}
                          className="p-2 rounded-xl bg-brand-surfaceElevated border border-brand-border hover:border-brand-pink/60 text-brand-subtle hover:text-brand-pink transition-all"
                          title="Delete machine station (safe check)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: GAME LIBRARY */}
      {/* ========================================================================= */}
      {activeSubTab === 'games' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm uppercase font-mono tracking-wider text-brand-subtle font-semibold">
              Installed Games & Titles ({filteredGames.length})
            </h3>
            <span className="text-xs text-brand-subtle/80">
              Control game visibility, player capacities, and genre tags for players
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredGames.length === 0 ? (
              <div className="col-span-full p-12 text-center text-brand-subtle text-xs bg-brand-surface rounded-2xl border border-brand-border/60">
                No games found matching your filter. Click "+ Add Game" to add one!
              </div>
            ) : (
              filteredGames.map((game) => (
                <div
                  key={game.id}
                  className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all shadow-md group ${
                    game.isAvailable
                      ? 'bg-brand-surface border-brand-border/70 hover:border-brand-pink/50'
                      : 'bg-brand-surface/40 border-brand-border/40 opacity-70'
                  }`}
                >
                  <div className="relative aspect-[16/9] bg-brand-dark overflow-hidden">
                    <img
                      src={game.image}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-brand-dark/90 backdrop-blur-md border border-brand-border text-[9px] font-mono font-bold uppercase text-white">
                        {game.category}
                      </span>
                      {game.genre && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-pink/80 backdrop-blur-md text-[9px] font-mono font-bold uppercase text-white">
                          {game.genre}
                        </span>
                      )}
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <button
                        onClick={() => handleToggleGameAvailability(game)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border transition-all ${
                          game.isAvailable
                            ? 'bg-emerald-500/90 text-white border-emerald-400'
                            : 'bg-amber-500/90 text-white border-amber-400'
                        }`}
                        title="Click to toggle availability"
                      >
                        {game.isAvailable ? 'Available' : 'Disabled'}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-brand-pink transition-colors">
                        {game.title}
                      </h4>
                      <p className="text-[11px] text-brand-subtle font-light line-clamp-2 mt-1">
                        {game.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-brand-border/40 flex items-center justify-between text-xs text-brand-subtle">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Users className="w-3.5 h-3.5 text-brand-pink" />
                        {game.minPlayers || 1}-{game.maxPlayers || 2}P
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditGame(game)}
                          className="p-1.5 rounded-lg bg-brand-surfaceElevated border border-brand-border hover:border-brand-pink/60 text-brand-subtle hover:text-white"
                          title="Edit game"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete('game', game.id, game.title, game.category)}
                          className="p-1.5 rounded-lg bg-brand-surfaceElevated border border-brand-border hover:border-brand-pink/60 text-brand-subtle hover:text-brand-pink"
                          title="Delete game"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT MACHINE STATION */}
      {/* ========================================================================= */}
      {showMachineModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-[#0D0D12] border border-brand-border/80 shadow-2xl overflow-hidden p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/40">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-brand-blue" />
                <h3 className="font-serif text-lg font-bold text-white">
                  {editingMachine ? `Edit Station: ${editingMachine.name}` : 'Add New Machine Station'}
                </h3>
              </div>
              <button
                onClick={() => setShowMachineModal(false)}
                className="p-1.5 rounded-full hover:bg-brand-surface text-brand-subtle hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMachine} className="space-y-4 text-xs">
              <div>
                <label className="block text-brand-subtle font-mono uppercase mb-1">Station Name</label>
                <input
                  type="text"
                  required
                  value={machineForm.name}
                  onChange={(e) => setManualMachineForm({ ...machineForm, name: e.target.value })}
                  placeholder="e.g. PS5 Pro Station 4 (4K 120Hz)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-brand-subtle font-mono uppercase mb-1">Category Code</label>
                  <input
                    type="text"
                    required
                    value={machineForm.category}
                    onChange={(e) => setManualMachineForm({ ...machineForm, category: e.target.value.toLowerCase() })}
                    placeholder="ps5, pool, racing, xbox, pc..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-blue uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-brand-subtle font-mono uppercase mb-1">Machine Tag / ID</label>
                  <input
                    type="text"
                    value={machineForm.machineIdentifier}
                    onChange={(e) => setManualMachineForm({ ...machineForm, machineIdentifier: e.target.value.toUpperCase() })}
                    placeholder="PS5-04, RIG-02, etc."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-blue uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-brand-subtle font-mono uppercase mb-1">Rate (₹/hr)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={machineForm.ratePerHour}
                    onChange={(e) => setManualMachineForm({ ...machineForm, ratePerHour: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-blue font-mono"
                  />
                </div>

                <div>
                  <label className="block text-brand-subtle font-mono uppercase mb-1">Min Players</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={machineForm.minPlayers}
                    onChange={(e) => setManualMachineForm({ ...machineForm, minPlayers: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-blue font-mono"
                  />
                </div>

                <div>
                  <label className="block text-brand-subtle font-mono uppercase mb-1">Max Players</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={machineForm.maxPlayers}
                    onChange={(e) => setManualMachineForm({ ...machineForm, maxPlayers: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-blue font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-brand-subtle font-mono uppercase mb-1">Specs / Highlights (comma-separated)</label>
                <input
                  type="text"
                  value={machineForm.specs}
                  onChange={(e) => setManualMachineForm({ ...machineForm, specs: e.target.value })}
                  placeholder="e.g. 55-inch 4K 120Hz, 2 DualSense Controllers, EA FC 25"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-brand-subtle font-mono uppercase mb-1">Display Image (Cloudinary or Path)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={machineForm.image}
                    onChange={(e) => setManualMachineForm({ ...machineForm, image: e.target.value })}
                    placeholder="/assets/real/ps5_setup.png"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-blue font-mono"
                  />
                  <label className="px-3 py-2.5 rounded-xl bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue border border-brand-blue/40 text-xs font-mono flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{machineUploading ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={machineUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleMachineImageUpload(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => setShowMachineModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === 'saving-machine'}
                  className="px-5 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-semibold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingMachine ? 'Save Changes' : 'Create Station'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT GAME */}
      {/* ========================================================================= */}
      {showGameModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-[#0D0D12] border border-brand-border/80 shadow-2xl overflow-hidden p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-pink" />
                <h3 className="font-serif text-lg font-bold text-white">
                  {editingGame ? `Edit Game: ${editingGame.title}` : 'Add New Game to Library'}
                </h3>
              </div>
              <button
                onClick={() => setShowGameModal(false)}
                className="p-1.5 rounded-full hover:bg-brand-surface text-brand-subtle hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGame} className="space-y-4 text-xs">
              <div>
                <label className="block text-brand-subtle font-mono uppercase mb-1">Game Title</label>
                <input
                  type="text"
                  required
                  value={gameForm.title}
                  onChange={(e) => setGameForm({ ...gameForm, title: e.target.value })}
                  placeholder="e.g. EA Sports FC 25, Tekken 8, GTA V"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-brand-subtle font-mono uppercase mb-1">Arena Category</label>
                  <input
                    type="text"
                    required
                    value={gameForm.category}
                    onChange={(e) => setGameForm({ ...gameForm, category: e.target.value.toLowerCase() })}
                    placeholder="ps5, racing, pool, foosball, boardgames, pc, xbox"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-brand-subtle font-mono uppercase mb-1">Genre</label>
                  <input
                    type="text"
                    value={gameForm.genre}
                    onChange={(e) => setGameForm({ ...gameForm, genre: e.target.value })}
                    placeholder="Sports, Fighting, Racing, Co-op..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-brand-subtle font-mono uppercase mb-1">Min Players</label>
                  <input
                    type="number"
                    min="1"
                    value={gameForm.minPlayers}
                    onChange={(e) => setGameForm({ ...gameForm, minPlayers: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink font-mono"
                  />
                </div>

                <div>
                  <label className="block text-brand-subtle font-mono uppercase mb-1">Max Players</label>
                  <input
                    type="number"
                    min="1"
                    value={gameForm.maxPlayers}
                    onChange={(e) => setGameForm({ ...gameForm, maxPlayers: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-brand-subtle font-mono uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={gameForm.description}
                  onChange={(e) => setGameForm({ ...gameForm, description: e.target.value })}
                  placeholder="Short exciting summary for players and guests..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink"
                />
              </div>

              <div>
                <label className="block text-brand-subtle font-mono uppercase mb-1">Artwork / Cover (Cloudinary or URL)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={gameForm.image}
                    onChange={(e) => setGameForm({ ...gameForm, image: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-pink font-mono"
                  />
                  <label className="px-3 py-2.5 rounded-xl bg-brand-pink/20 hover:bg-brand-pink/30 text-brand-pink border border-brand-pink/40 text-xs font-mono flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{gameUploading ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={gameUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGameImageUpload(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="gameAvailable"
                  checked={gameForm.isAvailable}
                  onChange={(e) => setGameForm({ ...gameForm, isAvailable: e.target.checked })}
                  className="rounded border-brand-border text-brand-pink focus:ring-brand-pink"
                />
                <label htmlFor="gameAvailable" className="text-white text-xs cursor-pointer">
                  Mark as Available in library
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => setShowGameModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === 'saving-game'}
                  className="px-5 py-2.5 rounded-xl bg-brand-pink hover:bg-brand-pinkHover text-white font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-luxury-pink"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingGame ? 'Save Game' : 'Add to Library'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TOGGLE MAINTENANCE REASON */}
      {/* ========================================================================= */}
      {maintenanceTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0D0D12] border border-amber-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">
                  {maintenanceTarget.isMaintenance ? 'Reactivate Station?' : 'Place Station in Maintenance?'}
                </h4>
                <p className="text-xs text-brand-subtle">{maintenanceTarget.name}</p>
              </div>
            </div>

            {!maintenanceTarget.isMaintenance ? (
              <div className="space-y-3 text-xs">
                <p className="text-brand-subtle">
                  While under maintenance, customers will not be able to book this station online.
                </p>
                <div>
                  <label className="block text-brand-subtle font-mono uppercase mb-1">Reason / Note (optional)</label>
                  <input
                    type="text"
                    value={maintenanceReasonInput}
                    onChange={(e) => setMaintenanceReasonInput(e.target.value)}
                    placeholder="e.g. Controller servicing, display calibration"
                    className="w-full px-3.5 py-2 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-brand-subtle">
                This station will immediately become available again for online bookings.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border/40">
              <button
                onClick={() => setMaintenanceTarget(null)}
                className="px-4 py-2 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMaintenance}
                className={`px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider ${
                  maintenanceTarget.isMaintenance
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-amber-500 text-black hover:bg-amber-400'
                }`}
              >
                {maintenanceTarget.isMaintenance ? 'Reactivate Now' : 'Lock for Maintenance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION & ACTIVE BOOKING WARNING */}
      {/* ========================================================================= */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0D0D12] border border-brand-pink/50 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-pink/20 text-brand-pink flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">
                  Delete {deleteConfirmTarget.type === 'equipment' ? 'Equipment' : 'Game'}?
                </h4>
                <p className="text-xs text-brand-subtle">{deleteConfirmTarget.name}</p>
              </div>
            </div>

            {deleteError ? (
              <div className="p-3.5 rounded-xl bg-brand-pink/20 border border-brand-pink/60 text-white text-xs leading-relaxed">
                <span className="font-bold block mb-1">Cannot Delete Station:</span>
                {deleteError}
              </div>
            ) : (
              <p className="text-xs text-brand-subtle leading-relaxed">
                {deleteConfirmTarget.type === 'equipment'
                  ? 'Are you sure you want to delete this machine? The system will verify there are zero active or upcoming customer bookings before removing.'
                  : 'Are you sure you want to remove this title from the GioCasa games library?'}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border/40">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-white text-xs"
              >
                {deleteError ? 'Close' : 'Cancel'}
              </button>
              {!deleteError && (
                <button
                  onClick={handleExecuteDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-luxury-pink"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Verifying...' : 'Confirm Delete'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
