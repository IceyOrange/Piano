window.PianoApp = window.PianoApp || {};

window.PianoApp.initPortfolio = function () {
  const scrollerEl = document.getElementById("portfolio-scroller");
  const modalEl = document.getElementById("project-modal");
  const modalContentEl = document.getElementById("project-modal-content");
  const mobileListEl = document.getElementById("mobile-project-list");
  const isMobile = window.innerWidth < 768;

  function openModal(project) {
    if (!modalContentEl) return;
    modalContentEl.innerHTML = `
      <button class="project-modal-close" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
      <img class="project-modal-image" src="${project.image}" alt="${project.name}">
      <div class="project-modal-body">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <span class="project-card-meta year">${project.year}</span>
          <span class="dot" style="width:4px;height:4px;border-radius:50%;background:var(--warm-ivory-faint);display:inline-block;"></span>
          <span class="project-card-meta category">${project.category}</span>
        </div>
        <h2>${project.name}</h2>
        <div class="role">${project.description}</div>
        <p>${project.description} This project showcases a blend of technical precision and creative vision, built with modern tooling and an eye for detail.</p>
        <div class="project-modal-tags">
          ${project.tech.map(t => `<span class="tag-pill">${t}</span>`).join("")}
        </div>
        ${project.link ? `
          <a href="${project.link}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:0.5rem;font-size:0.875rem;color:var(--accent-warm);transition:color 0.3s;" onmouseover="this.style.color='var(--warm-ivory)'" onmouseout="this.style.color='var(--accent-warm)'">
            View Project
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 13L13 1M13 1H4M13 1V10" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </a>
        ` : ""}
      </div>
    `;

    // Close button handler
    modalContentEl.querySelector(".project-modal-close").addEventListener("click", closeModal);

    modalEl.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (modalEl) {
      modalEl.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  // Click outside to close
  if (modalEl) {
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) closeModal();
    });
  }

  // Escape to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  if (isMobile) {
    // Mobile: vertical list
    if (!mobileListEl) return;
    mobileListEl.innerHTML = window.PianoApp.data.projects.map((project, i) => `
      <div class="project-card animate-fade-in-up delay-${Math.min(i + 1, 8)}" data-id="${project.id}">
        <img src="${project.image}" alt="${project.name}">
        <div class="project-card-overlay"></div>
        <div class="project-card-content">
          <div class="project-card-meta">
            <span class="year">${project.year}</span>
            <span class="dot"></span>
            <span class="category">${project.category}</span>
          </div>
          <h3>${project.name}</h3>
          <p>${project.description}</p>
        </div>
      </div>
    `).join("");

    mobileListEl.querySelectorAll(".project-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.id;
        const project = window.PianoApp.data.projects.find((p) => p.id === id);
        if (project) openModal(project);
      });
    });
  } else {
    // Desktop: horizontal scroller
    if (!scrollerEl) return;
    scrollerEl.innerHTML = window.PianoApp.data.projects.map((project) => `
      <div data-id="${project.id}">
        <div class="project-card">
          <img src="${project.image}" alt="${project.name}">
          <div class="project-card-overlay"></div>
          <div class="project-card-content">
            <div class="project-card-meta">
              <span class="year">${project.year}</span>
              <span class="dot"></span>
              <span class="category">${project.category}</span>
            </div>
            <h3>${project.name}</h3>
            <p>${project.description}</p>
          </div>
        </div>
      </div>
    `).join("");

    window.PianoApp.initScroller("#portfolio-scroller", (centerIdx) => {
      // Center index updated
    });

    scrollerEl.querySelectorAll(".project-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.parentElement.dataset.id;
        const project = window.PianoApp.data.projects.find((p) => p.id === id);
        if (project) openModal(project);
      });
    });
  }
};
