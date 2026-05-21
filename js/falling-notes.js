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
  var drawStartIdx = 0;

  // Cached layout
  var kbL = 0, kbW = 0, kbTop = 0;
  var cssW = 0, cssH = 0;

  // ── Pre-rendered bar textures (offscreen canvases) ──
  var barTexWhite = null;
  var barTexBlack = null;
  var TEX_W = 100;
  var TEX_H = 200;

  // ── Quality thresholds ──
  var QUALITY_FULL = 15;
  var QUALITY_MEDIUM = 35;

  // ── Pre-computed color strings (avoid per-frame concatenation) ──
  var FLAT_WHITE = "rgba(228,195,148,0.85)";
  var FLAT_BLACK = "rgba(195,210,230,0.85)";
  var GLOW_WHITE_STR = "rgba(228,195,148,0.12)";
  var GLOW_BLACK_STR = "rgba(195,210,230,0.12)";
  var BORDER_WHITE = "rgba(245,225,185,0.22)";
  var BORDER_BLACK = "rgba(220,230,245,0.22)";

  // Colors (used by particles / hit effects)
  var WHITE_KEY_COLOR = { r: 228, g: 195, b: 148 };
  var BLACK_KEY_COLOR = { r: 195, g: 210, b: 230 };

  // ── Particle System ──────────────────────────
  var particles = [];
  var maxParticles = 180;
  var particlePool = [];
  var poolIndex = 0;

  // ── Hit Effects ──────────────────────────────
  var hitEffects = [];
  var maxHitEffects = 40;
  var hitPool = [];
  var hitPoolIndex = 0;

  // ── Background Stars ─────────────────────────
  var bgStars = [];
  var numBgStars = 40;

  function buildGeo() {
    noteGeo = {};
    WHITES.forEach(function (k) {
      noteGeo[k.note] = { x: k.x / SVG_W, w: k.w / SVG_W, black: false };
    });
    BLACKS.forEach(function (k) {
      noteGeo[k.note] = { x: (k.cx - k.w / 2) / SVG_W, w: k.w / SVG_W, black: true };
    });
  }

  // ── Pre-render bar textures ──
  function buildBarTextures() {
    barTexWhite = makeBarTexture(false);
    barTexBlack = makeBarTexture(true);
  }

  function makeBarTexture(isBlack) {
    var c = document.createElement("canvas");
    c.width = TEX_W;
    c.height = TEX_H;
    var tc = c.getContext("2d");

    // Gradient body
    var g = tc.createLinearGradient(0, 0, 0, TEX_H);
    if (isBlack) {
      g.addColorStop(0, "rgba(210, 222, 238, 0.75)");
      g.addColorStop(0.5, "rgba(195, 210, 230, 0.9)");
      g.addColorStop(1, "rgba(175, 195, 220, 0.7)");
    } else {
      g.addColorStop(0, "rgba(240, 212, 170, 0.75)");
      g.addColorStop(0.5, "rgba(228, 195, 148, 0.9)");
      g.addColorStop(1, "rgba(210, 180, 130, 0.7)");
    }

    tc.beginPath();
    rr(tc, 0, 0, TEX_W, TEX_H, 4);
    tc.fillStyle = g;
    tc.fill();

    // Border
    tc.strokeStyle = isBlack ? BORDER_BLACK : BORDER_WHITE;
    tc.lineWidth = 0.8;
    tc.stroke();

    // Top sheen highlight
    var sh = Math.min(TEX_H * 0.2, 8);
    var sg = tc.createLinearGradient(0, 0, 0, sh);
    sg.addColorStop(0, "rgba(255,255,255,0.2)");
    sg.addColorStop(1, "rgba(255,255,255,0)");
    tc.beginPath();
    rr(tc, 1, 1, TEX_W - 2, sh, 3);
    tc.fillStyle = sg;
    tc.fill();

    return c;
  }

  function initPools() {
    particlePool = [];
    for (var i = 0; i < maxParticles; i++) {
      particlePool.push({
        x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0,
        size: 0, color: null, alpha: 0, active: false
      });
    }
    hitPool = [];
    for (var i = 0; i < maxHitEffects; i++) {
      hitPool.push({
        x: 0, y: 0, life: 0, maxLife: 0,
        radius: 0, color: null, active: false
      });
    }
  }

  function initBgStars() {
    bgStars = [];
    for (var i = 0; i < numBgStars; i++) {
      bgStars.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.5 + Math.random() * 1.5,
        twinkleSpeed: 0.3 + Math.random() * 1.5,
        twinkleOffset: Math.random() * Math.PI * 2,
        alphaBase: 0.1 + Math.random() * 0.25
      });
    }
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

    canvas = document.createElement("canvas");
    canvas.className = "falling-notes-canvas";
    canvas.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;z-index:1005;";
    ctx = canvas.getContext("2d");
    document.body.appendChild(canvas);

    measure();
    buildBarTextures();
    initPools();
    initBgStars();

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
      bars.push({ startD: ev.d, endD: endD, geo: geo, note: ev.n, hitTriggered: false });
    }

    // Prevent same-note bars from visually overlapping (vertical "sticking")
    var MIN_BAR_GAP = 60;
    var MIN_BAR_DURATION = 80;
    var byNote = {};
    bars.forEach(function (b) {
      (byNote[b.note] = byNote[b.note] || []).push(b);
    });
    Object.keys(byNote).forEach(function (n) {
      var g = byNote[n].sort(function (a, b) { return a.startD - b.startD; });
      for (var k = 0; k < g.length - 1; k++) {
        var limit = g[k + 1].startD - MIN_BAR_GAP;
        if (g[k].endD > limit) {
          g[k].endD = Math.max(g[k].startD + MIN_BAR_DURATION, limit);
        }
      }
    });

    // Render black-key bars on top of white-key bars (z-order)
    bars.sort(function (a, b) {
      if (a.geo.black !== b.geo.black) return a.geo.black ? 1 : -1;
      return a.startD - b.startD;
    });

    active = true;
    rafId = requestAnimationFrame(draw);

    resizeHandler = function () {
      if (active) measure();
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
    particles = [];
    hitEffects = [];
    drawStartIdx = 0;
    barTexWhite = null;
    barTexBlack = null;
  }

  // ── Particle helpers ─────────────────────────
  function spawnParticle(x, y, color, isBlack) {
    var p = particlePool[poolIndex];
    poolIndex = (poolIndex + 1) % maxParticles;

    p.x = x;
    p.y = y;
    var angle = (Math.random() - 0.5) * Math.PI;
    var speed = 0.3 + Math.random() * 1.2;
    p.vx = Math.sin(angle) * speed;
    p.vy = Math.cos(angle) * speed * 0.5 - 0.5;
    p.maxLife = 20 + Math.random() * 30;
    p.life = p.maxLife;
    p.size = 1 + Math.random() * 2.5;
    p.color = isBlack ? BLACK_KEY_COLOR : WHITE_KEY_COLOR;
    p.active = true;
  }

  function spawnHitEffect(x, y, isBlack) {
    var h = hitPool[hitPoolIndex];
    hitPoolIndex = (hitPoolIndex + 1) % maxHitEffects;

    h.x = x;
    h.y = y;
    h.maxLife = 25 + Math.random() * 15;
    h.life = h.maxLife;
    h.radius = 4 + Math.random() * 8;
    h.color = isBlack ? BLACK_KEY_COLOR : WHITE_KEY_COLOR;
    h.active = true;
  }

  function updateAndDrawParticles() {
    for (var i = 0; i < maxParticles; i++) {
      var p = particlePool[i];
      if (!p.active) continue;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life--;

      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      var progress = 1 - p.life / p.maxLife;
      var alpha = (1 - progress * progress) * 0.6;
      var size = p.size * (1 - progress * 0.5);

      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + p.color.r + "," + p.color.g + "," + p.color.b + "," + alpha + ")";
      ctx.fill();
    }
  }

  function updateAndDrawHitEffects() {
    for (var i = 0; i < maxHitEffects; i++) {
      var h = hitPool[i];
      if (!h.active) continue;

      h.life--;
      if (h.life <= 0) {
        h.active = false;
        continue;
      }

      var progress = 1 - h.life / h.maxLife;
      var alpha = (1 - progress) * 0.5;
      var radius = h.radius + progress * 25;

      ctx.beginPath();
      ctx.arc(h.x, h.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(" + h.color.r + "," + h.color.g + "," + h.color.b + "," + alpha * 0.4 + ")";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (progress < 0.3) {
        var innerAlpha = (1 - progress / 0.3) * 0.3;
        var grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, radius * 0.6);
        grad.addColorStop(0, "rgba(" + h.color.r + "," + h.color.g + "," + h.color.b + "," + innerAlpha + ")");
        grad.addColorStop(1, "rgba(" + h.color.r + "," + h.color.g + "," + h.color.b + ",0)");
        ctx.fillStyle = grad;
        ctx.fillRect(h.x - radius, h.y - radius, radius * 2, radius * 2);
      }
    }
  }

  function drawBgStars(elapsed) {
    var t = elapsed / 1000;
    for (var i = 0; i < numBgStars; i++) {
      var s = bgStars[i];
      var twinkle = Math.sin(t * s.twinkleSpeed + s.twinkleOffset);
      var alpha = s.alphaBase * (0.6 + 0.4 * twinkle);
      var x = s.x * cssW;
      var y = s.y * cssH;

      ctx.beginPath();
      ctx.arc(x, y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(254, 246, 228, " + alpha + ")";
      ctx.fill();
    }
  }

  // ── Main render loop ──────────────────────────
  function draw() {
    if (!active || !ctx) return;

    var elapsed = window.PianoApp.Playback
      ? window.PianoApp.Playback.getElapsedMs()
      : 0;
    ctx.clearRect(0, 0, cssW, cssH);

    var fallH = cssH;

    // Prune off-screen bars
    while (drawStartIdx < bars.length && bars[drawStartIdx].endD - elapsed < -300) {
      drawStartIdx++;
    }

    // Count visible bars to determine quality tier
    var visibleCount = 0;
    for (var i = drawStartIdx; i < bars.length; i++) {
      var tStart = bars[i].startD - elapsed;
      if (tStart > LOOK_AHEAD) break;
      if (bars[i].endD - elapsed >= -300) visibleCount++;
    }

    // Quality: 2 = full effects, 1 = medium, 0 = minimal (batched flat fills)
    var quality;
    if (visibleCount <= QUALITY_FULL) quality = 2;
    else if (visibleCount <= QUALITY_MEDIUM) quality = 1;
    else quality = 0;

    // ── Background layers ──
    if (quality >= 2) {
      var cx = cssW / 2;
      var cy = fallH * 0.4;
      drawAurora(elapsed, cx, cy, fallH);
      drawBgStars(elapsed);
    } else if (quality >= 1) {
      drawBgStars(elapsed);
    }

    // ── Falling note bars ──
    if (quality === 0) {
      drawBarsBatched(elapsed, fallH);
    } else {
      drawBarsTextured(elapsed, fallH, quality);
    }

    // ── Update and draw effects ──
    if (quality >= 1) updateAndDrawParticles();
    updateAndDrawHitEffects();

    rafId = requestAnimationFrame(draw);
  }

  // ── Minimal quality: batched flat fills (2 draw calls for all bars) ──
  function drawBarsBatched(elapsed, fallH) {
    var whiteBars = [];
    var blackBars = [];

    for (var i = drawStartIdx; i < bars.length; i++) {
      var bar = bars[i];
      var tStart = bar.startD - elapsed;
      if (tStart > LOOK_AHEAD) break;
      var tEnd = bar.endD - elapsed;
      if (tEnd < -300) continue;

      var bottomY = fallH * (1 - tStart / LOOK_AHEAD);
      var topY = fallH * (1 - tEnd / LOOK_AHEAD);
      if (topY < 0) topY = 0;
      if (bottomY > fallH) bottomY = fallH;
      var h = bottomY - topY;
      if (h < 10) h = 10;

      var keyW = bar.geo.w * kbW;
      var pad = keyW * 0.06;
      var w = Math.max(4, keyW - pad * 2);
      var x = kbL + bar.geo.x * kbW + pad;
      var r = Math.min(4, w / 2, h / 2);

      if (tStart <= 0 && tStart > -80 && !bar.hitTriggered) {
        bar.hitTriggered = true;
        spawnHitEffect(x + w / 2, fallH - 2, bar.geo.black);
      }

      var obj = { x: x, y: topY, w: w, h: h, r: r };
      if (bar.geo.black) blackBars.push(obj);
      else whiteBars.push(obj);
    }

    // White bars — single batched path
    if (whiteBars.length > 0) {
      ctx.beginPath();
      for (var j = 0; j < whiteBars.length; j++) {
        var b = whiteBars[j];
        rr(ctx, b.x, b.y, b.w, b.h, b.r);
      }
      ctx.fillStyle = FLAT_WHITE;
      ctx.fill();
    }

    // Black bars — single batched path (rendered on top)
    if (blackBars.length > 0) {
      ctx.beginPath();
      for (var j = 0; j < blackBars.length; j++) {
        var b = blackBars[j];
        rr(ctx, b.x, b.y, b.w, b.h, b.r);
      }
      ctx.fillStyle = FLAT_BLACK;
      ctx.fill();
    }
  }

  // ── Full/Medium quality: per-bar texture rendering ──
  function drawBarsTextured(elapsed, fallH, quality) {
    for (var i = drawStartIdx; i < bars.length; i++) {
      var bar = bars[i];
      var tStart = bar.startD - elapsed;
      var tEnd = bar.endD - elapsed;

      if (tStart > LOOK_AHEAD) break;

      var bottomY = fallH * (1 - tStart / LOOK_AHEAD);
      var topY = fallH * (1 - tEnd / LOOK_AHEAD);

      if (topY < 0) topY = 0;
      if (bottomY > fallH) bottomY = fallH;
      var h = bottomY - topY;
      if (h < 10) h = 10;

      var keyW = bar.geo.w * kbW;
      var pad = keyW * 0.06;
      var w = Math.max(4, keyW - pad * 2);
      var x = kbL + bar.geo.x * kbW + pad;

      var isBlack = bar.geo.black;
      var tex = isBlack ? barTexBlack : barTexWhite;

      // Trail particles
      if (quality >= 2 && tStart > 0 && tStart < LOOK_AHEAD && h > 8) {
        var pc = Math.min(3, Math.floor(w / 15));
        for (var p = 0; p < pc; p++) {
          if (Math.random() < 0.15) {
            spawnParticle(x + Math.random() * w, topY + Math.random() * h, null, isBlack);
          }
        }
      } else if (quality === 1 && tStart > 0 && tStart < LOOK_AHEAD && h > 8) {
        if (Math.random() < 0.06) {
          spawnParticle(x + Math.random() * w, topY + Math.random() * h, null, isBlack);
        }
      }

      // Hit effect
      if (tStart <= 0 && tStart > -80 && !bar.hitTriggered) {
        bar.hitTriggered = true;
        spawnHitEffect(x + w / 2, fallH - 2, isBlack);
      }

      // Anticipatory glow (full quality only)
      if (quality >= 2 && tStart > 0 && tStart < 160) {
        var glowInt = 1 - tStart / 160;
        ctx.fillStyle = isBlack
          ? "rgba(195,210,230," + (glowInt * 0.28) + ")"
          : "rgba(228,195,148," + (glowInt * 0.28) + ")";
        ctx.fillRect(x, fallH - 28, w, 28);
      }

      // Soft glow behind bar (replaces expensive shadowBlur)
      if (quality >= 2 || (quality === 1 && h > 15)) {
        ctx.fillStyle = isBlack ? GLOW_BLACK_STR : GLOW_WHITE_STR;
        ctx.fillRect(x - 2, topY - 2, w + 4, h + 4);
      }

      // Bar body via pre-rendered texture
      if (tex) {
        ctx.drawImage(tex, x, topY, w, h);
      } else {
        ctx.fillStyle = isBlack ? FLAT_BLACK : FLAT_WHITE;
        ctx.fillRect(x, topY, w, h);
      }
    }
  }

  // ── Aurora: layered drifting color blobs ──
  function drawAurora(elapsed, cx, cy, fallH) {
    var t = elapsed / 1000;

    var b1x = cx * 0.55 + Math.sin(t * 0.25) * 50;
    var b1y = cy * 0.6 + Math.cos(t * 0.2) * 35;
    drawBlob(b1x, b1y, 280, 230, 190, 140, 0.06);

    var b2x = cx * 1.45 + Math.cos(t * 0.3) * 60;
    var b2y = cy * 0.9 + Math.sin(t * 0.18) * 30;
    drawBlob(b2x, b2y, 260, 170, 190, 220, 0.05);

    var b3x = cx + Math.sin(t * 0.2) * 40;
    var b3y = cy * 1.4 + Math.cos(t * 0.25) * 25;
    drawBlob(b3x, b3y, 200, 180, 190, 210, 0.04);

    var b4x = cx * 0.8 + Math.cos(t * 0.15) * 30;
    var b4y = cy * 0.5 + Math.sin(t * 0.22) * 20;
    drawBlob(b4x, b4y, 180, 230, 195, 155, 0.035);
  }

  function drawBlob(x, y, size, r, g, b, alpha) {
    var grad = ctx.createRadialGradient(x, y, 0, x, y, size);
    grad.addColorStop(0, "rgba(" + r + "," + g + "," + b + "," + alpha + ")");
    grad.addColorStop(0.5, "rgba(" + r + "," + g + "," + b + "," + alpha * 0.5 + ")");
    grad.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
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
