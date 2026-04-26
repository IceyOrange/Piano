window.PianoApp = window.PianoApp || {};

window.PianoApp.initScrollReveal = function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.documentElement.classList.contains('prefers-no-animation')) return;

  var revealed = new Set();
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !revealed.has(entry.target)) {
        revealed.add(entry.target);
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -32px 0px'
  });

  document.querySelectorAll('.reveal-on-scroll').forEach(function (el) {
    observer.observe(el);
  });
};
