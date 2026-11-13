/* Interaction polish: mode tabs, appearance, mobile navigation and native scrolling. */
(function () {
  "use strict";
  const { byId, state, setMode, onPage, onChange } = GP;
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sidebar = document.querySelector(".sidebar");
  const panel = byId("workspace-menu");
  const toggles = [byId("menu-toggle"), byId("dock-menu")];
  let menuTrigger;
  sidebar.classList.add("enhanced-nav");

  function closeMenu(restoreFocus = false) {
    sidebar.classList.remove("menu-open");
    toggles.forEach(button => button.setAttribute("aria-expanded", "false"));
    if (restoreFocus) menuTrigger?.focus();
  }

  toggles.forEach(button => button.addEventListener("click", () => {
    if (sidebar.classList.contains("menu-open")) {
      closeMenu(true);
      return;
    }
    menuTrigger = button;
    sidebar.classList.add("menu-open");
    toggles.forEach(toggle => toggle.setAttribute("aria-expanded", "true"));
    (panel.querySelector('a[aria-current="page"]') || panel.querySelector("a")).focus({ preventScroll: true });
  }));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && sidebar.classList.contains("menu-open")) closeMenu(true);
  });
  document.addEventListener("click", event => {
    if (!panel.contains(event.target) && !toggles.some(button => button.contains(event.target))) closeMenu();
  });
  window.matchMedia("(min-width: 900px)").addEventListener("change", () => closeMenu());
  document.querySelectorAll(".nav a, .wordmark, .phone-dock a").forEach(anchor => {
    anchor.addEventListener("click", () => {
      const wasOpen = sidebar.classList.contains("menu-open");
      closeMenu();
      if (wasOpen && anchor.hash === location.hash) {
        byId(GP.page()).querySelector("h1").focus({ preventScroll: true });
      }
    });
  });

  const icons = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    projects: '<path d="M3 7h7l2 2h9v11H3zM3 7V4h7l2 3h7v2"/>',
    grades: '<path d="M4 20V4m0 16h17M8 16v-5m5 5V7m5 9V3"/>',
    school: '<path d="M5 3h11l3 3v15H5zM8 8h5m-5 5h8m-8 4h8"/>',
    exams: '<path d="M8 4H5v17h14V4h-3M8 2h8v5H8zM8 12h8m-8 4h5"/>',
    study: '<path d="M3 4h5q4 0 4 3v14q0-3-4-3H3zM21 4h-5q-4 0-4 3v14q0-3 4-3h5z"/>',
    practice: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    coding: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
    tutor: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
    account: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'
  };
  document.querySelectorAll(".nav a, .phone-dock a, #dock-menu").forEach(anchor => {
    const shape = anchor.id === "dock-menu" ? '<path d="M4 6h16M4 12h16M4 18h16"/>' : icons[anchor.hash.slice(1)]; if (!shape) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round"); svg.setAttribute("aria-hidden", "true"); svg.classList.add("nav-icon"); svg.innerHTML = shape; anchor.prepend(svg);
  });
  const bar = document.querySelector(".t-tabs");
  const pill = bar.querySelector(".t-tabs-pill");
  const tabs = [...bar.querySelectorAll(".t-tab")];
  function moveTo(tab, animate) {
    const prev = pill.style.transition;
    if (!animate) pill.style.transition = "none";
    pill.style.transform = `translateX(${tab.offsetLeft}px)`;
    pill.style.width = `${tab.offsetWidth}px`;
    if (!animate) { void pill.offsetWidth; pill.style.transition = prev; }
  }
  const active = () => tabs.find(tab => tab.getAttribute("aria-selected") === "true") || tabs[0];
  tabs.forEach(tab => tab.addEventListener("click", () => { setMode(tab.dataset.mode); moveTo(active(), true); }));
  bar.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (tabs.indexOf(active()) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[index].focus(); tabs[index].click();
  });
  requestAnimationFrame(() => moveTo(active(), false));
  window.addEventListener("resize", () => moveTo(active(), false));
  window.addEventListener("gradepath-mode", () => {
    moveTo(active(), true);
    byId("quiz-exam").value = state.mode === "secondary" ? state.selectedExam : "";
    byId("quiz-exam").dispatchEvent(new Event("change"));
  });
  // Select the relevant question bank on a fresh visit as well as mode changes.
  byId("quiz-exam").value = state.mode === "secondary" ? state.selectedExam : "";
  byId("quiz-exam").dispatchEvent(new Event("change"));
  function renderTheme() {
    const dark = root.dataset.theme === "dark";
    byId("theme-toggle").setAttribute("aria-pressed", String(dark));
    byId("theme-toggle").setAttribute("aria-label", "Switch to " + (dark ? "light" : "dark") + " theme");
    byId("theme-label").textContent = dark ? "Light" : "Dark";
  }
  byId("theme-toggle").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("gradepath-theme", root.dataset.theme); } catch { GP.notify("Theme changed for this visit. Browser storage is unavailable."); }
    renderTheme(); window.dispatchEvent(new Event("gradepath-theme"));
  });
  renderTheme();
  const progress = document.querySelector(".scroll-progress");
  let pending = false;
  function scrollState() {
    pending = false;
    const available = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${available > 0 ? Math.min(1, Math.max(0, window.scrollY / available)) : 0})`;
    byId("back-to-top").hidden = window.scrollY < 500;
  }
  window.addEventListener("scroll", () => { if (!pending) { pending = true; requestAnimationFrame(scrollState); } }, { passive: true });
  window.addEventListener("resize", scrollState);
  byId("back-to-top").addEventListener("click", () => { window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "instant" : "smooth" }); byId(GP.page()).querySelector("h1").focus({ preventScroll: true }); });
  onPage(() => { closeMenu(); requestAnimationFrame(scrollState); });
  onChange(() => requestAnimationFrame(scrollState));
  // Content is never hidden while waiting for JavaScript or an observer callback.
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        if (!reduceMotion.matches) entry.target.animate([{ opacity: .35, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 400, easing: "cubic-bezier(.22,1,.36,1)" });
        observer.unobserve(entry.target);
      }
    }, { threshold: .08 });
    document.querySelectorAll(".path-strip, #overview > .split, .workspace-footer").forEach(element => observer.observe(element));
  }
})();
