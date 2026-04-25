window.PianoApp = window.PianoApp || {};

window.PianoApp.initMenu = function () {
  const btn = document.querySelector(".menu-btn");
  const overlay = document.querySelector(".menu-overlay");
  if (!btn || !overlay) return;

  let isOpen = false;

  btn.addEventListener("click", () => {
    isOpen = !isOpen;
    overlay.classList.toggle("open", isOpen);
    btn.setAttribute("aria-expanded", String(isOpen));
  });

  // Close menu when clicking a link
  overlay.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      isOpen = false;
      overlay.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    });
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      isOpen = false;
      overlay.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
};
