import React, { useState, useEffect, useCallback } from 'react';
import { DiningReservation, EventReservation, ReservationStatus } from '../../types';
import { reservationApi } from '../../services/reservationApi';
import {
  Utensils,
  PartyPopper,
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  RefreshCw,
  MessageCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock3,
  Trash2,
  Edit3,
  Building,
  Phone,
  Mail,
  FileText,
  DollarSign,
  Sparkles,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface AdminReservationsManagerProps {
  passcode: string;
}

export const AdminReservationsManager: React.FC<AdminReservationsManagerProps> = ({ passcode }) => {
  const [activeSubTab, setActiveSubTab] = useState<'dining' | 'events'>('dining');

  // Dining state
  const [diningList, setDiningList] = useState<DiningReservation[]>([]);
  const [diningMetrics, setDiningMetrics] = useState({ total: 0, pending: 0, confirmed: 0 });
  const [loadingDining, setLoadingDining] = useState(false);

  // Event state
  const [eventList, setEventList] = useState<EventReservation[]>([]);
  const [eventMetrics, setEventMetrics] = useState({ total: 0, pending: 0, confirmed: 0 });
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Common filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Notes editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Delete confirmation state
  const [deletingItem, setDeletingItem] = useState<{ id: string; ref: string; type: 'dining' | 'events' } | null>(null);

  // Fetch Dining Reservations
  const fetchDining = useCallback(async () => {
    setLoadingDining(true);
    setActionError(null);
    try {
      const data = await reservationApi.getAdminDiningReservations(passcode, {
        status: statusFilter,
        date: dateFilter,
        search: searchQuery
      });
      setDiningList(data.reservations || []);
      setDiningMetrics(data.metrics || { total: 0, pending: 0, confirmed: 0 });
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch dining reservations');
    } finally {
      setLoadingDining(false);
    }
  }, [passcode, statusFilter, dateFilter, searchQuery]);

  // Fetch Event Reservations
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setActionError(null);
    try {
      const data = await reservationApi.getAdminEventReservations(passcode, {
        status: statusFilter,
        date: dateFilter,
        search: searchQuery
      });
      setEventList(data.reservations || []);
      setEventMetrics(data.metrics || { total: 0, pending: 0, confirmed: 0 });
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch event enquiries');
    } finally {
      setLoadingEvents(false);
    }
  }, [passcode, statusFilter, dateFilter, searchQuery]);

  useEffect(() => {
    if (activeSubTab === 'dining') {
      fetchDining();
    } else {
      fetchEvents();
    }
  }, [activeSubTab, fetchDining, fetchEvents]);

  // Update Status Action
  const handleUpdateStatus = async (id: string, type: 'dining' | 'events', newStatus: ReservationStatus) => {
    setActionError(null);
    try {
      if (type === 'dining') {
        await reservationApi.updateDiningReservation(id, { status: newStatus }, passcode);
        await fetchDining();
      } else {
        await reservationApi.updateEventReservation(id, { status: newStatus }, passcode);
        await fetchEvents();
      }
    } catch (err: any) {
      setActionError(err.message || `Failed to update reservation status to ${newStatus}`);
    }
  };

  // Save Note Action
  const handleSaveNote = async (id: string, type: 'dining' | 'events') => {
    setIsSavingNote(true);
    setActionError(null);
    try {
      if (type === 'dining') {
        await reservationApi.updateDiningReservation(id, { adminNotes: noteContent.trim() }, passcode);
        await fetchDining();
      } else {
        await reservationApi.updateEventReservation(id, { adminNotes: noteContent.trim() }, passcode);
        await fetchEvents();
      }
      setEditingNoteId(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update admin notes');
    } finally {
      setIsSavingNote(false);
    }
  };

  // Confirm Delete Action
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setActionError(null);
    try {
      if (deletingItem.type === 'dining') {
        await reservationApi.deleteDiningReservation(deletingItem.id, passcode);
        await fetchDining();
      } else {
        await reservationApi.deleteEventReservation(deletingItem.id, passcode);
        await fetchEvents();
      }
      setDeletingItem(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete reservation');
    }
  };

  // Open WhatsApp to Contact Customer
  const handleOpenWhatsAppCustomer = (
    phone: string,
    customerName: string,
    ref: string,
    type: 'dining' | 'events',
    date: string,
    time: string
  ) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone.slice(-10)}`;
    const typeText = type === 'dining' ? 'Dining Reservation' : 'Event Enquiry';
    const text = `Hi ${customerName}! This is GioCasa Ayodhya regarding your ${typeText} (#${ref}) for ${date} at ${time}. We are pleased to assist you!`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const currentMetrics = activeSubTab === 'dining' ? diningMetrics : eventMetrics;
  const isLoading = activeSubTab === 'dining' ? loadingDining : loadingEvents;

  return (
    <div className="space-y-6">
      {/* Top Banner and Navigation Tabs */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-orange font-bold">
                Restaurant & Hospitality Desk
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-cream mt-0.5">
              Dining & Event Reservations
            </h2>
            <p className="text-xs text-brand-subtle mt-0.5">
              Manage 1st Floor Dine-in table reservations and special event enquiries in real-time.
            </p>
          </div>

          {/* Sub Tab Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-brand-dark border border-brand-border">
            <button
              onClick={() => {
                setActiveSubTab('dining');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                activeSubTab === 'dining'
                  ? 'bg-brand-orange/20 text-brand-orange border border-brand-orange/40 font-bold'
                  : 'text-brand-subtle hover:text-brand-cream'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Dining (1st Floor)</span>
              {diningMetrics.pending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-brand-orange text-black font-bold text-[10px]">
                  {diningMetrics.pending}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveSubTab('events');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                activeSubTab === 'events'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
                  : 'text-brand-subtle hover:text-brand-cream'
              }`}
            >
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Events & Parties</span>
              {eventMetrics.pending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-400 text-black font-bold text-[10px]">
                  {eventMetrics.pending}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-brand-surfaceElevated/60 border border-brand-border rounded-xl p-3.5">
            <span className="text-[10px] font-mono uppercase text-brand-subtle block">Total Enquiries</span>
            <span className="text-2xl font-bold font-serif text-brand-cream">{currentMetrics.total}</span>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5">
            <span className="text-[10px] font-mono uppercase text-amber-400 block font-semibold flex items-center gap-1">
              <Clock3 className="w-3 h-3" />
              Pending Review
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-serif text-amber-300">{currentMetrics.pending}</span>
              {currentMetrics.pending > 0 && (
                <span className="text-[10px] font-mono text-amber-400 animate-pulse">Action Required</span>
              )}
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5">
            <span className="text-[10px] font-mono uppercase text-emerald-400 block font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Confirmed
            </span>
            <span className="text-2xl font-bold font-serif text-emerald-300">{currentMetrics.confirmed}</span>
          </div>

          <div className="bg-brand-surfaceElevated/60 border border-brand-border rounded-xl p-3.5 flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase text-brand-subtle block">Location</span>
            <span className="text-xs font-semibold text-brand-cream">
              {activeSubTab === 'dining' ? '1st Floor Restaurant' : 'Ayodhya Experience Center'}
            </span>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-brand-surface border border-brand-border rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-3.5 h-3.5 text-brand-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone, or reference code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-brand-dark border border-brand-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-brand-cream focus:outline-none focus:border-brand-gold"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-brand-subtle ml-1" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-brand-dark border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-brand-cream focus:outline-none focus:border-brand-gold"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="bg-brand-dark border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-brand-cream focus:outline-none focus:border-brand-gold"
            title="Filter by reservation date"
          />

          {(dateFilter || searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setDateFilter('');
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="text-[11px] text-brand-subtle hover:text-white underline px-1"
            >
              Reset
            </button>
          )}
        </div>

        <button
          onClick={activeSubTab === 'dining' ? fetchDining : fetchEvents}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-brand-dark border border-brand-border hover:border-brand-gold text-brand-subtle hover:text-brand-cream text-xs font-mono flex items-center justify-center gap-1.5 transition-colors self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-gold' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Reservations List */}
      <div className="space-y-3">
        {activeSubTab === 'dining' ? (
          diningList.length === 0 ? (
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-12 text-center space-y-2">
              <Utensils className="w-8 h-8 text-brand-subtle mx-auto mb-2 opacity-50" />
              <p className="text-brand-cream font-serif text-lg font-bold">No Dining Reservations Found</p>
              <p className="text-xs text-brand-subtle max-w-sm mx-auto">
                No 1st Floor restaurant reservations match your current filters.
              </p>
            </div>
          ) : (
            diningList.map(res => (
              <div
                key={res.id}
                className="bg-brand-surface border border-brand-border rounded-2xl p-4 sm:p-5 hover:border-brand-orange/40 transition-all space-y-4 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-brand-border/60 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-brand-orange/15 text-brand-orange border border-brand-orange/30">
                        #{res.referenceCode}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border ${
                          res.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse'
                            : res.status === 'confirmed'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                            : res.status === 'completed'
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                            : 'bg-red-500/15 text-red-300 border-red-500/40'
                        }`}
                      >
                        {res.status}
                      </span>
                      <span className="text-[11px] text-brand-subtle flex items-center gap-1">
                        <Building className="w-3 h-3 text-brand-orange" />
                        1st Floor Restaurant
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h4 className="text-lg font-bold font-serif text-brand-cream">{res.customerName}</h4>
                      {res.gioId && (
                        <span className="text-[10px] font-mono text-brand-gold bg-brand-gold/10 px-1.5 py-0.2 rounded border border-brand-gold/20">
                          {res.gioId}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-brand-subtle">
                      <span className="flex items-center gap-1 text-brand-cream">
                        <Phone className="w-3 h-3 text-brand-subtle" />
                        {res.phone}
                      </span>
                      {res.whatsappPhone && res.whatsappPhone !== res.phone && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <MessageCircle className="w-3 h-3" />
                          WA: {res.whatsappPhone}
                        </span>
                      )}
                      {res.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-brand-subtle" />
                          {res.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & WhatsApp Contact */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() =>
                        handleOpenWhatsAppCustomer(
                          res.whatsappPhone || res.phone,
                          res.customerName,
                          res.referenceCode,
                          'dining',
                          res.date,
                          res.time
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Contact customer directly on WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {res.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(res.id, 'dining', 'confirmed')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(res.id, 'dining', 'rejected')}
                          className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {res.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(res.id, 'dining', 'completed')}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Completed</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(res.id, 'dining', 'cancelled')}
                          className="px-3 py-1.5 rounded-lg bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-red-400 text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setDeletingItem({ id: res.id, ref: res.referenceCode, type: 'dining' })}
                      className="p-1.5 rounded-lg text-brand-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
                      title="Permanently Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-brand-dark/50 border border-brand-border/60">
                    <span className="text-[10px] text-brand-subtle block uppercase font-mono">Date</span>
                    <span className="font-semibold text-brand-cream flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-orange" />
                      {res.date}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-brand-dark/50 border border-brand-border/60">
                    <span className="text-[10px] text-brand-subtle block uppercase font-mono">Time Slot</span>
                    <span className="font-semibold text-brand-cream flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-brand-blue" />
                      {res.time}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-brand-dark/50 border border-brand-border/60">
                    <span className="text-[10px] text-brand-subtle block uppercase font-mono">Party Size</span>
                    <span className="font-semibold text-brand-cream flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-brand-pink" />
                      {res.guests} Guests
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-brand-dark/50 border border-brand-border/60">
                    <span className="text-[10px] text-brand-subtle block uppercase font-mono">Seating Preference</span>
                    <span className="font-semibold text-brand-cream mt-0.5 block truncate">
                      {res.seatingPreference || 'Standard Dining Table'}
                    </span>
                  </div>
                </div>

                {/* Special Requests */}
                {res.specialRequests && (
                  <div className="p-3 rounded-xl bg-brand-dark/70 border border-brand-border text-xs space-y-1">
                    <span className="text-[10px] font-mono uppercase text-brand-gold font-bold">Special Requests:</span>
                    <p className="text-brand-cream leading-relaxed font-light">{res.specialRequests}</p>
                  </div>
                )}

                {/* Admin Internal Notes Section */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-brand-border/40 text-xs">
                  {editingNoteId === res.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={noteContent}
                        onChange={e => setNoteContent(e.target.value)}
                        placeholder="Add internal manager note (e.g. VIP table allocated, called customer)..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-brand-gold"
                      />
                      <button
                        onClick={() => handleSaveNote(res.id, 'dining')}
                        disabled={isSavingNote}
                        className="px-3 py-1.5 rounded-lg bg-brand-gold text-black font-bold text-xs"
                      >
                        {isSavingNote ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="px-2 py-1.5 text-xs text-brand-subtle hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-brand-subtle">
                      <FileText className="w-3.5 h-3.5 text-brand-subtle" />
                      <span className="text-[11px]">
                        Internal Note: <strong className="text-brand-cream">{res.adminNotes || 'None'}</strong>
                      </span>
                      <button
                        onClick={() => {
                          setEditingNoteId(res.id);
                          setNoteContent(res.adminNotes || '');
                        }}
                        className="text-[10px] text-brand-gold hover:underline flex items-center gap-0.5 ml-1"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}

                  <span className="text-[10px] font-mono text-brand-subtle">
                    Submitted: {new Date(res.createdAt).toLocaleDateString()} {new Date(res.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )
        ) : (
          /* EVENT ENQUIRIES LIST */
          eventList.length === 0 ? (
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-12 text-center space-y-2">
              <PartyPopper className="w-8 h-8 text-brand-subtle mx-auto mb-2 opacity-50" />
              <p className="text-brand-cream font-serif text-lg font-bold">No Event Enquiries Found</p>
              <p className="text-xs text-brand-subtle max-w-sm mx-auto">
                No private party or celebration requests match your current filters.
              </p>
            </div>
          ) : (
            eventList.map(ev => (
              <div
                key={ev.id}
                className="bg-brand-surface border border-brand-border rounded-2xl p-4 sm:p-5 hover:border-emerald-500/40 transition-all space-y-4 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-brand-border/60 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        #{ev.referenceCode}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border ${
                          ev.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse'
                            : ev.status === 'confirmed'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                            : ev.status === 'completed'
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                            : 'bg-red-500/15 text-red-300 border-red-500/40'
                        }`}
                      >
                        {ev.status}
                      </span>
                      <span className="text-[11px] text-brand-subtle font-medium">
                        {ev.eventType}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h4 className="text-lg font-bold font-serif text-brand-cream">{ev.customerName}</h4>
                      {ev.gioId && (
                        <span className="text-[10px] font-mono text-brand-gold bg-brand-gold/10 px-1.5 py-0.2 rounded border border-brand-gold/20">
                          {ev.gioId}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-brand-subtle">
                      <span className="flex items-center gap-1 text-brand-cream">
                        <Phone className="w-3 h-3 text-brand-subtle" />
                        {ev.phone}
                      </span>
                      {ev.whatsappPhone && ev.whatsappPhone !== ev.phone && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <MessageCircle className="w-3 h-3" />
                          WA: {ev.whatsappPhone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-brand-cream">
                        <Mail className="w-3 h-3 text-brand-subtle" />
                        {ev.email}
                      </span>
                    </div>
                  </div>

                  {/* Actions & WhatsApp Contact */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() =>
                        handleOpenWhatsAppCustomer(
                          ev.whatsappPhone || ev.phone,
                          ev.customerName,
                          ev.referenceCode,
                          'events',
                          ev.date,
                          ev.time
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Contact customer directly on WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {ev.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(ev.id, 'events', 'confirmed')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(ev.id, 'events', 'rejected')}
                          className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {ev.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(ev.id, 'events', 'completed')}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Completed</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(ev.id, 'events', 'cancelled')}
                          className="px-3 py-1.5 rounded-lg bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-red-400 text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setDeletingItem({ id: ev.id, ref: ev.referenceCode, type: 'events' })}
                      className="p-1.5 rounded-lg text-brand-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
                      title="Permanently Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-brand-dark/50 border border-brand-border/60">
                    <span className="text-[10px] text-brand-subtle block uppercase font-mono">Date</span>
                    <span className="font-semibold text-brand-cream flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      {ev.date}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-brand-dark/50 border border-brand-border/60">
                    <span className="text-[10px] text-brand-subtle block uppercase font-mono">Target Time</span>
                    <span className="font-semibold text-brand-cream flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      {ev.time}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-brand-dark/50 border border-brand-border/60">
                    <span className="text-[10px] text-brand-subtle block uppercase font-mono">Expected Guests</span>
                    <span className="font-semibold text-brand-cream flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      {ev.expectedGuests} Guests
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-brand-dark/50 border border-brand-border/60">
                    <span className="text-[10px] text-brand-subtle block uppercase font-mono">Budget</span>
                    <span className="font-semibold text-emerald-400 mt-0.5 block truncate">
                      {ev.estimatedBudget || 'Flexible'}
                    </span>
                  </div>
                </div>

                {/* Food, Decor & Message requirements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {ev.foodRequirements && (
                    <div className="p-2.5 rounded-xl bg-brand-dark/70 border border-brand-border space-y-0.5">
                      <span className="text-[10px] font-mono uppercase text-brand-orange font-bold">Food & Catering:</span>
                      <p className="text-brand-cream leading-relaxed font-light">{ev.foodRequirements}</p>
                    </div>
                  )}
                  {ev.decorationRequirements && (
                    <div className="p-2.5 rounded-xl bg-brand-dark/70 border border-brand-border space-y-0.5">
                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Decor & Setup:</span>
                      <p className="text-brand-cream leading-relaxed font-light">{ev.decorationRequirements}</p>
                    </div>
                  )}
                </div>

                {ev.additionalMessage && (
                  <div className="p-2.5 rounded-xl bg-brand-dark/70 border border-brand-border text-xs space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-brand-gold font-bold">Additional Notes:</span>
                    <p className="text-brand-cream leading-relaxed font-light">{ev.additionalMessage}</p>
                  </div>
                )}

                {/* Admin Internal Notes Section */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-brand-border/40 text-xs">
                  {editingNoteId === ev.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={noteContent}
                        onChange={e => setNoteContent(e.target.value)}
                        placeholder="Add internal manager note (e.g. quote sent via WhatsApp, hall reserved)..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-brand-dark border border-brand-border text-white text-xs focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        onClick={() => handleSaveNote(ev.id, 'events')}
                        disabled={isSavingNote}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs"
                      >
                        {isSavingNote ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="px-2 py-1.5 text-xs text-brand-subtle hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-brand-subtle">
                      <FileText className="w-3.5 h-3.5 text-brand-subtle" />
                      <span className="text-[11px]">
                        Internal Note: <strong className="text-brand-cream">{ev.adminNotes || 'None'}</strong>
                      </span>
                      <button
                        onClick={() => {
                          setEditingNoteId(ev.id);
                          setNoteContent(ev.adminNotes || '');
                        }}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 ml-1"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}

                  <span className="text-[10px] font-mono text-brand-subtle">
                    Submitted: {new Date(ev.createdAt).toLocaleDateString()} {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-red-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-serif text-lg font-bold text-white">Permanently Delete Reservation?</h3>
            </div>
            <p className="text-xs text-brand-subtle leading-relaxed">
              Are you sure you want to permanently delete reservation <strong className="text-white">#{deletingItem.ref}</strong>? This action will remove the record permanently from the database.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-xs text-brand-subtle hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};