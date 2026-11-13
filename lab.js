/* Coding lessons. User JavaScript runs only in the isolated checker frame. */
(function () {
  "use strict";
  const { C, catalog, byId, el, value, status, state, commit, row, replaceOptions } = GP;
  const editor = byId("code-editor");
  const select = byId("lesson-select");
  const frame = byId("code-runner");
  const preview = byId("html-preview");
  const runButton = byId("run-code");
  let hintIndex = 0;
  let running = null;
  let draftTimer;
  const currentLesson = () => catalog.lessons.find(lesson => lesson.id === select.value);

  function draft() {
    const lesson = currentLesson();
    if (lesson) state.labDrafts[lesson.id] = editor.value;
  }

  function flushDraft() {
    window.clearTimeout(draftTimer);
    commit(false);
  }

  function renderLesson() {
    const lesson = currentLesson();
    editor.value = state.labDrafts[lesson.id] ?? lesson.starter;
    byId("lesson-skill").textContent = lesson.skill;
    byId("lesson-title").textContent = lesson.title;
    byId("lesson-objective").textContent = lesson.objective;
    byId("lesson-explanation").textContent = lesson.lesson;
    byId("lab-solution").textContent = lesson.solution;
    byId("lab-hints").replaceChildren();
    byId("lab-results").replaceChildren();
    byId("next-hint").disabled = false;
    preview.hidden = true;
    preview.srcdoc = "";
    hintIndex = 0;
    status("lab-status", state.labPassed.includes(lesson.id) ? "Lesson completed." : "");
  }

  editor.addEventListener("input", () => {
    draft();
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(flushDraft, 350);
  });
  editor.addEventListener("change", flushDraft);
  window.addEventListener("pagehide", () => { if (draftTimer) flushDraft(); });
  select.addEventListener("change", renderLesson);

  byId("next-hint").addEventListener("click", () => {
    const lesson = currentLesson();
    byId("lab-hints").append(el("li", lesson.hints[hintIndex]));
    hintIndex += 1;
    byId("next-hint").disabled = hintIndex >= lesson.hints.length;
  });

  byId("reset-code").addEventListener("click", () => {
    if (editor.value !== currentLesson().starter && !window.confirm("Replace this draft with the starter code?")) return;
    editor.value = currentLesson().starter;
    draft();
    flushDraft();
    editor.focus();
  });

  byId("load-solution").addEventListener("click", () => {
    if (editor.value !== currentLesson().starter && !window.confirm("Replace this draft with the worked solution?")) return;
    editor.value = currentLesson().solution;
    draft();
    flushDraft();
    editor.focus();
  });

  byId("send-code").addEventListener("click", () => {
    GP.askAboutCode(currentLesson().title, editor.value);
  });

  // Keep the HTML preview inert and strip links, scripts, styles, and external loads.
  function htmlPreview(code) {
    const source = document.createElement("template");
    source.innerHTML = code;
    const result = document.createElement("template");
    const allowed = new Set(["H1", "H2", "H3", "P", "FORM", "FIELDSET", "LEGEND", "LABEL", "INPUT", "BUTTON",
      "SELECT", "OPTION", "OUTPUT", "DIV", "SPAN", "STRONG", "EM", "UL", "OL", "LI", "BR"]);
    const attributes = ["id", "for", "name", "type", "value", "required", "min", "max", "step", "placeholder"];

    function copy(node) {
      if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
      if (!allowed.has(node.nodeName)) return null;
      const element = document.createElement(node.nodeName);
      for (const attribute of attributes) {
        if (node.hasAttribute(attribute)) element.setAttribute(attribute, node.getAttribute(attribute));
      }
      for (const child of node.childNodes) {
        const safe = copy(child);
        if (safe) element.append(safe);
      }
      return element;
    }

    for (const child of source.content.childNodes) {
      const safe = copy(child);
      if (safe) result.content.append(safe);
    }

    preview.srcdoc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>HTML lesson preview</title>'
      + '<meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; form-action &apos;none&apos;"></head><body>'
      + result.innerHTML + "</body></html>";
    preview.hidden = false;

    const form = result.content.querySelector("form");
    const input = form?.querySelector("input[type=number]");
    const label = input && [...form.querySelectorAll("label")].find(element =>
      element.textContent.trim() && (element.contains(input) || (input.id && element.htmlFor === input.id)));
    const submit = form?.querySelector("button[type=submit]");
    return [
      { name: "Number input inside the form", passed: Boolean(input), detail: "Add an input with type=\"number\"." },
      { name: "Visible label linked to the input", passed: Boolean(label), detail: "Match the label’s for to the input’s id, or wrap the input with its label." },
      { name: "Submit button inside the form", passed: Boolean(submit), detail: "Add a button with type=\"submit\"." }
    ];
  }

  function report(results, lesson) {
    const valid = Array.isArray(results) && results.length === 3 && results.every(item =>
      typeof item?.name === "string" && typeof item.detail === "string" && typeof item.passed === "boolean");
    if (!valid) {
      status("lab-status", "The checker returned an unexpected result. Try running your code again.", "error");
      return;
    }
    const passed = results.filter(item => item.passed).length;
    byId("lab-results").replaceChildren(...results.map(item => {
      const result = row((item.passed ? "Passed · " : "Try again · ") + C.clean(item.name, 100),
        item.passed && lesson.kind === "html" ? "" : C.clean(item.detail, 200));
      result.dataset.tone = item.passed ? "success" : "error";
      return result;
    }));
    if (passed === results.length && !state.labPassed.includes(lesson.id)) {
      state.labPassed.push(lesson.id);
      commit();
    }
    status("lab-status", passed + " of " + results.length + " checks passed.", passed === results.length ? "success" : "");
  }

  function restoreControls() {
    if (running) window.clearTimeout(running.timeout);
    running = null;
    select.disabled = false;
    runButton.disabled = false;
  }

  runButton.addEventListener("click", () => {
    const lesson = currentLesson();
    draft();
    flushDraft();
    byId("lab-results").replaceChildren();
    if (lesson.kind === "html") {
      report(htmlPreview(editor.value), lesson);
      return;
    }
    const requestId = C.id();
    select.disabled = true;
    runButton.disabled = true;
    status("lab-status", "Running your checks…");
    const timeout = window.setTimeout(() => {
      restoreControls();
      status("lab-status", "The checker did not respond. Open the project using START-WINDOWS.cmd and retry.", "error");
    }, 4500);
    running = { requestId, timeout, lesson };
    frame.contentWindow.postMessage({ type: "gradepath-run", requestId, code: editor.value,
      functionName: lesson.functionName, cases: lesson.cases }, "*");
  });

  window.addEventListener("message", event => {
    if (event.source !== frame.contentWindow || event.origin !== "null" || !running || event.data?.type !== "gradepath-result"
      || event.data.requestId !== running.requestId) return;
    const { lesson } = running;
    restoreControls();
    if (typeof event.data.error === "string") {
      status("lab-status", C.clean(event.data.error, 350), "error");
    } else report(event.data.results, lesson);
  });

  replaceOptions(select, catalog.lessons.map(lesson => [lesson.id, lesson.title]));
  renderLesson();
  window.addEventListener("gradepath-import", renderLesson);
})();
