import {
  Player,
  PlayerQueryParams,
  PlayerProfileDetails,
  StaffNote,
  FollowUpReminder,
  LoyaltyLedgerEntry,
  HistoricalReconciliationReport,
} from '../types';
import { getApiBaseUrl } from './apiConfig';

const API_BASE = `${getApiBaseUrl()}/admin/players`;

class PlayerCrmApiClient {
  private getHeaders(passcode: string): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-admin-passcode': passcode,
    };
  }

  async getPlayers(
    passcode: string,
    params: PlayerQueryParams = {}
  ): Promise<{
    players: Player[];
    total: number;
    page: number;
    totalPages: number;
    segmentsSummary: Record<string, number>;
  }> {
    const sp = new URLSearchParams();
    if (params.search) sp.set('search', params.search);
    if (params.segment && params.segment !== 'all') sp.set('segment', params.segment);
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    if (params.tier && params.tier !== 'all') sp.set('tier', params.tier);
    if (params.sortBy) sp.set('sortBy', params.sortBy);
    if (params.sortOrder) sp.set('sortOrder', params.sortOrder);
    if (params.page) sp.set('page', String(params.page));
    if (params.limit) sp.set('limit', String(params.limit));

    const qs = sp.toString();
    const url = qs ? `${API_BASE}?${qs}` : API_BASE;

    const res = await fetch(url, {
      headers: this.getHeaders(passcode),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch player directory.');
    }
    return json.data;
  }

  async getPlayerProfile(passcode: string, id: string): Promise<PlayerProfileDetails> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      headers: this.getHeaders(passcode),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to load player profile.');
    }
    return json.data;
  }

  async createPlayer(passcode: string, data: Partial<Player>): Promise<Player> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: this.getHeaders(passcode),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to create player.');
    }
    return json.data;
  }

  async updatePlayer(passcode: string, id: string, updates: Partial<Player>): Promise<Player> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: this.getHeaders(passcode),
      body: JSON.stringify(updates),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update player.');
    }
    return json.data;
  }

  async archivePlayer(passcode: string, id: string): Promise<Player> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getHeaders(passcode),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to archive player.');
    }
    return json.data;
  }

  async restorePlayer(passcode: string, id: string): Promise<Player> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
      headers: this.getHeaders(passcode),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to restore player.');
    }
    return json.data;
  }

  async addNote(passcode: string, playerId: string, text: string, author = 'Admin'): Promise<StaffNote> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(playerId)}/notes`, {
      method: 'POST',
      headers: this.getHeaders(passcode),
      body: JSON.stringify({ text, author }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to add staff note.');
    }
    return json.data;
  }

  async deleteNote(passcode: string, playerId: string, noteId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(playerId)}/notes/${encodeURIComponent(noteId)}`, {
      method: 'DELETE',
      headers: this.getHeaders(passcode),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete staff note.');
    }
    return true;
  }

  async addReminder(passcode: string, playerId: string, title: string, dueDate: string): Promise<FollowUpReminder> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(playerId)}/reminders`, {
      method: 'POST',
      headers: this.getHeaders(passcode),
      body: JSON.stringify({ title, dueDate }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to add reminder.');
    }
    return json.data;
  }

  async updateReminder(
    passcode: string,
    playerId: string,
    reminderId: string,
    isCompleted: boolean
  ): Promise<FollowUpReminder> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(playerId)}/reminders/${encodeURIComponent(reminderId)}`, {
      method: 'PATCH',
      headers: this.getHeaders(passcode),
      body: JSON.stringify({ isCompleted }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update reminder.');
    }
    return json.data;
  }

  async adjustLoyalty(
    passcode: string,
    playerId: string,
    points: number,
    type: 'earn' | 'redeem' | 'adjustment' | 'bonus',
    reason: string,
    referenceId?: string
  ): Promise<{ player: Player; ledgerEntry: LoyaltyLedgerEntry }> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(playerId)}/loyalty`, {
      method: 'POST',
      headers: this.getHeaders(passcode),
      body: JSON.stringify({ points, type, reason, referenceId }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to adjust loyalty points.');
    }
    return json.data;
  }

  async getRecentLoyalty(passcode: string): Promise<LoyaltyLedgerEntry[]> {
    const res = await fetch(`${API_BASE}/loyalty/recent`, {
      headers: this.getHeaders(passcode),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch recent loyalty ledger.');
    }
    return json.data;
  }

  async triggerBackfill(passcode: string): Promise<{ syncedPlayersCount: number; message?: string }> {
    const res = await fetch(`${API_BASE}/sync-backfill`, {
      method: 'POST',
      headers: this.getHeaders(passcode),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to run historical backfill.');
    }
    return json.data;
  }

  async reconcileHistoricalData(passcode: string): Promise<HistoricalReconciliationReport> {
    const res = await fetch(`${API_BASE}/reconcile`, {
      method: 'POST',
      headers: this.getHeaders(passcode),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to run historical reconciliation.');
    }
    return json.data;
  }

  getExportCsvUrl(passcode: string, params: PlayerQueryParams = {}): string {
    const sp = new URLSearchParams();
    sp.set('passcode', passcode);
    if (params.search) sp.set('search', params.search);
    if (params.segment && params.segment !== 'all') sp.set('segment', params.segment);
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    if (params.tier && params.tier !== 'all') sp.set('tier', params.tier);
    if (params.sortBy) sp.set('sortBy', params.sortBy);
    if (params.sortOrder) sp.set('sortOrder', params.sortOrder);
    return `${API_BASE}/export/csv?${sp.toString()}`;
  }

  // ======================== PUBLIC CUSTOMER LOOKUP & VERIFICATION ========================

  async publicLookupPlayer(gioId: string) {
    const res = await fetch(`${getApiBaseUrl()}/players/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gioId }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Player ID lookup failed.');
    }
    return json.data;
  }

  async publicVerifyPlayer(gioId: string, phoneLast4: string, fullPhone?: string) {
    const res = await fetch(`${getApiBaseUrl()}/players/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gioId, phoneLast4, fullPhone }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Verification failed.');
    }
    return json.data;
  }

  async publicRegisterPlayer(data: any) {
    const res = await fetch(`${getApiBaseUrl()}/players/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Registration failed.');
    }
    return json.data;
  }

  async publicRecoverPlayerId(payloadOrIdentifier: string | {
    identifier?: string;
    phone?: string;
    email?: string;
    verificationName?: string;
    sessionToken?: string;
  }): Promise<{
    found?: boolean;
    requiresVerification?: boolean;
    verified?: boolean;
    sessionToken?: string;
    maskedContact?: string;
    challengePrompt?: string;
    gioId?: string;
    name?: string;
    gamerTag?: string;
    token?: string;
    player?: any;
    message?: string;
    error?: string;
  }> {
    const body = typeof payloadOrIdentifier === 'string'
      ? { identifier: payloadOrIdentifier }
      : payloadOrIdentifier;

    const res = await fetch(`${getApiBaseUrl()}/players/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({ success: false, error: 'Network error communicating with server.' }));
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Recovery failed.');
    }
    return json.data;
  }

  // ======================== ADMIN LOYALTY RULES ========================

  async getLoyaltyRules(passcode: string) {
    const res = await fetch(`${API_BASE}/loyalty/rules`, {
      headers: this.getHeaders(passcode),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch loyalty rules.');
    }
    return json.data;
  }

  async updateLoyaltyRules(passcode: string, updates: any) {
    const res = await fetch(`${API_BASE}/loyalty/rules`, {
      method: 'PUT',
      headers: this.getHeaders(passcode),
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update loyalty rules.');
    }
    return json.data;
  }

  // ======================== ADMIN REFERRALS ========================

  async getReferrals(passcode: string, params: { referrerPlayerId?: string; status?: string; limit?: number } = {}) {
    const sp = new URLSearchParams();
    if (params.referrerPlayerId) sp.set('referrerPlayerId', params.referrerPlayerId);
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    if (params.limit) sp.set('limit', String(params.limit));

    const qs = sp.toString();
    const url = qs ? `${API_BASE}/referrals?${qs}` : `${API_BASE}/referrals`;

    const res = await fetch(url, {
      headers: this.getHeaders(passcode),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch referrals.');
    }
    return json.data;
  }

  async getReferralLeaderboard(passcode: string, limit = 10) {
    const res = await fetch(`${API_BASE}/referrals/leaderboard?limit=${limit}`, {
      headers: this.getHeaders(passcode),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch referral leaderboard.');
    }
    return json.data;
  }

  async updateReferralStatus(passcode: string, id: string, status: string, notes?: string) {
    const res = await fetch(`${API_BASE}/referrals/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.getHeaders(passcode),
      body: JSON.stringify({ status, notes }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update referral.');
    }
    return json.data;
  }

  // ======================== ADMIN REMINDERS ========================

  async getAdminReminders(passcode: string, params: { status?: string; playerId?: string } = {}) {
    const sp = new URLSearchParams();
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    if (params.playerId) sp.set('playerId', params.playerId);

    const qs = sp.toString();
    const url = qs ? `${API_BASE}/reminders?${qs}` : `${API_BASE}/reminders`;

    const res = await fetch(url, {
      headers: this.getHeaders(passcode),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch reminders.');
    }
    return json.data;
  }

  async createAdminReminder(passcode: string, data: any) {
    const res = await fetch(`${API_BASE}/reminders`, {
      method: 'POST',
      headers: this.getHeaders(passcode),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to create reminder.');
    }
    return json.data;
  }

  async updateAdminReminder(passcode: string, reminderId: string, updates: any) {
    const res = await fetch(`${API_BASE}/reminders/${encodeURIComponent(reminderId)}`, {
      method: 'PATCH',
      headers: this.getHeaders(passcode),
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update reminder.');
    }
    return json.data;
  }

  async deleteAdminReminder(passcode: string, reminderId: string) {
    const res = await fetch(`${API_BASE}/reminders/${encodeURIComponent(reminderId)}`, {
      method: 'DELETE',
      headers: this.getHeaders(passcode),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete reminder.');
    }
    return json.success;
  }

  // ======================== AUTOMATION EVENTS ========================

  async getAutomationEvents(passcode: string, params: { status?: string; limit?: number } = {}) {
    const sp = new URLSearchParams();
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    if (params.limit) sp.set('limit', String(params.limit));

    const qs = sp.toString();
    const url = qs ? `${API_BASE}/automation-events?${qs}` : `${API_BASE}/automation-events`;

    const res = await fetch(url, {
      headers: this.getHeaders(passcode),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch automation events.');
    }
    return json.data;
  }

  async retryAutomationEvent(passcode: string, id: string) {
    const res = await fetch(`${API_BASE}/automation-events/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
      headers: this.getHeaders(passcode),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to retry automation event.');
    }
    return json.data;
  }

  // ======================== COMMUNICATION ========================

  async logCommunication(passcode: string, playerId: string, data: any) {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(playerId)}/communication`, {
      method: 'POST',
      headers: this.getHeaders(passcode),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to log communication.');
    }
    return json.data;
  }

  async getCommunicationLogs(passcode: string, playerId: string) {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(playerId)}/communication`, {
      headers: this.getHeaders(passcode),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch communication logs.');
    }
    return json.data;
  }
}

export const playerCrmApi = new PlayerCrmApiClient();
