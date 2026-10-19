import {
  Tournament,
  TournamentRegistration,
  TournamentResult,
  HallOfFameEntry,
} from '../types';

import { getApiBaseUrl } from './apiConfig';

const API_BASE = getApiBaseUrl();

export interface RegisterTournamentPayload {
  participantName: string;
  phone: string;
  email?: string;
  inGameId?: string;
  teamName?: string;
  teammates?: { name: string; phone?: string; inGameId?: string }[];
  notes?: string;
  rulesAccepted: boolean;
}

export const arenaApi = {
  // ==========================================
  // PUBLIC ARENA APIS
  // ==========================================

  async getTournaments(params?: {
    category?: string;
    status?: string;
    search?: string;
    featured?: boolean;
  }): Promise<Tournament[]> {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.featured) query.set('featured', 'true');

    const res = await fetch(`${API_BASE}/tournaments?${query.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch tournaments');
    return json.data;
  },

  async getTournament(slug: string): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/tournaments/${encodeURIComponent(slug)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Tournament not found');
    return json.data;
  },

  async registerForTournament(slug: string, payload: RegisterTournamentPayload): Promise<{
    registration: TournamentRegistration;
    tournament: Partial<Tournament>;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/tournaments/${encodeURIComponent(slug)}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Registration failed');
    return {
      registration: json.data.registration,
      tournament: json.data.tournament,
      message: json.message,
    };
  },

  async getRegistrationConfirmation(
    slug: string,
    registrationId: string,
    token?: string,
    passcode?: string
  ): Promise<{
    registration: TournamentRegistration;
    tournament: Tournament;
  }> {
    const query = new URLSearchParams();
    if (token) query.set('token', token);
    const headers: Record<string, string> = {};
    if (passcode) headers['x-admin-passcode'] = passcode;

    const res = await fetch(
      `${API_BASE}/tournaments/${encodeURIComponent(slug)}/registration/${encodeURIComponent(registrationId)}?${query.toString()}`,
      { headers }
    );
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Registration details not found or unauthorized');
    return json.data;
  },

  async getTournamentResults(slug: string): Promise<{
    tournament: Partial<Tournament>;
    results: TournamentResult;
  }> {
    const res = await fetch(`${API_BASE}/tournaments/${encodeURIComponent(slug)}/results`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Tournament results not found');
    return json.data;
  },

  async getHallOfFame(params?: {
    category?: string;
    season?: string;
    featured?: boolean;
  }): Promise<HallOfFameEntry[]> {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.season && params.season !== 'all') query.set('season', params.season);
    if (params?.featured) query.set('featured', 'true');

    const res = await fetch(`${API_BASE}/hall-of-fame?${query.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch Hall of Fame gallery');
    return json.data;
  },

  // ==========================================
  // ADMIN ARENA APIS (Passcode Authenticated)
  // ==========================================

  async getAdminTournaments(passcode: string): Promise<{
    tournaments: Tournament[];
    metrics: {
      totalTournaments: number;
      totalPublished: number;
      totalDrafts: number;
      totalLive: number;
      totalCompleted: number;
      totalRegistrations: number;
    };
  }> {
    const res = await fetch(`${API_BASE}/admin/tournaments`, {
      headers: { 'x-admin-passcode': passcode },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load admin tournaments');
    return json.data;
  },

  async getAdminTournament(passcode: string, id: string): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/admin/tournaments/${encodeURIComponent(id)}`, {
      headers: { 'x-admin-passcode': passcode },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load tournament');
    return json.data;
  },

  async createAdminTournament(passcode: string, payload: Partial<Tournament>): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/admin/tournaments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create tournament');
    return json.data;
  },

  async updateAdminTournament(passcode: string, id: string, payload: Partial<Tournament>): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/admin/tournaments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update tournament');
    return json.data;
  },

  async deleteAdminTournament(passcode: string, id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/tournaments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-passcode': passcode },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete tournament');
  },

  async getAdminRegistrations(
    passcode: string,
    tournamentId: string,
    params?: { status?: string; search?: string }
  ): Promise<{
    tournament: Tournament;
    registrations: TournamentRegistration[];
    counts: {
      total: number;
      confirmed: number;
      waitlisted: number;
      checkedIn: number;
      pending: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(
      `${API_BASE}/admin/tournaments/${encodeURIComponent(tournamentId)}/registrations?${query.toString()}`,
      { headers: { 'x-admin-passcode': passcode } }
    );
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load registrations');
    return json.data;
  },

  async updateAdminRegistration(
    passcode: string,
    tournamentId: string,
    regId: string,
    updates: Partial<TournamentRegistration>
  ): Promise<TournamentRegistration> {
    const res = await fetch(
      `${API_BASE}/admin/tournaments/${encodeURIComponent(tournamentId)}/registrations/${encodeURIComponent(regId)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode,
        },
        body: JSON.stringify(updates),
      }
    );
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update registration');
    return json.data;
  },

  async exportAdminRegistrationsCsv(passcode: string, tournamentId: string, slug: string): Promise<void> {
    const res = await fetch(
      `${API_BASE}/admin/tournaments/${encodeURIComponent(tournamentId)}/registrations/export`,
      { headers: { 'x-admin-passcode': passcode } }
    );
    if (!res.ok) throw new Error('Failed to export CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giocasa_${slug}_registrations.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  async getAdminResults(
    passcode: string,
    tournamentId: string
  ): Promise<{ tournament: Tournament; results: TournamentResult }> {
    const res = await fetch(`${API_BASE}/admin/tournaments/${encodeURIComponent(tournamentId)}/results`, {
      headers: { 'x-admin-passcode': passcode },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch tournament results');
    return json.data;
  },

  async saveAdminResults(
    passcode: string,
    tournamentId: string,
    payload: Partial<TournamentResult>
  ): Promise<TournamentResult> {
    const res = await fetch(`${API_BASE}/admin/tournaments/${encodeURIComponent(tournamentId)}/results`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to save results');
    return json.data;
  },

  async publishResultsToHallOfFame(passcode: string, tournamentId: string): Promise<HallOfFameEntry> {
    const res = await fetch(
      `${API_BASE}/admin/tournaments/${encodeURIComponent(tournamentId)}/results/publish-to-hall-of-fame`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode,
        },
      }
    );
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to publish to Hall of Fame');
    return json.data;
  },

  async getAdminHallOfFame(passcode: string): Promise<HallOfFameEntry[]> {
    const res = await fetch(`${API_BASE}/admin/hall-of-fame`, {
      headers: { 'x-admin-passcode': passcode },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load Hall of Fame');
    return json.data;
  },

  async createAdminHallOfFame(passcode: string, payload: Partial<HallOfFameEntry>): Promise<HallOfFameEntry> {
    const res = await fetch(`${API_BASE}/admin/hall-of-fame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create Hall of Fame entry');
    return json.data;
  },

  async updateAdminHallOfFame(
    passcode: string,
    id: string,
    payload: Partial<HallOfFameEntry>
  ): Promise<HallOfFameEntry> {
    const res = await fetch(`${API_BASE}/admin/hall-of-fame/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update Hall of Fame entry');
    return json.data;
  },

  async deleteAdminHallOfFame(passcode: string, id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/hall-of-fame/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-passcode': passcode },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete Hall of Fame entry');
  },

  async uploadAdminImage(
    passcode: string,
    imageBase64: string,
    filename?: string
  ): Promise<{ url: string; filename: string }> {
    const res = await fetch(`${API_BASE}/admin/uploads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
      },
      body: JSON.stringify({ imageBase64, filename }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to upload image');
    return json.data;
  },
};
