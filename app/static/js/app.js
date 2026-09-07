/* Comportamiento global de la aplicación: tema, sidebar y toasts.
   Todo lo demás lo resuelve HTMX desde los atributos del HTML. */

(function () {
  "use strict";

  // Alterna entre tema claro y oscuro, y lo persiste
  function setupThemeToggle() {
    var btn = document.getElementById("theme-toggle-btn");
    if (!btn) return;

    btn.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme") || "dark";
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });
  }

  // Muestra u oculta el sidebar y recuerda la preferencia
  function setupSidebarToggle() {
    var btn = document.getElementById("sidebar-toggle-btn");
    if (!btn) return;

    // Restauramos el estado guardado antes de enganchar el click
    var pref = document.documentElement.getAttribute("data-sidebar-pref");
    document.body.setAttribute("data-sidebar", pref === "closed" ? "closed" : "open");

    btn.addEventListener("click", function () {
      var current = document.body.getAttribute("data-sidebar");
      var next = current === "open" ? "closed" : "open";
      document.body.setAttribute("data-sidebar", next);
      localStorage.setItem("sidebarOpen", String(next === "open"));
    });
  }

  // Muestra un mensaje flotante. El servidor lo dispara con la cabecera
  // HX-Trigger: {"toast": {"message": "...", "level": "success"}}
  function showToast(message, level) {
    var container = document.getElementById("toast-container");
    if (!container) return;

    var toast = document.createElement("div");
    toast.className = "status-message " + (level || "info");
    toast.setAttribute("role", "status");
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(function () {
      toast.remove();
    }, 4000);
  }

  // HTMX emite este evento cuando el servidor manda HX-Trigger con clave "toast"
  document.body.addEventListener("toast", function (event) {
    var detail = event.detail || {};
    showToast(detail.message || "", detail.level);
  });

  // Exponemos showToast para las páginas que lo necesiten desde inline scripts
  window.showToast = showToast;

  setupThemeToggle();
  setupSidebarToggle();
})();
