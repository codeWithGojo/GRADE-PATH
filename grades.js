/* The semester calculator, grade settings, trajectory, and target tools. */
(function () {
  "use strict";
  const { C, byId, value, number, el, status, state, commit, onChange, onPage, clickButton, row, renderList, download } = GP;
  const gradeForm = byId("grade-form");
  const gradeCourses = byId("grade-courses");
  const template = byId("grade-course-template");
  const graph = byId("trajectory");
  let editingId = "";

  function gradeStatus(message, tone) { status("grade-result", message, tone); }

  function numberCourses() {
    Array.from(gradeCourses.children).forEach((course, i) => {
      const title = "Course " + (i + 1);
      course.querySelector("legend").textContent = title;
      const remove = course.querySelector("button");
      remove.disabled = gradeCourses.children.length === 1;
      remove.setAttribute("aria-label", "Remove " + title.toLowerCase());
    });
    byId("add-grade-course").disabled = gradeCourses.children.length >= 60;
  }

  function addCourse(data, focus = false) {
    const course = template.content.firstElementChild.cloneNode(true);
    if (data) {
      course.querySelector(".course-code").value = data.code;
      course.querySelector(".course-subject").value = data.subject;
      course.querySelector(".course-units").value = data.units;
      course.querySelector(".course-grade").value = data.grade;
    }
    course.querySelector("button").addEventListener("click", () => {
      const adjacent = course.nextElementSibling || course.previousElementSibling;
      course.remove();
      numberCourses();
      gradeStatus("");
      adjacent?.querySelector(".course-units").focus();
    });
    gradeCourses.append(course);
    numberCourses();
    if (focus) course.querySelector(".course-units").focus();
  }

  function resetForm() {
    editingId = "";
    gradeForm.reset();
    gradeCourses.replaceChildren();
    addCourse();
    addCourse();
    byId("save-term").textContent = "Save Semester";
    byId("cancel-edit").hidden = true;
    gradeStatus("");
  }

  byId("add-grade-course").addEventListener("click", () => { addCourse(null, true); gradeStatus(""); });
  byId("cancel-edit").addEventListener("click", resetForm);
  gradeForm.addEventListener("input", () => gradeStatus(""));
  function loadSample() {
    if ((value("term-name") || gradeCourses.querySelector(".course-units:valid"))
      && !window.confirm("Replace the current unsaved form with an example?")) return false;
    resetForm();
    byId("term-name").value = "Example semester";
    gradeCourses.replaceChildren();
    addCourse({ code: "CSC101", subject: "Programming", units: 3, grade: "A" });
    addCourse({ code: "CSC102", subject: "Programming", units: 2, grade: "B" });
    addCourse({ code: "MAT101", subject: "Maths", units: 1, grade: "C" });
    gradeStatus("Example loaded. Click Calculate GPA to test it.");
    return true;
  }

  byId("sample-grades").addEventListener("click", loadSample);
  byId("home-sample").addEventListener("click", event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.addEventListener("hashchange", () => {
      if (loadSample()) window.dispatchEvent(new CustomEvent("gradepath-edit-results", { detail: "grade-form" }));
    }, { once: true });
    GP.go("grades");
  });

  gradeForm.addEventListener("submit", event => {
    event.preventDefault();
    const courses = Array.from(gradeCourses.children, course => C.courseRecord({
      code: course.querySelector(".course-code").value,
      subject: course.querySelector(".course-subject").value,
      units: course.querySelector(".course-units").valueAsNumber,
      grade: course.querySelector(".course-grade").value
    }));
    if (courses.some(course => !course)) {
      gradeStatus("Use whole numbers from 1 to 60 for course units.", "error");
      return;
    }
    const term = C.summarize(courses, state.points);
    const message = "Semester GPA " + term.gpa.toFixed(2) + " / " + state.scale.toFixed(2) + " · " + term.units + " units";
    if (event.submitter?.value === "preview") {
      const draft = { courses };
      const terms = editingId ? state.semesters.map(item => item.id === editingId ? draft : item)
        : [...state.semesters, draft];
      const projection = C.summarize(C.eligibleCourses(terms, state.replace), state.points);
      gradeStatus(message + " · Projected CGPA " + projection.gpa.toFixed(2) + " / " + state.scale.toFixed(2) + " (preview only)");
      return;
    }
    if (event.submitter?.value !== "save") {
      gradeStatus(message, "success");
      return;
    }
    const name = C.clean(value("term-name"), 60);
    const codes = courses.map(course => course.code).filter(Boolean);
    if (!name) {
      gradeStatus("Enter a semester name before saving.", "error");
      byId("term-name").focus();
      return;
    }
    if (new Set(codes).size !== codes.length) {
      gradeStatus("Use each course code only once per semester.", "error");
      return;
    }
    if (state.semesters.some(item => item.id !== editingId && item.name.toLowerCase() === name.toLowerCase())) {
      gradeStatus("That semester name is already in use.", "error");
      return;
    }
    if (!editingId && state.semesters.length >= 100) {
      gradeStatus("The workspace can hold up to 100 semesters.", "error");
      return;
    }
    if (editingId) {
      const index = state.semesters.findIndex(item => item.id === editingId);
      if (index >= 0) state.semesters[index] = { id: editingId, name, courses };
    } else {
      state.semesters.push({ id: C.id(), name, courses });
    }
    const stored = commit();
    resetForm();
    gradeStatus(message + (stored ? " · Saved" : " · In this session only"), stored ? "success" : "");
    byId("term-name").focus();
  });

  function editTerm(term) {
    editingId = term.id;
    byId("term-name").value = term.name;
    gradeCourses.replaceChildren();
    term.courses.forEach(course => addCourse(course));
    byId("save-term").textContent = "Update Semester";
    byId("cancel-edit").hidden = false;
    gradeStatus("Editing " + term.name);
    window.dispatchEvent(new CustomEvent("gradepath-edit-results", { detail: "grade-form" }));
    byId("term-name").focus();
  }

  function removeTerm(term) {
    if (!window.confirm("Delete " + term.name + "?")) return;
    state.semesters = state.semesters.filter(item => item.id !== term.id);
    if (editingId === term.id) resetForm();
    commit();
  }

  function settingsInputs(scale, points) {
    byId("grade-points").replaceChildren(...C.letters.map(grade => {
      const label = el("label", grade + " points", "field");
      const input = el("input");
      input.id = "points-" + grade;
      input.type = "number";
      input.min = "0";
      input.max = scale;
      input.step = ".01";
      input.required = true;
      input.value = points[grade];
      label.append(input);
      return label;
    }));
  }

  function fillSettings() {
    byId("grade-scale").value = state.scale;
    byId("retake").checked = state.replace;
    settingsInputs(state.scale, state.points);
  }

  byId("grade-scale").addEventListener("change", () => {
    const scale = Number(value("grade-scale"));
    settingsInputs(scale, scale === state.scale ? state.points : C.gradeDefaults[scale]);
  });
  byId("grading-settings").addEventListener("submit", event => {
    event.preventDefault();
    if (!state.semesters.length) state.scale = Number(value("grade-scale"));
    state.points = Object.fromEntries(C.letters.map(grade => [grade, number("points-" + grade)]));
    state.replace = byId("retake").checked;
    status("settings-status", commit() ? "Grading settings saved." : "Settings updated for this session.");
    gradeStatus("");
  });

  function drawGraph(data) {
    if (graph.hidden || !graph.clientWidth) return;
    const width = graph.clientWidth;
    const height = 170;
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    graph.width = width * pixelRatio;
    graph.height = height * pixelRatio;
    const ctx = graph.getContext("2d");
    if (!ctx) return;
    ctx.scale(pixelRatio, pixelRatio);
    const inset = { x: 28, y: 12 };
    const bottom = height - 25;
    const span = bottom - inset.y;
    const x = i => data.length === 1 ? (width + inset.x) / 2 : inset.x + i * (width - inset.x - 13) / (data.length - 1);
    const y = grade => bottom - grade / state.scale * span;
    const colors = getComputedStyle(document.documentElement);
    ctx.font = "12px system-ui";
    ctx.fillStyle = colors.getPropertyValue("--muted").trim();
    ctx.strokeStyle = colors.getPropertyValue("--line").trim();
    for (const tick of [0, state.scale / 2, state.scale]) {
      const at = y(tick);
      ctx.fillText(String(tick), 0, at + 4);
      ctx.beginPath();
      ctx.moveTo(inset.x, at);
      ctx.lineTo(width - 9, at);
      ctx.stroke();
    }
    ctx.strokeStyle = colors.getPropertyValue("--blue-dark").trim();
    ctx.fillStyle = colors.getPropertyValue("--blue-dark").trim();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    data.forEach((term, i) => {
      if (i === 0) ctx.moveTo(x(i), y(term.cumulative.gpa));
      else ctx.lineTo(x(i), y(term.cumulative.gpa));
    });
    ctx.stroke();
    data.forEach((term, i) => {
      ctx.beginPath();
      ctx.arc(x(i), y(term.cumulative.gpa), 3.6, 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.fillStyle = colors.getPropertyValue("--muted").trim();
    ctx.fillText(data.length === 1 ? "1 semester" : "First semester", inset.x, height - 5);
    if (data.length > 1 && width > 230) {
      const label = "Latest semester";
      ctx.fillText(label, width - ctx.measureText(label).width - 9, height - 5);
    }
  }

  function renderGrades() {
    const data = C.timeline(state);
    const last = data.at(-1);
    byId("current-scale").textContent = state.scale.toFixed(1) + " scale";
    byId("grade-history-value").textContent = last ? last.cumulative.gpa.toFixed(2) + " / " + state.scale.toFixed(2) : "No semesters yet";
    graph.hidden = !last;
    byId("share-panel").hidden = !last;
    if (last && Number(value("grade-scale")) !== state.scale) fillSettings();
    byId("grade-scale").disabled = Boolean(last);
    byId("scale-hint").textContent = last
      ? "Grade-point and retake changes recalculate saved results. The scale is fixed while semesters are saved."
      : "Set grade points to match your school.";
    byId("target-cgpa").max = state.scale;
    byId("future-gpa").max = state.scale;
    status("target-result", "");
    renderList("semester-history", data.map((term, i) => row(term.name,
      term.semester.units + " units · GPA " + term.semester.gpa.toFixed(2) + " · CGPA " + term.cumulative.gpa.toFixed(2),
      clickButton("Edit", () => editTerm(state.semesters[i]), "quiet"),
      clickButton("Delete", () => removeTerm(state.semesters[i]), "quiet")
    )), "Save your first semester to see your CGPA.");
    drawGraph(data);
  }

  function showProjection(event) {
    const slider = byId("future-slider");
    const future = byId("future-gpa");
    const current = C.overall(state);
    slider.max = Math.max(...Object.values(state.points));
    slider.min = Math.min(...Object.values(state.points));
    if (event?.target === slider) future.value = slider.value;
    else if (future.value !== "") slider.value = future.value;
    const units = byId("target-units").valueAsNumber;
    const output = byId("future-live");
    if (!current.units || !Number.isInteger(units) || units < 1 || units > 400) {
      output.textContent = current.units ? "Enter remaining units to see your projected CGPA." : "Save a semester to start a projection.";
      return;
    }
    const predicted = (current.gpa * current.units + Number(slider.value) * units) / (current.units + units);
    const bands = state.scale === 5 ? [[4.5, "First Class"], [3.5, "Second Class Upper"], [2.4, "Second Class Lower"], [1.5, "Third Class"], [1, "Pass"]] : [];
    const band = bands.find(([cutoff]) => predicted + 1e-9 >= cutoff);
    const classification = state.scale !== 5 ? "" : band ? " · " + band[1] : " · Below Pass";
    output.textContent = "Future GPA " + Number(slider.value).toFixed(2) + " · Projected CGPA " + predicted.toFixed(2) +
      (classification ? classification + " (example 5-point bands. Check your school’s rules.)" : "");
  }
  byId("target-form").addEventListener("input", event => {
    status("target-result", "");
    showProjection(event);
  });
  onChange(showProjection);
  byId("target-form").addEventListener("submit", event => {
    event.preventDefault();
    const current = C.overall(state);
    const future = number("future-gpa");
    const maximum = Math.max(...Object.values(state.points));
    const minimum = Math.min(...Object.values(state.points));
    if (future < minimum || future > maximum) {
      status("target-result", "Enter an expected GPA from " + minimum + " to " + maximum + " under your grading settings.", "error");
      return;
    }
    const plan = C.forecast(current, number("target-units"), number("target-cgpa"), future, maximum, minimum);
    if (!plan) {
      status("target-result", "Save a semester first.", "error");
      return;
    }
    const projected = "Projected finish " + plan.projected.toFixed(2) + ". ";
    const requirement = Math.ceil((plan.required - 1e-9) * 100) / 100;
    if (plan.required > maximum + 1e-9) {
      status("target-result", projected + "That target is out of reach. Highest possible finish " + plan.highest.toFixed(2) + ".");
    } else if (plan.required <= minimum) {
      status("target-result", projected + "The target is already covered even at the lowest average.");
    } else {
      status("target-result", projected + "Aim for at least " + requirement.toFixed(2) + " GPA across your remaining units.");
    }
  });

  function renderAssessment() {
    if (!state.assessment) {
      status("assessment-result", "");
      return;
    }
    const { coursework, weight, target } = state.assessment;
    byId("ca-score").value = coursework;
    byId("ca-weight").value = weight;
    byId("exam-target").value = target;
    const needed = C.assessmentScore(coursework, weight, target);
    const minimum = Math.max(0, Math.ceil((needed - 1e-9) * 100) / 100);
    status("assessment-result", needed > 100 + 1e-9
      ? "That target is out of reach with this CA score. Even 100% on the exam gives " + (coursework * weight / 100 + 100 - weight).toFixed(2) + "% overall."
      : "You need at least " + minimum.toFixed(2) + "% on the exam.");
  }
  byId("assessment-form").addEventListener("input", () => status("assessment-result", ""));
  byId("assessment-form").addEventListener("submit", event => {
    event.preventDefault();
    state.assessment = { coursework: number("ca-score"), weight: number("ca-weight"), target: number("exam-target") };
    commit(false);
    renderAssessment();
  });

  byId("share-form").addEventListener("submit", event => {
    event.preventDefault();
    const data = C.timeline(state);
    if (!data.length) return;
    const canvas = el("canvas");
    canvas.width = 1100;
    canvas.height = 590;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#111d34";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#d4e2ff";
    ctx.font = "700 38px system-ui";
    ctx.fillText("GradePath", 70, 98);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 72px system-ui";
    ctx.fillText("My CGPA progress", 70, 226, 960);
    ctx.font = "700 108px system-ui";
    const first = data[0].cumulative.gpa.toFixed(2);
    const last = data.at(-1).cumulative.gpa.toFixed(2);
    ctx.fillText(data.length === 1 ? last : first + " → " + last, 70, 365, 960);
    ctx.fillStyle = "#d4e2ff";
    ctx.font = "36px system-ui";
    ctx.fillText(state.scale.toFixed(1) + " scale · " + data.length + (data.length === 1 ? " semester" : " semesters"), 70, 443, 960);
    const name = C.clean(value("share-name"), 45);
    if (name) ctx.fillText(name, 70, 520, 960);
    canvas.toBlob(blob => { if (blob) download("gradepath-progress.png", blob); });
  });

  resetForm();
  fillSettings();
  renderAssessment();
  onChange(renderGrades);
  onPage(current => { if (current === "grades") drawGraph(C.timeline(state)); });
  if (window.ResizeObserver) new ResizeObserver(() => drawGraph(C.timeline(state))).observe(graph);
  window.addEventListener("gradepath-theme", () => drawGraph(C.timeline(state)));
  window.addEventListener("gradepath-import", () => { resetForm(); fillSettings(); renderAssessment(); });
})();
