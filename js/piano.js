window.PianoApp = window.PianoApp || {};

// ─── Piano Key Definitions ───────────────────
// 14 white keys (2 octaves: F2–E4), positions from Figma
const whiteKeys = [
  { note: "F2",  x: 0,         w: 97.7457,   h: 341,       top: 559      },
  { note: "G2",  x: 101.7457,  w: 109.0786,  h: 335,       top: 562      },
  { note: "A2",  x: 214.8243,  w: 107,       h: 338,       top: 560.5    },
  { note: "B2",  x: 325.8243,  w: 107,       h: 336,       top: 561.5    },
  { note: "C3",  x: 436.8243,  w: 108.9537,  h: 338,       top: 560.5    },
  { note: "D3",  x: 549.7780,  w: 103.7824,  h: 333,       top: 563      },
  { note: "E3",  x: 657.5603,  w: 102,       h: 336,       top: 561.5    },
  { note: "F3",  x: 763.5603,  w: 94,        h: 335,       top: 562      },
  { note: "G3",  x: 861.5603,  w: 121,       h: 340,       top: 559.5    },
  { note: "A3",  x: 986.5603,  w: 116.8867,  h: 336,       top: 561.5    },
  { note: "B3",  x: 1107.4470, w: 86,        h: 336,       top: 561.5    },
  { note: "C4",  x: 1197.4470, w: 88,        h: 338,       top: 560.5    },
  { note: "D4",  x: 1289.4470, w: 83.9518,   h: 339.1636,  top: 559.9182 },
  { note: "E4",  x: 1377.3988, w: 59.5,      h: 332.0002,  top: 563.5    },
];

const blackKeys = [
  { note: "F#2", cx: 99.7457,   w: 55 },
  { note: "G#2", cx: 212.8243,  w: 55 },
  { note: "A#2", cx: 323.8243,  w: 55 },
  { note: "C#3", cx: 547.7780,  w: 55 },
  { note: "D#3", cx: 655.5604,  w: 55 },
  { note: "F#3", cx: 859.5603,  w: 55 },
  { note: "G#3", cx: 984.5603,  w: 55 },
  { note: "A#3", cx: 1105.4470, w: 55 },
  { note: "C#4", cx: 1287.4470, w: 55 },
  { note: "D#4", cx: 1375.3988, w: 55 },
];

const blackKeySet = new Set(blackKeys.map((k) => k.note));
function isBlackKey(note) {
  return blackKeySet.has(note);
}

// SVG element IDs from the Figma-exported full-page SVG (semantic note names)
const keyIdMap = {
  "F2": "F2",
  "G2": "G2",
  "A2": "A2",
  "B2": "B2",
  "C3": "C3 with Portfolio",
  "D3": "D3",
  "E3": "E3",
  "F3": "F3",
  "G3": "G3 with Experience",
  "A3": "A3",
  "B3": "B3 with About",
  "C4": "C4",
  "D4": "D4",
  "E4": "E4",
};

// Navigation keys mapped to page links
const navKeys = [
  { note: "C4", label: "portfolio", href: "portfolio.html" },
  { note: "D4", label: "experience", href: "experience.html" },
  { note: "E4", label: "about", href: "about.html" },
];

const navTransitionVariants = {
  "portfolio.html": "slide-left",
  "experience.html": "scale",
  "about.html": "fade",
};

let longPressTimer = null;
let longPressNote = null;

