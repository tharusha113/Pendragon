/**
 * Pendragon Furniture - Theme Controller
 * Handles Light and Dark mode with LocalStorage persistence,
 * OS color scheme detection, and cross-tab synchronization.
 */
(function () {
  'use strict';

  var THEME_KEY = 'pendragon_theme';
  var transitionTimer = null;

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function getSavedTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch (e) {
      /* ignore storage errors */
    }
    return null;
  }

  function getCurrentTheme() {
    var fromHtml = document.documentElement.getAttribute('data-theme');
    if (fromHtml === 'dark' || fromHtml === 'light') {
      return fromHtml;
    }
    return getSavedTheme() || getSystemTheme();
  }

  function updateToggleButtons(theme) {
    var isDark = theme === 'dark';
    var buttons = document.querySelectorAll('.theme-toggle-btn, [data-action="toggle-theme"]');

    buttons.forEach(function (btn) {
      btn.setAttribute('aria-checked', isDark ? 'true' : 'false');
      btn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
      btn.classList.toggle('is-dark', isDark);

      var label = btn.querySelector('.theme-toggle-label');
      if (label) {
        label.textContent = isDark ? 'Light' : 'Dark';
      }
    });

    var sidebarIcon = document.getElementById('sidebarThemeIcon');
    var sidebarText = document.getElementById('sidebarThemeText');
    if (sidebarIcon) {
      sidebarIcon.textContent = isDark ? '☀️' : '🌙';
    }
    if (sidebarText) {
      sidebarText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }
  }

  function updateMetaThemeColor(theme) {
    var isDark = theme === 'dark';
    var color = isDark ? '#120f0f' : '#ffffff';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);
  }

  function applyTheme(theme, animate) {
    var root = document.documentElement;

    if (animate) {
      root.classList.add('theme-transitioning');
      window.clearTimeout(transitionTimer);
      transitionTimer = window.setTimeout(function () {
        root.classList.remove('theme-transitioning');
      }, 380);
    }

    root.setAttribute('data-theme', theme);
    updateToggleButtons(theme);
    updateMetaThemeColor(theme);
  }

  function setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') return;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* ignore */
    }
    applyTheme(theme, true);
  }

  function toggleTheme() {
    var current = getCurrentTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  // Expose API
  window.PendragonTheme = {
    get: getCurrentTheme,
    set: setTheme,
    toggle: toggleTheme,
    updateUI: updateToggleButtons
  };

  // Immediate sync on load
  var initialTheme = getCurrentTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);
  updateMetaThemeColor(initialTheme);

  // Sync when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      updateToggleButtons(getCurrentTheme());
    });
  } else {
    updateToggleButtons(initialTheme);
  }

  // Cross-tab synchronization
  window.addEventListener('storage', function (e) {
    if (e.key === THEME_KEY && (e.newValue === 'dark' || e.newValue === 'light')) {
      applyTheme(e.newValue, true);
    }
  });

  // OS theme change listener (only if user hasn't explicitly set a preference)
  if (window.matchMedia) {
    var mql = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystemChange = function (e) {
      if (!getSavedTheme()) {
        applyTheme(e.matches ? 'dark' : 'light', true);
      }
    };
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onSystemChange);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(onSystemChange);
    }
  }

  // Global click delegate for theme toggle buttons
  document.addEventListener('click', function (e) {
    var btn = e.target.closest(
      '.theme-toggle-btn, [data-action="toggle-theme"], #sidebarThemeToggle, #loginThemeToggle, #pickerThemeToggle'
    );
    if (btn) {
      e.preventDefault();
      toggleTheme();
    }
  });
})();
