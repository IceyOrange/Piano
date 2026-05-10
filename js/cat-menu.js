window.PianoApp = window.PianoApp || {};

window.PianoApp.CatMenu = (function () {
  var menuEl = null;
  var submitEl = null;
  var ohCatRef = null;
  var mode = "idle"; // idle | countdown | recording | preview | playback
  var hideTimer = null;
  var recordingEvents = null;
  var recordingDuration = 0;

  var countdownEl = null;
  var controlBarEl = null;
  var playbackPanelEl = null;
  var timerInterval = null;
  var countdownTimeout = null;
  var previewResetTimeout = null;
  var menuRemoveTimeout = null;
  var openedByKeyboard = false; // true when showMenu was triggered via Enter/Space on the cat
  var previousFocus = null;     // saved before opening submit dialog so we can restore on close
  var lastRenderedKey = null;   // "<mode>|<lang>" — skip DOM rebuild if neither has changed
  var playbackEndTimer = null;  // resets mode → idle when community playback finishes naturally

  var MAX_MS = 381000; // 6:21 — must match server cap in api/recordings/submit.js

  // ─── Init ────────────────────────────────────
  function init(ohCat, overlaySvg) {
    ohCatRef = ohCat;
    var isMobile = window.matchMedia("(pointer: coarse)").matches;

    if (isMobile) {
      var longPressTimer = null;
      ohCat.addEventListener("touchstart", function () {
        // Visual "charging" feedback so the user can see that long-press is in
        // progress. Cleared on touchend / touchmove regardless of outcome.
        ohCat.classList.add("oh-cat-pressing");
        longPressTimer = setTimeout(function () {
          longPressTimer = null;
          ohCat.classList.remove("oh-cat-pressing");
          showMenu();
        }, 500);
      }, { passive: true });
      ohCat.addEventListener("touchend", function () {
        ohCat.classList.remove("oh-cat-pressing");
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
          if (window.PianoApp.Sequencer) window.PianoApp.Sequencer.toggle();
        }
      }, { passive: true });
      ohCat.addEventListener("touchmove", function () {
        ohCat.classList.remove("oh-cat-pressing");
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }, { passive: true });
    } else {
      ohCat.addEventListener("mouseenter", function () {
        clearTimeout(hideTimer);
        if (window.PianoApp.vinylCursorState) {
          window.PianoApp.vinylCursorState.catHover = true;
          if (window.PianoApp.updateVinylCursor) window.PianoApp.updateVinylCursor();
        }
        showMenu();
      });
      ohCat.addEventListener("mouseleave", function () {
        if (window.PianoApp.vinylCursorState) {
          window.PianoApp.vinylCursorState.catHover = false;
          if (window.PianoApp.updateVinylCursor) window.PianoApp.updateVinylCursor();
        }
        scheduleHide();
      });
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", function (e) {
      // R: toggle recording (not in input fields)
      if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (document.querySelector(".community-overlay") || submitEl) return;
        e.preventDefault();
        handleRecordToggle();
      }
      // Escape: cancel / close
      if (e.key === "Escape") {
        handleEscape();
      }
    });

    // Keep the menu glued to the cat when the layout shifts: scroll, window
    // resize, orientation flip. rAF-throttled so a flurry of events still
    // produces at most one reposition per frame, and the listener is a no-op
    // unless the menu is currently visible.
    var repositionPending = false;
    function scheduleReposition() {
      if (!menuEl || repositionPending) return;
      repositionPending = true;
      requestAnimationFrame(function () {
        repositionPending = false;
        if (menuEl) positionMenu();
      });
    }
    window.addEventListener("scroll", scheduleReposition, { passive: true });
    window.addEventListener("resize", scheduleReposition, { passive: true });
    window.addEventListener("orientationchange", scheduleReposition);
  }

  function handleRecordToggle() {
    if (mode === "idle") {
      startRecording();
      hideMenu();
    } else if (mode === "countdown") {
      cancelCountdown();
    } else if (mode === "recording") {
      finishRecording();
    } else if (mode === "preview") {
      // Discard the unsaved take and start a fresh one.
      discardRecording();
      startRecording();
      hideMenu();
    } else if (mode === "playback") {
      // Stop community playback and roll into a new recording.
      stopPlayback();
      startRecording();
      hideMenu();
    }
  }

  function handleEscape() {
    if (submitEl) {
      closeSubmitDialog();
      if (recordingEvents && recordingEvents.length > 0) showPlaybackPanel();
      return;
    }
    if (mode === "countdown") {
      cancelCountdown();
    } else if (mode === "recording") {
      finishRecording();
    } else if (mode === "preview") {
      discardRecording();
    } else if (mode === "playback") {
      stopPlayback();
    }
  }

  // ─── Cat Menu ────────────────────────────────
  function showMenu(opts) {
    if (opts && opts.fromKeyboard) openedByKeyboard = true;
    // A previous hide may have scheduled a DOM removal. Cancel it so the
    // existing element is reused instead of being yanked mid-transition.
    if (menuRemoveTimeout) {
      clearTimeout(menuRemoveTimeout);
      menuRemoveTimeout = null;
    }

    if (!menuEl) {
      menuEl = document.createElement("div");
      menuEl.className = "cat-menu";
      menuEl.setAttribute("role", "menu");
      menuEl.setAttribute("aria-label", t("cat.menu.aria"));
      menuEl.setAttribute("aria-hidden", "true");
      menuEl.style.opacity = "0";
      menuEl.style.transform = "scale(0.96) translateY(6px)";
      menuEl.style.pointerEvents = "none";
      lastRenderedKey = null; // fresh DOM, force a render
      document.body.appendChild(menuEl);

      menuEl.addEventListener("mouseenter", function () {
        clearTimeout(hideTimer);
      });
      menuEl.addEventListener("mouseleave", function () {
        scheduleHide();
      });
      menuEl.addEventListener("keydown", handleMenuKeydown);
    } else {
      menuEl.setAttribute("aria-label", t("cat.menu.aria"));
    }

    renderMenuItems();

    requestAnimationFrame(function () {
      positionMenu();
      requestAnimationFrame(function () {
        if (!menuEl) return;
        menuEl.setAttribute("aria-hidden", "false");
        menuEl.style.opacity = "1";
        menuEl.style.transform = "scale(1) translateY(0)";
        menuEl.style.pointerEvents = "auto";
        if (openedByKeyboard) {
          var firstItem = menuEl.querySelector('[role="menuitem"]');
          if (firstItem && firstItem.focus) firstItem.focus();
        }
      });
    });
  }

  function handleMenuKeydown(e) {
    if (!menuEl) return;
    var items = Array.prototype.slice.call(menuEl.querySelectorAll('[role="menuitem"]'));
    if (!items.length) return;
    var idx = items.indexOf(document.activeElement);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      var next = idx < 0 ? 0 : (idx + 1) % items.length;
      items[next].focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      var prev = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length;
      items[prev].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      hideMenu();
      if (ohCatRef && typeof ohCatRef.focus === "function") {
        try { ohCatRef.focus(); } catch (_) { /* SVG focus may throw on old browsers */ }
      }
    } else if (e.key === "Tab") {
      // Close on Tab so focus moves to the next page element naturally,
      // matching how a real menu disappears once it loses focus.
      hideMenu();
    }
  }

  function renderMenuItems() {
    if (!menuEl) return;
    // If neither the mode nor the language has changed since the last render,
    // the existing buttons are already correct — skip the DOM rebuild so a
    // stream of mouseenter events doesn't reset focus state every frame.
    var key = mode + "|" + getLang();
    if (key === lastRenderedKey && menuEl.firstChild) return;
    lastRenderedKey = key;
    menuEl.innerHTML = "";

    var items;
    var showCanon = mode !== "playback"; // Canon would conflict with community playback.

    if (mode === "recording" || mode === "countdown") {
      items = [
        { id: "stop-rec", label: t("cat.menu.stop"), icon: "⏹" },
      ];
    } else if (mode === "playback") {
      items = [
        { id: "stop-play", label: t("cat.menu.stopPlayback"), icon: "⏹" },
      ];
    } else {
      items = [
        { id: "record", label: t("cat.menu.record"), icon: "⏾" },
        { id: "community", label: t("cat.menu.community"), icon: "☰" },
      ];
    }

    var btns = items.map(function (item) {
      var btn = document.createElement("button");
      btn.className = "cat-menu-item";
      btn.setAttribute("data-action", item.id);
      btn.setAttribute("role", "menuitem");
      btn.setAttribute("tabindex", "-1");

      var iconSpan = document.createElement("span");
      iconSpan.className = "cat-menu-icon";
      iconSpan.textContent = item.icon;
      btn.appendChild(iconSpan);
      btn.appendChild(document.createTextNode(" " + item.label));

      btn.addEventListener("click", function () {
        handleAction(item.id);
      });
      return btn;
    });

    if (!showCanon) {
      btns.forEach(function (b) { menuEl.appendChild(b); });
      return;
    }

    // Canon block — visually one cell but two siblings for HTML legality
    // (an <a> may not nest inside a <button>).
    var canonWrap = document.createElement("div");
    canonWrap.className = "cat-menu-canon";
    canonWrap.setAttribute("data-action", "canon");

    var canonBtn = document.createElement("button");
    canonBtn.className = "cat-menu-canon-btn";
    canonBtn.setAttribute("role", "menuitem");
    canonBtn.setAttribute("tabindex", "-1");

    var canonIcon = document.createElement("span");
    canonIcon.className = "cat-menu-icon";
    canonIcon.textContent = "♫";

    var canonLabel = document.createElement("span");
    canonLabel.className = "cat-menu-label";
    canonLabel.textContent = t("cat.menu.canon");

    canonBtn.appendChild(canonIcon);
    canonBtn.appendChild(canonLabel);
    canonBtn.addEventListener("click", function () {
      if (window.PianoApp.Sequencer) window.PianoApp.Sequencer.toggle();
      hideMenu();
    });

    var sourceEl = document.createElement("a");
    sourceEl.className = "cat-menu-source";
    sourceEl.href = "https://www.bilibili.com/read/cv4079944/?opus_fallback=1";
    sourceEl.target = "_blank";
    sourceEl.rel = "noopener noreferrer";
    sourceEl.setAttribute("role", "menuitem");
    sourceEl.setAttribute("tabindex", "-1");
    sourceEl.textContent = t("cat.menu.canonSource");

    canonWrap.appendChild(canonBtn);
    canonWrap.appendChild(sourceEl);

    // Order: items[0] · canon (centered, default) · items[1]
    if (btns.length >= 1) menuEl.appendChild(btns[0]);
    menuEl.appendChild(canonWrap);
    if (btns.length >= 2) menuEl.appendChild(btns[1]);
  }

  function handleAction(id) {
    if (id === "record") {
      if (mode === "preview") discardRecording();
      startRecording();
      hideMenu();
    } else if (id === "stop-rec") {
      if (mode === "countdown") cancelCountdown();
      else finishRecording();
      hideMenu();
    } else if (id === "stop-play") {
      stopPlayback();
      hideMenu();
    } else if (id === "community") {
      hideMenu();
      if (window.PianoApp.Community) window.PianoApp.Community.show();
    }
  }

  function positionMenu() {
    if (!menuEl || !ohCatRef) return;
    var rect = ohCatRef.getBoundingClientRect();
    var gap = 6;
    var mh = menuEl.offsetHeight || 52;
    var mw = menuEl.offsetWidth || 280;

    // On portrait phones we rotate <body> 90deg via CSS so the keyboard fills
    // the screen sideways. That breaks position:fixed coords (transform-origin
    // becomes the body) and swaps the visual axes for descendants. Compute
    // placement in viewport space first, then map back to body-local style
    // coords on the way out.
    //
    // body.landscape-page is set unconditionally in HTML, but the rotate()
    // only kicks in inside a `(max-width: 1024px) and (orientation: portrait)`
    // media query. On desktop the class is present without an actual rotation,
    // so we must read the *computed* transform — the class alone is a lie.
    var bodyTransform = window.getComputedStyle(document.body).transform;
    var isLandscape = document.body.classList.contains("landscape-page") &&
                      bodyTransform && bodyTransform !== "none";
    var visualW = isLandscape ? mh : mw;
    var visualH = isLandscape ? mw : mh;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var spaceAbove = rect.top - gap;
    var spaceBelow = vh - rect.bottom - gap;
    var vy;
    if (spaceAbove >= visualH) {
      vy = rect.top - visualH - gap;
    } else if (spaceBelow >= visualH) {
      vy = rect.bottom + gap;
    } else {
      vy = spaceAbove >= spaceBelow ? gap : vh - visualH - gap;
    }

    // Don't cover the hint text that lives just below the cat. Stable
    // [data-role] is preferred; fall back to the legacy id-substring lookup
    // for safety in case the hint markup is regenerated.
    if (vy > rect.bottom) {
      var hintEl = document.querySelector('[data-role="cat-hint"]') ||
                   document.querySelector('g[id*="Click the Cat"]');
      if (hintEl) {
        var hintTop = hintEl.getBoundingClientRect().top;
        if (vy + visualH + 4 > hintTop) {
          vy = Math.max(rect.bottom + 2, hintTop - visualH - 4);
        }
      }
    }

    var vx = rect.left + rect.width / 2 - visualW / 2;
    vx = Math.max(8, Math.min(vx, vw - visualW - 8));

    var top, left;
    if (!isLandscape) {
      top = vy;
      left = vx;
    } else {
      // body has transform: rotate(90deg). Body-local (px, py) maps to
      // viewport (vw - py, px). Menu of body-local size (mw, mh) appears
      // visually as (mh × mw) at viewport TL (vw - Y - mh, X), so:
      //   X = vy
      //   Y = vw - vx - mh
      left = vy;
      top = vw - vx - mh;
    }

    menuEl.style.top = top + "px";
    menuEl.style.left = left + "px";
  }

  function scheduleHide() {
    hideTimer = setTimeout(function () {
      hideMenu();
    }, 300);
  }

  function hideMenu() {
    if (!menuEl) return;
    menuEl.style.opacity = "0";
    menuEl.style.transform = "scale(0.96) translateY(6px)";
    menuEl.style.pointerEvents = "none";
    menuEl.setAttribute("aria-hidden", "true");
    openedByKeyboard = false;

    // Free the DOM after the fade-out completes. Use a setTimeout instead of
    // transitionend because the latter fires per property (and may not fire
    // at all if the browser collapses identical values).
    if (menuRemoveTimeout) clearTimeout(menuRemoveTimeout);
    var elToRemove = menuEl;
    menuRemoveTimeout = setTimeout(function () {
      menuRemoveTimeout = null;
      // Bail out if showMenu replaced/reused menuEl in the meantime.
      if (elToRemove !== menuEl) return;
      if (elToRemove.parentNode) elToRemove.parentNode.removeChild(elToRemove);
      menuEl = null;
    }, 250);
  }

  // ─── Recording Flow ──────────────────────────
  function startRecording() {
    if (mode === "playback") {
      if (window.PianoApp.Playback) window.PianoApp.Playback.stop();
      mode = "idle";
    }
    if (mode !== "idle") return;
    if (window.PianoApp.Sequencer && window.PianoApp.Sequencer.isPlaying) {
      window.PianoApp.Sequencer.pause();
    }
    mode = "countdown";
    showCountdown(function () {
      mode = "recording";
      if (window.PianoApp.Recorder) {
        window.PianoApp.Recorder.start(function () {
          finishRecording();
        });
      }
      showControlBar();
    });
  }

  function cancelCountdown() {
    if (mode !== "countdown") return;
    mode = "idle";
    if (countdownEl) {
      countdownEl.parentNode.removeChild(countdownEl);
      countdownEl = null;
    }
    if (countdownTimeout) {
      clearTimeout(countdownTimeout);
      countdownTimeout = null;
    }
  }

  function finishRecording() {
    if (mode !== "recording") return;
    mode = "preview";
    if (window.PianoApp.Recorder) {
      // Capture duration BEFORE stop() — stop() flips the recording flag,
      // after which getDurationMs() returns 0.
      recordingDuration = window.PianoApp.Recorder.getDurationMs();
      recordingEvents = window.PianoApp.Recorder.stop();
    }
    hideControlBar();
    if (recordingEvents && recordingEvents.length > 0) {
      showPlaybackPanel();
    } else {
      mode = "idle";
      recordingEvents = null;
      recordingDuration = 0;
    }
  }

  function discardRecording() {
    if (window.PianoApp.Playback && window.PianoApp.Playback.isPlaying) {
      window.PianoApp.Playback.stop();
    }
    clearPreviewResetTimeout();
    hidePlaybackPanel();
    recordingEvents = null;
    recordingDuration = 0;
    mode = "idle";
  }

  function shareFromPlayback() {
    if (window.PianoApp.Playback && window.PianoApp.Playback.isPlaying) {
      window.PianoApp.Playback.stop();
    }
    clearPreviewResetTimeout();
    hidePlaybackPanel();
    showSubmitDialog();
  }

  // ─── Countdown ───────────────────────────────
  function showCountdown(onComplete) {
    countdownEl = document.createElement("div");
    countdownEl.className = "recording-countdown";

    var numEl = document.createElement("div");
    numEl.className = "countdown-number";
    countdownEl.appendChild(numEl);

    // Sub-hint that explains why the canon went quiet — startRecording pauses
    // the sequencer before the countdown begins, which can be jarring without
    // an explanation.
    if (window.PianoApp.Sequencer) {
      var hintEl = document.createElement("div");
      hintEl.className = "countdown-hint";
      hintEl.textContent = t("countdown.hint");
      countdownEl.appendChild(hintEl);
    }

    // Skip button: lets impatient users (and tests) bypass the 3-second wait.
    var skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "countdown-skip";
    skipBtn.textContent = t("cat.menu.skip");
    skipBtn.addEventListener("click", function () {
      // Force the next tick to enter the "<= 0" branch on the very next frame.
      count = 0;
      if (countdownTimeout) {
        clearTimeout(countdownTimeout);
        countdownTimeout = null;
      }
      tick();
    });
    countdownEl.appendChild(skipBtn);

    document.body.appendChild(countdownEl);

    var count = 3;
    function tick() {
      if (!countdownEl || mode !== "countdown") return;
      if (count <= 0) {
        if (countdownEl && countdownEl.parentNode) countdownEl.parentNode.removeChild(countdownEl);
        countdownEl = null;
        onComplete();
        return;
      }
      numEl.textContent = count;
      numEl.classList.remove("countdown-animate");
      void numEl.offsetWidth;
      numEl.classList.add("countdown-animate");
      count--;
      countdownTimeout = setTimeout(tick, 1000);
    }
    tick();
  }

  // ─── Control Bar ─────────────────────────────
  function showControlBar() {
    var wrapper = document.querySelector(".piano-wrapper");
    if (!wrapper) return;

    controlBarEl = document.createElement("div");
    controlBarEl.className = "floating-bar recording-bar";

    var dot = document.createElement("span");
    dot.className = "rec-bar-dot";

    var label = document.createElement("span");
    label.className = "rec-bar-label";
    label.textContent = t("rec.bar.label");

    var timer = document.createElement("span");
    timer.className = "rec-bar-timer";
    timer.textContent = "00:00 / " + formatTimer(MAX_MS);

    var stopBtn = document.createElement("button");
    stopBtn.className = "rec-bar-stop";
    stopBtn.textContent = t("rec.bar.stop");
    stopBtn.addEventListener("click", function () {
      finishRecording();
    });

    var progress = document.createElement("div");
    progress.className = "rec-bar-progress";
    var fill = document.createElement("div");
    fill.className = "rec-bar-progress-fill";
    progress.appendChild(fill);

    controlBarEl.appendChild(dot);
    controlBarEl.appendChild(label);
    controlBarEl.appendChild(timer);
    controlBarEl.appendChild(stopBtn);
    controlBarEl.appendChild(progress);

    wrapper.appendChild(controlBarEl);
    startTimer();
  }

  function hideControlBar() {
    stopTimer();
    fadeOutAndRemove(controlBarEl, "is-leaving", 220);
    controlBarEl = null;
  }

  function startTimer() {
    stopTimer();
    timerInterval = setInterval(updateTimer, 250);
    updateTimer();
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimer() {
    if (!controlBarEl || !window.PianoApp.Recorder) return;
    var elapsed = window.PianoApp.Recorder.getDurationMs();
    var timerEl = controlBarEl.querySelector(".rec-bar-timer");
    var fillEl = controlBarEl.querySelector(".rec-bar-progress-fill");

    if (timerEl) timerEl.textContent = formatTimer(elapsed) + " / " + formatTimer(MAX_MS);
    if (fillEl) fillEl.style.width = Math.min(100, (elapsed / MAX_MS) * 100) + "%";

    if (elapsed > MAX_MS - 10000) {
      controlBarEl.classList.add("warning");
    } else {
      controlBarEl.classList.remove("warning");
    }
  }

  // ─── Playback Panel ──────────────────────────
  function showPlaybackPanel() {
    var wrapper = document.querySelector(".piano-wrapper");
    if (!wrapper) return;

    playbackPanelEl = document.createElement("div");
    playbackPanelEl.className = "floating-bar playback-panel";

    var info = document.createElement("span");
    info.className = "playback-info";
    info.textContent = "♪ " + formatTimer(recordingDuration) + " " + t("rec.recorded");

    var previewBtn = document.createElement("button");
    previewBtn.className = "playback-btn playback-preview";
    previewBtn.textContent = t("rec.preview");

    var discardBtn = document.createElement("button");
    discardBtn.className = "playback-btn playback-discard";
    discardBtn.textContent = t("rec.discard");

    var shareBtn = document.createElement("button");
    shareBtn.className = "playback-btn playback-share";
    shareBtn.textContent = t("rec.share");

    // Progress bar — reuses the recording-bar styles. Pinned to the bottom
    // edge of the floating bar; fill width is driven by Playback.onProgress.
    var progress = document.createElement("div");
    progress.className = "rec-bar-progress";
    var fill = document.createElement("div");
    fill.className = "rec-bar-progress-fill";
    fill.style.width = "0%";
    progress.appendChild(fill);

    var isPreviewing = false;

    function resetPreviewBtn() {
      isPreviewing = false;
      if (previewBtn) {
        previewBtn.textContent = t("rec.preview");
        previewBtn.classList.remove("playing");
      }
      if (fill) fill.style.width = "0%";
    }

    previewBtn.addEventListener("click", function () {
      if (!isPreviewing) {
        isPreviewing = true;
        previewBtn.textContent = t("rec.previewStop");
        previewBtn.classList.add("playing");
        if (window.PianoApp.Playback && recordingEvents) {
          window.PianoApp.Playback.play(
            { ev: recordingEvents, dur: recordingDuration },
            {
              onProgress: function (ratio) {
                if (fill) fill.style.width = (ratio * 100) + "%";
              },
              onEnd: function () {
                clearPreviewResetTimeout();
                resetPreviewBtn();
              },
            }
          );
        }
        previewResetTimeout = setTimeout(function () {
          previewResetTimeout = null;
          resetPreviewBtn();
        }, recordingDuration + 800);
      } else {
        clearPreviewResetTimeout();
        if (window.PianoApp.Playback) window.PianoApp.Playback.stop();
        resetPreviewBtn();
      }
    });

    discardBtn.addEventListener("click", function () {
      clearPreviewResetTimeout();
      discardRecording();
    });

    shareBtn.addEventListener("click", function () {
      clearPreviewResetTimeout();
      shareFromPlayback();
    });

    playbackPanelEl.appendChild(info);
    playbackPanelEl.appendChild(previewBtn);
    playbackPanelEl.appendChild(discardBtn);
    playbackPanelEl.appendChild(shareBtn);
    playbackPanelEl.appendChild(progress);

    wrapper.appendChild(playbackPanelEl);
  }

  function hidePlaybackPanel() {
    fadeOutAndRemove(playbackPanelEl, "is-leaving", 220);
    playbackPanelEl = null;
  }

  function clearPreviewResetTimeout() {
    if (previewResetTimeout) {
      clearTimeout(previewResetTimeout);
      previewResetTimeout = null;
    }
  }

  // ─── Submit Dialog ───────────────────────────
  function showSubmitDialog() {
    // Remember where focus was before we steal it, so closing the dialog
    // doesn't strand keyboard users at the top of the page.
    previousFocus = document.activeElement;
    submitEl = document.createElement("div");
    submitEl.className = "submit-overlay";
    submitEl.setAttribute("role", "dialog");
    submitEl.setAttribute("aria-modal", "true");

    var dialog = document.createElement("div");
    dialog.className = "submit-dialog";

    var durText = formatTimer(recordingDuration);
    var info = document.createElement("div");
    info.className = "submit-info";
    info.textContent = durText + " " + t("rec.recorded");

    var input = document.createElement("input");
    input.type = "text";
    input.className = "submit-name";
    input.placeholder = t("submit.placeholder");
    input.maxLength = 30;

    var titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "submit-name submit-title";
    titleInput.placeholder = t("submit.titlePlaceholder");
    titleInput.maxLength = 50;

    var actions = document.createElement("div");
    actions.className = "submit-actions";

    var discardBtn = document.createElement("button");
    discardBtn.className = "submit-btn submit-discard";
    discardBtn.textContent = t("submit.discard");
    discardBtn.addEventListener("click", function () {
      closeSubmitDialog();
      discardRecording();
    });

    var shareBtn = document.createElement("button");
    shareBtn.className = "submit-btn submit-share";
    shareBtn.textContent = t("submit.share");
    shareBtn.addEventListener("click", function () {
      var title = titleInput.value.trim();
      if (!title) {
        titleInput.focus();
        titleInput.classList.add("submit-name-error");
        setTimeout(function () { titleInput.classList.remove("submit-name-error"); }, 1000);
        return;
      }
      shareBtn.disabled = true;
      shareBtn.textContent = t("submit.sharing");
      var name = input.value.trim() || undefined;
      if (window.PianoApp.Community) {
        window.PianoApp.Community.submitRecording(name, title, recordingEvents, recordingDuration)
          .then(function (result) {
            if (result && result.ok) {
              closeSubmitDialog();
              recordingEvents = null;
              recordingDuration = 0;
              mode = "idle";
            } else {
              shareBtn.disabled = false;
              shareBtn.textContent = t("submit.share");
              showError(dialog, mapSubmitError(result));
            }
          })
          .catch(function () {
            shareBtn.disabled = false;
            shareBtn.textContent = t("submit.share");
            showError(dialog, t("submit.error.network"));
          });
      }
    });

    actions.appendChild(discardBtn);
    actions.appendChild(shareBtn);

    dialog.appendChild(info);
    dialog.appendChild(input);
    dialog.appendChild(titleInput);
    dialog.appendChild(actions);
    submitEl.appendChild(dialog);

    submitEl.addEventListener("click", function (e) {
      if (e.target === submitEl) {
        closeSubmitDialog();
        if (recordingEvents && recordingEvents.length > 0) showPlaybackPanel();
      }
    });

    document.body.appendChild(submitEl);
    titleInput.focus();
  }

  function showError(dialog, msg) {
    var existing = dialog.querySelector(".submit-error");
    if (existing) existing.parentNode.removeChild(existing);
    var errEl = document.createElement("div");
    errEl.className = "submit-error";
    errEl.textContent = msg;
    dialog.appendChild(errEl);
  }

  function closeSubmitDialog() {
    if (submitEl) {
      fadeOutAndRemove(submitEl, "is-leaving", 200);
      submitEl = null;
    }
    if (previousFocus && typeof previousFocus.focus === "function") {
      try { previousFocus.focus(); } catch (_) { /* element may be gone */ }
    }
    previousFocus = null;
  }

  // ─── Community Playback ──────────────────────
  function startPlayback(rec) {
    resetAll();
    mode = "playback";
    if (window.PianoApp.Playback) {
      window.PianoApp.Playback.play(rec);
    }
    // Playback.play() doesn't notify us when it finishes naturally, so set a
    // timer that mirrors the recording duration plus a small grace period.
    // If the user calls stopPlayback() first we cancel it; otherwise this
    // flips us back to idle so the cat menu shows the right items again.
    if (playbackEndTimer) clearTimeout(playbackEndTimer);
    var dur = (rec && typeof rec.dur === "number") ? rec.dur : 0;
    if (dur > 0) {
      playbackEndTimer = setTimeout(function () {
        playbackEndTimer = null;
        if (mode === "playback") {
          mode = "idle";
          lastRenderedKey = null; // force the next render to refresh the items
        }
      }, dur + 700);
    }
  }

  function stopPlayback() {
    if (mode !== "playback") return;
    mode = "idle";
    if (playbackEndTimer) {
      clearTimeout(playbackEndTimer);
      playbackEndTimer = null;
    }
    if (window.PianoApp.Playback) window.PianoApp.Playback.stop();
  }

  function resetAll() {
    if (countdownEl) { countdownEl.parentNode.removeChild(countdownEl); countdownEl = null; }
    if (countdownTimeout) { clearTimeout(countdownTimeout); countdownTimeout = null; }
    if (playbackEndTimer) { clearTimeout(playbackEndTimer); playbackEndTimer = null; }
    clearPreviewResetTimeout();
    hideControlBar();
    hidePlaybackPanel();
    if (window.PianoApp.Recorder && window.PianoApp.Recorder.isRecording) {
      window.PianoApp.Recorder.stop();
    }
    if (window.PianoApp.Playback && window.PianoApp.Playback.isPlaying) {
      window.PianoApp.Playback.stop();
    }
    recordingEvents = null;
    recordingDuration = 0;
    mode = "idle";
  }

  // ─── Utilities ───────────────────────────────
  function getLang() {
    return (window.PianoApp.i18n && window.PianoApp.i18n.getLang)
      ? window.PianoApp.i18n.getLang()
      : "en";
  }

  function t(key) {
    return (window.PianoApp.i18n && window.PianoApp.i18n.t)
      ? window.PianoApp.i18n.t(key)
      : key;
  }

  function mapSubmitError(result) {
    // The /api/recordings/submit handler returns:
    //   200/201 → { ok: true, id }
    //   4xx/5xx → { error: "<english string>" }
    // Map a few well-known server messages to localized strings; fall back to
    // a generic "Failed" rather than echoing English at zh users.
    var msg = (result && typeof result.error === "string") ? result.error : "";
    if (/Rate limit/i.test(msg))      return t("submit.error.rateLimit");
    if (/Duration must be/i.test(msg)) return t("submit.error.tooLong");
    return t("submit.error.failed");
  }

  function formatTimer(ms) {
    var totalSec = Math.floor((ms || 0) / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  // Add a CSS animation class, then unmount once the animation has had time
  // to finish. Falls back to immediate removal if the element is no longer in
  // the DOM by the time we get here.
  function fadeOutAndRemove(el, leavingClass, ms) {
    if (!el) return;
    if (!el.parentNode) return;
    el.classList.add(leavingClass);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, ms || 200);
  }

  return {
    init: init,
    getMode: function () { return mode; },
    startRecording: startRecording,
    startPlayback: startPlayback,
    stopPlayback: stopPlayback,
    stopRecording: function () {
      if (mode === "countdown") cancelCountdown();
      else if (mode === "recording") finishRecording();
    },
    openMenuKeyboard: function () {
      clearTimeout(hideTimer);
      showMenu({ fromKeyboard: true });
    },
  };
})();
