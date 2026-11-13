/* WAEC, NECO, and JAMB subject plans, mock marks, and practice. */
(function () {
  "use strict";
  const { C, catalog, byId, value, number, el, status, state, commit, onChange, clickButton, row, renderList, link, replaceOptions } = GP;
  const labels = { WAEC: "WAEC / WASSCE", NECO: "NECO / SSCE", JAMB: "JAMB / UTME" };
  const subjects = byId("exam-subjects");
  const template = byId("exam-subject-template");
  const subjectOptions = ["English Language", "Use of English", "Mathematics", "Physics", "Chemistry", "Biology",
    "Economics", "Government", "Literature in English", "Geography", "Agricultural Science", "Civic Education", "Commerce", "Further Mathematics"];
  const prepOptions = [...new Set(catalog.examQuestions.map(question => question.subject))];
  let active = state.selectedExam;
  let dirty = false;

  function initialSubjects(exam) {
    return exam === "JAMB"
      ? [{ name: "Use of English" }, {}, {}, {}]
      : [{ name: "English Language" }, { name: "Mathematics" }];
  }

  function numberSubjects() {
    const rows = [...subjects.children];
    rows.forEach((item, index) => {
      const remove = item.querySelector("button");
      item.querySelector("legend").textContent = "Subject " + (index + 1);
      remove.hidden = active === "JAMB";
      remove.disabled = rows.length === 1;
      remove.setAttribute("aria-label", "Remove subject " + (index + 1));
    });
    byId("add-exam-subject").hidden = active === "JAMB";
    byId("add-exam-subject").disabled = rows.length >= 12;
  }

  function addSubject(info = {}, focus = false) {
    const item = template.content.firstElementChild.cloneNode(true);
    const name = item.querySelector(".exam-name");
    name.value = info.name || "";
    if (active === "JAMB" && !subjects.children.length) {
      name.value = "Use of English";
      name.readOnly = true;
    }
    item.querySelector(".exam-score").value = info.score ?? "";
    item.querySelector(".exam-topic").value = info.topic || "";
    item.querySelector(".exam-confidence").value = info.confidence || 3;
    item.querySelector("button").addEventListener("click", () => {
      const adjacent = item.nextElementSibling || item.previousElementSibling;
      item.remove();
      dirty = true;
      numberSubjects();
      adjacent?.querySelector(".exam-name").focus();
    });
    subjects.append(item);
    numberSubjects();
    if (focus) name.focus();
  }

  function renderExam() {
    const current = state.exams[active];
    const info = C.examInsights(current || { subjects: [] }, active);
    const mark = active === "JAMB" ? (info.fullMock ? info.total + " / 400" : "—")
      : info.mean === null ? "—" : info.mean.toFixed(1) + " / 100";
    byId("exam-mock").textContent = mark;
    const date = current?.date ? " · Exam " + C.dateText(current.date) : "";
    const goal = current?.target;
    const progress = active === "JAMB" && info.fullMock && goal !== null
      ? (info.total >= goal ? " · Mock meets your " + goal + " target" : " · " + (goal - info.total) + " points below your target") : "";
    byId("exam-mock-detail").textContent = info.fullMock ? "Total of four entered mock marks" + progress + date
      : active === "JAMB" ? info.marks.length + " of 4 mock marks entered" + date
        : info.marks.length ? "Average across " + info.marks.length + " marked subject(s)" + date
          : "Add mock marks to see subject strengths" + date + ".";

    const marked = [...info.marks].sort((a, b) => b.score - a.score);
    const best = marked[0];
    const lowest = marked.at(-1);
    const distinct = marked.length > 1 && best.score !== lowest.score;
    renderList("exam-insights", info.order.map(subject => {
      const signal = subject.score === null ? ""
        : distinct && subject.score === best.score ? "Highest mock mark" : distinct && subject.score === lowest.score ? "Revise first" : "";
      const targetNote = active !== "JAMB" && goal != null && subject.score !== null
        ? (subject.score >= goal ? "Meets target" : goal - subject.score + " points below target") : "";
      return row(subject.name, [
        subject.score === null ? "Confidence " + subject.confidence + "/5" : "Mock " + subject.score + "/100",
        signal, targetNote, subject.topic
      ].filter(Boolean).join(" · "),
      clickButton("Plan revision", () => addRevisionTask(subject), "quiet"));
    }), "Save your subject plan to see a revision breakdown.");

    const set = new Set([...prepOptions, ...state.questions.filter(question => question.exams.includes(active)).map(question => question.subject).filter(Boolean)]);
    for (const name of current?.subjects.map(subject => subject.name) || []) set.add(name);
    const options = [...set].filter(name => name !== "English Language" && name !== "Use of English");
    const first = active === "JAMB" ? "Use of English" : "English";
    const unique = [first, ...options.filter(name => name !== "English").sort()];
    replaceOptions(byId("exam-practice-subject"), unique.map(name => [name, name]), "Mixed subjects");

    const official = catalog.examResources[active];
    renderList("exam-resources", [row(official[0], official[1], link("Open official site", official[2], "button quiet"))], "");
  }

  function fillExam() {
    const current = state.exams[active];
    byId("exam-plan-title").textContent = labels[active] + " subject plan";
    byId("exam-instructions").textContent = active === "JAMB"
      ? "Plan for Use of English and three other subjects. Check your programme’s combination in JAMB IBASS."
      : "Add the subjects you’re preparing for and any mock marks you have.";
    byId("exam-target-label").textContent = active === "JAMB" ? "Target total (/400)" : "Target per subject (/100)";
    byId("exam-score-target").max = active === "JAMB" ? 400 : 100;
    byId("exam-score-target").placeholder = active === "JAMB" ? "280" : "75";
    byId("exam-score-target").value = current?.target ?? "";
    byId("exam-date").value = current?.date || "";
    document.querySelectorAll("[data-exam]").forEach(button => button.setAttribute("aria-pressed", button.dataset.exam === active));
    subjects.replaceChildren();
    const input = current?.subjects.length ? current.subjects : initialSubjects(active);
    if (active === "JAMB") {
      const english = input.find(subject => subject.name?.toLowerCase() === "use of english");
      const remaining = input.filter(subject => subject !== english);
      addSubject(english);
      for (let index = 0; index < 3; index++) addSubject(remaining[index]);
    } else input.forEach(subject => addSubject(subject));
    byId("exam-practice-subject").value = "";
    status("exam-status", "");
    status("exam-practice-status", "");
    dirty = false;
    renderExam();
  }

  document.querySelectorAll("[data-exam]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.exam === active) return;
      if (dirty && !window.confirm("Switch exams without saving these changes?")) return;
      active = button.dataset.exam;
      state.selectedExam = active;
      commit();
      fillExam();
    });
  });

  byId("exam-form").addEventListener("input", () => { dirty = true; status("exam-status", ""); });
  byId("add-exam-subject").addEventListener("click", () => { dirty = true; addSubject({}, true); });
  byId("exam-form").addEventListener("submit", event => {
    event.preventDefault();
    const inputs = Array.from(subjects.children, fieldset => ({
      name: fieldset.querySelector(".exam-name").value,
      confidence: Number(fieldset.querySelector(".exam-confidence").value),
      score: fieldset.querySelector(".exam-score").valueAsNumber,
      topic: fieldset.querySelector(".exam-topic").value
    }));
    const plan = C.normalizeExam(active, { date: value("exam-date"), target: number("exam-score-target"), subjects: inputs });
    if (plan.subjects.length !== inputs.length || (active === "JAMB" && plan.subjects.length !== 4)) {
      status("exam-status", "Enter a different name for each subject.", "error");
      return;
    }
    state.exams[active] = plan;
    state.selectedExam = active;
    dirty = false;
    status("exam-status", commit() ? "Exam plan saved." : "Plan saved for this session only.", "success");
  });

  function addRevisionTask(subject) {
    const title = "Revise " + active + " " + (subject.topic || subject.name);
    const today = C.localDay();
    if (state.tasks.length >= 400 || state.tasks.some(task => task.title === title && task.date === today)) {
      status("exam-status", "This revision task is already in today’s plan, or the plan is full.");
      return;
    }
    state.tasks.push({ id: C.id(), title: C.clean(title, 120), course: active, date: today, minutes: 25, completed: "" });
    status("exam-status", commit() ? "Revision added to today’s Study Room plan." : "Revision added for this session.", "success");
  }

  byId("exam-practice").addEventListener("submit", event => {
    event.preventDefault();
    const message = GP.startExamPractice(active, value("exam-practice-subject"), Number(value("exam-practice-time")));
    status("exam-practice-status", message, message ? "error" : "");
  });
  byId("ask-exam-tutor").addEventListener("click", () => {
    const subject = value("exam-practice-subject") || state.exams[active]?.subjects[0]?.name || "general revision";
    const topic = state.exams[active]?.subjects.find(item => item.name.toLowerCase() === subject.toLowerCase())?.topic;
    GP.askAboutExam(active, subject, topic);
  });

  byId("exam-subject-options").replaceChildren(...subjectOptions.map(subject => new Option(subject, subject)));
  fillExam();
  onChange(renderExam);
  window.addEventListener("gradepath-import", () => { active = state.selectedExam; fillExam(); });
})();
