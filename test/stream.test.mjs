import test from "node:test";
import assert from "node:assert/strict";
import { readTutorStream } from "../server/stream.mjs";

test("tutor stream decodes fragmented UTF-8 and requires provider completion", async () => {
  const lines = ["event: response.output_text.delta", 'data: {"type":"response.output_text.delta","delta":"₦5"}', "",
    'data: {"type":"response.completed","response":{"usage":{"output_tokens":2}}}', "", ""].join("\r\n");
  const bytes = new TextEncoder().encode(lines);
  const stream = new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i+7));
    controller.close();
  } });
  const deltas = [];
  const final = await readTutorStream(new Response(stream), delta => deltas.push(delta));
  assert.deepEqual(deltas, ["₦5"]);
  assert.equal(final.usage.output_tokens, 2);
  await assert.rejects(readTutorStream(new Response("data: [DONE]\n\n"), () => {}), /Missing completion/);
});
