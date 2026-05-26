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
    // Reading progress bar + accent on scroll
    var progress = document.querySelector(".reading-progress");
    var divider = document.querySelector(".header-divider");
    var sidebar = document.querySelector(".sidebar");
    var btt = document.querySelector(".back-to-top");

    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      var h = document.documentElement.scrollHeight - window.innerHeight;

      if (progress) {
        progress.style.width = h > 0 ? (y / h) * 100 + "%" : "0%";
      }

      // Accent on scroll
      var scrolled = y > 60;
      if (divider) divider.classList.toggle("scrolled", scrolled);
      if (sidebar) sidebar.classList.toggle("scrolled", scrolled);

      // Back to top
      if (btt) btt.classList.toggle("visible", y > 400);
    });

    if (btt) {
      btt.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Scroll reveal
    var reveals = document.querySelectorAll(".post-list-item, .project-card, .book-card, .reading-item");
    reveals.forEach(function (el) { el.classList.add("reveal"); });

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      reveals.forEach(function (el) { observer.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("visible"); });
    }

    // Code blocks: language badge + copy button
    document.querySelectorAll(".highlight").forEach(function (block) {
      var codeEl = block.querySelector("code");
      if (!codeEl) return;

      // Detect language from class (e.g. "language-python")
      var lang = "";
      var classes = codeEl.className.split(/\s+/);
      for (var i = 0; i < classes.length; i++) {
        if (classes[i].indexOf("language-") === 0) {
          lang = classes[i].replace("language-", "");
          break;
        }
      }

      // Try data-lang attribute from Chroma
      if (!lang) {
        var dataLang = block.getAttribute("class") || "";
        var match = dataLang.match(/language-(\w+)/);
        if (match) lang = match[1];
      }

      if (lang) {
        var badge = document.createElement("span");
        badge.className = "code-lang";
        badge.textContent = lang;
        block.appendChild(badge);
      }

      // Copy button
      var btn = document.createElement("button");
      btn.className = "code-copy";
      btn.textContent = "Copy";
      btn.addEventListener("click", function () {
        var text = codeEl.textContent;
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = "Copied!";
          btn.classList.add("copied");
          setTimeout(function () {
            btn.textContent = "Copy";
            btn.classList.remove("copied");
          }, 2000);
        });
      });
      block.appendChild(btn);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExtras);
  } else {
    initExtras();
  }
})();
