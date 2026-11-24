import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const context = { globalThis: {} };
context.globalThis = context;
for (const file of ["learn-core.js", "learn-content.js"]) {
  runInNewContext(await readFile(new URL("../" + file, import.meta.url), "utf8"), context);
}
const { solve, inputsFor, solvers, format } = context.GradePathLearnCore;
const { history, languages, engineering } = context.GradePathLearn;
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} ≉ ${expected}`);

test("secondary formula solvers rearrange correctly for every symbol", () => {
  close(solve("ohms-law", "V", { I: 2, R: 6 }).value, 12);
  close(solve("ohms-law", "I", { V: 3, R: 15 }).value, 0.2);
  close(solve("ohms-law", "R", { V: 12, I: 2 }).value, 6);
  close(solve("newton-second", "F", { m: 1200, a: 2.5 }).value, 3000);
  close(solve("newton-second", "a", { F: 50, m: 10 }).value, 5);
  close(solve("pressure", "p", { F: 600, A: 0.03 }).value, 20000);
  close(solve("pressure", "F", { p: 400, A: 0.5 }).value, 200);
  close(solve("pressure", "A", { p: 400, F: 200 }).value, 0.5);
  close(solve("density", "ρ", { m: 0.54, V: 0.0002 }).value, 2700);
  close(solve("density", "m", { "ρ": 1000, V: 0.002 }).value, 2);
  close(solve("motion-first", "v", { u: 5, a: 2, t: 4 }).value, 13);
  close(solve("motion-first", "a", { v: 0, u: 20, t: 5 }).value, -4);
  close(solve("motion-first", "u", { v: 13, a: 2, t: 4 }).value, 5);
  close(solve("motion-first", "t", { v: 13, u: 5, a: 2 }).value, 4);
});

test("university solvers match worked examples and keep units", () => {
  const axial = solve("axial-stress", "E", { F: 50000, A: 0.00031416, "ΔL": 0.0015, "L₀": 2 });
  close(axial.value, 50000 / 0.00031416 / 0.00075);
  assert.equal(axial.unit, "Pa");
  assert.equal(axial.steps.length, 3);
  close(solve("axial-stress", "ε", { F: 1, A: 1, "ΔL": 0.0015, "L₀": 2 }).value, 0.00075);
  close(solve("flexure", "σ", { M: 20000, y: 0.1, I: 0.00006667 }).value, 20000 * 0.1 / 0.00006667);
  close(solve("flexure", "M", { "σ": 15e6, y: 0.1, I: 0.00006667 }).value, 15e6 * 0.00006667 / 0.1);
  close(solve("continuity", "v₂", { "A₁": 0.01, "v₁": 2, "A₂": 0.004 }).value, 5);
  close(solve("continuity", "A₁", { "v₁": 2, "A₂": 0.004, "v₂": 5 }).value, 0.01);
  close(solve("continuity", "v₂", { "A₁": 3e-4, "v₁": 1.5, "A₂": 5e-5 }).value, 9);
});

test("solvers reject missing values, zero divisors and impossible time", () => {
  assert.match(solve("ohms-law", "V", { I: 2 }).error, /Enter R/);
  assert.match(solve("ohms-law", "I", { V: 3, R: 0 }).error, /cannot be zero/);
  assert.match(solve("pressure", "p", { F: 10, A: 0 }).error, /cannot be zero/);
  assert.match(solve("motion-first", "t", { v: 0, u: 10, a: 2 }).error, /negative time/);
  assert.match(solve("axial-stress", "σ", { F: 1, A: -1, "ΔL": 1, "L₀": 1 }).error, /greater than zero/);
  assert.match(solve("ohms-law", "V", { I: Number.NaN, R: 2 }).error, /Enter I/);
  assert.match(solve("unknown", "x", {}).error, /No calculator/);
  assert.match(format(0.000012345), /^1\.23\d × 10\^-5$/);
  assert.equal(format(12), "12");
});

test("every formula topic is complete, calculable and consistent with its worked example", () => {
  assert.ok(engineering.topics.some(topic => topic.level === "secondary"));
  assert.ok(engineering.topics.some(topic => topic.level === "university"));
  for (const topic of engineering.topics) {
    assert.ok(solvers.includes(topic.id), topic.id + " has a solver");
    for (const key of ["title", "display", "principle", "discipline", "explanation"]) assert.ok(topic[key], topic.id + " has " + key);
    assert.ok(topic.symbols.length >= 3 && topic.symbols.every(symbol => symbol.symbol && symbol.name && symbol.unit && symbol.unitName));
    assert.ok(topic.assumptions.length > 0 && topic.sources.length > 0 && topic.practice.answer && topic.practice.explanation);
    assert.ok(["draft", "reviewed"].includes(topic.review.status));
    if (topic.level === "university") assert.ok(topic.derivation?.length >= 3, topic.id + " has a derivation");
    for (const target of topic.solveFor) for (const symbol of inputsFor(topic.id, target, topic.solveFor)) {
      assert.ok(topic.symbols.some(item => item.symbol === symbol), `${topic.id}: input ${symbol} is defined`);
    }
    const worked = solve(topic.id, topic.example.target, topic.example.given);
    assert.equal(worked.error, undefined, topic.id + " worked example solves");
    assert.ok(Number.isFinite(worked.value));
  }
});

test("history stories cite sources, label evidence and stay honest about review", () => {
  const eras = new Set(history.eras.map(era => era.id));
  const regions = new Set(history.regions.map(region => region.id));
  const ids = new Set();
  for (const story of history.stories) {
    assert.ok(!ids.has(story.id), "unique id " + story.id); ids.add(story.id);
    assert.ok(eras.has(story.era) && regions.has(story.region), story.id + " era/region");
    assert.ok(story.title && story.summary && story.period && story.activity && story.rights);
    assert.ok(story.sources.length > 0 && story.sources.every(source => source.title && source.author && source.year));
    assert.ok(story.evidence.length > 0 && story.evidence.every(item => history.evidenceTypes[item.type]));
    assert.ok(Array.isArray(story.viewpoints));
    assert.equal(story.review.status, "draft", "no story claims review until a historian signs it off");
  }
  for (const era of eras) assert.ok(history.stories.some(story => story.era === era), "era " + era + " has a story");
});

test("no Nigerian-language course is presented as open before it is reviewed", () => {
  assert.ok(languages.requirements.length >= 4);
  for (const language of languages.registry) {
    assert.ok(["open", "in-preparation", "planned"].includes(language.status));
    assert.notEqual(language.status, "open", language.name + " has no reviewed lessons yet");
    assert.ok(language.code && language.script);
  }
});
