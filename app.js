/* Shared UI, local storage, navigation, and the overview page. */
(function () {
  "use strict";
  const C = window.GradePathCore;
  const catalog = window.GradePathCatalog;
  const byId = id => document.getElementById(id);
  const value = id => byId(id).value;
  const number = id => byId(id).valueAsNumber;
  const listeners = [];
  const pageListeners = [];
  const defaults = ["Programming", "Web development", "Maths", "Databases", "Operating systems", "Networking", "Writing"];
  let state = C.blankState();
  let storageError = false;

  function el(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function status(id, message, tone = "") {
    const element = byId(id);
    element.textContent = message;
    element.dataset.tone = tone;
  }

  function notify(message) {
    const notice = byId("global-status");
    notice.textContent = message;
    notice.hidden = !message;
  }

  try {
    const backup = localStorage.getItem(C.storageKey) ?? localStorage.getItem("gradepath-v1");
    if (backup) state = C.normalizeState(JSON.parse(backup));
  } catch {
    notify("Saved data could not be loaded. Import a GradePath backup if you have one.");
  }

  function commit(render = true) {
    try {
      localStorage.setItem(C.storageKey, JSON.stringify(state));
      if (storageError) notify("");
      storageError = false;
    } catch {
      storageError = true;
      notify("Browser storage could not save this change. Export study data before you refresh.");
    }
    if (render) listeners.forEach(fn => fn());
    return !storageError;
  }

  function onChange(fn) {
    listeners.push(fn);
    fn();
  }

  function onPage(fn) {
    pageListeners.push(fn);
    fn(page());
  }

  function clickButton(label, handler, className = "") {
    const button = el("button", label, className);
    button.type = "button";
    button.addEventListener("click", handler);
    return button;
  }

  function link(label, href, className = "") {
    const anchor = el("a", label, className);
    anchor.href = href;
    if (/^https?:/i.test(href)) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }
    return anchor;
  }

  function row(title, detail, ...actions) {
    const item = el("div", undefined, "row row-layout");
    const content = el("div");
    content.append(el("strong", title, "row-title"));
    if (detail) content.append(el("p", detail, "secondary"));
    item.append(content);
    if (actions.length) {
      const controls = el("div", undefined, "actions");
      controls.append(...actions);
      item.append(controls);
    }
    return item;
  }

  function renderList(id, items, message) {
    byId(id).replaceChildren(...(items.length ? items : [el("p", message, "empty")]));
  }

  function download(filename, blob) {
    const url = URL.createObjectURL(blob);
    const anchor = el("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function replaceOptions(select, options, placeholder) {
    const selected = select.value;
    select.replaceChildren();
    if (placeholder) select.append(new Option(placeholder, ""));
    for (const [key, label] of options) select.append(new Option(label, key));
    if ([...select.options].some(option => option.value === selected)) select.value = selected;
  }

  function knownCourses() {
    const names = new Map(state.semesters.flatMap(term => term.courses)
      .filter(course => course.code).map(course => [course.code, course.subject || course.code]));
    for (const course of state.profiles) names.set(course.code, course.name || course.code);
    return names;
  }

  function weekTasks(start = C.weekStart()) {
    const end = C.shiftDay(6, start);
    return state.tasks.filter(task => task.date >= start && task.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }

  const pageNames = Object.fromEntries([...document.querySelectorAll(".nav a")]
    .map(anchor => [anchor.getAttribute("href").slice(1), anchor.textContent.trim()]));

  function page() {
    const current = location.hash.slice(1);
    const allowed = state.mode === "secondary" ? current !== "grades" : !["school", "exams"].includes(current);
    return Object.hasOwn(pageNames, current) && allowed ? current : "overview";
  }

  function applyMode() {
    const school = state.mode === "secondary";
    document.documentElement.dataset.mode = state.mode;
    document.querySelectorAll("[data-mode-only]").forEach(element => { element.hidden = element.dataset.modeOnly !== state.mode; });
    document.querySelectorAll("[data-mode]").forEach(button => {
      const selected = button.dataset.mode === state.mode;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    byId("main").setAttribute("aria-labelledby", "mode-" + state.mode);
    byId("workspace-label").textContent = school ? "Secondary school" : "University";
    byId("workspace-eyebrow").textContent = school ? "Your secondary school workspace" : "Your university workspace";
    byId("overview-heading").replaceChildren(document.createTextNode(school ? "Build confidence." : "Make progress."), document.createElement("br"), document.createTextNode(school ? "Own exam day." : "See it happen."));
    ["hero-results-link", "path-results", "strength-results-link"].forEach(id => { byId(id).href = school ? "#school" : "#grades"; });
    byId("hero-results-link").textContent = school ? "Add my term results" : "Add my grades";
    byId("path-results-label").textContent = school ? "Record your subject marks" : "Record your semester results";
    byId("hero-score-label").textContent = school ? "Latest term average" : "Your current CGPA";
    byId("profile-code").placeholder = school ? "MATHS" : "CSC 304";
    byId("profile-name").placeholder = school ? "Mathematics" : "Operating Systems";
    byId("profile-topic").placeholder = school ? "Quadratic equations" : "CPU scheduling";
    byId("tutor-question").placeholder = school ? "Help me understand quadratic equations, step by step." : "Explain CPU scheduling using an example.";
  }

  function setMode(mode) {
    if (!["secondary", "university"].includes(mode) || mode === state.mode) return;
    state.mode = mode;
    const saved = commit();
    route();
    byId("mode-announcement").textContent = (mode === "secondary" ? "Secondary school" : "University") + " mode selected. " + (saved ? "Your results are preserved." : "Could not save this preference. Export your data before leaving.");
    window.dispatchEvent(new Event("gradepath-mode"));
  }

  function route(focus = false) {
    applyMode();
    const current = page();
    if (location.hash && location.hash !== "#main" && location.hash !== "#" + current) history.replaceState(null, "", "#" + current);
    for (const section of document.querySelectorAll(".page")) section.hidden = section.id !== current;
    for (const anchor of document.querySelectorAll(".nav a, .phone-dock a")) {
      if (anchor.getAttribute("href") === "#" + current) anchor.setAttribute("aria-current", "page");
      else anchor.removeAttribute("aria-current");
    }
    byId("breadcrumb").textContent = pageNames[current];
    document.title = pageNames[current] + " · GradePath";
    pageListeners.forEach(fn => fn(current));
    if (focus && location.hash !== "#main") {
      byId(current).querySelector("h1").focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }

  function go(current) {
    if (location.hash !== "#" + current) location.hash = current;
    else route(true);
  }

  function renderOverview() {
    applyMode();
    const today = C.localDay();
    byId("today-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "long" }).format(new Date());
    const week = C.weekStart(today);
    const tasks = weekTasks(week);
    const done = tasks.filter(task => task.completed);
    const current = C.overall(state);
    const school = state.mode === "secondary";
    const lastQuiz = state.attempts.find(attempt => school ? Boolean(attempt.exam) : !attempt.exam);
    const priorities = C.priorityList(state, today);
    byId("week-label").textContent = "Week of " + C.dateText(week);
    byId("overview-intro").textContent = priorities.length
      ? "Start with " + (priorities[0].topic || priorities[0].name || priorities[0].code) + ". See why below."
      : "Add your results and upcoming assessments to plan your week.";
    byId("hero-cgpa").textContent = current.units ? current.gpa.toFixed(2) + " / " + state.scale.toFixed(1) : "—";
    byId("hero-units").textContent = current.units ? current.units + " CGPA units · " + state.semesters.length + " saved semester(s)" : "Save a semester to see your CGPA.";
    const termBars = C.timeline(state).slice(-6).map(term => {
      const meter = el("meter");
      meter.max = state.scale;
      meter.value = term.cumulative.gpa;
      return meter;
    });
    byId("hero-bars").hidden = !termBars.length;
    byId("hero-bars").replaceChildren(...termBars);
    byId("metric-tasks").textContent = done.length + " / " + tasks.length;
    byId("metric-minutes").textContent = done.reduce((sum, task) => sum + task.minutes, 0) + " min completed";
    byId("metric-quiz").textContent = lastQuiz ? lastQuiz.correct + " / " + lastQuiz.total : "—";
    byId("metric-quiz-label").textContent = lastQuiz ? lastQuiz.topic + " · " + C.dateText(lastQuiz.date) : "Try a practice set";
    byId("metric-lab").textContent = new Set(state.labPassed).size + " / " + catalog.lessons.length;
    renderList("priorities", priorities.slice(0, 3).map(priority =>
      row(priority.topic || priority.name || priority.code, [priority.code, ...priority.reasons].join(" · "))
    ), "Add a course, confidence rating, or assessment date in the Study Room.");
    const insights = C.subjectInsights(state);
    const repeat = insights.filter(insight => insight.count > 1);
    const strongest = repeat[0];
    const weakest = repeat[repeat.length - 1];
    const distinguish = strongest && weakest && strongest.gpa - weakest.gpa > 0.00001;
    renderList("strengths", insights.map(insight => {
      const label = insight.count === 1 ? "Early signal"
        : distinguish && insight.gpa === strongest.gpa ? "Strongest so far"
        : distinguish && insight.gpa === weakest.gpa ? "Area to work on" : "Subject average";
      const evidence = C.letters.filter(grade => insight.grades[grade])
        .map(grade => insight.grades[grade] + " × " + grade).join(", ");
      const trend = insight.termGpas.length > 1
        ? "Last two results " + insight.termGpas.slice(-2).map(gpa => gpa.toFixed(2)).join(" → ") : "";
      return row(insight.subject + " · " + insight.gpa.toFixed(2) + " / " + state.scale.toFixed(1),
        [label, evidence, insight.units + " units", trend].filter(Boolean).join(" · "));
    }), "Tag courses by subject when you save a semester to see which areas you’re doing well in.");

    if (school) {
      const summary = C.schoolSummary(state.schoolTerms);
      byId("hero-cgpa").textContent = summary.average === null ? "—" : summary.average.toFixed(1) + "%";
      byId("hero-units").textContent = summary.average === null ? "Add your first term to start your journey." : state.schoolClass + " · " + summary.subjects.length + " subjects · Target " + state.schoolTarget + "%";
      byId("overview-intro").textContent = "Keep your term results, WAEC, NECO and JAMB preparation in view. One focused session at a time.";
      const bars = summary.history.slice(-6).map(term => { const meter = el("meter"); meter.max = 100; meter.value = term.average; return meter; });
      byId("hero-bars").replaceChildren(...bars);
      byId("hero-bars").hidden = !bars.length;
      renderList("strengths", summary.subjects.map((subject, index) => row(subject.name + " · " + subject.score + "%",
        subject.score >= state.schoolTarget ? "At or above your personal target" : (state.schoolTarget - subject.score).toFixed(1) + " points below your personal target")), "Save your term results to discover your strongest subjects and where to improve.");
      const examPlan = state.exams[state.selectedExam];
      const examPriorities = examPlan ? C.examInsights(examPlan, state.selectedExam).order.slice(0, 3) : [];
      const termPriorities = [...summary.subjects].reverse().filter(subject => subject.score < state.schoolTarget).slice(0, 3);
      renderList("priorities", examPriorities.length ? examPriorities.map(subject => row(subject.name,
        state.selectedExam + " · " + (subject.topic || "Choose a topic to revise") + " · Confidence " + subject.confidence + "/5", link("Revise", "#exams", "button quiet")))
        : termPriorities.map(subject => row(subject.name, "Latest mark " + subject.score + "% · Personal target " + state.schoolTarget + "%", link("Plan a session", "#study", "button quiet"))), "Add term results or an exam subject plan to choose your next revision topic.");
    }

    byId("subjects").replaceChildren(...[...new Set([...defaults, ...insights.map(insight => insight.subject)])]
      .map(subject => new Option(subject, subject)));
    byId("known-courses").replaceChildren(...[...knownCourses()].map(([code, name]) => new Option(name, code)));
  }

  byId("export-data").addEventListener("click", () => {
    download("gradepath-backup-" + C.localDay() + ".json", new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
  });
  const importInput = byId("import-data");
  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    if (!file) return;
    try {
      if (file.size > 7_000_000) throw new Error("This backup is too large.");
      const imported = C.normalizeState(JSON.parse(await file.text()));
      if (!window.confirm("Replace this workspace with the imported backup? Export your current data first if you want to keep it.")) return;
      Object.assign(state, imported);
      window.dispatchEvent(new Event("gradepath-import"));
      const stored = commit();
      route();
      window.dispatchEvent(new Event("gradepath-mode"));
      if (stored) notify("GradePath backup imported.");
    } catch {
      notify("Import failed. Choose a GradePath JSON backup.");
    } finally {
      importInput.value = "";
    }
  });
  importInput.addEventListener("focus", () => document.querySelector(".upload-label").classList.add("keyboard-focus"));
  importInput.addEventListener("blur", () => document.querySelector(".upload-label").classList.remove("keyboard-focus"));
  window.addEventListener("hashchange", () => route(true));
  onChange(renderOverview);
  route();

  window.GP = { C, catalog, byId, value, number, el, status, notify, state, commit, onChange, onPage, clickButton, link,
    row, renderList, download, replaceOptions, weekTasks, go, page, setMode };
})();
