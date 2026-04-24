window.PianoApp = window.PianoApp || {};

window.PianoApp.initMap = function () {
  const isMobile = window.innerWidth < 768;
  const mapContainer = document.getElementById(
    isMobile ? "experience-map-mobile" : "experience-map"
  );
  const cardsContainer = document.getElementById(
    isMobile ? "experience-cards-mobile" : "experience-cards"
  );

  if (!mapContainer || !cardsContainer) return;

  const experiences = window.PianoApp.data.experiences.slice().sort(function (a, b) {
    return b.startDate.localeCompare(a.startDate);
  });

  let activeCardId = null;
  const markerElements = {};
  const cardElements = {};

  function lonLatToSvg(lon, lat) {
    const x = 15 + ((lon - 73) / 62) * 735;
    const y = 5 + ((53 - lat) / 35) * 560;
    return { x, y };
  }

  function highlightMarker(id) {
    Object.keys(markerElements).forEach(function (key) {
      const g = markerElements[key];
      if (key === id) {
        g.classList.add("active");
      } else {
        g.classList.remove("active");
      }
    });
  }

  function collapseCard(id) {
    const card = cardElements[id];
    if (!card) return;
    card.classList.remove("expanded");
    if (activeCardId === id) {
      activeCardId = null;
    }
  }

  function expandCard(id) {
    const card = cardElements[id];
    if (!card) return;
    card.classList.add("expanded");
    activeCardId = id;
    highlightMarker(id);
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function toggleCard(id) {
    if (activeCardId === id) {
      collapseCard(id);
      highlightMarker(null);
    } else {
      if (activeCardId !== null) {
        collapseCard(activeCardId);
      }
      expandCard(id);
    }
  }

  function activateCard(id) {
    if (activeCardId !== null && activeCardId !== id) {
      collapseCard(activeCardId);
    }
    expandCard(id);
  }

  function createCard(exp) {
    const card = document.createElement("div");
    card.className = "experience-card";
    card.setAttribute("data-id", exp.id);

    const logoHtml = exp.orgLogo
      ? '<img src="' + exp.orgLogo + '" alt="' + exp.orgName + '" class="org-logo">'
      : '<div class="org-logo-placeholder">' + exp.orgName.charAt(0) + "</div>";

    const typeLabel = exp.type === "work" ? "工作" : "学习";
    const typeClass = exp.type === "work" ? "work" : "study";

    const labelHtml = exp.orgLabel
      ? '<span class="org-label">' + exp.orgLabel + "</span>"
      : "";

    card.innerHTML =
      '<div class="card-header">' +
        '<div class="card-logo">' + logoHtml + "</div>" +
        '<div class="card-meta">' +
          '<div class="card-top-row">' +
            '<span class="card-type ' + typeClass + '">' + typeLabel + "</span>" +
            '<span class="card-period">' + exp.period + "</span>" +
          "</div>" +
          '<div class="card-org">' + exp.orgName + "</div>" +
          '<div class="card-position">' +
            exp.position + " · " + exp.orgLocation +
          "</div>" +
          labelHtml +
        "</div>" +
        '<span class="expand-icon">&#9662;</span>' +
      "</div>" +
      '<div class="card-detail">' +
        "<p>" + exp.description + "</p>" +
      "</div>";

    card.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleCard(exp.id);
    });

    return card;
  }

  function renderCards() {
    experiences.forEach(function (exp) {
      const card = createCard(exp);
      cardsContainer.appendChild(card);
      cardElements[exp.id] = card;
    });
  }

  function createMarker(exp) {
    const pos = lonLatToSvg(exp.coords.lon, exp.coords.lat);
    const color = exp.type === "work" ? "#D4A574" : "#5B8DEF";
    const radius = exp.type === "work" ? 4 : 3;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "map-marker-group");
    g.setAttribute("data-id", exp.id);
    g.style.cursor = "pointer";

    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.setAttribute("class", "marker-ring");
    ring.setAttribute("cx", pos.x);
    ring.setAttribute("cy", pos.y);
    ring.setAttribute("r", String(radius + 4));
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", color);
    ring.setAttribute("stroke-width", "1");
    ring.setAttribute("opacity", "0");
    g.appendChild(ring);

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", pos.x);
    dot.setAttribute("cy", pos.y);
    dot.setAttribute("r", String(radius));
    dot.setAttribute("fill", color);
    dot.setAttribute("filter", "url(#marker-glow)");
    g.appendChild(dot);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", pos.x);
    text.setAttribute("y", pos.y - radius - 5);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "rgba(245,240,230,0.9)");
    text.setAttribute("font-size", "8");
    text.setAttribute("font-family", "Inter, ui-sans-serif, system-ui, sans-serif");
    text.setAttribute("font-weight", "500");
    text.textContent = exp.orgLocation;
    g.appendChild(text);

    g.addEventListener("click", function (e) {
      e.stopPropagation();
      activateCard(exp.id);
    });

    return g;
  }

  function loadMap() {
    fetch("assets/images/ChinaMap.svg")
      .then(function (r) {
        return r.text();
      })
      .then(function (svgText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const svg = doc.documentElement;

        svg.setAttribute("class", "china-map-svg");
        svg.removeAttribute("width");
        svg.removeAttribute("height");

        let defs = svg.querySelector("defs");
        if (!defs) {
          defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
          svg.appendChild(defs);
        }

        const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
        filter.setAttribute("id", "marker-glow");
        filter.innerHTML =
          '<feGaussianBlur stdDeviation="1.5" result="blur"/>' +
          "<feMerge>" +
            '<feMergeNode in="blur"/>' +
            '<feMergeNode in="SourceGraphic"/>' +
          "</feMerge>";
        defs.appendChild(filter);

        const markersGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        markersGroup.setAttribute("class", "map-markers");

        experiences.forEach(function (exp) {
          const marker = createMarker(exp);
          markersGroup.appendChild(marker);
          markerElements[exp.id] = marker;
        });

        svg.appendChild(markersGroup);
        mapContainer.innerHTML = "";
        mapContainer.appendChild(document.importNode(svg, true));
      })
      .catch(function (err) {
        console.error("Failed to load ChinaMap.svg:", err);
      });
  }

  function setupIntersectionObserver() {
    if (!window.IntersectionObserver) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-id");
            highlightMarker(id);
          }
        });
      },
      {
        threshold: 0.6,
      }
    );

    Object.values(cardElements).forEach(function (card) {
      observer.observe(card);
    });
  }

  function setupClickOutside() {
    document.addEventListener("click", function (e) {
      const target = e.target;
      const isCard = target.closest(".experience-card");
      const isMarker = target.closest(".map-marker-group");
      if (!isCard && !isMarker && activeCardId !== null) {
        collapseCard(activeCardId);
        highlightMarker(null);
      }
    });
  }

  renderCards();
  loadMap();
  setupIntersectionObserver();
  setupClickOutside();
};
