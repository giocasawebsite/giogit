import React, { useState, useEffect, useCallback } from 'react';
import { PageRoute, RouteParams, Player, PlayerProfileDetails, PlayerSegment } from '../../types';
import { playerCrmApi } from '../../services/playerCrmApi';
import { PlayerDirectoryTable } from './crm/PlayerDirectoryTable';
import { PlayerProfileView } from './crm/PlayerProfileView';
import { PlayerModal } from './crm/PlayerModal';
import { PlayerSegmentsView } from './crm/PlayerSegmentsView';
import { PlayerLoyaltyView } from './crm/PlayerLoyaltyView';
import { PlayerReferralsView } from './crm/PlayerReferralsView';
import { AdminRemindersView } from './crm/AdminRemindersView';
import { LoyaltyRulesModal } from './crm/LoyaltyRulesModal';
import { useAdminLiveSync } from '../../hooks/useAdminLiveSync';
import { Users, PieChart, Sparkles, RefreshCw, AlertCircle, Gift, Clock, Sliders } from 'lucide-react';

interface AdminPlayerCRMProps {
  passcode: string;
  onNavigate: (page: PageRoute, params?: RouteParams) => void;
  subTab?: 'directory' | 'profile' | 'segments' | 'loyalty' | 'referrals' | 'reminders';
  playerId?: string;
}

