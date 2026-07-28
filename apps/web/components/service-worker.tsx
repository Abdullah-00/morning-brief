'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker that makes the brief readable offline.
 *
 * Hand-rolled rather than pulled from a plugin: the caching rules are four lines
 * and a build-time PWA plugin would fight the OpenNext adapter.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failures are not worth surfacing: the page works without it.
      });
    };

    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
    return undefined;
  }, []);

  return null;
}
