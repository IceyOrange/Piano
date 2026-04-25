window.PianoApp = window.PianoApp || {};

// Page transition variants for forward navigation
const transitionVariants = {
  "portfolio.html": "circle-reveal",
  "experience.html": "curtain-wipe",
  "about.html": "slide-from-right",
  "index.html": "fade",
};

// Bidirectional page-pair variants: when navigating between these pairs, use the specified variant
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

window.PianoApp.initTransitions = function () {
  // Clean up any leftover transition layers
  document.querySelectorAll('.reveal-circle-bg, .reveal-slide-bg, .iframe-reveal-container, .curtain-stage').forEach(el => el.remove());

  const overlay = document.querySelector(".transition-overlay");
  if (overlay) {
    overlay.classList.remove("active", "slide-left", "scale", "fade", "curtain-wipe");
    overlay.innerHTML = "";
  }
  // Clear any stale content transition classes
  document.querySelectorAll(".page-content").forEach(el => {
    el.classList.remove("exit-circle", "enter-circle", "exit-slide-left", "enter-slide-right");
    el.style.removeProperty("--circle-origin");
    el.style.opacity = "";
    el.style.transform = "";
    el.style.transition = "";
    el.style.transformOrigin = "";
  });
  document.querySelectorAll(".page").forEach(p => p.classList.remove("curtain-exiting", "curtain-entering"));

  // Intercept internal links for animated exit
  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute("href");
    if (
      !href ||
      href.startsWith("http") ||
      href.startsWith("#") ||
      href.startsWith("mailto:")
    )
      return;

    link.addEventListener("click", (e) => {
      e.preventDefault();
      const currentPage = getPageName();
      const variant = getTransitionVariant(currentPage, href);
      window.PianoApp.navigateWithTransition(href, variant);
    });
  });

  // Content reveal after curtain opens
  const pianoWrapper = document.querySelector(".piano-wrapper");
  if (pianoWrapper) {
    setTimeout(() => {
      pianoWrapper.classList.add("curtain-revealed");
    }, 200);
  }

  // Remove initial curtains after animation completes (home page first load)
  const curtainStage = document.querySelector(".curtain-stage");
  if (curtainStage) {
    setTimeout(() => {
      curtainStage.remove();
    }, 2200);
  }

  // Play reverse transition for non-bfcache navigations (direct link clicks back)
  const trans = JSON.parse(sessionStorage.getItem('pianoTransition') || '{}');
  const currentPage = getPageName();
  if (trans.to === currentPage && !sessionStorage.getItem('pianoTransitionPlayed')) {
    sessionStorage.setItem('pianoTransitionPlayed', 'true');
    if (trans.variant === 'curtain-wipe') {
      playCurtainOpen();
    } else if (trans.variant === 'circle-reveal') {
      const c3Key = document.querySelector('[data-note="C3"]');
      let ox = 'calc(100% - 48px)', oy = '48px';
      if (c3Key) {
        const r = c3Key.getBoundingClientRect();
        ox = `${r.left + r.width / 2}px`;
        oy = `${r.top + r.height / 2}px`;
      }
      const pageContent = document.querySelector(".page-content");
      if (pageContent) {
        pageContent.style.setProperty("--circle-origin", `${ox} ${oy}`);
        pageContent.classList.add("enter-circle");
        setTimeout(() => {
          pageContent.classList.remove("enter-circle");
          pageContent.style.removeProperty("--circle-origin");
        }, 1200);
      }
      const layer = document.createElement('div');
      layer.className = 'exit-circle-layer';
      layer.style.setProperty('--circle-origin', `${ox} ${oy}`);
      document.body.appendChild(layer);
      requestAnimationFrame(() => layer.classList.add('active'));
      setTimeout(() => layer.remove(), 1200);
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
          setTimeout(() => {
            pageContent.style.transition = "";
            pageContent.style.opacity = "";
          }, 500);
        });
      }
    }
  }
};

