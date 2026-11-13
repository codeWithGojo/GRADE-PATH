/* Optional accounts, AI tutoring, peer benchmarks, and Paystack. */
(function () {
  "use strict";
  const { C, byId, value, el, status, state, commit, onChange, replaceOptions, go } = GP;
  let session = { online: false, aiConfigured: false, billingMode: "", account: null };
  let benchmark = null;
  let quizDraft = null;
  let examContext = null;
  let tutorMemory = null;
  let verifying = false;

  const tutorMode = byId("tutor-mode");
  const signIn = byId("auth-form");
  const checkPayment = el("button", "Check payment status");
  checkPayment.type = "button";
  checkPayment.hidden = true;
  byId("manage-sub").after(checkPayment);

  const params = new URLSearchParams(location.search);
  let callbackReference = params.get("reference") || params.get("trxref") || "";
  if (!/^[A-Za-z0-9.-]{4,120}$/.test(callbackReference)) callbackReference = "";

  async function api(path, method = "GET", data) {
    if (location.protocol === "file:") throw new Error("Online services are unavailable in this workspace.");
    const response = await fetch("/api" + path, {
      method, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(45_000),
      headers: data ? { "Content-Type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined
    });
    let result;
    try { result = await response.json(); } catch { throw new Error("The GradePath server could not be reached."); }
    if (!response.ok) throw new Error(result.error || "The request could not be completed.");
    return result;
  }

  function renderBenchmark() {
    const output = byId("cohort-result");
    output.replaceChildren();
    byId("cohort-leave").hidden = !benchmark;
    if (!benchmark) return;
    const caption = benchmark.school + " · " + benchmark.programme + " · Level " + benchmark.level;
    output.append(el("p", caption, "secondary"));
    const text = benchmark.rank === null
      ? benchmark.count + " participant(s). A rank appears when " + benchmark.minimum + " students share comparable results."
      : "Rank " + benchmark.rank + " of " + benchmark.count + " participants · Top " + benchmark.top + "% including ties.";
    output.append(el("p", text), el("p", "Shared CGPA " + benchmark.cgpa.toFixed(2) + " / " + benchmark.scale.toFixed(1), "secondary"));
  }

  function renderSession() {
    const { account } = session;
    const bill = account?.billing;
    byId("sidebar-mode").textContent = session.online ? "Grades saved on this device" : "On this device";
    byId("top-account").textContent = bill?.active ? "GradePath Plus" : account ? "Free account" : "Free workspace";
    byId("account-mode").textContent = session.online ? "Connected" : "Browser workspace";
    byId("account-description").textContent = account
      ? "Signed in as " + account.email + ". Your study data stays in this browser."
      : session.online ? "Create a free account or sign in to use the tutor and benchmarks."
        : "Accounts are coming soon on this site. All core study tools work without signing in; your work is saved in this browser.";
    signIn.hidden = !session.online || Boolean(account);
    byId("sign-out").hidden = !account;
    byId("cloud-backup").hidden = !account || !session.workspaceBackup;
    byId("invite-label").hidden = !session.inviteRequired;
    byId("cohort-join").disabled = !account;
    if (!account) {
      status("cohort-status", session.online ? "Sign in to share a benchmark." : "Peer comparisons will be available when accounts are connected.");
      benchmark = null;
    }
    renderBenchmark();

    byId("ai-mode-status").textContent = !session.online ? "Coming soon" : !session.aiConfigured
      ? "Coming soon" : !account ? "Sign in to continue" : bill?.active ? "Plus" : "Free";
    byId("tutor-access").textContent = !session.online ? "The AI tutor is coming soon. In the meantime, use the practice questions, study resources and Coding Lab hints."
      : !session.aiConfigured ? "The AI tutor is not connected yet. You can keep using the study tools."
        : !account ? "Sign in for three free AI questions each day."
          : account.tutorRemaining ? account.tutorRemaining + " of " + account.tutorLimit + " requests left "
            + (bill?.active ? "this paid period." : "today.")
            : bill?.active ? "You’ve used your allowance for this paid period." : "You’ve used today’s three free questions. Come back tomorrow.";
    byId("ask-ai").disabled = !session.aiConfigured || !account?.tutorRemaining;

    byId("plus-status").textContent = !session.billingMode ? "Plus is planned at ₦1,000 per month. Subscriptions are not open yet; no payment is collected here."
      : (session.billingMode === "test" ? "Paystack test mode. " : "Billed monthly through Paystack. ")
        + (bill?.active ? "Access through " + new Date(bill.paidUntil).toLocaleDateString() + "."
          : bill?.pending ? "You have a payment waiting for confirmation."
            : bill?.hasSubscription ? "Manage your existing subscription to check its renewal."
              : account ? "Your plan renews monthly until cancelled." : "Sign in to subscribe.");
    document.querySelector(".plus-hint").textContent = session.billingMode ? "AI study support" : "AI study support · Coming soon";
    const checkout = byId("checkout");
    checkout.hidden = !session.billingMode;
    checkout.disabled = !session.billingMode || !account || Boolean(bill?.active || bill?.hasSubscription || (bill?.pending && !bill?.canContinue));
    checkout.textContent = !session.billingMode ? "Plus is coming soon" : bill?.canContinue ? "Continue checkout" : session.billingMode === "test" ? "Open test checkout" : "Subscribe with Paystack";
    byId("manage-sub").hidden = !bill?.canManage;
    checkPayment.hidden = !account || !session.billingMode || !(bill?.pending || callbackReference);
  }

  async function loadBenchmark() {
    if (!session.account) return;
    try {
      benchmark = (await api("/benchmark")).result;
      if (benchmark) {
        byId("cohort-school").value = benchmark.school;
        byId("cohort-programme").value = benchmark.programme;
        byId("cohort-level").value = benchmark.level;
        byId("cohort-consent").checked = true;
      }
      renderBenchmark();
    } catch (error) {
      status("cohort-status", error.message, "error");
    }
  }

  async function refresh() {
    if (location.protocol === "file:") { renderSession(); return; }
    try { session = await api("/status"); }
    catch { session = { online: false, aiConfigured: false, billingMode: "", account: null }; }
    renderSession();
  }

  signIn.addEventListener("submit", async event => {
    event.preventDefault();
    const intent = event.submitter?.value === "register" ? "register" : "login";
    const controls = [...signIn.querySelectorAll("button")];
    controls.forEach(button => { button.disabled = true; });
    status("account-status", intent === "register" ? "Creating account…" : "Signing in…");
    try {
      session = await api("/" + intent, "POST", {
        email: value("auth-email"), password: value("auth-password"), invite: value("auth-invite")
      });
      signIn.reset();
      status("account-status", "Signed in.", "success");
      status("cohort-status", "");
      renderSession();
      await loadBenchmark();
      if (callbackReference) await verifyPayment(callbackReference);
    } catch (error) {
      status("account-status", error.message, "error");
    } finally {
      controls.forEach(button => { button.disabled = false; });
    }
  });

  for (const id of ["cloud-save", "cloud-restore"]) {
    byId(id).addEventListener("click", async () => {
      const buttons = ["cloud-save", "cloud-restore", "sign-out"].map(byId);
      buttons.forEach(button => { button.disabled = true; });
      try {
        if (id === "cloud-save") {
          const existing = await api("/workspace");
          if (existing.backup && !window.confirm("Replace the backup saved to your account with this device’s data?")) return;
          await api("/workspace", "PUT", { backup: state });
          status("account-status", "Backup saved to your account.", "success");
        } else {
          const result = await api("/workspace");
          if (!result.backup) {
            status("account-status", "No backup saved to this account yet.");
            return;
          }
          const restored = C.normalizeState(result.backup);
          if (!window.confirm("Replace this device’s study data with your account backup?")) return;
          Object.assign(state, restored);
          window.dispatchEvent(new Event("gradepath-import"));
          commit();
          go("account");
          window.dispatchEvent(new Event("gradepath-mode"));
          status("account-status", "Account backup restored.", "success");
        }
      } catch (error) {
        status("account-status", error.message, "error");
      } finally {
        buttons.forEach(button => { button.disabled = false; });
      }
    });
  }

  byId("sign-out").addEventListener("click", async () => {
    const button = byId("sign-out");
    button.disabled = true;
    try {
      session = await api("/logout", "POST", {});
      quizDraft = null;
      tutorMemory = null;
      byId("tutor-answer").hidden = true;
      byId("cohort-form").reset();
      status("account-status", "Signed out.");
      renderSession();
    } catch (error) {
      status("account-status", error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  byId("cohort-form").addEventListener("submit", async event => {
    event.preventDefault();
    const overall = C.overall(state);
    if (!overall.units) {
      status("cohort-status", "Save a semester before sharing your CGPA.", "error");
      return;
    }
    byId("cohort-join").disabled = true;
    try {
      const result = await api("/benchmark", "PUT", {
        school: value("cohort-school"), programme: value("cohort-programme"), level: value("cohort-level"),
        cgpa: overall.gpa, scale: state.scale, points: C.letters.map(grade => state.points[grade]), replace: state.replace,
        consent: byId("cohort-consent").checked
      });
      benchmark = result.result;
      status("cohort-status", "Your benchmark was updated.", "success");
      renderBenchmark();
    } catch (error) {
      status("cohort-status", error.message, "error");
    } finally {
      byId("cohort-join").disabled = !session.account;
    }
  });

  byId("cohort-leave").addEventListener("click", async () => {
    try {
      await api("/benchmark", "DELETE");
      benchmark = null;
      byId("cohort-consent").checked = false;
      status("cohort-status", "Your entry was removed from the benchmark.");
      renderBenchmark();
    } catch (error) {
      status("cohort-status", error.message, "error");
    }
  });

  function syncTutorFields() {
    byId("tutor-code-label").hidden = tutorMode.value !== "code";
    byId("tutor-note-label").hidden = !["notes", "quiz"].includes(tutorMode.value);
    byId("tutor-note").required = tutorMode.value === "notes";
    const line = "Sending shares your question and any selected notes or code with the AI provider.";
    byId("tutor-context").textContent = examContext ? "Focus: " + examContext.exam + " · " + examContext.subject + ". " + line : line;
  }

  function openTutor(mode) {
    tutorMode.value = mode;
    syncTutorFields();
    go("tutor");
  }

  GP.askAboutNote = note => {
    examContext = null;
    byId("tutor-course").value = note.course;
    byId("tutor-note").value = note.id;
    byId("tutor-question").value = "";
    openTutor("notes");
  };
  GP.askAboutCode = (lesson, code) => {
    examContext = null;
    byId("tutor-course").value = "";
    byId("tutor-code").value = code.slice(0, 10_000);
    byId("tutor-question").value = "Help me with this lesson: " + lesson + ". Give me a hint and a small test to try.";
    openTutor("code");
  };
  GP.askAboutExam = (exam, subject, topic) => {
    examContext = { exam, subject };
    byId("tutor-course").value = "";
    byId("tutor-question").value = "Help me revise " + (topic || subject) + " for " + exam + " " + subject + ".";
    openTutor("explain");
  };
  tutorMode.addEventListener("change", syncTutorFields);

  function noteExtracts(note, question) {
    if (!note) return [];
    const terms = new Set((question.toLowerCase().match(/[a-z0-9]{4,}/g) || [])
      .filter(word => !["about", "explain", "please", "what", "from", "these", "notes", "which", "using"].includes(word)));
    const chunks = note.pages.flatMap(page => {
      const sections = [];
      for (let start = 0; start < page.text.length; start += 1500) {
        const text = page.text.slice(start, start + 1700);
        const lower = text.toLowerCase();
        const score = [...terms].filter(word => lower.includes(word)).length;
        sections.push({ title: note.title, kind: note.kind, number: page.number, text, score });
      }
      return sections;
    });
    return chunks.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  byId("tutor-form").addEventListener("submit", async event => {
    event.preventDefault();
    const mode = tutorMode.value;
    const question = C.clean(value("tutor-question"), 1500);
    if (!question) return;
    const course = C.courseCode(value("tutor-course"));
    const note = state.notes.find(item => item.id === value("tutor-note"));
    const code = mode === "code" ? value("tutor-code") : "";
    const contextKey = JSON.stringify([mode, course, note?.id, examContext, code]);
    const previous = tutorMemory?.key === contextKey ? tutorMemory.previous : [];
    const askButton = byId("ask-ai");
    askButton.disabled = true;
    byId("tutor-answer").hidden = true;
    quizDraft = null;
    status("tutor-status", "Preparing your response…");
    try {
      const result = await api("/tutor", "POST", {
        mode, question, course, code, previous,
        exam: examContext?.exam || "", subject: examContext?.subject || "",
        extracts: ["notes", "quiz"].includes(mode) ? noteExtracts(note, question) : []
      });
      session.account.tutorRemaining = result.remaining;
      tutorMemory = { key: contextKey, previous: [...previous, { question, answer: result.answer.slice(0, 1800) }].slice(-2) };
      byId("tutor-text").textContent = result.answer || "Your practice quiz is ready.";
      const sourceList = byId("tutor-sources");
      sourceList.replaceChildren();
      for (const source of result.sources) {
        const item = el("div", undefined, "row");
        item.append(el("strong", source.title + " · " + source.location), el("p", source.excerpt, "secondary"));
        sourceList.append(item);
      }
      if (sourceList.children.length) sourceList.prepend(el("h3", "Referenced notes"));
      const quizTopic = examContext ? examContext.exam + " · " + examContext.subject : (course || C.clean(question, 40)) + " · AI practice";
      quizDraft = result.questions.map(question => C.questionRecord({
        ...question, course, topic: quizTopic, subject: examContext?.subject || "",
        exams: examContext ? [examContext.exam] : []
      })).filter(Boolean);
      byId("save-ai-quiz").hidden = !quizDraft.length;
      byId("tutor-answer").hidden = false;
      status("tutor-status", quizDraft.length ? quizDraft.length + " practice questions ready." : "Response ready.", "success");
    } catch (error) {
      status("tutor-status", error.message, "error");
    } finally {
      renderSession();
    }
  });

  byId("save-ai-quiz").addEventListener("click", () => {
    if (!quizDraft?.length) return;
    const room = Math.max(0, 180 - state.questions.length);
    if (room < quizDraft.length) {
      status("tutor-status", "Your question bank is full. Export your data and remove older questions to make room.", "error");
      return;
    }
    state.questions.unshift(...quizDraft);
    quizDraft = null;
    const stored = commit();
    byId("save-ai-quiz").hidden = true;
    status("tutor-status", stored ? "Quiz saved. Open Practice and choose its topic." : "Quiz added for this session.", "success");
  });

  function cleanPaymentUrl() {
    if (!callbackReference) return;
    const url = new URL(location.href);
    url.searchParams.delete("reference");
    url.searchParams.delete("trxref");
    url.hash = "account";
    history.replaceState(null, "", url);
    callbackReference = "";
  }

  async function verifyPayment(reference) {
    if (!reference || verifying) return;
    verifying = true;
    checkPayment.disabled = true;
    status("billing-status", "Checking payment with Paystack…");
    try {
      const result = await api("/billing/verify", "POST", { reference });
      if (result.status === "paid") {
        cleanPaymentUrl();
        status("billing-status", "Payment verified. Your subscription details are below.", "success");
      } else if (result.status === "failed") {
        cleanPaymentUrl();
        status("billing-status", "Paystack marked this checkout as unsuccessful. You can start a new checkout.", "error");
      } else status("billing-status", "Payment is still pending. Check again after completing checkout.");
      await refresh();
    } catch (error) {
      status("billing-status", error.message, "error");
    } finally {
      verifying = false;
      checkPayment.disabled = false;
    }
  }

  checkPayment.addEventListener("click", () => verifyPayment(callbackReference || session.account?.billing.pending));
  byId("checkout").addEventListener("click", async () => {
    const button = byId("checkout");
    button.disabled = true;
    status("billing-status", "Opening Paystack checkout…");
    try {
      const result = await api("/billing/start", "POST", {});
      location.assign(result.url);
    } catch (error) {
      status("billing-status", error.message, "error");
      await refresh();
    }
  });
  byId("manage-sub").addEventListener("click", async () => {
    const button = byId("manage-sub");
    button.disabled = true;
    status("billing-status", "Opening your Paystack subscription…");
    try {
      const result = await api("/billing/manage", "POST", {});
      location.assign(result.url);
    } catch (error) {
      status("billing-status", error.message, "error");
      button.disabled = false;
    }
  });

  onChange(() => {
    replaceOptions(byId("tutor-note"), state.notes.map(note => [note.id, note.title + (note.course ? " · " + note.course : "")]), "Choose your notes");
  });
  syncTutorFields();
  refresh().then(async () => {
    if (callbackReference) {
      go("account");
      if (session.account) await verifyPayment(callbackReference);
      else status("billing-status", "Sign in to the account that opened this checkout to confirm the payment.");
    }
    await loadBenchmark();
  });
})();
