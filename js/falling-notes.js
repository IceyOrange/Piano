window.PianoApp = window.PianoApp || {};

window.PianoApp.FallingNotes = (function () {
  // Key geometry in SVG coordinate space (mirrors piano.js to avoid tight coupling)
  var SVG_W = 1452;
  var WHITES = [
    { note: "F2",  x: 0,         w: 97.7457 },
    { note: "G2",  x: 101.7457,  w: 109.0786 },
    { note: "A2",  x: 214.8243,  w: 107 },
    { note: "B2",  x: 325.8243,  w: 107 },
    { note: "C3",  x: 436.8243,  w: 108.9537 },
    { note: "D3",  x: 549.7780,  w: 103.7824 },
    { note: "E3",  x: 657.5603,  w: 102 },
    { note: "F3",  x: 763.5603,  w: 94 },
    { note: "G3",  x: 861.5603,  w: 121 },
    { note: "A3",  x: 986.5603,  w: 116.8867 },
    { note: "B3",  x: 1107.4470, w: 86 },
    { note: "C4",  x: 1197.4470, w: 88 },
    { note: "D4",  x: 1289.4470, w: 83.9518 },
    { note: "E4",  x: 1377.3988, w: 59.5 },
  ];
  var BLACKS = [
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

  var noteGeo = {};
  var bars = [];
  var canvas = null;
  var ctx = null;
  var rafId = null;
  var active = false;
  var resizeHandler = null;
  var LOOK_AHEAD = 2200;

  // Cached layout
  var kbL = 0, kbW = 0, kbTop = 0;
  var cssW = 0, cssH = 0;

  // Track info for center display
  var trackTitle = "";
  var trackArtist = "";

  function buildGeo() {
    noteGeo = {};
    WHITES.forEach(function (k) {
      noteGeo[k.note] = { x: k.x / SVG_W, w: k.w / SVG_W, black: false };
    });
    BLACKS.forEach(function (k) {
      noteGeo[k.note] = { x: (k.cx - k.w / 2) / SVG_W, w: k.w / SVG_W, black: true };
    });
  }

  function measure() {
    var container = document.getElementById("piano-keyboard");
    if (!container) {
      cssW = window.innerWidth;
      cssH = window.innerHeight * 0.55;
    } else {
      var svg = container.querySelector(".piano-svg");
      var r = svg ? svg.getBoundingClientRect() : container.getBoundingClientRect();
      kbL = r.left;
      kbW = r.width;
      kbTop = r.top;
      cssW = window.innerWidth;
      cssH = kbTop > 80 ? kbTop : window.innerHeight * 0.55;
    }

    var dpr = window.devicePixelRatio || 1;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function start(rec, opts) {
    if (active) stop();
    if (!rec || !rec.ev || rec.ev.length === 0) return;

    trackTitle = (opts && opts.title) || "";
    trackArtist = (opts && opts.artist) || "";

    canvas = document.createElement("canvas");
    canvas.className = "falling-notes-canvas";
    canvas.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;z-index:1005;";
    ctx = canvas.getContext("2d");
    document.body.appendChild(canvas);

    measure();

    // Pre-compute note bars
    bars = [];
    var events = rec.ev;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.v <= 0) continue;
      var geo = noteGeo[ev.n];
      if (!geo) continue;

      var endD = ev.d + 180;
      for (var j = i + 1; j < events.length; j++) {
        if (events[j].n === ev.n && events[j].v === 0) {
          endD = events[j].d;
          break;
        }
      }
      bars.push({ startD: ev.d, endD: endD, geo: geo });
    }

    active = true;
    rafId = requestAnimationFrame(draw);

    resizeHandler = function () {
      if (active) measure();
      // Let community.js know to reposition its now-playing bar
      if (window.PianoApp.Community && window.PianoApp.Community._repositionNP) {
        window.PianoApp.Community._repositionNP();
      }
    };
    window.addEventListener("resize", resizeHandler);
  }

  function stop() {
    active = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null;
    ctx = null;
    bars = [];
    trackTitle = "";
    trackArtist = "";
  }

  function draw() {
    if (!active || !ctx) return;

    var elapsed = window.PianoApp.Playback
      ? window.PianoApp.Playback.getElapsedMs()
      : 0;
    ctx.clearRect(0, 0, cssW, cssH);

    var fallH = cssH;
    var cx = cssW / 2;
    var cy = fallH * 0.4;

    // ── Aurora background ──
    drawAurora(elapsed, cx, cy, fallH);

    // ── Center vinyl disc ──
    drawVinyl(elapsed, cx, cy);

    // ── Track info ──
    drawTrackInfo(cx, cy);

    // ── Falling note bars ──
    for (var i = 0; i < bars.length; i++) {
      var bar = bars[i];
      var tStart = bar.startD - elapsed;
      var tEnd = bar.endD - elapsed;

      if (tEnd < -300 || tStart > LOOK_AHEAD) continue;

      var bottomY = fallH * (1 - tStart / LOOK_AHEAD);
      var topY = fallH * (1 - tEnd / LOOK_AHEAD);

      if (topY < 0) topY = 0;
      if (bottomY > fallH) bottomY = fallH;
      var h = bottomY - topY;
      if (h < 4) h = 4;

      var x = kbL + bar.geo.x * kbW;
      var w = bar.geo.w * kbW;

      // Glow layer (wider, brighter)
      ctx.save();
      ctx.shadowBlur = 14;
      ctx.shadowColor = bar.geo.black
        ? "rgba(100, 180, 255, 0.35)"
        : "rgba(255, 190, 100, 0.35)";
      ctx.beginPath();
      rr(ctx, x - 2, topY - 1, w + 4, h + 2, Math.min(5, (w + 4) / 2));
      ctx.fillStyle = bar.geo.black
        ? "rgba(100, 180, 255, 0.25)"
        : "rgba(255, 190, 100, 0.25)";
      ctx.fill();
      ctx.restore();

      // Solid bar (brighter)
      var r = Math.min(3, w / 2, h / 2);
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = bar.geo.black
        ? "rgba(130, 200, 255, 0.4)"
        : "rgba(255, 195, 115, 0.4)";
      ctx.beginPath();
      rr(ctx, x, topY, w, h, r);
      ctx.fillStyle = bar.geo.black
        ? "rgba(130, 200, 255, 0.85)"
        : "rgba(255, 195, 115, 0.85)";
      ctx.fill();
      ctx.restore();
    }

    rafId = requestAnimationFrame(draw);
  }

  // ── Aurora: soft drifting color blobs ──
  function drawAurora(elapsed, cx, cy, fallH) {
    var t = elapsed / 1000;

    // Blob 1: warm, left-of-center
    var b1x = cx * 0.6 + Math.sin(t * 0.3) * 40;
    var b1y = cy * 0.7 + Math.cos(t * 0.25) * 30;
    drawBlob(b1x, b1y, 200, 255, 180, 100, 0.07);

    // Blob 2: cool, right-of-center
    var b2x = cx * 1.4 + Math.cos(t * 0.35) * 50;
    var b2y = cy * 1.0 + Math.sin(t * 0.2) * 25;
    drawBlob(b2x, b2y, 180, 100, 180, 255, 0.06);

    // Blob 3: accent, center
    var b3x = cx + Math.sin(t * 0.22) * 30;
    var b3y = cy * 1.3 + Math.cos(t * 0.28) * 20;
    drawBlob(b3x, b3y, 140, 180, 130, 255, 0.04);
  }

  function drawBlob(x, y, size, r, g, b, alpha) {
    var grad = ctx.createRadialGradient(x, y, 0, x, y, size);
    grad.addColorStop(0, "rgba(" + r + "," + g + "," + b + "," + alpha + ")");
    grad.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }

  // ── Center vinyl disc (small, semi-transparent) ──
  function drawVinyl(elapsed, cx, cy) {
    var radius = 28;
    var angle = (elapsed / 1000) * 1.2; // slow rotation

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 240, 230, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Grooves
    for (var g = 8; g < radius - 2; g += 4) {
      ctx.beginPath();
      ctx.arc(0, 0, g, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(60, 60, 60, 0.5)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Center label
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#F5F0E6";
    ctx.fill();

    // Reflection highlight
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.7, -0.4, 0.8);
    ctx.strokeStyle = "rgba(245, 240, 230, 0.06)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // Outer glow ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(245, 240, 230, 0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // ── Track info below vinyl ──
  function drawTrackInfo(cx, cy) {
    if (!trackTitle && !trackArtist) return;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    if (trackTitle) {
      ctx.font = "600 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillStyle = "rgba(245, 240, 230, 0.75)";
      ctx.fillText(trackTitle, cx, cy + 40);
    }

    if (trackArtist) {
      ctx.font = "400 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillStyle = "rgba(245, 240, 230, 0.35)";
      ctx.fillText(trackArtist, cx, cy + 58);
    }

    ctx.restore();
  }

  function rr(c, x, y, w, h, r) {
    if (r < 0) r = 0;
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r);
    c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h);
    c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r);
    c.arcTo(x, y, x + r, y, r);
    c.closePath();
  }

  buildGeo();

  return {
    start: start,
    stop: stop,
  };
})();
