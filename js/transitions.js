window.PianoApp = window.PianoApp || {};

// ─── Page ↔ Key mapping (from data.js) ────────────
function getPageToNote(page) {
  const map = window.PianoApp.data && window.PianoApp.data.navMappings && window.PianoApp.data.navMappings.pageToNote;
  return map ? map[page] : null;
}

// ─── Transition routing ────────────────────────────
const transitionVariants = {
  "portfolio.html": "circle-reveal",
  "experience.html": "circle-reveal",
  "about.html": "circle-reveal",
  "index.html": "fade",
};

const transitionPairs = {
  // index ↔ sub-pages: circle-reveal
  "index.html->portfolio.html": "circle-reveal",
  "portfolio.html->index.html": "circle-reveal",
  "index.html->experience.html": "circle-reveal",
  "experience.html->index.html": "circle-reveal",
  "index.html->about.html": "circle-reveal",
  "about.html->index.html": "circle-reveal",

  // sub-page ↔ sub-page: slide-from-right
  "portfolio.html->experience.html": "slide-from-right",
  "experience.html->portfolio.html": "slide-from-right",
  "portfolio.html->about.html": "slide-from-right",
  "about.html->portfolio.html": "slide-from-right",
  "experience.html->about.html": "slide-from-right",
  "about.html->experience.html": "slide-from-right",
};

function getPageName() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

function getTransitionVariant(from, to) {
  const pairKey = `${from}->${to}`;
  return transitionPairs[pairKey] || transitionVariants[to] || "fade";
}

// ─── Key position helpers ──────────────────────────

function getKeyOrigin(note) {
  const keyEl = document.querySelector(`[data-note="${note}"]`);
  if (keyEl) {
    const r = keyEl.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  const origins = JSON.parse(sessionStorage.getItem('keyOrigins') || '{}');
  if (origins[note]) return origins[note];
  // Fallback: lower-center of viewport, roughly where piano keys sit
  return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.75 };
}

function cleanupTransitionLayers() {
  // Cancel any lingering Web Animations on body (fill:forwards survives bfcache)
  if (document.body.getAnimations) {
    document.body.getAnimations().forEach(a => a.cancel());
  }

  document.querySelectorAll('.circle-reveal-mask, .circle-reveal-layer, .reveal-circle-bg, .reveal-slide-bg, .exit-slide-layer').forEach(el => el.remove());
  const overlay = document.querySelector(".transition-overlay");
  if (overlay) {
    overlay.classList.remove("active", "slide-left", "scale", "fade", "curtain-wipe");
    overlay.innerHTML = "";
  }
  document.querySelectorAll(".page-content").forEach(el => {
    el.classList.remove("exit-circle", "enter-circle", "exit-slide-left", "enter-slide-right");
    el.style.removeProperty("--circle-origin");
    el.style.opacity = "";
    el.style.transform = "";
    el.style.transition = "";
    el.style.transformOrigin = "";
  });
  document.querySelectorAll(".page-header .page-title").forEach(el => {
    el.style.removeProperty("opacity");
    el.style.removeProperty("transform");
    el.style.removeProperty("transition");
    el.style.removeProperty("animation");
  });
  document.querySelectorAll(".page").forEach(p => {
    p.style.removeProperty("clip-path");
    p.style.removeProperty("transition");
  });
  document.body.style.position = "";
  document.body.style.zIndex = "";
  document.body.style.opacity = "";
  document.body.style.clipPath = "";
  document.body.style.transition = "";
}

// ─── Init ──────────────────────────────────────────

window.PianoApp.initTransitions = function () {
  cleanupTransitionLayers();

  const inIframe = window.self !== window.top;
  if (inIframe) return;

  // Intercept internal links for animated exit
  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return;

    link.addEventListener("click", (e) => {
      e.preventDefault();
      const currentPage = getPageName();
      const variant = getTransitionVariant(currentPage, href);

      // From index: resolve the corresponding key position as origin
      let origin = null;
      if (currentPage === 'index.html') {
        const targetKey = getPageToNote(href);
        if (targetKey) origin = getKeyOrigin(targetKey);
      }

      window.PianoApp.navigateWithTransition(href, variant, origin);
    });
  });

  // Reverse animation on arrival: only slide-from-right needs an entry animation;
  // circle-reveal plays its effect entirely on the outgoing page.
  const trans = JSON.parse(sessionStorage.getItem('pianoTransition') || '{}');
  const currentPage = getPageName();
  if (trans.to === currentPage && !sessionStorage.getItem('pianoTransitionPlayed')) {
    sessionStorage.setItem('pianoTransitionPlayed', 'true');
    if (trans.variant === 'slide-from-right') {
      playReverseSlideAnimation();
    }
    // circle-reveal and fade do not need reverse entry animations
  }

  window.PianoApp.initNav();
};

