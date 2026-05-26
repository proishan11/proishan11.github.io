(function () {
  var STORAGE_KEY = "theme-preference";

  function getPreference() {
    return localStorage.getItem(STORAGE_KEY) || "auto";
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === "auto") {
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }

  function updateButtons(theme) {
    var buttons = document.querySelectorAll(".site-nav button");
    buttons.forEach(function (btn) {
      btn.classList.remove("active");
    });
    var active = document.getElementById("theme-" + theme);
    if (active) active.classList.add("active");
  }

  function setTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    updateButtons(theme);
  }

  // Apply immediately to prevent flash
  var pref = getPreference();
  applyTheme(pref);

  // Expose globally
  window.setTheme = setTheme;

  document.addEventListener("DOMContentLoaded", function () {
    updateButtons(pref);
  });

  // React to system theme changes when in auto mode
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", function () {
      if (getPreference() === "auto") {
        applyTheme("auto");
      }
    });
})();
