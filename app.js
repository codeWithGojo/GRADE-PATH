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
    const allowed = state.mode === "secondary" ? !["grades", "projects"].includes(current) : !["school", "exams"].includes(current);
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
    const results = school ? "#school" : "#grades";
    byId("home-breakdown").href = results;
    byId("strength-results-link").href = results;
    byId("hero-score-label").textContent = school ? "Latest term average" : "Current CGPA";
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
      if (anchor.getAttribute("href") === "#" + current ||
        (anchor.closest(".phone-dock") && anchor.hash === "#study" && ["exams", "projects", "coding", "tutor"].includes(current))) anchor.setAttribute("aria-current", "page");
      else anchor.removeAttribute("aria-current");
    }
    byId("breadcrumb").textContent = pageNames[current];
    document.title = state.mode === "university" && (current === "overview" || current === "grades")
      ? "CGPA Calculator for Nigerian Universities (5.0 and 4.0) | GradePath"
      : pageNames[current] + " | GradePath";
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
    const school = state.mode === "secondary";
    const current = C.overall(state);
    const summary = C.schoolSummary(state.schoolTerms);
    const hasResults = school ? summary.average !== null : current.units > 0;
    const exams = school ? Object.entries(state.exams).map(([name, exam]) => ({ name, date: exam.date }))
      : state.profiles.map(profile => ({ name: profile.name || profile.code, date: profile.date }));
    const exam = exams.filter(item => item.date && item.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (school && exam) byId("hero-results-link").dataset.exam = exam.name;
    else delete byId("hero-results-link").dataset.exam;
    const days = exam ? C.daysBetween(today, exam.date) : Infinity;
    const revision = days <= 7;
    const tasks = state.tasks.filter(task => task.date === today && !task.completed);
    const lastQuiz = state.attempts.find(attempt => school ? Boolean(attempt.exam) : !attempt.exam);
    const priorities = C.priorityList(state, today);
    const action = byId("hero-results-link");
    byId("overview-heading").textContent = revision ? "Time to revise" : hasResults ? "Your study overview" : school ? "Term results calculator" : "CGPA calculator";
    byId("overview-intro").textContent = revision
      ? exam.name + (days === 0 ? " is today. Review your priority topics." : " is in " + days + (days === 1 ? " day." : " days."))
      : hasResults ? "Check your results, upcoming assessments and study tasks." : school
        ? "Record your latest term results to see how you’re doing across subjects."
        : "Enter course grades and units on a 5.0 or 4.0 scale. See what GPA you need to reach your graduation target.";
    byId("hero-action-label").textContent = revision ? "Start revision" : !hasResults ? (school ? "Add term results" : "Calculate CGPA") : tasks.length ? "Open today’s tasks" : "Plan a study session";
    action.href = revision ? (school ? "#exams" : "#study") : !hasResults ? (school ? "#school" : "#grades") : "#study";
    action.dataset.entry = !hasResults && !revision ? (school ? "school-form" : "grade-form") : "";
    byId("home-summary").hidden = !hasResults && !revision;
    byId("home-breakdown").hidden = !hasResults;
    byId("home-details").hidden = !hasResults && !revision;
    const score = byId("hero-cgpa");
    const previous = score.textContent;
    score.textContent = !hasResults ? "" : school ? summary.average.toFixed(1) + "%" : current.gpa.toFixed(2) + " / " + state.scale.toFixed(1);
    if (previous && previous !== score.textContent && score.textContent &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      score.animate([{ opacity: .55 }, { opacity: 1 }], { duration: 170 });
    }
    byId("hero-units").textContent = !hasResults ? "" : school ? state.schoolClass + " · View term breakdown" : current.units + " units · View chart and what-if";
    byId("home-exam").textContent = exam ? exam.name + " · " + C.dateText(exam.date) : "No assessment date saved";
    byId("home-task").textContent = tasks[0]?.title || "No task planned for today";
    byId("home-quiz").textContent = lastQuiz ? lastQuiz.correct + " / " + lastQuiz.total + " · " + lastQuiz.topic : "Take a practice set to see your score";

    const completed = new Map();
    for (const task of state.tasks) {
      if (task.completed && task.completed <= today) completed.set(task.completed, (completed.get(task.completed) || 0) + 1);
    }
    let streak = 0;
    const offset = completed.has(today) ? 0 : 1;
    while (completed.has(C.shiftDay(-streak - offset, today))) streak++;
    byId("home-activity").hidden = !hasResults && !revision && !completed.size;
    byId("activity-label").textContent = streak ? streak + (streak === 1 ? " study day in a row." : " study days in a row.") : "Complete a study task to start a streak.";
    byId("activity-grid").replaceChildren(...Array.from({ length: 28 }, (_, index) => {
      const day = C.shiftDay(index - 27, today);
      const count = completed.get(day) || 0;
      const cell = el("span");
      cell.dataset.activity = Math.min(count, 3);
      cell.title = C.dateText(day) + " · " + count + (count === 1 ? " task" : " tasks");
      return cell;
    }));
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
