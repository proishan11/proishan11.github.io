(function () {
  var STORAGE_KEY = "theme-preference";
  var MODES = ["light", "dark"];

  function getPreference() {
    return localStorage.getItem(STORAGE_KEY) || "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  function updateToggle(theme) {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.className = "theme-toggle mode-" + theme;
    btn.setAttribute("aria-label", "Theme: " + theme);
  }

  function setTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    updateToggle(theme);
  }

  function cycleTheme() {
    var current = getPreference();
    var next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
    setTheme(next);
  }

  // Apply immediately to prevent flash
  var pref = getPreference();
  applyTheme(pref);

  // Expose globally
  window.setTheme = setTheme;
  window.cycleTheme = cycleTheme;

  // Update toggle immediately (script is at bottom of body, DOM is ready)
  updateToggle(pref);

  function initExtras() {
    // Reading progress bar
    var progress = document.querySelector(".reading-progress");
    if (progress) {
      window.addEventListener("scroll", function () {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = h > 0 ? (window.scrollY / h) * 100 + "%" : "0%";
      });
    }

    // Back to top
    var btt = document.querySelector(".back-to-top");
    if (btt) {
      window.addEventListener("scroll", function () {
        btt.classList.toggle("visible", window.scrollY > 400);
      });
      btt.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExtras);
  } else {
    initExtras();
  }

  // React to system theme changes when in auto mode
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", function () {
      if (getPreference() === "auto") {
        applyTheme("auto");
      }
    });
})();