// ─── Render ──────────────────────────────────
window.PianoApp.initPiano = function () {
  const container = document.getElementById("piano-keyboard");
  if (!container) return;

  const svgNS = "http://www.w3.org/2000/svg";

  // Load the full page SVG exported from Figma
  fetch("assets/figma/Piano Landing Page.svg?v=1")
    .then((r) => r.text())
    .then((svgText) => {
      // ─── Visual Layer ────────────────────────
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");
      const visualSvg = doc.documentElement;

      // Crop to keyboard area (y: 559 – 900)
      visualSvg.setAttribute("viewBox", "0 559 1440 341");
      visualSvg.removeAttribute("width");
      visualSvg.removeAttribute("height");
      visualSvg.setAttribute("class", "piano-svg");
      visualSvg.setAttribute("preserveAspectRatio", "xMidYMax meet");

      // Remove background rect so page background shows through
      const bgRect = visualSvg.querySelector('rect[fill="#001A38"]');
      if (bgRect) bgRect.remove();

      // Prevent the visual SVG from intercepting any pointer events
      visualSvg.style.pointerEvents = "none";

      // Make text labels non-interactive
      ["Portfolio", "Experience", "About"].forEach((id) => {
        const el = visualSvg.getElementById(id);
        if (el) el.style.pointerEvents = "none";
      });

      // Tag white-key visuals for hover/press sync
      Object.entries(keyIdMap).forEach(([note, id]) => {
        const el = visualSvg.getElementById(id);
        if (el) {
          el.setAttribute("data-visual-note", note);
          el.classList.add("piano-key-visual");
        }
      });

      container.appendChild(document.importNode(visualSvg, true));

      // ─── Interaction Layer ───────────────────
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", "0 0 1440 341");
      svg.setAttribute("preserveAspectRatio", "xMidYMax meet");
      svg.setAttribute("class", "piano-svg piano-interaction-layer");

      const content = document.createElementNS(svgNS, "g");
      content.setAttribute("transform", "translate(0, -559)");

      // White key hit areas
      whiteKeys.forEach((k) => {
        const g = document.createElementNS(svgNS, "g");
        g.setAttribute("class", "piano-key-group");
        g.setAttribute("data-note", k.note);
        g.setAttribute("data-key-type", "white");
        g.setAttribute("transform", `translate(${k.x}, ${k.top})`);
        g.style.pointerEvents = "auto";

        const hit = document.createElementNS(svgNS, "rect");
        hit.setAttribute("width", k.w);
        hit.setAttribute("height", k.h);
        hit.setAttribute("fill", "transparent");
        g.appendChild(hit);

        content.appendChild(g);
      });

      // Black key hit areas
      blackKeys.forEach((k) => {
        const g = document.createElementNS(svgNS, "g");
        g.setAttribute("class", "piano-key-group");
        g.setAttribute("data-note", k.note);
        g.setAttribute("data-key-type", "black");
        g.setAttribute("transform", `translate(${k.cx - k.w / 2}, 680)`);
        g.style.pointerEvents = "auto";

        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("width", k.w);
        rect.setAttribute("height", 220);
        rect.setAttribute("fill", "transparent");
        g.appendChild(rect);

        content.appendChild(g);
      });

      svg.appendChild(content);
      container.appendChild(svg);

      // ─── Interactions ────────────────────────
      const liveVisualSvg = container.querySelector(".piano-svg:not(.piano-interaction-layer)");

      function getVisualEl(note) {
        if (!liveVisualSvg) return null;
        const id = keyIdMap[note];
        if (!id) return null;
        return liveVisualSvg.getElementById(id);
      }

      let pressedNote = null;

      function setVisualState(note, state, active) {
        const visual = getVisualEl(note);
        if (!visual) return;
        if (active) {
          visual.classList.add(state);
        } else {
          visual.classList.remove(state);
        }
      }

      function handleDown(note) {
        const nav = navKeys.find((n) => n.note === note);
        const group = svg.querySelector(`[data-note="${note}"]`);
        if (group && !isBlackKey(note)) group.classList.add("pressed");
        setVisualState(note, "pressed", true);

        if (nav) {
          longPressNote = note;
          window.PianoApp.playNote(note);
          longPressTimer = setTimeout(() => {
            longPressTimer = null;
            longPressNote = null;
            if (group) group.classList.remove("pressed");
            setVisualState(note, "pressed", false);
            window.PianoApp.navigateWithTransition(
              nav.href,
              navTransitionVariants[nav.href] || "fade"
            );
          }, 3000);
          return;
        }

        pressedNote = note;
        window.PianoApp.playNote(note);
      }

      function handleUp(note) {
        const nav = navKeys.find((n) => n.note === note);
        if (nav) {
          if (longPressTimer && longPressNote === note) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            longPressNote = null;
          }
          const group = svg.querySelector(`[data-note="${note}"]`);
          if (group && !isBlackKey(note)) group.classList.remove("pressed");
          setVisualState(note, "pressed", false);
          return;
        }
        const group = svg.querySelector(`[data-note="${note}"]`);
        if (group && !isBlackKey(note)) group.classList.remove("pressed");
        setVisualState(note, "pressed", false);
        pressedNote = null;
      }

      function handleLeave() {
        if (!pressedNote && !longPressNote) return;
        const nav = navKeys.find((n) => n.note === (pressedNote || longPressNote));
        if (nav) {
          if (longPressTimer && longPressNote === nav.note) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            longPressNote = null;
          }
          const group = svg.querySelector(`[data-note="${nav.note}"]`);
          if (group && !isBlackKey(nav.note)) group.classList.remove("pressed");
          setVisualState(nav.note, "pressed", false);
          return;
        }
        if (!pressedNote) return;
        const group = svg.querySelector(`[data-note="${pressedNote}"]`);
        if (group && !isBlackKey(pressedNote)) group.classList.remove("pressed");
        setVisualState(pressedNote, "pressed", false);
        pressedNote = null;
      }

      [...whiteKeys, ...blackKeys].forEach((k) => {
        const group = svg.querySelector(`[data-note="${k.note}"]`);
        if (!group) return;

        group.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          handleDown(k.note);
        });
        group.addEventListener("pointerup", (e) => {
          e.preventDefault();
          handleUp(k.note);
        });
        group.addEventListener("pointerleave", handleLeave);
        group.addEventListener("pointerenter", () => {
          setVisualState(k.note, "hover", true);
        });
        group.addEventListener("pointerleave", () => {
          setVisualState(k.note, "hover", false);
        });
      });

      container.addEventListener("contextmenu", (e) => e.preventDefault());

      // ─── Auto-play Visual Helpers ──────────────────
      window.PianoApp.pressKeyVisual = function (note) {
        const group = svg.querySelector(`[data-note="${note}"]`);
        if (group && !isBlackKey(note)) group.classList.add("pressed");
        setVisualState(note, "pressed", true);
      };

      window.PianoApp.releaseKeyVisual = function (note) {
        const group = svg.querySelector(`[data-note="${note}"]`);
        if (group && !isBlackKey(note)) group.classList.remove("pressed");
        setVisualState(note, "pressed", false);
      };

      window.PianoApp.releaseAllKeysVisual = function () {
        whiteKeys.forEach((k) => window.PianoApp.releaseKeyVisual(k.note));
        blackKeys.forEach((k) => window.PianoApp.releaseKeyVisual(k.note));
      };

      // ─── Cat Click ─────────────────────────────────
      const ohCat = liveVisualSvg.getElementById("Oh Cat!");
      if (ohCat) {
        ohCat.style.cursor = "pointer";
        ohCat.style.pointerEvents = "auto";
        ohCat.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.PianoApp.Sequencer.toggle();
        });
      }

      // ─── Keyboard Chord Mapping ──────────────────
      const keyboardChords = {
        c: { major: ["C3", "E3", "G3"], minor: ["C3", "D#3", "G3"] },
        d: { major: ["D3", "F#3", "A3"], minor: ["D3", "F3", "A3"] },
        e: { major: ["E3", "G#3", "B3"], minor: ["E3", "G3", "B3"] },
        f: { major: ["F3", "A3", "C4"], minor: ["F3", "G#3", "C4"] },
        g: { major: ["G3", "B3", "D4"], minor: ["G3", "A#3", "D4"] },
        a: { major: ["A3", "C#4", "E4"], minor: ["A3", "C4", "E4"] },
        b: { major: ["B2", "D#3", "F#3"], minor: ["B2", "D3", "F#3"] },
      };

      const activeKeyboardChords = new Map();

      function playChordNotes(notes) {
        notes.forEach((note) => {
          window.PianoApp.playNote(note);
          const group = svg.querySelector(`[data-note="${note}"]`);
          if (group && !isBlackKey(note)) group.classList.add("pressed");
          setVisualState(note, "pressed", true);
        });
      }

      function releaseChordNotes(notes) {
        notes.forEach((note) => {
          const group = svg.querySelector(`[data-note="${note}"]`);
          if (group && !isBlackKey(note)) group.classList.remove("pressed");
          setVisualState(note, "pressed", false);
        });
      }

      document.addEventListener("keydown", (e) => {
        if (e.repeat) return;
        const key = e.key.toLowerCase();
        const chordDef = keyboardChords[key];
        if (!chordDef) return;
        if (activeKeyboardChords.has(key)) return;
        e.preventDefault();
        const notes = e.shiftKey ? chordDef.minor : chordDef.major;
        activeKeyboardChords.set(key, notes);
        playChordNotes(notes);
      });

      document.addEventListener("keyup", (e) => {
        const key = e.key.toLowerCase();
        if (!activeKeyboardChords.has(key)) return;
        const notes = activeKeyboardChords.get(key);
        activeKeyboardChords.delete(key);
        releaseChordNotes(notes);
      });
    })
    .catch((err) => {
      console.error("Failed to load keyboard SVG:", err);
    });
};
