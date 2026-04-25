window.PianoApp = window.PianoApp || {};

window.PianoApp.initPortfolio = function () {
  const showcaseEl = document.getElementById("portfolio-showcase");
  if (!showcaseEl) return;

  const projects = window.PianoApp.data.projects;
  showcaseEl.innerHTML = projects.map((project, i) => `
    <article class="project-piece ${i % 2 === 1 ? 'project-piece--mirrored' : ''} animate-fade-in-up delay-${Math.min(i + 1, 4)}">
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
