window.PianoApp = window.PianoApp || {};

window.PianoApp.Sequencer = {
  isPlaying: false,
  isPaused: false,
  timeouts: [],
  activeSounds: [],
  elapsedMs: 0,
  baseTime: 0,
  nextAudioIndex: 0,
  scheduleTimer: null,
  // Deterministic humanization seed so pause/resume stays consistent
  _humanSeed: 0,

  start() {
    if (this.isPlaying) return;
    if (!window.PianoApp.canonSequence) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.error("Canon sequence not loaded");
      }
      return;
    }

    const ctx = window.PianoApp.audioCtx;
    const seq = window.PianoApp.canonSequence;
    const now = ctx ? ctx.currentTime : 0;

    this.baseTime = now - (this.elapsedMs / 1000);
    this.isPlaying = true;
    this.isPaused = false;

    if (window.PianoApp.vinylCursorState) {
      window.PianoApp.vinylCursorState.playingCanon = true;
      window.PianoApp.updateVinylCursor();
    }

    // ─── Visual timers: schedule all at once (setTimeout creation is cheap)
    seq.forEach((note) => {
      if (note.time < this.elapsedMs) return;

      const visualDelay = note.time - this.elapsedMs;
      const visualTimer = setTimeout(() => {
        if (!this.isPlaying) return;
        if (note.hasKey && window.PianoApp.pressKeyVisual) {
          window.PianoApp.pressKeyVisual(note.note);
        }
        const releaseTimer = setTimeout(() => {
          if (note.hasKey && window.PianoApp.releaseKeyVisual) {
            window.PianoApp.releaseKeyVisual(note.note);
          }
        }, note.duration);
        this.timeouts.push(releaseTimer);
      }, visualDelay);

      this.timeouts.push(visualTimer);
    });

    // ─── End timer
    if (seq.length > 0) {
      const last = seq[seq.length - 1];
      const remaining = last.time + last.duration - this.elapsedMs;
      const endTimer = setTimeout(() => {
        this._resetState();
      }, Math.max(0, remaining + 100));
      this.timeouts.push(endTimer);
    }

    // ─── Audio: start lookahead scheduler
    this.nextAudioIndex = 0;
    this._scheduleAudio();
  },

  // ─── Expressiveness helpers ────────────────────────────────────────────────

  // Find all notes that sound together at roughly the same time (±8 ms)
  _getChordNotes(seq, index) {
    const targetTime = seq[index].time;
    const chord = [];
    // Scan forward
    for (let i = index; i < seq.length && seq[i].time - targetTime <= 8; i++) {
      if (Math.abs(seq[i].time - targetTime) <= 8) chord.push(seq[i]);
    }
    // Scan backward
    for (let i = index - 1; i >= 0 && targetTime - seq[i].time <= 8; i--) {
      if (Math.abs(seq[i].time - targetTime) <= 8) chord.push(seq[i]);
    }
    return chord;
  },

  // Deterministic pseudo-random for consistent pause/resume
  _rand(i) {
    const x = Math.sin(this._humanSeed * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
  },

  // ±10 ms random timing offset
  _humanize(index) {
    return (this._rand(index) * 20) - 10;
  },

  // Stagger chord notes from bass to treble (0 – 12 ms)
  _arpeggioOffset(note, chordNotes) {
    if (chordNotes.length <= 1) return 0;
    const sorted = chordNotes.slice().sort((a, b) => a.midi - b.midi);
    const rank = sorted.findIndex((n) => n.midi === note.midi);
    return rank * 8; // 0, 8, 16, ... ms
  },

  // Voice-dependent dynamics:
  //   melody (highest) → 0.52 – 0.62
  //   middle voices    → 0.38 – 0.46
  //   bass (lowest)    → 0.26 – 0.34
  _calculateVelocity(note, chordNotes) {
    if (chordNotes.length <= 1) {
      return 0.45 + this._rand(note.midi) * 0.06;
    }
    const sorted = chordNotes.slice().sort((a, b) => b.midi - a.midi);
    const rank = sorted.findIndex((n) => n.midi === note.midi);
    const total = sorted.length;

    if (rank === 0) {
      // Melody — strongest, with slight variation
      return 0.54 + this._rand(note.midi) * 0.08;
    }
    if (rank === total - 1) {
      // Bass — softest, with slight variation
      return 0.28 + this._rand(note.midi) * 0.08;
    }
    // Middle voices
    return 0.40 + this._rand(note.midi) * 0.06;
  },

  _scheduleAudio() {
    if (!this.isPlaying) return;

    const ctx = window.PianoApp.audioCtx;
    const seq = window.PianoApp.canonSequence;
    const currentTime = ctx ? ctx.currentTime : 0;
    const currentElapsed = (currentTime - this.baseTime) * 1000;
    const LOOKAHEAD_MS = 1500; // schedule notes up to 1.5s ahead

    while (this.nextAudioIndex < seq.length) {
      const note = seq[this.nextAudioIndex];
      if (note.time < this.elapsedMs) {
        this.nextAudioIndex++;
        continue;
      }
      if (note.time > currentElapsed + LOOKAHEAD_MS) break;

      const chordNotes = this._getChordNotes(seq, this.nextAudioIndex);
      const velocity = this._calculateVelocity(note, chordNotes);
      const humanizedOffset = this._humanize(this.nextAudioIndex);
      const arpeggioOffset = this._arpeggioOffset(note, chordNotes);

      const audioDelay = note.time / 1000 +
        (humanizedOffset + arpeggioOffset) / 1000;

      const sound = window.PianoApp.playNoteMidi(
        note.midi,
        note.duration,
        this.baseTime + audioDelay,
        velocity
      );
      if (sound) this.activeSounds.push(sound);

      this.nextAudioIndex++;
    }

    // Continue scheduling if there are more notes
    if (this.nextAudioIndex < seq.length) {
      this.scheduleTimer = setTimeout(() => this._scheduleAudio(), 250);
    }
  },

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.isPaused = true;
    if (window.PianoApp.audioCtx) {
      this.elapsedMs = Math.max(0, (window.PianoApp.audioCtx.currentTime - this.baseTime) * 1000);
    }
    this.timeouts.forEach((t) => clearTimeout(t));
    this.timeouts = [];

    this.activeSounds.forEach((s) => s.stop());
    this.activeSounds = [];

    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }

    if (window.PianoApp.releaseAllKeysVisual) {
      window.PianoApp.releaseAllKeysVisual();
    }
    if (window.PianoApp.vinylCursorState) {
      window.PianoApp.vinylCursorState.playingCanon = false;
      window.PianoApp.updateVinylCursor();
    }
  },

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else if (this.isPaused) {
      this.start();
    } else {
      this._humanSeed = Math.random() * 10000;
      this.elapsedMs = 0;
      this.start();
    }
  },

  _resetState() {
    this.isPlaying = false;
    this.isPaused = false;
    this.elapsedMs = 0;
    this.timeouts = [];
    this.activeSounds = [];
    this.nextAudioIndex = 0;
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }
    if (window.PianoApp.vinylCursorState) {
      window.PianoApp.vinylCursorState.playingCanon = false;
      window.PianoApp.updateVinylCursor();
    }
  },
};