export const AdminPlayerCRM: React.FC<AdminPlayerCRMProps> = ({
  passcode,
  onNavigate,
  subTab = 'directory',
  playerId,
}) => {
  // Navigation Sub Tab
  const [currentSubTab, setCurrentSubTab] = useState<'directory' | 'profile' | 'segments' | 'loyalty' | 'referrals' | 'reminders'>(subTab);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(playerId || null);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);

  // Directory Data
  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [segmentsSummary, setSegmentsSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<PlayerSegment>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');

  // Profile View Data
  const [detailedProfile, setDetailedProfile] = useState<PlayerProfileDetails | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);

  // Sync with prop changes
  useEffect(() => {
    if (subTab) setCurrentSubTab(subTab);
    if (playerId) setSelectedPlayerId(playerId);
  }, [subTab, playerId]);

  // Load Directory
  const loadDirectory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await playerCrmApi.getPlayers(passcode, {
        search: searchQuery,
        segment: selectedSegment,
        status: statusFilter as any,
        tier: tierFilter as any,
        sortBy: sortBy as any,
        page,
        limit: 15,
      });

      setPlayers(data.players);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setSegmentsSummary(data.segmentsSummary);
    } catch (err: any) {
      console.error('Failed to load player directory:', err);
      setError(err.message || 'Unable to connect to Player CRM directory.');
    } finally {
      setLoading(false);
    }
  };

  // Load Player Profile
  const loadProfile = async (id: string) => {
    setProfileLoading(true);
    setError(null);
    try {
      const data = await playerCrmApi.getPlayerProfile(passcode, id);
      setDetailedProfile(data);
    } catch (err: any) {
      console.error('Failed to load player profile:', err);
      setError(err.message || 'Unable to load player profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // 3-Second Live Auto-Sync for Player CRM Directory & Profile Views
  const silentSyncCRM = useCallback(async () => {
    if (!passcode) return;
    // Don't auto-sync while any modal is open to avoid interrupting active user typing
    if (createModalOpen || editModalOpen || rulesModalOpen) return;

    if (currentSubTab === 'directory' || currentSubTab === 'segments') {
      const data = await playerCrmApi.getPlayers(passcode, {
        search: searchQuery,
        segment: selectedSegment,
        status: statusFilter as any,
        tier: tierFilter as any,
        sortBy: sortBy as any,
        page,
        limit: 15,
      });

      setPlayers(data.players);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setSegmentsSummary(data.segmentsSummary);
    } else if (currentSubTab === 'profile' && selectedPlayerId) {
      const data = await playerCrmApi.getPlayerProfile(passcode, selectedPlayerId);
      setDetailedProfile(data);
    }
  }, [
    passcode,
    currentSubTab,
    selectedPlayerId,
    searchQuery,
    selectedSegment,
    statusFilter,
    tierFilter,
    sortBy,
    page,
    createModalOpen,
    editModalOpen,
    rulesModalOpen,
  ]);

  useAdminLiveSync({
    enabled: !!passcode,
    intervalMs: 3000,
    pauseWhenHidden: true,
    onSync: silentSyncCRM,
  });

  useEffect(() => {
    if (currentSubTab === 'directory' || currentSubTab === 'segments') {
      loadDirectory();
    }
  }, [passcode, searchQuery, selectedSegment, statusFilter, tierFilter, sortBy, page, currentSubTab]);

  useEffect(() => {
    if (currentSubTab === 'profile' && selectedPlayerId) {
      loadProfile(selectedPlayerId);
    }
  }, [currentSubTab, selectedPlayerId, passcode]);

  // Navigation handlers
  const handleViewProfile = (id: string) => {
    setSelectedPlayerId(id);
    setCurrentSubTab('profile');
    onNavigate('admin', { adminTab: 'players', adminSubTab: 'profile', adminPlayerId: id });
  };

  const handleBackToDirectory = () => {
    setSelectedPlayerId(null);
    setDetailedProfile(null);
    setCurrentSubTab('directory');
    onNavigate('admin', { adminTab: 'players', adminSubTab: 'directory' });
  };

  const handleSelectSegment = (seg: PlayerSegment) => {
    setSelectedSegment(seg);
    setPage(1);
    setCurrentSubTab('directory');
    onNavigate('admin', { adminTab: 'players', adminSubTab: 'directory' });
  };

  // Actions
  const handleCreatePlayer = async (data: Partial<Player>) => {
    await playerCrmApi.createPlayer(passcode, data);
    loadDirectory();
  };

  const handleEditPlayer = async (data: Partial<Player>) => {
    if (!playerToEdit) return;
    await playerCrmApi.updatePlayer(passcode, playerToEdit.id, data);
    setPlayerToEdit(null);
    setEditModalOpen(false);
    if (currentSubTab === 'profile' && selectedPlayerId) {
      loadProfile(selectedPlayerId);
    } else {
      loadDirectory();
    }
  };

  const handleArchivePlayer = async (player: Player) => {
    if (!window.confirm(`Archive player "${player.name}" (@${player.gamerTag})?`)) return;
    try {
      await playerCrmApi.archivePlayer(passcode, player.id);
      loadDirectory();
    } catch (err: any) {
      alert(err.message || 'Failed to archive player.');
    }
  };

  const handleRestorePlayer = async (player: Player) => {
    try {
      await playerCrmApi.restorePlayer(passcode, player.id);
      loadDirectory();
    } catch (err: any) {
      alert(err.message || 'Failed to restore player.');
    }
  };

  const handleExportCsv = () => {
    const url = playerCrmApi.getExportCsvUrl(passcode, {
      search: searchQuery,
      segment: selectedSegment,
      status: statusFilter as any,
      tier: tierFilter as any,
      sortBy: sortBy as any,
    });
    window.open(url, '_blank');
  };

  const handleTriggerBackfill = async () => {
    try {
      const report = await playerCrmApi.reconcileHistoricalData(passcode);
      alert(
        `Historical reconciliation complete!\n\n` +
        `• Bookings Processed: ${report.bookingsProcessed} (${report.bookingsLinked} linked, ${report.bookingsCreatedProfiles} new profiles)\n` +
        `• Tournaments Processed: ${report.tournamentsProcessed} (${report.tournamentsLinked} linked, ${report.tournamentsCreatedProfiles} new profiles)\n` +
        `• Synced Player Profiles: ${report.totalSyncedPlayers}\n` +
        `• Ambiguous Records Flagged: ${report.ambiguousRecordsFlagged.length}`
      );
      loadDirectory();
    } catch (err: any) {
      alert(err.message || 'Failed to complete reconciliation.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Sub-navigation tabs (only when not in individual profile view) */}
      {currentSubTab !== 'profile' && (
        <div className="flex flex-wrap items-center justify-between border-b border-brand-border/60 pb-1 gap-2">
          <div className="flex gap-2 sm:gap-4 overflow-x-auto text-xs font-mono uppercase tracking-wider">
            <button
              onClick={() => {
                setCurrentSubTab('directory');
                onNavigate('admin', { adminTab: 'players', adminSubTab: 'directory' });
              }}
              className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-all whitespace-nowrap ${
                currentSubTab === 'directory'
                  ? 'border-brand-pink text-brand-pink font-bold'
                  : 'border-transparent text-brand-subtle hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Player Directory</span>
            </button>

            <button
              onClick={() => {
                setCurrentSubTab('segments');
                onNavigate('admin', { adminTab: 'players', adminSubTab: 'segments' });
              }}
              className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-all whitespace-nowrap ${
                currentSubTab === 'segments'
                  ? 'border-brand-pink text-brand-pink font-bold'
                  : 'border-transparent text-brand-subtle hover:text-white'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Segments</span>
            </button>

            <button
              onClick={() => {
                setCurrentSubTab('loyalty');
                onNavigate('admin', { adminTab: 'players', adminSubTab: 'loyalty' });
              }}
              className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-all whitespace-nowrap ${
                currentSubTab === 'loyalty'
                  ? 'border-brand-pink text-brand-pink font-bold'
                  : 'border-transparent text-brand-subtle hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Loyalty & Tiers</span>
            </button>

            <button
              onClick={() => {
                setCurrentSubTab('referrals');
                onNavigate('admin', { adminTab: 'players', adminSubTab: 'referrals' });
              }}
              className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-all whitespace-nowrap ${
                currentSubTab === 'referrals'
                  ? 'border-brand-pink text-brand-pink font-bold'
                  : 'border-transparent text-brand-subtle hover:text-white'
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>Referrals</span>
            </button>

            <button
              onClick={() => {
                setCurrentSubTab('reminders');
                onNavigate('admin', { adminTab: 'players', adminSubTab: 'reminders' });
              }}
              className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-all whitespace-nowrap ${
                currentSubTab === 'reminders'
                  ? 'border-brand-pink text-brand-pink font-bold'
                  : 'border-transparent text-brand-subtle hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Reminders</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setRulesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-border hover:border-brand-pink text-xs font-mono text-brand-subtle hover:text-white transition"
          >
            <Sliders className="w-3.5 h-3.5 text-brand-pink" />
            <span>Loyalty Rules Engine</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadDirectory}
            className="underline hover:text-white text-[11px] font-mono"
          >
            Retry
          </button>
        </div>
      )}

      {/* Sub-view 1: Player Directory Table */}
      {currentSubTab === 'directory' && (
        <PlayerDirectoryTable
          players={players}
          total={total}
          page={page}
          totalPages={totalPages}
          segmentsSummary={segmentsSummary}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setPage(1);
          }}
          selectedSegment={selectedSegment}
          onSegmentChange={(s) => {
            setSelectedSegment(s);
            setPage(1);
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(st) => {
            setStatusFilter(st);
            setPage(1);
          }}
          tierFilter={tierFilter}
          onTierFilterChange={(tf) => {
            setTierFilter(tf);
            setPage(1);
          }}
          sortBy={sortBy}
          onSortByChange={(sb) => setSortBy(sb)}
          onPageChange={(p) => setPage(p)}
          onViewProfile={handleViewProfile}
          onEditPlayer={(p) => {
            setPlayerToEdit(p);
            setEditModalOpen(true);
          }}
          onArchivePlayer={handleArchivePlayer}
          onRestorePlayer={handleRestorePlayer}
          onOpenCreateModal={() => setCreateModalOpen(true)}
          onExportCsv={handleExportCsv}
          onTriggerBackfill={handleTriggerBackfill}
        />
      )}

      {/* Sub-view 2: Individual Player Profile */}
      {currentSubTab === 'profile' && (
        profileLoading || !detailedProfile ? (
          <div className="py-24 text-center text-brand-subtle font-mono text-xs space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-pink" />
            <div>Loading detailed player profile...</div>
          </div>
        ) : (
          <PlayerProfileView
            profile={detailedProfile}
            passcode={passcode}
            onBack={handleBackToDirectory}
            onEdit={() => {
              setPlayerToEdit(detailedProfile.player);
              setEditModalOpen(true);
            }}
            onRefresh={() => {
              if (selectedPlayerId) loadProfile(selectedPlayerId);
            }}
          />
        )
      )}

      {/* Sub-view 3: Customer Segments View */}
      {currentSubTab === 'segments' && (
        <PlayerSegmentsView
          segmentsSummary={segmentsSummary}
          onSelectSegment={handleSelectSegment}
        />
      )}

      {/* Sub-view 4: Loyalty & Tiers View */}
      {currentSubTab === 'loyalty' && (
        <PlayerLoyaltyView passcode={passcode} />
      )}

      {/* Sub-view 5: Referrals Pipeline & Leaderboard */}
      {currentSubTab === 'referrals' && (
        <PlayerReferralsView passcode={passcode} onViewPlayer={handleViewProfile} />
      )}

      {/* Sub-view 6: Admin Follow-Up Reminders */}
      {currentSubTab === 'reminders' && (
        <AdminRemindersView passcode={passcode} onViewPlayer={handleViewProfile} />
      )}

      {/* Create Player Modal */}
      <PlayerModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreatePlayer}
        mode="create"
      />

      {/* Edit Player Modal */}
      <PlayerModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setPlayerToEdit(null);
        }}
        onSubmit={handleEditPlayer}
        initialData={playerToEdit}
        mode="edit"
      />

      {/* Loyalty Rules Modal */}
      <LoyaltyRulesModal
        isOpen={rulesModalOpen}
        passcode={passcode}
        onClose={() => setRulesModalOpen(false)}
      />
    </div>
  );
};
