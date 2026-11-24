import { GamingResource, SlotStatus, TimeSlot, Booking } from '../types';
export type { GamingResource, SlotStatus, TimeSlot, Booking };

export interface AvailabilityData {
  resourceId: string;
  date: string;
  durationMinutes: number;
  operatingHours: { open: string; close: string };
  slots: TimeSlot[];
}

export interface CreateBookingPayload {
  customerName: string;
  phone: string;
  email?: string;
  resourceId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  numberOfPeople: number;
  notes?: string;
}

export interface AdminOverviewData {
  date: string;
  currentTime: string;
  metrics: {
    upcoming: number;
    playingNow: number;
    completed: number;
    cancelled: number;
    revenue: number;
    totalToday: number;
  };
  liveStations: {
    id: string;
    name: string;
    category: string;
    status: 'available' | 'playing' | 'reserved' | 'maintenance';
    statusLabel: string;
    reason?: string;
    currentBooking?: {
      id: string;
      customerName: string;
      phone: string;
      endTime: string;
    };
    nextBooking?: {
      id: string;
      customerName: string;
      startTime: string;
    };
  }[];
}

import { getApiBaseUrl } from './apiConfig';

const API_BASE = getApiBaseUrl();

export const bookingApi = {
  // Fetch gaming resources
  async getResources(): Promise<GamingResource[]> {
    const res = await fetch(`${API_BASE}/booking/resources`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch resources');
    return json.data;
  },

  // Fetch slot availability for selected resource, date, and duration
  async getAvailability(resourceId: string, date: string, durationMinutes: number): Promise<AvailabilityData> {
    const res = await fetch(
      `${API_BASE}/booking/availability?resourceId=${encodeURIComponent(resourceId)}&date=${encodeURIComponent(
        date
      )}&durationMinutes=${durationMinutes}`
    );
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch availability');
    return json.data;
  },

  // Create new customer booking
  async createBooking(payload: CreateBookingPayload): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to confirm booking');
    return json.data;
  },

  // Look up booking by ID or phone
  async lookupBooking(query: string): Promise<Booking[]> {
    const res = await fetch(`${API_BASE}/bookings/lookup?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'No booking found');
    return json.data;
  },

  // Get single booking by ID
  async getBooking(id: string): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings/${encodeURIComponent(id)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Booking not found');
    return json.data;
  },

  // Extend booking
  async extendBooking(id: string, additionalMinutes: number): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings/${encodeURIComponent(id)}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ additionalMinutes }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Extension failed');
    return json.data;
  },

  // Cancel booking
  async cancelBooking(id: string, reason?: string): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Cancellation failed');
    return json.data;
  },

  // Admin Authentication & Session APIs
  async adminLogin(passcode: string): Promise<{ token: string; refreshToken?: string; expiresAt: string }> {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Authentication failed');
    if (json.data?.token && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('giocasa_admin_token', json.data.token);
      if (json.data.refreshToken) {
        sessionStorage.setItem('giocasa_admin_refresh_token', json.data.refreshToken);
      }
    }
    return json.data;
  },

  async adminRefresh(providedRefreshToken?: string): Promise<{ token: string; refreshToken: string; expiresAt: string }> {
    const refreshToken = providedRefreshToken || (
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('giocasa_admin_refresh_token') : null
    );
    if (!refreshToken) {
      const err: any = new Error('No refresh token available');
      err.isAuthError = true;
      err.status = 401;
      throw err;
    }

    const res = await fetch(`${API_BASE}/admin/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await res.json();
    if (!json.success || !json.data?.token) {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('giocasa_admin_token');
        sessionStorage.removeItem('giocasa_admin_refresh_token');
      }
      const err: any = new Error(json.error || 'Failed to refresh session');
      err.isAuthError = true;
      err.status = 401;
      throw err;
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('giocasa_admin_token', json.data.token);
      if (json.data.refreshToken) {
        sessionStorage.setItem('giocasa_admin_refresh_token', json.data.refreshToken);
      }
    }
    return json.data;
  },

  async adminLogout(token: string): Promise<void> {
    try {
      const refreshToken = typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('giocasa_admin_refresh_token')
        : null;

      await fetch(`${API_BASE}/admin/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': token,
          Authorization: `Bearer ${token}`,
          ...(refreshToken ? { 'x-admin-refresh-token': refreshToken } : {}),
        },
        body: JSON.stringify({ token, refreshToken }),
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('giocasa_admin_token');
        sessionStorage.removeItem('giocasa_admin_refresh_token');
      }
    }
  },

  // Centralized authenticated fetch helper with auto token refresh
  async _authFetch(url: string, passcode: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    headers.set('x-admin-passcode', passcode);
    headers.set('Authorization', `Bearer ${passcode}`);

    let res = await fetch(url, { ...options, headers });

    // If 401 Unauthorized, attempt to refresh session token before failing
    if (res.status === 401) {
      const refreshToken = typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('giocasa_admin_refresh_token')
        : null;

      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/admin/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          const refreshJson = await refreshRes.json();

          if (refreshJson.success && refreshJson.data?.token) {
            const newToken = refreshJson.data.token;
            const newRefresh = refreshJson.data.refreshToken;
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('giocasa_admin_token', newToken);
              if (newRefresh) {
                sessionStorage.setItem('giocasa_admin_refresh_token', newRefresh);
              }
            }

            // Notify React components of updated session token
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('giocasa_admin_token_refreshed', { detail: { token: newToken } }));
            }

            // Retry original request with the fresh token
            headers.set('x-admin-passcode', newToken);
            headers.set('Authorization', `Bearer ${newToken}`);
            res = await fetch(url, { ...options, headers });
            return res;
          }
        } catch {
          // Fall through to 401 handling
        }
      }

      // If refresh failed or was not possible, clear credentials & throw auth error
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('giocasa_admin_token');
        sessionStorage.removeItem('giocasa_admin_refresh_token');
      }
      const err: any = new Error('Unauthorized: Session expired. Please log in again.');
      err.isAuthError = true;
      err.status = 401;
      throw err;
    }

    return res;
  },

  // Admin APIs (require passcode header)
  async getAdminOverview(passcode: string): Promise<AdminOverviewData> {
    const res = await this._authFetch(`${API_BASE}/admin/overview`, passcode);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load admin overview');
    return json.data;
  },

  async getAdminBookings(
    passcode: string,
    filters?: { date?: string; resourceId?: string; status?: string; search?: string }
  ): Promise<Booking[]> {
    const params = new URLSearchParams();
    if (filters?.date) params.set('date', filters.date);
    if (filters?.resourceId) params.set('resourceId', filters.resourceId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);

    const res = await this._authFetch(`${API_BASE}/admin/bookings?${params.toString()}`, passcode);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load bookings');
    return json.data;
  },

  async createManualBooking(passcode: string, payload: any): Promise<Booking> {
    const res = await this._authFetch(`${API_BASE}/admin/bookings`, passcode, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Manual booking failed');
    return json.data;
  },

  async updateAdminBooking(passcode: string, id: string, updates: Partial<Booking>): Promise<Booking> {
    const res = await this._authFetch(`${API_BASE}/admin/bookings/${encodeURIComponent(id)}`, passcode, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Update failed');
    return json.data;
  },

  async startSession(passcode: string, id: string): Promise<Booking> {
    const res = await this._authFetch(`${API_BASE}/admin/bookings/${encodeURIComponent(id)}/start-play`, passcode, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to start session');
    return json.data;
  },

  async endSession(passcode: string, id: string): Promise<Booking> {
    const res = await this._authFetch(`${API_BASE}/admin/bookings/${encodeURIComponent(id)}/end-play`, passcode, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to end session');
    return json.data;
  },

  async editBooking(passcode: string, id: string, updates: Record<string, any>): Promise<Booking> {
    const res = await this._authFetch(`${API_BASE}/admin/bookings/${encodeURIComponent(id)}`, passcode, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update booking');
    return json.data;
  },

  async toggleResourceMaintenance(
    passcode: string,
    id: string,
    isMaintenance: boolean,
    maintenanceReason?: string
  ): Promise<GamingResource> {
    const res = await this._authFetch(`${API_BASE}/admin/resources/${encodeURIComponent(id)}`, passcode, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isMaintenance, maintenanceReason }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update resource maintenance');
    return json.data;
  },

  async changeAdminPasscode(
    currentPasscode: string,
    newPasscode: string
  ): Promise<{ success: boolean; message: string; data?: { token: string; refreshToken?: string; expiresAt: string } }> {
    const res = await fetch(`${API_BASE}/admin/change-passcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': currentPasscode,
        Authorization: `Bearer ${currentPasscode}`,
      },
      body: JSON.stringify({ currentPasscode, newPasscode }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update passcode');
    if (json.data?.token && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('giocasa_admin_token', json.data.token);
      if (json.data.refreshToken) {
        sessionStorage.setItem('giocasa_admin_refresh_token', json.data.refreshToken);
      }
    }
    return json;
  },

  // Delete a single booking by ID
  async deleteAdminBooking(passcode: string, id: string): Promise<{ success: boolean; message: string }> {
    const res = await this._authFetch(`${API_BASE}/admin/bookings/${encodeURIComponent(id)}`, passcode, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete booking');
    return json;
  },

  // Delete selected bookings in batch
  async deleteAdminBookingsBatch(
    passcode: string,
    ids: string[]
  ): Promise<{ success: boolean; count: number; message: string }> {
    const res = await this._authFetch(`${API_BASE}/admin/bookings/delete-batch`, passcode, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete selected bookings');
    return json;
  },

  // Clear booking history (completed & cancelled or all)
  async clearBookingHistory(
    passcode: string,
    scope: 'completed_and_cancelled' | 'all' = 'completed_and_cancelled'
  ): Promise<{ success: boolean; count: number; message: string }> {
    const res = await this._authFetch(`${API_BASE}/admin/bookings/clear-history`, passcode, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scope }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to clear booking history');
    return json;
  },
};
