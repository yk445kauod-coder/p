/**
 * Web Push plumbing.
 *
 * Push needs three things the browser will not hand over silently: permission,
 * a registered service worker, and a subscription whose keys we can store for
 * the server. Everything here is web-only and degrades to "unsupported" so the
 * native and unsupported-web builds simply hide the toggle.
 */
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";
import * as db from "../api/db";

const VAPID_PUBLIC = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY as string | undefined;

export type PushStatus =
  | "unsupported"
  | "unconfigured"
  | "default"
  | "granted"
  | "denied"
  | "subscribed";

function isWeb(): boolean {
  return Platform.OS === "web" && typeof window !== "undefined";
}

/** Push is only meaningful on a secure origin with the full API surface. */
export function pushSupported(): boolean {
  return isWeb() && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function pushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC);
}

/** VAPID keys travel as base64url; the browser wants raw bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!isWeb() || !("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  // The build registers sw.js on load; wait briefly in case we beat it.
  return navigator.serviceWorker.ready;
}

export async function currentPushStatus(): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  if (!pushConfigured()) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) return "subscribed";
  return Notification.permission === "granted" ? "granted" : "default";
}

/** The endpoint identifies this device; the server keys off it to avoid dupes. */
export async function subscribeToPush(): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  if (!pushConfigured()) return "unconfigured";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "default";

  const reg = await registration();
  if (!reg) return "unsupported";

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC as string) as BufferSource,
    }));

  if (supabase) {
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (json.endpoint && json.keys?.p256dh && json.keys.auth) {
      await db
        .savePushSubscription({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent,
        })
        .catch(() => undefined);
    }
  }

  return "subscribed";
}

export async function unsubscribeFromPush(): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => undefined);
    if (supabase) await db.deletePushSubscription(endpoint).catch(() => undefined);
  }
  return "granted";
}

/** True when the tab is not visible, i.e. an OS-level notification is useful. */
export function appInBackground(): boolean {
  return isWeb() && typeof document !== "undefined" && document.visibilityState === "hidden";
}

/**
 * Asks the server to deliver a real device notification to this user's
 * subscribed browsers. The private VAPID key never leaves the edge function.
 */
export async function sendDevicePush(payload: {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}): Promise<void> {
  if (!supabase || !isWeb()) return;
  try {
    await supabase.functions.invoke("push", { body: payload });
  } catch {
    /* delivery is best-effort; the in-app feed still has the notification */
  }
}
