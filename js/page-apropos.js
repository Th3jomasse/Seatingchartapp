// ============================================================================
// Page : Les mariés / À propos
// ============================================================================

(function () {
  "use strict";
  const el = AppUtils.el;

  function rendreAPropos(racine) {
    const section = el("section");
    section.appendChild(el("h2", "titre-page", CONFIG.aPropos.titre));
    const carte = el("div", "carte");
    CONFIG.aPropos.paragraphes.forEach(function (p) {
      carte.appendChild(el("p", "apropos-paragraphe", p));
    });
    section.appendChild(carte);

    if (CONFIG.pages.horaire && CONFIG.horaire && CONFIG.horaire.length) {
      section.appendChild(el("h3", "titre-plan", "Déroulement de la journée"));
      const carteHoraire = el("div", "carte");
      CONFIG.horaire.forEach(function (etape) {
        const ligne = el("div", "horaire-ligne");
        ligne.appendChild(el("span", "horaire-heure", etape.heure));
        ligne.appendChild(el("span", "horaire-activite", etape.activite));
        carteHoraire.appendChild(ligne);
      });
      section.appendChild(carteHoraire);
    }
    racine.appendChild(section);
  }

  window.PAGES_MODULES.push({
    id: "apropos",
    ordre: 60,
    libelle: AppUtils.estMariage ? "Les mariés" : "À propos",
    icone: AppUtils.estMariage ? "💍" : "ℹ️",
    active: CONFIG.pages.aPropos,
    rendu: rendreAPropos,
  });
})();