// ─── Navigate (forward exit animation) ──────────────

window.PianoApp.navigateWithTransition = function (url, variant, origin) {
  const currentPage = getPageName();
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('[transition] navigate:', currentPage, '->', url, 'variant:', variant);
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    window.location.href = url;
    return;
  }

  sessionStorage.setItem('pianoTransition', JSON.stringify({
    from: currentPage, to: url, variant: variant, timestamp: Date.now()
  }));
  sessionStorage.removeItem('pianoTransitionPlayed');

  const pageContent = document.querySelector(".page-content");

  if (variant === "circle-reveal") {
    const goingToIndex = url.includes('index.html');
    const targetKey = goingToIndex
      ? (getPageToNote(currentPage) || 'C3')
      : (getPageToNote(url) || 'C3');

    if (!goingToIndex) {
      // Forward: index → sub-page
      // Light mask expands from the corresponding key position
      let ox, oy;
      if (origin) {
        ox = origin.x; oy = origin.y;
      } else {
        const pos = getKeyOrigin(targetKey);
        ox = pos.x; oy = pos.y;
      }

      // Save key position for reverse transition
      const origins = JSON.parse(sessionStorage.getItem('keyOrigins') || '{}');
      origins[targetKey] = { x: ox, y: oy };
      sessionStorage.setItem('keyOrigins', JSON.stringify(origins));

      // Use Web Animations API for reliable clip-path animation
      const mask = document.createElement('div');
      mask.className = 'circle-reveal-mask';
      mask.style.cssText =
        'position:fixed;inset:0;z-index:100;' +
        'background:#F2ECE2;';
      document.body.appendChild(mask);

      mask.animate([
        { clipPath: 'circle(0% at ' + ox + 'px ' + oy + 'px)' },
        { clipPath: 'circle(150% at ' + ox + 'px ' + oy + 'px)' }
      ], {
        duration: 800,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards'
      });

      setTimeout(() => { window.location.href = url; }, 720);

    } else {
      // Reverse: sub-page → index
      // Place an iframe of index.html beneath <body>, then shrink the entire body
      // toward the corresponding key position so the iframe is revealed underneath.
      const origins = JSON.parse(sessionStorage.getItem('keyOrigins') || '{}');
      const stored = origins[targetKey];
      let ox, oy;
      if (stored) {
        ox = stored.x; oy = stored.y;
      } else {
        const pos = getKeyOrigin(targetKey);
        ox = pos.x; oy = pos.y;
      }

      // Build iframe preview inside <html> but before <body> so it sits underneath
      const html = document.documentElement;
      const previewWrap = document.createElement('div');
      previewWrap.className = 'transition-underlay';
      previewWrap.style.cssText = 'position:fixed;inset:0;z-index:0;';

      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.cssText = 'position:absolute;inset:0;border:none;width:100%;height:100%;';
      previewWrap.appendChild(iframe);
      html.insertBefore(previewWrap, html.firstChild);

      // Bring body above the iframe layer
      document.body.style.position = 'relative';
      document.body.style.zIndex = '1';

      let shrinkStarted = false;
      function startShrink() {
        if (shrinkStarted) return;
        shrinkStarted = true;
        // Shrink the *entire* body (header + content) toward the key
        document.body.animate([
          { clipPath: 'circle(200% at ' + ox + 'px ' + oy + 'px)', opacity: 1 },
          { clipPath: 'circle(0% at ' + ox + 'px ' + oy + 'px)', opacity: 0 }
        ], {
          duration: 800,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards'
        });
        setTimeout(() => { window.location.href = url; }, 850);
      }

      iframe.addEventListener('load', function() {
        try {
          var idoc = iframe.contentDocument || iframe.contentWindow.document;
          var iwin = iframe.contentWindow;
          if (idoc && idoc.head) {
            var style = idoc.createElement('style');
            style.textContent =
              '.page-header{opacity:0!important;visibility:hidden!important}' +
              '.animate-fade-in-up{animation:none!important;opacity:1!important;transform:none!important}' +
              '.transition-overlay{display:none!important}' +
              '.piano-wrapper{opacity:1!important;transform:none!important}';
            idoc.head.appendChild(style);
          }
          if (iwin && iwin.sessionStorage) {
            iwin.sessionStorage.setItem('pianoTransitionPlayed', 'true');
          }
        } catch(e) {}
        sessionStorage.setItem('pianoTransitionPlayed', 'true');
        startShrink();
      });

      // Fallback: start shrink even if iframe hasn't loaded within 300ms
      setTimeout(startShrink, 300);
    }

  } else if (variant === "slide-from-right") {
    // Sub-page → sub-page: light warm overlay, stays below page-header (z-index 89)
    const slideFrom = 'translateX(100%)';
    const slideCurrent = 'translateX(-15%)';

    if (pageContent) {
      pageContent.style.transition = 'transform 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.9s ease';
      pageContent.style.transform = slideCurrent;
      pageContent.style.opacity = '0.5';
    }

    // Fade out the title text so it doesn't snap on the new page
    const pageTitle = document.querySelector('.page-header .page-title');
    if (pageTitle) {
      pageTitle.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      pageTitle.style.opacity = '0';
      pageTitle.style.transform = 'translateY(-6px)';
    }

    const bgLayer = document.createElement('div');
    bgLayer.className = 'reveal-slide-bg';
    bgLayer.style.cssText =
      'position:fixed;inset:0;z-index:89;' +  // below page-header (z-index: 90)
      'background:#F2ECE2;' +
      'transform:' + slideFrom + ';' +
      'transition:transform 0.9s cubic-bezier(0.22,1,0.36,1);';
    document.body.appendChild(bgLayer);

    const prefetch = document.createElement('link');
    prefetch.rel = 'prefetch';
    prefetch.href = url;
    document.head.appendChild(prefetch);

    sessionStorage.setItem('pianoTransitionPlayed', 'true');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bgLayer.style.transform = 'translateX(0)';
      });
    });
    setTimeout(() => { window.location.href = url; }, 950);

  } else {
    // fade
    if (pageContent) {
      pageContent.style.transition = 'opacity 0.5s ease';
      pageContent.style.opacity = '0';
    }
    setTimeout(() => { window.location.href = url; }, 500);
  }
};

