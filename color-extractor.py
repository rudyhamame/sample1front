#!/usr/bin/env python
from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path

from PIL import Image

MARKER_START = "/* COLOR EXTRACTOR PALETTE */"
MARKER_END = "/* END COLOR EXTRACTOR PALETTE */"


def _to_hex(color: tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*color)


def _mix(color: tuple[int, int, int], target: tuple[int, int, int], factor: float) -> tuple[int, int, int]:
    return tuple(
        max(0, min(255, int(round(c + (t - c) * factor))))
        for c, t in zip(color, target)
    )


def _relative_luminance(color: tuple[int, int, int]) -> float:
    def linearize(channel: float) -> float:
        channel = channel / 255
        return channel / 12.92 if channel <= 0.03928 else ((channel + 0.055) / 1.055) ** 2.4

    r, g, b = color
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)


def _contrast_text_color(color: tuple[int, int, int]) -> str:
    lum = _relative_luminance(color)
    return "#000000" if lum > 0.55 else "#ffffff"


def extract_palette(image_path: Path, palette_size: int = 3) -> dict[str, str]:
    image = Image.open(image_path).convert("RGB")
    image = image.resize((320, 320), Image.LANCZOS)
    pixels = list(image.getdata())

    step = 16
    bucket: Counter[tuple[int, int, int]] = Counter()
    for r, g, b in pixels[::8]:
        bucket[(r // step * step, g // step * step, b // step * step)] += 1

    top_colors = [color for color, _ in bucket.most_common(palette_size)]
    if not top_colors:
        top_colors = [(240, 240, 240)]

    primary = top_colors[0]
    secondary = top_colors[1] if len(top_colors) > 1 else primary
    accent_base = top_colors[2] if len(top_colors) > 2 else secondary

    palette = {
        "dominant": _to_hex(primary),
        "soft": _to_hex(_mix(primary, (255, 255, 255), 0.7)),
        "accent": _to_hex(_mix(accent_base, (255, 255, 255), 0.45)),
        "text": _contrast_text_color(primary),
    }

    return palette


def _build_block(palette: dict[str, str]) -> str:
    return (
        f"{MARKER_START}\n"
        ":root {\n"
        f"  --home-main-wrapper-dominant: {palette['dominant']};\n"
        f"  --home-main-wrapper-soft: {palette['soft']};\n"
        f"  --home-main-wrapper-accent: {palette['accent']};\n"
        f"  --home-main-wrapper-text: {palette['text']};\n"
        "}\n"
        f"{MARKER_END}\n"
    )


def inject_palette(css_path: Path, block: str) -> None:
    if not css_path.exists():
        raise FileNotFoundError(f"CSS file not found at {css_path}")

    css_content = css_path.read_text(encoding="utf-8")

    start = css_content.find(MARKER_START)
    end = css_content.find(MARKER_END)
    if start != -1 and end != -1:
        end += len(MARKER_END)
        css_content = css_content[:start] + block + css_content[end:]
    else:
        css_content = f"{block}\n{css_content}"

    css_path.write_text(css_content, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a palette from the home background and inject it into home.css",
    )
    parser.add_argument(
        "--image",
        type=Path,
        default=Path("public/img/brushstroke-texture-modern-design.jpg"),
        help="Background image that represents the Home_main_wrapper",
    )
    parser.add_argument(
        "--css",
        type=Path,
        default=Path("src/home.css"),
        help="CSS file to update with the computed palette",
    )

    args = parser.parse_args()
    base = Path(__file__).resolve().parent
    image_path = (base / args.image).resolve()
    css_path = (base / args.css).resolve()

    if not image_path.exists():
        raise FileNotFoundError(f"Image not found at {image_path}")

    palette = extract_palette(image_path)
    block = _build_block(palette)
    inject_palette(css_path, block)

    print("Palette injected:")
    for name, color in palette.items():
        print(f"  {name}: {color}")


if __name__ == "__main__":
    main()
