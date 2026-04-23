window.PianoApp = window.PianoApp || {};

window.PianoApp.Sequencer = {
  isPlaying: false,
  timeouts: [],

  start() {
    if (this.isPlaying) return;
    if (!window.PianoApp.canonSequence) {
      console.error("Canon sequence not loaded");
      return;
    }

    const ctx = window.PianoApp.audioCtx;
    const startTime = ctx ? ctx.currentTime : 0;
    const seq = window.PianoApp.canonSequence;

    this.isPlaying = true;

    seq.forEach((note) => {
      const audioDelay = note.time / 1000;
      window.PianoApp.playNoteMidi(note.midi, note.duration, startTime + audioDelay);

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
      }, note.time);

      this.timeouts.push(visualTimer);
    });

    if (seq.length > 0) {
      const last = seq[seq.length - 1];
      const endTimer = setTimeout(() => {
        this.isPlaying = false;
        this.timeouts = [];
      }, last.time + last.duration + 100);
      this.timeouts.push(endTimer);
    }
  },

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.timeouts.forEach((t) => clearTimeout(t));
    this.timeouts = [];
    if (window.PianoApp.releaseAllKeysVisual) {
      window.PianoApp.releaseAllKeysVisual();
    }
  },

  toggle() {
    this.isPlaying ? this.stop() : this.start();
  },
};
