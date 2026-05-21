window.PianoApp = window.PianoApp || {};

window.PianoApp.FallingNotes = (function () {
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

  var kbL = 0, kbW = 0, kbTop = 0;
  var cssW = 0, cssH = 0;

  // ── Pre-rendered textures ──
  var barTexWhite = null;
  var barTexBlack = null;
  var glowTexWhite = null;
  var glowTexBlack = null;
  var spotTexWhite = null;
  var spotTexBlack = null;
  var hitGlowTex = null;
  var TEX_W = 100;
  var TEX_H = 200;
  var GLOW_PAD = 14;

  // ── Quality thresholds ──
  var QUALITY_FULL = 15;
  var QUALITY_MEDIUM = 35;

  // ── Pre-computed color strings ──
  var FLAT_WHITE = "rgba(232,198,142,0.85)";
  var FLAT_BLACK = "rgba(178,202,238,0.85)";
  var GLOW_WHITE_STR = "rgba(235,195,130,0.12)";
  var GLOW_BLACK_STR = "rgba(170,198,238,0.12)";

  // Key colors (particles + hit effects)
  var WHITE_KEY_COLOR = { r: 235, g: 195, b: 130 };
  var BLACK_KEY_COLOR = { r: 175, g: 202, b: 238 };

  // ── Pools ──
  var particles = [];
  var maxParticles = 180;
  var particlePool = [];
  var poolIndex = 0;
  var hitEffects = [];
  var maxHitEffects = 40;
  var hitPool = [];
  var hitPoolIndex = 0;
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

  // ── Texture builders (all free at runtime — pre-rendered once) ──

  function buildBarTextures() {
    barTexWhite = makeBarTexture(false);
    barTexBlack = makeBarTexture(true);
    glowTexWhite = makeGlowTexture(false);
    glowTexBlack = makeGlowTexture(true);
    spotTexWhite = makeSpotTexture(false);
    spotTexBlack = makeSpotTexture(true);
    hitGlowTex = makeHitGlowTexture();
  }

  function makeBarTexture(isBlack) {
    var c = document.createElement("canvas");
    c.width = TEX_W; c.height = TEX_H;
    var tc = c.getContext("2d");

    // 5-stop vertical gradient for richer color depth
    var g = tc.createLinearGradient(0, 0, 0, TEX_H);
    if (isBlack) {
      g.addColorStop(0,    "rgba(208, 224, 248, 0.72)");
      g.addColorStop(0.2,  "rgba(195, 215, 240, 0.88)");
      g.addColorStop(0.5,  "rgba(178, 202, 235, 0.94)");
      g.addColorStop(0.8,  "rgba(165, 190, 225, 0.88)");
      g.addColorStop(1,    "rgba(150, 178, 215, 0.72)");
    } else {
      g.addColorStop(0,    "rgba(248, 222, 168, 0.72)");
      g.addColorStop(0.2,  "rgba(242, 212, 155, 0.88)");
      g.addColorStop(0.5,  "rgba(232, 198, 140, 0.94)");
      g.addColorStop(0.8,  "rgba(220, 182, 125, 0.88)");
      g.addColorStop(1,    "rgba(208, 168, 110, 0.72)");
    }

    tc.beginPath();
    rr(tc, 0, 0, TEX_W, TEX_H, 5);
    tc.fillStyle = g;
    tc.fill();

    // Left edge highlight (light source simulation)
    var leftG = tc.createLinearGradient(0, 0, 5, 0);
    leftG.addColorStop(0, "rgba(255,255,255,0.18)");
    leftG.addColorStop(1, "rgba(255,255,255,0)");
    tc.fillStyle = leftG;
    tc.fillRect(1, 2, 5, TEX_H - 4);

    // Right edge shadow
    var rightG = tc.createLinearGradient(TEX_W - 5, 0, TEX_W, 0);
    rightG.addColorStop(0, "rgba(0,0,0,0)");
    rightG.addColorStop(1, "rgba(0,0,0,0.07)");
    tc.fillStyle = rightG;
    tc.fillRect(TEX_W - 6, 2, 5, TEX_H - 4);

    // Top cap bright highlight
    var capG = tc.createLinearGradient(0, 0, 0, 8);
    capG.addColorStop(0, "rgba(255,255,255,0.3)");
    capG.addColorStop(1, "rgba(255,255,255,0)");
    tc.beginPath();
    rr(tc, 2, 1, TEX_W - 4, 8, 4);
    tc.fillStyle = capG;
    tc.fill();

    // Sheen in upper portion
    var sheenH = Math.min(TEX_H * 0.3, 22);
    var sheenG = tc.createLinearGradient(0, 0, 0, sheenH);
    sheenG.addColorStop(0, "rgba(255,255,255,0.16)");
    sheenG.addColorStop(1, "rgba(255,255,255,0)");
    tc.fillStyle = sheenG;
    tc.fillRect(3, 3, TEX_W - 6, sheenH);

    // Bottom subtle warm/cool glow
    var botG = tc.createLinearGradient(0, TEX_H - 10, 0, TEX_H);
    botG.addColorStop(0, "rgba(0,0,0,0)");
    botG.addColorStop(1, "rgba(0,0,0,0.04)");
    tc.fillStyle = botG;
    tc.fillRect(2, TEX_H - 10, TEX_W - 4, 10);

    // Refined border
    tc.beginPath();
    rr(tc, 0, 0, TEX_W, TEX_H, 5);
    tc.strokeStyle = isBlack ? "rgba(190,210,240,0.18)" : "rgba(255,220,165,0.22)";
    tc.lineWidth = 0.7;
    tc.stroke();

    return c;
  }

  function makeGlowTexture(isBlack) {
    var c = document.createElement("canvas");
    var size = TEX_W + GLOW_PAD * 2;
    c.width = size; c.height = TEX_H + GLOW_PAD * 2;
    var tc = c.getContext("2d");

    var rx = size / 2, ry = size / 2;
    var radius = Math.max(rx, ry);
    var r, g, b;
    if (isBlack) { r = 170; g = 198; b = 238; }
    else { r = 235; g = 195; b = 130; }

    var grad = tc.createRadialGradient(rx, ry, 0, rx, ry, radius);
    grad.addColorStop(0,   "rgba(" + r + "," + g + "," + b + ",0.16)");
    grad.addColorStop(0.3, "rgba(" + r + "," + g + "," + b + ",0.07)");
    grad.addColorStop(1,   "rgba(" + r + "," + g + "," + b + ",0)");
    tc.fillStyle = grad;
    tc.fillRect(0, 0, size, size);

    return c;
  }

  function makeSpotTexture(isBlack) {
    var c = document.createElement("canvas");
    c.width = 80; c.height = 40;
    var tc = c.getContext("2d");

    var r, g, b;
    if (isBlack) { r = 180; g = 208; b = 242; }
    else { r = 242; g = 205; b = 145; }

    var grad = tc.createRadialGradient(40, 35, 0, 40, 35, 38);
    grad.addColorStop(0,   "rgba(" + r + "," + g + "," + b + ",0.45)");
    grad.addColorStop(0.35,"rgba(" + r + "," + g + "," + b + ",0.18)");
    grad.addColorStop(1,   "rgba(" + r + "," + g + "," + b + ",0)");
    tc.fillStyle = grad;
    tc.fillRect(0, 0, 80, 40);

    return c;
  }

  function makeHitGlowTexture() {
    var c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    var tc = c.getContext("2d");
    var grad = tc.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0,   "rgba(255,255,255,0.55)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.2)");
    grad.addColorStop(1,   "rgba(255,255,255,0)");
    tc.fillStyle = grad;
    tc.fillRect(0, 0, 64, 64);
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
      var warm = Math.random() < 0.5;
      bgStars.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.5 + Math.random() * 1.5,
        twinkleSpeed: 0.3 + Math.random() * 1.5,
        twinkleOffset: Math.random() * Math.PI * 2,
        alphaBase: 0.08 + Math.random() * 0.22,
        r: warm ? 254 : 230,
        g: warm ? 240 : 235,
        b: warm ? 220 : 250
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
    canvas = null; ctx = null; bars = []; particles = []; hitEffects = [];
    drawStartIdx = 0;
    barTexWhite = barTexBlack = glowTexWhite = glowTexBlack = null;
    spotTexWhite = spotTexBlack = hitGlowTex = null;
  }

  // ── Particle helpers ──
  function spawnParticle(x, y, color, isBlack) {
    var p = particlePool[poolIndex];
    poolIndex = (poolIndex + 1) % maxParticles;
    p.x = x; p.y = y;
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
    h.x = x; h.y = y;
    h.maxLife = 18 + Math.random() * 12;
    h.life = h.maxLife;
    h.radius = 6 + Math.random() * 10;
    h.color = isBlack ? BLACK_KEY_COLOR : WHITE_KEY_COLOR;
    h.active = true;
  }

  function updateAndDrawParticles() {
    for (var i = 0; i < maxParticles; i++) {
      var p = particlePool[i];
      if (!p.active) continue;
      p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life--;
      if (p.life <= 0) { p.active = false; continue; }

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
      if (h.life <= 0) { h.active = false; continue; }

      var progress = 1 - h.life / h.maxLife;
      var radius = h.radius + progress * 30;

      // Outer soft ring
      var outerAlpha = (1 - progress) * 0.4;
      ctx.beginPath();
      ctx.arc(h.x, h.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(" + h.color.r + "," + h.color.g + "," + h.color.b + "," + outerAlpha + ")";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner bright white ring
      if (progress < 0.5) {
        var innerRingAlpha = (1 - progress / 0.5) * 0.45;
        ctx.beginPath();
        ctx.arc(h.x, h.y, radius * 0.55, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255," + innerRingAlpha + ")";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Central glow via pre-rendered texture
      if (progress < 0.4 && hitGlowTex) {
        var glowAlpha = (1 - progress / 0.4) * 0.5;
        var glowSize = radius * 0.8;
        ctx.globalAlpha = glowAlpha;
        ctx.drawImage(hitGlowTex, h.x - glowSize, h.y - glowSize, glowSize * 2, glowSize * 2);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawBgStars(elapsed) {
    var t = elapsed / 1000;
    for (var i = 0; i < numBgStars; i++) {
      var s = bgStars[i];
      var twinkle = Math.sin(t * s.twinkleSpeed + s.twinkleOffset);
      var alpha = s.alphaBase * (0.6 + 0.4 * twinkle);
      ctx.beginPath();
      ctx.arc(s.x * cssW, s.y * cssH, s.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + s.r + "," + s.g + "," + s.b + "," + alpha + ")";
      ctx.fill();
    }
  }

  // ── Main render loop ──
  function draw() {
    if (!active || !ctx) return;
    var elapsed = window.PianoApp.Playback
      ? window.PianoApp.Playback.getElapsedMs()
      : 0;
    ctx.clearRect(0, 0, cssW, cssH);

    var fallH = cssH;

    while (drawStartIdx < bars.length && bars[drawStartIdx].endD - elapsed < -300) {
      drawStartIdx++;
    }

    var visibleCount = 0;
    for (var i = drawStartIdx; i < bars.length; i++) {
      if (bars[i].startD - elapsed > LOOK_AHEAD) break;
      if (bars[i].endD - elapsed >= -300) visibleCount++;
    }

    var quality;
    if (visibleCount <= QUALITY_FULL) quality = 2;
    else if (visibleCount <= QUALITY_MEDIUM) quality = 1;
    else quality = 0;

    if (quality >= 2) {
      drawAurora(elapsed, cssW / 2, fallH * 0.4, fallH);
      drawBgStars(elapsed);
    } else if (quality >= 1) {
      drawBgStars(elapsed);
    }

    if (quality === 0) {
      drawBarsBatched(elapsed, fallH);
    } else {
      drawBarsTextured(elapsed, fallH, quality);
    }

    if (quality >= 1) updateAndDrawParticles();
    updateAndDrawHitEffects();

    rafId = requestAnimationFrame(draw);
  }

  // ── Minimal quality: batched flat fills ──
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

    if (whiteBars.length > 0) {
      ctx.beginPath();
      for (var j = 0; j < whiteBars.length; j++) {
        var b = whiteBars[j];
        rr(ctx, b.x, b.y, b.w, b.h, b.r);
      }
      ctx.fillStyle = FLAT_WHITE;
      ctx.fill();
    }

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

  // ── Full/Medium quality: textured rendering ──
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
      var glowTex = isBlack ? glowTexBlack : glowTexWhite;

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

      // Anticipatory spotlight on keyboard (full quality)
      if (quality >= 2 && tStart > 0 && tStart < 200) {
        var spotInt = 1 - tStart / 200;
        var spotTex = isBlack ? spotTexBlack : spotTexWhite;
        ctx.globalAlpha = spotInt * 0.55;
        ctx.drawImage(spotTex, x - 10, fallH - 38, w + 20, 38);
        ctx.globalAlpha = 1;
      }

      // Soft ambient glow behind bar
      if (quality >= 2 && glowTex) {
        ctx.drawImage(glowTex, x - GLOW_PAD, topY - GLOW_PAD, w + GLOW_PAD * 2, h + GLOW_PAD * 2);
      } else if (quality === 1 && h > 15) {
        ctx.fillStyle = isBlack ? GLOW_BLACK_STR : GLOW_WHITE_STR;
        ctx.fillRect(x - 2, topY - 2, w + 4, h + 4);
      }

      // Bar body
      if (tex) {
        ctx.drawImage(tex, x, topY, w, h);
      } else {
        ctx.fillStyle = isBlack ? FLAT_BLACK : FLAT_WHITE;
        ctx.fillRect(x, topY, w, h);
      }
    }
  }

  // ── Aurora ──
  function drawAurora(elapsed, cx, cy, fallH) {
    var t = elapsed / 1000;
    drawBlob(cx * 0.55 + Math.sin(t * 0.25) * 50, cy * 0.6 + Math.cos(t * 0.2) * 35, 280, 235, 195, 130, 0.065);
    drawBlob(cx * 1.45 + Math.cos(t * 0.3) * 60, cy * 0.9 + Math.sin(t * 0.18) * 30, 260, 170, 200, 240, 0.055);
    drawBlob(cx + Math.sin(t * 0.2) * 40, cy * 1.4 + Math.cos(t * 0.25) * 25, 200, 180, 195, 215, 0.045);
    drawBlob(cx * 0.8 + Math.cos(t * 0.15) * 30, cy * 0.5 + Math.sin(t * 0.22) * 20, 180, 235, 198, 145, 0.04);
  }

  function drawBlob(x, y, size, r, g, b, alpha) {
    var grad = ctx.createRadialGradient(x, y, 0, x, y, size);
    grad.addColorStop(0,   "rgba(" + r + "," + g + "," + b + "," + alpha + ")");
    grad.addColorStop(0.5, "rgba(" + r + "," + g + "," + b + "," + alpha * 0.5 + ")");
    grad.addColorStop(1,   "rgba(" + r + "," + g + "," + b + ",0)");
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
