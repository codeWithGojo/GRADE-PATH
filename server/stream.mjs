// Responses API sends one JSON data record per SSE event.
export async function readTutorStream(response, onText) {
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "", completed = null;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += value || "";
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        const event = JSON.parse(payload);
        if (event.type === "response.output_text.delta") onText(event.delta);
        if (event.type === "response.completed") completed = event.response;
        if (["response.failed", "response.incomplete", "error"].includes(event.type)) throw new Error("Incomplete provider stream");
      }
      if (done) break;
    }
    if (!completed) throw new Error("Missing completion event");
    return completed;
  } finally { reader.releaseLock(); }
}
