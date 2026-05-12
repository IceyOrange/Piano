window.PianoApp = window.PianoApp || {};

window.PianoApp.Community = (function () {
  var panel = null;
  var currentPlaybackId = null;
  var currentSort = "new"; // "new" or "hot"
  var nowPlayingBar = null;
  var npProgressFill = null;
  var npTimeEl = null;
  var npProgressTimer = null;

  function t(key) {
    return (window.PianoApp.i18n && window.PianoApp.i18n.t)
      ? window.PianoApp.i18n.t(key)
      : key;
  }

  function show() {
    if (panel) return;
    createPanel();
    document.body.appendChild(panel);
    fetchList();
  }

  function hide() {
    if (window.PianoApp.Playback && window.PianoApp.Playback.isPlaying) {
      window.PianoApp.Playback.stop();
    }
    if (window.PianoApp.FallingNotes) window.PianoApp.FallingNotes.stop();
    hideNowPlaying();
    currentPlaybackId = null;
    if (panel) {
      panel.style.opacity = "0";
      setTimeout(function () {
        if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
        panel = null;
      }, 250);
    }
  }

  function createPanel() {
    panel = document.createElement("div");
    panel.className = "community-overlay";

    var container = document.createElement("div");
    container.className = "community-panel";

    // Header
    var header = document.createElement("div");
    header.className = "community-header";
    var title = document.createElement("span");
    title.className = "community-title";
    title.textContent = t("community.title");

    // Sort toggle
    var sortWrap = document.createElement("div");
    sortWrap.className = "community-sort";
    var btnNew = document.createElement("button");
    btnNew.className = "community-sort-btn" + (currentSort === "new" ? " active" : "");
    btnNew.textContent = t("community.sortNew");
    btnNew.addEventListener("click", function () {
      if (currentSort === "new") return;
      currentSort = "new";
      btnNew.classList.add("active");
      btnHot.classList.remove("active");
      fetchList();
    });
    var btnHot = document.createElement("button");
    btnHot.className = "community-sort-btn" + (currentSort === "hot" ? " active" : "");
    btnHot.textContent = t("community.sortHot");
    btnHot.addEventListener("click", function () {
      if (currentSort === "hot") return;
      currentSort = "hot";
      btnHot.classList.add("active");
      btnNew.classList.remove("active");
      fetchList();
    });
    sortWrap.appendChild(btnNew);
    sortWrap.appendChild(btnHot);

    var closeBtn = document.createElement("button");
    closeBtn.className = "community-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", hide);
    header.appendChild(title);
    header.appendChild(sortWrap);
    header.appendChild(closeBtn);
    container.appendChild(header);

    // Content area
    var list = document.createElement("div");
    list.className = "community-list";
    list.innerHTML = '<div class="community-loading">' + t("community.loading") + "</div>";
    container.appendChild(list);

    panel.appendChild(container);
    panel.addEventListener("click", function (e) {
      if (e.target === panel) hide();
    });
  }

  function fetchList() {
    var listEl = panel ? panel.querySelector(".community-list") : null;
    if (!listEl) return;

    var url = "/api/recordings/list?limit=50";
    if (currentSort === "hot") url += "&sort=hot";
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.recordings || data.recordings.length === 0) {
          listEl.innerHTML = '<div class="community-empty">' + t("community.empty") + "</div>";
          return;
        }
        renderList(listEl, data.recordings);
      })
      .catch(function () {
        listEl.innerHTML = '<div class="community-error">' +
          t("community.error") +
          '<button class="community-retry">' +
          t("community.retry") +
          "</button></div>";
        var retryBtn = listEl.querySelector(".community-retry");
        if (retryBtn) retryBtn.addEventListener("click", function () {
          listEl.innerHTML = '<div class="community-loading">' + t("community.loading") + "</div>";
          fetchList();
        });
      });
  }

  function renderList(container, recordings) {
    container.innerHTML = "";
    recordings.forEach(function (rec) {
      var card = document.createElement("div");
      card.className = "community-card";
      card.setAttribute("data-id", rec.id);

      var info = document.createElement("div");
      info.className = "community-card-info";

      var nameEl = document.createElement("span");
      nameEl.className = "community-card-name";
      nameEl.textContent = rec.title;

      var meta = document.createElement("span");
      meta.className = "community-card-meta";
      var date = new Date(rec.ts);
      var dateStr = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();
      var durStr = formatDuration(rec.dur);
      var metaParts = [];
      if (rec.name) metaParts.push(rec.name);
      metaParts.push(dateStr + "  " + durStr);
      if (rec.plays > 0) metaParts.push("▶ " + rec.plays);
      meta.textContent = metaParts.join(" · ");

      info.appendChild(nameEl);
      info.appendChild(meta);

      var playBtn = document.createElement("button");
      playBtn.className = "community-play-btn";
      playBtn.innerHTML = "&#9654;";
      playBtn.addEventListener("click", function () {
        togglePlay(rec.id, playBtn, card);
      });

      var deleteBtn = document.createElement("button");
      deleteBtn.className = "community-delete-btn";
      deleteBtn.innerHTML = "&#128465;";
      deleteBtn.setAttribute("aria-label", t("community.delete"));
      deleteBtn.addEventListener("click", function () {
        showDeleteDialog(rec.id, card);
      });

      var actions = document.createElement("div");
      actions.className = "community-card-actions";
      actions.appendChild(playBtn);
      actions.appendChild(deleteBtn);

      // Per-card playback progress bar — pinned to the card's bottom edge,
      // hidden until this card is the active one.
      var progress = document.createElement("div");
      progress.className = "community-progress";
      var fill = document.createElement("div");
      fill.className = "community-progress-fill";
      progress.appendChild(fill);

      card.appendChild(info);
      card.appendChild(actions);
      card.appendChild(progress);
      container.appendChild(card);
    });
  }

  function showDeleteDialog(recId, card) {
    var overlay = document.createElement("div");
    overlay.className = "submit-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    var dialog = document.createElement("div");
    dialog.className = "submit-dialog";

    var info = document.createElement("div");
    info.className = "submit-info";
    info.textContent = t("community.deleteConfirm");

    var pwInput = document.createElement("input");
    pwInput.type = "password";
    pwInput.className = "submit-name";
    pwInput.placeholder = "Password";
    pwInput.maxLength = 30;

    var actions = document.createElement("div");
    actions.className = "submit-actions";

    var cancelBtn = document.createElement("button");
    cancelBtn.className = "submit-btn submit-discard";
    cancelBtn.textContent = t("submit.discard");
    cancelBtn.addEventListener("click", function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });

    var confirmBtn = document.createElement("button");
    confirmBtn.className = "submit-btn submit-share";
    confirmBtn.textContent = t("community.delete");
    confirmBtn.addEventListener("click", function () {
      var pw = pwInput.value.trim();
      if (!pw) {
        pwInput.focus();
        pwInput.classList.add("submit-name-error");
        setTimeout(function () { pwInput.classList.remove("submit-name-error"); }, 1000);
        return;
      }
      confirmBtn.disabled = true;
      confirmBtn.textContent = t("community.deleting");
      fetch("/api/recordings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recId, password: pw }),
      })
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (result && result.ok) {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (card && card.parentNode) card.parentNode.removeChild(card);
          } else {
            confirmBtn.disabled = false;
            confirmBtn.textContent = t("community.delete");
            showDialogError(dialog, t("community.deleteWrong"));
          }
        })
        .catch(function () {
          confirmBtn.disabled = false;
          confirmBtn.textContent = t("community.delete");
          showDialogError(dialog, t("community.deleteFailed"));
        });
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    dialog.appendChild(info);
    dialog.appendChild(pwInput);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    document.body.appendChild(overlay);
    pwInput.focus();
  }

  function showDialogError(dialog, msg) {
    var existing = dialog.querySelector(".submit-error");
    if (existing) existing.parentNode.removeChild(existing);
    var errEl = document.createElement("div");
    errEl.className = "submit-error";
    errEl.textContent = msg;
    dialog.appendChild(errEl);
  }

  function resetCardProgress(card) {
    if (!card) return;
    var fill = card.querySelector(".community-progress-fill");
    if (fill) fill.style.width = "0%";
    card.classList.remove("is-playing");
  }

  function togglePlay(id, btn, card) {
    // If same recording is playing, stop it
    if (currentPlaybackId === id && window.PianoApp.Playback.isPlaying) {
      window.PianoApp.Playback.stop();
      if (window.PianoApp.FallingNotes) window.PianoApp.FallingNotes.stop();
      hideNowPlaying();
      currentPlaybackId = null;
      btn.innerHTML = "&#9654;";
      btn.classList.remove("playing");
      resetCardProgress(card);
      return;
    }

    // Stop any previous playback
    if (window.PianoApp.Playback.isPlaying) {
      window.PianoApp.Playback.stop();
    }
    // Pause canon if playing
    if (window.PianoApp.Sequencer && window.PianoApp.Sequencer.isPlaying) {
      window.PianoApp.Sequencer.pause();
    }
    if (window.PianoApp.FallingNotes) window.PianoApp.FallingNotes.stop();
    hideNowPlaying();
    // Reset previous button + progress bar
    var prev = panel ? panel.querySelector(".community-play-btn.playing") : null;
    if (prev) {
      prev.innerHTML = "&#9654;";
      prev.classList.remove("playing");
    }
    var prevCard = panel ? panel.querySelector(".community-card.is-playing") : null;
    if (prevCard) resetCardProgress(prevCard);

    // Fetch and play
    btn.innerHTML = "&#9646;&#9646;";
    btn.classList.add("playing");
    if (card) card.classList.add("is-playing");
    currentPlaybackId = id;

    var fill = card ? card.querySelector(".community-progress-fill") : null;
    // Capture card data for Now Playing bar
    var cardTitle = card ? card.querySelector(".community-card-name") : null;
    var cardMeta = card ? card.querySelector(".community-card-meta") : null;

    fetch("/api/recordings/get?id=" + encodeURIComponent(id))
      .then(function (r) { return r.json(); })
      .then(function (rec) {
        if (window.PianoApp.FallingNotes) window.PianoApp.FallingNotes.start(rec, {
              title: rec.title || "",
              artist: rec.name || ""
            });
        showNowPlaying(
          rec.title || "",
          rec.name || "",
          rec.dur || 0,
          function () {
            // close callback — stop playback
            window.PianoApp.Playback.stop();
            if (window.PianoApp.FallingNotes) window.PianoApp.FallingNotes.stop();
            hideNowPlaying();
            currentPlaybackId = null;
            btn.innerHTML = "&#9654;";
            btn.classList.remove("playing");
            resetCardProgress(card);
          }
        );
        if (window.PianoApp.Playback) {
          window.PianoApp.Playback.play(rec, {
            onProgress: function (ratio) {
              if (fill) fill.style.width = (ratio * 100) + "%";
              if (npProgressFill) npProgressFill.style.width = (ratio * 100) + "%";
              if (npTimeEl) {
                var elapsed = window.PianoApp.Playback ? window.PianoApp.Playback.getElapsedMs() : 0;
                npTimeEl.textContent = formatDuration(elapsed);
              }
            },
            onEnd: function () {
              if (currentPlaybackId === id) currentPlaybackId = null;
              btn.innerHTML = "&#9654;";
              btn.classList.remove("playing");
              resetCardProgress(card);
              if (window.PianoApp.FallingNotes) window.PianoApp.FallingNotes.stop();
              hideNowPlaying();
            },
          });
        }
        currentPlaybackId = id;
      })
      .catch(function () {
        btn.innerHTML = "&#9654;";
        btn.classList.remove("playing");
        resetCardProgress(card);
        currentPlaybackId = null;
      });
  }

  function submitRecording(name, title, events, dur, pw) {
    var payload = { name: name, ev: events, dur: dur, pw: pw };
    if (title) payload.title = title;
    return fetch("/api/recordings/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (r) { return r.json(); });
  }

  function showNowPlaying(title, artist, duration, onClose) {
    hideNowPlaying();

    var bar = document.createElement("div");
    bar.className = "now-playing-bar";

    var infoEl = document.createElement("div");
    infoEl.className = "now-playing-info";
    var titleEl = document.createElement("span");
    titleEl.className = "now-playing-title";
    titleEl.textContent = title;
    var metaEl = document.createElement("span");
    metaEl.className = "now-playing-meta";
    metaEl.textContent = artist ? artist + " · " + formatDuration(duration) : formatDuration(duration);
    infoEl.appendChild(titleEl);
    infoEl.appendChild(metaEl);

    var progressEl = document.createElement("div");
    progressEl.className = "now-playing-progress";
    npProgressFill = document.createElement("div");
    npProgressFill.className = "now-playing-progress-fill";
    progressEl.appendChild(npProgressFill);

    npTimeEl = document.createElement("span");
    npTimeEl.className = "now-playing-time";
    npTimeEl.textContent = "0:00";

    var closeBtn = document.createElement("button");
    closeBtn.className = "now-playing-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", function () {
      if (onClose) onClose();
    });

    bar.appendChild(infoEl);
    bar.appendChild(progressEl);
    bar.appendChild(npTimeEl);
    bar.appendChild(closeBtn);
    document.body.appendChild(bar);

    // Position just above the keyboard
    positionNowPlaying();

    // Trigger animation
    requestAnimationFrame(function () {
      bar.classList.add("visible");
    });

    nowPlayingBar = bar;
  }

  function positionNowPlaying() {
    if (!nowPlayingBar) return;
    var kb = document.getElementById("piano-keyboard");
    if (!kb) return;
    var r = kb.getBoundingClientRect();
    nowPlayingBar.style.bottom = (window.innerHeight - r.top) + "px";
  }

  function hideNowPlaying() {
    if (npProgressTimer) { clearInterval(npProgressTimer); npProgressTimer = null; }
    if (nowPlayingBar && nowPlayingBar.parentNode) {
      nowPlayingBar.parentNode.removeChild(nowPlayingBar);
    }
    nowPlayingBar = null;
    npProgressFill = null;
    npTimeEl = null;
  }

  function formatDuration(ms) {
    var s = Math.round(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return m > 0 ? m + ":" + (s < 10 ? "0" : "") + s : s + "s";
  }

  return {
    show: show,
    hide: hide,
    submitRecording: submitRecording,
    fetchList: fetchList,
    _repositionNP: positionNowPlaying,
  };
})();
