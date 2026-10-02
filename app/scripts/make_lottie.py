#!/usr/bin/env python3
"""Generate the small Lottie animations TraceBook ships.

Hand-authored so the app stays offline-first: no CDN fetch at runtime, and the
files are tiny. Run from `app/`:

    python3 scripts/make_lottie.py
"""

from __future__ import annotations

import json
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "lottie"

FR = 60
W = H = 200


def hex_rgb(value: str) -> list[float]:
    value = value.lstrip("#")
    return [int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)] + [1.0]


def static(value):
    return {"a": 0, "k": value}


def animated(frames: list[tuple[int, object]], ease=(0.4, 0.0, 0.2, 1.0)):
    """Build an animated property from (frame, value) pairs."""
    keys = []
    for i, (t, v) in enumerate(frames):
        if i == len(frames) - 1:
            keys.append({"t": t, "s": v if isinstance(v, list) else [v]})
        else:
            keys.append(
                {
                    "i": {"x": [ease[0]], "y": [ease[3]]},
                    "o": {"x": [ease[2]], "y": [ease[1]]},
                    "t": t,
                    "s": v if isinstance(v, list) else [v],
                }
            )
    return {"a": 1, "k": keys}


def shape_layer(index: int, name: str, shapes: list, op: int) -> dict:
    return {
        "ddd": 0,
        "ind": index,
        "ty": 4,
        "nm": name,
        "sr": 1,
        "ks": {
            "o": static(100),
            "r": static(0),
            "p": static([W / 2, H / 2, 0]),
            "a": static([0, 0, 0]),
            "s": static([100, 100, 100]),
        },
        "ao": 0,
        "shapes": shapes,
        "ip": 0,
        "op": op,
        "st": 0,
        "bm": 0,
    }


def polyline(points: list[tuple[float, float]]) -> dict:
    """A shape made of straight segments, centred on the composition."""
    verts = [[x - W / 2, y - H / 2] for x, y in points]
    return {
        "ty": "sh",
        "ks": {
            "a": 0,
            "k": {
                "i": [[0, 0] for _ in verts],
                "o": [[0, 0] for _ in verts],
                "v": verts,
                "c": False,
            },
        },
    }


def stroke(color: str, width: float, cap: int = 2) -> dict:
    return {
        "ty": "st",
        "c": static(hex_rgb(color)),
        "o": static(100),
        "w": static(width),
        "lc": cap,
        "lj": 2,
        "ml": 4,
    }


def group(items: list) -> dict:
    return {
        "ty": "gr",
        "it": items
        + [
            {
                "ty": "tr",
                "p": static([0, 0]),
                "a": static([0, 0]),
                "s": static([100, 100]),
                "r": static(0),
                "o": static(100),
                "sk": static(0),
                "sa": static(0),
            }
        ],
    }


def draw_on(start: int, end: int) -> dict:
    return {
        "ty": "tm",
        "s": animated([(start, 0), (end, 100)]),
        "e": static(100),
        "o": static(0),
        "m": 1,
    }


def compose(name: str, layers: list, op: int) -> dict:
    return {
        "v": "5.7.4",
        "fr": FR,
        "ip": 0,
        "op": op,
        "w": W,
        "h": H,
        "nm": name,
        "ddd": 0,
        "assets": [],
        "layers": layers,
    }


def success() -> dict:
    """A checkmark drawn inside a ring — used to confirm sign-in and saves."""
    op = 72
    ring = shape_layer(
        1,
        "ring",
        [
            group(
                [
                    {
                        "ty": "el",
                        "p": static([0, 0]),
                        "s": static([132, 132]),
                        "nm": "ring",
                    },
                    stroke("#7FBFA0", 9),
                    draw_on(0, 30),
                ]
            )
        ],
        op,
    )
    check = shape_layer(
        2,
        "check",
        [
            group(
                [
                    polyline([(70, 104), (92, 128), (134, 74)]),
                    stroke("#7FBFA0", 13, cap=2),
                    draw_on(16, 46),
                ]
            )
        ],
        op,
    )
    return compose("success", [check, ring], op)


def sparkle() -> dict:
    """A four-point sparkle that pops and fades — used for positive feedback."""
    op = 60
    points = [(100, 46), (112, 88), (154, 100), (112, 112), (100, 154), (88, 112), (46, 100), (88, 88)]
    star = shape_layer(
        1,
        "sparkle",
        [
            {
                "ty": "gr",
                "it": [
                    {
                        "ty": "sh",
                        "ks": {
                            "a": 0,
                            "k": {
                                "i": [[0, 0] for _ in points],
                                "o": [[0, 0] for _ in points],
                                "v": [[x - W / 2, y - H / 2] for x, y in points],
                                "c": True,
                            },
                        },
                    },
                    {
                        "ty": "fl",
                        "c": static(hex_rgb("#E8A87C")),
                        "o": animated([(0, 0), (12, 100), (40, 100), (56, 0)]),
                        "r": 1,
                    },
                    {
                        "ty": "tr",
                        "p": static([0, 0]),
                        "a": static([0, 0]),
                        "s": animated([(0, [20, 20]), (14, [118, 118]), (34, [100, 100]), (56, [88, 88])]),
                        "r": animated([(0, -25), (56, 12)]),
                        "o": static(100),
                        "sk": static(0),
                        "sa": static(0),
                    },
                ],
            }
        ],
        op,
    )
    return compose("sparkle", [star], op)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, builder in (("success", success), ("sparkle", sparkle)):
        path = OUT / f"{name}.json"
        path.write_text(json.dumps(builder(), separators=(",", ":")))
        print(f"wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
