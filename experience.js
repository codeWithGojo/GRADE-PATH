/* Interaction polish: mode tabs, appearance, mobile navigation and native scrolling. */
(function () {
  "use strict";
  const { byId, state, setMode, onPage, onChange } = GP;
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sidebar = document.querySelector(".sidebar");
  const phone = matchMedia("(max-width: 899px)");
  const profile = byId("profile-sheet");
  const entry = byId("entry-sheet");
  const panel = byId("workspace-menu");
  const profileButton = byId("menu-toggle");
  const panelAnchor = document.createComment("Profile tools");
  panel.before(panelAnchor);
  sidebar.classList.add("enhanced-nav");

  profileButton.addEventListener("click", () => {
    if (!phone.matches) return;
    profile.append(panel);
    profile.showModal();
    profileButton.setAttribute("aria-expanded", "true");
  });
  profile.addEventListener("close", () => {
    panelAnchor.after(panel);
    profileButton.setAttribute("aria-expanded", "false");
  });
  for (const sheet of [profile, entry]) {
    sheet.addEventListener("click", event => {
      if (event.target === sheet || event.target.closest("[data-sheet-close]")) sheet.close();
    });
  }

  const steps = document.createElement("div");
  steps.className = "entry-steps";
  const back = GP.clickButton("Back", () => moveStep(-1));
  const next = GP.clickButton("Next", () => moveStep(1));
  const counter = GP.el("span");
  counter.setAttribute("role", "status");
  steps.append(back, counter, next);
  let activeForm;
  let anchor;
  let items;
  let position = 0;

  function refreshSteps() {
    const rows = [...items.children];
    position = Math.max(0, Math.min(position, rows.length - 1));
    rows.forEach((row, index) => { row.hidden = index !== position; });
    back.disabled = position === 0;
    next.disabled = position >= rows.length - 1;
    counter.textContent = (activeForm.id === "grade-form" ? "Course " : "Subject ") + (position + 1) + " of " + rows.length;
  }

  function moveStep(delta) {
    const current = items.children[position];
    if (delta > 0 && [...current.querySelectorAll("input,select")].some(control => !control.reportValidity())) return;
    position += delta;
    refreshSteps();
    items.children[position]?.querySelector("input")?.focus();
  }

  const observer = new MutationObserver(records => {
    if (!activeForm) return;
    const added = records.flatMap(record => [...record.addedNodes]).find(node => node.contains(document.activeElement));
    if (added) position = [...items.children].indexOf(added);
    refreshSteps();
  });

  function openEntry(id) {
    if (!phone.matches || entry.open) return;
    activeForm = byId(id);
    items = byId(id === "grade-form" ? "grade-courses" : "school-subjects");
    anchor = document.createComment("Result form");
    activeForm.before(anchor);
    entry.append(activeForm);
    items.after(steps);
    position = 0;
    refreshSteps();
    observer.observe(items, { childList: true });
    entry.showModal();
  }

  entry.addEventListener("invalid", event => {
    if (!activeForm || !items.contains(event.target)) return;
    position = [...items.children].findIndex(row => row.contains(event.target));
    refreshSteps();
  }, true);
  entry.addEventListener("close", () => {
    observer.disconnect();
    [...items.children].forEach(row => { row.hidden = false; });
    steps.remove();
    anchor.replaceWith(activeForm);
    activeForm = null;
  });
  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-entry]");
    if (!phone.matches || !trigger?.dataset.entry) return;
    event.preventDefault();
    const id = trigger.dataset.entry;
    if (trigger.hash && GP.page() !== trigger.hash.slice(1)) {
      GP.go(trigger.hash.slice(1));
      window.addEventListener("hashchange", () => openEntry(id), { once: true });
    } else openEntry(id);
  });
  window.addEventListener("gradepath-edit-results", event => openEntry(event.detail));
  phone.addEventListener("change", () => {
    if (profile.open) profile.close();
    if (entry.open) entry.close();
  });

  let swipe;
  document.addEventListener("touchstart", event => {
    swipe = null;
    if (!phone.matches || event.touches.length !== 1 || profile.open || entry.open ||
      event.target.closest("input,textarea,select,button,a,iframe")) return;
    const point = event.touches[0];
    if (point.clientX < 24 || point.clientX > innerWidth - 24) return;
    swipe = { x: point.clientX, y: point.clientY, target: event.target };
  }, { passive: true });
  document.addEventListener("touchcancel", () => { swipe = null; });
  document.addEventListener("touchend", event => {
    const start = swipe;
    swipe = null;
    if (!start) return;
    const point = event.changedTouches[0];
    const delta = point.clientX - start.x;
    if (Math.abs(delta) < 75 || Math.abs(delta) < 2 * Math.abs(point.clientY - start.y)) return;
    const task = start.target.closest("#tasks .row");
    if (task) {
      const check = task.querySelector('input[type="checkbox"]');
      if (delta > 0 && check && !check.checked) check.click();
      return;
    }
    const links = [...document.querySelectorAll(".phone-dock a:not([hidden])")];
    const active = links.findIndex(link => link.hasAttribute("aria-current"));
    if (active >= 0) {
      const nextTab = links[active + (delta < 0 ? 1 : -1)];
      if (nextTab) GP.go(nextTab.hash.slice(1));
    }
  }, { passive: true });

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
  document.querySelectorAll(".nav a, .phone-dock a").forEach(anchor => {
    const shape = icons[anchor.hash.slice(1)]; if (!shape) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round"); svg.setAttribute("aria-hidden", "true"); svg.classList.add("nav-icon"); svg.innerHTML = shape; anchor.prepend(svg);
  });
  // Line icons reused from TerraScope's SiteHeader and ArrowUpRight components.
  const repoIcons = {
    menu: "M4 6h16M4 12h16M4 18h16",
    close: "M6 6l12 12M18 6 6 18",
    arrow: "M6 18 18 6M6 6h12v12"
  };
  document.querySelectorAll("[data-repo-icon]").forEach(control => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS(svg.namespaceURI, "path");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.7");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("repo-icon");
    path.setAttribute("d", repoIcons[control.dataset.repoIcon]);
    svg.append(path);
    control.prepend(svg);
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
  onPage(() => {
    if (profile.open) profile.close();
    if (entry.open) entry.close();
    requestAnimationFrame(scrollState);
  });
  document.querySelectorAll(".nav a").forEach(link => link.addEventListener("click", () => {
    if (profile.open) profile.close();
  }));
  onChange(() => requestAnimationFrame(scrollState));
  // Content is never hidden while waiting for JavaScript or an observer callback.
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        if (!reduceMotion.matches) entry.target.animate([{ opacity: .35, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 180, easing: "cubic-bezier(.22,1,.36,1)" });
        observer.unobserve(entry.target);
      }
    }, { threshold: .08 });
    document.querySelectorAll("#overview > .split").forEach(element => observer.observe(element));
  }
})();
