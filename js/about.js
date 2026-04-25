window.PianoApp = window.PianoApp || {};

window.PianoApp.initAbout = function () {
  const container = document.getElementById("about-container");
  if (container) {
    // Trigger stagger animation
    requestAnimationFrame(() => {
      container.classList.add("active");
    });
  }
};
