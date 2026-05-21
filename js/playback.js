window.PianoApp = window.PianoApp || {};

window.PianoApp.Playback = (function () {
  var MIN_VIS = 90;
  // Chunked scheduling: only create audio nodes for events within this
  // look-ahead window (seconds). Re-check every SCHEDULE_INTERVAL_MS to
  // schedule the next chunk. This avoids creating thousands of
  // AudioBufferSourceNodes + setTimeout calls upfront for long recordings.
  var SCHEDULE_AHEAD_S = 2;
  var SCHEDULE_INTERVAL_MS = 500;

  var playing = false;
  var timers = [];
  var scheduleTimer = null;
  var endTimer = null;
  var progressTimer = null;
  var recording = null;
  var totalDur = 0;
  var startCtxTime = 0;
  var startWallTime = 0;
  var nextIdx = 0;
  var onProgressCb = null;
  var onEndCb = null;
  var sounds = [];

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    if (scheduleTimer) {
      clearTimeout(scheduleTimer);
      scheduleTimer = null;
    }
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
    nextIdx = 0;
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

  function scheduleChunk() {
    if (!playing || !recording) return;
    var ctx = window.PianoApp.audioCtx;
    if (!ctx) return;
    var events = recording.ev;
    var aheadTime = ctx.currentTime + SCHEDULE_AHEAD_S;
    var elapsedMs = (ctx.currentTime - startCtxTime) * 1000;
    var i, j, ev, noteStart, visDelay, offDelay;

    while (nextIdx < events.length) {
      ev = events[nextIdx];
      if (ev.v <= 0) { nextIdx++; continue; }

      noteStart = startCtxTime + ev.d / 1000;
      if (noteStart > aheadTime) break;

      // Audio
      var sound = window.PianoApp.playNoteMidi(
        window.PianoApp.noteToMidi(ev.n),
        1400,
        noteStart,
        ev.v,
        null
      );
      if (sound) sounds.push(sound);

      // Visual press
      visDelay = ev.d - elapsedMs;
      if (visDelay < 0) visDelay = 0;
      timers.push(setTimeout(pressKey.bind(null, ev.n), visDelay));

      // Visual release: find matching noteOff
      offDelay = ev.d + MIN_VIS;
      for (j = nextIdx + 1; j < events.length; j++) {
        if (events[j].n === ev.n && events[j].v === 0) {
          offDelay = Math.max(events[j].d, ev.d + MIN_VIS);
          break;
        }
      }
      var relVisDelay = offDelay - elapsedMs;
      if (relVisDelay < 0) relVisDelay = 0;
      timers.push(setTimeout(releaseKey.bind(null, ev.n), relVisDelay));

      nextIdx++;
    }

    if (nextIdx < events.length && playing) {
      scheduleTimer = setTimeout(scheduleChunk, SCHEDULE_INTERVAL_MS);
    }
  }

  function play(rec, opts) {
    stop();
    if (!rec || !rec.ev || rec.ev.length === 0) return;
    recording = rec;
    playing = true;
    totalDur = rec.dur || 0;
    nextIdx = 0;
    onProgressCb = (opts && opts.onProgress) || null;
    onEndCb = (opts && opts.onEnd) || null;

    window.PianoApp.initAudio();
    var ctx = window.PianoApp.audioCtx;
    if (ctx && ctx.state === "suspended") ctx.resume();

    startCtxTime = ctx.currentTime;
    startWallTime = Date.now();

    scheduleChunk();

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
