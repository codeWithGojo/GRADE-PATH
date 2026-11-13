/* Apply the saved appearance before the first paint. */
(function () {
  try {
    const saved = localStorage.getItem("gradepath-theme");
    document.documentElement.dataset.theme = saved === "dark" ? "dark" : "light";
    const state = JSON.parse(localStorage.getItem("gradepath-v2") || "{}");
    document.documentElement.dataset.mode = state.mode === "secondary" ? "secondary" : "university";
  } catch { document.documentElement.dataset.theme = "light"; }
})();
