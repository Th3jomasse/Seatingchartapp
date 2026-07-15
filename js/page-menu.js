// ============================================================================
// Page : Menu
// ============================================================================

(function () {
  "use strict";
  const el = AppUtils.el;

  function rendreMenu(racine) {
    const section = el("section");
    section.appendChild(el("h2", "titre-page", "Menu"));
    CONFIG.menu.sections.forEach(function (partie) {
      const carte = el("div", "carte carte-menu");
      carte.appendChild(el("h3", "menu-section", partie.titre));
      partie.plats.forEach(function (plat) {
        const ligne = el("div", "menu-plat");
        ligne.appendChild(el("p", "menu-plat-nom", plat.nom));
        if (plat.note) ligne.appendChild(el("p", "menu-plat-note", plat.note));
        carte.appendChild(ligne);
      });
      section.appendChild(carte);
    });
    if (CONFIG.menu.note) {
      section.appendChild(el("p", "menu-note", CONFIG.menu.note));
    }
    racine.appendChild(section);
  }

  window.PAGES_MODULES.push({
    id: "menu",
    ordre: 30,
    libelle: "Menu",
    icone: "🍽️",
    active: CONFIG.pages.menu,
    rendu: rendreMenu,
  });
})();
