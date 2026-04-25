window.PianoApp = window.PianoApp || {};

// Page transition variants for forward navigation
const transitionVariants = {
  "portfolio.html": "circle-reveal",
  "experience.html": "curtain-wipe",
  "about.html": "slide-from-right",
  "index.html": "fade",
};

// Bidirectional page-pair variants
const transitionPairs = {
  "experience.html->index.html": "curtain-wipe",
  "index.html->experience.html": "curtain-wipe",
  "portfolio.html->index.html": "circle-reveal",
  "index.html->portfolio.html": "circle-reveal",
  "about.html->index.html": "slide-from-right",
  "index.html->about.html": "slide-from-right",
};

function getPageName() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

function getTransitionVariant(from, to) {
  const pairKey = `${from}->${to}`;
  return transitionPairs[pairKey] || transitionVariants[to] || "fade";
}

// ─── Shared helpers ───────────────────────────────────

function getC3Origin() {
  const c3Key = document.querySelector('[data-note="C3"]');
  if (c3Key) {
    const r = c3Key.getBoundingClientRect();
    return { x: `${r.left + r.width / 2}px`, y: `${r.top + r.height / 2}px` };
  }
  return { x: 'calc(100% - 48px)', y: '48px' };
}

// Circle-reveal animation is handled via:
// Forward: CSS animation on .page (injected by destination page's inline <style>)
// Reverse: clip-path transition on .page (shrinks toward C3)

function revealPiano() {
  const pw = document.querySelector(".piano-wrapper");
  if (pw) {
    pw.style.transition = "none";
    pw.classList.add("curtain-revealed");
    pw.offsetHeight;
    pw.style.transition = "";
  }
}

function cleanupTransitionLayers() {
  document.querySelectorAll('.circle-reveal-layer, .reveal-circle-bg, .reveal-slide-bg, .iframe-reveal-container, .slide-reveal-container').forEach(el => el.remove());
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
  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("curtain-exiting", "curtain-entering");
    p.style.removeProperty("clip-path");
    p.style.removeProperty("transition");
  });
}

// ─── Init ─────────────────────────────────────────────

window.PianoApp.initTransitions = function () {
  cleanupTransitionLayers();

  // Intercept internal links for animated exit
  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return;

    link.addEventListener("click", (e) => {
      e.preventDefault();
      const currentPage = getPageName();
      const variant = getTransitionVariant(currentPage, href);
      window.PianoApp.navigateWithTransition(href, variant);
    });
  });

  // Piano visible instantly
  revealPiano();

  // Remove initial HTML curtains after animation (index first load)
  const curtainStage = document.querySelector(".curtain-stage");
  if (curtainStage) {
    setTimeout(() => curtainStage.remove(), 2200);
  }

  // Reverse transition: play when landing on this page after a forward animation
  const trans = JSON.parse(sessionStorage.getItem('pianoTransition') || '{}');
  const currentPage = getPageName();
  if (trans.to === currentPage && !sessionStorage.getItem('pianoTransitionPlayed')) {
    sessionStorage.setItem('pianoTransitionPlayed', 'true');
    playReverseAnimation(trans);
  }
};

// ─── Navigate (forward exit animation) ────────────────

