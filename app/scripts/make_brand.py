#!/usr/bin/env python3
"""Render TraceBook brand assets from a single vector source.

The mark is Fahm, the reading fox: the same character the in-app mascot uses,
so the icon and the assistant read as one. Everything is drawn from one SVG
string so the brand stays identical across launcher, splash, web manifest and
favicon without hand-maintaining bitmaps.
"""
import os
import cairosvg
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)

INDIGO = "#4338CA"
VIOLET = "#7C3AED"
CYAN = "#22D3EE"
AMBER = "#FBBF24"
CREAM = "#FDFBFF"
INK = "#1E1B4B"


def fox_mark(size, bg=True, include_wordmark=False, scale=1.0, rounded=True):
    """Fahm the fox. `bg=False` yields a transparent layer.

    `scale` shrinks the artwork toward the centre, which adaptive icons need so
    the mark survives the launcher's circular mask.
    """
    s = size
    r = int(s * 0.22) if rounded else 0
    bg_rect = f'<rect width="{s}" height="{s}" rx="{r}" fill="url(#bg)"/>' if bg else ""
    offset = s * (1 - scale) / 2
    wm = ""
    if include_wordmark:
        wm = f'''<text x="{s / 2}" y="{s * 0.94}" text-anchor="middle"
              font-family="DejaVu Sans, Helvetica, Arial, sans-serif"
              font-size="{int(s * 0.082)}" font-weight="700"
              fill="{CREAM}">TraceBook</text>'''

    # Fox-head geometry, expressed on a 0..1 grid then scaled.
    u = lambda v: s * v
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" viewBox="0 0 {s} {s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{INDIGO}"/>
      <stop offset="55%" stop-color="{VIOLET}"/>
      <stop offset="100%" stop-color="#5B21B6"/>
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{CREAM}"/>
      <stop offset="100%" stop-color="#D8D2FF"/>
    </linearGradient>
    <linearGradient id="streak" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{AMBER}"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.62">
      <stop offset="0%" stop-color="#C4B5FD" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#C4B5FD" stop-opacity="0"/>
    </radialGradient>
  </defs>
  {bg_rect}
  <g transform="translate({offset} {offset}) scale({scale})">
    <circle cx="{u(0.5)}" cy="{u(0.46)}" r="{u(0.44)}" fill="url(#glow)"/>

    <!-- Ears. -->
    <path d="M {u(0.20)} {u(0.16)} L {u(0.44)} {u(0.30)} L {u(0.30)} {u(0.44)} Z" fill="{AMBER}"/>
    <path d="M {u(0.80)} {u(0.16)} L {u(0.56)} {u(0.30)} L {u(0.70)} {u(0.44)} Z" fill="{AMBER}"/>

    <!-- Head: rounded top, pointed chin. -->
    <path d="M {u(0.5)} {u(0.20)}
             C {u(0.72)} {u(0.20)} {u(0.82)} {u(0.38)} {u(0.82)} {u(0.54)}
             C {u(0.82)} {u(0.74)} {u(0.66)} {u(0.88)} {u(0.5)} {u(0.90)}
             C {u(0.34)} {u(0.88)} {u(0.18)} {u(0.74)} {u(0.18)} {u(0.54)}
             C {u(0.18)} {u(0.38)} {u(0.28)} {u(0.20)} {u(0.5)} {u(0.20)} Z"
          fill="url(#mark)"/>

    <!-- Muzzle. -->
    <path d="M {u(0.5)} {u(0.50)}
             C {u(0.64)} {u(0.50)} {u(0.72)} {u(0.62)} {u(0.64)} {u(0.74)}
             C {u(0.58)} {u(0.83)} {u(0.42)} {u(0.83)} {u(0.36)} {u(0.74)}
             C {u(0.28)} {u(0.62)} {u(0.36)} {u(0.50)} {u(0.5)} {u(0.50)} Z"
          fill="{CREAM}"/>

    <!-- Eyes. -->
    <circle cx="{u(0.40)}" cy="{u(0.50)}" r="{u(0.058)}" fill="{INK}"/>
    <circle cx="{u(0.60)}" cy="{u(0.50)}" r="{u(0.058)}" fill="{INK}"/>
    <circle cx="{u(0.417)}" cy="{u(0.482)}" r="{u(0.019)}" fill="{CREAM}"/>
    <circle cx="{u(0.617)}" cy="{u(0.482)}" r="{u(0.019)}" fill="{CREAM}"/>

    <!-- Nose and smile. -->
    <path d="M {u(0.5)} {u(0.635)} L {u(0.545)} {u(0.685)} L {u(0.455)} {u(0.685)} Z" fill="{INK}"/>
    <path d="M {u(0.5)} {u(0.685)} L {u(0.5)} {u(0.72)}
             M {u(0.44)} {u(0.735)} Q {u(0.5)} {u(0.785)} {u(0.56)} {u(0.735)}"
          stroke="{INK}" stroke-width="{u(0.024)}" stroke-linecap="round" fill="none"/>

    <!-- Spark: the "trace" of a reading streak. -->
    <path d="M {u(0.80)} {u(0.14)}
             C {u(0.83)} {u(0.22)}, {u(0.88)} {u(0.25)}, {u(0.90)} {u(0.28)}
             C {u(0.86)} {u(0.28)}, {u(0.82)} {u(0.31)}, {u(0.80)} {u(0.38)}
             C {u(0.78)} {u(0.31)}, {u(0.74)} {u(0.28)}, {u(0.70)} {u(0.28)}
             C {u(0.72)} {u(0.25)}, {u(0.77)} {u(0.22)}, {u(0.80)} {u(0.14)} Z"
          fill="url(#streak)"/>
    {wm}
  </g>
</svg>'''


def save(svg, path, w, h=None):
    cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=path,
                     output_width=w, output_height=h or w)
    print(f"  {os.path.basename(path)} {w}x{h or w}")


print("Rendering TraceBook brand assets:")
save(fox_mark(1024, bg=True, rounded=False), f"{OUT}/icon.png", 1024)
save(fox_mark(1024, bg=False, scale=0.62), f"{OUT}/android-icon-foreground.png", 1024)
save(fox_mark(1024, bg=True), f"{OUT}/splash-icon.png", 1024)
save(fox_mark(512, bg=False), f"{OUT}/logo-mark.png", 512)
save(fox_mark(64, bg=True), f"{OUT}/favicon.png", 64)
save(fox_mark(1024, bg=True, include_wordmark=True), f"{OUT}/logo.png", 1024)

# Monochrome layer for Android 13+ themed icons: the mark in flat white.
save(
    fox_mark(1024, bg=False, scale=0.62)
    .replace(CREAM, "#FFFFFF").replace(INDIGO, "#FFFFFF").replace(VIOLET, "#FFFFFF")
    .replace(AMBER, "#FFFFFF").replace(INK, "#FFFFFF").replace("#D8D2FF", "#FFFFFF")
    .replace("#A99CE8", "#FFFFFF").replace(CYAN, "#FFFFFF").replace("#A5F3FC", "#FFFFFF")
    .replace("#5B21B6", "#FFFFFF").replace("#C4B5FD", "#FFFFFF"),
    f"{OUT}/android-icon-monochrome.png",
    1024,
)

Image.open(f"{OUT}/icon.png").convert("RGBA").resize((512, 512), Image.LANCZOS).save(
    f"{OUT}/play-icon.png"
)
print("  play-icon.png 512x512")
print("Done.")
