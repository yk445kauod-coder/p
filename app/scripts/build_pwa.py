#!/usr/bin/env python3
"""
Turn an `expo export --platform web` bundle into an installable PWA.

Generates the icon set from the brand mark, writes a web app manifest and a
precaching service worker, and injects the PWA meta tags + registration snippet
into the exported index.html. Everything is emitted relative to the export root
so the bundle can be served from any sub-path (e.g. /app/).

Usage:
    python3 scripts/build_pwa.py <web-export-dir> [--base /app/]
"""

import argparse
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required: pip install Pillow")

BG = (20, 17, 14)  # app dark background, #14110E
THEME = "#14110E"
BRAND = "#7FBFA0"

ICONS = [
    # (name, size, logo scale, maskable)
    ("icons/icon-192.png", 192, 0.74, False),
    ("icons/icon-512.png", 512, 0.74, False),
    ("icons/maskable-512.png", 512, 0.52, True),
    ("icons/apple-touch-icon.png", 180, 0.80, False),
    ("icons/favicon-64.png", 64, 0.86, False),
]


def make_icon(logo: Image.Image, out: Path, size: int, scale: float, maskable: bool) -> None:
    canvas = Image.new("RGBA", (size, size), BG + (255,))
    target = max(1, int(size * scale))
    mark = logo.resize((target, target), Image.LANCZOS)
    # Keep the mark inside the maskable safe zone by centering it exactly.
    off = ((size - target) // 2, (size - target) // 2)
    canvas.alpha_composite(mark, off)
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, "PNG", optimize=True)


def flatten_node_modules(root: Path) -> int:
    """Rename `assets/node_modules` so no emitted path contains that segment.

    Cloudflare Pages refuses to upload any file whose path contains a
    `node_modules` segment, so the Expo asset tree (fonts, images vendored from
    packages) is silently dropped and the deployed app hangs on its splash. The
    directory holds only content-hashed, build-time-copied files — it is not a
    package tree — so moving it to `assets/vendor` is safe.

    The exported HTML and JS embed absolute `/assets/node_modules/...` URLs, so
    both are rewritten after the move. Rewriting a bundle changes its bytes while
    leaving its content-hashed name untouched, and `_headers` marks those names
    `immutable` for a year — so a renamed bundle is re-hashed and its `<script>`
    reference updated, otherwise returning clients would keep the stale file.
    """
    old = root / "assets" / "node_modules"
    if not old.is_dir():
        return 0
    new = root / "assets" / "vendor"
    if new.exists():
        shutil.rmtree(new)
    old.rename(new)
    moved = sum(1 for p in new.rglob("*") if p.is_file())

    needle = f"/assets/{old.name}/"
    replacement = f"/assets/{new.name}/"
    renamed: dict[str, str] = {}
    for path in [root / "index.html", *root.rglob("*.js")]:
        if not path.is_file():
            continue
        text = path.read_text()
        if needle not in text:
            continue
        path.write_text(text.replace(needle, replacement))
        if path.suffix == ".js":
            renamed[path.name] = rehash(path)

    if renamed:
        index = root / "index.html"
        html = index.read_text()
        for before, after in renamed.items():
            html = html.replace(before, after)
        index.write_text(html)
    return moved


def rehash(path: Path) -> str:
    """Rename a hashed bundle to match its new contents and return the new name."""
    match = re.match(r"^(.*-)[0-9a-f]{16,}(\.js)$", path.name)
    if not match:
        return path.name
    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:32]
    target = path.with_name(f"{match.group(1)}{digest}{match.group(2)}")
    path.rename(target)
    return target.name


def collect_precache(root: Path, base: str) -> list[str]:
    """Every servable file, as a URL relative to the service worker scope."""
    skip = {"sw.js", "manifest.webmanifest", "index.html"}
    urls = ["./", "index.html", "manifest.webmanifest"]
    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(root).as_posix()
        if rel in skip:
            continue
        urls.append(rel)
    return urls


SERVICE_WORKER = """\
/* TraceBook service worker — offline shell + cache-first static assets. */
const VERSION = {version!r};
const CACHE = "tracebook-" + VERSION;
const PRECACHE = {precache};

self.addEventListener("install", (event) => {{
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
}});

self.addEventListener("activate", (event) => {{
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
}});

self.addEventListener("push", (event) => {{
  let payload = {{}};
  try {{
    payload = event.data ? event.data.json() : {{}};
  }} catch (e) {{
    payload = {{ body: event.data ? event.data.text() : "" }};
  }}
  const title = payload.title || "TraceBook";
  const options = {{
    body: payload.body || "",
    icon: "icons/icon-192.png",
    badge: "icons/favicon-64.png",
    tag: payload.tag || "tracebook",
    data: {{ url: payload.url || "./" }},
  }};
  event.waitUntil(self.registration.showNotification(title, options));
}});

self.addEventListener("notificationclick", (event) => {{
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({{ type: "window", includeUncontrolled: true }}).then((list) => {{
      for (const client of list) {{
        if (client.url.startsWith(self.registration.scope) && "focus" in client) return client.focus();
      }}
      return self.clients.openWindow(target);
    }})
  );
}});

self.addEventListener("fetch", (event) => {{
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Never cache API traffic — the app needs live data.
  if (url.pathname.startsWith("/api") || url.hostname.endsWith("workers.dev")) return;

  // Navigations: network first, fall back to the cached shell when offline.
  if (req.mode === "navigate") {{
    event.respondWith(
      fetch(req)
        .then((res) => {{
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("index.html", copy));
          return res;
        }})
        .catch(() => caches.match("index.html").then((r) => r || caches.match("./")))
    );
    return;
  }}

  // Everything else: cache first, then network (and cache what we fetch).
  event.respondWith(
    caches.match(req).then((cached) => {{
      if (cached) return cached;
      return fetch(req).then((res) => {{
        if (res.ok && url.origin === self.location.origin) {{
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }}
        return res;
      }});
    }})
  );
}});
"""


