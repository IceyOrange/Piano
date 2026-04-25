window.PianoApp = window.PianoApp || {};

window.PianoApp.noteFrequencies = {
  F2: 87.31, "F#2": 92.50, G2: 98.00, "G#2": 103.83,
  A2: 110.00, "A#2": 116.54, B2: 123.47,
  C3: 130.81, "C#3": 138.59, D3: 146.83, "D#3": 155.56,
  E3: 164.81, F3: 174.61, "F#3": 185.00, G3: 196.00,
  "G#3": 207.65, A3: 220.00, "A#3": 233.08, B3: 246.94,
  C4: 261.63, "C#4": 277.18, D4: 293.66, "D#4": 311.13,
  E4: 329.63, F4: 349.23, "F#4": 369.99, G4: 392.00,
  "G#4": 415.30, A4: 440.00, "A#4": 466.16, B4: 493.88,
};

window.PianoApp.audioCtx = null;
window.PianoApp._reverbNode = null;

// ─── SoundFont State ─────────────────────────────────────────────────────────

window.PianoApp._sf = {
  loading: false,
  loaded: false,
  data: null,
  buffers: {},
  decoding: new Set(),
};

// ─── Audio Context & Reverb ──────────────────────────────────────────────────

window.PianoApp.initAudio = function () {
  if (!window.PianoApp.audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    window.PianoApp.audioCtx = new AudioContext();
  }
  if (window.PianoApp.audioCtx.state === "suspended") {
    window.PianoApp.audioCtx.resume();
  }
  if (!window.PianoApp._reverbNode && window.PianoApp.audioCtx) {
    window.PianoApp._reverbNode = window.PianoApp._createReverb();
  }
  window.PianoApp._ensureSoundfont();
};

window.PianoApp._createReverb = function () {
  const ctx = window.PianoApp.audioCtx;
  const rate = ctx.sampleRate;
  const length = rate * 1.2;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.2);
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = impulse;
  const wet = ctx.createGain();
  wet.gain.value = 0.12;
  conv.connect(wet);
  wet.connect(ctx.destination);
  return conv;
};

// ─── SoundFont Loader ────────────────────────────────────────────────────────

window.PianoApp._ensureSoundfont = function () {
  if (window.PianoApp._sf.loading || window.PianoApp._sf.loaded) return;
  window.PianoApp._sf.loading = true;

  const script = document.createElement("script");
  script.src = "assets/soundfonts/acoustic_grand_piano-mp3.js";
  script.onload = function () {
    window.PianoApp._sf.loading = false;
    const sf =
      window.MIDI &&
      window.MIDI.Soundfont &&
      window.MIDI.Soundfont.acoustic_grand_piano;
    if (sf) {
      window.PianoApp._sf.loaded = true;
      window.PianoApp._sf.data = sf;
      window.PianoApp._preloadSamples([
        "C2","D2","E2","F2","Gb2","G2","Ab2","A2","Bb2","B2",
        "C3","Db3","D3","Eb3","E3","F3","Gb3","G3","Ab3","A3","Bb3","B3",
        "C4","Db4","D4","Eb4","E4","F4","Gb4","G4","Ab4","A4","Bb4","B4",
        "C5","D5","E5","F5","G5","A5","B5","C6","D6","E6","F6","G6","C7",
      ]);
    } else {
      console.warn(
        "SoundFont script loaded but acoustic_grand_piano data not found"
      );
    }
  };
  script.onerror = function () {
    window.PianoApp._sf.loading = false;
    console.warn("SoundFont failed to load");
  };
  document.head.appendChild(script);
};

window.PianoApp._decodeSample = function (note) {
  const sf = window.PianoApp._sf;
  return new Promise(function (resolve) {
    if (!sf.loaded || !sf.data) {
      resolve(null);
      return;
    }
    if (sf.buffers[note]) {
      resolve(sf.buffers[note]);
      return;
    }
    if (sf.decoding.has(note)) {
      resolve(null);
      return;
    }

    const dataUri = sf.data[note];
    if (!dataUri) {
      resolve(null);
      return;
    }

    sf.decoding.add(note);

    try {
      const base64 = dataUri.split(",")[1];
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      window.PianoApp.audioCtx.decodeAudioData(
        bytes.buffer,
        function (buffer) {
          sf.buffers[note] = buffer;
          sf.decoding.delete(note);
          resolve(buffer);
        },
        function () {
          sf.decoding.delete(note);
          resolve(null);
        }
      );
    } catch (e) {
      sf.decoding.delete(note);
      resolve(null);
    }
  });
};

window.PianoApp._preloadSamples = function (notes) {
  notes.forEach(function (note) {
    window.PianoApp._decodeSample(note);
  });
};

// ─── Sample Player ───────────────────────────────────────────────────────────

window.PianoApp._playSample = function (note, startTime, duration, velocity) {
  const ctx = window.PianoApp.audioCtx;
  const buffer = window.PianoApp._sf.buffers[note];
  if (!buffer) return null;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  const v = Math.max(0, Math.min(1, velocity || 0.45));

  // Ultra-short attack to avoid clicks while preserving natural sample attack
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(v, startTime + 0.003);

  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  dry.connect(ctx.destination);

  source.connect(gain);
  gain.connect(dry);

  if (window.PianoApp._reverbNode) {
    gain.connect(window.PianoApp._reverbNode);
  }

  source.start(startTime);
  // Let the sample decay naturally — do NOT schedule an artificial stop.
  // The piano sample already contains authentic ADSR envelope.
  // This allows notes to ring and overlap like a real piano with sustain.

  return {
    stop: function (when) {
      const t = when || ctx.currentTime;
      try {
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        source.stop(t + 0.12);
      } catch (e) {}
    },
  };
};

