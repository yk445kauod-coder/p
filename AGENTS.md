# TraceBook

Reading-habit tracker shipped as an installable, mobile-first web app (PWA).
Expo/React Native app exports to `react-native-web`; Supabase provides Postgres,
auth and edge functions. There is no Android build — the APK was cancelled.

## Layout

```
app/       Expo React Native app (exports to an installable PWA via react-native-web)
supabase/  Edge functions: agent/ (AI coach), push/ (Web Push delivery)
landing/   Static marketing page (also holds `_headers` and the app screenshots)
scripts/   build_site.sh - builds the whole web surface into site/
site/      Build output: landing page at /, PWA at /app/ (git-ignored)
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

## App

```bash
cd app
npx tsc --noEmit                                   # typecheck
npx expo lint                                      # lint
npx expo export --platform web --output-dir dist
```

`app/.env` holds only publishable values (`EXPO_PUBLIC_*`): the Supabase URL and
anon key, and the VAPID public key. Metro caches env values, so pass `--clear`
after changing `.env`.

### Brand assets

```bash
cd app && python3 scripts/make_brand.py   # needs cairosvg + pillow
```

Renders `icon.png`, `android-icon-foreground.png`, `android-icon-monochrome.png`,
`splash-icon.png`, `favicon.png` and `logo.png` from one vector source.

## i18n

`app/src/i18n/` holds the copy deck. Two locales: `en` and `ar` (Egyptian
dialect). Keys are flat (`home.greetingMorning`), placeholders are `{name}`. The
two dictionaries must stay in lockstep — `TranslationKey` is derived from `en`,
so a key missing from `ar` is a type error. The language choice persists in
settings; RTL needs an app reload because `I18nManager` resolves direction at
startup.

## Distribution

The primary distribution channel is the installable PWA:

- Landing page: https://tracebook.pages.dev/
- Web app / PWA: https://tracebook.pages.dev/app/

Build and deploy the whole surface with one command:

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

Preview the built site locally with `python3 -m http.server -d site` — the app
must be served from `/app/`, not opened as a `file://` path, or the service
worker will not register.

## Conventions

- Screens read theme through `useTheme()`, never hardcode colours.
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
- The mascot (`app/src/components/mascot/Mascot.tsx`) is Fahm, a living
  bookmark drawn in SVG — no sprite assets, so it follows the theme palette and
  stays crisp at any size. It gazes at the cursor via the pointer bus in
  `mascot/pointer.ts` (the root view reports mouse/touch without claiming the
  responder, so nothing underneath stops being pressable), plays discrete
  direction and reaction states, and is the entry point to the AI chat sheet.
  Gaze tracking is disabled when there is no fine pointer, and every animation
  honours `prefers-reduced-motion` / the in-app setting.
- Anything PWA-related (install prompt, theme-color, service worker, push) is
  web-guarded via `Platform.OS === "web"` so native builds are unaffected.
