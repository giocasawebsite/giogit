import { VerifiedGuestBooking, PaymentMethod, PaymentStatus } from '../types';
import { buildApiUrl } from './apiConfig';

class VerificationApiClient {
  private getHeaders(passcode?: string): HeadersInit {
    const token =
      (passcode && passcode.trim()) ||
      (typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('giocasa_admin_token') ||
          sessionStorage.getItem('giocasa_admin_passcode')
        : '') ||
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem('giocasa_admin_passcode')
        : '') ||
      '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (token) {
      headers['x-admin-passcode'] = token;
      headers['x-admin-token'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Search for a booking or reservation by 4-digit guest verification code.
   * Throws friendly descriptive error message on failure.
   */
  async lookupGuestCode(code: string, passcode?: string): Promise<VerifiedGuestBooking> {
    const cleanCode = (code || '').trim();
    if (!/^\d{4}$/.test(cleanCode)) {
      throw new Error('Please enter a valid 4-digit numeric code.');
    }

    const url = buildApiUrl(`/admin/verify/code/${encodeURIComponent(cleanCode)}`);
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(passcode),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.success) {
      if (res.status === 404) {
        throw new Error('No booking or reservation found matching this 4-digit code.');
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error('Unauthorized: Admin or staff authentication required.');
      }
      if (res.status === 429) {
        throw new Error('Too many verification attempts. Please wait 5 minutes before trying again.');
      }
      throw new Error(json.error || 'Failed to verify guest code.');
    }

    return json.data;
  }

  /**
   * Confirms guest arrival and marks checkInStatus to 'checked_in'.
   */
  async checkInGuest(
    params: {
      bookingType: 'gaming' | 'dining' | 'event' | 'tournament';
      id: string;
      staffName?: string;
    },
    passcode?: string
  ): Promise<VerifiedGuestBooking> {
    const url = buildApiUrl('/admin/verify/check-in');
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(passcode),
      body: JSON.stringify(params),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.success) {
      if (res.status === 409) {
        throw new Error(json.error || 'Guest was already checked in.');
      }
      throw new Error(json.error || 'Failed to confirm guest arrival.');
    }

    return json.data;
  }

  /**
   * Updates payment verification status (Paid/Unpaid), method, amount, and reference.
   * Awards loyalty points on the actual amount received using configured rules.
   */
  async verifyPayment(
    params: {
      bookingType: 'gaming' | 'dining' | 'event' | 'tournament';
      id: string;
      paymentStatus: PaymentStatus;
      paymentMethod?: PaymentMethod;
      paymentReference?: string;
      staffName?: string;
      amount?: number;
    },
    passcode?: string
  ): Promise<{ data: VerifiedGuestBooking; pointsAwarded?: number; playerLoyaltyBalance?: number }> {
    const url = buildApiUrl('/admin/verify/payment');
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(passcode),
      body: JSON.stringify(params),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update payment status.');
    }

    return {
      data: json.data,
      pointsAwarded: json.pointsAwarded,
      playerLoyaltyBalance: json.playerLoyaltyBalance,
    };
  }

  /**
   * Retrieves list of recently verified / checked-in guests.
   */
  async getRecentVerifications(limit: number = 20, passcode?: string): Promise<VerifiedGuestBooking[]> {
    const url = buildApiUrl(`/admin/verify/recent?limit=${encodeURIComponent(String(limit))}`);
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(passcode),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to load recent verifications.');
    }

    return json.data || [];
  }
}

export const verificationApi = new VerificationApiClient();