window.PianoApp.navigateWithTransition = function (url, variant, origin) {
  const currentPage = getPageName();
  console.log('[transition] navigate:', currentPage, '->', url, 'variant:', variant);

  // Instantly close menu overlay (no animation) so it doesn't cover the transition
  const menuOverlay = document.querySelector('.menu-overlay');
  if (menuOverlay && menuOverlay.classList.contains('open')) {
    menuOverlay.style.transition = 'none';
    menuOverlay.classList.remove('open');
    void menuOverlay.offsetHeight;
    menuOverlay.style.transition = '';
  }

  sessionStorage.setItem('pianoTransition', JSON.stringify({
    from: currentPage, to: url, variant: variant, timestamp: Date.now()
  }));
  sessionStorage.removeItem('pianoTransitionPlayed');
  // Reverse circle-reveal: prevent entry animation on destination
  if (variant === 'circle-reveal' && currentPage !== 'index.html') {
    sessionStorage.setItem('pianoTransitionPlayed', 'true');
  }

  const pageContent = document.querySelector(".page-content");

  if (variant === "circle-reveal") {
    let ox, oy;
    if (origin) {
      ox = `${origin.x}px`; oy = `${origin.y}px`;
    } else {
      const stored = JSON.parse(sessionStorage.getItem('c3Origin') || '{}');
      if (stored.x && stored.y) {
        ox = stored.x; oy = stored.y;
      } else {
        const c3 = getC3Origin();
        ox = c3.x; oy = c3.y;
      }
    }
    sessionStorage.setItem('c3Origin', JSON.stringify({ x: ox, y: oy }));

    if (currentPage === 'index.html') {
      // Forward: navigate immediately; CSS animation on destination .page reveals it
      window.location.href = url;
    } else {
      // Reverse: shrink .page toward C3 using Web Animations API
      console.log('[transition] circle-reveal REVERSE, origin:', ox, oy);
      const page = document.querySelector('.page');
      if (page) {
        page.style.zIndex = '200';
        page.animate([
          { clipPath: 'circle(150% at ' + ox + ' ' + oy + ')' },
          { clipPath: 'circle(0% at ' + ox + ' ' + oy + ')' }
        ], {
          duration: 800,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        });
      }
      setTimeout(() => { window.location.href = url; }, 900);
    }

  } else if (variant === "curtain-wipe") {
    const overlay = document.querySelector(".transition-overlay");
    const page = document.querySelector(".page");
    if (page) page.classList.add("curtain-exiting");

    if (overlay) {
      const leftPanel = document.createElement("div");
      leftPanel.className = "wipe-half wipe-half--left";
      const rightPanel = document.createElement("div");
      rightPanel.className = "wipe-half wipe-half--right";
      overlay.appendChild(leftPanel);
      overlay.appendChild(rightPanel);

      const revealContainer = document.createElement("div");
      revealContainer.className = "iframe-reveal-container";
      const leftHalf = document.createElement("div");
      leftHalf.className = "iframe-reveal-half iframe-reveal-half--left";
      const leftIframe = document.createElement("iframe");
      leftIframe.src = url;
      leftHalf.appendChild(leftIframe);
      const rightHalf = document.createElement("div");
      rightHalf.className = "iframe-reveal-half iframe-reveal-half--right";
      const rightIframe = document.createElement("iframe");
      rightIframe.src = url;
      rightHalf.appendChild(rightIframe);
      revealContainer.appendChild(leftHalf);
      revealContainer.appendChild(rightHalf);
      document.body.appendChild(revealContainer);

      requestAnimationFrame(() => {
        overlay.classList.add("active", variant);
        revealContainer.classList.add("active");
      });
    }
    setTimeout(() => { window.location.href = url; }, 2000);

  } else if (variant === "slide-from-right") {
    // Determine direction & color based on TARGET page
    const goingToIndex = url.includes('index.html');
    console.log('[transition] slide-from-right, goingToIndex:', goingToIndex);
    const targetBg = goingToIndex ? '#001A48' : '#F2ECE2';
    const slideFrom = goingToIndex ? 'translateX(-100%)' : 'translateX(100%)';
    const slideCurrent = goingToIndex ? 'translateX(15%)' : 'translateX(-15%)';

    // Current page content slides out
    if (pageContent) {
      pageContent.style.transition = 'transform 0.9s cubic-bezier(0.4,0,0.2,1), opacity 0.9s ease';
      pageContent.style.transform = slideCurrent;
      pageContent.style.opacity = '0.5';
    }

    // Target-colored overlay slides in
    const bgLayer = document.createElement('div');
    bgLayer.style.cssText =
      'position:fixed;inset:0;z-index:100;' +
      'background:' + targetBg + ';' +
      'transform:' + slideFrom + ';' +
      'transition:transform 0.9s cubic-bezier(0.4,0,0.2,1);';
    document.body.appendChild(bgLayer);

    // Prefetch target page for fast load
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
    if (pageContent) {
      pageContent.style.transition = 'opacity 0.5s ease';
      pageContent.style.opacity = '0';
    }
    setTimeout(() => { window.location.href = url; }, 500);
  }
};

// ─── Reverse animation (arriving at page) ─────────────

function playReverseAnimation(trans) {
  if (trans.variant === 'circle-reveal') {
    revealPiano();

  } else if (trans.variant === 'curtain-wipe') {
    playCurtainOpen();

  } else if (trans.variant === 'slide-from-right') {
    const pageContent = document.querySelector(".page-content");
    if (pageContent) {
      pageContent.classList.add("enter-slide-left");
      setTimeout(() => pageContent.classList.remove("enter-slide-left"), 600);
    }
    const layer = document.createElement('div');
    layer.className = 'exit-slide-layer';
    document.body.appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('active'));
    setTimeout(() => layer.remove(), 600);

  } else if (trans.variant === 'fade') {
    const pageContent = document.querySelector(".page-content");
    if (pageContent) {
      pageContent.style.opacity = "0";
      requestAnimationFrame(() => {
        pageContent.style.transition = "opacity 0.5s ease";
        pageContent.style.opacity = "1";
        setTimeout(() => { pageContent.style.transition = ""; pageContent.style.opacity = ""; }, 500);
      });
    }
  }
}

// ─── bfcache restore (browser back button) ────────────

window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return;

  cleanupTransitionLayers();
  revealPiano();

  const trans = JSON.parse(sessionStorage.getItem('pianoTransition') || '{}');
  const currentPage = getPageName();

  if (trans.from === currentPage || trans.to === currentPage) {
    playReverseAnimation(trans);
  }

  // Force re-init piano keyboard if empty (bfcache issue)
  const keyboard = document.getElementById("piano-keyboard");
  if (keyboard && keyboard.children.length === 0 && window.PianoApp.initPiano) {
    window.PianoApp.initPiano();
  }
});

// ─── Curtain open (used by curtain-wipe reverse) ──────

function playCurtainOpen() {
  const pianoWrapper = document.querySelector(".piano-wrapper");
  const page = document.querySelector(".page");

  if (page) page.classList.add("curtain-entering");

  const stage = document.createElement("div");
  stage.className = "curtain-stage";
  const leftCurtain = document.createElement("div");
  leftCurtain.className = "curtain curtain-left";
  const rightCurtain = document.createElement("div");
  rightCurtain.className = "curtain curtain-right";
  stage.appendChild(leftCurtain);
  stage.appendChild(rightCurtain);
  document.body.prepend(stage);

  if (pianoWrapper) {
    pianoWrapper.style.transition = "none";
    pianoWrapper.classList.add("curtain-revealed");
    pianoWrapper.offsetHeight;
    pianoWrapper.style.transition = "";
  }

  setTimeout(() => {
    stage.remove();
    if (page) page.classList.remove("curtain-entering");
  }, 2200);
}
