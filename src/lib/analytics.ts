import { firebaseMeasurementId, getFirebase, isFirebaseConfigured, useEmulators } from './firebase';

/**
 * Firebase Analytics (GA4) is optional and must never break the app:
 * - skipped entirely when the measurement id is missing or emulators are used;
 * - guarded by `isSupported()`, which returns false on browsers without
 *   cookies/IndexedDB (private mode, in-app webviews, old browsers);
 * - loaded lazily so the main bundle does not pay for it.
 */
type AnalyticsModule = typeof import('firebase/analytics');

let started = false;
let module: AnalyticsModule | null = null;
let queuedPath: string | null = null;
let queuedLocation: string | null = null;

function sendPageView(mod: AnalyticsModule): void {
  if (queuedPath === null) return;
  try {
    const { app } = getFirebase();
    mod.logEvent(mod.getAnalytics(app), 'page_view', {
      page_path: queuedPath,
      page_location: queuedLocation ?? window.location.href,
      page_title: document.title,
    });
  } catch (error) {
    console.warn('[qr-studio] page_view Analytics ignoré', error);
  }
}

export function startAnalytics(): void {
  if (started) return;
  started = true;
  // Development page views must not pollute the production GA property.
  if (!import.meta.env.PROD) return;
  if (!isFirebaseConfigured || useEmulators || !firebaseMeasurementId) return;

  void (async () => {
    try {
      const mod = await import('firebase/analytics');
      if (!(await mod.isSupported())) return;
      const { app } = getFirebase();
      // Page views are sent explicitly below so React Router navigations count.
      mod.initializeAnalytics(app, { config: { send_page_view: false } });
      module = mod;
      sendPageView(mod);
    } catch (error) {
      console.warn('[qr-studio] Firebase Analytics indisponible', error);
    }
  })();
}

/** Records a client-side route change (no-op until Analytics is ready). */
export function trackPageView(path: string): void {
  queuedPath = path;
  queuedLocation = typeof window === 'undefined' ? null : window.location.href;
  if (module) sendPageView(module);
}
