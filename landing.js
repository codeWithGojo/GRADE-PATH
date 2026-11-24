/* Landing page behaviour: hero illustration, header, in-page navigation, reveals,
   magnetic CTAs, the formula preview toggle and the honest Study Pal status. */
(function () {
  "use strict";
  const { byId } = GP;
  const landing = byId("landing");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");

  /* ---- Hero illustration: graph paper, an open notebook, a ring and formula tiles ---- */
  const art = byId("study-art");
  const ctx = art.getContext("2d");
  function drawArt() {
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, art.width, art.height);
    const ink = "#0b0b0c", red = "#c8102e", redLight = "#f0596b", paper = "#f6f3ee", line = "#262529";
    const path = (points, stroke, weight = 1, fill) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      if (fill) { ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = weight; ctx.stroke(); }
    };
    const ellipse = (x, y, rx, ry, angle, stroke, fill, weight = .9) => {
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = weight; ctx.stroke(); }
    };
    const sphere = (x, y, r) => {
      ellipse(x, y, r, r, 0, "#cfcac2", ink);
      for (const k of [.3, .65]) ellipse(x, y, r * k, r, .15, "#6d6a66");
      for (const k of [-.55, 0, .55]) ellipse(x, y + k * r, r * Math.sqrt(1 - k * k), r * .13, -.04, "#6d6a66");
    };
    for (let x = 28; x < 470; x += 18) path([[x, 60], [x, 374]], line, .7);
    for (let y = 68; y < 375; y += 18) path([[25, y], [465, y]], line, .7);
    ellipse(268, 330, 150, 22, -.12, "#3a383d");
    // Notebook: stacked pages with a red cover.
    const front = [[126, 132], [279, 86], [326, 243], [170, 294]];
    for (let i = 10; i >= 0; i--) path(front.map(([x, y]) => [x + i * .9, y + i * 1.2]), i % 2 ? "#4a474d" : "#d8d2c8", 1, i ? paper : red);
    path([[144, 130], [188, 287]], "#7a0a1c", 2);
    ctx.save(); ctx.transform(.98, -.31, .27, .95, 174, 180);
    ctx.font = "italic 50px Fraunces, Georgia, serif"; ctx.fillStyle = "#fff"; ctx.fillText("ƒ(x)", 0, 0);
    for (let i = 0; i < 4; i++) path([[3, 31 + i * 8], [78 - i * 9, 31 + i * 8]], "#ffd0d6", 1);
    ctx.restore();
    // White orbital ring.
    ctx.save(); ctx.translate(346, 128); ctx.rotate(-.72);
    for (let t = 14; t >= 0; t--) ellipse(0, t, 58, 29, 0, "#8d8983", t ? "#e9e4db" : "#fff");
    ellipse(0, 0, 33, 14, 0, ink, ink); ctx.restore();
    sphere(87, 243, 28); sphere(359, 262, 18); sphere(201, 64, 12);
    path([[65, 113], [124, 84], [155, 92]], "#e8e5e4"); path([[149, 86], [155, 92], [145, 95]], "#e8e5e4");
    ctx.save(); ctx.translate(286, 321); ctx.rotate(-.12); ctx.fillStyle = redLight; ctx.fillRect(0, 0, 90, 34);
    ctx.fillStyle = ink; ctx.font = "italic 18px Fraunces, Georgia, serif"; ctx.fillText("a² + b²", 12, 23); ctx.restore();
    ctx.save(); ctx.translate(40, 300); ctx.rotate(.08); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 78, 30);
    ctx.fillStyle = red; ctx.font = "600 15px Inter, system-ui, sans-serif"; ctx.fillText("CGPA 4.33", 9, 20); ctx.restore();
  }
  if (ctx) {
    drawArt();
    // Redraw once the brand fonts arrive so canvas lettering matches the page.
    document.fonts?.load("italic 50px Fraunces").then(drawArt, () => {});
  }

  /* ---- Mode entry points and account creation ---- */
  document.addEventListener("click", event => {
    const enter = event.target.closest("[data-enter]");
    if (enter) GP.setMode(enter.dataset.enter);
    if (event.target.closest("[data-create-account]")) window.dispatchEvent(new Event("gradepath-create"));
  });

  /* ---- Header: scrolled state, in-page links, mobile menu ---- */
  const header = byId("lp-header");
  const links = byId("lp-links");
  const menu = byId("lp-menu");
  function setMenu(open) {
    links.classList.toggle("is-open", open);
    menu.setAttribute("aria-expanded", String(open));
    menu.querySelector(".lp-menu-label").textContent = open ? "Close" : "Menu";
  }
  menu.addEventListener("click", () => setMenu(!links.classList.contains("is-open")));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && links.classList.contains("is-open")) { setMenu(false); menu.focus(); }
  });
  function scrollToId(id) {
    const target = byId(id);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - (id === "lp-hero" ? 200 : header.offsetHeight - 1);
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion.matches ? "auto" : "smooth" });
    const heading = target.querySelector("h1, h2");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
  landing.addEventListener("click", event => {
    const link = event.target.closest("[data-lp-scroll], [data-lp-top]");
    if (!link) return;
    event.preventDefault();
    setMenu(false);
    if (link.hasAttribute("data-lp-top")) { window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" }); return; }
    scrollToId(link.dataset.lpScroll);
  });
  // On the landing page, "Skip to content" should land on the landing content, not open the workspace.
  document.querySelector(".skip").addEventListener("click", event => {
    if (landing.hidden) return;
    event.preventDefault();
    byId("landing-heading").focus();
  });
  let pending = false;
  function onScroll() {
    pending = false;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", () => { if (!pending && !landing.hidden) { pending = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---- Reveal on scroll and current-section highlighting ---- */
  if ("IntersectionObserver" in window) {
    if (!reduceMotion.matches) document.documentElement.classList.add("js-motion");
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("is-in"); reveal.unobserve(entry.target); }
    }, { threshold: .12, rootMargin: "0px 0px -6% 0px" });
    landing.querySelectorAll("[data-reveal]").forEach(element => reveal.observe(element));
    const linkFor = Object.fromEntries([...links.querySelectorAll("[data-lp-scroll]")].map(link => [link.dataset.lpScroll, link]));
    const spy = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        for (const link of Object.values(linkFor)) link.removeAttribute("aria-current");
        linkFor[entry.target.id]?.setAttribute("aria-current", "true");
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    landing.querySelectorAll(".lp-section[id]").forEach(section => spy.observe(section));
  }

  /* ---- Magnetic CTAs: spring with stiffness 500, damping 40 (mass 1) ---- */
  function magnetic(element) {
    let x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0, frame = 0, last = 0;
    const k = 500, c = 40;
    function step(now) {
      const dt = Math.min(.032, (now - (last || now)) / 1000 || 1 / 60);
      last = now;
      for (let i = 0; i < 4; i++) {
        const h = dt / 4;
        vx += (-k * (x - tx) - c * vx) * h; vy += (-k * (y - ty) - c * vy) * h;
        x += vx * h; y += vy * h;
      }
      element.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      if (Math.abs(x - tx) + Math.abs(y - ty) + Math.abs(vx) + Math.abs(vy) > .05) frame = requestAnimationFrame(step);
      else { frame = 0; last = 0; if (!tx && !ty) element.style.transform = ""; }
    }
    const kick = () => { if (!frame) frame = requestAnimationFrame(step); };
    element.addEventListener("pointermove", event => {
      if (!finePointer.matches || reduceMotion.matches) return;
      const box = element.getBoundingClientRect();
      tx = (event.clientX - box.left - box.width / 2) * .28;
      ty = (event.clientY - box.top - box.height / 2) * .38;
      kick();
    });
    element.addEventListener("pointerleave", () => { tx = 0; ty = 0; kick(); });
  }
  document.querySelectorAll("[data-magnetic]").forEach(magnetic);

  /* ---- Formula preview level toggle ---- */
  const levelButtons = [...landing.querySelectorAll("[data-lp-level]")];
  for (const button of levelButtons) button.addEventListener("click", () => {
    for (const other of levelButtons) other.setAttribute("aria-pressed", String(other === button));
    for (const card of landing.querySelectorAll("[data-lp-card]")) {
      const show = card.dataset.lpCard === button.dataset.lpLevel;
      card.hidden = !show;
      if (show && !reduceMotion.matches) card.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" });
    }
    byId("lp-formula-name").removeAttribute("id");
    landing.querySelector(`[data-lp-card="${button.dataset.lpLevel}"] .lp-formula-name`).id = "lp-formula-name";
  });

  /* ---- Study Pal availability: read the real service status, never assume ---- */
  const palStatus = byId("lp-pal-status"), palText = byId("lp-pal-status-text");
  if (location.protocol === "file:") {
    palStatus.dataset.state = "off";
    palText.textContent = "Study Pal needs the GradePath server. It isn't available when the page is opened as a file.";
  } else {
    fetch("/api/status", { headers: { accept: "application/json" } }).then(response => response.ok ? response.json() : Promise.reject())
      .then(data => {
        const on = Boolean(data.online && data.aiConfigured);
        palStatus.dataset.state = on ? "on" : "off";
        palText.textContent = on ? "Study Pal is switched on for this site. Sign in to use it." : "Study Pal isn't switched on for this site yet. The rest of GradePath works without it.";
      })
      .catch(() => { palStatus.dataset.state = "off"; palText.textContent = "Couldn't check Study Pal right now. The rest of GradePath works without it."; });
  }
})();
