# TraceBook

A reading-habit tracker: log sessions, watch a streak grow, save the lines that
matter, and get a personal AI reading coach. Ships as an installable,
offline-first web app (PWA).

## Layout

```
web/       Next.js 14 app — landing page at /, the reader at /app/
supabase/  Edge functions: agent/ (AI coach), push/ (Web Push delivery)
```

`web/` is a static export (`output: "export"`), so the whole app is prerendered
files deployed to Cloudflare Pages. Anything that needs a secret lives in a
Supabase edge function rather than a Next API route — do not add `web/src/app/api/*`.

## Commands

```bash
cd web
npx next dev            # local dev server
npx next build          # typecheck + static export into web/out
npx vitest run          # unit tests
npx next lint           # lint
```

`web/.env.local` holds only publishable values (`NEXT_PUBLIC_*`): the Supabase
URL and anon key. With neither set the app still runs — it is local-first and
only needs Supabase for cross-device sync.

## How it is put together

- **Local-first.** Every read and write goes through Dexie (`web/src/db.ts`), so
  the UI is instant and works offline. `useData()` in `web/src/store/data.ts`
  wraps Dexie in `useLiveQuery`, so any screen re-renders the moment a row changes.
- **Sync is a mirror, not the source of truth.** `web/src/lib/sync.ts` pushes
  local rows to Supabase and pulls the server copy back, for signed-in readers
  only. It maps the app's camelCase model onto the Postgres schema — note
  `reading_sessions.started_at` ↔ `day`, and `daily_entries.entry_date` ↔ `day`.
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
push/pull. There is no server-side session — a static build cannot hold one.

## Edge functions

`supabase/functions/agent/index.ts` is the AI reading coach ("Fahm"). It holds
the model provider key, talks to Postgres as the signed-in user (so RLS still
applies), and can call tools that read or write that reader's own data. Nothing
secret ever reaches the browser bundle.

`supabase/functions/push/index.ts` delivers Web Push notifications.

## i18n

Two locales ship: `en` and Egyptian-dialect `ar` (مصري), in
`web/src/i18n/{en,ar}.ts`. Keys are flat (`home.greetingMorning`) and
placeholders are `{name}`.

- `TranslationKey` is derived from `en`, so a key missing from `ar` is a **type
  error** and fails the build. Add every new key to both.
- `provider.tsx` syncs `<html lang>` and `<html dir>`, which is what makes RTL
  work. The choice persists in the local preferences row.
- Write the Arabic in Egyptian colloquial (بتقرأ / خلّي / على طول), not MSA.

## Mobile first

Mobile is the primary target; desktop is the adaptation.

- `web/src/components/bottom-nav.tsx` renders a fixed bottom tab bar on phones and
  the same links as a left rail from `md` up.
- Safe areas come from `env(safe-area-inset-*)` via the `pt-safe` / `pb-safe` /
  `pb-nav` utilities in `globals.css`. `viewportFit: "cover"` is set in the root
  layout — without it those insets do nothing on iOS.
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

Preview locally with `python3 -m http.server -d web/out` — the app must be served
over HTTP, not opened as a `file://` path, or the service worker will not register.

`web/src/components/service-worker-registrar.tsx` registers the generated
`sw.js`; `next-pwa` writes the worker but does not inject the registration
snippet on a static export.

## Conventions

- Colours come from the CSS variables in `globals.css` (`bg-background`,
  `text-muted-foreground`, `border-border`, `text-primary`…). Never hardcode a
  hue; both themes are defined by swapping those variables.
- Build UI from the shadcn primitives in `web/src/components/ui/`, and the shared
  layout blocks in `web/src/components/page.tsx` (`PageHeader`, `Section`, `Stat`,
  `EmptyState`) rather than repeating Tailwind chains.
- All copy goes through `useI18n().t(...)`.
- Writes go through `useData()`; never touch Dexie from a component.
- Charts and progress are plain CSS/SVG — do not add a charting dependency for a
  bar row or a heatmap.

## Brand assets

```bash
cd web && python3 scripts/make_icons.py   # needs pillow
```

Renders `icon512_rounded.png`, `icon512_maskable.png`, `apple-touch-icon.png`
and `favicon-64.png` into `web/public/` from
`web/public/brand/logo-mark.png`.
