window.PianoApp = window.PianoApp || {};

window.PianoApp.initPortfolio = function () {
  const showcaseEl = document.getElementById("portfolio-showcase");
  if (!showcaseEl) return;

  const projects = window.PianoApp.data.projects;
  showcaseEl.innerHTML = projects.map((project, i) => `
    <article class="project-piece ${i % 2 === 1 ? 'project-piece--mirrored' : ''}">
      <div class="project-visual">
        <img src="${project.image}" alt="${project.name}" loading="lazy">
      </div>
      <div class="project-info">
        <div class="project-meta">${project.year} · ${project.category}</div>
        <h2>${project.name}</h2>
        <p>${project.description}</p>
        <div class="project-tech">
          ${project.tech.map(t => `<span class="tag-pill">${t}</span>`).join("")}
        </div>
        ${project.link && project.link !== "#" ? `
          <a href="${project.link}" target="_blank" rel="noopener noreferrer" class="project-link">
            View Project
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 13L13 1M13 1H4M13 1V10" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </a>
        ` : ""}
      </div>
    </article>
  `).join("");
};

window.PianoApp.initAbout = function () {
  const container = document.getElementById("about-container");
  if (!container) return;

  var about = (window.PianoApp.data && window.PianoApp.data.about) || {};

  // Name
  var nameEl = container.querySelector('.about-name');
  if (nameEl && about.name) {
    nameEl.textContent = about.name;
  }

  // Typewriter (supports single string or array of strings)
  var typewriterContainer = container.querySelector('.about-typewriter');
  if (typewriterContainer && about.typewriter) {
    var lines = Array.isArray(about.typewriter) ? about.typewriter : [about.typewriter];
    typewriterContainer.innerHTML = '';

    var BASE_SPEED = 100;    // base milliseconds per character
    var SPEED_VARIANCE = 80; // random variance (±80ms)
    var LINE_GAP = 400;     // pause between lines (ms)
    var INITIAL_DELAY = 400; // initial delay before typing starts (ms)

    // Helper to get random typing delay for each character
    function getRandomDelay() {
      return BASE_SPEED + (Math.random() * SPEED_VARIANCE * 2 - SPEED_VARIANCE);
    }

    // Type each line with random character delays
    var currentLine = 0;
    var currentChar = 0;
    var startTime = null;

    function typeCharacter() {
      if (currentLine >= lines.length) return;

      var line = lines[currentLine];

      // Create span for current line if not exists
      var lineSpan = typewriterContainer.children[currentLine * 2]; // each line has span + possible br
      if (!lineSpan) {
        lineSpan = document.createElement('span');
        lineSpan.className = 'typewriter-text';
        lineSpan.style.borderRight = '2px solid var(--accent-warm)';
        typewriterContainer.appendChild(lineSpan);
      }

      // Add current character
      lineSpan.textContent += line[currentChar];
      currentChar++;

      // Schedule next character
      if (currentChar < line.length) {
        setTimeout(typeCharacter, getRandomDelay());
      } else {
        // Line complete, add blink caret
        lineSpan.style.animation = 'blink-caret 0.75s step-end infinite';

        // Schedule next line or finish
        setTimeout(function() {
          if (currentLine < lines.length - 1) {
            // Remove caret from current line
            lineSpan.style.animation = 'none';
            lineSpan.style.borderRight = 'none';

            // Add line break
            var br = document.createElement('br');
            typewriterContainer.appendChild(br);

            // Move to next line
            currentLine++;
            currentChar = 0;
            typeCharacter();
          }
        }, LINE_GAP);
      }
    }

    // Start typing after initial delay
    setTimeout(typeCharacter, INITIAL_DELAY);
  }

  // Handwriting — hide if no content
  var handwritingWrap = container.querySelector('.about-handwriting');
  if (handwritingWrap) {
    if (about.handwriting) {
      var handwritingText = handwritingWrap.querySelector('.handwriting-text');
      if (handwritingText) handwritingText.textContent = about.handwriting;
    } else {
      handwritingWrap.style.display = 'none';
    }
  }

  // Bio (array of paragraphs)
  var bioEl = container.querySelector('.about-bio');
  if (bioEl && Array.isArray(about.bio)) {
    bioEl.innerHTML = '';
    about.bio.forEach(function (text) {
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
      if (l.type === 'tooltip') {
        var tooltipBody = l.tooltipType === 'image'
          ? '<img src="' + l.tooltipContent + '" alt="' + l.name + '">'
          : '<span>' + l.tooltipContent + '</span>';
        var dirClass = l.tooltipDirection ? ' tooltip-' + l.tooltipDirection : '';
        return '<span class="social-item">' + l.name + '<div class="social-tooltip' + dirClass + '">' + tooltipBody + '</div></span>';
      }
      return '<a class="social-item" href="' + l.url + '" target="_blank" rel="noopener">' + l.name + '</a>';
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
        fallback.textContent = '图片加载失败';
        fallback.style.cssText = 'color:var(--accent-warm);font-size:10px;padding:4px;';
        this.parentNode.appendChild(fallback);
      };
    });
  }

  // Avatar
  var avatarImg = container.querySelector('.about-avatar img');
  if (avatarImg && about.avatar) {
    avatarImg.src = about.avatar;
    avatarImg.alt = about.avatarAlt || '';
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

window.PianoApp.initMap = function () {
  var mapContainer = document.getElementById("experience-map");
  var listContainer = document.getElementById("experience-list");

  if (!mapContainer || !listContainer) return;

  var experiences = window.PianoApp.data.experiences.slice().sort(function (a, b) {
    return b.startDate.localeCompare(a.startDate);
  });

  // ——— lat/lon ⇌ SVG projection (保留供后续新增数据点使用) ———
  // viewBox 0 0 775 570, 4 control points via least-squares:
  //   Dali(100.30,25.68)->(334.9,469.4)  Fanjingshan(108.72,27.89)->(445.9,438.9)
  //   Liuzhou(109.43,24.33)->(455.0,474.5)  Datong(113.37,40.10)->(504.9,250.6)
  // function latLonToSvg(lon, lat) {
  //   var x = 11.8294 * lon - 854.08;
  //   var y = -15.0429 * lat + 867.23;
  //   return { x: x, y: y };
  // }
  // function svgToLatLon(x, y) {
  //   var lon = (x + 854.08) / 11.8294;
  //   var lat = (867.23 - y) / 15.0429;
  //   return { lon: lon, lat: lat };
  // }

  var extraMarkers = [
    { city: "珠海", x: 502.4, y: 514.5 },
    { city: "北京", x: 549.9, y: 255.8 },
    { city: "广州", x: 502.4, y: 503.5 },
    { city: "兴宁", x: 532.5, y: 487.6 },
    { city: "武汉", x: 516.7, y: 400.5 },
    { city: "景德镇", x: 551.5, y: 416.4 },
    { city: "大理", x: 334.6, y: 470.2 },
    { city: "大同", x: 505.6, y: 251.0 },
    { city: "天津", x: 554.7, y: 266.9 },
    { city: "岳阳", x: 499.2, y: 419.5 },
    { city: "梵净山", x: 448.6, y: 433.8 },
    { city: "武功山", x: 518.2, y: 438.5 },
    { city: "柳州", x: 454.9, y: 473.4 },
    { city: "大红山", x: 488.2, y: 194.7 },
    { city: "佛山", x: 496.1, y: 503.5 }
];

  function renderMapMarkers() {
    var markersGroup = document.getElementById("map-markers");
    if (!markersGroup) return;

    function createMarker(pos, label, isDraggable, markerType) {
      var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "svg-marker");
      if (isDraggable) g.style.cursor = "move";

      // Outer pulse ring
      var pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pulse.setAttribute("cx", pos.x);
      pulse.setAttribute("cy", pos.y);
      pulse.setAttribute("r", 14);
      pulse.setAttribute("fill", "none");
      pulse.setAttribute("stroke", "#B8A99A");
      pulse.setAttribute("stroke-width", "1");
      pulse.setAttribute("class", "marker-pulse");
      g.appendChild(pulse);

      // Main dot
      var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", pos.x);
      dot.setAttribute("cy", pos.y);
      dot.setAttribute("r", 4);
      dot.setAttribute("fill", "#F2ECE2");
      dot.setAttribute("stroke", "#A68B6B");
      dot.setAttribute("stroke-width", "1.5");
      dot.setAttribute("class", "marker-dot");
      g.appendChild(dot);

      // City label — hidden by default, shown on hover
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

      g.addEventListener("mouseenter", function () {
        dot.setAttribute("r", "5.6");
        dot.setAttribute("fill", "#A68B6B");
        text.style.opacity = "1";
      });
      g.addEventListener("mouseleave", function () {
        dot.setAttribute("r", "4");
        dot.setAttribute("fill", "#F2ECE2");
        text.style.opacity = "0";
      });

      // Drag support
      if (isDraggable) {
        var dragging = false;
        var svgEl = markersGroup.ownerSVGElement;

        function getSvgPoint(evt) {
          var pt = svgEl.createSVGPoint();
          pt.x = evt.clientX;
          pt.y = evt.clientY;
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
      }

      markersGroup.appendChild(g);
    }

    extraMarkers.forEach(function (m) {
      createMarker({ x: m.x, y: m.y }, m.city, true, "extra");
    });
  }

  function renderExperienceList() {
    listContainer.innerHTML = "";
    experiences.forEach(function (exp) {
      var item = document.createElement("div");
      item.className = "experience-item";

      function fmtDate(d) {
        if (!d) return "Present";
        var parts = d.split("-");
        return parts[0] + "/" + parts[1];
      }
      var dateHtml =
        '<div class="col-dates">' +
          '<span class="col-date-end">' + fmtDate(exp.endDate) + '</span>' +
          '<span class="col-date-start">' + fmtDate(exp.startDate) + '</span>' +
        "</div>";

      var tagsHtml = "";
      if (exp.tags && exp.tags.length > 0) {
        exp.tags.forEach(function (t) {
          tagsHtml += '<span class="tag">' + t + "</span>";
        });
        tagsHtml = '<div class="tag-row">' + tagsHtml + "</div>";
      }

      var companyHtml = '<div class="company-name">' + exp.orgName + '</div>';

      var positionHtml = exp.position
        ? '<div class="col-position">' + exp.position + '</div>'
        : "";

      var cityHtml = exp.orgLocation
        ? '<div class="col-city">' + exp.orgLocation + '</div>'
        : "";

      var rolesHtml = "";
      if (exp.roles && exp.roles.length > 0) {
        exp.roles.forEach(function (role) {
          rolesHtml +=
            '<div class="job-item">' +
              '<div class="job-desc"><div>' + (role.description || '').replace(/\n/g, '<br>') + "</div></div>" +
              '<div class="job-role">' +
                '<span class="role-zh">' + role.titleZh + "</span>" +
                '<span class="role-en">' + role.titleEn + "</span>" +
              "</div>" +
            "</div>";
        });
      } else {
        rolesHtml =
          '<div class="job-item">' +
            '<div class="job-desc"><div>' + (exp.description || '').replace(/\n/g, '<br>') + "</div></div>" +
            '<div class="job-role"><span class="role-zh">' + exp.position + "</span></div>" +
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
};
