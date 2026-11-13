import test from "node:test";
import assert from "node:assert/strict";
import C from "../core.js";

test("legacy grades migrate and CGPA weights units and repeated attempts", () => {
  const state = C.normalizeState({
    scale: 5, semesters: [
      { name: "First", courses: [{ code: "CSC 304", units: 3, grade: "A" }, { units: 2, grade: "B" }, { units: 1, grade: "C" }] },
      { name: "Second", courses: [{ code: "csc304", units: 3, grade: "B" }, { units: 2, grade: "A" }] }
    ]
  });
  assert.equal(state.semesters[0].courses[0].code, "CSC304");
  assert.equal(C.timeline(state)[0].semester.gpa.toFixed(2), "4.33");
  assert.equal(C.overall(state).gpa.toFixed(2), "4.36");
  state.replace = true;
  const current = C.overall(state);
  assert.equal(current.units, 8);
  assert.equal(current.gpa.toFixed(2), "4.13");
  assert.equal(C.forecast(current, 12, 4.5, 4.75, 5).required, 4.75);
  assert.equal(C.assessmentScore(70, 30, 70), 70);
});

test("subject insights and exam mock totals include zero results", () => {
  const state = C.blankState();
  state.semesters.push({ id: "1", name: "First", courses: [
    { code: "CSC100", units: 3, grade: "A", subject: "Programming" },
    { code: "CSC101", units: 2, grade: "F", subject: "programming" }
  ] });
  assert.equal(C.subjectInsights(state)[0].gpa, 3);
  const plan = C.normalizeExam("JAMB", { target: 280, subjects: [
    { name: "Use of English", score: 80 }, { name: "Mathematics", score: 70 },
    { name: "Physics", score: 0 }, { name: "Chemistry", score: 65 }
  ] });
  assert.equal(C.examInsights(plan, "JAMB").total, 215);
  assert.equal(C.examInsights(plan, "JAMB").fullMock, true);
  assert.equal(C.examInsights(plan, "JAMB").order[0].name, "Physics");
  assert.equal(C.normalizeState({ ...state, exams: { JAMB: plan } }).exams.JAMB.subjects[2].score, 0);
});

test("mistake review schedules the next practice and removes mastered items", () => {
  const state = C.blankState();
  C.recordReview(state, "one", false, "2026-11-12");
  assert.equal(state.mistakes[0].due, "2026-11-14");
  C.recordReview(state, "one", true, "2026-11-14");
  assert.equal(state.mistakes[0].due, "2026-11-18");
  C.recordReview(state, "one", true, "2026-11-18");
  C.recordReview(state, "one", true, "2026-11-26");
  assert.equal(state.mistakes.length, 0);
});
