import test from "node:test";
import assert from "node:assert/strict";
import { forward } from "../api/gateway.mjs";

test("gateway forwards the real client IP and download header, and allows account routes", async () => {
  let seen;
  const send = async (url, init) => {
    seen = { url: String(url), headers: init.headers };
    return new Response("{}", { headers: { "content-disposition": 'attachment; filename="gradepath-account.json"' } });
  };
  const env = { GRADEPATH_BACKEND_ORIGIN: "https://backend.example.test" };
  const request = new Request("https://gradepath.example.test/api/account/export?service=account/export", {
    headers: { "x-vercel-forwarded-for": "203.0.113.9, 10.0.0.1", "x-gradepath-client-ip": "spoofed" }
  });
  const result = await forward(request, env, send);
  assert.equal(seen.url, "https://backend.example.test/api/account/export");
  assert.equal(seen.headers.get("x-gradepath-client-ip"), "203.0.113.9");
  assert.match(result.headers.get("content-disposition"), /attachment/);
  assert.equal((await forward(new Request("https://gradepath.example.test/?service=nope"), env, send)).status, 404);
});
