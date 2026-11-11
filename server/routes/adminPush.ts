import { Router, Request, Response } from 'express';
import { dbService } from '../db';
import { pushNotificationService } from '../services/pushNotification';
import { requireAdminAuth } from './admin';

const router = Router();

// GET /api/admin/push/vapid-public-key - Public key needed by admin browser for service worker subscription
router.get('/vapid-public-key', async (req: Request, res: Response) => {
  try {
    const publicKey = await pushNotificationService.getVapidPublicKey();
    if (!publicKey) {
      return res.status(500).json({ success: false, error: 'VAPID public key not configured on server.' });
    }
    return res.json({ success: true, publicKey });
  } catch (err: any) {
    console.error('Error fetching VAPID public key:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve VAPID key.' });
  }
});

// GET /api/admin/push/status - Public push configuration health & diagnostic info
router.get('/status', async (req: Request, res: Response) => {
  try {
    const publicKey = await pushNotificationService.getVapidPublicKey();
    return res.json({
      success: true,
      configured: !!publicKey,
      publicKey,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve push status.' });
  }
});

// All following push subscription endpoints require admin authentication
router.use(requireAdminAuth);

// GET /api/admin/push/subscriptions - List all subscribed admin devices
router.get('/subscriptions', async (req: Request, res: Response) => {
  try {
    const subscriptions = await dbService.getPushSubscriptions();
    // Return sanitized subscription info (hide private auth secrets, show device metadata)
    const sanitized = subscriptions.map((sub) => ({
      id: sub.id,
      endpointSnippet: sub.endpoint.slice(0, 45) + '...',
      endpoint: sub.endpoint,
      deviceName: sub.deviceName || 'Admin Device',
      userAgent: sub.userAgent,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      lastUsedAt: sub.lastUsedAt,
    }));
    return res.json({ success: true, data: sanitized });
  } catch (err: any) {
    console.error('Error listing push subscriptions:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve push subscriptions.' });
  }
});

// POST /api/admin/push/subscribe - Register or update a browser's push subscription
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { subscription, deviceName } = req.body || {};

    if (!subscription || typeof subscription !== 'object') {
      return res.status(400).json({ success: false, error: 'Missing push subscription object.' });
    }

    const { endpoint, keys } = subscription;

    if (!endpoint || typeof endpoint !== 'string' || !endpoint.startsWith('http')) {
      return res.status(400).json({ success: false, error: 'Valid subscription endpoint URL is required.' });
    }

    if (!keys || typeof keys !== 'object' || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ success: false, error: 'Subscription keys (p256dh, auth) are required.' });
    }

    const userAgent = req.headers['user-agent'] || undefined;
    const ipAddress = req.ip || undefined;

    const saved = await dbService.savePushSubscription({
      endpoint,
      keys: {
        p256dh: String(keys.p256dh),
        auth: String(keys.auth),
      },
      deviceName: deviceName ? String(deviceName).trim() : undefined,
      userAgent,
      ipAddress,
    });

    return res.status(201).json({
      success: true,
      message: 'Admin device push notification subscription registered successfully!',
      data: {
        id: saved.id,
        endpoint: saved.endpoint,
        deviceName: saved.deviceName,
        createdAt: saved.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Error saving push subscription:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to register push subscription.' });
  }
});

// POST /api/admin/push/unsubscribe - Unsubscribe a specific browser endpoint
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({ success: false, error: 'Endpoint string is required.' });
    }

    const removed = await dbService.deletePushSubscriptionByEndpoint(endpoint);
    return res.json({
      success: true,
      message: removed ? 'Push subscription unregistered.' : 'Subscription was already removed.',
    });
  } catch (err: any) {
    console.error('Error unsubscribing device:', err);
    return res.status(500).json({ success: false, error: 'Failed to unsubscribe.' });
  }
});

// DELETE /api/admin/push/subscriptions/:id - Remove an admin device by ID
router.delete('/subscriptions/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Subscription ID is required.' });
    }

    const removed = await dbService.deletePushSubscriptionById(id);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'Subscription not found.' });
    }

    return res.json({ success: true, message: 'Admin device removed successfully.' });
  } catch (err: any) {
    console.error('Error deleting push subscription:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete subscription.' });
  }
});

// POST /api/admin/push/test - Dispatch a real-time test notification to all subscribed devices
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { deviceName } = req.body || {};
    const stats = await pushNotificationService.sendTestNotification(deviceName);
    return res.json({
      success: true,
      message: `Test notification dispatched: ${stats.sent} sent, ${stats.failed} failed, ${stats.removed} expired removed.`,
      stats,
    });
  } catch (err: any) {
    console.error('Error sending test push notification:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to dispatch test notification.' });
  }
});

export default router;
