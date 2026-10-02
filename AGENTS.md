# TraceBook

Reading-habit tracker shipped as an installable, mobile-first web app (PWA).

There are **two front-ends in this repo**, on separate branches:

| Branch | Front-end | Status |
| --- | --- | --- |
| `feat/tracebook-next` | `web/` — Next.js 14 + shadcn/ui + Tailwind | **current** |
| `feat/tracebook-pwa-and-landing` | `app/` — Expo/React Native → `react-native-web` | previous |

Both share the same Supabase project (`rxjwygaemyxxcegiiuev`), the same domain
model and the same two locales. The Expo app is kept only as a reference; new
work goes into `web/`.

## Layout

```
web/       Next.js app: landing at /, the reader at /app/ (static export → Cloudflare Pages)
app/       Expo React Native app from the previous branch (reference only)
supabase/  Edge functions: agent/ (AI coach), push/ (Web Push delivery)
landing/   Static marketing page used by the previous branch
scripts/   build_site.sh - builds the previous branch's web surface into site/
```

## Data & auth

Everything server-side lives in Supabase (project ref `rxjwygaemyxxcegiiuev`).

- `app/src/lib/supabase.ts` owns the single client. On web the session is in
  localStorage; on native it uses AsyncStorage. `detectSessionInUrl` is off
  because the app owns its routing.
- `app/src/api/db.ts` is the typed data layer (books, sessions, quotes, goals,
  weekly reviews, notifications, push subscriptions). All access is RLS-scoped
  to the signed-in user.
- Guest mode keeps data in AsyncStorage only; `cloudAvailable` in the auth store
  reports whether a Supabase project was configured at build time.

## Edge functions

```bash
npx supabase functions deploy agent --project-ref rxjwygaemyxxcegiiuev
npx supabase functions deploy push  --project-ref rxjwygaemyxxcegiiuev --no-verify-jwt
```

- `agent/` — the AI coach. Holds the model provider key, talks to Postgres as
  the signed-in user, and exposes tools over the reader's own data. No secret
  ever reaches the bundle.
- `push/` — Web Push delivery. Implements RFC 8291 payload encryption and VAPID
  JWTs with WebCrypto, because the runtime provides neither. Two paths: the
  signed-in user pushes to their own devices, and a cron path
  (`{"mode":"reminders","zone":...}`, header `x-cron-secret`) fans out daily
  reminders. Dead endpoints (404/410) are pruned.

Function secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
`CRON_SECRET`, plus the provider key used by `agent`. Set them with
`npx supabase secrets set --project-ref rxjwygaemyxxcegiiuev ...`.

## Reminders

`pg_cron` runs `public.send_reading_reminders()` every quarter hour; the job
calls the `push` function once per timezone so each reader is reminded at their
local `notify_reminder_time`. The function URL and cron secret live in the
private `private.app_config` table (not exposed through the API).

## Web app (`web/`) — current

```bash
cd web
npx next build          # typecheck + static export into out/
npx next dev            # local dev server
npx vitest              # unit tests
npx next lint           # lint
```

`web/.env.local` holds only publishable values (`NEXT_PUBLIC_*`): the Supabase
URL and anon key. With neither set the app still runs — it is local-first and
only needs Supabase for cross-device sync.

### How it is put together

- **Local-first.** Every read and write goes through Dexie (`src/db.ts`), so the
  UI is instant and works offline. `useData()` in `src/store/data.ts` wraps Dexie
  in `useLiveQuery`, so any screen re-renders the moment a row changes.
- **Sync is a mirror, not the source of truth.** `src/lib/sync.ts` pushes local
  rows to Supabase and pulls the server copy back, for signed-in readers only. It
  maps the app's camelCase model onto the Postgres schema the Expo app already
  used — note `reading_sessions.started_at` ↔ `day`, and
  `daily_entries.entry_date` ↔ `day`.
- **The domain is pure.** `src/lib/reading.ts` holds the streak maths, the plan
  projection and the badge table. Nothing there touches React or storage, which
  is what makes it cheap to test.
- **No server runtime.** `next.config.mjs` sets `output: "export"`, so the whole
  app is static and deploys to Cloudflare Pages. Anything needing a secret (the
  AI coach, Stripe) must live in a Supabase edge function rather than a Next API
  route — do not add `src/app/api/*`.

### Mobile first

Mobile is the primary target, desktop is the adaptation:

