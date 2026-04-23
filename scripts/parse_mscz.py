#!/usr/bin/env python3
"""Parse Canon_in_D.mscz into js/canon_data.js"""
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

MSCZ_PATH = Path("assets/Canon_in_D.mscz")
OUTPUT_PATH = Path("js/canon_data.js")

DURATION_MAP = {
    "measure": 1920,
    "whole": 1920,
    "half": 960,
    "quarter": 480,
    "eighth": 240,
    "16th": 120,
    "32nd": 60,
}

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def midi_to_note_name(midi):
    """Convert MIDI pitch to note name like 'C4', 'F#2'."""
    name = NOTE_NAMES[midi % 12]
    octave = (midi // 12) - 1
    return f"{name}{octave}"


def duration_to_ticks(duration_type, has_dot=False):
    """Convert MuseScore durationType to ticks."""
    base = DURATION_MAP.get(duration_type, 480)
    if has_dot:
        base = int(base * 1.5)
    return base


def parse_mscz(mscz_path):
    """Extract and parse the mscx XML from mscz."""
    with zipfile.ZipFile(mscz_path, "r") as zf:
        mscx_files = [n for n in zf.namelist() if n.endswith(".mscx")]
        if not mscx_files:
            raise ValueError("No .mscx file found in mscz")
        with zf.open(mscx_files[0]) as f:
            tree = ET.parse(f)
    return tree


def extract_sequence(tree):
    """Extract note sequence from parsed mscx."""
    root = tree.getroot()

    # Get Division (ticks per quarter note)
    division_el = root.find(".//Division")
    division = int(division_el.text) if division_el is not None else 480

    # Get tempo (quarters per second)
    tempo_els = root.findall(".//Tempo/tempo")
    tempo = float(tempo_els[0].text) if tempo_els else 1.28333
    bpm = tempo * 60  # convert to beats per minute

    sequence = []

    # Iterate all Staff elements
    for staff in root.findall(".//Staff"):
        staff_tick = 0

        for measure in staff.findall("Measure"):
            measure_tick = 0

            for voice in measure.findall("voice"):
                voice_tick = 0
                for child in voice:
                    tag = child.tag
                    if tag == "Chord":
                        dt_el = child.find("durationType")
                        duration_type = dt_el.text if dt_el is not None else "quarter"
                        has_dot = child.find("dot") is not None
                        ticks = duration_to_ticks(duration_type, has_dot)

                        # Each Chord can contain multiple Notes (simultaneous)
                        notes = child.findall("Note")
                        for note in notes:
                            pitch_el = note.find("pitch")
                            if pitch_el is not None:
                                midi = int(pitch_el.text)
                                note_name = midi_to_note_name(midi)
                                has_key = 41 <= midi <= 64
                                # Store tick-based time for now, convert later
                                sequence.append({
                                    "tick": staff_tick + voice_tick,
                                    "ticks": ticks,
                                    "midi": midi,
                                    "note": note_name,
                                    "hasKey": has_key,
                                })

                        voice_tick += ticks

                    elif tag == "Rest":
                        dt_el = child.find("durationType")
                        duration_type = dt_el.text if dt_el is not None else "quarter"
                        has_dot = child.find("dot") is not None
                        ticks = duration_to_ticks(duration_type, has_dot)
                        voice_tick += ticks

                measure_tick = max(measure_tick, voice_tick)

            staff_tick += measure_tick

    # Convert ticks to ms
    tick_to_ms = (60.0 / bpm) / division * 1000.0

    for item in sequence:
        item["time"] = int(item["tick"] * tick_to_ms)
        item["duration"] = int(item["ticks"] * tick_to_ms)
        del item["tick"]
        del item["ticks"]

    # Sort by time (chords at same time stay together)
    sequence.sort(key=lambda x: x["time"])

    return sequence


def write_js(sequence, output_path):
    """Write sequence as a JS module."""
    lines = [
        "window.PianoApp = window.PianoApp || {};",
        "",
        f"// Auto-generated from Canon_in_D.mscz — {len(sequence)} notes",
        "window.PianoApp.canonSequence = [",
    ]
    for item in sequence:
        lines.append(
            f'  {{ time: {item["time"]}, duration: {item["duration"]}, midi: {item["midi"]}, note: "{item["note"]}", hasKey: {str(item["hasKey"]).lower()} }},'
        )
    lines.append("];")
    lines.append("")

    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(sequence)} notes to {output_path}")


if __name__ == "__main__":
    tree = parse_mscz(MSCZ_PATH)
    sequence = extract_sequence(tree)
    write_js(sequence, OUTPUT_PATH)
