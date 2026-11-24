import React, { useState, useEffect, useCallback } from 'react';
import { PageRoute, RouteParams } from '../types';
import { bookingApi, AdminOverviewData, Booking, GamingResource, TimeSlot } from '../services/bookingApi';
import { AdminTournamentsManager } from '../components/admin/AdminTournamentsManager';
import { AdminHallOfFameManager } from '../components/admin/AdminHallOfFameManager';
import { AdminPlayerCRM } from '../components/admin/AdminPlayerCRM';
import { AdminContactSettings } from '../components/admin/AdminContactSettings';
import { AdminEquipmentManager } from '../components/admin/AdminEquipmentManager';
import { AdminReservationsManager } from '../components/admin/AdminReservationsManager';
import { AdminGuestVerification } from '../components/admin/AdminGuestVerification';
import { AdminMediaManager } from '../components/admin/AdminMediaManager';
import { AdminGamesManager } from '../components/admin/AdminGamesManager';
import { AdminHeroCarouselManager } from '../components/admin/AdminHeroCarouselManager';
import { getPricingDescription, calculateBookingPrice } from '../utils/pricing';
import { useAdminLiveSync } from '../hooks/useAdminLiveSync';
import { canInstallPwa, triggerPwaInstall, isStandaloneApp, subscribeToPwaState } from '../utils/pwaInstall';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Users,
  Clock,
  Layers,
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
  Play,
  Edit3,
  Download,
  LogOut,
  MessageCircle,
  Utensils,
  Bell,
  Image as ImageIcon,
  Sliders,
  Eye,
  ChevronRight,
  Activity,
  Timer,
} from 'lucide-react';

interface AdminPageProps {
  onNavigate: (page: PageRoute, params?: RouteParams) => void;
  adminTab?: string;
  adminTournamentId?: string;
  adminSubTab?: 'directory' | 'profile' | 'segments' | 'loyalty' | 'referrals' | 'reminders';
  adminPlayerId?: string;
  targetBookingId?: string;
  targetRef?: string;
  targetType?: string;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  onNavigate,
  adminTab,
  adminTournamentId,
  adminSubTab,
  adminPlayerId,
  targetBookingId,
  targetRef,
  targetType,
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

  // Tab Navigation: 'stations' | 'verify' | 'games' | 'tournaments' | 'hall-of-fame' | 'players' | 'contact' | 'equipment' | 'reservations' | 'media' | 'hero'
  const [selectedTab, setSelectedTab] = useState<'stations' | 'verify' | 'games' | 'tournaments' | 'hall-of-fame' | 'players' | 'contact' | 'equipment' | 'reservations' | 'media' | 'hero'>(() => {
    if (adminTab === 'verify') return 'verify';
    if (adminTab === 'games' || adminTab === 'gaming-wall') return 'games';
    if (adminTab === 'reservations') return 'reservations';
    if (adminTab === 'equipment') return 'equipment';
    if (adminTab === 'players') return 'players';
    if (adminTab === 'hall-of-fame') return 'hall-of-fame';
    if (adminTab === 'media' || adminTab === 'gallery') return 'media';
    if (adminTab === 'hero' || adminTab === 'hero-carousel') return 'hero';
    if (adminTab?.startsWith('tournament')) return 'tournaments';
    if (adminTab === 'contact' || adminTab === 'settings') return 'contact';
    return 'stations';
  });

