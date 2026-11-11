import { getApiBaseUrl } from './apiConfig';
import { AdminPushSubscription } from '../types';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const clean = base64String.trim();
  const padding = '='.repeat((4 - (clean.length % 4)) % 4);
  const base64 = (clean + padding).replace(/-/g, '+').replace(/_/g, '/');
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

  private formatPushSubscriptionError(err: any): Error {
    const msg = err?.message || String(err);

    // Check for Brave browser
    const isBrave =
      (typeof navigator !== 'undefined' &&
        (((navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function') ||
          navigator.userAgent.includes('Brave'))) ||
      false;

    if (msg.includes('push service error') || err?.name === 'AbortError') {
      if (isBrave) {
        return new Error(
          'Push registration failed (push service error): Brave Browser blocks Google Push Services by default. ' +
          'To fix this: Open brave://settings/privacy, toggle ON "Use Google services for push messaging", restart Brave, and click Enable Notifications again.'
        );
      }
      return new Error(
        'Registration failed - push service error: Your browser could not connect to Google Push Service (FCM). ' +
        'Common fixes:\n' +
        '1. If using Brave Browser, enable "Use Google services for push messaging" in brave://settings/privacy.\n' +
        '2. If connected to a VPN, proxy, or corporate Wi-Fi with firewall restrictions, temporarily disconnect or whitelist fcm.googleapis.com.\n' +
        '3. If in Incognito / Private mode, open GioCasa Admin in a standard browser window.\n' +
        '4. Click "Reset Worker & Retry" below to clear any stale browser service worker state.'
      );
    }

    if (err?.name === 'NotAllowedError' || msg.includes('permission denied')) {
      return new Error(
        'Notification permission denied. Please click the lock or settings icon in your browser URL bar and change Notifications to "Allow".'
      );
    }

    return new Error(`Registration failed: ${msg}`);
  }

  public async resetAndUnregisterAll(passcode?: string): Promise<void> {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          try {
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
              const endpoint = sub.endpoint;
              await sub.unsubscribe().catch(() => {});
              await fetch(`${this.baseUrl}/admin/push/unsubscribe`, {
                method: 'POST',
                headers: this.getAuthHeaders(passcode),
                body: JSON.stringify({ endpoint }),
              }).catch(() => {});
            }
            await reg.unregister().catch(() => {});
          } catch {}
        }
      } catch (err) {
        console.warn('[Push API] Error resetting service workers:', err);
      }
    }
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

    // 2. Register service worker and await active ready state
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const readyReg = await navigator.serviceWorker.ready;

    // 3. Fetch VAPID public key
    const publicKey = await this.getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // 4. Subscribe with PushManager
    // Check if an existing subscription is already present
    let subscription: PushSubscription | null = null;
    try {
      const existingSub = await readyReg.pushManager.getSubscription();
      if (existingSub) {
        // Compare existing key with server key
        const existingKey = existingSub.options?.applicationServerKey;
        let isMatchingKey = false;
        if (existingKey) {
          const existingBytes = new Uint8Array(existingKey);
          if (existingBytes.length === applicationServerKey.length) {
            isMatchingKey = existingBytes.every((b, i) => b === applicationServerKey[i]);
          }
        }

        if (isMatchingKey) {
          subscription = existingSub;
        } else {
          // Unsubscribe stale/mismatched subscription to avoid "push service error"
          console.warn('[Push API] Stale subscription detected with a different VAPID key. Unsubscribing...');
          await existingSub.unsubscribe().catch(() => {});
        }
      }
    } catch (inspectErr) {
      console.warn('[Push API] Could not inspect existing subscription:', inspectErr);
    }

    if (!subscription) {
      try {
        subscription = await readyReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any,
        });
      } catch (subErr: any) {
        console.warn('[Push API] PushManager.subscribe initial attempt failed:', subErr);

        // Auto-recovery: If it's a push service error or stale registration conflict, unregister and re-register once
        if (subErr?.message?.includes('push service error') || subErr?.name === 'AbortError') {
          console.log('[Push API] Attempting service worker reset & retry...');
          try {
            await readyReg.unregister().catch(() => {});
            await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            const freshReady = await navigator.serviceWorker.ready;
            subscription = await freshReady.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: applicationServerKey as any,
            });
          } catch (retryErr: any) {
            throw this.formatPushSubscriptionError(retryErr);
          }
        } else {
          throw this.formatPushSubscriptionError(subErr);
        }
      }
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
