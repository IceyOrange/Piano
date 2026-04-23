window.PianoApp = window.PianoApp || {};

window.PianoApp.noteFrequencies = {
  F2: 87.31, "F#2": 92.50, G2: 98.00, "G#2": 103.83,
  A2: 110.00, "A#2": 116.54, B2: 123.47,
  C3: 130.81, "C#3": 138.59, D3: 146.83, "D#3": 155.56,
  E3: 164.81, F3: 174.61, "F#3": 185.00, G3: 196.00,
  "G#3": 207.65, A3: 220.00, "A#3": 233.08, B3: 246.94,
  C4: 261.63, "C#4": 277.18, D4: 293.66, "D#4": 311.13,
  E4: 329.63,
};

window.PianoApp.audioCtx = null;

window.PianoApp.initAudio = function () {
  if (!window.PianoApp.audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    window.PianoApp.audioCtx = new AudioContext();
  }
  if (window.PianoApp.audioCtx.state === "suspended") {
    window.PianoApp.audioCtx.resume();
  }
};

window.PianoApp.playNote = function (note) {
  window.PianoApp.initAudio();
  const ctx = window.PianoApp.audioCtx;
  const freq = window.PianoApp.noteFrequencies[note];
  if (!freq) return;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.02);
  masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
  masterGain.connect(ctx.destination);

  // Primary oscillator — triangle for warm body
  const osc1 = ctx.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(freq, ctx.currentTime);
  osc1.connect(masterGain);
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 1.4);

  // Secondary oscillator — sine an octave up for clarity and interval definition
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);
  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, ctx.currentTime);
  gain2.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(ctx.currentTime);
  osc2.stop(ctx.currentTime + 1.0);
};

window.PianoApp.playNoteMidi = function (midi, durationMs, when) {
  window.PianoApp.initAudio();
  const ctx = window.PianoApp.audioCtx;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const start = when || ctx.currentTime;
  const dur = Math.max(durationMs / 1000, 0.05);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, start);
  masterGain.gain.linearRampToValueAtTime(0.35, start + 0.02);
  masterGain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  masterGain.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(freq, start);
  osc1.connect(masterGain);
  osc1.start(start);
  osc1.stop(start + dur);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2, start);
  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, start);
  gain2.gain.linearRampToValueAtTime(0.08, start + 0.02);
  gain2.gain.exponentialRampToValueAtTime(0.001, start + Math.min(dur, 1.0));
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(start);
  osc2.stop(start + Math.min(dur, 1.0));
};