  useEffect(() => {
    if (adminTab === 'verify') {
      setSelectedTab('verify');
    } else if (adminTab === 'games' || adminTab === 'gaming-wall') {
      setSelectedTab('games');
    } else if (adminTab === 'reservations') {
      setSelectedTab('reservations');
    } else if (adminTab === 'equipment') {
      setSelectedTab('equipment');
    } else if (adminTab === 'players') {
      setSelectedTab('players');
    } else if (adminTab === 'hall-of-fame') {
      setSelectedTab('hall-of-fame');
    } else if (adminTab === 'media' || adminTab === 'gallery') {
      setSelectedTab('media');
    } else if (adminTab === 'hero' || adminTab === 'hero-carousel') {
      setSelectedTab('hero');
    } else if (adminTab?.startsWith('tournament')) {
      setSelectedTab('tournaments');
    } else if (adminTab === 'contact' || adminTab === 'settings') {
      setSelectedTab('contact');
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
    endTime: '15:00',
    durationMinutes: 60,
    numberOfPeople: 1,
    paymentStatus: 'paid',
    notes: 'Walk-in guest',
  });
  const [manualSubmitting, setManualSubmitting] = useState<boolean>(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Edit Booking Modal State (Requirement 3)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    resourceId: '',
    date: '',
    startTime: '',
    endTime: '',
    durationMinutes: 60,
    totalAmount: 0,
    paymentStatus: 'unpaid' as 'unpaid' | 'pending' | 'paid' | 'refunded',
    paymentMethod: 'cash' as 'cash' | 'upi' | 'card' | 'other',
    paymentReference: '',
    status: 'confirmed' as 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled',
    notes: '',
  });
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Live Station Details / Inspector Drawer State (Requirement: Equipment Cards Click)
  const [selectedStationDetail, setSelectedStationDetail] = useState<{
    station: AdminOverviewData['liveStations'][0];
    resource?: GamingResource;
  } | null>(null);
  const [stationDrawerTab, setStationDrawerTab] = useState<'availability' | 'upcoming'>('availability');
  const [stationDetailDate, setStationDetailDate] = useState<string>(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [stationSlots, setStationSlots] = useState<TimeSlot[]>([]);
  const [stationOperatingHours, setStationOperatingHours] = useState<{ open: string; close: string }>({
    open: '11:00',
    close: '23:00',
  });
  const [stationBookings, setStationBookings] = useState<Booking[]>([]);
  const [stationAllUpcomingBookings, setStationAllUpcomingBookings] = useState<Booking[]>([]);
  const [stationDetailLoading, setStationDetailLoading] = useState<boolean>(false);
  const [stationDetailError, setStationDetailError] = useState<string | null>(null);
  const [stationActionLoadingId, setStationActionLoadingId] = useState<string | null>(null);

  const selectedStationDetailRef = React.useRef(selectedStationDetail);
  selectedStationDetailRef.current = selectedStationDetail;
  const stationDetailDateRef = React.useRef(stationDetailDate);
  stationDetailDateRef.current = stationDetailDate;

  // Format remaining time in hours & minutes (30 mins per available slot)
  const formatRemainingTime = (availableSlotsCount: number) => {
    const totalMinutes = availableSlotsCount * 30;
    if (totalMinutes <= 0) return '0h 0m';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : '0m'}`;
  };

  // Strictly load live availability and bookings for a specific station unit
  const loadStationDetailData = useCallback(async (resourceId: string, date: string, showSpinner = true) => {
    if (!passcode) return;
    if (showSpinner) setStationDetailLoading(true);
    setStationDetailError(null);

    try {
      const todayKolkata = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      // Parallel fetch for: 30-min slot availability, day bookings for this resource, and all upcoming bookings for this resource
      const [availData, dayBookings, allResBookings] = await Promise.all([
        bookingApi.getAvailability(resourceId, date, 30),
        bookingApi.getAdminBookings(passcode, { resourceId, date }),
        bookingApi.getAdminBookings(passcode, { resourceId }),
      ]);

      setStationSlots(availData.slots || []);
      if (availData.operatingHours) {
        setStationOperatingHours(availData.operatingHours);
      }

      // STRICT SCOPING GUARANTEE: Equipment A will NEVER show Equipment B's bookings
      const scopedDayBookings = (dayBookings || []).filter((b) => b.resourceId === resourceId);
      setStationBookings(scopedDayBookings);

      const scopedUpcoming = (allResBookings || [])
        .filter((b) => b.resourceId === resourceId && b.date >= todayKolkata && b.status !== 'cancelled')
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.startTime.localeCompare(b.startTime);
        });
      setStationAllUpcomingBookings(scopedUpcoming);
    } catch (err: any) {
      console.error('Failed to load live station details:', err);
      setStationDetailError(err.message || 'Failed to load station availability and bookings.');
    } finally {
      if (showSpinner) setStationDetailLoading(false);
    }
  }, [passcode]);

  // Open Station Inspector Drawer
  const handleOpenStationDetails = (station: AdminOverviewData['liveStations'][0], resource?: GamingResource) => {
    const todayKolkata = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    setSelectedStationDetail({ station, resource });
    setStationDrawerTab('availability');
    setStationDetailDate(todayKolkata);
    loadStationDetailData(station.id, todayKolkata, true);
  };

  // Change Inspection Date
  const handleStationDetailDateChange = (newDate: string) => {
    setStationDetailDate(newDate);
    if (selectedStationDetailRef.current) {
      loadStationDetailData(selectedStationDetailRef.current.station.id, newDate, true);
    }
  };

  // Fast Switch between Stations in Drawer
  const handleSwitchStationDetail = (targetStationId: string) => {
    const targetStation = overview?.liveStations.find((s) => s.id === targetStationId);
    if (!targetStation) return;
    const matched = resources.find((r) => r.id === targetStation.id);
    setSelectedStationDetail({ station: targetStation, resource: matched });
    loadStationDetailData(targetStation.id, stationDetailDateRef.current, true);
  };

  // Start Play Session inside Station Drawer
  const handleStationDrawerStartPlay = async (booking: Booking) => {
    if (!passcode || stationActionLoadingId) return;
    if (!window.confirm(`Start live gaming session for #${booking.id} (${booking.customerName}) on ${selectedStationDetail?.station.name || 'station'}?`)) return;

    setStationActionLoadingId(booking.id);
    try {
      await bookingApi.startSession(passcode, booking.id);
      setActionFeedback({ type: 'success', message: `Play session started for ${booking.customerName}!` });
      await Promise.all([
        loadDashboard(passcode),
        selectedStationDetailRef.current ? loadStationDetailData(selectedStationDetailRef.current.station.id, stationDetailDateRef.current, false) : Promise.resolve(),
      ]);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to start gaming session.' });
    } finally {
      setStationActionLoadingId(null);
    }
  };

  // End Play Session inside Station Drawer
  const handleStationDrawerEndPlay = async (booking: Booking) => {
    if (!passcode || stationActionLoadingId) return;
    if (!window.confirm(`End live gaming session for #${booking.id} (${booking.customerName})? Actual play duration will be recorded.`)) return;

    setStationActionLoadingId(booking.id);
    try {
      const res = await bookingApi.endSession(passcode, booking.id);
      setActionFeedback({
        type: 'success',
        message: `Play session completed for ${booking.customerName}. Actual play: ${res.actualPlayDurationMinutes || 0} mins.`,
      });
      await Promise.all([
        loadDashboard(passcode),
        selectedStationDetailRef.current ? loadStationDetailData(selectedStationDetailRef.current.station.id, stationDetailDateRef.current, false) : Promise.resolve(),
      ]);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to end gaming session.' });
    } finally {
      setStationActionLoadingId(null);
    }
  };

  // Deep Links & Notification Redirection
  useEffect(() => {
    if (targetBookingId) {
      setSelectedTab('stations');
      setSearchQuery(targetBookingId);
    } else if (targetType === 'dining' || targetType === 'event' || targetType === 'events') {
      setSelectedTab('reservations');
    } else if (targetType === 'tournament') {
      setSelectedTab('tournaments');
    }
  }, [targetBookingId, targetType, targetRef]);

