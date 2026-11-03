import { getApiBaseUrl } from './apiConfig';
import { DiningReservation, EventReservation } from '../types';

export interface CreateDiningReservationRequest {
  customerName: string;
  phone: string;
  whatsappPhone?: string;
  email?: string;
  guests: number;
  date: string;
  time: string;
  seatingPreference?: string;
  specialRequests?: string;
  additionalRequirements?: string;
}

export interface CreateEventReservationRequest {
  customerName: string;
  phone: string;
  whatsappPhone?: string;
  email: string;
  eventType: string;
  date: string;
  time: string;
  expectedGuests: number;
  estimatedBudget?: string;
  foodRequirements?: string;
  decorationRequirements?: string;
  additionalMessage?: string;
}

export class ReservationApiClient {
  private get baseUrl(): string {
    return getApiBaseUrl();
  }

  private getAuthHeaders(passcode?: string): Record<string, string> {
    const token = passcode || sessionStorage.getItem('giocasa_admin_token') || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['x-admin-passcode'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // ----------------------------------------------------
  // PUBLIC RESERVATION SUBMISSIONS
  // ----------------------------------------------------

  async submitDiningReservation(payload: CreateDiningReservationRequest): Promise<DiningReservation> {
    const res = await fetch(`${this.baseUrl}/reservations/dining`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to submit dining reservation request.');
    }
    return data.data;
  }

  async submitEventReservation(payload: CreateEventReservationRequest): Promise<EventReservation> {
    const res = await fetch(`${this.baseUrl}/reservations/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to submit event enquiry.');
    }
    return data.data;
  }

  async lookupReservation(reference: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/reservations/lookup/${encodeURIComponent(reference.trim())}`, {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Reservation not found.');
    }
    return data.data;
  }

  // ----------------------------------------------------
  // ADMIN RESERVATIONS MANAGEMENT
  // ----------------------------------------------------

  async getAdminDiningReservations(
    passcode?: string,
    filter?: { status?: string; date?: string; search?: string }
  ): Promise<{ reservations: DiningReservation[]; metrics: { total: number; pending: number; confirmed: number } }> {
    const params = new URLSearchParams();
    if (filter?.status && filter.status !== 'all') params.append('status', filter.status);
    if (filter?.date) params.append('date', filter.date);
    if (filter?.search) params.append('search', filter.search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${this.baseUrl}/admin/reservations/dining${qs}`, {
      headers: this.getAuthHeaders(passcode),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load dining reservations.');
    }
    return data.data;
  }

  async getAdminEventReservations(
    passcode?: string,
    filter?: { status?: string; date?: string; search?: string }
  ): Promise<{ reservations: EventReservation[]; metrics: { total: number; pending: number; confirmed: number } }> {
    const params = new URLSearchParams();
    if (filter?.status && filter.status !== 'all') params.append('status', filter.status);
    if (filter?.date) params.append('date', filter.date);
    if (filter?.search) params.append('search', filter.search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${this.baseUrl}/admin/reservations/events${qs}`, {
      headers: this.getAuthHeaders(passcode),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load event enquiries.');
    }
    return data.data;
  }

  async updateDiningReservation(
    id: string,
    updates: Partial<DiningReservation>,
    passcode?: string
  ): Promise<DiningReservation> {
    const res = await fetch(`${this.baseUrl}/admin/reservations/dining/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(passcode),
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update dining reservation.');
    }
    return data.data;
  }

  async updateEventReservation(
    id: string,
    updates: Partial<EventReservation>,
    passcode?: string
  ): Promise<EventReservation> {
    const res = await fetch(`${this.baseUrl}/admin/reservations/events/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(passcode),
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update event enquiry.');
    }
    return data.data;
  }

  async deleteDiningReservation(id: string, passcode?: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/admin/reservations/dining/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(passcode),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete dining reservation.');
    }
    return true;
  }

  async deleteEventReservation(id: string, passcode?: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/admin/reservations/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(passcode),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete event enquiry.');
    }
    return true;
  }
}

export const reservationApi = new ReservationApiClient();
