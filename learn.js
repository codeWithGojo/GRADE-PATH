/* Learning library: Nigerian History (with the language roadmap) and the Formula library.
   Renders the structured records in learn-content.js; calculations come from learn-core.js. */
(function () {
  "use strict";
  const { byId, el, onPage } = GP;
  const L = window.GradePathLearn;
  const core = window.GradePathLearnCore;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const svgNS = "http://www.w3.org/2000/svg";
  const remember = (key, value) => { try { localStorage.setItem("gradepath-learn-" + key, value); } catch { /* per-device convenience only */ } };
  const recall = key => { try { return localStorage.getItem("gradepath-learn-" + key) || ""; } catch { return ""; } };

  function svg(tag, attributes = {}) {
    const node = document.createElementNS(svgNS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }
  function reviewBadge(review) {
    const badge = el("span", review.status === "reviewed" ? "Reviewed" : "Draft · awaiting review", "tag review-tag");
    badge.dataset.review = review.status;
    badge.title = review.note || "";
    return badge;
  }
  function sourceList(sources) {
    const list = el("ul", undefined, "source-list");
    for (const source of sources) {
      const item = el("li");
      const title = source.url ? GP.link(source.title, source.url) : el("cite", source.title);
      item.append(title);
      const detail = [source.author, source.publisher, source.year].filter(Boolean).join(", ");
      if (detail) item.append(el("span", " · " + detail));
      list.append(item);
    }
    return list;
  }

  /* ---------------- Nigerian History ---------------- */
  const H = L.history;
  const eraById = Object.fromEntries(H.eras.map(era => [era.id, era]));
  const regionById = Object.fromEntries(H.regions.map(region => [region.id, region]));
  const filters = { era: recall("era"), region: "" };

  function drawMap() {
    const map = byId("history-map");
    map.replaceChildren();
    map.append(svg("title"));
    map.firstChild.textContent = "Schematic map of Nigeria's regions and the Niger and Benue rivers";
    const land = svg("path", { class: "map-land", d: "M38 60 C78 30 150 34 214 40 C268 30 320 22 352 48 C372 84 360 130 342 168 C326 210 300 248 282 286 C258 320 214 334 170 330 C126 332 86 312 58 286 C30 252 24 210 30 168 C34 128 22 92 38 60 Z" });
    const niger = svg("path", { class: "map-river", d: "M30 104 C80 120 120 128 150 150 C176 170 196 186 206 206 C214 228 206 252 196 272 C188 290 176 306 168 330", pathLength: "1" });
    const benue = svg("path", { class: "map-river benue", d: "M356 160 C318 168 286 176 260 186 C238 194 220 200 206 206", pathLength: "1" });
    const delta = svg("path", { class: "map-delta", d: "M168 330 l-22 10 M168 330 l-4 16 M168 330 l18 12" });
    const confluence = svg("circle", { class: "map-confluence", cx: 206, cy: 206, r: 5 });
    map.append(land, niger, benue, delta, confluence);
    for (const region of H.regions.filter(region => region.id !== "national")) {
      const count = H.stories.filter(story => story.region === region.id).length;
      const group = svg("g", { class: "map-region", role: "button", tabindex: "0", "data-region": region.id, "aria-pressed": String(filters.region === region.id), "aria-label": region.label + ", " + count + (count === 1 ? " story" : " stories") });
      group.append(svg("circle", { class: "map-halo", cx: region.x, cy: region.y, r: 18 }), svg("circle", { class: "map-dot", cx: region.x, cy: region.y, r: 6 }));
      const text = svg("text", { x: region.x, y: region.y - 24, "text-anchor": "middle" });
      text.textContent = region.label;
      group.append(text);
      map.append(group);
    }
  }

  function selectRegion(id) {
    filters.region = filters.region === id ? "" : id;
    byId("history-region").value = filters.region;
    renderHistory();
  }

  function renderHistory() {
    const shown = H.stories.filter(story => (!filters.era || story.era === filters.era) && (!filters.region || story.region === filters.region));
    for (const button of byId("history-eras").querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.era === filters.era));
    for (const group of byId("history-map").querySelectorAll(".map-region")) group.setAttribute("aria-pressed", String(group.dataset.region === filters.region));
    const where = filters.region ? " in the " + regionById[filters.region].label.toLowerCase() : "";
    const when = filters.era ? " from " + eraById[filters.era].label.toLowerCase() : "";
    byId("history-count").textContent = shown.length + (shown.length === 1 ? " story" : " stories") + when + where + ".";
    const items = shown.map((story, index) => {
      const item = el("li", undefined, "story");
      item.dataset.era = story.era;
      const marker = el("div", undefined, "story-marker");
      marker.append(el("span", eraById[story.era].label, "story-era"), el("span", story.period, "story-period"));
      const body = el("article", undefined, "story-body");
      body.setAttribute("aria-labelledby", "story-" + story.id);
      const head = el("header", undefined, "story-head");
      const title = el("h2", story.title);
      title.id = "story-" + story.id;
      const meta = el("p", undefined, "story-meta");
      meta.append(el("span", regionById[story.region].label), el("span", story.people));
      head.append(title, meta);
      const evidence = el("ul", undefined, "evidence-list");
      evidence.setAttribute("aria-label", "Evidence");
      for (const item of story.evidence) {
        const row = el("li");
        const chip = el("span", H.evidenceTypes[item.type].label, "evidence-chip");
        chip.dataset.type = item.type;
        row.append(chip, el("span", item.note));
        evidence.append(row);
      }
      body.append(head, el("p", story.summary, "story-summary"), evidence);
      if (story.viewpoints.length) {
        const views = el("aside", undefined, "story-views");
        views.append(el("h3", "Different views"), ...story.viewpoints.map(view => el("p", view)));
        body.append(views);
      }
      if (story.artifact) {
        const object = el("p", undefined, "story-object");
        object.append(el("strong", story.artifact.name), el("span", " · " + story.artifact.note));
        body.append(object);
      }
      const more = el("details", undefined, "story-more");
      more.append(el("summary", "Sources, activity and review"));
      const activity = el("div", undefined, "story-activity");
      activity.append(el("h3", "Think it through"), el("p", story.activity));
      more.append(activity, el("h3", "Sources"), sourceList(story.sources));
      const review = el("p", undefined, "story-review");
      review.append(reviewBadge(story.review), el("span", " " + story.review.note));
      more.append(review);
      body.append(more);
      item.append(marker, body);
      item.dataset.index = index;
      return item;
    });
    const timeline = byId("history-timeline");
    timeline.replaceChildren(...(items.length ? items : [el("li", "No stories match these filters yet. Choose another era or region.", "empty")]));
    if (!reduceMotion.matches) items.forEach((item, index) => item.animate(
      [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }],
      { duration: 340, delay: Math.min(index, 6) * 45, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" }));
  }

  function setupHistory() {
    const eras = byId("history-eras");
    const all = GP.clickButton("All eras", () => { filters.era = ""; remember("era", ""); renderHistory(); });
    all.dataset.era = "";
    eras.append(all, ...H.eras.map(era => {
      const button = GP.clickButton(era.label, () => { filters.era = era.id; remember("era", era.id); renderHistory(); });
      button.dataset.era = era.id;
      button.append(el("small", era.span));
      return button;
    }));
    const region = byId("history-region");
    region.append(new Option("All regions", ""), ...H.regions.map(item => new Option(item.label, item.id)));
    region.addEventListener("change", () => { filters.region = region.value; renderHistory(); });
    if (!eraById[filters.era]) filters.era = "";
    drawMap();
    const map = byId("history-map");
    map.addEventListener("click", event => { const group = event.target.closest(".map-region"); if (group) selectRegion(group.dataset.region); });
    map.addEventListener("keydown", event => {
      const group = event.target.closest(".map-region");
      if (group && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); selectRegion(group.dataset.region); }
    });
    const key = byId("evidence-key");
    key.replaceChildren(...Object.entries(H.evidenceTypes).map(([type, info]) => {
      const item = el("div");
      const chip = el("span", info.label, "evidence-chip");
      chip.dataset.type = type;
      item.append(chip, el("span", info.detail));
      return item;
    }));
    renderHistory();
    renderLanguages();
  }

  function renderLanguages() {
    const open = L.languages.registry.filter(language => language.status === "open");
    byId("language-summary").textContent = open.length
      ? open.length + " language course" + (open.length === 1 ? " is" : "s are") + " open."
      : "No Nigerian-language course is open yet. Each language opens only when its lessons pass every check below.";
    byId("language-requirements").replaceChildren(...L.languages.requirements.map(text => el("li", text)));
    const status = { open: "Open", "in-preparation": "In preparation", planned: "Planned" };
    byId("language-registry").replaceChildren(...L.languages.registry.map(language => {
      const item = el("li", undefined, "language-item");
      const name = el("strong", language.name);
      name.lang = language.code;
      const tag = el("span", status[language.status] + " · phase " + language.phase, "tag");
      tag.dataset.status = language.status;
      item.append(name, tag, el("span", language.script, "secondary"));
      return item;
    }));
  }

  /* ---------------- Formula library ---------------- */
  const E = L.engineering;
  const formula = { level: recall("level") || "all", discipline: "", topic: recall("topic") };

  function visibleTopics() {
    return E.topics.filter(topic => (formula.level === "all" || topic.level === formula.level) && (!formula.discipline || topic.discipline === formula.discipline));
  }

  function renderFormulaIndex() {
    for (const button of byId("formula-levels").querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.level === formula.level));
    const disciplines = [...new Set(E.topics.filter(topic => formula.level === "all" || topic.level === formula.level).map(topic => topic.discipline))];
    GP.replaceOptions(byId("formula-discipline"), disciplines.map(name => [name, name]), "All disciplines");
    formula.discipline = byId("formula-discipline").value;
    const topics = visibleTopics();
    if (!topics.some(topic => topic.id === formula.topic)) formula.topic = topics[0]?.id || "";
    byId("formula-list").replaceChildren(...topics.map(topic => {
      const item = el("li");
      const button = GP.clickButton("", () => { formula.topic = topic.id; remember("topic", topic.id); renderFormulaIndex(); if (matchMedia("(max-width: 899px)").matches) byId("formula-detail").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" }); });
      button.className = "formula-pick";
      button.setAttribute("aria-current", String(topic.id === formula.topic));
      button.append(el("span", topic.display, "formula-pick-eq"), el("span", topic.title, "formula-pick-title"), el("span", E.levels[topic.level] + " · " + topic.discipline, "formula-pick-meta"));
      item.append(button);
      return item;
    }));
    renderFormulaDetail();
  }

  function stepsList(steps) {
    const list = el("ol", undefined, "steps");
    list.append(...steps.map(step => el("li", step)));
    return list;
  }

  function renderFormulaDetail() {
    const detail = byId("formula-detail");
    const topic = E.topics.find(item => item.id === formula.topic);
    if (!topic) { detail.replaceChildren(el("p", "No formulas match this level and discipline yet.", "empty")); return; }
    const head = el("header", undefined, "formula-head");
    const tags = el("div", undefined, "formula-tags");
    const level = el("span", E.levels[topic.level], "tag");
    level.dataset.tone = "accent";
    tags.append(level, el("span", topic.discipline, "tag"), reviewBadge(topic.review));
    const title = el("h2", topic.title);
    title.id = "formula-title";
    head.append(tags, el("p", topic.principle, "eyebrow"), title);
    const display = el("p", topic.display, "formula-display");
    display.setAttribute("aria-label", "Formula: " + topic.display);

    const symbols = el("table", undefined, "symbol-table");
    const caption = el("caption", "What each symbol means");
    const thead = el("thead");
    const header = el("tr");
    header.append(el("th", "Symbol"), el("th", "Quantity"), el("th", "SI unit"));
    thead.append(header);
    const tbody = el("tbody");
    for (const symbol of topic.symbols) {
      const tr = el("tr");
      const unit = el("td");
      unit.append(el("strong", symbol.unit), el("span", " " + symbol.unitName, "secondary"));
      tr.append(el("td", symbol.symbol, "symbol-cell"), el("td", symbol.name), unit);
      tbody.append(tr);
    }
    symbols.append(caption, thead, tbody);

    const assumptions = el("section", undefined, "formula-block");
    assumptions.append(el("h3", "Assumptions"), Object.assign(el("ul"), { className: "plain-list" }));
    assumptions.lastChild.append(...topic.assumptions.map(text => el("li", text)));

    const blocks = [head, display, el("p", topic.explanation, "formula-lead"), symbols, assumptions];
    if (topic.derivation) {
      const derive = el("details", undefined, "formula-block derivation");
      derive.open = topic.level === "university";
      derive.append(el("summary", "Derivation (university level)"), stepsList(topic.derivation));
      blocks.push(derive);
    }

    const worked = core.solve(topic.id, topic.example.target, topic.example.given);
    const example = el("section", undefined, "formula-block worked");
    example.append(el("h3", "Worked example"), el("p", topic.example.prompt));
    if (!worked.error) example.append(stepsList(worked.steps));
    blocks.push(example);

    const calc = el("form", undefined, "formula-block calc");
    calc.noValidate = true;
    calc.setAttribute("aria-labelledby", "calc-title");
    const calcTitle = el("h3", "Try your own numbers");
    calcTitle.id = "calc-title";
    const target = el("select");
    target.id = "calc-target";
    target.append(...topic.solveFor.map(symbol => new Option(symbol + " · " + topic.symbols.find(item => item.symbol === symbol).name, symbol)));
    target.value = topic.example.target;
    const targetLabel = el("label", "Solve for", "field");
    targetLabel.append(target);
    const inputs = el("div", undefined, "fields two calc-inputs");
    const output = el("output", undefined, "calc-output");
    output.setAttribute("aria-live", "polite");
    output.htmlFor = "calc-target";
    function drawInputs() {
      const symbols = core.inputsFor(topic.id, target.value, topic.solveFor);
      inputs.replaceChildren(...symbols.map(symbol => {
        const info = topic.symbols.find(item => item.symbol === symbol);
        const label = el("label", info.symbol + " · " + info.name + " (" + info.unit + ")", "field");
        const input = el("input");
        input.type = "number"; input.step = "any"; input.inputMode = "decimal"; input.required = true;
        input.dataset.symbol = symbol;
        if (topic.example.given[symbol] !== undefined) input.value = topic.example.given[symbol];
        label.append(input);
        return label;
      }));
      output.replaceChildren();
    }
    target.addEventListener("change", drawInputs);
    calc.addEventListener("submit", event => {
      event.preventDefault();
      const values = {};
      for (const input of inputs.querySelectorAll("input")) values[input.dataset.symbol] = input.value === "" ? Number.NaN : input.valueAsNumber;
      const result = core.solve(topic.id, target.value, values);
      if (result.error) {
        output.dataset.tone = "error";
        output.replaceChildren(el("p", result.error));
        inputs.querySelector("input:invalid, input:placeholder-shown")?.focus();
        return;
      }
      output.dataset.tone = "success";
      const answer = el("p", undefined, "calc-answer");
      answer.append(el("span", target.value + " = "), el("strong", core.format(result.value)), el("span", " " + result.unit));
      output.replaceChildren(answer, stepsList(result.steps));
    });
    const submit = el("button", "Calculate", "primary");
    submit.type = "submit";
    calc.append(calcTitle, el("p", "Enter values in SI units. GradePath calculates this with tested code, not AI.", "help"), targetLabel, inputs, submit, output);
    drawInputs();
    blocks.push(calc);

    const practice = el("section", undefined, "formula-block practice");
    const reveal = el("details");
    reveal.append(el("summary", "Show the answer"), el("p", undefined, "practice-answer"), el("p", topic.practice.explanation));
    reveal.querySelector(".practice-answer").append(el("strong", topic.practice.answer));
    practice.append(el("h3", "Practice"), el("p", topic.practice.question), reveal);
    blocks.push(practice);

    const source = el("section", undefined, "formula-block formula-sources");
    source.append(el("h3", "Sources"), sourceList(topic.sources), el("p", topic.review.note, "help"));
    blocks.push(source);

    detail.setAttribute("aria-labelledby", "formula-title");
    detail.replaceChildren(...blocks);
    if (!reduceMotion.matches) detail.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" });
  }

  function setupFormulas() {
    const levels = byId("formula-levels");
    levels.append(...[["all", "All levels"], ["secondary", "Secondary"], ["university", "University"]].map(([id, label]) => {
      const button = GP.clickButton(label, () => { formula.level = id; remember("level", id); renderFormulaIndex(); });
      button.dataset.level = id;
      return button;
    }));
    byId("formula-discipline").addEventListener("change", () => { formula.discipline = byId("formula-discipline").value; renderFormulaIndex(); });
    if (!["all", "secondary", "university"].includes(formula.level)) formula.level = "all";
    renderFormulaIndex();
  }

  let historyReady = false, formulasReady = false;
  onPage(current => {
    if (current === "history" && !historyReady) { historyReady = true; setupHistory(); }
    if (current === "formulas" && !formulasReady) {
      formulasReady = true;
      /* Default the level to the learner's study path on first visit. */
      if (!recall("level")) formula.level = GP.state.mode === "secondary" ? "secondary" : "all";
      setupFormulas();
    }
  });
})();
