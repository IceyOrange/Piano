window.PianoApp = window.PianoApp || {};

window.PianoApp.Playback = (function () {
  // Visuals: each noteOn schedules pressKeyVisual and releaseKeyVisual based on
  // the matching noteOff. Realtime takes can have sub-CSS-transition hold times,
  // so we floor visual hold at MIN_VIS ms so the press is always perceptible.
  var MIN_VIS = 90;

  var playing = false;
  var timers = [];
  var endTimer = null;
  var progressTimer = null;
  var recording = null;
  var totalDur = 0;
  var startWallTime = 0;
  var onProgressCb = null;
  var onEndCb = null;
  var sounds = [];

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    if (endTimer) {
      clearTimeout(endTimer);
      endTimer = null;
    }
    if (progressTimer) {
      clearTimeout(progressTimer);
      progressTimer = null;
    }
  }

  function stopSounds() {
    sounds.forEach(function (s) { if (s && s.stop) s.stop(); });
    sounds = [];
  }

  function stop() {
    var wasPlaying = playing;
    playing = false;
    clearTimers();
    stopSounds();
    recording = null;
    onProgressCb = null;
    onEndCb = null;
    if (wasPlaying && window.PianoApp.releaseAllKeysVisual) {
      window.PianoApp.releaseAllKeysVisual();
    }
    if (window.PianoApp.vinylCursorState) {
      window.PianoApp.vinylCursorState.playingCommunity = false;
      if (window.PianoApp.updateVinylCursor) window.PianoApp.updateVinylCursor();
    }
  }

  function play(rec, opts) {
    stop();
    if (!rec || !rec.ev || rec.ev.length === 0) return;
    recording = rec;
    playing = true;
    totalDur = rec.dur || 0;
    onProgressCb = (opts && opts.onProgress) || null;
    onEndCb = (opts && opts.onEnd) || null;

    window.PianoApp.initAudio();
    var ctx = window.PianoApp.audioCtx;
    if (ctx && ctx.state === "suspended") ctx.resume();

    var startCtxTime = ctx.currentTime;
    startWallTime = Date.now();

    var events = rec.ev;
    var i, j, ev, noteStart, offDelay;

    for (i = 0; i < events.length; i++) {
      ev = events[i];
      if (ev.v <= 0) continue;

      // Audio
      noteStart = startCtxTime + ev.d / 1000;
      var sound = window.PianoApp.playNoteMidi(
        window.PianoApp.noteToMidi(ev.n),
        1400,
        noteStart,
        ev.v,
        null
      );
      if (sound) sounds.push(sound);

      // Visual press
      timers.push(setTimeout(pressKey.bind(null, ev.n), ev.d));

      // Visual release: find the matching noteOff (same pitch, v == 0); fall
      // back to MIN_VIS after the press if no off was recorded (e.g. truncated
      // take). Either way, hold at least MIN_VIS so the user sees the keypress.
      offDelay = ev.d + MIN_VIS;
      for (j = i + 1; j < events.length; j++) {
        if (events[j].n === ev.n && events[j].v === 0) {
          offDelay = Math.max(events[j].d, ev.d + MIN_VIS);
          break;
        }
      }
      timers.push(setTimeout(releaseKey.bind(null, ev.n), offDelay));
    }

    // Auto-stop slightly after the recorded duration so a held final note has
    // time to ring out before we tear down the visuals.
    endTimer = setTimeout(function () {
      var cb = onEndCb;
      stop();
      if (cb) cb();
    }, totalDur + 500);

    if (window.PianoApp.vinylCursorState) {
      window.PianoApp.vinylCursorState.playingCommunity = true;
      if (window.PianoApp.updateVinylCursor) window.PianoApp.updateVinylCursor();
    }

    if (onProgressCb) tickProgress();
  }

  function pressKey(note) {
    if (!playing) return;
    if (window.PianoApp.pressKeyVisual) window.PianoApp.pressKeyVisual(note);
  }

  function releaseKey(note) {
    if (!playing) return;
    if (window.PianoApp.releaseKeyVisual) window.PianoApp.releaseKeyVisual(note);
  }

  function tickProgress() {
    if (!playing || !onProgressCb) return;
    var elapsed = Date.now() - startWallTime;
    var ratio = totalDur > 0 ? Math.min(1, elapsed / totalDur) : 0;
    try { onProgressCb(ratio, elapsed, totalDur); } catch (_) { /* swallow */ }
    if (elapsed < totalDur) {
      progressTimer = setTimeout(tickProgress, 80);
    }
  }

  function getElapsedMs() {
    if (!playing) return 0;
    return Date.now() - startWallTime;
  }

  function getDurationMs() {
    return totalDur;
  }

  return {
    get isPlaying() { return playing; },
    play: play,
    stop: stop,
    getElapsedMs: getElapsedMs,
    getDurationMs: getDurationMs,
  };
})();
