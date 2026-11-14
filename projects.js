(function () {
  "use strict";
  const { C, byId, el, state, commit, status } = GP;
  const ideas = [
    ["Campus equipment booking", "Web", "Beginner", "Low", "3–5 weeks", "Build a booking calendar, availability checks and an approval queue. Use HTML, JavaScript and SQLite. Test conflicting bookings."],
    ["Campus complaints and repairs tracker", "Web", "Intermediate", "Low", "4–7 weeks", "Track reports and repairs across departments. Build student and staff roles and test who can see each report."],
    ["Lecture attendance dashboard", "Data", "Beginner", "Low", "3–5 weeks", "Use synthetic attendance CSVs to chart patterns and flag missing records. Build with Python or JavaScript."],
    ["Campus shuttle demand analysis", "Data", "Intermediate", "Low", "4–7 weeks", "Compare simple demand forecasts with a baseline using anonymous counts by stop and hour. Document error on held-out weeks."],
    ["Classroom comfort monitor", "IoT", "Intermediate", "Hardware required", "4–7 weeks", "Use an ESP32 and a temperature and humidity sensor to log readings. Test sensor accuracy and what happens when Wi-Fi drops."],
    ["Water tank level dashboard", "IoT", "Intermediate", "Hardware required", "4–7 weeks", "Measure water levels on a small test rig with an ESP32 and a distance sensor. Compare readings with manual measurements."]
  ];
  const field = id => byId(id).value.trim();
  const button = (label, fn) => GP.clickButton(label, fn, "quiet");

  function showIdeas() {
    const list = byId("project-ideas");
    const area = field("project-area");
    const level = field("project-level");
    const matches = ideas.filter(idea => (!area || idea[1] === area) && (!level || idea[2] === level));
    list.replaceChildren();
    if (!matches.length) list.append(el("p", "No ideas match these filters.", "empty"));
    for (const [title, category, difficulty, budget, time, description] of matches) {
      const item = el("article", undefined, "project-idea");
      const actions = el("div", undefined, "actions");
      actions.append(button("Use this idea", () => {
        byId("project-title").value = title;
        byId("project-title").focus();
      }));
      item.append(el("h3", title), el("p", [category, difficulty, budget, time].join(" · "), "project-meta"), el("p", description), actions);
      list.append(item);
    }
  }

  function showMilestones() {
    const list = byId("project-milestones");
    list.replaceChildren();
    if (!state.project.milestones.length) list.append(el("p", "Add a milestone to start tracking your work.", "empty"));
    for (const milestone of state.project.milestones) {
      const row = el("div", undefined, "project-milestone");
      const label = el("label", undefined, "check");
      const checkbox = el("input");
      checkbox.type = "checkbox";
      checkbox.checked = milestone.done;
      checkbox.addEventListener("change", () => {
        milestone.done = checkbox.checked;
        commit();
      });
      label.append(checkbox, document.createTextNode(milestone.title + (milestone.date ? " · " + C.dateText(milestone.date) : "")));
      const remove = button("Remove", () => {
        state.project.milestones = state.project.milestones.filter(item => item !== milestone);
        commit();
        showMilestones();
        byId("project-milestone").focus();
      });
      remove.setAttribute("aria-label", "Remove milestone " + milestone.title);
      row.append(label, remove);
      list.append(row);
    }
  }

  byId("project-plan").addEventListener("submit", event => {
    event.preventDefault();
    const title = field("project-title");
    const milestone = field("project-milestone");
    if (!title) return status("project-status", "Enter a project title.", "error");
    if (milestone && state.project.milestones.length >= 30) return status("project-status", "Remove a milestone before adding another.", "error");
    const date = field("project-date");
    if (date && !milestone) return status("project-status", "Enter a milestone for the due date.", "error");
    state.project.title = title;
    if (milestone) state.project.milestones.push({ id: C.id(), title: milestone, date, done: false });
    const saved = commit();
    byId("project-milestone").value = "";
    byId("project-date").value = "";
    showMilestones();
    status("project-status", saved ? "Project plan saved on this device." : "Export a backup to keep this change.", saved ? "success" : "error");
  });


  function loadPlan() {
    byId("project-title").value = state.project.title;
    byId("project-milestone").value = "";
    byId("project-date").value = "";
    status("project-status", "");
    showMilestones();
  }

  for (const id of ["project-area", "project-level"]) byId(id).addEventListener("change", showIdeas);
  window.addEventListener("gradepath-import", loadPlan);
  showIdeas();
  loadPlan();
})();
