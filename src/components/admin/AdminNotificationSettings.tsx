import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Laptop,
  Trash2,
  RefreshCw,
  Send,
  HelpCircle,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  Info,
} from 'lucide-react';
import { pushApi, detectDeviceName } from '../../services/pushApi';
import { AdminPushSubscription } from '../../types';

interface AdminNotificationSettingsProps {
  passcode: string;
}

export const AdminNotificationSettings: React.FC<AdminNotificationSettingsProps> = ({ passcode }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [subscriptions, setSubscriptions] = useState<AdminPushSubscription[]>([]);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [isCurrentSubscribed, setIsCurrentSubscribed] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [customDeviceName, setCustomDeviceName] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [vapidPublicKey, setVapidPublicKey] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Initialize and check device status
  const checkStatus = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const supported = pushApi.isPushSupported();
      setIsSupported(supported);

      if (supported) {
        setPermission(pushApi.getNotificationPermission());
        const currentSub = await pushApi.getCurrentSubscription();
        if (currentSub) {
          setCurrentEndpoint(currentSub.endpoint);
          setIsCurrentSubscribed(true);
        } else {
          setCurrentEndpoint(null);
          setIsCurrentSubscribed(false);
        }
      }

      // Fetch active subscriptions from backend
      const subs = await pushApi.getSubscriptions(passcode);
      setSubscriptions(subs);

      // Fetch VAPID public key
      const key = await pushApi.getVapidPublicKey().catch(() => '');
      setVapidPublicKey(key);
    } catch (err: any) {
      console.warn('Error loading push notification settings:', err);
    } finally {
      setLoading(false);
    }
  }, [passcode]);

  useEffect(() => {
    setCustomDeviceName(detectDeviceName());
    checkStatus();
  }, [checkStatus]);

  // Handle Enable Notifications
  const handleEnableNotifications = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const { deviceRecord } = await pushApi.registerAndSubscribe(passcode, customDeviceName);
      setIsCurrentSubscribed(true);
      setPermission('granted');
      setFeedback({
        type: 'success',
        message: `Push notifications enabled for ${deviceRecord?.deviceName || 'this device'}! You will now receive instant alerts.`,
      });
      await checkStatus();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to enable notifications. Please check browser permissions.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Reset Service Worker & Retry Subscription
  const handleResetAndRetry = async () => {
    setActionLoading(true);
    setFeedback({
      type: 'info',
      message: 'Resetting browser service workers and clearing stale push tokens...',
    });
    try {
      await pushApi.resetAndUnregisterAll(passcode);
      await new Promise((r) => setTimeout(r, 600));
      const { deviceRecord } = await pushApi.registerAndSubscribe(passcode, customDeviceName);
      setIsCurrentSubscribed(true);
      setPermission('granted');
      setFeedback({
        type: 'success',
        message: `Worker reset successful! Push notifications enabled for ${deviceRecord?.deviceName || 'this device'}.`,
      });
      await checkStatus();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Reset failed. Please check browser permissions and network settings.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Disable Notifications on this device
  const handleDisableCurrentDevice = async () => {
    if (!window.confirm('Disable notifications on this browser? You will stop receiving real-time alerts on this device.')) {
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      await pushApi.unsubscribeCurrentDevice(passcode);
      setIsCurrentSubscribed(false);
      setFeedback({
        type: 'info',
        message: 'Notifications disabled on this device.',
      });
      await checkStatus();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to unsubscribe current device.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Remove Specific Device
  const handleRemoveDevice = async (sub: AdminPushSubscription) => {
    const isThisDevice = sub.endpoint === currentEndpoint;
    const confirmMsg = isThisDevice
      ? 'Remove this device from admin push notifications?'
      : `Remove "${sub.deviceName || 'Admin Device'}" from notifications?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    setFeedback(null);
    try {
      if (isThisDevice) {
        await pushApi.unsubscribeCurrentDevice(passcode);
      } else {
        await pushApi.deleteSubscription(passcode, sub.id);
      }
      setFeedback({
        type: 'success',
        message: 'Device subscription removed successfully.',
      });
      await checkStatus();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to delete device subscription.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Send Test Notification
  const handleSendTestNotification = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await pushApi.sendTestNotification(passcode, customDeviceName);
      setFeedback({
        type: 'success',
        message: `Test alert dispatched! Sent to ${res.stats?.sent ?? 0} active device(s). Check your notification tray.`,
      });
      await checkStatus();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to dispatch test notification.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Copy VAPID Key helper
  const handleCopyVapidKey = () => {
    if (!vapidPublicKey) return;
    navigator.clipboard.writeText(vapidPublicKey).then(() => {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    });
  };

  return (
    <div className="space-y-8">
      {/* 1. Header Banner & Current Device Status */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-brand-border/60">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-surfaceElevated border border-brand-gold/40 text-[10px] font-mono text-brand-gold uppercase tracking-wider font-bold">
              <span className={`w-2 h-2 rounded-full ${isCurrentSubscribed ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isCurrentSubscribed ? 'ALERTS ACTIVE ON THIS DEVICE' : 'ALERTS INACTIVE'}</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-cream">
              Real-Time Web Push Notifications
            </h2>
            <p className="text-xs text-brand-subtle max-w-2xl leading-relaxed">
              Receive immediate push notifications on your phone, tablet, and computer whenever a new <strong className="text-brand-cream">Gaming Booking</strong>, <strong className="text-brand-cream">Dining Table Reservation</strong>, <strong className="text-brand-cream">Event Reservation</strong>, or <strong className="text-brand-cream">Tournament Registration</strong> is submitted.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => checkStatus()}
              disabled={loading || actionLoading}
              className="p-2.5 rounded-xl bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-brand-cream text-xs font-mono transition-colors"
              title="Refresh Devices"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {isCurrentSubscribed && (
              <button
                onClick={handleSendTestNotification}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-brand-surfaceElevated border border-brand-gold/40 hover:border-brand-gold text-brand-gold hover:text-amber-300 text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Test Alert</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback message banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs font-mono flex flex-col sm:flex-row sm:items-start gap-3 transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            ) : feedback.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 shrink-0 text-blue-400 mt-0.5" />
            )}
            <div className="flex-1 space-y-2">
              <p className="whitespace-pre-line leading-relaxed">{feedback.message}</p>
              {feedback.type === 'error' && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={handleResetAndRetry}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                    <span>Reset Worker & Retry</span>
                  </button>
                  <button
                    onClick={() => setFeedback(null)}
                    className="text-[11px] text-brand-subtle hover:text-brand-cream underline ml-2"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
            {feedback.type !== 'error' && (
              <button
                onClick={() => setFeedback(null)}
                className="text-xs text-brand-subtle hover:text-brand-cream underline ml-2 self-start"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* Primary Action Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-brand-subtle uppercase tracking-wider block">
                This Device Name / Description
              </label>
              <input
                type="text"
                value={customDeviceName}
                onChange={(e) => setCustomDeviceName(e.target.value)}
                placeholder="e.g. Owner Samsung S24, Front Desk Laptop"
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-4 py-2.5 text-xs font-mono text-brand-cream focus:outline-none focus:border-brand-gold transition-colors"
              />
              <span className="text-[11px] text-brand-subtle/80 block">
                Helps identify this device in the subscribed devices list below.
              </span>
            </div>

            {/* Permission warning if blocked */}
            {permission === 'denied' && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <div>
                  <strong className="block font-semibold">Notification Permission Blocked in Browser</strong>
                  <span>Notifications are blocked for this site. Click the lock/settings icon in your browser URL bar to change permission to &quot;Allow&quot;.</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 justify-center">
            {!isCurrentSubscribed ? (
              <button
                onClick={handleEnableNotifications}
                disabled={actionLoading || !isSupported}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-500/20"
              >
                <BellRing className="w-4 h-4 animate-bounce" />
                <span>{actionLoading ? 'Connecting Device...' : 'Enable Notifications'}</span>
              </button>
            ) : (
              <button
                onClick={handleDisableCurrentDevice}
                disabled={actionLoading}
                className="w-full py-3.5 px-6 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <BellOff className="w-4 h-4 text-red-400" />
                <span>Disable on This Device</span>
              </button>
            )}

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-center text-[11px] font-mono text-brand-subtle hover:text-brand-cream underline py-1"
            >
              {showGuide ? 'Hide Setup & Compatibility Guide' : 'View Setup & Device Requirements (iPhone/Android)'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Device Compatibility & iPhone Setup Guide (Expandable) */}
      {showGuide && (
        <div className="bg-brand-surface/70 border border-brand-border rounded-3xl p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-brand-cream font-bold text-sm uppercase tracking-wider font-mono">
            <Smartphone className="w-4 h-4 text-brand-gold" />
            <span>Device Support & Mobile Background Restrictions</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-brand-subtle leading-relaxed">
            {/* Desktop */}
            <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-2">
              <div className="flex items-center gap-2 text-brand-cream font-semibold">
                <Laptop className="w-4 h-4 text-blue-400" />
                <span>Desktop Browsers</span>
              </div>
              <p>
                Supported on <strong className="text-white">Chrome, Edge, Firefox, Brave, and Opera</strong> on Windows, macOS, and Linux. Notifications appear in the Windows Action Center or macOS Notification Center even when the browser tab is minimized.
              </p>
            </div>

            {/* Android */}
            <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-2">
              <div className="flex items-center gap-2 text-brand-cream font-semibold">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Android Phones & Tablets</span>
              </div>
              <p>
                Supported on <strong className="text-white">Chrome, Samsung Internet, Brave, and Firefox</strong>. Delivers sound and vibrations on the lock screen.
              </p>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 space-y-1">
                <strong>Battery Optimization Note:</strong>
                <p>Some Android skins (Xiaomi MIUI, Samsung OneUI) aggressively kill background processes. Ensure battery optimization is set to &quot;Unrestricted&quot; for your browser to avoid delays.</p>
              </div>
            </div>

            {/* iPhone / iOS */}
            <div className="p-4 rounded-2xl bg-brand-surfaceElevated border border-brand-border space-y-2">
              <div className="flex items-center gap-2 text-brand-cream font-semibold">
                <ExternalLink className="w-4 h-4 text-[#ED249B]" />
                <span>iPhone & iPad (iOS 16.4+)</span>
              </div>
              <p className="text-amber-200/90 font-medium">
                Apple restricts Web Push inside regular Safari browser tabs. To enable on iPhone:
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-brand-cream">
                <li>Open this Admin Panel in Safari.</li>
                <li>Tap Safari&apos;s Share button (<span className="font-mono">⎋</span> with arrow up).</li>
                <li>Tap <strong>&quot;Add to Home Screen&quot;</strong>.</li>
                <li>Launch the <strong>GioCasa Admin</strong> icon from your Home Screen.</li>
                <li>Log in and tap <strong>&quot;Enable Notifications&quot;</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* 3. Subscribed Admin Devices Table */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border/60">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-brand-cream">
              Active Subscribed Admin Devices ({subscriptions.length})
            </h3>
            <p className="text-xs text-brand-subtle mt-0.5">
              These devices will receive real-time push alerts whenever a new customer reservation or booking is recorded.
            </p>
          </div>

          <div className="text-xs font-mono text-brand-subtle">
            Stored permanently in MongoDB
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-brand-surfaceElevated border border-brand-border flex items-center justify-center mx-auto text-brand-subtle">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-xs font-mono text-brand-subtle">
              No devices are currently subscribed to admin push notifications.
            </p>
            <p className="text-[11px] text-brand-subtle/70 max-w-sm mx-auto">
              Click &quot;Enable Notifications&quot; above on your phone or computer to receive real-time alerts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-brand-border/60 text-brand-subtle uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Device / Browser</th>
                  <th className="py-3 px-3">Subscribed Date (IST)</th>
                  <th className="py-3 px-3">Last Alert Received</th>
                  <th className="py-3 px-3">Endpoint Snippet</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {subscriptions.map((sub) => {
                  const isThisDevice = sub.endpoint === currentEndpoint;
                  const isMobile = sub.deviceName?.toLowerCase().includes('phone') || sub.userAgent?.toLowerCase().includes('mobile');

                  return (
                    <tr key={sub.id} className={`hover:bg-brand-surfaceElevated/50 transition-colors ${isThisDevice ? 'bg-brand-surfaceElevated/30' : ''}`}>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                            isThisDevice
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-brand-surface border-brand-border text-brand-subtle'
                          }`}>
                            {isMobile ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-brand-cream text-xs">
                                {sub.deviceName || 'Admin Device'}
                              </span>
                              {isThisDevice && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] uppercase font-bold tracking-wider">
                                  This Browser
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-brand-subtle line-clamp-1 max-w-xs">
                              {sub.userAgent || 'Standard Web Push Client'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-brand-subtle whitespace-nowrap">
                        {new Date(sub.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })} • {new Date(sub.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-3 text-brand-subtle whitespace-nowrap">
                        {sub.lastUsedAt ? (
                          <span className="text-emerald-400">
                            {new Date(sub.lastUsedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })} {new Date(sub.lastUsedAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-brand-subtle/70">Ready for alerts</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-brand-subtle/80 font-mono text-[11px] whitespace-nowrap">
                        <span className="px-2 py-1 rounded bg-brand-surfaceElevated border border-brand-border/60">
                          {sub.endpoint.slice(0, 35)}...
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => handleRemoveDevice(sub)}
                          disabled={actionLoading}
                          className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 transition-colors inline-flex items-center gap-1.5"
                          title="Remove this device from notifications"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Remove</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Render Production Environment Variables Card */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-brand-cream font-bold text-sm uppercase tracking-wider font-mono">
          <ShieldCheck className="w-4 h-4 text-brand-gold" />
          <span>Render Environment Variables Setup</span>
        </div>

        <p className="text-xs text-brand-subtle leading-relaxed">
          The server automatically generates and persists VAPID cryptographic keys in <code className="bg-brand-surfaceElevated px-1.5 py-0.5 rounded text-brand-gold font-mono">server/data/vapid_keys.json</code>. For high-availability multi-instance Render deployments, copy these variables into your Render Service Environment:
        </p>

        {vapidPublicKey ? (
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-brand-subtle">
                <span>VAPID_PUBLIC_KEY (Shareable public key)</span>
                <button
                  onClick={handleCopyVapidKey}
                  className="text-brand-gold hover:text-amber-300 flex items-center gap-1 font-semibold"
                >
                  {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey ? 'Copied to Clipboard!' : 'Copy Key'}</span>
                </button>
              </div>
              <div className="p-3 rounded-xl bg-brand-surfaceElevated border border-brand-border font-mono text-xs text-brand-cream break-all select-all">
                {vapidPublicKey}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-surfaceElevated border border-brand-border/60 text-[11px] font-mono text-brand-subtle space-y-1.5">
              <div className="text-white font-semibold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-brand-gold" />
                <span>Render Dashboard Configuration:</span>
              </div>
              <div>• <strong className="text-brand-cream">VAPID_PUBLIC_KEY</strong>: Set to the public key above.</div>
              <div>• <strong className="text-brand-cream">VAPID_PRIVATE_KEY</strong>: Set to your private key (from server logs / Render secrets).</div>
              <div>• <strong className="text-brand-cream">VAPID_SUBJECT</strong>: e.g. <code className="text-brand-gold">mailto:admin@giocasa.com</code> or <code className="text-brand-gold">https://giogit.onrender.com</code></div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-brand-subtle italic">
            Connecting to server to retrieve VAPID public key...
          </p>
        )}
      </div>
    </div>
  );
};
