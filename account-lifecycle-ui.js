/* GradePath account lifecycle UI.
   Loaded before app.js to preserve one-time verification and reset URL fragments.
   Complements server/account.mjs when hosted services are available. */
(function () {
  "use strict";

  const match = /^#(verify|reset)=([A-Za-z0-9_-]{43})$/.exec(location.hash);
  let intent = match ? { purpose: match[1], token: match[2] } : null;
  if (intent) {
    // Never let the general hash router erase an account token before processing it.
    history.replaceState(null, "", location.pathname + location.search + "#account");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const account = document.querySelector("#account .stack");
    if (!account) return;

    const card = document.createElement("section");
    card.className = "card";
    card.id = "account-security";
    card.setAttribute("aria-labelledby", "account-security-heading");
    card.hidden = true;
    card.innerHTML = [
      '<div class="section-head"><h2 id="account-security-heading">Account security</h2></div>',
      '<p class="help">Manage email verification, password recovery and your account data. Your study data saved in this browser is separate from your account backup.</p>',
      '<form id="gp-forgot" hidden>',
      '<label class="field">Account email <input name="email" type="email" autocomplete="email" maxlength="120" required></label>',
      '<div class="actions"><button type="submit">Send password-reset link</button></div>',
      '</form>',
      '<div id="gp-verify" hidden>',
      '<p class="help">Confirm your email to secure your account.</p>',
      '<div class="actions"><button id="gp-resend" type="button">Resend verification email</button></div>',
      '</div>',
      '<form id="gp-reset" hidden>',
      '<p class="help">Enter a new password for your GradePath account.</p>',
      '<label class="field">New password <input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label>',
      '<label class="field">Confirm password <input name="confirmation" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label>',
      '<div class="actions"><button class="primary" type="submit">Change password</button></div>',
      '</form>',
      '<div id="gp-account-data" hidden>',
      '<div class="actions"><button id="gp-export" type="button">Download account data</button></div>',
      '<details><summary>Delete my GradePath account</summary>',
      '<p class="help">This permanently deletes your GradePath account and cloud backup. Study data saved locally in this browser is not automatically erased. Cancel an active subscription before deleting your account.</p>',
      '<form id="gp-delete">',
      '<label class="field">Confirm password <input name="password" type="password" autocomplete="current-password" required></label>',
      '<label class="check"><input name="confirmation" type="checkbox" required> I understand this account deletion cannot be undone.</label>',
      '<div class="actions"><button type="submit">Permanently delete account</button></div>',
      '</form></details></div>',
      '<p id="gp-security-status" class="status" role="status" aria-live="polite"></p>'
    ].join("");
    account.append(card);

    const byId = id => document.getElementById(id);
    const forgot = byId("gp-forgot");
    const verify = byId("gp-verify");
    const reset = byId("gp-reset");
    const data = byId("gp-account-data");
    const message = byId("gp-security-status");
    let online = false;

    function tell(value, error = false) {
      message.textContent = value;
      message.dataset.tone = error ? "error" : value ? "success" : "";
    }

    async function api(path, method = "GET", payload) {
      const response = await fetch("/api" + path, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
        signal: AbortSignal.timeout(45000)
      });
      if (!response.ok) {
        let result = {};
        try { result = await response.json(); } catch {}
        throw new Error(result.error || "Could not complete your request.");
      }
      return response;
    }

    async function refresh() {
      try {
        const response = await api("/status");
        const session = await response.json();
        online = Boolean(session.online);
        const signedIn = Boolean(session.account);
        const mail = Boolean(session.mailConfigured);
        card.hidden = !online && !intent;
        forgot.hidden = !online || !mail || signedIn || Boolean(intent);
        verify.hidden = !online || !mail || !signedIn || Boolean(session.account?.emailVerified) || Boolean(intent);
        reset.hidden = intent?.purpose !== "reset";
        data.hidden = !online || !signedIn;
        if (intent?.purpose === "verify" && !online) {
          tell("Email verification is unavailable until GradePath accounts are connected.", true);
        }
      } catch {
        online = false;
        card.hidden = !intent;
        forgot.hidden = true;
        verify.hidden = true;
        data.hidden = true;
        reset.hidden = intent?.purpose !== "reset";
        if (intent) tell("The account service is unavailable. Try the link again when it is connected.", true);
      }
    }

    async function perform(button, action) {
      button.disabled = true;
      tell("");
      try { await action(); }
      catch (error) { tell(error.message || "Please try again.", true); }
      finally { button.disabled = false; }
    }

    forgot.addEventListener("submit", event => {
      event.preventDefault();
      const button = forgot.querySelector("button");
      perform(button, async () => {
        await api("/password/forgot", "POST", { email: new FormData(forgot).get("email") });
        tell("If an account exists for that email, a reset link will be sent.");
        forgot.reset();
      });
    });

    byId("gp-resend").addEventListener("click", event => {
      perform(event.currentTarget, async () => {
        await api("/account/verify/request", "POST", {});
        tell("If your email still needs verification, a new link has been requested.");
      });
    });

    reset.addEventListener("submit", event => {
      event.preventDefault();
      const password = new FormData(reset).get("password");
      const confirmation = new FormData(reset).get("confirmation");
      if (password !== confirmation) return tell("Both passwords must match.", true);
      const button = reset.querySelector("button");
      perform(button, async () => {
        await api("/password/reset", "POST", { token: intent.token, password });
        reset.reset();
        intent = null;
        reset.hidden = true;
        tell("Password changed. Sign in using your new password.");
        await refresh();
      });
    });

    byId("gp-export").addEventListener("click", event => {
      perform(event.currentTarget, async () => {
        const response = await api("/account/export");
        const file = new Blob([await response.text()], { type: "application/json" });
        const address = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = address;
        link.download = "gradepath-account.json";
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(address), 1000);
        tell("Your account export was downloaded. Keep it private.");
      });
    });

    byId("gp-delete").addEventListener("submit", event => {
      event.preventDefault();
      if (!window.confirm("Permanently delete your GradePath account and cloud backup?")) return;
      const form = byId("gp-delete");
      const button = form.querySelector("button");
      perform(button, async () => {
        const password = new FormData(form).get("password");
        await api("/account", "DELETE", { password, confirm: true });
        form.reset();
        tell("Account deleted. Locally saved study data remains in this browser.");
        await refresh();
        const description = byId("account-description");
        if (description) description.textContent = "Account deleted. Reload to create a new account or sign in.";
      });
    });

    async function handleVerification() {
      if (intent?.purpose !== "verify") return;
      try {
        await api("/account/verify", "POST", { token: intent.token });
        tell("Email verified. You can now sign in.");
      } catch (error) {
        tell(error.message || "That verification link is invalid or expired.", true);
      }
      intent = null;
      await refresh();
    }

    // The existing account UI updates after login/logout. React only to its state changes.
    const description = byId("account-description");
    if (description) new MutationObserver(() => { refresh(); }).observe(description, { childList: true, characterData: true, subtree: true });
    refresh().then(handleVerification);
  });
})();
