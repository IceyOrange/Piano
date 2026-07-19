#!/usr/bin/env python3
"""Generate low-resolution thumbnails for gallery images.

Thumbnails are saved alongside originals as <name>_thumb.jpg with a long
edge of ~320px. Used by the portfolio filmstrip and gallery grid so the
page doesn't fetch multi-megabyte photos during scroll.
"""
import os
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("Pillow is required. Run: pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
GALLERY_DIR = ROOT / "assets" / "gallery"
THUMB_DIR = ROOT / "assets" / "gallery" / "thumbs"

THUMB_LONG_EDGE = 320
GRID_LONG_EDGE = 900  # higher-quality version for the gallery grid
QUALITY = 78


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def make_thumb(src: Path, dst: Path, long_edge: int):
    with Image.open(src) as im:
        im = im.convert("RGB")
        w, h = im.size
        scale = long_edge / max(w, h)
        if scale < 1:
            im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, "JPEG", quality=QUALITY, optimize=True)


def main():
    ensure_dir(THUMB_DIR)
    film_dir = THUMB_DIR / "filmstrip"
    grid_dir = THUMB_DIR / "grid"
    ensure_dir(film_dir)
    ensure_dir(grid_dir)

    count = 0
    for src in sorted(GALLERY_DIR.iterdir()):
        if src.suffix.lower() not in {".jpg", ".jpeg"}:
            continue
        stem = src.stem
        # Filmstrip thumbs (very small)
        film_dst = film_dir / f"{stem}.jpg"
        if not film_dst.exists():
            make_thumb(src, film_dst, THUMB_LONG_EDGE)
        # Grid thumbs (medium)
        grid_dst = grid_dir / f"{stem}.jpg"
        if not grid_dst.exists():
            make_thumb(src, grid_dst, GRID_LONG_EDGE)
        count += 1

    print(f"Processed {count} photos → {THUMB_DIR}")


if __name__ == "__main__":
    main()
