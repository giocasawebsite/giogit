export interface GamingResource {
  id: string;
  name: string;
  category: 'ps5' | 'pool' | 'racing' | 'foosball' | 'boardgames';
  zoneId: string;
  ratePerHour: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  playersCapacity: { min: number; max: number };
  active: boolean;
  isMaintenance: boolean;
  maintenanceReason?: string;
  specs: string[];
  image: string;
  order: number;
}

export type SlotStatus = 'available' | 'booked' | 'playing' | 'unavailable';

export interface TimeSlot {
  startTime: string; // '14:00'
  endTime: string; // '15:00'
  status: SlotStatus;
  bookingId?: string;
  reason?: string;
}

export interface AvailabilityData {
  resourceId: string;
  date: string;
  durationMinutes: number;
  operatingHours: { open: string; close: string };
  slots: TimeSlot[];
}

export interface Booking {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  resourceId: string;
  resourceName: string;
  category: 'ps5' | 'pool' | 'racing' | 'foosball' | 'boardgames';
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  numberOfPeople: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'expired';
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'refunded';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  source: 'web' | 'admin' | 'phone';
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
  async adminLogin(passcode: string): Promise<{ token: string; expiresAt: string }> {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Authentication failed');
    return json.data;
  },

  async adminLogout(token: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/admin/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });
    } catch {
      // Ignore network errors on logout
    }
  },

  // Admin APIs (require passcode header)
  async getAdminOverview(passcode: string): Promise<AdminOverviewData> {
    const res = await fetch(`${API_BASE}/admin/overview`, {
      headers: { 'x-admin-passcode': passcode },
    });
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

    const res = await fetch(`${API_BASE}/admin/bookings?${params.toString()}`, {
      headers: { 'x-admin-passcode': passcode },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load bookings');
    return json.data;
  },

  async createManualBooking(passcode: string, payload: any): Promise<Booking> {
    const res = await fetch(`${API_BASE}/admin/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Manual booking failed');
    return json.data;
  },

  async updateAdminBooking(passcode: string, id: string, updates: Partial<Booking>): Promise<Booking> {
    const res = await fetch(`${API_BASE}/admin/bookings/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Update failed');
    return json.data;
  },

  async toggleResourceMaintenance(
    passcode: string,
    id: string,
    isMaintenance: boolean,
    maintenanceReason?: string
  ): Promise<GamingResource> {
    const res = await fetch(`${API_BASE}/admin/resources/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
      },
      body: JSON.stringify({ isMaintenance, maintenanceReason }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update resource maintenance');
    return json.data;
  },

  async changeAdminPasscode(currentPasscode: string, newPasscode: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin/change-passcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': currentPasscode,
      },
      body: JSON.stringify({ currentPasscode, newPasscode }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update passcode');
    return json;
  },

  // Delete a single booking by ID
  async deleteAdminBooking(passcode: string, id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin/bookings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
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
    const res = await fetch(`${API_BASE}/admin/bookings/delete-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
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
    const res = await fetch(`${API_BASE}/admin/bookings/clear-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
      },
      body: JSON.stringify({ scope }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to clear booking history');
    return json;
  },
};
