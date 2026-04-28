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
  MAX_VOICES: 28,
  _chordCache: null,
  _chordCacheIndex: -1,

  _predecodeSamples() {
    const seq = window.PianoApp.canonSequence;
    if (!seq) return Promise.resolve();
    return window.PianoApp._ensureSoundfont().then(function () {
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
    });
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

  _getNoteRole(note, chordNotes) {
    // Bass: Canon's ground bass (ostinato) — D, A, B, F#, G, etc. in lower register
    if (note.midi < 55) return "bass";
    // Melody: the highest voice in the upper register, carrying the main theme
    if (chordNotes.length > 1) {
      const maxMidi = Math.max(...chordNotes.map((n) => n.midi));
      if (note.midi === maxMidi && note.midi >= 67) return "melody";
    }
    // Inner voices: harmonic filler between bass and melody
    return "inner";
  },

  _getPhraseDynamics(timeMs) {
    // Breathing-like dynamics: swell and fade over ~6-second phrases
    const phraseLen = 6000;
    const pos = (timeMs % phraseLen) / phraseLen;
    // Start gentle, build to a peak near the middle, ease off toward the end
    return Math.sin(pos * Math.PI) * 0.07 - 0.015;
  },

  _getRubato(timeMs) {
    // Subtle time stretching at phrase boundaries — like a living performer
    const phraseLen = 6000;
    const pos = (timeMs % phraseLen) / phraseLen;
    // Slight push at phrase start, gentle pull back at phrase end
    if (pos > 0.88) {
      return ((pos - 0.88) / 0.12) * 10; // ritardando: up to +10ms
    }
    if (pos < 0.08) {
      return -(pos / 0.08) * 4; // slight push: up to -4ms
    }
    return 0;
  },

  _rand(i) {
    const x = Math.sin(this._humanSeed * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
  },

  _humanize(index) {
    const note = window.PianoApp.canonSequence[index];
    const range = note.midi >= 60 ? 20 : 8;
    return (this._rand(index) * range * 2) - range;
  },

  _arpeggioOffset(note, chordNotes) {
    if (chordNotes.length <= 1) return 0;
    const sorted = chordNotes.slice().sort((a, b) => a.midi - b.midi);
    const rank = sorted.findIndex((n) => n.midi === note.midi);
    return rank * 12;
  },

  _calculateVelocity(note, chordNotes, index) {
    const role = this._getNoteRole(note, chordNotes);
    const phraseDyn = this._getPhraseDynamics(note.time);
    const rand = this._rand(note.midi + index);

    if (role === "bass") {
      // Ground bass: steady, warm, slightly behind the beat feel
      // Narrow dynamic range for the repeating ostinato pattern
      return Math.min(0.88, 0.44 + phraseDyn * 0.6 + rand * 0.07);
    }
    if (role === "melody") {
      // Melody: most expressive, wider dynamic swells, singing quality
      return Math.min(0.95, 0.62 + phraseDyn + rand * 0.16);
    }
    // Inner voices: supportive, blend into the harmonic texture
    return Math.min(0.82, 0.36 + phraseDyn * 0.7 + rand * 0.09);
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
      const role = this._getNoteRole(note, chordNotes);
      const velocity = this._calculateVelocity(note, chordNotes, this.nextAudioIndex);
      const humanizedOffset = this._humanize(this.nextAudioIndex);
      const arpeggioOffset = this._arpeggioOffset(note, chordNotes);
      const rubato = this._getRubato(note.time);

      const audioDelay = note.time / 1000 +
        (humanizedOffset + arpeggioOffset + rubato) / 1000;

      // Bass notes and inner harmony get longer sustain (pedal effect);
      // melody notes keep tighter duration for articulation
      let sustainedDuration;
      if (role === "bass") {
        sustainedDuration = note.duration * 1.45;
      } else if (role === "inner") {
        sustainedDuration = note.duration * 1.25;
      } else {
        sustainedDuration = note.duration * 1.10;
      }

      // Sustain pedal simulation for bass ostinato and rich inner voices
      const isSustain = role === "bass" || (role === "inner" && chordNotes.length > 2);

      const sound = window.PianoApp.playNoteMidi(
        note.midi,
        sustainedDuration,
        this.baseTime + audioDelay,
        velocity,
        { sustain: isSustain }
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
      const self = this;
      function begin() {
        self._predecodeSamples().then(
          () => self.start(),
          () => self.start()
        );
      }
      const ctx = window.PianoApp.audioCtx;
      if (ctx && ctx.state === "suspended") {
        ctx.resume().then(begin);
      } else {
        begin();
      }
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
