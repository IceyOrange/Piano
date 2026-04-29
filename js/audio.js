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
  _decodeWaiters: {},
  _loadPromise: null,
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
  window.PianoApp._ensureSoundfont().then(function () {
    if (window.PianoApp.canonSequence && window.PianoApp.Sequencer) {
      window.PianoApp.Sequencer._predecodeSamples();
    }
  });
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
  const sf = window.PianoApp._sf;
  if (sf.loaded) return Promise.resolve();

  sf._loadPromise = new Promise(function (resolve, reject) {
    sf.loading = true;
    const script = document.createElement("script");
    script.src = "assets/soundfonts/acoustic_grand_piano-mp3.js";
    script.onload = function () {
      sf.loading = false;
      const sfData =
        window.MIDI &&
        window.MIDI.Soundfont &&
        window.MIDI.Soundfont.acoustic_grand_piano;
      if (sfData) {
        sf.loaded = true;
        sf.data = sfData;
        window.PianoApp._preloadSamples([
          "C2","D2","E2","F2","Gb2","G2","Ab2","A2","Bb2","B2",
          "C3","Db3","D3","Eb3","E3","F3","Gb3","G3","Ab3","A3","Bb3","B3",
          "C4","Db4","D4","Eb4","E4","F4","Gb4","G4","Ab4","A4","Bb4","B4",
          "C5","D5","E5","F5","G5","A5","B5","C6","D6","E6","F6","G6","C7",
        ]);
        resolve();
      } else {
        sf._loadPromise = null;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.warn(
            "SoundFont script loaded but acoustic_grand_piano data not found"
          );
        }
        reject(new Error("SoundFont data not found"));
      }
    };
    script.onerror = function () {
      sf.loading = false;
      sf._loadPromise = null;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn("SoundFont failed to load");
      }
      reject(new Error("SoundFont failed to load"));
    };
    document.head.appendChild(script);
  });

  return sf._loadPromise;
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
      const waiters = sf._decodeWaiters[note] || (sf._decodeWaiters[note] = []);
      waiters.push(resolve);
      return;
    }

    const dataUri = sf.data[note];
    if (!dataUri) {
      resolve(null);
      return;
    }

    sf.decoding.add(note);

    function finish(result) {
      sf.decoding.delete(note);
      resolve(result);
      const waiters = sf._decodeWaiters[note];
      if (waiters) {
        waiters.forEach(function (cb) { cb(result); });
        delete sf._decodeWaiters[note];
      }
    }

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
          finish(buffer);
        },
        function () {
          finish(null);
        }
      );
    } catch (e) {
      finish(null);
    }
  });
};

window.PianoApp._preloadSamples = function (notes) {
  var index = 0;
  function nextBatch() {
    var batch = 0;
    while (batch < 3 && index < notes.length) {
      window.PianoApp._decodeSample(notes[index]);
      index++;
      batch++;
    }
    if (index < notes.length) {
      setTimeout(nextBatch, 0);
    }
  }
  nextBatch();
};

// ─── Sample Player ───────────────────────────────────────────────────────────

window.PianoApp._playSample = function (note, startTime, duration, velocity, options) {
  const ctx = window.PianoApp.audioCtx;
  const buffer = window.PianoApp._sf.buffers[note];
  if (!buffer) return null;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  const v = Math.max(0, Math.min(1, velocity || 0.45));

  const isSustain = options && options.sustain;
  const perceptualDur = Math.max(duration || 1.4, 0.05);

  let stopTime;

  if (isSustain) {
    // Sustain pedal mode: let the sample decay naturally for rich resonance
    const maxDuration = Math.min(buffer.duration, 4.5);
    const decayStart = startTime + perceptualDur * 0.65;
    const decayEnd = startTime + maxDuration;
    stopTime = decayEnd + 0.1;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(v, startTime + 0.003);
    gain.gain.setValueAtTime(v, Math.max(decayStart, startTime + 0.004));
    // Slow natural decay — like a piano with sustain pedal
    gain.gain.exponentialRampToValueAtTime(0.001, decayEnd);
  } else {
    // Normal (melody) mode: clean articulation with gentle release
    const releaseStart = startTime + perceptualDur - 0.10;
    const releaseEnd = releaseStart + 0.18;
    stopTime = releaseEnd + 0.05;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(v, startTime + 0.003);
    gain.gain.setValueAtTime(v, Math.max(releaseStart, startTime + 0.004));
    gain.gain.exponentialRampToValueAtTime(0.001, releaseEnd);
  }

  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  dry.connect(ctx.destination);

  source.connect(gain);
  gain.connect(dry);

  if (window.PianoApp._reverbNode) {
    gain.connect(window.PianoApp._reverbNode);
  }

  source.start(startTime);
  source.stop(stopTime);

  return {
    stop: function (when) {
      const t = when || ctx.currentTime;
      try {
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        source.stop(t + 0.08);
      } catch (e) {}
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

// ─── Internal play dispatcher ────────────────────────────────────────────────

window.PianoApp._play = function (sfNote, freq, durationMs, when, velocity, options) {
  window.PianoApp.initAudio();
  const ctx = window.PianoApp.audioCtx;
  const start = when || ctx.currentTime;
  const dur = Math.max((durationMs != null ? durationMs : 1400) / 1000, 0.05);
  const vel = velocity != null ? velocity : 0.9;

  if (window.PianoApp._sf.buffers[sfNote]) {
    return window.PianoApp._playSample(sfNote, start, dur, vel, options);
  }

  if (
    window.PianoApp._sf.loaded &&
    window.PianoApp._sf.data &&
    window.PianoApp._sf.data[sfNote]
  ) {
    window.PianoApp._decodeSample(sfNote);
  }

  return null;
};

// ─── Public API ──────────────────────────────────────────────────────────────

window.PianoApp.playNote = function (note) {
  const sfNote = window.PianoApp._toSfNote(note);
  const freq = window.PianoApp.noteFrequencies[note];
  return window.PianoApp._play(sfNote, freq, 1400, null, 0.9);
};

window.PianoApp.playNoteMidi = function (midi, durationMs, when, velocity, options) {
  const note = window.PianoApp.midiToNote(midi);
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  return window.PianoApp._play(note, freq, durationMs, when, velocity, options);
};