// ─── Reverse slide animation (arrival) ─────────────

function playReverseSlideAnimation() {
  const pageContent = document.querySelector(".page-content");
  if (pageContent) {
    pageContent.classList.add("enter-slide-left");
    setTimeout(() => pageContent.classList.remove("enter-slide-left"), 600);
  }

  // Fade in the new page title with a slight delay for a smooth handoff
  const pageTitle = document.querySelector('.page-header .page-title');
  if (pageTitle) {
    pageTitle.style.opacity = '0';
    pageTitle.style.transform = 'translateY(8px)';
    pageTitle.style.transition = 'none';
    // Override the animate-fade-in-up so we control the timing ourselves
    pageTitle.style.animation = 'none';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        pageTitle.style.transition = 'opacity 0.5s cubic-bezier(0.22,1,0.36,1), transform 0.5s cubic-bezier(0.22,1,0.36,1)';
        pageTitle.style.opacity = '1';
        pageTitle.style.transform = 'translateY(0)';
      });
    });
  }

  const layer = document.createElement('div');
  layer.className = 'exit-slide-layer';
  layer.style.background = '#F2ECE2';
  document.body.appendChild(layer);
  requestAnimationFrame(() => layer.classList.add('active'));
  setTimeout(() => layer.remove(), 600);
}

// ─── bfcache restore (browser back button) ───────────

window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return;

  cleanupTransitionLayers();

  const trans = JSON.parse(sessionStorage.getItem('pianoTransition') || '{}');
  const currentPage = getPageName();

  if (trans.from === currentPage || trans.to === currentPage) {
    if (trans.variant === 'slide-from-right') {
      playReverseSlideAnimation();
    }
  }

  const keyboard = document.getElementById("piano-keyboard");
  if (keyboard && keyboard.children.length === 0 && window.PianoApp.initPiano) {
    window.PianoApp.initPiano();
  }
});

// ─── Sub-page nav active-state ─────────────────────

window.PianoApp.initNav = function () {
  var nav = document.querySelector('.page-nav');
  if (!nav) return;

  var currentPath = window.location.pathname;
  nav.querySelectorAll('a').forEach(function (link) {
    var href = link.getAttribute('href');
    var normalizedHref = href.replace(/^\.?\//, '');
    var normalizedCurrent = currentPath.replace(/^\/|\/$/g, '');
    if (normalizedCurrent === normalizedHref || normalizedCurrent.endsWith('/' + normalizedHref)) {
      link.setAttribute('aria-current', 'page');
    }
  });
};
