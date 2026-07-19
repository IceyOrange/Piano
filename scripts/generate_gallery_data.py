#!/usr/bin/env python3
"""Generate js/gallery-data.js from assets/gallery/ images.

Reads dimensions and EXIF DateTimeOriginal (falls back to file mtime).
Parses filename as "desc_location.jpg" (last underscore separates them).
"""
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

try:
    from PIL import Image
    from PIL.ExifTags import TAGS
except ImportError:
    raise SystemExit("Pillow is required. Run: pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
GALLERY_DIR = ROOT / "assets" / "gallery"
OUTPUT = ROOT / "js" / "gallery-data.js"


def exif_date_taken(path: Path):
    try:
        with Image.open(path) as im:
            exif = im._getexif()
            if not exif:
                return None
            for tag_id, value in exif.items():
                if TAGS.get(tag_id) == "DateTimeOriginal":
                    return value
    except Exception:
        pass
    return None


def parse_filename(filename: str):
    """Return (desc, location). Filename format: desc_location.jpg"""
    base = os.path.splitext(filename)[0]
    if "_" in base:
        desc, location = base.rsplit("_", 1)
    else:
        desc, location = base, ""
    return desc.strip(), location.strip()


def parse_date(date_str: str | None, mtime: float):
    if date_str:
        # EXIF format: "2025:12:20 12:34:56"
        try:
            dt = datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S")
            return dt.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            pass
    return datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()


def main():
    if not GALLERY_DIR.exists():
        raise SystemExit(f"Gallery directory not found: {GALLERY_DIR}")

    items = []
    for path in sorted(GALLERY_DIR.iterdir()):
        if path.suffix.lower() not in {".jpg", ".jpeg"}:
            continue

        with Image.open(path) as im:
            width, height = im.size

        desc, location = parse_filename(path.name)
        date_str = exif_date_taken(path)
        mtime = path.stat().st_mtime
        iso_date = parse_date(date_str, mtime)

        items.append({
            "src": f"assets/gallery/{path.name}",
            "thumbFilm": f"assets/gallery/thumbs/filmstrip/{path.name}",
            "thumbGrid": f"assets/gallery/thumbs/grid/{path.name}",
            "desc": desc,
            "location": location,
            "width": width,
            "height": height,
            "date": iso_date,
        })

    # Sort by date descending (newest first)
    items.sort(key=lambda x: x["date"], reverse=True)

    output_text = (
        "window.PianoApp = window.PianoApp || {};\n\n"
        "window.PianoApp.galleryData = "
        + json.dumps(items, ensure_ascii=False, indent=2)
        + ";\n"
    )

    OUTPUT.write_text(output_text, encoding="utf-8")
    print(f"Generated {OUTPUT} with {len(items)} photos.")


if __name__ == "__main__":
    main()
