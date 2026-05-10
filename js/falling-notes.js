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
    if (!container) return;
    var svg = container.querySelector(".piano-svg");
    var r = svg ? svg.getBoundingClientRect() : container.getBoundingClientRect();
    kbL = r.left;
    kbW = r.width;
    kbTop = r.top;

    cssW = window.innerWidth;
    cssH = kbTop > 80 ? kbTop : window.innerHeight * 0.55;

    var dpr = window.devicePixelRatio || 1;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function start(rec) {
    if (active) stop();
    if (!rec || !rec.ev || rec.ev.length === 0) return;

    canvas = document.createElement("canvas");
    canvas.className = "falling-notes-canvas";
    canvas.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;z-index:11;";
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
  }

  function draw() {
    if (!active || !ctx) return;

    var elapsed = window.PianoApp.Playback
      ? window.PianoApp.Playback.getElapsedMs()
      : 0;
    ctx.clearRect(0, 0, cssW, cssH);

    var fallH = cssH;

    for (var i = 0; i < bars.length; i++) {
      var bar = bars[i];
      var tStart = bar.startD - elapsed;
      var tEnd = bar.endD - elapsed;

      if (tEnd < -300 || tStart > LOOK_AHEAD) continue;

      // y = fallH when tStart = 0 (note hits the keyboard)
      // y = 0 when tStart = LOOK_AHEAD (note enters from top)
      var bottomY = fallH * (1 - tStart / LOOK_AHEAD);
      var topY = fallH * (1 - tEnd / LOOK_AHEAD);

      if (topY < 0) topY = 0;
      if (bottomY > fallH) bottomY = fallH;
      var h = bottomY - topY;
      if (h < 4) h = 4;

      var x = kbL + bar.geo.x * kbW;
      var w = bar.geo.w * kbW;

      // Glow layer
      ctx.beginPath();
      rr(ctx, x - 2, topY - 1, w + 4, h + 2, Math.min(5, (w + 4) / 2));
      ctx.fillStyle = bar.geo.black
        ? "rgba(100, 180, 255, 0.15)"
        : "rgba(255, 190, 100, 0.15)";
      ctx.fill();

      // Solid bar
      var r = Math.min(3, w / 2, h / 2);
      ctx.beginPath();
      rr(ctx, x, topY, w, h, r);
      ctx.fillStyle = bar.geo.black
        ? "rgba(130, 200, 255, 0.6)"
        : "rgba(255, 195, 115, 0.65)";
      ctx.fill();
    }

    rafId = requestAnimationFrame(draw);
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
