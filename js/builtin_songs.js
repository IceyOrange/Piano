window.PianoApp = window.PianoApp || {};

// Built-in community songs: hard-coded recordings shown at the top of the
// community list. Same shape as server recordings (id, title, name, ts, dur, ev).
// IDs start with "b_" so list/get/delete code can detect them and skip the API.
window.PianoApp.builtinSongs = (function () {
  // Build a recording from a compact [startMs, noteName, durationMs] list.
  // Sorted by start time so playback.js's noteOff scan finds the right release.
  function build(notes, meta) {
    var ev = [];
    notes.forEach(function (n) {
      ev.push({ d: n[0], n: n[1], v: 0.9 });
      ev.push({ d: n[0] + n[2], n: n[1], v: 0 });
    });
    ev.sort(function (a, b) {
      if (a.d !== b.d) return a.d - b.d;
      // noteOff (v=0) of an earlier note should come before noteOn (v=0.9) of
      // the next when they share a timestamp, so the same pitch can repeat.
      return a.v - b.v;
    });
    var dur = 0;
    notes.forEach(function (n) { if (n[0] + n[2] > dur) dur = n[0] + n[2]; });
    return {
      id: meta.id,
      title: meta.title,
      name: meta.name,
      ts: meta.ts,
      dur: dur,
      ev: ev,
      builtin: true,
    };
  }

  // ─── 喜羊羊与灰太狼 主题曲（副歌） ─────────────────────────────────────────
  // C major, ~120 BPM (quarter = 500 ms). Melody centered in octave 3–4,
  // light bass on phrase downbeats so it sounds like a piano arrangement.
  // 简谱:
  //   3 3 3 5 6 6 5   (别 看 我 只 是 一 只 羊)
  //   3 3 2 2 1 1 2   (绿 草 因 为 我 变 得 更 香)
  //   3 3 5 5 6 6 5   (天 空 因 为 我 变 得 更 蓝)
  //   1' 1' 6 6 5 3 1 (白 云 因 为 我 变 得 柔 软)
  var xiYangYang = build(
    [
      // Phrase 1 — bar 0–4 s
      [0,    "E3", 480], [500,  "E3", 480], [1000, "E3", 480], [1500, "G3", 480],
      [2000, "A3", 480], [2500, "A3", 480], [3000, "G3", 980],
      [0,    "C3", 980], [1000, "G3", 480], [2000, "C3", 980], [3000, "G3", 480],
      // Phrase 2 — bar 4–8 s
      [4000, "E3", 480], [4500, "E3", 480], [5000, "D3", 480], [5500, "D3", 480],
      [6000, "C3", 480], [6500, "C3", 480], [7000, "D3", 980],
      [4000, "G2", 980], [6000, "C3", 480],
      // Phrase 3 — bar 8–12 s
      [8000,  "E3", 480], [8500,  "E3", 480], [9000,  "G3", 480], [9500,  "G3", 480],
      [10000, "A3", 480], [10500, "A3", 480], [11000, "G3", 980],
      [8000, "A2", 980], [10000, "F2", 980],
      // Phrase 4 — bar 12–16 s (resolves on C)
      [12000, "C4", 480], [12500, "C4", 480], [13000, "A3", 480], [13500, "A3", 480],
      [14000, "G3", 480], [14500, "E3", 480], [15000, "C3", 1480],
      [12000, "F2", 980], [13000, "G2", 980], [14000, "C3", 1980],
    ],
    {
      id: "b_xiyangyang",
      title: "喜羊羊与灰太狼 主题曲",
      name: "内置曲目",
      ts: Date.parse("2024-01-01T00:00:00Z"),
    }
  );

  // ─── 爱乐之城 主题曲 (City of Stars) ─────────────────────────────────────────
  // A minor, ~70 BPM (quarter ≈ 857 ms). Wistful piano arrangement: melody on
  // top, broken-chord bass underneath. Captures the "City of stars / Are you
  // shining just for me?" hook of the chorus.
  var cityOfStars = build(
    [
      // "Ci-ty of stars" — pickup + held note
      [0,    "E4", 800],  // Ci-
      [900,  "D4", 800],  // ty
      [1800, "C4", 1700], // of stars (held)
      // bass: Am arpeggio
      [0,    "A2", 800], [900,  "E3", 800], [1800, "A2", 800], [2700, "E3", 800],

      // "Are you shi-ning just for me?"
      [3600, "E4", 600],  // Are
      [4300, "D4", 600],  // you
      [5000, "C4", 600],  // shi-
      [5700, "B3", 600],  // ning
      [6400, "A3", 600],  // just
      [7100, "G3", 600],  // for
      [7800, "A3", 1700], // me (held)
      // bass: Dm → G → Am
      [3600, "D3", 800], [4500, "A3", 800],
      [5400, "G2", 800], [6300, "D3", 800],
      [7200, "A2", 800], [8100, "E3", 800],

      // "Ci-ty of stars" reprise
      [9700, "E4", 800],
      [10600,"D4", 800],
      [11500,"C4", 1700],
      [9700, "A2", 800], [10600, "E3", 800], [11500, "A2", 800], [12400, "E3", 800],

      // "Just one thing every-body wants"
      [13300,"E4", 600],
      [14000,"D4", 600],
      [14700,"C4", 600],
      [15400,"D4", 600],
      [16100,"E4", 600],
      [16800,"D4", 600],
      [17500,"C4", 1700], // (held — resolve)
      [13300,"F2", 800], [14200,"C3", 800],
      [15100,"G2", 800], [16000,"D3", 800],
      [16900,"A2", 800], [17800,"E3", 1400],
    ],
    {
      id: "b_cityofstars",
      title: "爱乐之城 主题曲 (City of Stars)",
      name: "内置曲目",
      ts: Date.parse("2024-01-02T00:00:00Z"),
    }
  );

  var songs = [xiYangYang, cityOfStars];

  function isBuiltinId(id) {
    return typeof id === "string" && id.indexOf("b_") === 0;
  }

  function getById(id) {
    for (var i = 0; i < songs.length; i++) {
      if (songs[i].id === id) return songs[i];
    }
    return null;
  }

  function list() {
    // Return a shallow "summary" form (no ev) — matches what /api/recordings/list returns.
    return songs.map(function (s) {
      return {
        id: s.id,
        name: s.name,
        title: s.title,
        ts: s.ts,
        dur: s.dur,
        count: s.ev.length,
        plays: 0,
        builtin: true,
      };
    });
  }

  return {
    list: list,
    getById: getById,
    isBuiltinId: isBuiltinId,
  };
})();
