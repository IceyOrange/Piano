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

// Navigation keys loaded from data.js
function getNavKeys() {
  return (window.PianoApp.data && window.PianoApp.data.navMappings && window.PianoApp.data.navMappings.keys) || [];
}
function getNavVariants() {
  return (window.PianoApp.data && window.PianoApp.data.navMappings && window.PianoApp.data.navMappings.variants) || {};
}

const LONG_PRESS_DURATION = 2000;
const PREVIEW_ANIMATION_DURATION = LONG_PRESS_DURATION - 500;

const navKeyAnimations = {
  "C3": { svg: "assets/images/Guitar.svg", size: 76 },
  "G3": { svg: "assets/images/BeatlesWalking.svg", size: 140 },
  "B3": { svg: "assets/images/Drum.svg", size: 90 },
};

let longPressTimer = null;
let longPressNote = null;
let previewState = null;
const svgCache = {};

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
      visualSvg.setAttribute("viewBox", "0 559 1452 341");
      visualSvg.removeAttribute("width");
      visualSvg.removeAttribute("height");
      visualSvg.setAttribute("class", "piano-svg piano-visual");
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

      // Isolate elements above the keyboard into a separate overlay SVG.
      // The keyboard visual SVG re-renders on every key press (opacity/transform),
      // which causes the entire texture to repaint and makes the staff/text flicker.
      // Moving them to a sibling SVG with the same viewBox keeps pixel-perfect
      // alignment while fully decoupling them from keyboard animations.
      const overlaySvg = document.createElementNS(svgNS, "svg");
      overlaySvg.setAttribute("viewBox", "0 559 1452 341");
      overlaySvg.setAttribute("preserveAspectRatio", "xMidYMax meet");
      overlaySvg.setAttribute("class", "piano-svg");
      overlaySvg.style.cssText = "position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:10;overflow:visible;transform:translateZ(0);will-change:transform;";

      const navTextMap = {
        "C3": "Portfolio",
        "G3": "Experience",
        "B3": "About",
      };

      ["Staff of Kimi with cat", "Oh Cat!", "Portfolio", "Experience", "About"].forEach((id) => {
        const el = visualSvg.getElementById(id);
        if (el) {
          if (["Portfolio", "Experience", "About"].includes(id)) {
            el.classList.add("piano-key-visual");
          }
          overlaySvg.appendChild(el);
        }
      });

      // Move the hint text group to overlaySvg as well — it lives above the
      // keyboard viewBox crop (y < 559) so it would be clipped in visualSvg.
      const hintEl = visualSvg.querySelector('g[id*="Click the Cat"]');
      if (hintEl) {
        overlaySvg.appendChild(hintEl);
      }

      container.style.position = "relative";
      container.insertBefore(overlaySvg, container.firstChild);

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
      svg.setAttribute("viewBox", "0 0 1452 341");
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

      // Cache key element references to avoid repeated querySelector
      const keyElements = new Map();
      [...whiteKeys, ...blackKeys].forEach(k => {
        const el = svg.querySelector(`[data-note="${k.note}"]`);
        if (el) keyElements.set(k.note, el);
      });

      // ─── Interactions ────────────────────────
      const existingVisualSvg = container.querySelector(".piano-svg.piano-visual");

      function getVisualEl(note) {
        if (!existingVisualSvg) return null;
        const id = keyIdMap[note];
        if (!id) return null;
        return existingVisualSvg.getElementById(id);
      }

      let pressedNote = null;

      function isLightColor(hex) {
        const normalized = hex.replace("#", "");
        const r = parseInt(normalized.substring(0, 2), 16);
        const g = parseInt(normalized.substring(2, 4), 16);
        const b = parseInt(normalized.substring(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5;
      }

      function startPreviewAnimation(note) {
        const config = navKeyAnimations[note];
        if (!config) return;

        previewState = { note, cancelled: false, timeouts: [], container: null };

        const container = document.getElementById("piano-keyboard");
        const key = whiteKeys.find((k) => k.note === note);
        if (!key || !container) return;

        const centerX = key.x + key.w / 2;
        const leftPct = (centerX / 1440) * 100;

        const animContainer = document.createElement("div");
        animContainer.className = "key-preview-animation";
        animContainer.style.left = `${leftPct}%`;
        animContainer.dataset.note = note;
        container.appendChild(animContainer);
        previewState.container = animContainer;

        function applySvgText(svgText) {
            if (!previewState || previewState.cancelled || previewState.note !== note) return;

            const parser = new DOMParser();
            const doc = parser.parseFromString(svgText, "image/svg+xml");
            const svg = doc.documentElement;

            svg.setAttribute("width", String(config.size));
            svg.removeAttribute("height");
            svg.style.display = "block";

            const vb = svg.getAttribute("viewBox");
            if (!vb) {
              const w = parseFloat(svg.getAttribute("width")) || config.size;
              const h = parseFloat(svg.getAttribute("height")) || config.size;
              svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
            }

            function getPathCenter(path) {
              const d = path.getAttribute("d") || "";
              const nums = d.match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g)?.map(Number) || [];
              const xs = nums.filter((_, i) => i % 2 === 0);
              const ys = nums.filter((_, i) => i % 2 === 1);
              if (xs.length === 0) return null;
              return {
                cx: (Math.min(...xs) + Math.max(...xs)) / 2,
                cy: (Math.min(...ys) + Math.max(...ys)) / 2,
              };
            }

            const paths = svg.querySelectorAll("path");
            const totalPaths = paths.length;
            if (totalPaths === 0) return;

            const overlap = 0.3;
            const staggerDelay = (PREVIEW_ANIMATION_DURATION * (1 - overlap)) / Math.max(totalPaths - 1, 1);
            const duration = PREVIEW_ANIMATION_DURATION * overlap * 2;

            const fillPaths = [];
            const strokePaths = [];
            const opacityPaths = [];

            paths.forEach((path) => {
              const hasStroke = path.getAttribute("stroke") && path.getAttribute("stroke") !== "none";
              const fillAttr = path.getAttribute("fill");
              const hasFill = fillAttr && fillAttr !== "none" && fillAttr !== "white";

              if (hasStroke) {
                strokePaths.push(path);
              } else if (hasFill) {
                fillPaths.push(path);
              } else {
                opacityPaths.push(path);
              }
            });

            // Sort fill paths bottom-to-top by vertical center
            fillPaths.sort((a, b) => {
              const ca = getPathCenter(a);
              const cb = getPathCenter(b);
              return (cb?.cy ?? 0) - (ca?.cy ?? 0);
            });

            // Stroke paths: line-drawing animation
            strokePaths.forEach((path, i) => {
              path.style.setProperty("--anim-duration", `${duration}ms`);
              path.setAttribute("data-anim-type", "stroke");
              try {
                const length = path.getTotalLength();
                path.style.strokeDasharray = String(length);
                path.style.strokeDashoffset = String(length);
                path.style.transition = `stroke-dashoffset ${duration}ms linear`;
              } catch (e) {
                path.style.opacity = "0";
                path.style.transition = `opacity ${duration}ms ease`;
              }

              const timeout = setTimeout(() => {
                if (!previewState || previewState.cancelled) return;
                const animType = path.getAttribute("data-anim-type");
                if (animType === "stroke") {
                  path.style.strokeDashoffset = "0";
                } else {
                  path.style.opacity = "1";
                }
              }, i * staggerDelay);
              previewState.timeouts.push(timeout);
            });

            // Fill paths: fade in bottom-to-top
            const fillDuration = 200;
            const fillStagger = (PREVIEW_ANIMATION_DURATION - fillDuration) / Math.max(fillPaths.length - 1, 1);
            fillPaths.forEach((path, i) => {
              path.setAttribute("data-anim-type", "fill");
              path.style.transition = `opacity ${fillDuration}ms ease`;
              const timeout = setTimeout(() => {
                if (!previewState || previewState.cancelled) return;
                path.classList.add("revealed");
              }, i * fillStagger);
              previewState.timeouts.push(timeout);
            });

            // Opacity fallback paths
            opacityPaths.forEach((path, i) => {
              path.style.opacity = "0";
              path.style.transition = `opacity ${duration}ms ease`;
              const timeout = setTimeout(() => {
                if (!previewState || previewState.cancelled) return;
                path.style.opacity = "1";
              }, i * staggerDelay);
              previewState.timeouts.push(timeout);
            });

            animContainer.appendChild(svg);
        }

        if (svgCache[config.svg]) {
          applySvgText(svgCache[config.svg]);
        } else {
          fetch(config.svg)
            .then((r) => r.text())
            .then((text) => {
              svgCache[config.svg] = text;
              applySvgText(text);
            });
        }
      }

      function cancelPreviewAnimation() {
        if (!previewState) return;

        previewState.cancelled = true;
        previewState.timeouts.forEach(clearTimeout);

        const container = previewState.container;
        if (container) {
          container.style.opacity = "0";
          setTimeout(() => {
            if (container.parentNode) container.parentNode.removeChild(container);
          }, 120);
        }

        previewState = null;
      }

      function setVisualState(note, state, active) {
        const visual = getVisualEl(note);
        if (visual) {
          if (active) visual.classList.add(state);
          else visual.classList.remove(state);
        }

        const textId = navTextMap[note];
        if (textId && overlaySvg) {
          const textEl = overlaySvg.getElementById(textId);
          if (textEl) {
            if (active) textEl.classList.add(state);
            else textEl.classList.remove(state);
          }
        }
      }

      function handleDown(note) {
        const nav = getNavKeys().find((n) => n.note === note);
        const group = keyElements.get(note);
        if (group && !isBlackKey(note)) group.classList.add("pressed");
        setVisualState(note, "pressed", true);

        if (nav) {
          longPressNote = note;
          window.PianoApp.playNote(note);
          startPreviewAnimation(note);
          // Prefetch target page while preview animates
          const prefetchLink = document.createElement('link');
          prefetchLink.rel = 'prefetch';
          prefetchLink.href = nav.href;
          document.head.appendChild(prefetchLink);
          // Preload heavy assets for target page after 0.5s
          setTimeout(() => {
            if (nav.href === 'experience.html') {
              const img = new Image();
              img.src = 'assets/images/ChinaMap.svg';
            }
          }, 500);
          longPressTimer = setTimeout(() => {
            longPressTimer = null;
            longPressNote = null;
            if (group) group.classList.remove("pressed");
            setVisualState(note, "pressed", false);
            cancelPreviewAnimation();
            window.PianoApp.navigateWithTransition(
              nav.href,
              getNavVariants()[nav.href] || "fade",
              group ? (() => { const r = group.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })() : null
            );
          }, LONG_PRESS_DURATION);
          return;
        }

        pressedNote = note;
        window.PianoApp.playNote(note);
      }

      function handleUp(note) {
        const nav = getNavKeys().find((n) => n.note === note);
        if (nav) {
          if (longPressTimer && longPressNote === note) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            longPressNote = null;
          }
          cancelPreviewAnimation();
          const group = keyElements.get(note);
          if (group && !isBlackKey(note)) group.classList.remove("pressed");
          setVisualState(note, "pressed", false);
          return;
        }
        const group = keyElements.get(note);
        if (group && !isBlackKey(note)) group.classList.remove("pressed");
        setVisualState(note, "pressed", false);
        pressedNote = null;
      }

      function handleLeave() {
        if (!pressedNote && !longPressNote) return;
        const nav = getNavKeys().find((n) => n.note === (pressedNote || longPressNote));
        if (nav) {
          if (longPressTimer && longPressNote === nav.note) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            longPressNote = null;
          }
          cancelPreviewAnimation();
          const group = keyElements.get(nav.note);
          if (group && !isBlackKey(nav.note)) group.classList.remove("pressed");
          setVisualState(nav.note, "pressed", false);
          return;
        }
        if (!pressedNote) return;
        const group = keyElements.get(pressedNote);
        if (group && !isBlackKey(pressedNote)) group.classList.remove("pressed");
        setVisualState(pressedNote, "pressed", false);
        pressedNote = null;
      }

      [...whiteKeys, ...blackKeys].forEach((k) => {
        const group = keyElements.get(k.note);
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
        const group = keyElements.get(note);
        if (group && !isBlackKey(note)) group.classList.add("pressed");
        setVisualState(note, "pressed", true);
      };

      window.PianoApp.releaseKeyVisual = function (note) {
        const group = keyElements.get(note);
        if (group && !isBlackKey(note)) group.classList.remove("pressed");
        setVisualState(note, "pressed", false);
      };

      window.PianoApp.releaseAllKeysVisual = function () {
        whiteKeys.forEach((k) => window.PianoApp.releaseKeyVisual(k.note));
        blackKeys.forEach((k) => window.PianoApp.releaseKeyVisual(k.note));
      };

      // ─── Cat Click ─────────────────────────────────
      // Oh Cat! was moved to overlaySvg (line ~143) to prevent keyboard
      // animation repaints from making the staff/text flicker.
      const ohCat = overlaySvg.getElementById("Oh Cat!");
      if (ohCat) {
        ohCat.style.cursor = "pointer";
        ohCat.style.pointerEvents = "auto";
        ohCat.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.PianoApp.Sequencer.toggle();
        });
      }

      // ─── Cat Eye Tracking & Vinyl Cursor ───────────
      // LeftEye/RightEye are children of "Staff of Kimi with cat",
      // which was moved to overlaySvg above.
      const leftEye = overlaySvg.getElementById("LeftEye");
      const rightEye = overlaySvg.getElementById("RightEye");

      if (ohCat && leftEye && rightEye) {
        const maxOffset = 2.5;

        function getEyeCenter(eye) {
          const bbox = eye.getBBox();
          return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
        }

        const leftCenter = getEyeCenter(leftEye);
        const rightCenter = getEyeCenter(rightEye);

        function updateEye(eye, center, mouseX, mouseY) {
          const dx = mouseX - center.x;
          const dy = mouseY - center.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const r = Math.min(dist / 15, maxOffset);
          const ox = Math.cos(angle) * r;
          const oy = Math.sin(angle) * r;
          eye.style.transform = `translate(${ox}px, ${oy}px)`;
          eye.style.transformOrigin = `${center.x}px ${center.y}px`;
        }

        document.addEventListener("mousemove", (e) => {
          const pt = existingVisualSvg.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const svgP = pt.matrixTransform(existingVisualSvg.getScreenCTM().inverse());
          updateEye(leftEye, leftCenter, svgP.x, svgP.y);
          updateEye(rightEye, rightCenter, svgP.x, svgP.y);
        });

        // ─── Shared Vinyl Cursor ─────────────────
        const vinylCursor = document.createElement("div");
        vinylCursor.className = "vinyl-cursor";
        vinylCursor.style.cssText = `
          position: fixed;
          width: 44px;
          height: 44px;
          pointer-events: none;
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.15s ease;
          transform: translate(-50%, -50%);
        `;

        fetch("assets/images/Player.svg?v=3")
          .then((r) => r.text())
          .then((svgText) => {
            const p = new DOMParser();
            const d = p.parseFromString(svgText, "image/svg+xml");
            const s = d.documentElement;
            s.setAttribute("width", "44");
            s.setAttribute("height", "44");
            s.style.width = "100%";
            s.style.height = "100%";
            s.style.display = "block";
            s.style.animation = "vinylSpin 2.5s linear infinite";
            vinylCursor.appendChild(document.importNode(s, true));
          })
          .catch(() => {
            vinylCursor.innerHTML = `<div style="width:100%;height:100%;border-radius:50%;background:#222;border:2px solid #F5F0E6;"></div>`;
          });

        document.body.appendChild(vinylCursor);

        window.PianoApp.vinylCursor = vinylCursor;
        window.PianoApp.vinylCursorState = { catHover: false, playingCanon: false };
        window.PianoApp.updateVinylCursor = function () {
          const s = window.PianoApp.vinylCursorState;
          const show = s.catHover || s.playingCanon;
          if (ohCat) ohCat.style.cursor = show ? "none" : "pointer";
          if (vinylCursor) vinylCursor.style.opacity = show ? "1" : "0";
          document.body.classList.toggle("vinyl-cursor-active", show);
          const svgEl = vinylCursor ? vinylCursor.querySelector("svg") : null;
          if (svgEl) {
            svgEl.style.animationPlayState = s.playingCanon ? "running" : "paused";
          }
        };

        document.addEventListener("mousemove", (e) => {
          if (vinylCursor) {
            vinylCursor.style.left = e.clientX + "px";
            vinylCursor.style.top = e.clientY + "px";
          }
        });

        ohCat.addEventListener("mouseenter", () => {
          window.PianoApp.vinylCursorState.catHover = true;
          window.PianoApp.updateVinylCursor();
        });

        ohCat.addEventListener("mouseleave", () => {
          window.PianoApp.vinylCursorState.catHover = false;
          window.PianoApp.updateVinylCursor();
        });
      }

      // ─── Keyboard Note Mapping (1–7) ─────────────
      const keyboardNotes = {
        "1": { base: "C3", shift: "C4" },
        "2": { base: "D3", shift: "D4" },
        "3": { base: "E3", shift: "E4" },
        "4": { base: "F3", shift: "F4" },
        "5": { base: "G3", shift: "G4" },
        "6": { base: "A3", shift: "A4" },
        "7": { base: "B3", shift: "B4" },
      };
      const activeKeyboardNotes = new Map();

      function pressNote(note) {
        window.PianoApp.playNote(note);
        const group = keyElements.get(note);
        if (group && !isBlackKey(note)) group.classList.add("pressed");
        setVisualState(note, "pressed", true);
      }

      function releaseNote(note) {
        const group = keyElements.get(note);
        if (group && !isBlackKey(note)) group.classList.remove("pressed");
        setVisualState(note, "pressed", false);
      }

      // ─── Keyboard Chord Mapping ──────────────────
      const keyboardChords = {
        c: { major: ["C3", "E3", "G3"], minor: ["C3", "D#3", "G3"] },
        d: { major: ["D3", "F#3", "A3"], minor: ["D3", "F3", "A3"] },
        e: { major: ["E3", "G#3", "B3"], minor: ["E3", "G3", "B3"] },
        f: { major: ["F3", "A3", "C4"], minor: ["F3", "G#3", "C4"] },
        g: { major: ["G3", "B3", "D4"], minor: ["G3", "A#3", "D4"] },
        a: { major: ["A3", "C#4", "E4"], minor: ["A3", "C4", "E4"] },
        b: { major: ["B3", "D#4", "F#4"], minor: ["B3", "D4", "F#4"] },
      };

      const activeKeyboardChords = new Map();

      function playChordNotes(notes) {
        notes.forEach((note) => {
          pressNote(note);
        });
      }

      function releaseChordNotes(notes) {
        notes.forEach((note) => {
          releaseNote(note);
        });
      }

      document.addEventListener("keydown", (e) => {
        if (e.repeat) return;

        // Number keys (1–7) — use e.code so Shift doesn't change the identifier
        const digitMatch = e.code.match(/^Digit([1-7])$/);
        if (digitMatch) {
          const digit = digitMatch[1];
          if (activeKeyboardNotes.has(digit)) return;
          e.preventDefault();
          const noteDef = keyboardNotes[digit];
          const note = e.shiftKey ? noteDef.shift : noteDef.base;
          activeKeyboardNotes.set(digit, note);
          pressNote(note);
          return;
        }

        // Letter chord keys (a–g)
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
        // Number keys (1–7)
        const digitMatch = e.code.match(/^Digit([1-7])$/);
        if (digitMatch) {
          const digit = digitMatch[1];
          if (!activeKeyboardNotes.has(digit)) return;
          const note = activeKeyboardNotes.get(digit);
          activeKeyboardNotes.delete(digit);
          releaseNote(note);
          return;
        }

        // Letter chord keys (a–g)
        const chordKey = e.key.toLowerCase();
        if (!activeKeyboardChords.has(chordKey)) return;
        const notes = activeKeyboardChords.get(chordKey);
        activeKeyboardChords.delete(chordKey);
        releaseChordNotes(notes);
      });
    })
    .catch((err) => {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.error("Failed to load keyboard SVG:", err);
      }
    });

  // Preload nav key SVGs
  Object.entries(navKeyAnimations).forEach(([, config]) => {
    fetch(config.svg)
      .then((r) => r.text())
      .then((text) => { svgCache[config.svg] = text; });
  });
};
