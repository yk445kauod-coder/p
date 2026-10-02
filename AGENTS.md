# TraceBook

A reading-habit tracker: log sessions, watch a streak grow, save the lines that
matter, and get a personal AI reading coach. Ships as an installable,
offline-first web app (PWA).

## Layout

```
web/       Next.js 14 app ŌĆö landing at /, the reader at /app/, admin at /admin
supabase/  Edge functions: agent/ (AI coach), push/ (Web Push delivery)
```

`web/` is a static export (`output: "export"`), so the whole app is prerendered
files deployed to Cloudflare Pages. Anything that needs a secret lives in a
Supabase edge function rather than a Next API route ŌĆö do not add `web/src/app/api/*`.

## Commands

```bash
cd web
npx next dev            # local dev server
npx next build          # typecheck + static export into web/out
npx vitest run          # unit tests
npx next lint           # lint
```

`web/.env.local` holds only publishable values (`NEXT_PUBLIC_*`): the Supabase
URL and anon key. With neither set the app still runs ŌĆö it is local-first and
only needs Supabase for cross-device sync.

## How it is put together

- **Local-first.** Every read and write goes through Dexie (`web/src/db.ts`), so
  the UI is instant and works offline. `useData()` in `web/src/store/data.ts`
  wraps Dexie in `useLiveQuery`, so any screen re-renders the moment a row changes.
- **Sync is a mirror, not the source of truth.** `web/src/lib/sync.ts` pushes
  local rows to Supabase and pulls the server copy back, for signed-in readers
  only. It maps the app's camelCase model onto the Postgres schema ŌĆö note
  `reading_sessions.started_at` Ōåö `day`, and `daily_entries.entry_date` Ōåö `day`.
- **The domain is pure.** `web/src/lib/reading.ts` holds the streak maths, the
  plan projection, the badge table and the category list. Nothing there touches
  React or storage, which is what makes it cheap to test.
- **Supabase is the only backend.** Postgres + auth + edge functions, project ref
  `rxjwygaemyxxcegiiuev`. Every table is owned by `auth.uid()` and guarded by
  row-level security; the anon key is public, so RLS is the real protection.

## Data & auth

Signing in is **optional**. The app is fully usable as a guest; an account only
exists to mirror the local store across devices. `web/src/store/auth.tsx` owns
the session, `web/src/lib/supabase.ts` the client, and `web/src/lib/sync.ts` the
push/pull. There is no server-side session ŌĆö a static build cannot hold one.

## Edge functions

`supabase/functions/agent/index.ts` is the AI reading coach ("Fahm"). It holds
the model provider key, talks to Postgres as the signed-in user (so RLS still
applies), and can call tools that read or write that reader's own data. Nothing
secret ever reaches the browser bundle.

Provider config is resolved **per request** by `resolveConfig()`: it reads
`OPENROUTER_API_KEY` / `AI_MODEL` / `AI_BASE_URL` from the admin vault first and
falls back to environment variables. That is deliberate ŌĆö a key rotated in the
admin console takes effect immediately, with no redeploy.

`supabase/functions/push/index.ts` delivers Web Push notifications.

## Admin console

`/admin` is a server-authorised console for managing readers and storing API
keys. It is a normal static route, so the gate is entirely in the database.

**One authorisation primitive.** `public.is_admin(uid)` checks membership of
`public.admins`. Every privileged function is `SECURITY DEFINER`, re-checks it,
and raises `42501` otherwise. The browser never decides who is an admin, so
reaching `/admin` without the role renders a warning and nothing else.

**Bootstrap.** `admin_claim()` makes the first authenticated caller the admin and
then returns `false forever` ŌĆö a stranger can never self-promote on a live
project. Call it once from `/admin` after signing in.

**Keys live in Supabase Vault.** `admin_set_secret()` writes the value into
`vault.secrets` (encrypted at rest) and stores only a registry row in
`public.app_secrets` mapping name ŌåÆ vault id. `admin_list_secrets()` therefore
never returns a value; reading one requires the separate, audited
`admin_reveal_secret()`. `get_app_secret()` is the server-side path and is
granted to `service_role` only.

**Everything privileged is audited.** `public.admin_audit` records claim,
set_plan, delete_user, set_secret, reveal_secret and delete_secret.

