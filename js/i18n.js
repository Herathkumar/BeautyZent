(function () {
  const STORAGE_KEY = "zentralab-lang";
  const DEFAULT_LANG = "en";

  function getLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && translations[saved] ? saved : DEFAULT_LANG;
  }

  function t(key, lang) {
    const parts = key.split(".");
    let value = translations[lang];
    for (const part of parts) {
      if (value && Object.prototype.hasOwnProperty.call(value, part)) {
        value = value[part];
      } else {
        return null;
      }
    }
    return typeof value === "string" ? value : null;
  }

  function applyLanguage(lang) {
    if (!translations[lang]) lang = DEFAULT_LANG;

    document.documentElement.lang = lang === "ta" ? "ta" : "en";
    document.body.classList.toggle("lang-ta", lang === "ta");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const text = t(el.dataset.i18n, lang);
      if (text !== null) el.textContent = text;
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const text = t(el.dataset.i18nPlaceholder, lang);
      if (text !== null) el.placeholder = text;
    });

    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const text = t(el.dataset.i18nTitle, lang);
      if (text !== null) document.title = text;
    });

    document.querySelectorAll("[data-i18n-meta]").forEach((el) => {
      const text = t(el.dataset.i18nMeta, lang);
      if (text !== null) el.setAttribute("content", text);
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const text = t(el.dataset.i18nAria, lang);
      if (text !== null) el.setAttribute("aria-label", text);
    });

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      const isActive = btn.dataset.lang === lang;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive);
    });

    localStorage.setItem(STORAGE_KEY, lang);
    window.currentLang = lang;
  }

  function initLanguageSwitcher() {
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyLanguage(btn.dataset.lang);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyLanguage(getLang());
    initLanguageSwitcher();
  });

  window.applyLanguage = applyLanguage;
  window.getLang = getLang;
})();
