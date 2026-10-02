#!/usr/bin/env python3
"""Generate the TraceBook icon set from the vector mark.

Everything derives from `public/brand/book-mark.svg`, so the favicon, the PWA
icons and the App Store touch icon are guaranteed to be the same drawing at
different sizes rather than three files that drift apart.

The SVG already carries its own rounded plate and background, so this only has
to rasterise at each size. That is deliberate: a transparent mark would need a
separate background rule per surface (favicon, maskable, apple-touch), and they
would not stay in sync.

Usage: python3 scripts/make_icons.py [--svg PATH] [--out DIR]
"""
import argparse
import sys
from pathlib import Path

try:
    import cairosvg
except ImportError:  # pragma: no cover
    sys.exit("cairosvg is required: pip install cairosvg")

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required: pip install Pillow")

# name -> pixel size. `icon512_maskable` is the same art; Android crops it with
# its own shape, and the mark already keeps ~15% padding so nothing is lost.
ICONS: list[tuple[str, int]] = [
    ("favicon-16.png", 16),
    ("favicon-32.png", 32),
    ("favicon-64.png", 64),
    ("apple-touch-icon.png", 180),
    ("icon-192.png", 192),
    ("icon-512.png", 512),
    ("icon512_rounded.png", 512),
    ("icon512_maskable.png", 512),
]


def render(svg: Path, out: Path, size: int) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(
        url=str(svg),
        write_to=str(out),
        output_width=size,
        output_height=size,
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--svg", type=Path, default=None)
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    here = Path(__file__).resolve().parent.parent
    svg = args.svg or (here / "public" / "brand" / "book-mark.svg")
    out_dir = args.out or (here / "public")

    if not svg.exists():
        sys.exit(f"mark not found at {svg}")

    for name, size in ICONS:
        render(svg, out_dir / name, size)
        print(f"  {name} ({size}px)")

    # A multi-resolution .ico so Windows and every browser tab have a crisp mark.
    ico_sizes = [16, 32, 48]
    frames = []
    for s in ico_sizes:
        tmp = out_dir / f".ico-{s}.png"
        render(svg, tmp, s)
        frames.append(Image.open(tmp).convert("RGBA"))
    # Written to public/ rather than src/app/ on purpose: Next's file convention
    # for app/favicon.ico takes over and suppresses `metadata.icons`, which would
    # drop the explicit per-size links the browsers actually use.
    frames[0].save(
        out_dir / "favicon.ico",
        format="ICO",
        sizes=[(s, s) for s in ico_sizes],
    )
    for s in ico_sizes:
        (out_dir / f".ico-{s}.png").unlink(missing_ok=True)
    print(f"  favicon.ico ({'/'.join(str(s) for s in ico_sizes)}px)")

    # A plain lockup for the landing page and README.
    render(svg, out_dir / "brand" / "logo.png", 512)
    print("  brand/logo.png (512px)")
    print(f"icons written to {out_dir}")


if __name__ == "__main__":
    main()