window.PianoApp.navigateWithTransition = function (url, variant, origin) {
  // Record transition for reverse animation on back navigation
  const currentPage = getPageName();
  sessionStorage.setItem('pianoTransition', JSON.stringify({
    from: currentPage,
    to: url,
    variant: variant,
    timestamp: Date.now()
  }));
  sessionStorage.removeItem('pianoTransitionPlayed');

  const pageContent = document.querySelector(".page-content");

  if (variant === "circle-reveal") {
    const ox = origin ? `${origin.x}px` : `calc(100% - 48px)`;
    const oy = origin ? `${origin.y}px` : `48px`;

    // Old page content shrinks to origin
    if (pageContent) {
      pageContent.style.setProperty("--circle-origin", `${ox} ${oy}`);
      pageContent.classList.add("exit-circle");
    }

    // Warm background layer expands from origin behind it
    const bgLayer = document.createElement('div');
    bgLayer.className = 'reveal-circle-bg';
    bgLayer.style.setProperty('--circle-origin', `${ox} ${oy}`);
    document.body.appendChild(bgLayer);

    requestAnimationFrame(() => {
      bgLayer.classList.add('active');
    });

    setTimeout(() => { window.location.href = url; }, 800);
  } else if (variant === "curtain-wipe") {
    const overlay = document.querySelector(".transition-overlay");

    // Start page exit animation
    const page = document.querySelector(".page");
    if (page) page.classList.add("curtain-exiting");

    if (overlay) {
      // Build two curtain panels that close from edges to center
      const leftPanel = document.createElement("div");
      leftPanel.className = "wipe-half wipe-half--left";
      const rightPanel = document.createElement("div");
      rightPanel.className = "wipe-half wipe-half--right";
      overlay.appendChild(leftPanel);
      overlay.appendChild(rightPanel);

      // Create iframe reveal: two halves sliding in from edges
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

      // Start both curtain close and iframe reveal animations
      requestAnimationFrame(() => {
        overlay.classList.add("active", variant);
        revealContainer.classList.add("active");
      });
    }

    // Navigate after animation completes
    setTimeout(() => {
      window.location.href = url;
    }, 2000);
  } else if (variant === "slide-from-right") {
    // Old page content slides out to left
    if (pageContent) {
      pageContent.classList.add("exit-slide-left");
    }

    // Warm background layer slides in from right
    const bgLayer = document.createElement('div');
    bgLayer.className = 'reveal-slide-bg';
    document.body.appendChild(bgLayer);

    requestAnimationFrame(() => {
      bgLayer.classList.add('active');
    });

    setTimeout(() => {
      window.location.href = url;
    }, 600);
  } else {
    // fade
    if (pageContent) {
      pageContent.style.transition = 'opacity 0.5s ease';
      pageContent.style.opacity = '0';
    }
    setTimeout(() => { window.location.href = url; }, 500);
  }
};

