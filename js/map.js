window.PianoApp = window.PianoApp || {};

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

  if (window.PianoApp.initScrollReveal) {
    window.PianoApp.initScrollReveal();
  }
};
