// ============================================================================
// Page : Infos pratiques
// ============================================================================

(function () {
  "use strict";
  const el = AppUtils.el;

  function rendreInfos(racine) {
    const section = el("section");
    section.appendChild(el("h2", "titre-page", "Infos pratiques"));
    const infos = CONFIG.infos || {};

    if (infos.adresse) {
      const carte = el("div", "carte texte-centre");
      carte.appendChild(el("h3", "menu-section", "📍 Adresse"));
      carte.appendChild(el("p", "", infos.adresse));
      if (infos.googleMapsLien) {
        const lien = el("a", "bouton-principal", "Ouvrir dans Google Maps");
        lien.href = infos.googleMapsLien;
        lien.target = "_blank";
        lien.rel = "noopener";
        carte.appendChild(lien);
      }
      section.appendChild(carte);
    }
    racine.appendChild(section);
  }

  window.PAGES_MODULES.push({
    id: "infos",
    ordre: 50,
    libelle: "Infos",
    icone: "ℹ️",
    active: CONFIG.pages.infos,
    rendu: rendreInfos,
  });
})();
