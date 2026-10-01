#!/usr/bin/env python3
"""Render TraceBook brand assets from a single vector source.

Produces the app icon, adaptive foreground, splash, web logo and favicon so the
brand stays identical everywhere without hand-maintaining bitmaps.
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


def owl_mark(size, bg=True, include_wordmark=False, scale=1.0, rounded=True):
    """Owl perched on an open book. `bg=False` yields a transparent layer.

    `scale` shrinks the artwork toward the centre, which adaptive icons need so
    the mark survives the launcher's circular mask.
    """
    s = size
    r = int(s * 0.22) if rounded else 0
    bg_rect = f'<rect width="{s}" height="{s}" rx="{r}" fill="url(#bg)"/>' if bg else ""
    offset = s * (1 - scale) / 2
    wm = ""
    if include_wordmark:
        wm = f'''<text x="{s / 2}" y="{s * 0.93}" text-anchor="middle"
              font-family="DejaVu Sans, Helvetica, Arial, sans-serif"
              font-size="{int(s * 0.082)}" font-weight="700"
              fill="{CREAM}">TraceBook</text>'''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" viewBox="0 0 {s} {s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{INDIGO}"/>
      <stop offset="55%" stop-color="{VIOLET}"/>
      <stop offset="100%" stop-color="#5B21B6"/>
    </linearGradient>
    <linearGradient id="page" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{CREAM}"/>
      <stop offset="100%" stop-color="#D8D2FF"/>
    </linearGradient>
    <linearGradient id="streak" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="{CYAN}"/>
      <stop offset="100%" stop-color="#A5F3FC"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.62">
      <stop offset="0%" stop-color="#C4B5FD" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#C4B5FD" stop-opacity="0"/>
    </radialGradient>
  </defs>
  {bg_rect}
  <g transform="translate({offset} {offset}) scale({scale})">
  <circle cx="{s * 0.5}" cy="{s * 0.42}" r="{s * 0.42}" fill="url(#glow)"/>

  <path d="M {s * 0.16} {s * 0.66}
           C {s * 0.32} {s * 0.60}, {s * 0.44} {s * 0.62}, {s * 0.5} {s * 0.68}
           C {s * 0.56} {s * 0.62}, {s * 0.68} {s * 0.60}, {s * 0.84} {s * 0.66}
           L {s * 0.84} {s * 0.84}
           C {s * 0.68} {s * 0.79}, {s * 0.56} {s * 0.80}, {s * 0.5} {s * 0.86}
           C {s * 0.44} {s * 0.80}, {s * 0.32} {s * 0.79}, {s * 0.16} {s * 0.84} Z"
        fill="url(#page)"/>
  <path d="M {s * 0.5} {s * 0.68} L {s * 0.5} {s * 0.86}" stroke="#A99CE8"
        stroke-width="{s * 0.008}" stroke-linecap="round" opacity="0.85"/>

  <path d="M {s * 0.30} {s * 0.40} L {s * 0.245} {s * 0.20} L {s * 0.42} {s * 0.29} Z" fill="{CREAM}"/>
  <path d="M {s * 0.70} {s * 0.40} L {s * 0.755} {s * 0.20} L {s * 0.58} {s * 0.29} Z" fill="{CREAM}"/>
  <circle cx="{s * 0.5}" cy="{s * 0.43}" r="{s * 0.245}" fill="{CREAM}"/>

  <circle cx="{s * 0.415}" cy="{s * 0.415}" r="{s * 0.088}" fill="{INDIGO}"/>
  <circle cx="{s * 0.585}" cy="{s * 0.415}" r="{s * 0.088}" fill="{INDIGO}"/>
  <circle cx="{s * 0.415}" cy="{s * 0.415}" r="{s * 0.038}" fill="#1E1B4B"/>
  <circle cx="{s * 0.585}" cy="{s * 0.415}" r="{s * 0.038}" fill="#1E1B4B"/>
  <circle cx="{s * 0.447}" cy="{s * 0.392}" r="{s * 0.017}" fill="{CREAM}"/>
  <circle cx="{s * 0.617}" cy="{s * 0.392}" r="{s * 0.017}" fill="{CREAM}"/>

  <path d="M {s * 0.5} {s * 0.455} L {s * 0.545} {s * 0.525} L {s * 0.455} {s * 0.525} Z" fill="{AMBER}"/>

  <path d="M {s * 0.80} {s * 0.20}
           C {s * 0.83} {s * 0.28}, {s * 0.88} {s * 0.31}, {s * 0.90} {s * 0.34}
           C {s * 0.86} {s * 0.34}, {s * 0.82} {s * 0.37}, {s * 0.80} {s * 0.44}
           C {s * 0.78} {s * 0.37}, {s * 0.74} {s * 0.34}, {s * 0.70} {s * 0.34}
           C {s * 0.72} {s * 0.31}, {s * 0.77} {s * 0.28}, {s * 0.80} {s * 0.20} Z"
        fill="url(#streak)"/>
  {wm}
  </g>
</svg>'''


def save(svg, path, w, h=None):
    cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=path,
                     output_width=w, output_height=h or w)
    print(f"  {os.path.basename(path)} {w}x{h or w}")


print("Rendering TraceBook brand assets:")
save(owl_mark(1024, bg=True, rounded=False), f"{OUT}/icon.png", 1024)
save(owl_mark(1024, bg=False, scale=0.62), f"{OUT}/android-icon-foreground.png", 1024)
save(owl_mark(1024, bg=True), f"{OUT}/splash-icon.png", 1024)
save(owl_mark(512, bg=False), f"{OUT}/logo-mark.png", 512)
save(owl_mark(64, bg=True), f"{OUT}/favicon.png", 64)
save(owl_mark(1024, bg=True, include_wordmark=True), f"{OUT}/logo.png", 1024)

# Monochrome layer for Android 13+ themed icons: the mark in flat white.
save(
    owl_mark(1024, bg=False, scale=0.62).replace(CREAM, "#FFFFFF").replace(INDIGO, "#FFFFFF")
    .replace(VIOLET, "#FFFFFF").replace(AMBER, "#FFFFFF").replace("#1E1B4B", "#FFFFFF")
    .replace("#D8D2FF", "#FFFFFF").replace("#A99CE8", "#FFFFFF").replace(CYAN, "#FFFFFF")
    .replace("#A5F3FC", "#FFFFFF").replace("#5B21B6", "#FFFFFF").replace("#C4B5FD", "#FFFFFF"),
    f"{OUT}/android-icon-monochrome.png",
    1024,
)

Image.open(f"{OUT}/icon.png").convert("RGBA").resize((512, 512), Image.LANCZOS).save(
    f"{OUT}/play-icon.png"
)
print("  play-icon.png 512x512")
print("Done.")
