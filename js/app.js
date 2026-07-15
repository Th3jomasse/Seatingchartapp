// ============================================================================
// Routeur et navigation
// Les pages sont des modules qui s'enregistrent dans window.PAGES_MODULES
// (voir js/page-*.js). Aucune modification nécessaire ici — tout se
// configure dans js/config.js.
// ============================================================================

(function () {
  "use strict";

  const contenu = document.getElementById("contenu");
  const nav = document.getElementById("nav");

  document.title = CONFIG.event.titre + " — Trouvez votre place";
  document.getElementById("entete-titre").textContent = CONFIG.event.titre;

  const PAGES = window.PAGES_MODULES
    .filter(function (p) { return p.active; })
    .sort(function (a, b) { return a.ordre - b.ordre; });

  // Navigation du bas
  PAGES.forEach(function (page) {
    const bouton = AppUtils.el("button", "nav-bouton");
    bouton.setAttribute("data-page", page.id);
    bouton.appendChild(AppUtils.el("span", "nav-icone", page.icone));
    bouton.appendChild(AppUtils.el("span", "nav-libelle", page.libelle));
    bouton.addEventListener("click", function () {
      location.hash = page.id;
    });
    nav.appendChild(bouton);
  });

  function pageCourante() {
    const id = location.hash.replace("#", "");
    return PAGES.find(function (p) { return p.id === id; }) || PAGES[0];
  }

  function afficherPage() {
    const page = pageCourante();
    contenu.innerHTML = "";
    contenu.scrollTop = 0;
    window.scrollTo(0, 0);
    page.rendu(contenu);
    nav.querySelectorAll(".nav-bouton").forEach(function (b) {
      b.classList.toggle("actif", b.getAttribute("data-page") === page.id);
    });
  }

  window.addEventListener("hashchange", afficherPage);
  afficherPage();
})();
