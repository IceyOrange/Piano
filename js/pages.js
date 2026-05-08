window.PianoApp = window.PianoApp || {};

// ─── i18n helpers ───────────────────────────────────────
function getLang() {
  return (window.PianoApp.i18n && window.PianoApp.i18n.getLang && window.PianoApp.i18n.getLang()) || 'en';
}
function tStr(key) {
  return (window.PianoApp.i18n && window.PianoApp.i18n.t) ? window.PianoApp.i18n.t(key) : '';
}
// Pick English variant when lang === 'en' and the *En field exists; else fall back.
function pickField(obj, key) {
  if (!obj) return '';
  var enKey = key + 'En';
  if (getLang() === 'en' && obj[enKey] != null) return obj[enKey];
  return obj[key];
}

// ─── Portfolio ──────────────────────────────────────────
window.PianoApp.initPortfolio = function () {
  var showcaseEl = document.getElementById("portfolio-showcase");
  if (!showcaseEl) return;

  var lang = getLang();
  var viewLabel = tStr('portfolio.viewProject') || 'View Project';
  var projects = window.PianoApp.data.projects;

  showcaseEl.innerHTML = projects.map(function (project, i) {
    var name = pickField(project, 'name');
    var description = pickField(project, 'description');
    var category = pickField(project, 'category');
    var tech = pickField(project, 'tech') || [];
    return ''
      + '<article class="project-piece ' + (i % 2 === 1 ? 'project-piece--mirrored' : '') + '">'
      +   '<div class="project-visual">'
      +     '<img src="' + project.image + '" alt="' + name + '" loading="lazy">'
      +   '</div>'
      +   '<div class="project-info">'
      +     '<div class="project-meta">' + project.year + ' · ' + category + '</div>'
      +     '<h2>' + name + '</h2>'
      +     '<p>' + description + '</p>'
      +     '<div class="project-tech">'
      +       tech.map(function (t) { return '<span class="tag-pill">' + t + '</span>'; }).join('')
      +     '</div>'
      +     (project.link && project.link !== "#"
        ? '<a href="' + project.link + '" target="_blank" rel="noopener noreferrer" class="project-link">'
        +    viewLabel
        +    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">'
        +      '<path d="M1 13L13 1M13 1H4M13 1V10" stroke="currentColor" stroke-width="1.5"/>'
        +    '</svg>'
        + '</a>'
        : '')
      +   '</div>'
      + '</article>';
  }).join('');

  // Register re-render hook so the lang toggle can call back here
  window.PianoApp.rerenderPage = window.PianoApp.initPortfolio;
};