  // Listen for service worker notification click navigation events
  useEffect(() => {
    const handleSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'GIOCASA_NOTIFICATION_NAVIGATE') {
        const { data } = e.data;
        if (data?.type === 'booking' && data.reference) {
          setSelectedTab('stations');
          setSearchQuery(data.reference);
        } else if (data?.type === 'dining' || data?.type === 'event') {
          setSelectedTab('reservations');
        } else if (data?.type === 'tournament') {
          setSelectedTab('tournaments');
        }
      }
    };
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, []);

  // PWA installation for authenticated staff
  const [pwaInstallAvailable, setPwaInstallAvailable] = useState<boolean>(() => canInstallPwa());
  const [showPwaInstallModal, setShowPwaInstallModal] = useState<boolean>(false);

  useEffect(() => {
    return subscribeToPwaState(() => {
      setPwaInstallAvailable(canInstallPwa());
    });
  }, []);

  const handleStaffPwaInstall = async () => {
    const res = await triggerPwaInstall();
    if (res.outcome === 'unsupported') {
      setShowPwaInstallModal(true);
    }
  };

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

      // Keep Station Detail drawer live synced if open
      if (selectedStationDetailRef.current) {
        const curId = selectedStationDetailRef.current.station.id;
        const curDate = stationDetailDateRef.current;
        const updatedStation = ovData.liveStations.find((s) => s.id === curId);
        const updatedRes = resData.find((r) => r.id === curId);
        if (updatedStation) {
          setSelectedStationDetail({ station: updatedStation, resource: updatedRes });
        }
        await loadStationDetailData(curId, curDate, false);
      }
      setIsAuthenticated(true);
      sessionStorage.setItem('giocasa_admin_token', code);
      // Clean up plaintext legacy storage
      localStorage.removeItem('giocasa_admin_passcode');
    } catch (err: any) {
      setIsAuthenticated(false);
      // Clear any stale token so the login form is shown immediately
      sessionStorage.removeItem('giocasa_admin_token');
      sessionStorage.removeItem('giocasa_admin_passcode');
      localStorage.removeItem('giocasa_admin_passcode');
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
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized') || err?.message?.includes('Session expired')) {
        // Clear the stale token immediately so we stop sending dead requests
        sessionStorage.removeItem('giocasa_admin_token');
        sessionStorage.removeItem('giocasa_admin_passcode');
        localStorage.removeItem('giocasa_admin_passcode');
        setPasscode('');
        setIsAuthenticated(false);
        setAuthError('Session expired. Please log in again.');
      }
      throw err;
    }
  }, [passcode, isAuthenticated, showManualModal, loadStationDetailData]);

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
      // The server changes the passcode, increments the session version (revoking all
      // other devices), and returns a fresh token for the current device.
      const result = await bookingApi.changeAdminPasscode(currentPasscodeInput.trim(), newPasscodeInput.trim());
      const freshToken = result.data?.token;
      if (freshToken) {
        // Save the fresh token so this device stays logged in without re-authenticating
        setPasscode(freshToken);
        sessionStorage.setItem('giocasa_admin_token', freshToken);
        localStorage.removeItem('giocasa_admin_passcode');
      }
      setPasscodeModalSuccess('Admin passcode updated. All other devices have been logged out.');
      setTimeout(() => {
        setShowPasscodeModal(false);
        setCurrentPasscodeInput('');
        setNewPasscodeInput('');
        setConfirmPasscodeInput('');
        setPasscodeModalSuccess(null);
      }, 2000);
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
      await loadDashboard(passcode);
      if (selectedStationDetailRef.current && selectedStationDetailRef.current.station.id === resource.id) {
        await loadStationDetailData(resource.id, stationDetailDateRef.current, false);
      }
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

  const timeToMins = (t: string): number => {
    const [h, m] = (t || '0:0').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const minsToTime = (mins: number): string => {
    const totalMinutes = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Start Play (Session Control - Requirement 3)
  const handleStartPlay = async (booking: Booking) => {
    if (actionLoading) return;
    if (!window.confirm(`Start live gaming session for #${booking.id} (${booking.customerName})?`)) return;

    setActionLoading(true);
    setActionFeedback(null);
    try {
      await bookingApi.startSession(passcode, booking.id);
      await loadDashboard(passcode);
      setActionFeedback({ type: 'success', message: `Gaming session started for #${booking.id}! Station marked active.` });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to start gaming session.' });
    } finally {
      setActionLoading(false);
    }
  };

  // End Play (Session Control - Requirement 3)
  const handleEndPlay = async (booking: Booking) => {
    if (actionLoading) return;
    if (!window.confirm(`End active gaming session for #${booking.id} (${booking.customerName})? This will record actual duration.`)) return;

    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await bookingApi.endSession(passcode, booking.id);
      await loadDashboard(passcode);
      setActionFeedback({
        type: 'success',
        message: `Gaming session completed for #${booking.id}. Actual play: ${res.actualPlayDurationMinutes || 0} mins.`,
      });
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to end gaming session.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Booking Modal
  const handleOpenEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setEditError(null);
    setEditForm({
      customerName: booking.customerName || '',
      phone: booking.phone || '',
      email: booking.email || '',
      resourceId: booking.resourceId || '',
      date: booking.date || '',
      startTime: booking.startTime || '',
      endTime: booking.endTime || '',
      durationMinutes: booking.durationMinutes || 60,
      totalAmount: booking.totalAmount || 0,
      paymentStatus: (booking.paymentStatus as any) || 'unpaid',
      paymentMethod: (booking.paymentMethod as any) || 'cash',
      paymentReference: booking.paymentReference || '',
      status: (booking.status as any) || 'confirmed',
      notes: booking.notes || '',
    });
  };

  // Recalculate price in Edit Modal
  const handleRecalculateEditPrice = () => {
    const res = resources.find(r => r.id === editForm.resourceId);
    if (!res) return;
    const startM = timeToMins(editForm.startTime);
    const endM = timeToMins(editForm.endTime);
    const duration = endM > startM ? endM - startM : editForm.durationMinutes;
    const calcCost = calculateBookingPrice(res.category, duration, editingBooking?.numberOfPeople || 1, res.ratePerHour);
    setEditForm(prev => ({
      ...prev,
      durationMinutes: duration,
      totalAmount: calcCost,
    }));
  };

  // Save Booking Edits
  const handleSaveEditBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    const startM = timeToMins(editForm.startTime);
    const endM = timeToMins(editForm.endTime);
    if (endM <= startM) {
      setEditError('End time must be strictly after start time.');
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    try {
      await bookingApi.editBooking(passcode, editingBooking.id, {
        ...editForm,
        durationMinutes: endM - startM,
      });
      setEditingBooking(null);
      await loadDashboard(passcode);
      if (selectedStationDetailRef.current) {
        await loadStationDetailData(selectedStationDetailRef.current.station.id, stationDetailDateRef.current, false);
      }
      setActionFeedback({ type: 'success', message: `Booking #${editingBooking.id} updated successfully!` });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update booking. Please verify timing conflicts.');
    } finally {
      setEditSubmitting(false);
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
      if (selectedStationDetailRef.current) {
        loadStationDetailData(selectedStationDetailRef.current.station.id, stationDetailDateRef.current, false);
      }
      setManualForm({
        customerName: '',
        phone: '',
        resourceId: resources[0]?.id || '',
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        startTime: '14:00',
        endTime: '',
        durationMinutes: 60,
        numberOfPeople: 1,
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
    <div className="min-h-screen bg-brand-dark text-brand-cream pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6 pb-24 px-4 sm:px-6 lg:px-8">
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
                setSelectedTab('contact');
                onNavigate('admin', { adminTab: 'contact' });
              }}
              className="px-3.5 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-gold/50 text-brand-subtle hover:text-brand-cream text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Configure Web Push Notifications & Devices"
            >
              <Bell className="w-3.5 h-3.5 text-brand-gold" />
              <span className="hidden sm:inline">Push Alerts</span>
            </button>

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

            {!isStandaloneApp() && (
              <button
                type="button"
                onClick={handleStaffPwaInstall}
                className="px-4 py-2 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-brand-cream text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Install GioCasa Staff App on this device"
              >
                <Download className="w-3.5 h-3.5 text-brand-gold" />
                <span className="hidden sm:inline">Install GioCasa Staff App</span>
              </button>
            )}

            <button
              onClick={() => {
                setSelectedTab('verify');
                onNavigate('admin', { adminTab: 'verify' });
              }}
              className="px-4 py-2.5 rounded-xl bg-brand-gold/15 hover:bg-brand-gold/25 border border-brand-gold/60 text-brand-gold text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all active:scale-[0.99]"
            >
              <ShieldCheck className="w-4 h-4 text-brand-gold" />
              <span>Verify Guest</span>
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
              setSelectedTab('verify');
              onNavigate('admin', { adminTab: 'verify' });
            }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedTab === 'verify'
                ? 'border-brand-gold text-brand-gold font-bold bg-brand-surface/40 rounded-t-xl'
                : 'border-transparent text-brand-subtle hover:text-brand-cream hover:border-brand-border'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-brand-gold" />
            <span>Verify Guest (4-Digit)</span>
          </button>

          <button
            onClick={() => {
              setSelectedTab('games');
              onNavigate('admin', { adminTab: 'games' });
            }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedTab === 'games'
                ? 'border-brand-pink text-brand-pink font-bold bg-brand-surface/40 rounded-t-xl'
                : 'border-transparent text-brand-subtle hover:text-brand-cream hover:border-brand-border'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-brand-pink" />
            <span>Gaming Wall (14 Titles)</span>
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

          <button
            onClick={() => {
              setSelectedTab('contact');
              onNavigate('admin', { adminTab: 'contact' });
            }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedTab === 'contact'
                ? 'border-[#25D366] text-[#25D366] font-bold bg-brand-surface/40 rounded-t-xl'
                : 'border-transparent text-brand-subtle hover:text-brand-cream hover:border-brand-border'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-[#25D366]" />
            <span>Contact Settings & Alerts</span>
          </button>

          <button
            onClick={() => {
              setSelectedTab('equipment');
              onNavigate('admin', { adminTab: 'equipment' });
            }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedTab === 'equipment'
                ? 'border-brand-blue text-brand-blue font-bold bg-brand-surface/40 rounded-t-xl'
                : 'border-transparent text-brand-subtle hover:text-brand-cream hover:border-brand-border'
            }`}
          >
            <Layers className="w-4 h-4 text-brand-blue" />
            <span>Equipment & Games</span>
          </button>

          <button
            onClick={() => {
              setSelectedTab('reservations');
              onNavigate('admin', { adminTab: 'reservations' });
            }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedTab === 'reservations'
                ? 'border-brand-orange text-brand-orange font-bold bg-brand-surface/40 rounded-t-xl'
                : 'border-transparent text-brand-subtle hover:text-brand-cream hover:border-brand-border'
            }`}
          >
            <Utensils className="w-4 h-4 text-brand-orange" />
            <span>Dining & Events</span>
          </button>

          <button
            onClick={() => {
              setSelectedTab('media');
              onNavigate('admin', { adminTab: 'media' });
            }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedTab === 'media'
                ? 'border-brand-gold text-brand-gold font-bold bg-brand-surface/40 rounded-t-xl'
                : 'border-transparent text-brand-subtle hover:text-brand-cream hover:border-brand-border'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-brand-gold" />
            <span>Media & Menu Images</span>
          </button>

          <button
            onClick={() => {
              setSelectedTab('hero');
              onNavigate('admin', { adminTab: 'hero' });
            }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedTab === 'hero'
                ? 'border-brand-gold text-brand-gold font-bold bg-brand-surface/40 rounded-t-xl'
                : 'border-transparent text-brand-subtle hover:text-brand-cream hover:border-brand-border'
            }`}
          >
            <Sliders className="w-4 h-4 text-brand-gold" />
            <span>Hero Carousel</span>
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
                  onClick={() => handleOpenStationDetails(station, matchedResource)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenStationDetails(station, matchedResource);
                    }
                  }}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all cursor-pointer group hover:border-brand-gold/60 hover:shadow-luxury-gold/10 hover:scale-[1.01] active:scale-[0.99] ${
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
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-lg font-bold text-brand-cream group-hover:text-brand-gold transition-colors">
                          {station.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-surfaceElevated border border-brand-border/60 text-brand-subtle">
                          {station.id}
                        </span>
                      </div>
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

                  {/* Maintenance Toggle Button & Inspector Link */}
                  <div className="space-y-2 pt-4 mt-3 border-t border-brand-border/40">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-brand-subtle text-[11px]">
                        {matchedResource ? getPricingDescription(matchedResource.category) : 'Standard Rate'}
                      </span>

                      {matchedResource && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleMaintenance(matchedResource);
                          }}
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

                    <div className="pt-2 border-t border-brand-border/30 flex items-center justify-between text-[11px] font-mono text-brand-gold group-hover:text-brand-goldHover">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Live Slots & Bookings
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
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
                            {formatTime12(b.startTime)} – {formatTime12(b.endTime || '')}
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
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {/* Start Play button (Requirement 3) */}
                          {(b.status === 'confirmed' || (b.status === 'pending' && !b.actualStartTime)) && (
                            <button
                              onClick={() => handleStartPlay(b)}
                              disabled={actionLoading}
                              title="Start gaming session (records actual start time & marks active)"
                              className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 hover:bg-emerald-900 text-[10px] font-semibold transition-all inline-flex items-center gap-1 active:scale-95 cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Start Play</span>
                            </button>
                          )}

                          {/* End Play button (Requirement 3) */}
                          {(b.status === 'active' || (b.actualStartTime && b.status !== 'completed' && b.status !== 'cancelled')) && (
                            <button
                              onClick={() => handleEndPlay(b)}
                              disabled={actionLoading}
                              title="End active gaming session (records end time & calculates actual duration)"
                              className="px-2.5 py-1 rounded bg-amber-950 border border-amber-600 text-amber-300 hover:bg-amber-900 text-[10px] font-semibold transition-all inline-flex items-center gap-1 active:scale-95 cursor-pointer animate-pulse"
                            >
                              <Square className="w-3 h-3 fill-current" />
                              <span>End Play</span>
                            </button>
                          )}

                          {/* Edit Booking button (Requirement 3) */}
                          <button
                            onClick={() => handleOpenEditBooking(b)}
                            title="Edit customer, timing, price, status, or notes"
                            className="p-1.5 rounded bg-brand-surfaceElevated border border-brand-border text-brand-gold hover:text-white hover:border-brand-gold transition-colors inline-flex items-center align-middle cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

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
                            className="p-1 rounded bg-stone-900/60 border border-stone-800 text-stone-400 hover:text-red-400 hover:border-red-900/60 hover:bg-red-950/40 transition-colors inline-flex items-center align-middle cursor-pointer"
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

    {/* 4-DIGIT GUEST VERIFICATION & FRONT DESK CHECK-IN */}
    {selectedTab === 'verify' && (
      <AdminGuestVerification
        passcode={passcode}
        adminUser="GioCasa Admin"
      />
    )}

    {/* GAMING WALL CATALOGUE MANAGER */}
    {selectedTab === 'games' && (
      <AdminGamesManager
        passcode={passcode}
      />
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

    {/* CONTACT & WHATSAPP SETTINGS */}
    {selectedTab === 'contact' && (
      <AdminContactSettings
        passcode={passcode}
      />
    )}

    {/* EQUIPMENT & GAMES MANAGER */}
    {selectedTab === 'equipment' && (
      <AdminEquipmentManager
        passcode={passcode}
        onRefreshData={() => loadDashboard(passcode)}
      />
    )}

    {/* DINING & EVENTS RESERVATIONS MANAGER */}
    {selectedTab === 'reservations' && (
      <AdminReservationsManager
        passcode={passcode}
      />
    )}

    {/* MEDIA & MENU DISHES MANAGER (CLOUDINARY) */}
    {selectedTab === 'media' && (
      <AdminMediaManager
        passcode={passcode}
      />
    )}

    {/* HERO CAROUSEL MANAGER */}
    {selectedTab === 'hero' && (
      <AdminHeroCarouselManager
        passcode={passcode}
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

        {/* LIVE STATION DETAILS & AVAILABILITY DRAWER (Requirement 10) */}
        {selectedStationDetail && (() => {
          const categoryUnits = resources.filter(
            (r) => r.category === (selectedStationDetail.resource?.category || selectedStationDetail.station.category)
          );
          const totalCategoryCount = categoryUnits.length || 1;
          const unitIndex =
            categoryUnits.findIndex((r) => r.id === selectedStationDetail.station.id) + 1 ||
            1;
          const arenaTotalUnits = overview?.liveStations.length || resources.length || 1;
          const arenaUnitIndex =
            (overview?.liveStations.findIndex((s) => s.id === selectedStationDetail.station.id) ?? -1) + 1 || 1;
          const categoryName = (
            selectedStationDetail.resource?.category ||
            selectedStationDetail.station.category ||
            'Station'
          ).toUpperCase();

          const availableSlots = stationSlots.filter((s) => s.status === 'available');
          const bookedSlots = stationSlots.filter((s) => s.status === 'booked' || s.status === 'unavailable');
          const playingSlots = stationSlots.filter((s) => s.status === 'playing');
          const isTodaySelected =
            stationDetailDate === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

          const renderStationBookingCard = (b: Booking) => {
            const isPlayingNow = b.status === 'active';
            const isActionLoading = stationActionLoadingId === b.id;
            const isTodayBooking =
              b.date === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

            return (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isPlayingNow
                    ? 'bg-amber-950/25 border-amber-600/70 shadow-md'
                    : 'bg-brand-surfaceElevated border-brand-border/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-brand-border/40">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-bold text-base text-brand-cream">
                      {b.customerName}
                    </span>
                    <span className="font-mono text-xs text-brand-gold font-semibold">
                      #{b.id}
                    </span>
                    {b.guestCode && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-brand-gold/15 border border-brand-gold/40 text-brand-gold">
                        Code: {b.guestCode}
                      </span>
                    )}
                    {b.source && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-brand-surface text-brand-subtle border border-brand-border">
                        {b.source}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                        b.status === 'active'
                          ? 'bg-amber-500 text-brand-dark animate-pulse'
                          : b.status === 'confirmed'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                          : b.status === 'completed'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : b.status === 'cancelled'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : 'bg-stone-900 text-brand-subtle border border-brand-border'
                      }`}
                    >
                      {b.status}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        b.paymentStatus === 'paid'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {b.paymentStatus} (₹{b.totalAmount})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-brand-cream font-mono">
                      <Clock className="w-3.5 h-3.5 text-brand-gold" />
                      <span>
                        {b.date} • {formatTime12(b.startTime)} – {formatTime12(b.endTime || '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-brand-subtle font-mono text-[11px]">
                      <Timer className="w-3.5 h-3.5 text-brand-subtle" />
                      <span>
                        Duration: {b.durationMinutes} mins ({Math.round((b.durationMinutes / 60) * 10) / 10}h) • {b.numberOfPeople || 1} Players
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-brand-cream">
                      <Phone className="w-3.5 h-3.5 text-brand-gold" />
                      <a href={`tel:${b.phone}`} className="font-mono text-xs text-brand-gold hover:underline">
                        {b.phone}
                      </a>
                    </div>
                    {b.email && (
                      <div className="text-[11px] text-brand-subtle font-mono truncate">
                        Email: <a href={`mailto:${b.email}`} className="hover:text-brand-cream underline">{b.email}</a>
                      </div>
                    )}
                  </div>
                </div>

                {(b.actualStartTime || b.actualEndTime) && (
                  <div className="mt-3 p-2.5 rounded-xl bg-brand-dark/80 border border-brand-border/60 text-[11px] font-mono text-brand-subtle space-y-0.5">
                    {b.actualStartTime && (
                      <div className="text-amber-300">
                        Session Started: {new Date(b.actualStartTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </div>
                    )}
                    {b.actualEndTime && (
                      <div className="text-blue-300">
                        Session Ended: {new Date(b.actualEndTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} ({b.actualPlayDurationMinutes || 0} mins played)
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-brand-border/40 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {isTodayBooking && (b.status === 'confirmed' || b.status === 'pending') && (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleStationDrawerStartPlay(b)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {isActionLoading ? 'Starting...' : 'Start Play'}
                      </button>
                    )}

                    {b.status === 'active' && (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleStationDrawerEndPlay(b)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-brand-dark font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isActionLoading ? 'Ending...' : 'End Play'}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEditBooking(b)}
                    className="px-3 py-1.5 rounded-lg bg-brand-dark border border-brand-border text-brand-gold hover:text-brand-cream hover:border-brand-gold text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    View / Edit Booking
                  </button>
                </div>
              </div>
            );
          };

          return (
            <div className="fixed inset-0 z-50 overflow-hidden bg-brand-dark/80 backdrop-blur-md flex justify-end animate-fade-in">
              <div
                className="absolute inset-0 cursor-pointer"
                onClick={() => setSelectedStationDetail(null)}
                aria-label="Close station inspector"
              />

              <div
                className="relative z-10 w-full max-w-2xl lg:max-w-3xl h-full bg-brand-surface border-l border-brand-border flex flex-col shadow-2xl overflow-hidden animate-slide-left text-brand-cream"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. Drawer Header */}
                <div className="p-5 sm:p-6 border-b border-brand-border/60 bg-brand-dark/70 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-brand-gold/15 border border-brand-gold/40 flex items-center justify-center text-brand-gold shadow-md shrink-0">
                        <Gamepad2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-serif text-xl sm:text-2xl font-bold text-brand-cream">
                            {selectedStationDetail.station.name}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-brand-surfaceElevated border border-brand-border text-brand-gold">
                            {selectedStationDetail.station.id}
                          </span>
                        </div>
                        <p className="text-xs text-brand-subtle font-mono mt-0.5">
                          Unit {unitIndex} of {totalCategoryCount} ({categoryName}) • Arena Station {arenaUnitIndex} of {arenaTotalUnits}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => loadStationDetailData(selectedStationDetail.station.id, stationDetailDate, true)}
                        disabled={stationDetailLoading}
                        title="Refresh station live data"
                        className="p-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-brand-cream hover:border-brand-gold/50 transition-all cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 ${stationDetailLoading ? 'animate-spin text-brand-gold' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStationDetail(null)}
                        className="p-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-brand-cream hover:border-brand-gold/50 transition-all cursor-pointer"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Status & Maintenance Control */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-brand-border/40">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-brand-subtle font-mono">Status:</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                          selectedStationDetail.station.status === 'playing'
                            ? 'bg-amber-500 text-brand-dark animate-pulse shadow-sm'
                            : selectedStationDetail.station.status === 'reserved'
                            ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/50'
                            : selectedStationDetail.station.status === 'maintenance'
                            ? 'bg-red-950 text-red-200 border border-red-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            selectedStationDetail.station.status === 'playing'
                              ? 'bg-brand-dark'
                              : selectedStationDetail.station.status === 'reserved'
                              ? 'bg-brand-gold'
                              : selectedStationDetail.station.status === 'maintenance'
                              ? 'bg-red-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                        {selectedStationDetail.station.status === 'playing'
                          ? 'In Use (Playing)'
                          : selectedStationDetail.station.status === 'reserved'
                          ? 'Booked'
                          : selectedStationDetail.station.status === 'maintenance'
                          ? 'Maintenance'
                          : 'Available'}
                      </span>

                      {selectedStationDetail.resource && (
                        <button
                          type="button"
                          onClick={() => handleToggleMaintenance(selectedStationDetail.resource!)}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                            selectedStationDetail.resource.isMaintenance
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-600 hover:bg-emerald-900'
                              : 'bg-red-950/60 text-red-400 border border-red-800 hover:bg-red-900'
                          }`}
                        >
                          {selectedStationDetail.resource.isMaintenance ? 'Restore Active' : 'Set Maintenance'}
                        </button>
                      )}
                    </div>

                    <div className="text-xs font-mono text-brand-subtle">
                      Rate: <span className="text-brand-cream font-bold">₹{selectedStationDetail.resource?.ratePerHour || 0}/hr</span>
                    </div>
                  </div>

                  {/* Fast Switcher between Live Stations */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
                    <span className="text-[11px] text-brand-subtle font-mono shrink-0 mr-1">Switch:</span>
                    {overview?.liveStations.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleSwitchStationDetail(st.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer ${
                          st.id === selectedStationDetail.station.id
                            ? 'bg-brand-gold text-brand-dark font-bold shadow-sm'
                            : 'bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-brand-cream hover:border-brand-gold/40'
                        }`}
                      >
                        {st.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Drawer Tabs */}
                <div className="flex border-b border-brand-border bg-brand-surface px-6 pt-3 gap-6 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStationDrawerTab('availability')}
                    className={`pb-3 text-xs sm:text-sm font-serif font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                      stationDrawerTab === 'availability'
                        ? 'border-brand-gold text-brand-gold'
                        : 'border-transparent text-brand-subtle hover:text-brand-cream'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Live Availability & Slots
                  </button>
                  <button
                    type="button"
                    onClick={() => setStationDrawerTab('upcoming')}
                    className={`pb-3 text-xs sm:text-sm font-serif font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                      stationDrawerTab === 'upcoming'
                        ? 'border-brand-gold text-brand-gold'
                        : 'border-transparent text-brand-subtle hover:text-brand-cream'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    All Upcoming Bookings ({stationAllUpcomingBookings.length})
                  </button>
                </div>

                {/* 3. Drawer Body */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                  {stationDetailError && (
                    <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{stationDetailError}</span>
                    </div>
                  )}

                  {stationDrawerTab === 'availability' ? (
                    <>
                      {/* Date Picker & Presets */}
                      <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              Inspect Date Availability
                            </h4>
                            <p className="text-[11px] text-brand-subtle mt-0.5">
                              Viewing {new Date(stationDetailDate + 'T12:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                            </p>
                          </div>
                          <input
                            type="date"
                            value={stationDetailDate}
                            onChange={(e) => handleStationDetailDateChange(e.target.value)}
                            className="bg-brand-dark border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-cream font-mono focus:outline-none focus:border-brand-gold"
                          />
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-brand-border/40">
                          <span className="text-[11px] text-brand-subtle font-mono">Quick Jump:</span>
                          {[
                            { label: 'Today', offset: 0 },
                            { label: 'Tomorrow', offset: 1 },
                            { label: '+2 Days', offset: 2 },
                            { label: '+7 Days', offset: 7 },
                          ].map((preset) => {
                            const d = new Date();
                            d.setDate(d.getDate() + preset.offset);
                            const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                            const isSelected = stationDetailDate === dateStr;
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => handleStationDetailDateChange(dateStr)}
                                className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-gold text-brand-dark font-bold'
                                    : 'bg-brand-dark border border-brand-border/60 text-brand-subtle hover:text-brand-cream hover:border-brand-gold/30'
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4 Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-2xl bg-brand-surfaceElevated border border-emerald-900/50 space-y-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center justify-between">
                            <span>Available</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                          <div className="text-2xl font-serif font-bold text-emerald-400">
                            {availableSlots.length}
                          </div>
                          <div className="text-[10px] text-brand-subtle font-mono">30-min open slots</div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-brand-surfaceElevated border border-brand-gold/30 space-y-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-brand-gold font-semibold flex items-center justify-between">
                            <span>Booked</span>
                            <Clock className="w-3.5 h-3.5 text-brand-gold" />
                          </div>
                          <div className="text-2xl font-serif font-bold text-brand-gold">
                            {bookedSlots.length}
                          </div>
                          <div className="text-[10px] text-brand-subtle font-mono">Reserved slots</div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-brand-surfaceElevated border border-amber-800/40 space-y-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center justify-between">
                            <span>Active</span>
                            <Activity className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                          <div className="text-2xl font-serif font-bold text-amber-400">
                            {stationBookings.filter((b) => b.status === 'active').length ||
                              (isTodaySelected && selectedStationDetail.station.status === 'playing' ? 1 : 0)}
                          </div>
                          <div className="text-[10px] text-brand-subtle font-mono">In use right now</div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-brand-cream font-semibold flex items-center justify-between">
                            <span>Remaining</span>
                            <Timer className="w-3.5 h-3.5 text-brand-gold" />
                          </div>
                          <div className="text-2xl font-serif font-bold text-brand-cream">
                            {formatRemainingTime(availableSlots.length)}
                          </div>
                          <div className="text-[10px] text-brand-subtle font-mono">Free capacity</div>
                        </div>
                      </div>

                      {/* 30-Minute Slot Visualizer */}
                      <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-cream">
                              30-Minute Slots ({stationOperatingHours.open} – {stationOperatingHours.close})
                            </h4>
                            {stationDetailLoading && <RefreshCw className="w-3 h-3 text-brand-gold animate-spin" />}
                          </div>

                          <div className="flex items-center gap-3 text-[10px] font-mono text-brand-subtle flex-wrap">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Available
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-400" /> In Use
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-brand-gold" /> Booked
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-400" /> Maintenance
                            </span>
                          </div>
                        </div>

                        {stationSlots.length === 0 ? (
                          <div className="py-6 text-center text-xs text-brand-subtle font-mono">
                            {stationDetailLoading ? 'Loading slot availability...' : 'No slots generated for this date.'}
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2">
                            {stationSlots.map((slot) => {
                              const isAvailable = slot.status === 'available';
                              const isPlaying = slot.status === 'playing';
                              const isUnavailable = slot.status === 'unavailable';
                              const isBooked = slot.status === 'booked';

                              return (
                                <div
                                  key={slot.startTime}
                                  className={`p-2 rounded-xl border text-center transition-all ${
                                    isPlaying
                                      ? 'bg-amber-950/40 border-amber-500 text-amber-300 font-bold shadow-sm'
                                      : isUnavailable
                                      ? 'bg-red-950/30 border-red-800 text-red-300'
                                      : isBooked
                                      ? 'bg-brand-dark/90 border-brand-gold/40 text-brand-gold font-medium'
                                      : 'bg-emerald-950/30 border-emerald-700/60 text-emerald-300 hover:border-emerald-500'
                                  }`}
                                >
                                  <div className="font-mono text-xs font-semibold">{formatTime12(slot.startTime)}</div>
                                  <div className="text-[9px] font-mono uppercase tracking-wider opacity-80 mt-0.5">
                                    {isPlaying ? 'In Use' : isUnavailable ? 'Blocked' : isBooked ? 'Booked' : 'Free'}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Bookings for Selected Date */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            Scheduled Bookings for {stationDetailDate} ({stationBookings.length})
                          </h4>
                          <span className="text-[11px] font-mono text-brand-subtle">
                            Strictly scoped to #{selectedStationDetail.station.id}
                          </span>
                        </div>

                        {stationBookings.length === 0 ? (
                          <div className="p-6 rounded-2xl bg-brand-surfaceElevated border border-dashed border-brand-border text-center space-y-1.5">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                            <p className="text-sm font-semibold text-brand-cream">No Bookings Scheduled</p>
                            <p className="text-xs text-brand-subtle">This station is 100% available throughout this date.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {stationBookings.map((b) => renderStationBookingCard(b))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* All Upcoming Bookings Tab */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          All Upcoming Bookings for #{selectedStationDetail.station.id} ({stationAllUpcomingBookings.length})
                        </h4>
                        <span className="text-[11px] font-mono text-brand-subtle">
                          Chronological schedule
                        </span>
                      </div>

                      {stationAllUpcomingBookings.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-brand-surfaceElevated border border-dashed border-brand-border text-center space-y-1.5">
                          <Calendar className="w-8 h-8 text-brand-gold mx-auto" />
                          <p className="text-sm font-semibold text-brand-cream">No Future Bookings Found</p>
                          <p className="text-xs text-brand-subtle">There are no upcoming reservations on this station.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {stationAllUpcomingBookings.map((b) => renderStationBookingCard(b))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Drawer Footer */}
                <div className="p-4 px-6 border-t border-brand-border/60 bg-brand-dark/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
                  <div className="flex items-center gap-2 text-brand-subtle font-mono text-[11px]">
                    <Lock className="w-3.5 h-3.5 text-brand-gold" />
                    <span>MongoDB Scoped: <code className="text-brand-cream font-bold">{selectedStationDetail.station.id}</code></span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setManualForm((prev) => ({
                          ...prev,
                          resourceId: selectedStationDetail.station.id,
                          date: stationDetailDate,
                        }));
                        setShowManualModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-brand-gold/15 border border-brand-gold/50 text-brand-gold hover:bg-brand-gold hover:text-brand-dark font-mono text-xs font-bold transition-all cursor-pointer"
                    >
                      + Add Manual Booking
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStationDetail(null)}
                      className="px-4 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-brand-cream font-mono text-xs transition-all cursor-pointer"
                    >
                      Close Inspector
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* EDIT BOOKING MODAL (Requirement 3) */}
        {editingBooking && (
          <div className="fixed inset-0 z-[60] bg-brand-dark/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-5 sm:p-8 max-w-xl w-full space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto my-auto">
              <div className="flex items-center justify-between pb-3 border-b border-brand-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-gold/15 border border-brand-gold/40 flex items-center justify-center text-brand-gold">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-brand-cream">
                      Edit Booking #{editingBooking.id}
                    </h3>
                    <p className="text-[11px] text-brand-subtle">
                      Created via {editingBooking.source || 'web'} • Code: {editingBooking.guestCode || 'None'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="text-brand-subtle hover:text-brand-cream p-1 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-700 text-xs text-red-200">
                  {editError}
                </div>
              )}

              <form onSubmit={handleSaveEditBooking} className="space-y-4 text-xs">
                {/* 1. Customer Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-subtle block mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={editForm.customerName}
                      onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="text-brand-subtle block mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream font-mono focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-brand-subtle block mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream focus:outline-none focus:border-brand-gold"
                  />
                </div>

                {/* 2. Equipment Station & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-subtle block mb-1">Equipment / Station *</label>
                    <select
                      value={editForm.resourceId}
                      onChange={(e) => setEditForm({ ...editForm, resourceId: e.target.value })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream focus:outline-none focus:border-brand-gold"
                    >
                      {resources.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-brand-subtle block mb-1">Booking Date *</label>
                    <input
                      type="date"
                      required
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream font-mono focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                {/* 3. Timing: Start Time, End Time & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-brand-subtle block mb-1">Start Time *</label>
                    <input
                      type="time"
                      required
                      value={editForm.startTime}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream font-mono focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="text-brand-subtle block mb-1">End Time *</label>
                    <input
                      type="time"
                      required
                      value={editForm.endTime}
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream font-mono focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="text-brand-subtle block mb-1">Duration (Mins)</label>
                    <input
                      type="number"
                      value={
                        timeToMins(editForm.endTime) > timeToMins(editForm.startTime)
                          ? timeToMins(editForm.endTime) - timeToMins(editForm.startTime)
                          : editForm.durationMinutes
                      }
                      readOnly
                      className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-brand-subtle font-mono"
                    />
                  </div>
                </div>

                {/* 4. Price & Recalculate helper */}
                <div className="p-3 rounded-xl bg-brand-surfaceElevated/50 border border-brand-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-brand-subtle font-semibold">Total Price (INR)</label>
                    <button
                      type="button"
                      onClick={handleRecalculateEditPrice}
                      className="px-2.5 py-1 rounded-lg bg-brand-blue/20 border border-brand-blue/50 text-brand-blue hover:bg-brand-blue hover:text-white text-[11px] font-semibold transition-all cursor-pointer"
                    >
                      ⚡ Recalculate from Rules
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-brand-cream font-mono text-sm">₹</span>
                    <input
                      type="number"
                      required
                      value={editForm.totalAmount}
                      onChange={(e) => setEditForm({ ...editForm, totalAmount: Number(e.target.value) })}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-brand-gold font-mono font-bold text-sm focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                {/* 5. Booking & Payment Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-subtle block mb-1">Booking Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream focus:outline-none focus:border-brand-gold"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="active">Active (Playing Now)</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-brand-subtle block mb-1">Payment Status</label>
                    <select
                      value={editForm.paymentStatus}
                      onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value as any })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream focus:outline-none focus:border-brand-gold"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>

                {/* 6. Payment Method & Ref */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-subtle block mb-1">Payment Method</label>
                    <select
                      value={editForm.paymentMethod}
                      onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value as any })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream focus:outline-none focus:border-brand-gold"
                    >
                      <option value="cash">Cash at Counter</option>
                      <option value="upi">UPI / QR Code</option>
                      <option value="card">Card / POS</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-brand-subtle block mb-1">Payment Reference / UTR</label>
                    <input
                      type="text"
                      placeholder="e.g. UPI-12345678"
                      value={editForm.paymentReference}
                      onChange={(e) => setEditForm({ ...editForm, paymentReference: e.target.value })}
                      className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream font-mono focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                {/* 7. Admin Notes */}
                <div>
                  <label className="text-brand-subtle block mb-1">Admin Notes</label>
                  <textarea
                    rows={2}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Internal staff notes, player requests, adjustments..."
                    className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-brand-cream resize-none focus:outline-none focus:border-brand-gold"
                  />
                </div>

                {/* Session Timestamps Display (Read-Only) */}
                {editingBooking.actualStartTime && (
                  <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-[11px] font-mono text-amber-300">
                    <div>Session Started: {new Date(editingBooking.actualStartTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                    {editingBooking.actualEndTime && (
                      <div>Session Ended: {new Date(editingBooking.actualEndTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} ({editingBooking.actualPlayDurationMinutes || 0} mins)</div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2 border-t border-brand-border/40">
                  <button
                    type="button"
                    onClick={() => setEditingBooking(null)}
                    className="px-4 py-2.5 rounded-xl border border-brand-border text-brand-subtle hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-brand-gold text-brand-dark font-bold uppercase tracking-wider hover:bg-brand-gold/90 transition-all cursor-pointer"
                  >
                    {editSubmitting ? 'Saving Changes...' : 'Save & Update Booking'}
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
