window.PianoApp = window.PianoApp || {};

window.PianoApp.initAbout = function () {
  const container = document.getElementById("about-container");
  if (!container) return;

  var about = (window.PianoApp.data && window.PianoApp.data.about) || {};

  // Name
  var nameEl = container.querySelector('.about-name');
  if (nameEl && about.name) {
    nameEl.textContent = about.name;
  }

  // Typewriter
  var typewriterEl = container.querySelector('.about-typewriter .typewriter-text');
  if (typewriterEl && about.typewriter) {
    typewriterEl.textContent = about.typewriter;
    var steps = about.typewriter.length;

    // Measure actual text width for accurate Chinese/English mixed typing
    var measure = document.createElement('span');
    measure.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:"Courier New",Courier,monospace;font-size:0.85rem;letter-spacing:0.08em;';
    measure.textContent = about.typewriter;
    document.body.appendChild(measure);
    var textWidth = measure.offsetWidth;
    document.body.removeChild(measure);

    var kfName = 'typing-' + steps;
    var kfId = 'tw-kf-' + steps;
    if (!document.getElementById(kfId)) {
      var style = document.createElement('style');
      style.id = kfId;
      style.textContent = '@keyframes ' + kfName + ' { from { width: 0; } to { width: ' + textWidth + 'px; } }';
      document.head.appendChild(style);
    }
    typewriterEl.style.animation =
      kfName + ' 2.5s steps(' + steps + ') 0.4s forwards, ' +
      'blink-caret 0.75s step-end 0.4s infinite';
  }

  // Handwriting
  var handwritingEl = container.querySelector('.about-handwriting .handwriting-text');
  if (handwritingEl && about.handwriting) {
    handwritingEl.textContent = about.handwriting;
  }

  // Bio (array of paragraphs)
  var bioEl = container.querySelector('.about-bio');
  if (bioEl && Array.isArray(about.bio)) {
    bioEl.innerHTML = '';
    about.bio.forEach(function (text) {
      var p = document.createElement('p');
      p.textContent = text;
      bioEl.appendChild(p);
    });
  }

  // Social links
  var socialEl = container.querySelector('.about-social');
  if (socialEl && about.socialLinks) {
    socialEl.innerHTML = about.socialLinks.map(function (l) {
      return '<a href="' + l.url + '" target="_blank" rel="noopener">' + l.name + '</a>';
    }).join('');
  }

  // Avatar
  var avatarImg = container.querySelector('.about-avatar img');
  if (avatarImg && about.avatar) {
    avatarImg.src = about.avatar;
    avatarImg.alt = about.avatarAlt || '';
  }

  // Photo grid
  var photoGrid = container.querySelector('.about-photo-grid');
  if (photoGrid && about.photos) {
    photoGrid.innerHTML = about.photos.map(function (photo) {
      return (
        '<div class="about-photo-item">' +
          '<img src="' + photo.src + '" alt="' + (photo.alt || '') + '" loading="lazy">' +
          '<div class="about-photo-overlay">' +
            '<span>' + (photo.caption || '') + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  // Stagger animation for hero section
  var hero = container.querySelector('.about-hero');
  if (!hero) return;

  // Respect reduced motion / back-forward nav: show immediately
  if (document.documentElement.classList.contains('prefers-no-animation') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hero.classList.add("active");
    return;
  }

  // Trigger stagger animation when scrolled into view
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        hero.classList.add("active");
        observer.disconnect();
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });

  observer.observe(hero);
};