// ─── About ──────────────────────────────────────────────
window.PianoApp.initAbout = function () {
  var container = document.getElementById("about-container");
  if (!container) return;

  var about = (window.PianoApp.data && window.PianoApp.data.about) || {};

  // Cancel any in-flight typewriter from a previous render
  window.PianoApp._typewriterToken = (window.PianoApp._typewriterToken || 0) + 1;
  var typewriterToken = window.PianoApp._typewriterToken;

  // Name
  var nameEl = container.querySelector('.about-name');
  if (nameEl) {
    nameEl.textContent = pickField(about, 'name') || '';
  }

  // Typewriter (supports single string or array of strings)
  var typewriterContainer = container.querySelector('.about-typewriter');
  var typewriterSource = pickField(about, 'typewriter');
  if (typewriterContainer && typewriterSource) {
    var lines = Array.isArray(typewriterSource) ? typewriterSource : [typewriterSource];
    typewriterContainer.innerHTML = '';

    var BASE_SPEED = 100;    // base milliseconds per character
    var SPEED_VARIANCE = 80; // random variance (±80ms)
    var LINE_GAP = 400;     // pause between lines (ms)
    var INITIAL_DELAY = 400; // initial delay before typing starts (ms)

    function getRandomDelay() {
      return BASE_SPEED + (Math.random() * SPEED_VARIANCE * 2 - SPEED_VARIANCE);
    }

    var currentLine = 0;
    var currentChar = 0;

    function typeCharacter() {
      // Bail out if a newer typewriter took over
      if (typewriterToken !== window.PianoApp._typewriterToken) return;
      if (currentLine >= lines.length) return;

      var line = lines[currentLine];

      var lineSpan = typewriterContainer.children[currentLine * 2];
      if (!lineSpan) {
        lineSpan = document.createElement('span');
        lineSpan.className = 'typewriter-text';
        lineSpan.style.borderRight = '2px solid var(--accent-warm)';
        typewriterContainer.appendChild(lineSpan);
      }

      lineSpan.textContent += line[currentChar];
      currentChar++;

      if (currentChar < line.length) {
        setTimeout(typeCharacter, getRandomDelay());
      } else {
        lineSpan.style.animation = 'blink-caret 0.75s step-end infinite';

        setTimeout(function () {
          if (typewriterToken !== window.PianoApp._typewriterToken) return;
          if (currentLine < lines.length - 1) {
            lineSpan.style.animation = 'none';
            lineSpan.style.borderRight = 'none';

            var br = document.createElement('br');
            typewriterContainer.appendChild(br);

            currentLine++;
            currentChar = 0;
            typeCharacter();
          }
        }, LINE_GAP);
      }
    }

    setTimeout(typeCharacter, INITIAL_DELAY);
  }

  // Handwriting — hide if no content
  var handwritingWrap = container.querySelector('.about-handwriting');
  if (handwritingWrap) {
    var handwriting = pickField(about, 'handwriting');
    if (handwriting) {
      var handwritingText = handwritingWrap.querySelector('.handwriting-text');
      if (handwritingText) handwritingText.textContent = handwriting;
      handwritingWrap.style.display = '';
    } else {
      handwritingWrap.style.display = 'none';
    }
  }

  // Bio (array of paragraphs)
  var bioEl = container.querySelector('.about-bio');
  var bioSource = pickField(about, 'bio');
  if (bioEl && Array.isArray(bioSource)) {
    bioEl.innerHTML = '';
    bioSource.forEach(function (text) {
      var p = document.createElement('p');
      p.innerHTML = text;
      bioEl.appendChild(p);
    });
  }

  // Preload tooltip images so they're ready on hover
  if (about.socialLinks) {
    about.socialLinks.forEach(function (l) {
      if (l.type === 'tooltip' && l.tooltipType === 'image' && l.tooltipContent) {
        var preload = new Image();
        preload.src = l.tooltipContent;
      }
    });
  }

  // Social links
  var socialEl = container.querySelector('.about-social');
  if (socialEl && about.socialLinks) {
    socialEl.innerHTML = about.socialLinks.map(function (l) {
      var label = pickField(l, 'name') || l.name;
      if (l.type === 'tooltip') {
        var tooltipBody = l.tooltipType === 'image'
          ? '<img src="' + l.tooltipContent + '" alt="' + label + '">'
          : '<span>' + l.tooltipContent + '</span>';
        var dirClass = l.tooltipDirection ? ' tooltip-' + l.tooltipDirection : '';
        return '<span class="social-item">' + label + '<div class="social-tooltip' + dirClass + '">' + tooltipBody + '</div></span>';
      }
      return '<a class="social-item" href="' + l.url + '" target="_blank" rel="noopener">' + label + '</a>';
    }).join('');

    // Attach load/error handlers to tooltip images after DOM insertion
    socialEl.querySelectorAll('.social-tooltip img').forEach(function (img) {
      img.onload = function () {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('[About] Tooltip image loaded:', this.src, 'naturalSize:', this.naturalWidth, 'x', this.naturalHeight);
        }
      };
      img.onerror = function () {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.error('[About] Tooltip image failed:', this.src);
        }
        this.style.display = 'none';
        var fallback = document.createElement('span');
        fallback.textContent = getLang() === 'zh' ? '图片加载失败' : 'Image failed to load';
        fallback.style.cssText = 'color:var(--accent-warm);font-size:10px;padding:4px;';
        this.parentNode.appendChild(fallback);
      };
    });

    // Mobile: tap to toggle tooltip
    socialEl.querySelectorAll('.social-item').forEach(function (item) {
      if (item.tagName.toLowerCase() === 'a') return;
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        var isActive = item.classList.contains('active');
        socialEl.querySelectorAll('.social-item').forEach(function (si) {
          si.classList.remove('active');
        });
        if (!isActive) item.classList.add('active');
      });
    });
    if (!window.PianoApp._aboutOutsideClickBound) {
      window.PianoApp._aboutOutsideClickBound = true;
      document.addEventListener('click', function () {
        var s = document.querySelector('.about-social');
        if (!s) return;
        s.querySelectorAll('.social-item').forEach(function (si) {
          si.classList.remove('active');
        });
      });
    }
  }

  // Avatar
  var avatarImg = container.querySelector('.about-avatar img');
  if (avatarImg && about.avatar) {
    avatarImg.src = about.avatar;
    avatarImg.alt = pickField(about, 'avatarAlt') || '';
  }

  // Stagger animation for hero section
  var hero = container.querySelector('.about-hero');
  if (!hero) {
    window.PianoApp.rerenderPage = window.PianoApp.initAbout;
    return;
  }

  // Respect reduced motion / back-forward nav: show immediately
  if (document.documentElement.classList.contains('prefers-no-animation') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hero.classList.add("active");
  } else if (!hero.classList.contains('active')) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          hero.classList.add("active");
          observer.disconnect();
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });
    observer.observe(hero);
  }

  // Register re-render hook for the lang toggle
  window.PianoApp.rerenderPage = window.PianoApp.initAbout;
};

