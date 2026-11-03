import { ContactSettings } from '../types';
import { buildApiUrl } from './apiConfig';
import { DEFAULT_WHATSAPP_NUMBER, DEFAULT_DISPLAY_PHONE } from '../utils/phone';

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  brandName: 'GioCasa',
  whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
  phone: DEFAULT_DISPLAY_PHONE,
  displayPhone: DEFAULT_DISPLAY_PHONE,
  email: 'ciao@giocasa.in',
  addressLine1: 'Civil Lines / Main Hub',
  addressLine2: 'Ayodhya, Uttar Pradesh 224001',
  landmark: 'Near City Center',
  city: 'Ayodhya',
  state: 'Uttar Pradesh',
  country: 'India',
  pincode: '224001',
  googleMapsUrl: 'https://maps.google.com/?q=Ayodhya+Uttar+Pradesh',
  instagramHandle: '@giocasa.ayodhya',
  instagramUrl: 'https://instagram.com',
};

class ContactApiClient {
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
   * Fetch public contact settings (cached, no auth required).
   */
  async getSettings(): Promise<ContactSettings> {
    try {
      const url = buildApiUrl('/contact/settings');
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch contact settings: ${res.statusText}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        return { ...DEFAULT_CONTACT_SETTINGS, ...json.data };
      }
      return DEFAULT_CONTACT_SETTINGS;
    } catch (err) {
      console.warn('Using default contact settings fallback:', err);
      return DEFAULT_CONTACT_SETTINGS;
    }
  }

  /**
   * Fetch admin contact settings (protected).
   */
  async getAdminSettings(passcode?: string): Promise<ContactSettings> {
    const url = buildApiUrl('/admin/contact-settings');
    const res = await fetch(url, {
      headers: this.getHeaders(passcode),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch admin contact settings.');
    }
    return { ...DEFAULT_CONTACT_SETTINGS, ...json.data };
  }

  /**
   * Update contact settings in MongoDB & local persistence (protected).
   */
  async updateSettings(passcode: string | undefined, settings: Partial<ContactSettings>): Promise<ContactSettings> {
    const url = buildApiUrl('/admin/contact-settings');
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(passcode),
      body: JSON.stringify(settings),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to save contact settings.');
    }
    return json.data;
  }
}

export const contactApi = new ContactApiClient();