- `src/components/bottom-nav.tsx` renders a fixed bottom tab bar on phones and
  the same links as a left rail from `md` up.
- Safe areas come from `env(safe-area-inset-*)` via the `pt-safe` / `pb-safe` /
  `pb-nav` utilities in `globals.css`; `viewportFit: "cover"` is set in the root
  layout, without which those insets do nothing on iOS.
- Inputs are forced to 16px so iOS never zooms on focus.
- Tap targets are at least `min-h-9` (36px), usually 44px+.
- Filter strips scroll horizontally rather than wrapping, so options stay
  thumb-reachable.

### Brand assets

```bash
cd web && python3 scripts/make_icons.py   # needs pillow
```

Renders `icon512_rounded.png`, `icon512_maskable.png`, `apple-touch-icon.png`
and `favicon-64.png` into `public/` from `app/assets/logo-mark.png`.

## App (`app/`) — previous branch

```bash
cd app
npx tsc --noEmit                                   # typecheck
npx expo lint                                      # lint
npx jest                                           # unit tests
npx expo export --platform web --output-dir dist
```

`app/.env` holds only publishable values (`EXPO_PUBLIC_*`): the Supabase URL and
anon key, and the VAPID public key. Metro caches env values, so pass `--clear`
after changing `.env`.

### Tests

`jest-expo` runs the suites in `app/__tests__/`: pure logic (`plan`,
`achievements`, `quotes`), `computeStats` from the data store, the agent NDJSON
stream parser, and an i18n parity check. The parity test is the important one —
it asserts `en` and `ar` have identical key sets and identical `{placeholder}`
tokens, which is exactly the class of bug that is invisible in review.

### Brand assets

```bash
cd app && python3 scripts/make_brand.py   # needs cairosvg + pillow
```

Renders `icon.png`, `android-icon-foreground.png`, `android-icon-monochrome.png`,
`splash-icon.png`, `favicon.png` and `logo.png` from one vector source.

## i18n

Two locales ship, in both front-ends: `en` and Egyptian-dialect `ar`. Keys are
flat (`home.greetingMorning`) and placeholders are `{name}`.

- Web: `web/src/i18n/{en,ar}.ts`, with `TranslationKey` derived from `en` so a
  key missing from `ar` is a type error. `provider.tsx` also syncs
  `<html lang>` and `<html dir>`, which is what makes RTL work.
- App: `app/src/i18n/`, same rules; RTL needs a reload because `I18nManager`
  resolves direction at startup.

Write the Arabic in Egyptian colloquial (بتقرأ / خلّي / على طول), not MSA.

## Distribution

Live at:

- Landing page: https://tracebook.pages.dev/
- Reader / PWA: https://tracebook.pages.dev/app/

### Current (Next.js)

`web/` exports statically, so deploying is just a build and an upload:

```bash
cd web && npx next build          # -> web/out
npx wrangler pages deploy out --project-name=tracebook --branch=main
```

Cloudflare Pages picks the custom domain up from the project; `tracebook.pages.dev`
is the production alias.

### Previous (Expo)

```bash
./scripts/build_site.sh                       # -> site/
npx wrangler pages deploy site --project-name=tracebook --branch=main
```

`build_site.sh` exports the Expo web bundle, then runs
`app/scripts/build_pwa.py`, which generates the icon set from
`app/assets/logo-mark.png`, writes `manifest.webmanifest` and a precaching
`sw.js` (offline shell, push and notificationclick handlers), stages the
screenshots, and injects the PWA meta tags. Asset URLs are made relative and
`experiments.baseUrl` in `app.json` is `/app`, so the bundle works under the
`/app/` sub-path. `landing/_headers` keeps `sw.js` uncached and marks the hashed
bundles immutable.

Expo emits package-vendored assets (fonts, icons) under
`assets/node_modules/...`, and Cloudflare Pages silently refuses to upload any
path containing a `node_modules` segment. The build renames that directory to
`assets/vendor`, rewrites the `/assets/node_modules/` URLs baked into the
exported HTML and JS, and re-hashes the bundle so its content-addressed name
still matches its bytes. Without this the fonts 404, `useFonts` never resolves,
and the deployed app hangs on its splash forever — even though the same build
works when served locally.

Preview either build locally with `python3 -m http.server -d <out|site>` — the
app must be served over HTTP, not opened as a `file://` path, or the service
worker will not register.

## Conventions

### Web (`web/`) — current

