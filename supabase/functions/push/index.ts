// TraceBook push — Supabase Edge Function.
//
// Two jobs:
//   1. Send a notification to the caller's own registered devices.
//   2. (Cron) Walk profiles whose daily reminder is due and push to each device.
//
// Web Push requires RFC 8291 payload encryption plus a VAPID JWT, neither of
// which the runtime provides, so both are implemented here with WebCrypto.
// Secrets live in the function environment: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT and CRON_SECRET.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@tracebook.app";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Sub {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/* ── base64url helpers ─────────────────────────────────────────────────────── */

function b64uToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64u(b: Uint8Array): string {
  let bin = "";
  for (const byte of b) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/* ── HKDF (RFC 5869) over WebCrypto HMAC ───────────────────────────────────── */

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

/** Single-block HKDF-Expand is all Web Push needs (outputs ≤ 32 bytes). */
async function hkdf(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const block = await hmac(prk, concat(info, new Uint8Array([1])));
  return block.slice(0, length);
}

/* ── VAPID ─────────────────────────────────────────────────────────────────── */

async function vapidHeader(endpoint: string): Promise<string> {
  const pub = b64uToBytes(VAPID_PUBLIC);
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: bytesToB64u(pub.slice(1, 33)),
    y: bytesToB64u(pub.slice(33, 65)),
    d: VAPID_PRIVATE,
    ext: true,
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = bytesToB64u(utf8(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = bytesToB64u(
    utf8(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: VAPID_SUBJECT,
      }),
    ),
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, utf8(`${header}.${claims}`)),
  );
  const jwt = `${header}.${claims}.${bytesToB64u(signature)}`;
  return `vapid t=${jwt}, k=${VAPID_PUBLIC}`;
}

/* ── aes128gcm payload encryption (RFC 8188 + 8291) ────────────────────────── */

async function encryptPayload(sub: Sub, payload: string): Promise<Uint8Array> {
  const uaPublic = b64uToBytes(sub.p256dh);
  const authSecret = b64uToBytes(sub.auth);

  const asKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", asKeys.publicKey));

  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asKeys.privateKey, 256),
  );

  const prk = await hmac(authSecret, ecdhSecret);
  const keyInfo = concat(utf8("WebPush: info"), new Uint8Array([0]), uaPublic, asPublic);
  const ikm = await hkdf(prk, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk2 = await hmac(salt, ikm);
  const cek = await hkdf(prk2, concat(utf8("Content-Encoding: aes128gcm"), new Uint8Array([0])), 16);
  const nonce = await hkdf(prk2, concat(utf8("Content-Encoding: nonce"), new Uint8Array([0])), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  // 0x02 marks the final record in an aes128gcm body.
  const record = concat(utf8(payload), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, record),
  );

  // Header: salt(16) || record size(4, big-endian) || key id length(1) || key id.
  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  header.set(asPublic, 21);

  return concat(header, ciphertext);
}

/* ── Send ──────────────────────────────────────────────────────────────────── */

interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

async function sendToSub(sub: Sub, payload: PushPayload): Promise<"ok" | "gone" | "error"> {
  try {
    const body = await encryptPayload(sub, JSON.stringify(payload));
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "2419200",
        Authorization: await vapidHeader(sub.endpoint),
      },
      body,
    });
    // 404/410 mean the subscription is dead and should be pruned.
    if (res.status === 404 || res.status === 410) return "gone";
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

async function sendToSubs(admin: ReturnType<typeof createClient>, subs: Sub[], payload: PushPayload) {
  let sent = 0;
  for (const sub of subs) {
    const result = await sendToSub(sub, payload);
    if (result === "ok") sent++;
    if (result === "gone") await admin.from("push_subscriptions").delete().eq("id", sub.id);
  }
  return sent;
}

/** Current local time as HH:MM for a given IANA zone, falling back to UTC. */
function localTime(zone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false }).format(
      new Date(),
    );
  } catch {
    return new Date().toISOString().slice(11, 16);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return Response.json({ error: "vapid_not_configured" }, { status: 500, headers: CORS });
    }

    const body = await req.json().catch(() => ({}));
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    /* Cron path: no user session, guarded by a shared secret. */
    if (body.mode === "reminders") {
      if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
        return Response.json({ error: "unauthorized" }, { status: 401, headers: CORS });
      }
      const zone = typeof body.zone === "string" ? body.zone : "UTC";
      const now = localTime(zone);

      const { data: profiles } = await admin
        .from("profiles")
        .select("id, notify_reminder_time")
        .eq("notify_enabled", true)
        .eq("notify_reminder", true)
        .eq("notify_reminder_time", now);

      let sent = 0;
      for (const p of profiles ?? []) {
        const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", p.id);
        if (!subs?.length) continue;
        sent += await sendToSubs(admin, subs as Sub[], {
          title: "Time to read",
          body: "A few pages now keeps the streak alive.",
          tag: "tracebook-reminder",
          url: "./?tab=Home",
        });
      }
      return Response.json({ ok: true, now, profiles: profiles?.length ?? 0, sent }, { headers: CORS });
    }

    /* User path: send to the caller's own devices. */
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: auth } = await userClient.auth.getUser();
    if (!auth.user) return Response.json({ error: "unauthorized" }, { status: 401, headers: CORS });

    const { data: subs } = await userClient.from("push_subscriptions").select("*").eq("user_id", auth.user.id);
    if (!subs?.length) return Response.json({ ok: true, sent: 0 }, { headers: CORS });

    const sent = await sendToSubs(admin, subs as Sub[], {
      title: body.title ?? "TraceBook",
      body: body.body ?? "",
      tag: body.tag ?? "tracebook",
      url: body.url ?? "./",
    });
    return Response.json({ ok: true, sent }, { headers: CORS });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: CORS });
  }
});
