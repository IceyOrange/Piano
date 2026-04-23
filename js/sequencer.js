window.PianoApp = window.PianoApp || {};

window.PianoApp.Sequencer = {
  isPlaying: false,
  isPaused: false,
  timeouts: [],
  elapsedMs: 0,
  baseTime: 0,

  start() {
    if (this.isPlaying) return;
    if (!window.PianoApp.canonSequence) {
      console.error("Canon sequence not loaded");
      return;
    }

    const ctx = window.PianoApp.audioCtx;
    const seq = window.PianoApp.canonSequence;
    const now = ctx ? ctx.currentTime : 0;

    // baseTime is the virtual start time of the sequence.
    // If continuing from pause, baseTime = now - elapsedMs so that
    // note.time maps to the correct absolute AudioContext time.
    this.baseTime = now - (this.elapsedMs / 1000);
    this.isPlaying = true;
    this.isPaused = false;

    seq.forEach((note) => {
      if (note.time < this.elapsedMs) return; // skip already played

      const audioDelay = note.time / 1000;
      window.PianoApp.playNoteMidi(note.midi, note.duration, this.baseTime + audioDelay);

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

    if (seq.length > 0) {
      const last = seq[seq.length - 1];
      const remaining = last.time + last.duration - this.elapsedMs;
      const endTimer = setTimeout(() => {
        this.isPlaying = false;
        this.isPaused = false;
        this.elapsedMs = 0;
        this.timeouts = [];
      }, Math.max(0, remaining + 100));
      this.timeouts.push(endTimer);
    }
  },

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.isPaused = true;
    if (window.PianoApp.audioCtx && this.baseTime) {
      this.elapsedMs = (window.PianoApp.audioCtx.currentTime - this.baseTime) * 1000;
    }
    this.timeouts.forEach((t) => clearTimeout(t));
    this.timeouts = [];
    if (window.PianoApp.releaseAllKeysVisual) {
      window.PianoApp.releaseAllKeysVisual();
    }
  },

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else if (this.isPaused) {
      this.start();
    } else {
      this.elapsedMs = 0;
      this.start();
    }
  },
};
