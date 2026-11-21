// Minimal transactional email via Resend's HTTP API. Disabled unless configured.
export function createMailer(config, fetcher) {
  const enabled = Boolean(config.key && config.from);
  async function send({ to, subject, text }) {
    if (!enabled) return false;
    try {
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST", signal: AbortSignal.timeout(10_000),
        headers: { Authorization: "Bearer " + config.key, "Content-Type": "application/json" },
        body: JSON.stringify({ from: config.from, to: [to], subject, text })
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  return { enabled, send };
}
