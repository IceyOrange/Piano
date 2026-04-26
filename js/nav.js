window.PianoApp = window.PianoApp || {};

window.PianoApp.initNav = function () {
  var nav = document.querySelector('.page-nav');
  if (!nav) return;

  // Mark active page based on current URL
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
