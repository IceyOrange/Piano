window.PianoApp = window.PianoApp || {};

window.PianoApp.Recorder = (function () {
  var recording = false;
  var startTime = 0;
  var events = [];
  var stopTimer = null;
  var MAX_MS = 381000; // 6:21
  var onAutoStop = null;

  function start(autoStopCb) {
    if (recording) return;
    recording = true;
    startTime = Date.now();
    events = [];
    onAutoStop = autoStopCb || null;
    stopTimer = setTimeout(function () {
      // auto-stop at 6:21
      var evts = stop();
      if (onAutoStop) onAutoStop(evts);
    }, MAX_MS);
  }

  function noteOn(note) {
    if (!recording) return;
    events.push({ d: Date.now() - startTime, n: note, v: 0.9 });
  }

  function noteOff(note) {
    if (!recording) return;
    events.push({ d: Date.now() - startTime, n: note, v: 0 });
  }

  function stop() {
    if (!recording) return [];
    recording = false;
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    var result = events;
    events = [];
    return result;
  }

  function getDurationMs() {
    if (!recording) return 0;
    return Date.now() - startTime;
  }

  return {
    get isRecording() { return recording; },
    start: start,
    noteOn: noteOn,
    noteOff: noteOff,
    stop: stop,
    getDurationMs: getDurationMs,
  };
})();