- Colours come from the CSS variables in `globals.css` (`bg-background`,
  `text-muted-foreground`, `border-border`, `text-primary`…). Never hardcode a
  hue; both themes are defined by swapping those variables.
- Build UI from the shadcn primitives in `src/components/ui/`, and the shared
  layout blocks in `src/components/page.tsx` (`PageHeader`, `Section`, `Stat`,
  `EmptyState`) rather than repeating Tailwind chains.
- All copy goes through `useI18n().t(...)`; add every new key to **both**
  `src/i18n/en.ts` and `src/i18n/ar.ts`. `TranslationKey` is derived from `en`,
  so a missing Arabic key fails the build.
- Writes go through `useData()`; never touch Dexie from a component.
- Keep the app mobile-first: one column, `pb-nav` on screens with the tab bar,
  and no layout that needs a horizontal scroll on a 360px viewport.

### App (`app/`) — previous branch

- Screens read theme through `useTheme()`, never hardcode colours. The palette
  lives in `theme/theme.ts` (violet/pink/lime/cyan ramps, a `premium` gold pair
  for the paid tier, plus `elevation`, `gradient`, `container`, `breakpoints`
  and `zIndex`).
- Every screen renders inside `components/layout.tsx`'s `Screen`, which centres
  content at `theme.container.content` and owns the safe-area padding. Use
  `Section` for vertical rhythm and `ChromeSlot` for anything absolutely
  positioned, so floating chrome lines up with the content column.
- Hover/press/focus come from `useFinePointer()` + the `Hoverable` /
  `InteractiveRow` helpers and `focusRing()`; do not invent per-screen states.
  `Card interactive` and the `Chip` primitive already carry the behaviour.
- All user-facing strings go through `useI18n().t(...)`. Notifications store
  translation keys and resolve them at push time, so stored copy matches the
  language the reader saw.
- Text renders through `app/src/components/Text.tsx`, not React Native's `Text`.
  It picks IBM Plex Sans / IBM Plex Sans Arabic per language and per text run,
  and folds `fontWeight` into the registered family (custom fonts do not
  synthesise bold). Import `Text` / `TextInput` from `./Text`; `fontFor()` in
  `theme/typography.ts` is for surfaces we do not render ourselves, such as
  React Navigation's tab labels. Fonts load in `theme/useAppFonts.ts`.
- Web deep links accept `?tab=Home|Library|Stats|Profile` for screenshots.
- Free vs Pro lives in `store/entitlements.tsx`; the tier is the `plan` column on
  `profiles` (`free` | `pro`). Gate at the call site (`canSendAI`, the active-book
  cap, `historyDays`) and route to the paywall with `openPaywall()` rather than
  failing silently. A locally unlocked plan is mirrored to AsyncStorage so a
  guest preview keeps it; real billing would replace `setPlan` with a checkout.
- The Stats screen charts live in `app/src/components/analytics/`. Nivo is
  DOM-only, so every chart is a `.web.tsx` component paired with a
  `react-native-svg` fallback that Metro picks for native. `theme.ts` bridges the
  TraceBook palette into Nivo's theme, and `derive.ts` computes every series from
  the reader's own sessions and books — there is no mock data, so charts differ
  per account. Genre labels resolve through `categoryLabel()` so they follow the
  active language.
- The mascot (`app/src/components/mascot/Mascot.tsx`) is Fahm, a fox built
  from the page-mascot sprite sheets (`app/assets/mascots/fox-{directions,reactions}.webp`,
  two 3x3 atlases of nine gazes and nine expressions, MIT-licensed). It gazes at
  the cursor via the pointer bus in `mascot/pointer.ts` (the root view reports
  mouse/touch without claiming the responder, so nothing underneath stops being
  pressable), plays discrete direction and reaction states, and is the entry
  point to the AI chat sheet. Gaze tracking is disabled when there is no fine
  pointer, and every animation honours `prefers-reduced-motion` / the in-app
  setting. To swap characters, drop another `<name>-{directions,reactions}.webp`
  pair from https://koboyo.com/page-mascot/mascots/ into `app/assets/mascots/`
  and update `SHEETS`; `app/scripts/make_brand.py` draws the matching fox mark
  for the launcher, splash, manifest and favicon.
- Anything PWA-related (install prompt, theme-color, service worker, push) is
  web-guarded via `Platform.OS === "web"` so native builds are unaffected.
