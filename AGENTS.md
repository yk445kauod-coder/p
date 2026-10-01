# TraceBook

Reading-habit tracker: Expo (SDK 57) app + Cloudflare Workers backend, shipped as a locally built Android APK.

## Layout

```
app/       Expo React Native app (exports to an installable PWA via react-native-web)
backend/   Cloudflare Worker (Hono-style router, D1 + KV)
landing/   Static marketing page (also holds `_headers` and the app screenshots)
scripts/   build_site.sh - builds the whole web surface into site/
site/      Build output: landing page at /, PWA at /app/ (git-ignored)
```

## Backend

```bash
cd backend
npx wrangler dev --port 12000 --local     # serves on 0.0.0.0:12000
```

- D1 database `tracebook`, KV namespace for sessions.
- Secrets live in `backend/.dev.vars`: `OPENROUTER_API_KEY`, `AI_MODEL`.
- Routes: `/health`, `/auth/*`, `/books`, `/sessions`, `/sessions/stats`,
  `/quotes`, `/goals`, `/ai/chat`. All non-health routes need
  `Authorization: Bearer <token>`.

## App

```bash
cd app
npx tsc --noEmit                                   # typecheck
npx expo export --platform web --output-dir /tmp/tb_web
```

`EXPO_PUBLIC_API_URL` in `app/.env` must point at the worker's public URL.
Metro caches env values, so pass `--clear` after changing `.env`.

### Local APK build (no cloud)

Requires JDK 17 and the Android SDK. This environment has them at
`/opt/jdk17` and `/opt/android-sdk`.

```bash
export JAVA_HOME=/opt/jdk17
export ANDROID_HOME=/opt/android-sdk ANDROID_SDK_ROOT=/opt/android-sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH

cd app
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# output: android/app/build/outputs/apk/release/app-release.apk
```

The SDK directory must be writable — Gradle installs the NDK on first run.

### Brand assets

```bash
cd app && python3 scripts/make_brand.py   # needs cairosvg + pillow
```

Renders `icon.png`, `android-icon-foreground.png`, `android-icon-monochrome.png`,
`splash-icon.png`, `favicon.png` and `logo.png` from one vector source.

## i18n

`app/src/i18n/` holds the copy deck. Two locales: `en` and `ar` (Egyptian
dialect). Keys are flat (`home.greetingMorning`), placeholders are `{name}`.
The language choice persists in settings; RTL needs an app reload because
`I18nManager` resolves direction at startup.

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
`sw.js`, stages the screenshots, and injects the PWA meta tags. Asset URLs are
made relative and `experiments.baseUrl` in `app.json` is `/app`, so the bundle
works under the `/app/` sub-path. `landing/_headers` keeps `sw.js` uncached and
marks the hashed bundles immutable.

The Android APK remains as a secondary download. It is published as a GitHub
Release asset, which gives a permanent, free, key-less URL:

```
https://github.com/yk445kauod-coder/yousef-portfolio/releases/download/tracebook-v1.0.0/tracebook.apk
```

The landing page resolves the newest APK at runtime through the Worker
(`/download/release`) with a direct GitHub API fallback, so it never needs
redeploying to pick up a new build.

To cut a new APK: `gradlew assembleRelease`, then `POST` a release to
`/repos/<owner>/<repo>/releases` and upload the APK to
`https://uploads.github.com/repos/<owner>/<repo>/releases/<id>/assets?name=tracebook.apk`.

Preview the built site locally with `python3 -m http.server -d site` — the app
must be served from `/app/`, not opened as a `file://` path, or the service
worker will not register.

## Conventions

- Screens read theme through `useTheme()`, never hardcode colours.
- All user-facing strings go through `useI18n().t(...)`.
- Web deep links accept `?tab=Home|Library|Stats|Profile` for screenshots.
- The mascot (`app/src/components/mascot/`) uses the ready-made owl sprite
  sheets from the `page-mascot` skill — two 3x3 atlases (directions +
  reactions) at `app/assets/mascots/owl-*.webp`. Do not hand-draw or regenerate
  them; to swap characters, drop in another `<name>-{directions,reactions}.webp`
  pair from https://koboyo.com/page-mascot/mascots/ and update `SHEETS`.
- Anything PWA-related (install prompt, theme-color, service worker) is
  web-guarded via `Platform.OS === "web"` so native builds are unaffected.
