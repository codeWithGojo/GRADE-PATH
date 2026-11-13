/* Course priorities, materials, weekly tasks, notes, and practice. */
(function () {
  "use strict";
  const { C, catalog, byId, value, number, el, status, state, commit, onChange, clickButton, row, renderList, link, replaceOptions, weekTasks, go } = GP;
  const selectedWeek = byId("plan-week");
  const resourceSearch = byId("resource-search");
  const profileForm = byId("profile-form");
  const noteForm = byId("note-form");
  const questionMap = () => new Map([...catalog.questions, ...catalog.examQuestions, ...state.questions].map(question => [question.id, question]));
  const questionsFor = exam => [...state.questions, ...catalog.questions, ...catalog.examQuestions].filter(question =>
    exam ? question.exams?.includes(exam) : !question.exams?.length);
  const subjectKey = name => ["english language", "use of english"].includes(name.toLowerCase()) ? "english" : name.toLowerCase();
  const savedMessage = (stored, message) => stored ? message : "Added for this session. Export to keep the change.";
  selectedWeek.value = C.weekStart();
  byId("task-date").value = C.localDay();

  function renderProfiles() {
    renderList("profiles", state.profiles.map(profile => row(
      [profile.code, profile.name].filter(Boolean).join(" · "),
      [profile.topic, profile.date ? C.dateText(profile.date) : "", "Confidence " + profile.confidence + "/5"].filter(Boolean).join(" · "),
      clickButton("Edit", () => {
        byId("profile-code").value = profile.code;
        byId("profile-name").value = profile.name;
        byId("profile-topic").value = profile.topic;
        byId("profile-date").value = profile.date;
        byId("profile-confidence").value = profile.confidence;
        byId("profile-code").focus();
      }, "quiet"),
      clickButton("Remove", () => {
        state.profiles = state.profiles.filter(item => item.code !== profile.code);
        commit();
      }, "quiet")
    )), "Add a course to see it in your study priorities.");
  }

  profileForm.addEventListener("submit", event => {
    event.preventDefault();
    const code = C.courseCode(value("profile-code"));
    if (!code) {
      status("profile-status", "Enter a course code.", "error");
      return;
    }
    const profile = {
      code, name: C.clean(value("profile-name"), 80), topic: C.clean(value("profile-topic"), 60),
      date: value("profile-date"), confidence: Number(value("profile-confidence"))
    };
    const index = state.profiles.findIndex(item => item.code === code);
    if (index >= 0) state.profiles[index] = profile;
    else if (state.profiles.length < 150) state.profiles.push(profile);
    else {
      status("profile-status", "Remove an old course to add another.", "error");
      return;
    }
    status("profile-status", savedMessage(commit(), "Course saved."), "success");
    profileForm.reset();
  });

  function renderTasks() {
    const start = C.weekStart(selectedWeek.value || C.localDay());
    const tasks = weekTasks(start);
    const done = tasks.filter(task => task.completed);
    byId("week-summary").textContent = C.dateText(start) + " to " + C.dateText(C.shiftDay(6, start))
      + " · " + done.length + " of " + tasks.length + " done · " + done.reduce((sum, task) => sum + task.minutes, 0) + " min completed";
    renderList("tasks", tasks.map(task => {
      const item = row(task.title, [task.course, C.dateText(task.date), task.minutes + " min"].filter(Boolean).join(" · "),
        clickButton("Remove", () => { state.tasks = state.tasks.filter(old => old.id !== task.id); commit(); }, "quiet"));
      const label = el("label", undefined, "check");
      const check = el("input");
      check.type = "checkbox";
      check.checked = Boolean(task.completed);
      check.dataset.taskId = task.id;
      check.addEventListener("change", () => {
        task.completed = check.checked ? C.localDay() : "";
        commit();
        document.querySelectorAll("#tasks input").forEach(box => { if (box.dataset.taskId === task.id) box.focus(); });
      });
      label.append(check, el("span", task.completed ? "Completed" : "Mark complete"));
      check.setAttribute("aria-label", "Mark " + task.title + " complete");
      item.firstElementChild.append(label);
      return item;
    }), "No study tasks scheduled for this week.");
  }

  selectedWeek.addEventListener("change", renderTasks);
  byId("task-form").addEventListener("submit", event => {
    event.preventDefault();
    const title = C.clean(value("task-title"), 120);
    const date = value("task-date");
    if (!title || !C.validDate(date) || state.tasks.length >= 400) {
      status("task-status", "Add a task name and date. Remove an old task if your plan is full.", "error");
      return;
    }
    state.tasks.push({ id: C.id(), title, course: C.courseCode(value("task-course")), date, minutes: number("task-minutes"), completed: "" });
    selectedWeek.value = C.weekStart(date);
    status("task-status", savedMessage(commit(), "Added to your study plan."), "success");
    byId("task-title").value = "";
  });

  byId("make-plan").addEventListener("click", () => {
    const today = C.localDay();
    const candidates = C.priorityList(state, today).slice(0, 3);
    if (!candidates.length) {
      status("task-status", "Add an upcoming assessment or a course you’re less confident in first.");
      return;
    }
    const start = C.weekStart(today);
    const tasks = candidates.flatMap((course, index) => {
      const spacedDate = C.shiftDay(index, today);
      const latestDate = course.date && course.date > today ? C.shiftDay(-1, course.date) : spacedDate;
      const date = [spacedDate, latestDate, C.shiftDay(6, start)].sort()[0];
      const title = "Revise " + (course.topic || course.name || course.code);
      const hasTask = state.tasks.some(task => task.title === title && task.course === course.code
        && C.weekStart(task.date) === start);
      return hasTask ? [] : [{ id: C.id(), title, course: course.code, date, minutes: 25, completed: "" }];
    }).slice(0, Math.max(0, 400 - state.tasks.length));
    if (!tasks.length) {
      status("task-status", "This week’s suggestions are already in your plan, or your plan is full.");
      return;
    }
    state.tasks.push(...tasks);
    selectedWeek.value = start;
    status("task-status", savedMessage(commit(), "Added " + tasks.length + " revision session(s) for this week."), "success");
  });

  function saveMaterial(material) {
    if (state.materials.some(item => item.url === material.url && item.course === material.course)) return "That link is already saved for this course.";
    if (state.materials.length >= 200) return "Remove a material before adding another.";
    state.materials.unshift({ id: C.id(), ...material });
    return savedMessage(commit(), "Material saved.");
  }

  function renderResources() {
    const keywords = resourceSearch.value.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const results = catalog.resources.filter(item => keywords.every(keyword => item.slice(0, 4).join(" ").toLocaleLowerCase().includes(keyword)));
    renderList("resources", results.map(([title, subject, topic, detail, url]) =>
      row(title, subject + " · " + topic + " — " + detail, link("Open", url, "button quiet"),
        clickButton("Save", () => {
          status("resource-status", saveMaterial({ title, topic, url, course: C.courseCode(value("resource-course")) }));
        }, "quiet"))
    ), "No resource matches that search. Try another topic or save your own link.");
  }

  resourceSearch.addEventListener("input", renderResources);
  byId("material-form").addEventListener("submit", event => {
    event.preventDefault();
    const url = C.validLink(value("material-link"));
    const title = C.clean(value("material-title"), 100);
    if (!url || !title) {
      status("material-status", "Enter a title and a valid web link.", "error");
      return;
    }
    const priorCount = state.materials.length;
    status("material-status", saveMaterial({
      title, url, course: C.courseCode(value("material-course")), topic: C.clean(value("material-topic"), 60)
    }));
    if (state.materials.length > priorCount) event.currentTarget.reset();
  });

  function renderMaterials() {
    renderList("materials", state.materials.map(item => row(item.title,
      [item.course, item.topic, new URL(item.url).hostname].filter(Boolean).join(" · "),
      link("Open", item.url, "button quiet"),
      clickButton("Remove", () => { state.materials = state.materials.filter(saved => saved.id !== item.id); commit(); }, "quiet")
    )), "Save a resource or add a link to build your library.");
  }

  function splitText(text) {
    const value = text.trim().slice(0, 65_000);
    const chunks = [];
    for (let start = 0; start < value.length; start += 3250) {
      chunks.push({ number: chunks.length + 1, text: value.slice(start, start + 3250) });
    }
    return chunks;
  }

  // PDF.js is bundled with the download. The browser reads the file locally.
  async function pdfPages(file) {
    if (location.protocol === "file:") throw new Error("Open GradePath using START-WINDOWS.cmd to import PDFs, or paste the text here.");
    const pdfjs = await import("./vendor/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf.worker.min.mjs", location.href).href;
    const task = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, enableXfa: false,
      disableFontFace: true, useSystemFonts: true
    });
    try {
      const doc = await task.promise;
      const pages = [];
      for (let number = 1; number <= Math.min(30, doc.numPages); number++) {
        const page = await doc.getPage(number);
        const content = await page.getTextContent();
        const text = content.items.map(item => item.str ? item.str + (item.hasEOL ? "\n" : " ") : "").join("").trim();
        if (text) pages.push({ number, text: text.slice(0, 6500) });
        page.cleanup();
      }
      return { pages, limited: doc.numPages > 30 || pages.some(page => page.text.length >= 6500) };
    } finally {
      await task.destroy();
    }
  }

  noteForm.addEventListener("submit", async event => {
    event.preventDefault();
    const file = byId("note-file").files[0];
    const pasted = value("note-text").trim();
    const button = event.submitter;
    if (state.notes.length >= 15 || (file && file.size > 15_000_000) || (!pasted && !file)) {
      status("note-status", "Add text or a file under 15 MB. This workspace holds up to 15 notes.", "error");
      return;
    }
    if (file && pasted) {
      status("note-status", "Choose a file or paste notes for this entry.", "error");
      return;
    }
    const title = C.clean(value("note-title"), 100) || C.clean(file?.name, 100) || "Pasted notes";
    const course = C.courseCode(value("note-course"));
    if (button) button.disabled = true;
    status("note-status", "Reading notes…");
    try {
      let result;
      if (pasted) result = { pages: splitText(pasted), kind: "text" };
      else if (/\.pdf$/i.test(file.name)) result = { ...await pdfPages(file), kind: "pdf" };
      else if (/\.(txt|md)$/i.test(file.name)) {
        const text = await file.text();
        result = { pages: splitText(text), limited: text.length > 65_000, kind: "text" };
      } else throw new Error("Choose a PDF, TXT, or Markdown file.");
      if (!result.pages.length) throw new Error("No selectable text found. For a scanned PDF, paste the text you want to study.");
      state.notes.unshift({ id: C.id(), title, course, kind: result.kind, pages: result.pages });
      const stored = commit();
      noteForm.reset();
      status("note-status", savedMessage(stored, "Notes saved." + (result.limited ? " Only the first supported pages or characters were kept." : "")), "success");
    } catch (error) {
      status("note-status", error.message || "This file could not be read.", "error");
    } finally {
      if (button) button.disabled = false;
    }
  });

  function renderNotes() {
    renderList("notes", state.notes.map(note => {
      const item = row(note.title,
        [note.course, note.pages.length + (note.kind === "pdf" ? " page(s)" : " section(s)")].filter(Boolean).join(" · "),
        clickButton("Ask tutor", () => GP.askAboutNote(note), "quiet"),
        clickButton("Remove", () => {
          if (!window.confirm("Remove " + note.title + " from your notes?")) return;
          state.notes = state.notes.filter(old => old.id !== note.id);
          commit();
        }, "quiet"));
      const details = el("details", undefined, "note-preview");
      details.append(el("summary", "Read notes"));
      for (const page of note.pages) {
        details.append(el("h3", (note.kind === "pdf" ? "Page " : "Section ") + page.number), el("p", page.text));
      }
      item.firstElementChild.append(details);
      return item;
    }), "Upload or paste notes to keep them here.");
  }

  let activeQuiz = null;
  let quizTimer = null;
  const quizPlayer = byId("quiz-player");
  const quizAnswerForm = byId("quiz-answer-form");
  const quizClock = byId("quiz-clock");

  function renderPractice() {
    const questions = questionsFor(value("quiz-exam"));
    const topics = [...new Set(questions.map(question => question.topic))].sort();
    replaceOptions(byId("quiz-topic"), topics.map(topic => [topic, topic]), "All topics");
    const today = C.localDay();
    const available = questionMap();
    const mistakes = state.mistakes.filter(mistake => available.has(mistake.id)).sort((a, b) => a.due.localeCompare(b.due));
    byId("review-mistakes").disabled = !mistakes.some(mistake => mistake.due <= today);
    renderList("mistakes", mistakes.map(mistake => {
      const question = available.get(mistake.id);
      return row(question.topic, (mistake.due <= today ? "Due now" : "Review " + C.dateText(mistake.due)) + " · " + question.prompt,
        clickButton("Retry", () => beginQuiz([question], 0, "Mistake review", question.exams?.includes(value("quiz-exam")) ? value("quiz-exam") : (question.exams?.[0] || "")), "quiet"));
    }), "Missed questions will appear here with a review date.");
    renderList("custom-questions", state.questions.slice(0, 25).map(question => row(question.prompt, question.topic,
      clickButton("Remove", () => {
        state.questions = state.questions.filter(item => item.id !== question.id);
        state.mistakes = state.mistakes.filter(item => item.id !== question.id);
        commit();
      }, "quiet"))), "Your added questions appear here.");
    renderList("recent-scores", state.attempts.slice(0, 8).map(attempt =>
      row(attempt.topic + " · " + attempt.correct + "/" + attempt.total, C.dateText(attempt.date))
    ), "Finish a practice set to see your scores.");
  }

  function clearQuiz() {
    window.clearInterval(quizTimer);
    quizTimer = null;
    activeQuiz = null;
    quizPlayer.hidden = true;
    byId("quiz-setup").hidden = false;
  }

  function finishQuiz(expired = false) {
    if (!activeQuiz) return;
    const answers = new FormData(quizAnswerForm);
    const { questions, label, exam } = activeQuiz;
    let correct = 0;
    const review = questions.map((question, index) => {
      const answer = answers.get("answer-" + index);
      const pass = answer !== null && Number(answer) === question.answer;
      if (pass) correct += 1;
      C.recordReview(state, question.id, pass);
      const result = row((pass ? "Correct · " : answer === null ? "Unanswered · " : "Missed · ") + question.prompt,
        "Answer: " + question.options[question.answer] + ". " + question.explanation);
      if (!pass) {
        const similar = questionsFor(exam).find(item => item.id !== question.id && item.topic === question.topic);
        if (similar) {
          const button = clickButton("Try a related question", () => beginQuiz([similar], 0, question.topic, exam), "quiet");
          result.append(button);
        }
      }
      return result;
    });
    const course = questions.every(question => question.course === questions[0].course) ? questions[0].course : "";
    const subject = questions.every(question => question.subject === questions[0].subject) ? questions[0].subject || "" : "";
    state.attempts.unshift({ date: C.localDay(), correct, total: questions.length, topic: label, course, exam, subject });
    state.attempts = state.attempts.slice(0, 150);
    state.mistakes = state.mistakes.slice(-220);
    clearQuiz();
    commit();
    status("quiz-status", (expired ? "Time’s up. " : "") + "Score " + correct + " / " + questions.length + ".", "success");
    renderList("quiz-review", review, "");
    byId("quiz-status").tabIndex = -1;
    byId("quiz-status").focus();
  }

  function beginQuiz(questions, seconds, label, exam = "") {
    if (activeQuiz) {
      status("quiz-status", "Finish or end your current practice set before starting another.");
      return;
    }
    if (!questions.length) return;
    activeQuiz = { questions, label, exam };
    byId("quiz-setup").hidden = true;
    quizPlayer.hidden = false;
    byId("quiz-title").textContent = label + " · " + questions.length + " question(s)";
    byId("quiz-review").replaceChildren();
    status("quiz-status", "");
    byId("quiz-questions").replaceChildren(...questions.map((question, index) => {
      const fieldset = el("fieldset", undefined, "question");
      fieldset.append(el("legend", (index + 1) + ". " + question.prompt));
      question.options.forEach((option, i) => {
        const label = el("label", undefined, "check option");
        const input = el("input");
        input.type = "radio";
        input.name = "answer-" + index;
        input.value = i;
        label.append(input, el("span", option));
        fieldset.append(label);
      });
      return fieldset;
    }));
    quizClock.hidden = !seconds;
    if (seconds) {
      const ends = Date.now() + seconds * 1000;
      const tick = () => {
        const left = Math.max(0, Math.ceil((ends - Date.now()) / 1000));
        quizClock.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
        if (!left) finishQuiz(true);
      };
      tick();
      quizTimer = window.setInterval(tick, 400);
    }
    byId("quiz-title").focus();
  }

  byId("quiz-exam").addEventListener("change", renderPractice);

  function pickQuestions(questions, exam, label, length) {
    const turn = state.attempts.filter(attempt => attempt.exam === exam && attempt.topic === label).length;
    const start = questions.length > length ? turn * length % questions.length : 0;
    return [...questions.slice(start), ...questions.slice(0, start)].slice(0, length);
  }

  GP.startExamPractice = (exam, subject, seconds) => {
    if (activeQuiz) { go("practice"); return "Finish or end your current practice set."; }
    const questions = questionsFor(exam).filter(question => !subject || subjectKey(question.subject || question.topic) === subjectKey(subject));
    if (!questions.length) return "No questions for this subject yet. Add your own in Practice or generate a quiz with the tutor.";
    const label = exam + " · " + (subject || "Mixed practice");
    byId("quiz-exam").value = exam;
    renderPractice();
    go("practice");
    beginQuiz(pickQuestions(questions, exam, label, 8), seconds, label, exam);
    window.setTimeout(() => byId("quiz-title").focus(), 50);
    return "";
  };

  byId("quiz-setup").addEventListener("submit", event => {
    event.preventDefault();
    const topic = value("quiz-topic");
    const exam = value("quiz-exam");
    const label = topic || (exam ? exam + " · Mixed practice" : "Mixed practice");
    const questions = questionsFor(exam).filter(question => !topic || question.topic === topic);
    beginQuiz(pickQuestions(questions, exam, label, 5), Number(value("quiz-duration")), label, exam);
  });
  quizAnswerForm.addEventListener("submit", event => { event.preventDefault(); finishQuiz(); });
  byId("cancel-quiz").addEventListener("click", () => { clearQuiz(); status("quiz-status", "Practice ended."); });
  byId("review-mistakes").addEventListener("click", () => {
    const questions = questionMap();
    beginQuiz(state.mistakes.filter(item => item.due <= C.localDay())
      .map(item => questions.get(item.id)).filter(Boolean).slice(0, 5), 0, "Due for review");
  });

  byId("question-form").addEventListener("submit", event => {
    event.preventDefault();
    const question = C.questionRecord({
      course: value("question-course"), topic: value("question-topic"), prompt: value("question-prompt"),
      subject: value("question-subject"), exams: value("question-exam") ? [value("question-exam")] : [],
      options: Array.from(document.querySelectorAll(".question-option"), input => input.value),
      answer: Number(value("question-correct")), explanation: value("question-explanation")
    });
    if (!question || state.questions.length >= 180) {
      status("question-status", "Enter a question and four options. This workspace holds 180 custom questions.", "error");
      return;
    }
    state.questions.unshift(question);
    status("question-status", savedMessage(commit(), "Question saved to " + question.topic + "."), "success");
    event.currentTarget.reset();
  });

  window.addEventListener("gradepath-import", () => {
    clearQuiz();
    byId("quiz-review").replaceChildren();
    status("quiz-status", "");
  });
  renderResources();
  onChange(() => { renderProfiles(); renderTasks(); renderMaterials(); renderNotes(); renderPractice(); });
})();
