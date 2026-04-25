window.PianoApp = window.PianoApp || {};

window.PianoApp.initScroller = function (containerSelector, onCenterChange) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;

  container.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
    container.style.cursor = "grabbing";
  });

  container.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
  });

  const stopDrag = () => {
    isDragging = false;
    container.style.cursor = "grab";
  };
  container.addEventListener("mouseup", stopDrag);
  container.addEventListener("mouseleave", stopDrag);

  container.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  });

  // Touch support
  container.addEventListener("touchstart", (e) => {
    isDragging = true;
    startX = e.touches[0].pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  }, { passive: true });

  container.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
  }, { passive: true });

  container.addEventListener("touchend", () => {
    isDragging = false;
  });

  // Infinite scroll: triplicate children
  const children = Array.from(container.children);
  const originalCount = children.length;
  children.forEach((c) => container.appendChild(c.cloneNode(true)));
  children.forEach((c) => container.appendChild(c.cloneNode(true)));

  // Center on middle set
  requestAnimationFrame(() => {
    const middleStart = originalCount;
    const firstChild = container.children[middleStart];
    if (firstChild) {
      container.scrollLeft =
        firstChild.offsetLeft - container.clientWidth / 2 + firstChild.clientWidth / 2;
    }
    if (onCenterChange) onCenterChange(middleStart % originalCount);
  });

  // Scroll end snap + center detection
  let timeout;
  container.addEventListener("scroll", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const center = container.scrollLeft + container.clientWidth / 2;
      const childArray = Array.from(container.children);
      let closestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < childArray.length; i++) {
        const child = childArray[i];
        const childCenter = child.offsetLeft + child.clientWidth / 2;
        const dist = Math.abs(childCenter - center);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }
      container.scrollTo({
        left: childArray[closestIdx].offsetLeft - container.clientWidth / 2 + childArray[closestIdx].clientWidth / 2,
        behavior: "smooth",
      });

      // Update center class
      childArray.forEach((c) => c.querySelector(".project-card")?.classList.remove("center"));
      const centerCard = childArray[closestIdx].querySelector(".project-card");
      if (centerCard) centerCard.classList.add("center");

      if (onCenterChange) onCenterChange(closestIdx % originalCount);
    }, 150);
  });
};
