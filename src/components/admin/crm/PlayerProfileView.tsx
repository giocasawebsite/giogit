import React, { useState } from 'react';
import { PlayerProfileDetails, StaffNote, FollowUpReminder, LoyaltyLedgerEntry } from '../../../types';
import { playerCrmApi } from '../../../services/playerCrmApi';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Gamepad2,
  Trophy,
  Calendar,
  Clock,
  Sparkles,
  Award,
  DollarSign,
  MessageCircle,
  Edit,
  Archive,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  ExternalLink,
  ShieldAlert,
  Send,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface PlayerProfileViewProps {
  profile: PlayerProfileDetails;
  passcode: string;
  onBack: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}

export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({
  profile,
  passcode,
  onBack,
  onEdit,
  onRefresh,
}) => {
  const { player, registrations, bookings, wins, loyaltyLedger, activityTimeline } = profile;

  // Active Tab: 'timeline' | 'tournaments' | 'bookings' | 'notes' | 'loyalty'
  const [activeTab, setActiveTab] = useState<'timeline' | 'tournaments' | 'bookings' | 'notes' | 'loyalty'>('timeline');

  // Staff Note Form
  const [noteText, setNoteText] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('Staff Admin');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Reminder Form
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [reminderSubmitting, setReminderSubmitting] = useState(false);

  // Loyalty Modal
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState('100');
  const [loyaltyType, setLoyaltyType] = useState<'earn' | 'redeem' | 'adjustment' | 'bonus'>('bonus');
  const [loyaltyReason, setLoyaltyReason] = useState('VIP Weekend Bonus');
  const [loyaltySubmitting, setLoyaltySubmitting] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);

  // WhatsApp Modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'tournament' | 'vip' | 'reengage' | 'custom'>('tournament');

  const templates = {
    tournament: `Hey ${player.name}! 🏆 GioCasa is hosting our upcoming Arena Tournament this weekend in Ayodhya. Slots are filling fast — reply here to reserve your spot!`,
    vip: `Hello ${player.name}! 🌟 As a valued GioCasa VIP member, your next gaming session on our PS5 / Slate Pool table comes with priority station booking. When can we expect you?`,
    reengage: `Hey ${player.name}! 🍕 We haven't seen you at GioCasa lately! Upstairs, things are buzzing with FC25 duels and fresh wood-fired pizzas downstairs. Stop by this week!`,
    custom: `Hi ${player.name}, greetings from GioCasa Social House & Gaming Lounge, Ayodhya!`,
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setNoteSubmitting(true);
    try {
      await playerCrmApi.addNote(passcode, player.id, noteText.trim(), noteAuthor.trim());
      setNoteText('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to save note.');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Delete this staff note?')) return;
    try {
      await playerCrmApi.deleteNote(passcode, player.id, noteId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete note.');
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim() || !reminderDate.trim()) return;

    setReminderSubmitting(true);
    try {
      await playerCrmApi.addReminder(passcode, player.id, reminderTitle.trim(), reminderDate.trim());
      setReminderTitle('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to add reminder.');
    } finally {
      setReminderSubmitting(false);
    }
  };

  const handleToggleReminder = async (reminderId: string, currentStatus: boolean) => {
    try {
      await playerCrmApi.updateReminder(passcode, player.id, reminderId, !currentStatus);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update reminder.');
    }
  };

  const handleLoyaltySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(loyaltyPoints, 10);
    if (isNaN(pts) || pts === 0) {
      setLoyaltyError('Points must be a non-zero number.');
      return;
    }
    if (!loyaltyReason.trim()) {
      setLoyaltyError('Reason is required for audit logs.');
      return;
    }

    setLoyaltySubmitting(true);
    setLoyaltyError(null);
    try {
      await playerCrmApi.adjustLoyalty(passcode, player.id, pts, loyaltyType, loyaltyReason.trim());
      setShowLoyaltyModal(false);
      onRefresh();
    } catch (err: any) {
      setLoyaltyError(err.message || 'Failed to adjust loyalty.');
    } finally {
      setLoyaltySubmitting(false);
    }
  };

  const [copiedGioId, setCopiedGioId] = useState(false);

  const handleCopyGioId = () => {
    if (!player.gioId) return;
    navigator.clipboard.writeText(player.gioId);
    setCopiedGioId(true);
    setTimeout(() => setCopiedGioId(false), 2000);
  };

  const openWhatsAppUrl = async () => {
    const msg = selectedTemplate === 'custom' ? customWhatsAppMsg : templates[selectedTemplate];
    const encoded = encodeURIComponent(msg);
    const url = `https://wa.me/91${player.normalizedPhone}?text=${encoded}`;
    window.open(url, '_blank');
    setShowWhatsAppModal(false);

    try {
      await playerCrmApi.logCommunication(passcode, player.id, {
        channel: 'whatsapp',
        templateId: selectedTemplate,
        messagePreview: msg,
        status: 'prepared',
        metadata: { recipient: player.phone, templateName: selectedTemplate },
      });
      onRefresh();
    } catch {
      // ignore logging failure on outreach trigger
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-brand-border/60">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono uppercase text-brand-subtle hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-brand-pink" />
          <span>Back to Player Directory</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-brand-surface border border-brand-border text-brand-subtle hover:text-white transition-colors"
            title="Refresh Profile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-pink text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <Edit className="w-3.5 h-3.5 text-brand-pink" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Player Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-brand-surfaceElevated via-brand-surface to-brand-dark border border-brand-border shadow-2xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Avatar and Identity */}
          <div className="lg:col-span-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-orange to-brand-pink flex items-center justify-center text-3xl font-bold text-white shadow-luxury-pink shrink-0">
              {player.name.charAt(0).toUpperCase()}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white">
                  {player.name}
                </h1>
                <span className="font-mono text-sm px-2.5 py-0.5 rounded-full bg-brand-pink/20 text-brand-pink border border-brand-pink/40 font-bold">
                  @{player.gamerTag}
                </span>
                {player.gioId && (
                  <button
                    type="button"
                    onClick={handleCopyGioId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-xs font-bold bg-brand-blue/20 text-brand-blue border border-brand-blue/40 hover:border-brand-pink transition-all"
                    title="Click to copy GioCasa Player ID"
                  >
                    <span>{player.gioId}</span>
                    {copiedGioId ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-70" />
                    )}
                  </button>
                )}
                {player.referralCode && (
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-brand-orange/20 text-brand-orange border border-brand-orange/40 font-semibold" title="Player's unique referral code">
                    REF: {player.referralCode}
                  </span>
                )}
                <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-surface border border-brand-border text-brand-subtle">
                  {player.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-brand-subtle">
                <span className="flex items-center gap-1.5 text-white">
                  <Phone className="w-3.5 h-3.5 text-brand-pink" />
                  {player.phone}
                </span>
                {player.email ? (
                  <span className="flex items-center gap-1.5 text-white">
                    <Mail className="w-3.5 h-3.5 text-brand-orange" />
                    {player.email}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-brand-muted italic">
                    <Mail className="w-3.5 h-3.5 opacity-50" />
                    Email: Not provided
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-brand-blue">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  {player.favoriteGame} {player.favoritePlatform ? `(${player.favoritePlatform.toUpperCase()})` : ''}
                </span>
              </div>

              {/* Acquisition Touchpoints & Activity Dates */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-brand-subtle text-[11px]">Sources:</span>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(player.sources && player.sources.length > 0 ? player.sources : [player.source || 'player_registration'])).map((src) => {
                      if (src === 'gaming_booking') {
                        return (
                          <span key={src} className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[10px] text-blue-400 font-medium">
                            🎮 Booking
                          </span>
                        );
                      }
                      if (src === 'tournament_registration') {
                        return (
                          <span key={src} className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] text-orange-400 font-medium">
                            🏆 Tournament
                          </span>
                        );
                      }
                      return (
                        <span key={src} className="px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-[10px] text-pink-400 font-medium">
                          👤 Direct Signup
                        </span>
                      );
                    })}
                  </div>
                </div>
                <span className="text-brand-subtle">•</span>
                <div className="text-brand-subtle text-[11px]">
                  First seen: <strong className="text-white">{player.createdAt ? new Date(player.createdAt).toLocaleDateString('en-IN') : 'Not recorded'}</strong>
                </div>
                <span className="text-brand-subtle">•</span>
                <div className="text-brand-subtle text-[11px]">
                  Last active: <strong className="text-white">{player.stats.lastActivityDate ? new Date(player.stats.lastActivityDate).toLocaleDateString('en-IN') : player.stats.lastVisitDate || 'Not recorded'}</strong>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {player.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2.5 py-0.5 rounded-full bg-brand-dark/80 border border-brand-border text-brand-subtle"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Outreach & Loyalty Action Buttons */}
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-2.5 lg:items-end">
            <button
              onClick={() => {
                setSelectedTemplate('tournament');
                setShowWhatsAppModal(true);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>WhatsApp Outreach</span>
            </button>

            <button
              onClick={() => setShowLoyaltyModal(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-brand-surfaceElevated hover:bg-brand-surface border border-brand-pink/50 hover:border-brand-pink text-white text-xs font-mono font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-brand-pink" />
              <span>Adjust Loyalty Points</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Tournaments & Wins */}
        <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border shadow-lg space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-brand-subtle block">
            Arena Tournaments
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-white">
              {player.stats.tournamentCount || 0}
            </span>
            {(player.stats.tournamentWins || 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-brand-orange px-2 py-0.5 rounded-full bg-brand-orange/15 border border-brand-orange/40">
                <Trophy className="w-3 h-3 fill-current" />
                {player.stats.tournamentWins} Wins
              </span>
            )}
          </div>
          <span className="text-[11px] text-brand-subtle block">
            {wins.length > 0 ? `${wins.length} podium finishes recorded` : 'No tournament trophies yet'}
          </span>
        </div>

        {/* Metric 2: Gaming Bookings */}
        <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border shadow-lg space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-brand-subtle block">
            Gaming Sessions
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-white">
              {player.stats.bookingsCount || 0}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              {player.stats.completedBookingsCount ?? 0} completed
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-brand-subtle">
            <span>Hours: <strong className="text-white">{(player.stats.totalHoursPlayed || 0).toFixed(1)} hrs</strong></span>
            <span>Last: {player.stats.lastVisitDate || 'Never'}</span>
          </div>
        </div>

        {/* Metric 3: Total Spend */}
        <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border shadow-lg space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-brand-subtle block">
            Verified Total Spend
          </span>
          <div className="flex items-baseline gap-1 font-mono text-3xl font-bold text-emerald-400">
            <span>₹</span>
            <span>{(player.stats.totalSpend || 0).toLocaleString('en-IN')}</span>
          </div>
          <span className="text-[11px] text-brand-subtle block">
            Reliable transaction ledger records
          </span>
        </div>

        {/* Metric 4: Loyalty Points & Tier */}
        <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border shadow-lg space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-subtle block">
              Loyalty Points
            </span>
            <span className="text-[10px] font-mono font-bold text-brand-pink uppercase">
              {player.membershipTier}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-brand-pink">
              {player.loyalty?.pointsBalance || 0}
            </span>
            <span className="text-[11px] font-mono text-brand-subtle">
              / {player.loyalty?.lifetimePoints || 0} lifetime
            </span>
          </div>
          <span className="text-[11px] text-brand-subtle block">
            Earn 1 pt per ₹10 on paid sessions
          </span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-brand-border/60 gap-3 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'border-brand-pink text-brand-pink font-bold'
              : 'border-transparent text-brand-subtle hover:text-white'
          }`}
        >
          Activity Timeline ({activityTimeline.length})
        </button>

        <button
          onClick={() => setActiveTab('tournaments')}
          className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'tournaments'
              ? 'border-brand-pink text-brand-pink font-bold'
              : 'border-transparent text-brand-subtle hover:text-white'
          }`}
        >
          Tournaments & Results ({registrations.length})
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'bookings'
              ? 'border-brand-pink text-brand-pink font-bold'
              : 'border-transparent text-brand-subtle hover:text-white'
          }`}
        >
          Gaming Bookings ({bookings.length})
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'notes'
              ? 'border-brand-pink text-brand-pink font-bold'
              : 'border-transparent text-brand-subtle hover:text-white'
          }`}
        >
          Staff Notes & Reminders ({player.notes.length + player.reminders.length})
        </button>

        <button
          onClick={() => setActiveTab('loyalty')}
          className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'loyalty'
              ? 'border-brand-pink text-brand-pink font-bold'
              : 'border-transparent text-brand-subtle hover:text-white'
          }`}
        >
          Loyalty Ledger ({loyaltyLedger.length})
        </button>
      </div>

      {/* Tab 1: Activity Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-brand-surface border border-brand-border space-y-4">
            <h3 className="font-serif text-xl font-bold text-white">Chronological Player Journey</h3>
            <p className="text-xs text-brand-subtle">
              Unified real-time activity feed spanning table bookings, arena tournament matches, trophies, staff observations, and points.
            </p>

            {activityTimeline.length === 0 ? (
              <div className="py-12 text-center text-brand-subtle font-mono text-xs">
                No recorded player interactions yet.
              </div>
            ) : (
              <div className="relative border-l border-brand-border/60 pl-6 ml-4 space-y-6 pt-2">
                {activityTimeline.map((item) => (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-brand-dark ${
                        item.type === 'win'
                          ? 'bg-brand-orange ring-4 ring-brand-orange/20'
                          : item.type === 'tournament'
                          ? 'bg-brand-blue ring-4 ring-brand-blue/20'
                          : item.type === 'booking'
                          ? 'bg-emerald-400 ring-4 ring-emerald-400/20'
                          : item.type === 'loyalty'
                          ? 'bg-brand-pink ring-4 ring-brand-pink/20'
                          : item.type === 'communication'
                          ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                          : 'bg-brand-subtle'
                      }`}
                    />

                    <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border/60 hover:border-brand-border transition-colors space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-base font-bold text-white">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-brand-subtle">
                          {new Date(item.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-brand-subtle leading-relaxed font-light">
                        {item.description}
                      </p>
                      {item.badge && (
                        <div className="pt-1">
                          <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-brand-surface border border-brand-border/80 text-brand-pink font-semibold">
                            {item.badge}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Tournaments & Results */}
      {activeTab === 'tournaments' && (
        <div className="space-y-6">
          {/* Trophy Shelf if any */}
          {wins.length > 0 && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-orange/15 via-brand-surface to-brand-surface border border-brand-orange/40 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-brand-orange font-bold text-xs uppercase font-mono tracking-wider">
                <Trophy className="w-4 h-4 fill-current" />
                <span>CHAMPION ACHIEVEMENTS & PODIUM FINISHES</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {wins.map((w, i) => (
                  <div key={i} className="p-4 rounded-xl bg-brand-dark/80 border border-brand-orange/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{w.award}</span>
                      <span className="text-[10px] font-mono text-brand-orange">{w.season || w.eventDate}</span>
                    </div>
                    <div className="text-xs text-brand-pink font-serif">{w.tournamentTitle}</div>
                    <p className="text-[11px] text-brand-subtle font-light">{w.scoreDescription}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registrations List */}
          <div className="p-6 rounded-3xl bg-brand-surface border border-brand-border space-y-4">
            <h3 className="font-serif text-xl font-bold text-white">Registered Tournaments</h3>
            {registrations.length === 0 ? (
              <div className="py-12 text-center text-brand-subtle font-mono text-xs">
                No tournament registrations found for this player.
              </div>
            ) : (
              <div className="divide-y divide-brand-border/40">
                {registrations.map((reg) => (
                  <div key={reg.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-base font-bold text-white">
                          {reg.tournamentSlug.replace(/-/g, ' ').toUpperCase()}
                        </span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-brand-surfaceElevated border border-brand-border text-brand-blue">
                          {reg.registrationReference}
                        </span>
                      </div>
                      <div className="text-xs text-brand-subtle font-mono">
                        Status: <strong className="text-white">{reg.status}</strong> • Payment: <strong className="text-white">{reg.paymentStatus}</strong>
                        {reg.inGameId && ` • In-Game ID: ${reg.inGameId}`}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-brand-subtle shrink-0">
                      {new Date(reg.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Gaming Bookings */}
      {activeTab === 'bookings' && (() => {
        const todayIso = new Date().toISOString().slice(0, 10);
        const upcomingBookings = bookings.filter(
          (b) => (b.date ? b.date >= todayIso : true) && b.status !== 'completed' && b.status !== 'cancelled'
        );
        const pastBookings = bookings.filter(
          (b) => (b.date ? b.date < todayIso : false) || b.status === 'completed' || b.status === 'cancelled'
        );

        return (
          <div className="space-y-6">
            {/* Upcoming Bookings */}
            <div className="p-6 rounded-3xl bg-brand-surface border border-brand-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-white">Upcoming Gaming Bookings</h3>
                  <p className="text-xs text-brand-subtle">
                    Scheduled reservations confirmed or pending arrival.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 font-mono text-xs font-bold text-blue-400">
                  {upcomingBookings.length} Upcoming
                </span>
              </div>

              {upcomingBookings.length === 0 ? (
                <div className="py-8 text-center text-brand-subtle font-mono text-xs">
                  No upcoming gaming slots scheduled.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-brand-dark/95 border-b border-brand-border text-brand-subtle text-[10px] uppercase">
                      <tr>
                        <th className="py-3 px-3">Booking ID</th>
                        <th className="py-3 px-3">Station / Resource</th>
                        <th className="py-3 px-3">Date & Time</th>
                        <th className="py-3 px-3">Duration</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 text-white">
                      {upcomingBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-brand-surfaceElevated/50">
                          <td className="py-3 px-3 font-bold text-brand-pink">{b.id}</td>
                          <td className="py-3 px-3 font-sans font-medium">{b.resourceName || b.category?.toUpperCase() || 'Station'}</td>
                          <td className="py-3 px-3 text-brand-subtle">
                            {b.date} • {b.startTime}{b.endTime ? ` - ${b.endTime}` : ''}
                          </td>
                          <td className="py-3 px-3">{b.durationMinutes} mins</td>
                          <td className="py-3 px-3 text-emerald-400 font-bold">₹{b.totalAmount || b.totalPrice || 0}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/40 text-[10px] text-blue-400 uppercase font-bold">
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Past & Completed Bookings */}
            <div className="p-6 rounded-3xl bg-brand-surface border border-brand-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-white">Past & Completed Sessions</h3>
                  <p className="text-xs text-brand-subtle">
                    Archived play sessions, completed gaming hours, or cancellations.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-brand-surfaceElevated border border-brand-border font-mono text-xs font-bold text-brand-subtle">
                  {pastBookings.length} Past Records
                </span>
              </div>

              {pastBookings.length === 0 ? (
                <div className="py-8 text-center text-brand-subtle font-mono text-xs">
                  No past gaming sessions recorded.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-brand-dark/95 border-b border-brand-border text-brand-subtle text-[10px] uppercase">
                      <tr>
                        <th className="py-3 px-3">Booking ID</th>
                        <th className="py-3 px-3">Station / Resource</th>
                        <th className="py-3 px-3">Date & Time</th>
                        <th className="py-3 px-3">Duration</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 text-white">
                      {pastBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-brand-surfaceElevated/50">
                          <td className="py-3 px-3 font-bold text-brand-pink">{b.id}</td>
                          <td className="py-3 px-3 font-sans font-medium">{b.resourceName || b.category?.toUpperCase() || 'Station'}</td>
                          <td className="py-3 px-3 text-brand-subtle">
                            {b.date} • {b.startTime}{b.endTime ? ` - ${b.endTime}` : ''}
                          </td>
                          <td className="py-3 px-3">{b.durationMinutes} mins</td>
                          <td className="py-3 px-3 text-emerald-400 font-bold">₹{b.totalAmount || b.totalPrice || 0}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                              b.status === 'completed'
                                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                                : b.status === 'cancelled'
                                ? 'bg-red-500/15 border border-red-500/40 text-red-400'
                                : 'bg-brand-surfaceElevated border border-brand-border text-brand-subtle'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Tab 4: Staff Notes & Reminders */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notes Column */}
          <div className="p-6 rounded-3xl bg-brand-surface border border-brand-border space-y-4">
            <h3 className="font-serif text-xl font-bold text-white">Confidential Staff Notes</h3>
            <p className="text-xs text-brand-subtle">
              Internal staff comments visible only to administrators.
            </p>

            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                required
                rows={3}
                placeholder="Write an internal note about customer playstyle, favorite food, pool stick preferences..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl p-3 text-xs text-white placeholder-brand-subtle focus:outline-none focus:border-brand-pink"
              />
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Author (e.g. Sahil / Admin)"
                  value={noteAuthor}
                  onChange={(e) => setNoteAuthor(e.target.value)}
                  className="bg-brand-surfaceElevated border border-brand-border rounded-lg px-2.5 py-1 text-xs text-white font-mono w-40"
                />
                <button
                  type="submit"
                  disabled={noteSubmitting}
                  className="px-4 py-1.5 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-semibold uppercase tracking-wider shadow-luxury-pink"
                >
                  {noteSubmitting ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </form>

            <div className="space-y-3 pt-3 border-t border-brand-border/40">
              {player.notes.length === 0 ? (
                <div className="py-8 text-center text-xs text-brand-subtle font-mono">
                  No staff notes recorded.
                </div>
              ) : (
                player.notes.map((n) => (
                  <div key={n.id} className="p-3.5 rounded-xl bg-brand-surfaceElevated border border-brand-border/60 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-brand-subtle">
                      <span className="text-brand-pink font-semibold">{n.author}</span>
                      <span>{new Date(n.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <p className="text-xs text-white leading-relaxed">{n.text}</p>
                    <div className="text-right pt-1">
                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-[10px] text-brand-subtle hover:text-red-400 font-mono"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reminders Column */}
          <div className="p-6 rounded-3xl bg-brand-surface border border-brand-border space-y-4">
            <h3 className="font-serif text-xl font-bold text-white">Follow-Up Reminders</h3>
            <p className="text-xs text-brand-subtle">
              Track tasks, customer follow-up calls, tournament invitations, or special booking reservations.
            </p>

            <form onSubmit={handleAddReminder} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Reminder title (e.g. Call regarding Friday FC 25 tournament)"
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-xs text-white placeholder-brand-subtle focus:outline-none focus:border-brand-pink"
              />
              <div className="flex items-center justify-between gap-3">
                <input
                  type="date"
                  required
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="bg-brand-surfaceElevated border border-brand-border rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                />
                <button
                  type="submit"
                  disabled={reminderSubmitting}
                  className="px-4 py-1.5 rounded-full bg-brand-blue hover:bg-brand-blueHover text-brand-charcoalDeep text-xs font-semibold uppercase tracking-wider shadow-luxury-blue"
                >
                  {reminderSubmitting ? 'Adding...' : 'Set Reminder'}
                </button>
              </div>
            </form>

            <div className="space-y-2.5 pt-3 border-t border-brand-border/40">
              {player.reminders.length === 0 ? (
                <div className="py-8 text-center text-xs text-brand-subtle font-mono">
                  No pending reminders set.
                </div>
              ) : (
                player.reminders.map((rem) => {
                  const isOverdue = !rem.isCompleted && rem.dueDate < new Date().toISOString().slice(0, 10);
                  return (
                    <div
                      key={rem.id}
                      onClick={() => handleToggleReminder(rem.id, rem.isCompleted)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        rem.isCompleted
                          ? 'bg-brand-surfaceElevated/30 border-brand-border/40 opacity-60'
                          : isOverdue
                          ? 'bg-red-500/10 border-red-500/50'
                          : 'bg-brand-surfaceElevated border-brand-border/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {rem.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-brand-subtle shrink-0" />
                        )}
                        <span className={`text-xs ${rem.isCompleted ? 'line-through text-brand-subtle' : 'text-white font-medium'}`}>
                          {rem.title}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono shrink-0 ${isOverdue ? 'text-red-400 font-bold' : 'text-brand-subtle'}`}>
                        {rem.dueDate}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Loyalty Ledger */}
      {activeTab === 'loyalty' && (
        <div className="p-6 rounded-3xl bg-brand-surface border border-brand-border space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-white">Loyalty Transaction Ledger</h3>
              <p className="text-xs text-brand-subtle">
                Audited points history. Points automatically earn on paid sessions and can be adjusted by authorized staff.
              </p>
            </div>
            <button
              onClick={() => setShowLoyaltyModal(true)}
              className="px-4 py-2 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-mono font-semibold uppercase tracking-wider shadow-luxury-pink self-start sm:self-auto"
            >
              + Adjust Points
            </button>
          </div>

          {loyaltyLedger.length === 0 ? (
            <div className="py-12 text-center text-brand-subtle font-mono text-xs">
              No loyalty transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-brand-dark/95 border-b border-brand-border text-brand-subtle text-[10px] uppercase">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Points Delta</th>
                    <th className="py-3 px-3">Reason / Description</th>
                    <th className="py-3 px-3">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40 text-white">
                  {loyaltyLedger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-brand-surfaceElevated/50">
                      <td className="py-3 px-3 text-brand-subtle">
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 uppercase text-brand-pink font-semibold">
                        {tx.type}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-bold ${tx.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                        </span>
                      </td>
                      <td className="py-3 px-3 text-white">{tx.reason}</td>
                      <td className="py-3 px-3 text-brand-subtle">{tx.referenceId || 'Manual'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Loyalty Adjustment Modal */}
      {showLoyaltyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold text-white">Adjust Loyalty Points</h3>
            <p className="text-xs text-brand-subtle">
              Credit or debit points from {player.name}'s account. Every change creates a permanent audit ledger entry.
            </p>

            {loyaltyError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs">
                {loyaltyError}
              </div>
            )}

            <form onSubmit={handleLoyaltySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-brand-subtle mb-1">
                  Transaction Type
                </label>
                <select
                  value={loyaltyType}
                  onChange={(e) => setLoyaltyType(e.target.value as any)}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="bonus">Bonus Credit (+)</option>
                  <option value="earn">Session Earning (+)</option>
                  <option value="redeem">Redemption (-)</option>
                  <option value="adjustment">Manual Adjustment (+ / -)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-brand-subtle mb-1">
                  Points Amount (use negative for deduction)
                </label>
                <input
                  type="number"
                  required
                  value={loyaltyPoints}
                  onChange={(e) => setLoyaltyPoints(e.target.value)}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-brand-subtle mb-1">
                  Audit Reason (Mandatory)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Winner voucher redemption, VIP appreciation"
                  value={loyaltyReason}
                  onChange={(e) => setLoyaltyReason(e.target.value)}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border/60">
                <button
                  type="button"
                  onClick={() => setShowLoyaltyModal(false)}
                  className="px-4 py-2 rounded-full bg-brand-surfaceElevated text-brand-subtle hover:text-white text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loyaltySubmitting}
                  className="px-5 py-2 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-mono uppercase font-bold shadow-luxury-pink"
                >
                  {loyaltySubmitting ? 'Posting...' : 'Commit Ledger Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Outreach Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase font-bold">
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Compose WhatsApp Direct Message</span>
            </div>

            <p className="text-xs text-brand-subtle">
              Prefill an invitation or message for <strong>{player.name}</strong> ({player.phone}) and open WhatsApp directly.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase text-brand-subtle">
                Choose Outreach Template
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('tournament')}
                  className={`p-2 rounded-xl border text-left ${
                    selectedTemplate === 'tournament'
                      ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                      : 'bg-brand-surfaceElevated border-brand-border text-brand-subtle hover:text-white'
                  }`}
                >
                  🏆 Tournament Invite
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate('vip')}
                  className={`p-2 rounded-xl border text-left ${
                    selectedTemplate === 'vip'
                      ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                      : 'bg-brand-surfaceElevated border-brand-border text-brand-subtle hover:text-white'
                  }`}
                >
                  🌟 VIP Weekend Perk
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate('reengage')}
                  className={`p-2 rounded-xl border text-left ${
                    selectedTemplate === 'reengage'
                      ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                      : 'bg-brand-surfaceElevated border-brand-border text-brand-subtle hover:text-white'
                  }`}
                >
                  🍕 Re-engagement
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate('custom')}
                  className={`p-2 rounded-xl border text-left ${
                    selectedTemplate === 'custom'
                      ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                      : 'bg-brand-surfaceElevated border-brand-border text-brand-subtle hover:text-white'
                  }`}
                >
                  ✍️ Custom Message
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-brand-subtle mb-1">
                Message Preview
              </label>
              {selectedTemplate === 'custom' ? (
                <textarea
                  rows={4}
                  value={customWhatsAppMsg}
                  onChange={(e) => setCustomWhatsAppMsg(e.target.value)}
                  placeholder="Type your custom message..."
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl p-3 text-xs text-white"
                />
              ) : (
                <div className="p-3.5 rounded-xl bg-brand-surfaceElevated border border-brand-border text-xs text-white leading-relaxed">
                  {templates[selectedTemplate]}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border/60">
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="px-4 py-2 rounded-full bg-brand-surfaceElevated text-brand-subtle hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={openWhatsAppUrl}
                className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono uppercase font-bold flex items-center gap-1.5 shadow-lg"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open in WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
