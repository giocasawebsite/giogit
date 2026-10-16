import {
  Player,
  PlayerQueryParams,
  PlayerProfileDetails,
  StaffNote,
  FollowUpReminder,
  LoyaltyLedgerEntry,
} from '../types';

const API_BASE = '/api/admin/players';

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
}

export const playerCrmApi = new PlayerCrmApiClient();