def write_manifest(root: Path, base: str, shots: list[tuple[str, str]]) -> None:
    manifest = {
        "name": "TraceBook — Reading Habit Tracker",
        "short_name": "TraceBook",
        "description": "Track reading sessions, streaks, stats, quotes and goals with an AI reading coach. Works offline.",
        "id": base,
        "start_url": "./",
        "scope": "./",
        "display": "standalone",
        "display_override": ["window-controls-overlay", "standalone", "minimal-ui"],
        "orientation": "portrait",
        "background_color": THEME,
        "theme_color": THEME,
        "categories": ["books", "productivity", "lifestyle", "education"],
        "lang": "en",
        "dir": "auto",
        "icons": [
            {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
        "screenshots": [
            {"src": src, "sizes": sizes, "type": "image/png", "form_factor": "narrow"}
            for src, sizes in shots
        ],
        "shortcuts": [
            {"name": "Library", "url": "./?tab=Library", "icons": [{"src": "icons/icon-192.png", "sizes": "192x192"}]},
            {"name": "Stats", "url": "./?tab=Stats", "icons": [{"src": "icons/icon-192.png", "sizes": "192x192"}]},
        ],
    }
    (root / "manifest.webmanifest").write_text(json.dumps(manifest, indent=2) + "\n")


HEAD_TAGS = """
    <!-- PWA -->
    <link rel="manifest" href="manifest.webmanifest" />
    <meta name="theme-color" content="{theme}" />
    <meta name="description" content="Track reading sessions, streaks, stats, quotes and goals with an AI reading coach. Works offline." />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="TraceBook" />
    <meta name="application-name" content="TraceBook" />
    <link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="64x64" href="icons/favicon-64.png" />
""".format(theme=THEME)

REGISTER = """
    <script>
      // Capture the install prompt early so the UI can offer an "Install app" button.
      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        window.__tbInstall = e;
        window.dispatchEvent(new Event("tb-installable"));
      });
      window.addEventListener("appinstalled", () => {
        window.__tbInstall = null;
        window.dispatchEvent(new Event("tb-installed"));
      });
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
          navigator.serviceWorker.register("sw.js").catch(() => {});
        });
      }
    </script>
"""


def patch_index(root: Path, base: str) -> None:
    index = root / "index.html"
    html = index.read_text()

    # Serve assets relative to the bundle root so it works under any sub-path.
    prefix = base.rstrip("/")
    html = re.sub(r'(src|href)="(?:' + re.escape(prefix) + r')?/(_expo|assets)/', r'\1="\2/', html)
    html = re.sub(r'href="(?:' + re.escape(prefix) + r')?/favicon\.ico"', 'href="icons/favicon-64.png"', html)

    if "manifest.webmanifest" not in html:
        html = html.replace("</head>", HEAD_TAGS + "</head>")
    if "navigator.serviceWorker" not in html:
        html = html.replace("</body>", REGISTER + "</body>")

    index.write_text(html)


def stage_screenshots(root: Path, shots_dir: Path | None) -> list[tuple[str, str]]:
    """Copy app screenshots into the bundle and report their real pixel sizes."""
    if not shots_dir or not shots_dir.is_dir():
        return []
    staged: list[tuple[str, str]] = []
    for src in sorted(shots_dir.glob("shot-*-dark.png")):
        dest = root / src.name
        image = Image.open(src).convert("RGB")
        image.save(dest, "PNG", optimize=True)
        staged.append((src.name, f"{image.width}x{image.height}"))
    return staged


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("export_dir", type=Path)
    ap.add_argument("--base", default="/app/", help="public path the bundle is served from")
    ap.add_argument("--logo", type=Path, default=None)
    ap.add_argument("--shots", type=Path, default=None, help="directory of screenshot PNGs")
    args = ap.parse_args()

    root: Path = args.export_dir
    if not (root / "index.html").exists():
        sys.exit(f"no index.html in {root} — run `expo export --platform web` first")

    moved = flatten_node_modules(root)
    if moved:
        print(f"==> Moved {moved} assets out of node_modules/ (Cloudflare Pages skips that path)")

    app_dir = Path(__file__).resolve().parent.parent
    logo_path = args.logo or (app_dir / "assets" / "logo-mark.png")
    logo = Image.open(logo_path).convert("RGBA")

    for name, size, scale, maskable in ICONS:
        make_icon(logo, root / name, size, scale, maskable)

    shots = stage_screenshots(root, args.shots or (app_dir.parent / "landing"))
    write_manifest(root, args.base, shots)

    version = re.search(r"index-([0-9a-f]+)\.js", (root / "index.html").read_text())
    stamp = version.group(1)[:12] if version else "dev"
    precache = collect_precache(root, args.base)
    (root / "sw.js").write_text(
        SERVICE_WORKER.format(version=stamp, precache=json.dumps(precache, indent=2))
    )

    patch_index(root, args.base)

    print(f"PWA ready in {root} — {len(precache)} precached URLs, cache 'tracebook-{stamp}'")


if __name__ == "__main__":
    main()
