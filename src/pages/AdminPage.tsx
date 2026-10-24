import React, { useState, useEffect, useCallback } from 'react';
import { PageRoute, RouteParams } from '../types';
import { bookingApi, AdminOverviewData, Booking, GamingResource } from '../services/bookingApi';
import { AdminTournamentsManager } from '../components/admin/AdminTournamentsManager';
import { AdminHallOfFameManager } from '../components/admin/AdminHallOfFameManager';
import { AdminPlayerCRM } from '../components/admin/AdminPlayerCRM';
import { getPricingDescription } from '../utils/pricing';
import { useAdminLiveSync } from '../hooks/useAdminLiveSync';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Users,
  Clock,
  DollarSign,
  Gamepad2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  Check,
  Phone,
  ArrowRight,
  Lock,
  Key,
  Trophy,
  Award,
  Trash2,
  Trash,
  CheckSquare,
  Square,
  LogOut,
} from 'lucide-react';

interface AdminPageProps {
  onNavigate: (page: PageRoute, params?: RouteParams) => void;
  adminTab?: string;
  adminTournamentId?: string;
  adminSubTab?: 'directory' | 'profile' | 'segments' | 'loyalty' | 'referrals' | 'reminders';
  adminPlayerId?: string;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  onNavigate,
  adminTab,
  adminTournamentId,
  adminSubTab,
  adminPlayerId,
}) => {
  // Passcode / Session Token authentication (sessionStorage ensures credentials expire when browser is closed)
  const [passcode, setPasscode] = useState<string>(
    () =>
      sessionStorage.getItem('giocasa_admin_token') ||
      sessionStorage.getItem('giocasa_admin_passcode') ||
      localStorage.getItem('giocasa_admin_passcode') ||
      ''
  );
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Tab Navigation: 'stations' | 'tournaments' | 'hall-of-fame' | 'players'
  const [selectedTab, setSelectedTab] = useState<'stations' | 'tournaments' | 'hall-of-fame' | 'players'>(() => {
    if (adminTab === 'players') return 'players';
    if (adminTab === 'hall-of-fame') return 'hall-of-fame';
    if (adminTab?.startsWith('tournament')) return 'tournaments';
    return 'stations';
  });

  useEffect(() => {
    if (adminTab === 'players') {
      setSelectedTab('players');
    } else if (adminTab === 'hall-of-fame') {
      setSelectedTab('hall-of-fame');
    } else if (adminTab?.startsWith('tournament')) {
      setSelectedTab('tournaments');
    } else if (adminTab === 'overview' || !adminTab) {
      setSelectedTab('stations');
    }
  }, [adminTab]);

  // Change Passcode Modal
  const [showPasscodeModal, setShowPasscodeModal] = useState<boolean>(false);
  const [currentPasscodeInput, setCurrentPasscodeInput] = useState<string>('');
  const [newPasscodeInput, setNewPasscodeInput] = useState<string>('');
  const [confirmPasscodeInput, setConfirmPasscodeInput] = useState<string>('');
  const [passcodeModalError, setPasscodeModalError] = useState<string | null>(null);
  const [passcodeModalSuccess, setPasscodeModalSuccess] = useState<string | null>(null);
  const [passcodeSubmitting, setPasscodeSubmitting] = useState<boolean>(false);

  // Dashboard Data
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<GamingResource[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Manual Booking Modal
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualForm, setManualForm] = useState({
    customerName: '',
    phone: '',
    resourceId: '',
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    startTime: '14:00',
    durationMinutes: 60,
    numberOfPeople: 2,
    paymentStatus: 'paid',
    notes: 'Walk-in guest',
  });
  const [manualSubmitting, setManualSubmitting] = useState<boolean>(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Attempt login with stored passcode or verify
  useEffect(() => {
    if (passcode) {
      loadDashboard(passcode);
    }
  }, [passcode]);

  const loadDashboard = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const [ovData, bkData, resData] = await Promise.all([
        bookingApi.getAdminOverview(code),
        bookingApi.getAdminBookings(code),
        bookingApi.getResources(),
      ]);

      setOverview(ovData);
      setBookings(bkData);
      setResources(resData);
      setIsAuthenticated(true);
      sessionStorage.setItem('giocasa_admin_token', code);
      // Clean up plaintext legacy storage
      localStorage.removeItem('giocasa_admin_passcode');
    } catch (err: any) {
      setIsAuthenticated(false);
      setAuthError('Invalid Admin Passcode or session expired.');
    } finally {
      setLoading(false);
    }
  };

  // 3-Second Live Auto-Sync for Dashboard, Bookings, Resources & Overview
  const silentSyncDashboard = useCallback(async () => {
    if (!passcode || !isAuthenticated) return;
    // Do not sync while user has the manual booking modal open to avoid interrupting entry
    if (showManualModal) return;

    try {
      const [ovData, bkData, resData] = await Promise.all([
        bookingApi.getAdminOverview(passcode),
        bookingApi.getAdminBookings(passcode),
        bookingApi.getResources(),
      ]);

      setOverview(ovData);
      setBookings(bkData);
      setResources(resData);
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
        setIsAuthenticated(false);
        setAuthError('Session expired. Please log in again.');
      }
      throw err;
    }
  }, [passcode, isAuthenticated, showManualModal]);

  const { status: liveSyncStatus, lastSyncedAt } = useAdminLiveSync({
    enabled: isAuthenticated && !!passcode,
    intervalMs: 3000,
    pauseWhenHidden: true,
    onSync: silentSyncDashboard,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidate = passcodeInput.trim();
    if (!candidate) return;
    setAuthError(null);
    setLoading(true);

    try {
      // Authenticate with server to issue a secure 12-hour session token
      const result = await bookingApi.adminLogin(candidate);
      const token = result.token;
      setPasscode(token);
      sessionStorage.setItem('giocasa_admin_token', token);
      localStorage.removeItem('giocasa_admin_passcode');
      await loadDashboard(token);
    } catch (err: any) {
      setAuthError(err.message || 'Invalid Admin Passcode.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (passcode) {
      await bookingApi.adminLogout(passcode);
    }
    sessionStorage.removeItem('giocasa_admin_token');
    sessionStorage.removeItem('giocasa_admin_passcode');
    localStorage.removeItem('giocasa_admin_passcode');
    setPasscode('');
    setIsAuthenticated(false);
    setAuthError(null);
  };

  // Change Passcode Handler
  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeModalError(null);
    setPasscodeModalSuccess(null);

    if (!currentPasscodeInput.trim()) {
      setPasscodeModalError('Please enter your current passcode.');
      return;
    }
    if (newPasscodeInput.trim().length < 8) {
      setPasscodeModalError('New passcode must be at least 8 characters long for security.');
      return;
    }
    if (newPasscodeInput !== confirmPasscodeInput) {
      setPasscodeModalError('New passcodes do not match.');
      return;
    }

    setPasscodeSubmitting(true);
    try {
      await bookingApi.changeAdminPasscode(currentPasscodeInput.trim(), newPasscodeInput.trim());
      // Re-login with new passcode to acquire fresh session token
      const session = await bookingApi.adminLogin(newPasscodeInput.trim());
      setPasscode(session.token);
      sessionStorage.setItem('giocasa_admin_token', session.token);
      localStorage.removeItem('giocasa_admin_passcode');
      setPasscodeModalSuccess('Admin passcode updated successfully!');
      setTimeout(() => {
        setShowPasscodeModal(false);
        setCurrentPasscodeInput('');
        setNewPasscodeInput('');
        setConfirmPasscodeInput('');
        setPasscodeModalSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPasscodeModalError(err.message || 'Failed to update passcode.');
    } finally {
      setPasscodeSubmitting(false);
    }
  };

  // Toggle Resource Maintenance
  const handleToggleMaintenance = async (resource: GamingResource) => {
    const nextState = !resource.isMaintenance;
    const reason = nextState ? window.prompt('Enter reason for maintenance (e.g. Controller servicing):', 'Routine equipment servicing') || 'Maintenance' : undefined;

    try {
      await bookingApi.toggleResourceMaintenance(passcode, resource.id, nextState, reason);
      loadDashboard(passcode);
    } catch (err: any) {
      alert(err.message || 'Failed to update maintenance state.');
    }
  };

  // Update Booking Status
  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await bookingApi.updateAdminBooking(passcode, bookingId, { status: status as any });
      loadDashboard(passcode);
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  // Toggle Payment Status
  const handleTogglePayment = async (booking: Booking) => {
    const nextStatus = booking.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await bookingApi.updateAdminBooking(passcode, booking.id, { paymentStatus: nextStatus });
      loadDashboard(passcode);
    } catch (err: any) {
      alert(err.message || 'Failed to update payment status.');
    }
  };

  // Extend Booking
  const handleExtend = async (bookingId: string, mins: number) => {
    try {
      await bookingApi.extendBooking(bookingId, mins);
      loadDashboard(passcode);
    } catch (err: any) {
      alert(err.message || 'Could not extend booking.');
    }
  };

  // Submit Manual Booking
  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.customerName || !manualForm.phone || !manualForm.resourceId) {
      setManualError('Please fill in all required fields.');
      return;
    }

    setManualSubmitting(true);
    setManualError(null);
    try {
      await bookingApi.createManualBooking(passcode, manualForm);
      setShowManualModal(false);
      setManualForm({
        customerName: '',
        phone: '',
        resourceId: resources[0]?.id || '',
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        startTime: '14:00',
        durationMinutes: 60,
        numberOfPeople: 2,
        paymentStatus: 'paid',
        notes: 'Walk-in guest',
      });
      loadDashboard(passcode);
    } catch (err: any) {
      setManualError(err.message || 'Slot conflict or server error.');
    } finally {
      setManualSubmitting(false);
    }
  };

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (resourceFilter !== 'all' && b.resourceId !== resourceFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.customerName.toLowerCase().includes(q) ||
        b.phone.includes(q) ||
        b.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Format 24h to 12h
  const formatTime12 = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m || 0).padStart(2, '0')} ${period}`;
  };

  // Selection & History Delete State
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());
  const [showClearHistoryModal, setShowClearHistoryModal] = useState<boolean>(false);
  const [clearHistoryScope, setClearHistoryScope] = useState<'completed_and_cancelled' | 'all'>('completed_and_cancelled');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // History & Selection calculations
  const historyCount = bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled').length;
  const allFilteredSelected =
    filteredBookings.length > 0 && filteredBookings.every((b) => selectedBookingIds.has(b.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedBookingIds(new Set());
    } else {
      const next = new Set(selectedBookingIds);
      filteredBookings.forEach((b) => next.add(b.id));
      setSelectedBookingIds(next);
    }
  };

  const handleToggleSelectBooking = (id: string) => {
    const next = new Set(selectedBookingIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedBookingIds(next);
  };

  const handleClearSelection = () => {
    setSelectedBookingIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedBookingIds.size === 0) return;
    const count = selectedBookingIds.size;
    const confirmMsg = `Are you sure you want to delete ${count} selected booking${
      count === 1 ? '' : 's'
    } from history? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await bookingApi.deleteAdminBookingsBatch(passcode, Array.from(selectedBookingIds));
      setSelectedBookingIds(new Set());
      await loadDashboard(passcode);
      setActionFeedback({
        type: 'success',
        message: res.message || `Deleted ${count} bookings successfully.`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to delete selected bookings.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSingle = async (booking: Booking) => {
    const confirmMsg = `Delete booking #${booking.id} (${booking.customerName}) from history?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    setActionFeedback(null);
    try {
      await bookingApi.deleteAdminBooking(passcode, booking.id);
      if (selectedBookingIds.has(booking.id)) {
        const next = new Set(selectedBookingIds);
        next.delete(booking.id);
        setSelectedBookingIds(next);
      }
      await loadDashboard(passcode);
      setActionFeedback({ type: 'success', message: `Booking #${booking.id} deleted successfully.` });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to delete booking.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearHistorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await bookingApi.clearBookingHistory(passcode, clearHistoryScope);
      setShowClearHistoryModal(false);
      setSelectedBookingIds(new Set());
      await loadDashboard(passcode);
      setActionFeedback({
        type: 'success',
        message: res.message || 'Booking history cleared successfully.',
      });
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to clear booking history.' });
    } finally {
      setActionLoading(false);
    }
  };

  // IF NOT AUTHENTICATED -> SHOW PASSCODE SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-brand-surface border border-brand-border rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-terracotta/20 text-brand-terracotta border border-brand-terracotta/40 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <h1 className="font-serif text-2xl font-bold text-brand-cream">
              GioCasa Operations Gate
            </h1>
            <p className="text-xs text-brand-subtle mt-1">
              Enter staff passcode to access live gaming station management.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              required
              placeholder="Enter Admin Passcode"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-3 text-center text-brand-cream font-mono text-sm tracking-widest focus:outline-none focus:border-brand-terracotta"
            />

            {authError && (
              <p className="text-xs text-red-400 font-mono">{authError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-brand-terracotta hover:bg-brand-terracottaHover text-brand-cream font-bold text-xs uppercase tracking-wider transition-all shadow-luxury-ember"
            >
              {loading ? 'Verifying...' : 'Unlock Operations Hub'}
            </button>
          </form>

          <button
            onClick={() => onNavigate('home')}
            className="text-xs text-brand-subtle hover:text-brand-cream block mx-auto underline pt-2"
          >
            ← Back to GioCasa Website
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark text-brand-cream pt-24 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-border/60">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-brand-surface border border-brand-gold/40 text-[10px] font-mono text-brand-gold font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE ARENA OPS • IST</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-brand-cream mt-1">
              Gaming Operations Dashboard
            </h1>
            <p className="text-xs text-brand-subtle">
              Date: <strong className="text-brand-cream">{overview?.date}</strong> • Time: <strong className="text-brand-gold">{overview?.currentTime} IST</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setCurrentPasscodeInput('');
                setNewPasscodeInput('');
                setConfirmPasscodeInput('');
                setPasscodeModalError(null);
                setPasscodeModalSuccess(null);
                setShowPasscodeModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-gold/50 text-brand-subtle hover:text-brand-cream text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Change Admin Passcode"
            >
              <Key className="w-3.5 h-3.5 text-brand-gold" />
              <span>Passcode</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:border-red-500/50 text-red-400 hover:text-red-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Secure Admin Logout"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>Logout</span>
            </button>

            {/* 3s Live-Sync Status Badge */}
            <div
              className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center gap-2 transition-all ${
                liveSyncStatus === 'error'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : liveSyncStatus === 'paused'
                  ? 'bg-brand-surface border-brand-border text-brand-subtle'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
              title={
                lastSyncedAt
                  ? `Live 3s Sync Active • Last updated: ${lastSyncedAt.toLocaleTimeString()}`
                  : 'Syncing live data every 3 seconds'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  liveSyncStatus === 'error'
                    ? 'bg-amber-400 animate-ping'
                    : liveSyncStatus === 'paused'
                    ? 'bg-brand-subtle'
                    : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="hidden sm:inline">
                {liveSyncStatus === 'error'
                  ? 'Reconnecting'
                  : liveSyncStatus === 'paused'
                  ? 'Sync Paused'
                  : 'Live (3s)'}
              </span>
            </div>

            <button
              onClick={() => loadDashboard(passcode)}
              className="px-4 py-2 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-brand-cream text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                if (resources.length > 0 && !manualForm.resourceId) {
                  setManualForm((prev) => ({ ...prev, resourceId: resources[0].id }));
                }
                setShowManualModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-brand-terracotta hover:bg-brand-terracottaHover text-brand-cream text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-luxury-ember"
            >
              <Plus className="w-4 h-4" />
              <span>Manual Walk-in</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex border-b border-brand-border/60 gap-2 sm:gap-4 overflow-x-auto pb-1">
          <button
            onClick={() => {
              setSelectedTab('stations');
              onNavigate('admin', { adminTab: 'overview' });
            }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedTab === 'stations'
                ? 'border-brand-gold text-brand-gold font-bold bg-brand-surface/40 rounded-t-xl'
                : 'border-transparent text-brand-subtle hover:text-brand-cream hover:border-brand-border'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Station Ops & Walk-ins</span>
          </button>

          <button
            onClick={() => {
              setSelectedTab('tournaments');
              onNavigate('admin', { adminTab: 'tournaments' });
            }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedTab === 'tournaments'
                ? 'border-brand-gold text-brand-gold font-bold bg-brand-surface/40 rounded-t-xl'
                : 'border-transparent text-brand-subtle hover:text-brand-cream hover:border-brand-border'
            }`}
          >
            <Trophy className="w-4 h-4 text-brand-gold" />
            <span>GioCasa Arena Tournaments</span>
          </button>

          <button
            onClick={() => {
              setSelectedTab('hall-of-fame');
              onNavigate('admin', { adminTab: 'hall-of-fame' });
            }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedTab === 'hall-of-fame'
                ? 'border-brand-gold text-brand-gold font-bold bg-brand-surface/40 rounded-t-xl'
                : 'border-transparent text-brand-subtle hover:text-brand-cream hover:border-brand-border'
            }`}
          >
            <Award className="w-4 h-4 text-brand-gold" />
            <span>Hall of Fame Archive</span>
          </button>

          <button
            onClick={() => {
              setSelectedTab('players');
              onNavigate('admin', { adminTab: 'players', adminSubTab: 'directory' });
            }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedTab === 'players'
                ? 'border-[#ED249B] text-[#ED249B] font-bold bg-brand-surface/40 rounded-t-xl'
                : 'border-transparent text-brand-subtle hover:text-brand-cream hover:border-brand-border'
            }`}
          >
            <Users className="w-4 h-4 text-[#ED249B]" />
            <span>Player CRM</span>
          </button>
        </div>

        {selectedTab === 'stations' && (
          <>
            {/* 1. TODAY'S OVERVIEW METRICS (Requirement 22) */}
        {overview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-1 shadow-lg">
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-subtle">Playing Now</span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold text-amber-400">
                  {overview.metrics.playingNow}
                </span>
                <span className="text-xs text-amber-500/80 font-mono">Active Stations</span>
              </div>
            </div>

            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-1 shadow-lg">
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-subtle">Upcoming Today</span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold text-brand-gold">
                  {overview.metrics.upcoming}
                </span>
                <span className="text-xs text-brand-subtle font-mono">Reserved</span>
              </div>
            </div>

            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-1 shadow-lg">
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-subtle">Completed Today</span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold text-emerald-400">
                  {overview.metrics.completed}
                </span>
                <span className="text-xs text-emerald-500/80 font-mono">Sessions Finished</span>
              </div>
            </div>

            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-1 shadow-lg">
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-subtle">Today's Revenue</span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold text-brand-terracotta">
                  ₹{overview.metrics.revenue}
                </span>
                <span className="text-xs text-brand-subtle font-mono">Est. Gaming</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. LIVE GAMING STATION STATUS GRID (Requirement 8 & 22) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold text-brand-cream">
              Live Station Status & Maintenance
            </h2>
            <span className="text-xs text-brand-subtle font-mono">
              Click "Set Maintenance" to immediately block customer bookings
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {overview?.liveStations.map((station) => {
              const matchedResource = resources.find((r) => r.id === station.id);

              return (
                <div
                  key={station.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                    station.status === 'playing'
                      ? 'bg-amber-950/20 border-amber-600/60 shadow-lg'
                      : station.status === 'maintenance'
                      ? 'bg-stone-900/60 border-red-900/50 opacity-75'
                      : station.status === 'reserved'
                      ? 'bg-brand-surfaceElevated border-brand-gold/40'
                      : 'bg-brand-surface border-brand-border'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-lg font-bold text-brand-cream">
                        {station.name}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                          station.status === 'playing'
                            ? 'bg-amber-500 text-brand-dark animate-pulse'
                            : station.status === 'reserved'
                            ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/40'
                            : station.status === 'maintenance'
                            ? 'bg-red-900 text-red-200'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                        }`}
                      >
                        {station.statusLabel}
                      </span>
                    </div>

                    {/* Active session info */}
                    {station.currentBooking && (
                      <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-xs space-y-1">
                        <div className="flex justify-between text-amber-200 font-semibold">
                          <span>{station.currentBooking.customerName}</span>
                          <span className="font-mono">Until {formatTime12(station.currentBooking.endTime)}</span>
                        </div>
                        <span className="text-[10px] text-amber-400/80 font-mono block">
                          Phone: {station.currentBooking.phone}
                        </span>
                      </div>
                    )}

                    {/* Next upcoming info */}
                    {station.nextBooking && (
                      <div className="p-3 rounded-xl bg-brand-dark border border-brand-border/60 text-xs space-y-1">
                        <div className="flex justify-between text-brand-cream">
                          <span>Next: {station.nextBooking.customerName}</span>
                          <span className="font-mono text-brand-gold">{formatTime12(station.nextBooking.startTime)}</span>
                        </div>
                      </div>
                    )}

                    {station.status === 'maintenance' && (
                      <p className="text-xs text-red-300 font-mono">
                        Reason: {station.reason || 'Under Service'}
                      </p>
                    )}
                  </div>

                  {/* Maintenance Toggle Button */}
                  <div className="pt-4 mt-3 border-t border-brand-border/40 flex items-center justify-between text-xs">
                    <span className="font-mono text-brand-subtle text-[11px]">
                      {matchedResource ? getPricingDescription(matchedResource.category) : 'Standard Rate'}
                    </span>

                    {matchedResource && (
                      <button
                        onClick={() => handleToggleMaintenance(matchedResource)}
                        className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold transition-colors ${
                          matchedResource.isMaintenance
                            ? 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-600'
                            : 'bg-red-950/60 text-red-400 hover:bg-red-900 border border-red-800'
                        }`}
                      >
                        {matchedResource.isMaintenance ? 'Restore Active' : 'Set Maintenance'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. BOOKINGS MANAGEMENT TABLE (Requirement 7 & 22) */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-brand-cream">
                All Bookings & Slot Control
              </h2>
              <p className="text-xs text-brand-subtle">
                Showing {filteredBookings.length} total bookings
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-brand-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, phone, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-brand-surface border border-brand-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-brand-cream font-mono focus:outline-none focus:border-brand-terracotta"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-brand-surface border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-cream font-mono focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active (Playing)</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Resource Filter */}
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                className="bg-brand-surface border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-cream font-mono focus:outline-none"
              >
                <option value="all">All Equipment</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              {/* Clear History Button */}
              <button
                onClick={() => setShowClearHistoryModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-900/60 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 text-xs font-mono transition-colors shadow-sm disabled:opacity-50"
                title="Clear completed and cancelled booking history"
              >
                <Trash className="w-3.5 h-3.5 text-red-400" />
                <span>Clear History</span>
                {historyCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-900/80 text-[10px] text-red-200">
                    {historyCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Action Feedback Notification */}
          {actionFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-mono flex items-center justify-between border ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-200'
                  : 'bg-red-950/70 border-red-700/60 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <span>{actionFeedback.message}</span>
              </div>
              <button
                onClick={() => setActionFeedback(null)}
                className="text-stone-400 hover:text-stone-200 text-sm ml-2 px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Selection Actions Toolbar */}
          {selectedBookingIds.size > 0 && (
            <div className="bg-brand-surfaceElevated border border-brand-gold/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-mono text-brand-cream">
                <CheckSquare className="w-4 h-4 text-brand-gold" />
                <span>
                  <strong className="text-brand-gold">{selectedBookingIds.size}</strong> booking{selectedBookingIds.size === 1 ? '' : 's'} selected
                </span>
                <button
                  onClick={handleClearSelection}
                  className="ml-2 text-[11px] text-brand-subtle hover:text-brand-cream underline decoration-dotted"
                >
                  Deselect All
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteSelected}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-mono font-semibold transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>{actionLoading ? 'Deleting...' : `Delete Selected (${selectedBookingIds.size})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Bookings Table */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-brand-surfaceElevated border-b border-brand-border font-mono text-brand-subtle uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-brand-subtle hover:text-brand-gold transition-colors focus:outline-none"
                        title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                      >
                        {allFilteredSelected ? (
                          <CheckSquare className="w-4 h-4 text-brand-gold" />
                        ) : (
                          <Square className="w-4 h-4 text-brand-subtle/70" />
                        )}
                      </button>
                    </th>
                    <th className="p-3.5">ID / Customer</th>
                    <th className="p-3.5">Equipment</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Duration</th>
                    <th className="p-3.5">Amount / Pay</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40 font-mono">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-brand-subtle font-sans">
                        No bookings match your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr
                        key={b.id}
                        className={`transition-colors ${
                          selectedBookingIds.has(b.id)
                            ? 'bg-brand-terracotta/10 border-l-2 border-brand-terracotta'
                            : 'hover:bg-brand-surfaceElevated/50'
                        }`}
                      >
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectBooking(b.id)}
                            className="text-brand-subtle hover:text-brand-gold transition-colors focus:outline-none"
                          >
                            {selectedBookingIds.has(b.id) ? (
                              <CheckSquare className="w-4 h-4 text-brand-gold" />
                            ) : (
                              <Square className="w-4 h-4 text-brand-subtle/50" />
                            )}
                          </button>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-brand-gold">{b.id}</span>
                          <span className="font-sans font-semibold text-brand-cream block">{b.customerName}</span>
                          <span className="text-[10px] text-brand-subtle">{b.phone}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-sans font-medium text-brand-cream">{b.resourceName}</span>
                          <span className="text-[10px] text-brand-subtle block">{b.numberOfPeople} Players</span>
                        </td>
                        <td className="p-3.5">
                          <span className="text-brand-cream">{b.date}</span>
                          <span className="text-brand-gold block font-bold">
                            {formatTime12(b.startTime)} – {formatTime12(b.endTime)}
                          </span>
                        </td>
                        <td className="p-3.5 text-brand-cream">{b.durationMinutes} mins</td>
                        <td className="p-3.5">
                          <span className="font-bold text-brand-gold">₹{b.totalAmount}</span>
                          <button
                            onClick={() => handleTogglePayment(b)}
                            className={`text-[9px] font-bold uppercase tracking-wider block mt-0.5 px-1.5 py-0.5 rounded ${
                              b.paymentStatus === 'paid'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                                : 'bg-red-950 text-red-400 border border-red-700'
                            }`}
                          >
                            {b.paymentStatus}
                          </button>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              b.status === 'active'
                                ? 'bg-amber-950 text-amber-300 border border-amber-600 animate-pulse'
                                : b.status === 'confirmed'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                                : b.status === 'completed'
                                ? 'bg-stone-900 text-stone-400'
                                : 'bg-red-950 text-red-400'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          {b.status === 'confirmed' && (
                            <button
                              onClick={() => handleUpdateBookingStatus(b.id, 'active')}
                              title="Mark customer as playing right now"
                              className="px-2 py-1 rounded bg-amber-950 border border-amber-700 text-amber-300 hover:bg-amber-900 text-[10px]"
                            >
                              Start Play
                            </button>
                          )}

                          {b.status === 'active' && (
                            <button
                              onClick={() => handleUpdateBookingStatus(b.id, 'completed')}
                              title="Mark session as completed"
                              className="px-2 py-1 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 hover:bg-emerald-900 text-[10px]"
                            >
                              Complete
                            </button>
                          )}

                          {(b.status === 'confirmed' || b.status === 'active') && (
                            <>
                              <button
                                onClick={() => handleExtend(b.id, 30)}
                                title="Extend by 30 mins"
                                className="px-2 py-1 rounded bg-brand-surfaceElevated border border-brand-border text-brand-gold hover:bg-brand-surface text-[10px]"
                              >
                                +30m
                              </button>

                              <button
                                onClick={() => handleUpdateBookingStatus(b.id, 'cancelled')}
                                title="Cancel booking"
                                className="px-2 py-1 rounded text-red-400 hover:text-red-300 text-[10px]"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {/* Delete Single Booking Button */}
                          <button
                            onClick={() => handleDeleteSingle(b)}
                            title={`Delete booking #${b.id} from history`}
                            className="p-1 rounded bg-stone-900/60 border border-stone-800 text-stone-400 hover:text-red-400 hover:border-red-900/60 hover:bg-red-950/40 transition-colors inline-flex items-center align-middle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    )}

    {/* ARENA TOURNAMENTS MANAGER */}
    {selectedTab === 'tournaments' && (
      <AdminTournamentsManager
        passcode={passcode}
        initialTab={adminTab}
        initialTournamentId={adminTournamentId}
        onNavigatePublic={(slug) => onNavigate('tournament-detail', { slug })}
      />
    )}

    {/* HALL OF FAME MANAGER */}
    {selectedTab === 'hall-of-fame' && (
      <AdminHallOfFameManager
        passcode={passcode}
      />
    )}

    {/* PLAYER CRM MANAGER */}
    {selectedTab === 'players' && (
      <AdminPlayerCRM
        passcode={passcode}
        onNavigate={onNavigate}
        subTab={adminSubTab}
        playerId={adminPlayerId}
      />
    )}

    {/* 4. MANUAL BOOKING MODAL */}
        {showManualModal && (
          <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-brand-border">
                <h3 className="font-serif text-xl font-bold text-brand-cream">
                  Manual Walk-in / Phone Booking
                </h3>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="text-brand-subtle hover:text-brand-cream"
                >
                  ✕
                </button>
              </div>

              {manualError && (
                <div className="p-3 rounded-xl bg-red-950 border border-red-700 text-xs text-red-200">
                  {manualError}
                </div>
              )}

              <form onSubmit={handleCreateManualBooking} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-brand-subtle block mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.customerName}
                    onChange={(e) => setManualForm({ ...manualForm, customerName: e.target.value })}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-cream"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-subtle block mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={manualForm.phone}
                      onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-cream font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-brand-subtle block mb-1">Resource Station *</label>
                    <select
                      value={manualForm.resourceId}
                      onChange={(e) => setManualForm({ ...manualForm, resourceId: e.target.value })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-cream"
                    >
                      {resources.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-brand-subtle block mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={manualForm.date}
                      onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-brand-subtle block mb-1">Start Time (24h)</label>
                    <input
                      type="time"
                      required
                      value={manualForm.startTime}
                      onChange={(e) => setManualForm({ ...manualForm, startTime: e.target.value })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-brand-subtle block mb-1">Duration</label>
                    <select
                      value={manualForm.durationMinutes}
                      onChange={(e) => setManualForm({ ...manualForm, durationMinutes: Number(e.target.value) })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream"
                    >
                      <option value={30}>30m</option>
                      <option value={60}>1 hour</option>
                      <option value={90}>1.5 hrs</option>
                      <option value={120}>2 hrs</option>
                      <option value={180}>3 hrs</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-brand-border text-brand-subtle"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={manualSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-brand-terracotta text-brand-cream font-bold uppercase tracking-wider"
                  >
                    {manualSubmitting ? 'Creating...' : 'Create Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Passcode Change Modal */}
        {showPasscodeModal && (
          <div className="fixed inset-0 z-50 bg-brand-dark/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-brand-surface border border-brand-border rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-brand-gold">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-brand-cream">Change Admin Passcode</h3>
                    <p className="text-xs text-brand-subtle">Update master credentials for GioCasa operations.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasscodeModal(false)}
                  className="text-brand-subtle hover:text-brand-cream p-1 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {passcodeModalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{passcodeModalError}</span>
                </div>
              )}

              {passcodeModalSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passcodeModalSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePasscode} className="space-y-4">
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-brand-subtle block mb-1.5">
                    Current Passcode
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter current passcode"
                    value={currentPasscodeInput}
                    onChange={(e) => setCurrentPasscodeInput(e.target.value)}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-brand-cream font-mono text-sm focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-brand-subtle block mb-1.5">
                    New Passcode (Min. 6 chars)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new passcode"
                    value={newPasscodeInput}
                    onChange={(e) => setNewPasscodeInput(e.target.value)}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-brand-cream font-mono text-sm focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-brand-subtle block mb-1.5">
                    Confirm New Passcode
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter new passcode"
                    value={confirmPasscodeInput}
                    onChange={(e) => setConfirmPasscodeInput(e.target.value)}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-brand-cream font-mono text-sm focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPasscodeModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-brand-border text-brand-subtle hover:text-brand-cream text-xs font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passcodeSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-brand-terracotta hover:bg-brand-terracottaHover text-brand-cream text-xs font-bold uppercase tracking-wider transition-all shadow-luxury-ember"
                  >
                    {passcodeSubmitting ? 'Updating...' : 'Save Passcode'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CLEAR HISTORY MODAL */}
        {showClearHistoryModal && (
          <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-brand-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-700/60 text-red-400 flex items-center justify-center">
                    <Trash className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-brand-cream">
                      Clear Booking History
                    </h3>
                    <p className="text-xs text-brand-subtle">
                      Permanent administrative cleanup
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClearHistoryModal(false)}
                  className="text-brand-subtle hover:text-brand-cream p-1 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleClearHistorySubmit} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-brand-surfaceElevated border border-brand-border text-xs text-brand-cream space-y-2.5">
                  <p className="font-semibold font-mono uppercase text-[11px] tracking-wider text-brand-subtle">
                    Select scope to purge:
                  </p>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer hover:bg-brand-surface border border-transparent hover:border-brand-border/60 transition-colors">
                    <input
                      type="radio"
                      name="clearScope"
                      checked={clearHistoryScope === 'completed_and_cancelled'}
                      onChange={() => setClearHistoryScope('completed_and_cancelled')}
                      className="mt-0.5 text-brand-terracotta focus:ring-brand-terracotta"
                    />
                    <div>
                      <span className="block font-medium text-brand-cream text-xs">
                        Completed & Cancelled only (Recommended)
                      </span>
                      <span className="block text-[11px] text-brand-subtle mt-0.5">
                        Safely cleans up old finished sessions ({historyCount} records). Keeps active playing stations and upcoming reservations untouched.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer hover:bg-brand-surface border border-transparent hover:border-brand-border/60 transition-colors">
                    <input
                      type="radio"
                      name="clearScope"
                      checked={clearHistoryScope === 'all'}
                      onChange={() => setClearHistoryScope('all')}
                      className="mt-0.5 text-brand-terracotta focus:ring-brand-terracotta"
                    />
                    <div>
                      <span className="block font-medium text-red-300 text-xs">
                        All Bookings (Danger)
                      </span>
                      <span className="block text-[11px] text-brand-subtle mt-0.5">
                        Purges ALL bookings, including active and upcoming reservations ({bookings.length} records total).
                      </span>
                    </div>
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-[11px] text-red-300 flex items-start gap-2 font-mono">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    Warning: This action permanently deletes records from the database and cannot be undone.
                  </span>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowClearHistoryModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-brand-border text-brand-subtle hover:text-brand-cream text-xs font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-red-900 hover:bg-red-800 text-red-100 text-xs font-bold uppercase tracking-wider transition-all border border-red-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Clearing...' : 'Confirm & Clear History'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
