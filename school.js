/* Secondary-school results are independent of university semesters. */
(function () {
  "use strict";
  const { C, byId, el, state, commit, onChange, clickButton, row, renderList, status } = GP;
  const subjects = byId("school-subjects");
  let editing = null;
  function addSubject(subject = {}, focus = false) {
    const item = el("div", undefined, "school-subject-row");
    const nameLabel = el("label", "Subject", "field");
    const name = el("input"); name.required = true; name.maxLength = 55; name.value = subject.name || ""; name.placeholder = "e.g. Mathematics"; name.className = "school-name";
    const scoreLabel = el("label", "Mark /100", "field");
    const score = el("input"); score.type = "number"; score.min = "0"; score.max = "100"; score.step = "0.1"; score.required = true; score.value = subject.score ?? ""; score.className = "school-score";
    nameLabel.append(name); scoreLabel.append(score);
    const remove = clickButton("Remove", () => {
      if (subjects.children.length === 1) { status("school-status", "Keep at least one subject.", "error"); return; }
      const next = item.nextElementSibling || item.previousElementSibling;
      item.remove(); next?.querySelector("input").focus(); updateButtons();
    }, "quiet");
    item.append(nameLabel, scoreLabel, remove); subjects.append(item); updateButtons();
    if (focus) name.focus();
  }
  function updateButtons() {
    byId("add-school-subject").disabled = subjects.children.length >= 20;
    [...subjects.children].forEach((item, index) => {
      const button = item.querySelector("button"); button.disabled = subjects.children.length === 1;
      button.setAttribute("aria-label", "Remove subject " + (index + 1));
    });
  }
  function reset() {
    editing = null; byId("school-term").value = "";
    byId("school-class").value = state.schoolClass; byId("school-target").value = state.schoolTarget;
    byId("save-school-term").textContent = "Save term"; byId("cancel-school-edit").hidden = true;
    subjects.replaceChildren(); addSubject({ name: "English Language" }); addSubject({ name: "Mathematics" });
  }
  function edit(term) {
    editing = term.id; byId("school-term").value = term.name;
    subjects.replaceChildren(); term.subjects.forEach(subject => addSubject(subject));
    byId("save-school-term").textContent = "Update term"; byId("cancel-school-edit").hidden = false;
    byId("school-term").focus(); status("school-status", "Editing " + term.name + ".");
  }
  byId("add-school-subject").addEventListener("click", () => addSubject({}, true));
  byId("cancel-school-edit").addEventListener("click", () => { reset(); status("school-status", "Edit cancelled."); });
  byId("school-form").addEventListener("submit", event => {
    event.preventDefault();
    const entries = [...subjects.children].map(item => ({name: item.querySelector(".school-name").value, score: item.querySelector(".school-score").valueAsNumber}));
    const cleaned = C.schoolSubjects(entries);
    const name = byId("school-term").value.trim();
    if (!name || !cleaned.length || cleaned.length !== entries.length) { status("school-status", "Use a different name for each subject and marks between 0 and 100.", "error"); return; }
    if (!editing && state.schoolTerms.length >= 30) { status("school-status", "You can keep up to 30 terms. Export a backup before removing an old term.", "error"); return; }
    const term = { id: editing || C.id(), name, subjects: cleaned };
    if (editing) state.schoolTerms = state.schoolTerms.map(item => item.id === editing ? term : item);
    else state.schoolTerms.push(term);
    state.schoolClass = byId("school-class").value; state.schoolTarget = byId("school-target").valueAsNumber;
    const saved = commit(); reset(); status("school-status", saved ? "Term saved. Your dashboard is up to date." : "Term kept for this session. Export a backup before leaving.", saved ? "success" : "error");
  });
  function render() {
    const summary = C.schoolSummary(state.schoolTerms);
    byId("school-average").textContent = summary.average === null ? "—" : summary.average.toFixed(1) + "%";
    byId("school-change").textContent = summary.average === null ? "Save your first term to get started." :
      state.schoolTerms.at(-1).name + (summary.change === null ? " · Latest term average" : " · " + (summary.change > 0 ? "+" : "") + summary.change.toFixed(1) + " percentage points from the previous term");
    renderList("school-history", state.schoolTerms.map((term, index) => {
      const item = row(term.name + " · " + summary.history[index].average.toFixed(1) + "%", term.subjects.length + " subjects",
        clickButton("Edit", () => edit(term), "quiet"), clickButton("Delete", () => {
          if (!confirm("Delete " + term.name + "? This removes its subject results from this device.")) return;
          state.schoolTerms = state.schoolTerms.filter(item => item.id !== term.id); if (editing === term.id) reset(); commit();
        }, "quiet"));
      const meter = el("meter"); meter.max = 100; meter.value = summary.history[index].average; meter.setAttribute("aria-label", term.name + " average"); meter.className = "term-meter"; item.firstElementChild.append(meter); return item;
    }), "Your saved terms will appear here, in the order you add them.");
  }
  window.addEventListener("gradepath-import", reset);
  reset(); onChange(render);
})();
