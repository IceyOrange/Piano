window.PianoApp = window.PianoApp || {};

window.PianoApp.initNav = function () {
  var nav = document.querySelector('.page-nav');
  var accent = document.querySelector('.piano-accent');
  if (!nav || !accent) return;

  // Mark active page based on current URL
  var currentPath = window.location.pathname.split('/').pop() || 'index.html';
  nav.querySelectorAll('a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === currentPath) {
      link.setAttribute('aria-current', 'page');
    }
  });

  // Generate piano accent keys
  function generateKeys() {
    accent.innerHTML = '';
    var whiteW = window.innerWidth <= 768 ? 10 : 16;
    var blackW = window.innerWidth <= 768 ? 7 : 10;
    var gap = 1;

    // One octave pattern: W B W B W W B W
    var pattern = [
      { type: 'white', w: whiteW },
      { type: 'black', w: blackW },
      { type: 'white', w: whiteW },
      { type: 'black', w: blackW },
      { type: 'white', w: whiteW },
      { type: 'white', w: whiteW },
      { type: 'black', w: blackW },
      { type: 'white', w: whiteW }
    ];

    var patternWidth = pattern.reduce(function (sum, k) {
      return sum + k.w + gap;
    }, 0) - gap;

    var count = Math.ceil(window.innerWidth / patternWidth) + 2;

    for (var i = 0; i < count; i++) {
      pattern.forEach(function (key) {
        var el = document.createElement('div');
        el.className = key.type === 'white' ? 'key-white' : 'key-black';
        el.style.width = key.w + 'px';
        accent.appendChild(el);
      });
    }
  }

  generateKeys();

  // Regenerate on resize (debounced)
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(generateKeys, 150);
  });

  // Hover effect: brighten entire accent line
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('mouseenter', function () {
      accent.classList.add('is-hovered');
    });
    link.addEventListener('mouseleave', function () {
      accent.classList.remove('is-hovered');
    });
  });
};
