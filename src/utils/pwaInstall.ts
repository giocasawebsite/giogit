/**
 * GioCasa PWA Installation Service
 * 
 * Technical Architecture & Privacy Policy:
 * 1. Automatic install banners and mini-infobars are strictly suppressed for public visitors
 *    by intercepting and preventing default on 'beforeinstallprompt'.
 * 2. Only authenticated Admin/Staff members inside AdminPage can trigger the install flow.
 * 3. Browser technical reality:
 *    Native browser user-agent menus (e.g. Chrome's three-dots "Install app", or iOS Safari's
 *    Share > "Add to Home Screen") are controlled entirely by the operating system sandbox
 *    and cannot be suppressed by web code. However, all website-initiated install UI,
 *    custom prompts, and automatic mini-infobars are completely gated and restricted to staff.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn('Error in PWA listener:', err);
    }
  });
}

// Intercept beforeinstallprompt immediately on page load and prevent default public prompt
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Suppress automatic browser mini-infobar for regular visitors
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners();
  });
}

/**
 * Returns true if the app is currently running in standalone PWA window mode
 */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Returns true if deferred prompt is ready or if user is on iOS where manual instructions apply
 */
export function canInstallPwa(): boolean {
  if (isStandaloneApp()) return false;
  return deferredPrompt !== null;
}

/**
 * Trigger the browser install prompt (Staff only)
 */
export async function triggerPwaInstall(): Promise<{ outcome: 'accepted' | 'dismissed' | 'unsupported' }> {
  if (!deferredPrompt) {
    return { outcome: 'unsupported' };
  }

  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      deferredPrompt = null;
    }
    notifyListeners();
    return { outcome: choice.outcome };
  } catch (err) {
    console.error('Failed to trigger PWA install prompt:', err);
    return { outcome: 'unsupported' };
  }
}

/**
 * Subscribe to PWA prompt availability updates
 */
export function subscribeToPwaState(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
