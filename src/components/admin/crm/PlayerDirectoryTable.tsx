import React, { useState } from 'react';
import { Player, PlayerSegment, MembershipTier, PlayerStatus } from '../../../types';
import {
  Search,
  Filter,
  Trophy,
  Calendar,
  Clock,
  Phone,
  Mail,
  User,
  ArrowUpDown,
  MoreVertical,
  Edit,
  Archive,
  RefreshCw,
  Plus,
  Download,
  MessageCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Award,
  Copy,
  Check,
} from 'lucide-react';

interface PlayerDirectoryTableProps {
  players: Player[];
  total: number;
  page: number;
  totalPages: number;
  segmentsSummary: Record<string, number>;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedSegment: PlayerSegment;
  onSegmentChange: (seg: PlayerSegment) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  tierFilter: string;
  onTierFilterChange: (tier: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  onPageChange: (newPage: number) => void;
  onViewProfile: (playerId: string) => void;
  onEditPlayer: (player: Player) => void;
  onArchivePlayer: (player: Player) => void;
  onRestorePlayer: (player: Player) => void;
  onOpenCreateModal: () => void;
  onExportCsv: () => void;
  onTriggerBackfill: () => void;
}

export const PlayerDirectoryTable: React.FC<PlayerDirectoryTableProps> = ({
  players,
  total,
  page,
  totalPages,
  segmentsSummary,
  loading,
  searchQuery,
  onSearchChange,
  selectedSegment,
  onSegmentChange,
  statusFilter,
  onStatusFilterChange,
  tierFilter,
  onTierFilterChange,
  sortBy,
  onSortByChange,
  onPageChange,
  onViewProfile,
  onEditPlayer,
  onArchivePlayer,
  onRestorePlayer,
  onOpenCreateModal,
  onExportCsv,
  onTriggerBackfill,
}) => {
  const [activeMenuPlayerId, setActiveMenuPlayerId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyGioId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const segments: { id: PlayerSegment; label: string; count: number }[] = [
    { id: 'all', label: 'All Customers', count: segmentsSummary.all || 0 },
    { id: 'gaming_booking', label: 'Gaming Bookings', count: segmentsSummary.gaming_booking || 0 },
    { id: 'tournament_registration', label: 'Tournament Registrations', count: segmentsSummary.tournament_registration || 0 },
    { id: 'player_registration', label: 'Player Registrations', count: segmentsSummary.player_registration || 0 },
    { id: 'upcoming_bookings', label: 'Upcoming Bookings', count: segmentsSummary.upcoming_bookings || 0 },
    { id: 'tournament_participants', label: 'Tournament Participants', count: segmentsSummary.tournament_participants || 0 },
    { id: 'frequent', label: 'Frequent Visitors', count: segmentsSummary.frequent || 0 },
    { id: 'vip', label: 'VIP Members', count: segmentsSummary.vip || 0 },
    { id: 'inactive', label: 'Inactive / Lapsed', count: segmentsSummary.inactive || 0 },
  ];

  const getSourceBadges = (player: Player) => {
    const rawSources = player.sources && player.sources.length > 0
      ? player.sources
      : player.source
        ? [player.source]
        : ['player_registration'];

    const uniqueSources = Array.from(new Set(rawSources));

    return (
      <div className="flex flex-wrap gap-1">
        {uniqueSources.map((src) => {
          if (src === 'gaming_booking') {
            return (
              <span
                key={src}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[10px] font-mono font-medium text-blue-400"
                title="Acquired via Gaming Booking"
              >
                <span>🎮 Booking</span>
              </span>
            );
          }
          if (src === 'tournament_registration') {
            return (
              <span
                key={src}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-mono font-medium text-orange-400"
                title="Acquired via Tournament Registration"
              >
                <span>🏆 Tournament</span>
              </span>
            );
          }
          return (
            <span
              key={src}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-[10px] font-mono font-medium text-pink-400"
              title="Acquired via Player Registration"
            >
              <span>👤 Direct Signup</span>
            </span>
          );
        })}
      </div>
    );
  };

  const getTierBadge = (tier: MembershipTier) => {
    switch (tier) {
      case 'vip':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-pink/20 border border-brand-pink text-[10px] font-mono font-bold text-brand-pink uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3 h-3 text-brand-pink" />
            <span>VIP PLATINUM</span>
          </span>
        );
      case 'gold':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/60 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
            <span>GOLD</span>
          </span>
        );
      case 'silver':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-400/20 border border-slate-400/50 text-[10px] font-mono font-semibold text-slate-300 uppercase tracking-wider">
            <span>SILVER</span>
          </span>
        );
      case 'bronze':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-800/20 border border-amber-700/50 text-[10px] font-mono font-semibold text-amber-500 uppercase tracking-wider">
            <span>BRONZE</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-surfaceElevated border border-brand-border text-[10px] font-mono text-brand-subtle uppercase tracking-wider">
            <span>STANDARD</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: PlayerStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>ACTIVE</span>
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-mono">
            <span>INACTIVE</span>
          </span>
        );
      case 'banned':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-mono font-bold">
            <span>BANNED</span>
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-400 text-[10px] font-mono">
            <span>ARCHIVED</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-brand-subtle absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, gamer tag, phone, email, tags..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-brand-surface border border-brand-border rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-brand-subtle focus:outline-none focus:border-brand-pink transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-2.5 text-brand-subtle hover:text-white text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onTriggerBackfill}
            className="px-3.5 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-blue text-xs font-mono text-brand-subtle hover:text-white flex items-center gap-1.5 transition-colors"
            title="Scan past tournament registrations & bookings to sync player profiles"
          >
            <RefreshCw className="w-3.5 h-3.5 text-brand-blue" />
            <span>Sync Backfill</span>
          </button>

          <button
            onClick={onExportCsv}
            className="px-3.5 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-orange text-xs font-mono text-brand-subtle hover:text-white flex items-center gap-1.5 transition-colors"
            title="Export filtered directory to CSV"
          >
            <Download className="w-3.5 h-3.5 text-brand-orange" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-luxury-pink transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Player</span>
          </button>
        </div>
      </div>

      {/* Segment Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {segments.map((s) => {
          const isSelected = selectedSegment === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSegmentChange(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-brand-pink text-white font-bold shadow-luxury-pink'
                  : 'bg-brand-surface border border-brand-border text-brand-subtle hover:text-white hover:border-brand-pink/50'
              }`}
            >
              <span>{s.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-black/30 text-white' : 'bg-brand-surfaceElevated text-brand-pink'
                }`}
              >
                {s.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dropdown Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-brand-surface border border-brand-border/80 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-brand-subtle font-mono text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="bg-brand-surfaceElevated border border-brand-border rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-brand-pink"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Tier Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-brand-subtle font-mono text-[11px]">Tier:</span>
            <select
              value={tierFilter}
              onChange={(e) => onTierFilterChange(e.target.value)}
              className="bg-brand-surfaceElevated border border-brand-border rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-brand-pink"
            >
              <option value="all">All Tiers</option>
              <option value="standard">Standard</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="vip">VIP Platinum</option>
            </select>
          </div>
        </div>

        {/* Sort By */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-brand-subtle" />
          <span className="text-brand-subtle font-mono text-[11px]">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="bg-brand-surfaceElevated border border-brand-border rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-brand-pink"
          >
            <option value="createdAt">Date Joined</option>
            <option value="lastVisit">Last Visit</option>
            <option value="totalSpend">Total Spend</option>
            <option value="tournaments">Tournaments Entered</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-dark/95 border-b border-brand-border text-brand-subtle font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Player ID</th>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Contact Number</th>
                <th className="py-3.5 px-4">Email Address</th>
                <th className="py-3.5 px-4">Acquisition Source</th>
                <th className="py-3.5 px-4">Gaming Bookings</th>
                <th className="py-3.5 px-4">Tournaments</th>
                <th className="py-3.5 px-4">Last Activity</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 text-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-brand-subtle font-mono">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-pink mb-2" />
                    <span>Loading player directory...</span>
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-surfaceElevated border border-brand-border flex items-center justify-center mx-auto text-brand-subtle">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-semibold text-white">No players found</div>
                    <p className="text-xs text-brand-subtle max-w-sm mx-auto">
                      No customer profiles matched your current search or segment filters.
                    </p>
                    <button
                      onClick={onOpenCreateModal}
                      className="px-4 py-2 rounded-full bg-brand-pink text-white text-xs font-semibold uppercase tracking-wider shadow-luxury-pink"
                    >
                      Register First Player
                    </button>
                  </td>
                </tr>
              ) : (
                players.map((p) => {
                  const whatsappHref = `https://wa.me/91${p.normalizedPhone}?text=${encodeURIComponent(
                    `Hello ${p.name}! Greetings from GioCasa Social House & Gaming Lounge, Ayodhya. 🎮`
                  )}`;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-brand-surfaceElevated/50 transition-colors group"
                    >
                      {/* 1. GioCasa Player ID */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-brand-blue">{p.gioId}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyGioId(p.gioId);
                            }}
                            className="p-1 rounded bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-white transition-colors"
                            title={`Copy ${p.gioId}`}
                          >
                            {copiedId === p.gioId ? (
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-60" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-brand-muted block mt-0.5">{p.id}</span>
                      </td>

                      {/* 2. Customer Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-orange/20 to-brand-pink/20 border border-brand-pink/40 flex items-center justify-center text-brand-pink font-bold text-xs shrink-0">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <button
                              onClick={() => onViewProfile(p.id)}
                              className="font-serif text-sm font-bold text-white hover:text-brand-pink transition-colors text-left block"
                            >
                              {p.name}
                            </button>
                            <span className="font-mono text-[11px] text-brand-pink block leading-none mt-0.5">
                              @{p.gamerTag}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Contact Number */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-white">
                          <Phone className="w-3 h-3 text-brand-subtle" />
                          <span>{p.phone}</span>
                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                            title="Message on WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </a>
                        </div>
                      </td>

                      {/* 4. Email Address */}
                      <td className="py-3.5 px-4">
                        {p.email ? (
                          <div className="flex items-center gap-1.5 text-brand-subtle text-xs truncate max-w-[170px]" title={p.email}>
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate text-white">{p.email}</span>
                          </div>
                        ) : (
                          <span className="text-brand-muted text-xs italic">Not provided</span>
                        )}
                      </td>

                      {/* 5. Acquisition Source */}
                      <td className="py-3.5 px-4">
                        {getSourceBadges(p)}
                      </td>

                      {/* 6. Gaming Bookings */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="font-bold text-white">
                          {p.stats.bookingsCount || 0}
                        </div>
                        <div className="text-[10px] text-brand-subtle">
                          {p.stats.completedBookingsCount ?? 0} completed
                        </div>
                      </td>

                      {/* 7. Tournament Registrations */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="font-bold text-white flex items-center gap-1">
                          <span>{p.stats.tournamentCount || 0}</span>
                          {(p.stats.tournamentWins || 0) > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-brand-orange/20 text-brand-orange text-[9px] font-bold">
                              <Trophy className="w-2.5 h-2.5" />
                              {p.stats.tournamentWins}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 8. Last Activity */}
                      <td className="py-3.5 px-4 font-mono text-xs text-brand-subtle">
                        {p.stats.lastActivityDate
                          ? new Date(p.stats.lastActivityDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : p.stats.lastVisitDate || 'Not recorded'}
                      </td>

                      {/* 9. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewProfile(p.id)}
                            className="px-3 py-1 rounded-xl bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-sm"
                          >
                            View Profile
                          </button>
                          <button
                            onClick={() => onEditPlayer(p)}
                            className="p-1.5 rounded-lg bg-brand-surfaceElevated hover:bg-brand-surface border border-brand-border text-brand-subtle hover:text-white transition-colors"
                            title="Edit Player"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {p.status === 'archived' ? (
                            <button
                              onClick={() => onRestorePlayer(p)}
                              className="p-1.5 rounded-lg bg-brand-surfaceElevated hover:bg-brand-surface border border-brand-border text-emerald-400 hover:text-emerald-300 transition-colors"
                              title="Restore Player"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onArchivePlayer(p)}
                              className="p-1.5 rounded-lg bg-brand-surfaceElevated hover:bg-brand-surface border border-brand-border text-brand-subtle hover:text-red-400 transition-colors"
                              title="Archive Player"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {total > 0 && (
          <div className="p-4 border-t border-brand-border/60 bg-brand-dark/95 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-brand-subtle">
            <div>
              Showing <strong className="text-white">{players.length}</strong> of{' '}
              <strong className="text-white">{total}</strong> players
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="p-1.5 rounded-lg bg-brand-surface border border-brand-border text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-brand-pink transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page <strong className="text-white">{page}</strong> of{' '}
                <strong className="text-white">{totalPages}</strong>
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="p-1.5 rounded-lg bg-brand-surface border border-brand-border text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-brand-pink transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
