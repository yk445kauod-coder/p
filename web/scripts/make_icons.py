#!/usr/bin/env python3
"""Generate the TraceBook PWA icon set from the brand mark.

Renders the 512px maskable/rounded icons plus a favicon from the existing
`logo-mark.png`, on the app's dark canvas so the icon reads correctly on both
light and dark home screens.

Usage: python3 scripts/make_icons.py [--logo PATH] [--out DIR]
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required: pip install Pillow")

# App canvas colour, matching --background in globals.css.
DARK_BG = (18, 16, 14)

ICONS = [
    # (name, size, logo scale, maskable)
    ("icon512_rounded.png", 512, 0.72, False),
    ("icon512_maskable.png", 512, 0.52, True),
    ("apple-touch-icon.png", 180, 0.78, False),
    ("favicon-64.png", 64, 0.84, False),
]


def render(logo: Image.Image, out: Path, size: int, scale: float) -> None:
    canvas = Image.new("RGBA", (size, size), DARK_BG + (255,))
    target = max(1, int(size * scale))
    mark = logo.resize((target, target), Image.LANCZOS)
    # Centre the mark so it stays inside the maskable safe zone.
    off = ((size - target) // 2, (size - target) // 2)
    canvas.alpha_composite(mark, off)
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, "PNG", optimize=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--logo", type=Path, default=None)
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    here = Path(__file__).resolve().parent.parent
    logo_path = args.logo or (here.parent / "app" / "assets" / "logo-mark.png")
    out_dir = args.out or (here / "public")

    if not logo_path.exists():
        sys.exit(f"brand mark not found at {logo_path}")
    logo = Image.open(logo_path).convert("RGBA")

    for name, size, scale, _maskable in ICONS:
        render(logo, out_dir / name, size, scale)
        print(f"  {name} ({size}px)")

    print(f"icons written to {out_dir}")


if __name__ == "__main__":
    main()
