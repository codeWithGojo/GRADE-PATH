import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const script = readFileSync(new URL("../account-lifecycle-ui.js", import.meta.url), "utf8");
const token = "A".repeat(43);

function load(hash) {
  const changes = [];
  const listeners = [];
  const context = {
    location: { hash, pathname: "/", search: "" },
    history: { replaceState(...args) { changes.push(args.at(-1)); } },
    document: { addEventListener(name, callback) { listeners.push({ name, callback }); } },
  };
  runInNewContext(script, context);
  return { changes, listeners };
}

test("verification token is preserved before the hash router initializes", () => {
  const result = load("#verify=" + token);
  assert.deepEqual(result.changes, ["/#account"]);
  assert.equal(result.listeners[0].name, "DOMContentLoaded");
});

test("password reset token is preserved before the hash router initializes", () => {
  assert.deepEqual(load("#reset=" + token).changes, ["/#account"]);
});

test("unrecognized or malformed fragments are not rewritten", () => {
  assert.deepEqual(load("#grades").changes, []);
  assert.deepEqual(load("#reset=not-a-valid-token").changes, []);
  assert.deepEqual(load("#verify=" + token + "bad").changes, []);
});

test("account lifecycle frontend parses under Node", () => {
  assert.ok(script.includes("password/forgot"));
  assert.ok(script.includes("password/reset"));
  assert.ok(script.includes("account/verify"));
  assert.ok(script.includes("account/export"));
});
