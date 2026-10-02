"use client";

import { useEffect } from "react";

/**
 * Registers the generated service worker.
 *
 * `next-pwa` writes `sw.js` but does not inject the registration snippet when
 * the app is exported statically, so it is registered here instead. Registration
 * is skipped in development and on insecure origins, where the browser refuses
 * it anyway.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };

    // Register after load so it never competes with the first paint.
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