**Anonymous callers are revoked outright.** The admin RPCs are granted to
`authenticated` only, so an anon key gets a 401 from PostgREST rather than
relying on the in-function check alone.

To add a new admin action: write a `SECURITY DEFINER` function that starts with
the `is_admin()` guard, `revoke all ... from public, anon`, `grant execute ... to
authenticated`, and append to `admin_audit`. Add a typed wrapper in
`web/src/lib/admin.ts`.

The route is `noindex` and disallowed in `robots.txt`.

## i18n

Two locales ship: `en` and Egyptian-dialect `ar` (┘ģžĄž▒┘Ŗ), in
`web/src/i18n/{en,ar}.ts`. Keys are flat (`home.greetingMorning`) and
placeholders are `{name}`.

- `TranslationKey` is derived from `en`, so a key missing from `ar` is a **type
  error** and fails the build. Add every new key to both.
- `provider.tsx` syncs `<html lang>` and `<html dir>`, which is what makes RTL
  work. The choice persists in the local preferences row.
- Write the Arabic in Egyptian colloquial (ž©ž¬┘éž▒žŻ / ž«┘ä┘æ┘Ŗ / ž╣┘ä┘ē žĘ┘ł┘ä), not MSA.

## Mobile first

Mobile is the primary target; desktop is the adaptation.

- `web/src/components/bottom-nav.tsx` renders a fixed bottom tab bar on phones and
  the same links as a left rail from `md` up.
- Safe areas come from `env(safe-area-inset-*)` via the `pt-safe` / `pb-safe` /
  `pb-nav` utilities in `globals.css`. `viewportFit: "cover"` is set in the root
  layout ŌĆö without it those insets do nothing on iOS.
- Inputs are forced to 16px so iOS never zooms on focus.
- Tap targets are at least `min-h-9` (36px), usually 44px+.
- Filter strips scroll horizontally rather than wrapping, so options stay
  thumb-reachable.
- No screen may need a horizontal scroll at a 360px viewport.

## Distribution

Live at:

- Landing page: https://tracebook.pages.dev/
- Reader / PWA: https://tracebook.pages.dev/app/

```bash
cd web && npx next build          # -> web/out
npx wrangler pages deploy out --project-name=tracebook --branch=main
```

Preview locally with `python3 -m http.server -d web/out` ŌĆö the app must be served
over HTTP, not opened as a `file://` path, or the service worker will not register.

`web/src/components/service-worker-registrar.tsx` registers the generated
`sw.js`; `next-pwa` writes the worker but does not inject the registration
snippet on a static export.

## Conventions

- Colours come from the CSS variables in `globals.css` (`bg-background`,
  `text-muted-foreground`, `border-border`, `text-primary`ŌĆ”). Never hardcode a
  hue; both themes are defined by swapping those variables.
- Build UI from the shadcn primitives in `web/src/components/ui/`, and the shared
  layout blocks in `web/src/components/page.tsx` (`PageHeader`, `Section`, `Stat`,
  `EmptyState`) rather than repeating Tailwind chains.
- All copy goes through `useI18n().t(...)`.
- Writes go through `useData()`; never touch Dexie from a component.
- Charts and progress are plain CSS/SVG ŌĆö do not add a charting dependency for a
  bar row or a heatmap.

## Brand assets

```bash
cd web && python3 scripts/make_icons.py   # needs cairosvg + pillow
```

Everything derives from **one vector**, `web/public/brand/book-mark.svg` — an
open book on a dark plate with a bookmark ribbon, drawn on a 64 grid from four
shapes so it still reads as a book at 16px. The script rasterises:

`favicon-16/32/64.png`, `icon-192.png`, `icon-512.png`, `icon512_maskable.png`,
`apple-touch-icon.png` and a multi-resolution `favicon.ico`.

The `.ico` and the PNGs live in `public/`, not `src/app/`. Next's file
convention for `app/favicon.ico` takes over the icon metadata and suppresses
`metadata.icons` in `layout.tsx`; keeping it in `public/` is what lets all six
per-size `<link rel="icon">` tags emit.

In-app, render the mark with `<BookMark>` / `<Wordmark>` from
`components/book-mark.tsx` rather than an icon font, so the tab icon and the
logo inside the app can never drift apart.