// ─── Synthesized Voice (fallback) ────────────────────────────────────────────

window.PianoApp._buildVoice = function (freq, startTime, dur, velocity) {
  const ctx = window.PianoApp.audioCtx;
  const gain = velocity || 0.45;

  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  dry.connect(ctx.destination);

  if (window.PianoApp._reverbNode) {
    dry.connect(window.PianoApp._reverbNode);
  }

  const harmonics = [
    { ratio: 1, amp: 1.0 },
    { ratio: 2, amp: 0.38 },
    { ratio: 3, amp: 0.15 },
    { ratio: 4, amp: 0.08 },
    { ratio: 5, amp: 0.04 },
  ];

  const oscNodes = [];
  const gainNodes = [];

  harmonics.forEach(function (h) {
    const osc = ctx.createOscillator();
    const detune = h.ratio === 1 ? 0 : (Math.random() - 0.5) * 3;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * h.ratio, startTime);
    osc.detune.setValueAtTime(detune, startTime);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gain * h.amp, startTime + 0.008);
    const decayTime = 0.8 / h.ratio;
    const sustainLevel = gain * h.amp * (h.ratio === 1 ? 0.5 : 0.2 / h.ratio);
    g.gain.exponentialRampToValueAtTime(
      Math.max(sustainLevel, 0.001),
      startTime + decayTime
    );
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur - 0.04);
    g.gain.linearRampToValueAtTime(0, startTime + dur);

    osc.connect(g);
    g.connect(dry);
    oscNodes.push(osc);
    gainNodes.push(g);
  });

  const noiseLen = Math.floor(ctx.sampleRate * 0.025);
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, startTime);
  noiseGain.gain.linearRampToValueAtTime(gain * 0.12, startTime + 0.003);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(freq * 4, startTime);
  bp.Q.setValueAtTime(1.5, startTime);
  noise.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(dry);

  oscNodes.forEach(function (o) {
    o.start(startTime);
    o.stop(startTime + dur + 0.01);
  });
  noise.start(startTime);
  noise.stop(startTime + 0.05);

  return {
    stop: function (when) {
      const t = when || ctx.currentTime;
      oscNodes.forEach(function (o) {
        try {
          o.stop(t + 0.01);
        } catch (e) {}
      });
      gainNodes.forEach(function (g) {
        try {
          g.gain.cancelScheduledValues(t);
          g.gain.setValueAtTime(g.gain.value, t);
          g.gain.linearRampToValueAtTime(0, t + 0.05);
        } catch (e) {}
      });
    },
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

window.PianoApp.noteToMidi = function (note) {
  const notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const match = note.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 60;
  const noteName = match[1];
  const octave = parseInt(match[2], 10);
  const noteIndex = notes.indexOf(noteName);
  if (noteIndex === -1) return 60;
  return noteIndex + (octave + 1) * 12;
};

window.PianoApp.midiToNote = function (midi) {
  const notes = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return notes[noteIndex] + octave;
};

window.PianoApp._toSfNote = function (note) {
  return note
    .replace("C#", "Db")
    .replace("D#", "Eb")
    .replace("F#", "Gb")
    .replace("G#", "Ab")
    .replace("A#", "Bb");
};

// ─── Public API ──────────────────────────────────────────────────────────────

window.PianoApp.playNote = function (note) {
  window.PianoApp.initAudio();
  const ctx = window.PianoApp.audioCtx;
  const sfNote = window.PianoApp._toSfNote(note);

  if (window.PianoApp._sf.buffers[sfNote]) {
    return window.PianoApp._playSample(sfNote, ctx.currentTime, 1.4, 0.45);
  }

  if (
    window.PianoApp._sf.loaded &&
    window.PianoApp._sf.data &&
    window.PianoApp._sf.data[sfNote]
  ) {
    window.PianoApp._decodeSample(sfNote);
  }

  const freq = window.PianoApp.noteFrequencies[note];
  if (!freq) return null;
  return window.PianoApp._buildVoice(freq, ctx.currentTime, 1.4, 0.45);
};

window.PianoApp.playNoteMidi = function (midi, durationMs, when, velocity) {
  window.PianoApp.initAudio();
  const ctx = window.PianoApp.audioCtx;
  const note = window.PianoApp.midiToNote(midi);

  const start = when || ctx.currentTime;
  const dur = Math.max(durationMs / 1000, 0.05);
  const vel = velocity != null ? velocity : 0.45;

  if (window.PianoApp._sf.buffers[note]) {
    return window.PianoApp._playSample(note, start, dur, vel);
  }

  if (
    window.PianoApp._sf.loaded &&
    window.PianoApp._sf.data &&
    window.PianoApp._sf.data[note]
  ) {
    window.PianoApp._decodeSample(note);
  }

  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  return window.PianoApp._buildVoice(freq, start, dur, vel);
};
