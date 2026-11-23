import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import C from "../core.js";

test("JAMB mock totals require a distinct four-subject combination including English", () => {
  const score = names => C.examInsights({ subjects: names.map(name => ({ name, score: 75 })) }, "JAMB");
  assert.equal(score(["English","Physics","Mathematics","Biology"]).total, 300);
  assert.equal(score(["English","Physics","Mathematics","Biology"]).fullMock, true);
  assert.equal(score(["English","Use of English","Mathematics","Biology"]).fullMock, false);
  assert.equal(score(["Chemistry","Physics","Mathematics","Biology"]).fullMock, false);
});

test("new lesson drafts, earned progress, weekly goals and JAMB mocks survive backup import", () => {
  const state = C.blankState();
  state.weeklyGoal = 240;
  state.labDrafts["responsive-grid"] = ".study-grid { display: grid; }";
  state.labPassed.push("responsive-grid");
  state.attempts.push({ exam:"JAMB", correct:9, total:12, mock:300 });
  const restored = C.normalizeState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.weeklyGoal, 240);
  assert.deepEqual(restored.labDrafts, state.labDrafts);
  assert.deepEqual(restored.labPassed, state.labPassed);
  assert.equal(restored.attempts[0].mock, 300);
});

test("practice question identifiers remain unique across general and exam banks", async () => {
  const context = { window:{} };
  runInNewContext(await readFile(new URL("../catalog.js", import.meta.url), "utf8"), context);
  const { questions, examQuestions } = context.window.GradePathCatalog;
  const ids = [...questions, ...examQuestions].map(q => q.id);
  assert.equal(new Set(ids).size, ids.length);
});