// ─── Experience ─────────────────────────────────────────
window.PianoApp.initMap = function () {
  var mapContainer = document.getElementById("experience-map");
  var listContainer = document.getElementById("experience-list");

  if (!mapContainer || !listContainer) return;

  var experiences = window.PianoApp.data.experiences.slice().sort(function (a, b) {
    return b.startDate.localeCompare(a.startDate);
  });

  // ——— lat/lon ⇌ SVG projection (kept for adding future markers) ———
  // viewBox 0 0 775 570, 4 control points via least-squares.
  // function latLonToSvg(lon, lat) {
  //   return { x: 11.8294 * lon - 854.08, y: -15.0429 * lat + 867.23 };
  // }

  var extraMarkers = [
    { city: "珠海",   cityEn: "Zhuhai",      x: 502.4, y: 514.5 },
    { city: "北京",   cityEn: "Beijing",     x: 549.9, y: 255.8 },
    { city: "广州",   cityEn: "Guangzhou",   x: 502.4, y: 503.5 },
    { city: "兴宁",   cityEn: "Xingning",    x: 532.5, y: 487.6 },
    { city: "武汉",   cityEn: "Wuhan",       x: 516.7, y: 400.5 },
    { city: "景德镇", cityEn: "Jingdezhen",  x: 551.5, y: 416.4 },
    { city: "大理",   cityEn: "Dali",        x: 334.6, y: 470.2 },
    { city: "大同",   cityEn: "Datong",      x: 505.6, y: 251.0 },
    { city: "天津",   cityEn: "Tianjin",     x: 554.7, y: 266.9 },
    { city: "岳阳",   cityEn: "Yueyang",     x: 499.2, y: 419.5 },
    { city: "梵净山", cityEn: "Mt. Fanjing", x: 448.6, y: 433.8 },
    { city: "武功山", cityEn: "Mt. Wugong",  x: 518.2, y: 438.5 },
    { city: "柳州",   cityEn: "Liuzhou",     x: 454.9, y: 473.4 },
    { city: "大红山", cityEn: "Mt. Dahong",  x: 488.2, y: 194.7 },
    { city: "佛山",   cityEn: "Foshan",      x: 496.1, y: 503.5 }
  ];

  function renderMapMarkers() {
    var markersGroup = document.getElementById("map-markers");
    if (!markersGroup) return;

    // Wipe any previous markers (so a lang switch doesn't pile up duplicates)
    markersGroup.innerHTML = '';

    var svgEl = markersGroup.ownerSVGElement;
    var lang = getLang();
    var pickCity = function (m) { return lang === 'en' ? (m.cityEn || m.city) : m.city; };

    var markerIdx = 0;
    function createMarker(pos, label, isDraggable) {
      var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "svg-marker");
      g.style.animationDelay = (markerIdx * 0.18 + Math.random() * 0.08).toFixed(2) + "s";
      markerIdx++;
      if (isDraggable) g.style.cursor = "move";

      var pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pulse.setAttribute("cx", pos.x);
      pulse.setAttribute("cy", pos.y);
      pulse.setAttribute("r", 14);
      pulse.setAttribute("fill", "none");
      pulse.setAttribute("stroke", "#B8A99A");
      pulse.setAttribute("stroke-width", "1");
      pulse.setAttribute("class", "marker-pulse");
      g.appendChild(pulse);

      var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", pos.x);
      dot.setAttribute("cy", pos.y);
      dot.setAttribute("r", 4);
      dot.setAttribute("fill", "#F2ECE2");
      dot.setAttribute("stroke", "#A68B6B");
      dot.setAttribute("stroke-width", "1.5");
      dot.setAttribute("class", "marker-dot");
      g.appendChild(dot);

      var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", pos.x);
      text.setAttribute("y", pos.y - 14);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#6B5E53");
      text.setAttribute("font-size", "11");
      text.setAttribute("font-family", "system-ui, sans-serif");
      text.setAttribute("font-weight", "500");
      text.setAttribute("class", "marker-label");
      text.textContent = label;
      g.appendChild(text);

      function showLabel() {
        dot.setAttribute("r", "5.6");
        dot.setAttribute("fill", "#A68B6B");
        text.style.opacity = "1";
      }
      function hideLabel() {
        dot.setAttribute("r", "4");
        dot.setAttribute("fill", "#F2ECE2");
        text.style.opacity = "0";
      }

      g.addEventListener("mouseenter", showLabel);
      g.addEventListener("mouseleave", hideLabel);

      // Drag support
      if (isDraggable) {
        var dragging = false;

        function getSvgPoint(evt) {
          var pt = svgEl.createSVGPoint();
          var cx = evt.clientX, cy = evt.clientY;
          if (evt.touches && evt.touches.length > 0) {
            cx = evt.touches[0].clientX;
            cy = evt.touches[0].clientY;
          } else if (evt.changedTouches && evt.changedTouches.length > 0) {
            cx = evt.changedTouches[0].clientX;
            cy = evt.changedTouches[0].clientY;
          }
          pt.x = cx;
          pt.y = cy;
          return pt.matrixTransform(svgEl.getScreenCTM().inverse());
        }

        function updatePos(sx, sy) {
          pulse.setAttribute("cx", sx);
          pulse.setAttribute("cy", sy);
          dot.setAttribute("cx", sx);
          dot.setAttribute("cy", sy);
          text.setAttribute("x", sx);
          text.setAttribute("y", sy - 14);
        }

        g.addEventListener("mousedown", function (e) {
          e.preventDefault();
          dragging = true;
          g.style.cursor = "grabbing";
        });

        svgEl.addEventListener("mousemove", function (e) {
          if (!dragging) return;
          var p = getSvgPoint(e);
          updatePos(p.x, p.y);
        });

        svgEl.addEventListener("mouseup", function () {
          if (!dragging) return;
          dragging = false;
          g.style.cursor = "move";
        });

        svgEl.addEventListener("mouseleave", function () {
          if (dragging) {
            dragging = false;
            g.style.cursor = "move";
          }
        });

        g.addEventListener("touchstart", function (e) {
          e.preventDefault();
          dragging = true;
          showLabel();
        }, { passive: false });

        g.addEventListener("touchmove", function (e) {
          if (!dragging) return;
          e.preventDefault();
          var p = getSvgPoint(e);
          updatePos(p.x, p.y);
        }, { passive: false });

        g.addEventListener("touchend", function () {
          if (!dragging) return;
          dragging = false;
        });
      }

      markersGroup.appendChild(g);
    }

    var shuffled = extraMarkers.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    shuffled.forEach(function (m) {
      createMarker({ x: m.x, y: m.y }, pickCity(m), true);
    });

    // Mobile: tap blank area to hide all marker labels (one-time bind)
    if (svgEl && !svgEl.dataset.outsideBound) {
      svgEl.dataset.outsideBound = '1';
      svgEl.addEventListener("touchstart", function (e) {
        if (e.target.closest(".svg-marker")) return;
        markersGroup.querySelectorAll(".marker-label").forEach(function (t) {
          t.style.opacity = "0";
        });
        markersGroup.querySelectorAll(".marker-dot").forEach(function (d) {
          d.setAttribute("r", "4");
          d.setAttribute("fill", "#F2ECE2");
        });
      }, { passive: true });
    }
  }

  function renderExperienceList() {
    var lang = getLang();
    var presentLabel = tStr('experience.present') || 'Present';

    listContainer.innerHTML = "";
    experiences.forEach(function (exp) {
      var item = document.createElement("div");
      item.className = "experience-item";

      function fmtDate(d) {
        if (!d) return presentLabel;
        var parts = d.split("-");
        return parts[0] + "/" + parts[1];
      }
      var dateHtml =
        '<div class="col-dates">' +
          '<span class="col-date-end">' + fmtDate(exp.endDate) + '</span>' +
          '<span class="col-date-start">' + fmtDate(exp.startDate) + '</span>' +
        "</div>";

      var tags = pickField(exp, 'tags') || [];
      var tagsHtml = "";
      if (tags.length > 0) {
        tags.forEach(function (t) { tagsHtml += '<span class="tag">' + t + "</span>"; });
        tagsHtml = '<div class="tag-row">' + tagsHtml + "</div>";
      }

      var orgName = pickField(exp, 'orgName') || exp.orgName;
      var position = pickField(exp, 'position') || exp.position || '';
      var orgLocation = pickField(exp, 'orgLocation') || exp.orgLocation || '';

      var companyHtml = '<div class="company-name">' + orgName + '</div>';
      var positionHtml = position ? '<div class="col-position">' + position + '</div>' : "";
      var cityHtml = orgLocation ? '<div class="col-city">' + orgLocation + '</div>' : "";

      var rolesHtml = "";
      if (exp.roles && exp.roles.length > 0) {
        exp.roles.forEach(function (role) {
          var desc = (lang === 'en' && role.descriptionEn != null)
            ? role.descriptionEn
            : (role.description || '');
          desc = desc.replace(/\n/g, '<br>');

          // Show only the active-language title (no bilingual stack).
          var roleTitle = lang === 'zh' ? role.titleZh : role.titleEn;
          rolesHtml +=
            '<div class="job-item">' +
              '<div class="job-desc"><div>' + desc + "</div></div>" +
              '<div class="job-role">' +
                '<span class="role-zh">' + (roleTitle || '') + "</span>" +
              "</div>" +
            "</div>";
        });
      } else {
        var fallbackDesc = (lang === 'en' && exp.descriptionEn != null)
          ? exp.descriptionEn
          : (exp.description || '');
        rolesHtml =
          '<div class="job-item">' +
            '<div class="job-desc"><div>' + fallbackDesc.replace(/\n/g, '<br>') + "</div></div>" +
            '<div class="job-role"><span class="role-zh">' + position + "</span></div>" +
          "</div>";
      }

      item.innerHTML =
        '<div class="col-left">' + dateHtml + tagsHtml + companyHtml + positionHtml + cityHtml + "</div>" +
        '<div class="col-content">' + rolesHtml + "</div>";

      listContainer.appendChild(item);
    });
  }

  renderMapMarkers();
  renderExperienceList();

  // Register re-render hook for the lang toggle
  window.PianoApp.rerenderPage = window.PianoApp.initMap;
};
