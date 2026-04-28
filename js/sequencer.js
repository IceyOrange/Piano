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
  _humanSeed: 0,
  MAX_VOICES: 24,
  _chordCache: null,
  _chordCacheIndex: -1,

  _predecodeSamples() {
    const seq = window.PianoApp.canonSequence;
    if (!seq) return Promise.resolve();
    const uniqueNotes = new Set();
    seq.forEach((n) => uniqueNotes.add(window.PianoApp.midiToNote(n.midi)));
    const promises = [];
    uniqueNotes.forEach((note) => {
      const sfNote = window.PianoApp._toSfNote(note);
      if (!window.PianoApp._sf.buffers[sfNote]) {
        const p = window.PianoApp._decodeSample(sfNote);
        if (p) promises.push(p);
      }
    });
    return promises.length > 0 ? Promise.all(promises) : Promise.resolve();
  },

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
    this._chordCache = null;
    this._chordCacheIndex = -1;

    if (window.PianoApp.vinylCursorState) {
      window.PianoApp.vinylCursorState.playingCanon = true;
      window.PianoApp.updateVinylCursor();
    }

    // ─── Visual timers: schedule all at once
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

  _getChordNotes(seq, index) {
    if (this._chordCacheIndex === index) return this._chordCache;
    const targetTime = seq[index].time;
    const chord = [];
    let start = index;
    while (start > 0 && targetTime - seq[start - 1].time <= 8) start--;
    let end = index;
    while (end < seq.length - 1 && seq[end + 1].time - targetTime <= 8) end++;
    for (let i = start; i <= end; i++) chord.push(seq[i]);
    this._chordCache = chord;
    this._chordCacheIndex = index;
    return chord;
  },

  _rand(i) {
    const x = Math.sin(this._humanSeed * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
  },

  _humanize(index) {
    return (this._rand(index) * 20) - 10;
  },

  _arpeggioOffset(note, chordNotes) {
    if (chordNotes.length <= 1) return 0;
    const sorted = chordNotes.slice().sort((a, b) => a.midi - b.midi);
    const rank = sorted.findIndex((n) => n.midi === note.midi);
    return rank * 8;
  },

  _calculateVelocity(note, chordNotes) {
    if (chordNotes.length <= 1) {
      return 0.45 + this._rand(note.midi) * 0.06;
    }
    const sorted = chordNotes.slice().sort((a, b) => b.midi - a.midi);
    const rank = sorted.findIndex((n) => n.midi === note.midi);
    const total = sorted.length;

    if (rank === 0) {
      return 0.54 + this._rand(note.midi) * 0.08;
    }
    if (rank === total - 1) {
      return 0.28 + this._rand(note.midi) * 0.08;
    }
    return 0.40 + this._rand(note.midi) * 0.06;
  },

  _purgeStoppedSounds() {
    this.activeSounds = this.activeSounds.filter((s) => !s._stopped);
  },

  _stealOldestVoice() {
    for (let i = 0; i < this.activeSounds.length; i++) {
      const s = this.activeSounds[i];
      if (!s._stopped) {
        s._stopped = true;
        try { s.stop(); } catch (e) {}
        return;
      }
    }
  },

  _scheduleAudio() {
    if (!this.isPlaying) return;

    const ctx = window.PianoApp.audioCtx;
    const seq = window.PianoApp.canonSequence;
    const currentTime = ctx ? ctx.currentTime : 0;
    const currentElapsed = (currentTime - this.baseTime) * 1000;
    const LOOKAHEAD_MS = 1500;

    while (this.nextAudioIndex < seq.length) {
      const note = seq[this.nextAudioIndex];
      if (note.time < this.elapsedMs) {
        this.nextAudioIndex++;
        continue;
      }
      if (note.time > currentElapsed + LOOKAHEAD_MS) break;

      // Voice stealing: cap concurrent voices
      if (this.activeSounds.length >= this.MAX_VOICES) {
        this._stealOldestVoice();
      }

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
      if (sound) {
        sound._stopped = false;
        this.activeSounds.push(sound);
      }

      this.nextAudioIndex++;
    }

    // Purge stopped sounds periodically
    this._purgeStoppedSounds();

    if (this.nextAudioIndex < seq.length) {
      this.scheduleTimer = setTimeout(() => this._scheduleAudio(), 200);
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

    this.activeSounds.forEach((s) => {
      if (!s._stopped) { s._stopped = true; try { s.stop(); } catch (e) {} }
    });
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
      this._predecodeSamples().then(() => this.start());
    }
  },

  _resetState() {
    this.isPlaying = false;
    this.isPaused = false;
    this.elapsedMs = 0;
    this.timeouts = [];
    this.activeSounds.forEach((s) => {
      if (!s._stopped) { s._stopped = true; try { s.stop(); } catch (e) {} }
    });
    this.activeSounds = [];
    this.nextAudioIndex = 0;
    this._chordCache = null;
    this._chordCacheIndex = -1;
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
