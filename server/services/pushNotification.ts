import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config';
import { dbService } from '../db';
import { Booking, DiningReservation, EventReservation, PushNotificationPayload } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const VAPID_FILE = path.join(DATA_DIR, 'vapid_keys.json');

class PushNotificationService {
  private publicKey: string = '';
  private privateKey: string = '';
  private subject: string = '';
  private isConfigured: boolean = false;

  constructor() {
    this.initVapid();
  }

  private initVapid() {
    try {
      this.subject = config.vapidSubject || 'mailto:admin@giocasa.com';

      // 1. Check if configured in environment variables (Render / production)
      if (config.vapidPublicKey && config.vapidPrivateKey) {
        this.publicKey = config.vapidPublicKey.trim();
        this.privateKey = config.vapidPrivateKey.trim();
        this.isConfigured = true;
      } else {
        // 2. Fall back to local persistent file or generate stable keys
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        if (fs.existsSync(VAPID_FILE)) {
          try {
            const raw = fs.readFileSync(VAPID_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed.publicKey && parsed.privateKey) {
              this.publicKey = parsed.publicKey;
              this.privateKey = parsed.privateKey;
              this.isConfigured = true;
            }
          } catch (readErr) {
            console.warn('[Push Service] Could not parse existing vapid_keys.json, generating new keys.');
          }
        }

        if (!this.isConfigured) {
          const keys = webpush.generateVAPIDKeys();
          this.publicKey = keys.publicKey;
          this.privateKey = keys.privateKey;
          fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2), 'utf-8');
          this.isConfigured = true;
          console.log('\n======================================================');
          console.log('🔑 [Push Service] Generated persistent VAPID keys:');
          console.log(`VAPID_PUBLIC_KEY:  ${this.publicKey}`);
          console.log(`VAPID_PRIVATE_KEY: ${this.privateKey}`);
          console.log(`VAPID_SUBJECT:     ${this.subject}`);
          console.log('======================================================\n');
        }
      }

      webpush.setVapidDetails(this.subject, this.publicKey, this.privateKey);
      console.log(`📡 [Push Service] Web Push initialized with VAPID subject: ${this.subject}`);
    } catch (err: any) {
      console.error('[Push Service] Failed to initialize Web Push VAPID keys:', err?.message || err);
    }
  }

  public getVapidPublicKey(): string {
    return this.publicKey;
  }

  public async sendPushNotificationToAll(payload: PushNotificationPayload): Promise<{
    sent: number;
    failed: number;
    removed: number;
  }> {
    if (!this.isConfigured || !this.publicKey || !this.privateKey) {
      console.warn('[Push Service] Cannot send notification: VAPID keys not configured.');
      return { sent: 0, failed: 0, removed: 0 };
    }

    const subscriptions = await dbService.getPushSubscriptions();
    if (subscriptions.length === 0) {
      console.log('[Push Service] No registered admin push devices to notify.');
      return { sent: 0, failed: 0, removed: 0 };
    }

    let sent = 0;
    let failed = 0;
    let removed = 0;

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/assets/giocasa_logo_circle.png',
      badge: payload.badge || '/assets/giocasa_logo_circle.png',
      tag: payload.tag || `giocasa-${Date.now()}`,
      data: payload.data || {},
    });

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payloadString,
            {
              TTL: 60 * 60 * 24, // 24 hours TTL
              urgency: 'high',
            }
          );
          sent++;
          await dbService.touchPushSubscription(sub.endpoint);
        } catch (err: any) {
          failed++;
          const statusCode = err?.statusCode;
          // HTTP 404 Not Found or HTTP 410 Gone indicates expired / revoked push subscription
          if (statusCode === 404 || statusCode === 410) {
            console.log(`[Push Service] Removing expired subscription (${statusCode}): ${sub.endpoint.slice(0, 45)}...`);
            await dbService.deletePushSubscriptionByEndpoint(sub.endpoint);
            removed++;
          } else {
            console.warn(`[Push Service] Delivery failed to ${sub.deviceName || 'device'}:`, err?.message || err);
          }
        }
      })
    );

    console.log(`🔔 [Push Service] Broadcast complete: ${sent} sent, ${failed} failed, ${removed} removed.`);
    return { sent, failed, removed };
  }

  // EVENT DISPATCHERS

  public async notifyNewBooking(booking: Booking): Promise<void> {
    const timeFormatted = booking.startTime || 'Time Scheduled';
    const resourceName = booking.resourceName || 'Gaming Station';
    await this.sendPushNotificationToAll({
      title: '🎮 New Gaming Booking',
      body: `Booking #${booking.id} by ${booking.customerName} for ${resourceName} (${booking.date} at ${timeFormatted})`,
      tag: `booking-${booking.id}`,
      data: {
        url: '/#/admin',
        type: 'booking',
        reference: booking.id,
        timestamp: Date.now(),
      },
    });
  }

  public async notifyNewDiningReservation(reservation: DiningReservation): Promise<void> {
    const ref = reservation.reference || (reservation as any).referenceCode || reservation.id;
    await this.sendPushNotificationToAll({
      title: '🍽️ New Dining Table Reservation',
      body: `Reservation #${ref} by ${reservation.customerName} for ${reservation.guests} guests (${reservation.date} at ${reservation.time})`,
      tag: `dining-${ref}`,
      data: {
        url: '/#/admin/reservations',
        type: 'dining',
        reference: ref,
        timestamp: Date.now(),
      },
    });
  }

  public async notifyNewEventReservation(reservation: EventReservation): Promise<void> {
    const ref = reservation.reference || (reservation as any).referenceCode || reservation.id;
    const eventType = reservation.eventType ? reservation.eventType.charAt(0).toUpperCase() + reservation.eventType.slice(1) : 'Party';
    await this.sendPushNotificationToAll({
      title: '🎉 New Event Reservation Enquiry',
      body: `Enquiry #${ref} by ${reservation.customerName} (${eventType} on ${reservation.date})`,
      tag: `event-${ref}`,
      data: {
        url: '/#/admin/reservations',
        type: 'event',
        reference: ref,
        timestamp: Date.now(),
      },
    });
  }

  public async notifyNewTournamentRegistration(registration: any, tournament: any): Promise<void> {
    const ref = registration.registrationReference || registration.id;
    const title = tournament?.title || 'Tournament';
    await this.sendPushNotificationToAll({
      title: '🏆 New Tournament Registration',
      body: `Registration #${ref} by ${registration.participantName} for ${title}`,
      tag: `tournament-${registration.id}`,
      data: {
        url: '/#/admin/tournaments',
        type: 'tournament',
        reference: ref,
        timestamp: Date.now(),
      },
    });
  }

  public async sendTestNotification(deviceName?: string): Promise<{ sent: number; failed: number; removed: number }> {
    return await this.sendPushNotificationToAll({
      title: '🔔 GioCasa Web Push Active!',
      body: `Real-time alerts connected for ${deviceName || 'your admin device'}. You will receive instant notifications for new bookings, dining, events & tournaments.`,
      tag: `test-alert-${Date.now()}`,
      data: {
        url: '/#/admin/contact',
        type: 'test',
        timestamp: Date.now(),
      },
    });
  }
}

export const pushNotificationService = new PushNotificationService();
