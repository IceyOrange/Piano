window.PianoApp = window.PianoApp || {};

// ─── PostHog Analytics (proxy mode) ────────────────────────────────────────
// No PostHog JS SDK is loaded on the client. Instead, events are collected
// in-memory and flushed to /api/analytics (a Vercel serverless function
// that holds the real API key). The key never appears in the browser.
//
// Flush happens on:
//   • visibilitychange (tab switch / close)  — primary
//   • pagehide — fallback for older browsers
//   • beforeunload — last-resort fire-and-forget
//   • explicit flush() call

window.PianoApp.Analytics = (function () {
  var queue = [];
  var distinctId = null;
  var sessionId = null;
  var flushed = false;

  // ─── Identity ───────────────────────────────────────────────────────────
  // Generate a stable anonymous ID and persist it in localStorage so the
  // same visitor is recognised across sessions. No PII is stored.
  function getDistinctId() {
    if (distinctId) return distinctId;
    try {
      var stored = localStorage.getItem("ph_distinct_id");
      if (stored) {
        distinctId = stored;
        return distinctId;
      }
    } catch (e) { /* localStorage may be disabled */ }
    distinctId = "piano-" + Math.random().toString(36).slice(2, 10) +
                 Date.now().toString(36);
    try { localStorage.setItem("ph_distinct_id", distinctId); } catch (e) {}
    return distinctId;
  }

  function getSessionId() {
    if (sessionId) return sessionId;
    sessionId = "s-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
    return sessionId;
  }

  // ─── Core capture ───────────────────────────────────────────────────────
  function capture(event, properties) {
    queue.push({
      event: event,
      properties: Object.assign(
        { $current_url: window.location.href },
        properties || {}
      ),
    });
  }

  // ─── Flush ──────────────────────────────────────────────────────────────
  function flush(sync) {
    if (queue.length === 0) return;
    var payload = {
      distinctId: getDistinctId(),
      sessionId: getSessionId(),
      events: queue.slice(),
    };
    queue = [];

    var body = JSON.stringify(payload);

    if (sync) {
      // Fire-and-forget via sendBeacon (most reliable on unload).
      // Must wrap in a Blob with the correct Content-Type, otherwise
      // sendBeacon sends text/plain and the proxy rejects it (415).
      if (navigator.sendBeacon) {
        try {
          var blob = new Blob([body], { type: "application/json" });
          navigator.sendBeacon("/api/analytics", blob);
          return;
        } catch (e) { /* fall through to fetch */ }
      }
    }

    // Async fetch — best for visibilitychange / explicit flush
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      keepalive: true,
    }).catch(function () { /* silently ignore network errors */ });
  }

  // ─── Lifecycle listeners ────────────────────────────────────────────────
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      flush(true);
    }
  });

  window.addEventListener("pagehide", function () {
    flush(true);
  });

  window.addEventListener("beforeunload", function () {
    flush(true);
  });

  // ─── Domain-specific helpers ────────────────────────────────────────────
  //
  // 29 distinct events:
  //   24 piano keys  → e.g. "C3_short_click"
  //    3 nav keys    → e.g. "portfolio_long_click"
  //    1 canon play  → "canon_play"
  //    1 canon done  → "canon_completed"

  // Nav-key note → page label mapping (must match data.js navMappings)
  var navLabels = { C3: "portfolio", G3: "experience", B3: "about" };

  function keyClick(note) {
    capture(note + "_short_click");
  }

  function navLongClick(note) {
    var label = navLabels[note] || note;
    capture(label + "_long_click");
  }

  function canonPlay() {
    capture("canon_play");
  }

  function canonCompleted() {
    capture("canon_completed");
  }

  return {
    capture: capture,
    flush: flush,
    keyClick: keyClick,
    navLongClick: navLongClick,
    canonPlay: canonPlay,
    canonCompleted: canonCompleted,
  };
})();
