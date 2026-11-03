import { getApiBaseUrl } from './apiConfig';
import { AdminPushSubscription } from '../types';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function detectDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Admin Device';
  const ua = navigator.userAgent;
  let browser = 'Browser';
  let os = 'Device';

  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone')) os = 'iPhone';
  else if (ua.includes('iPad')) os = 'iPad';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} on ${os}`;
}

export class PushApiClient {
  private get baseUrl(): string {
    return getApiBaseUrl();
  }

  private getAuthHeaders(passcode?: string): Record<string, string> {
    const token =
      passcode ||
      sessionStorage.getItem('giocasa_admin_token') ||
      sessionStorage.getItem('giocasa_admin_passcode') ||
      localStorage.getItem('giocasa_admin_passcode') ||
      '';
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

  public isPushSupported(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  public getNotificationPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
    return Notification.permission;
  }

  public async getVapidPublicKey(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/admin/push/vapid-public-key`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch VAPID public key from backend.');
    }
    const data = await res.json();
    return data.publicKey;
  }

  public async getSubscriptions(passcode?: string): Promise<AdminPushSubscription[]> {
    const res = await fetch(`${this.baseUrl}/admin/push/subscriptions`, {
      method: 'GET',
      headers: this.getAuthHeaders(passcode),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch push subscriptions.');
    }
    const data = await res.json();
    return data.data || [];
  }

  public async getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!this.isPushSupported()) return null;
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  }

  public async registerAndSubscribe(
    passcode?: string,
    customDeviceName?: string
  ): Promise<{ subscription: PushSubscription; deviceRecord: any }> {
    if (!this.isPushSupported()) {
      throw new Error(
        'Web Push Notifications are not supported by this browser. If on iPhone/iOS, add GioCasa to your Home Screen first.'
      );
    }

    // 1. Request notification permission from browser
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error(
        'Notification permission was not granted. Please allow notifications in your browser or device settings.'
      );
    }

    // 2. Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    // 3. Fetch VAPID public key
    const publicKey = await this.getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // 4. Subscribe with PushManager
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });
    }

    const subJson = subscription.toJSON();
    const deviceName = customDeviceName?.trim() || detectDeviceName();

    // 5. Send subscription to MongoDB backend
    const res = await fetch(`${this.baseUrl}/admin/push/subscribe`, {
      method: 'POST',
      headers: this.getAuthHeaders(passcode),
      body: JSON.stringify({
        subscription: subJson,
        deviceName,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Backend failed to save push subscription.');
    }

    const data = await res.json();
    return { subscription, deviceRecord: data.data };
  }

  public async unsubscribeCurrentDevice(passcode?: string): Promise<boolean> {
    if (!this.isPushSupported()) return false;
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe().catch(() => {});

      // Notify backend to remove from MongoDB
      await fetch(`${this.baseUrl}/admin/push/unsubscribe`, {
        method: 'POST',
        headers: this.getAuthHeaders(passcode),
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
      return true;
    }
    return false;
  }

  public async deleteSubscription(passcode: string, id: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/admin/push/subscriptions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(passcode),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to remove device subscription.');
    }
    return true;
  }

  public async sendTestNotification(passcode?: string, deviceName?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/admin/push/test`, {
      method: 'POST',
      headers: this.getAuthHeaders(passcode),
      body: JSON.stringify({ deviceName: deviceName || detectDeviceName() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send test push notification.');
    }
    return await res.json();
  }
}

export const pushApi = new PushApiClient();