// Clear overlay on bfcache restore (back/forward navigation)
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    // Clean up any leftover transition layers
    document.querySelectorAll('.reveal-circle-bg, .reveal-slide-bg, .iframe-reveal-container, .curtain-stage').forEach(el => el.remove());

    const overlay = document.querySelector(".transition-overlay");
    if (overlay) {
      overlay.classList.remove("active", "slide-left", "scale", "fade", "curtain-wipe");
      overlay.innerHTML = "";
    }
    // Clear any stale page exit state
    document.querySelectorAll(".page").forEach(p => p.classList.remove("curtain-exiting", "curtain-entering"));

    const trans = JSON.parse(sessionStorage.getItem('pianoTransition') || '{}');
    const currentPage = getPageName();
    const pageContent = document.querySelector(".page-content");

    // Play reverse transition animation when navigating back
    if ((trans.from === currentPage || trans.to === currentPage) && !sessionStorage.getItem('pianoTransitionPlayed')) {
      sessionStorage.setItem('pianoTransitionPlayed', 'true');

      if (trans.variant === 'circle-reveal') {
        // Old page layer shrinks to C3, new content emerges behind
        const c3Key = document.querySelector('[data-note="C3"]');
        let ox = 'calc(100% - 48px)', oy = '48px';
        if (c3Key) {
          const r = c3Key.getBoundingClientRect();
          ox = `${r.left + r.width / 2}px`;
          oy = `${r.top + r.height / 2}px`;
        }

        // New page content starts slightly scaled down
        if (pageContent) {
          pageContent.classList.remove("exit-circle", "exit-slide-left");
          pageContent.style.setProperty("--circle-origin", `${ox} ${oy}`);
          pageContent.classList.add("enter-circle");
          setTimeout(() => {
            pageContent.classList.remove("enter-circle");
            pageContent.style.removeProperty("--circle-origin");
          }, 1200);
        }

        // Old page layer shrinks to origin and fades
        const layer = document.createElement('div');
        layer.className = 'exit-circle-layer';
        layer.style.setProperty('--circle-origin', `${ox} ${oy}`);
        document.body.appendChild(layer);

        requestAnimationFrame(() => {
          layer.classList.add('active');
        });

        setTimeout(() => { layer.remove(); }, 1200);
      } else if (trans.variant === 'slide-from-right') {
        // Old page layer slides out to right, new content slides in from left
        if (pageContent) {
          pageContent.classList.remove("exit-circle", "exit-slide-left");
          pageContent.classList.add("enter-slide-left");
          setTimeout(() => {
            pageContent.classList.remove("enter-slide-left");
          }, 600);
        }

        // Old page layer slides out to right and fades
        const layer = document.createElement('div');
        layer.className = 'exit-slide-layer';
        document.body.appendChild(layer);

        requestAnimationFrame(() => {
          layer.classList.add('active');
        });

        setTimeout(() => { layer.remove(); }, 600);
      } else if (trans.variant === 'curtain-wipe') {
        playCurtainOpen();
      } else if (trans.variant === 'fade') {
        if (pageContent) {
          pageContent.style.opacity = "0";
          requestAnimationFrame(() => {
            pageContent.style.transition = "opacity 0.5s ease";
            pageContent.style.opacity = "1";
            setTimeout(() => {
              pageContent.style.transition = "";
              pageContent.style.opacity = "";
            }, 500);
          });
        }
      }
    }

    // Force re-initialization of piano keyboard if empty (bfcache issue)
    const keyboard = document.getElementById("piano-keyboard");
    if (keyboard && keyboard.children.length === 0 && window.PianoApp.initPiano) {
      window.PianoApp.initPiano();
    }
  }
});

function playCurtainOpen() {
  const pianoWrapper = document.querySelector(".piano-wrapper");
  const page = document.querySelector(".page");

  // Hide piano initially, it will reveal after curtains start opening
  if (pianoWrapper) {
    pianoWrapper.classList.remove("curtain-revealed");
  }

  // Start page enter animation: dimmed and scaled, then recovers as curtains open
  if (page) {
    page.classList.add("curtain-entering");
  }

  // Create curtain stage with closed curtains
  const stage = document.createElement("div");
  stage.className = "curtain-stage";
  const leftCurtain = document.createElement("div");
  leftCurtain.className = "curtain curtain-left";
  const rightCurtain = document.createElement("div");
  rightCurtain.className = "curtain curtain-right";
  stage.appendChild(leftCurtain);
  stage.appendChild(rightCurtain);
  document.body.prepend(stage);

  // Reveal piano after curtains start opening
  setTimeout(() => {
    if (pianoWrapper) pianoWrapper.classList.add("curtain-revealed");
  }, 200);

  // Clean up curtains and page enter state
  setTimeout(() => {
    stage.remove();
    if (page) page.classList.remove("curtain-entering");
  }, 2200);
}
