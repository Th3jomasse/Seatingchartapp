// ============================================================================
// Utilitaires partagés + registre des pages
// Chargé avant tous les modules de page.
// ============================================================================

(function () {
  "use strict";

  // Registre : chaque module de page s'ajoute ici via window.PAGES_MODULES.push()
  window.PAGES_MODULES = [];

  // Normalise un texte pour la recherche (minuscules, sans accents)
  function normaliser(texte) {
    return texte
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  // Crée un élément HTML avec classe et texte optionnels
  function el(balise, classe, texte) {
    const e = document.createElement(balise);
    if (classe) e.className = classe;
    if (texte !== undefined) e.textContent = texte;
    return e;
  }

  // Liste de tous les invités avec leur table
  const tousLesInvites = [];
  CONFIG.salle.tables.forEach(function (table, indexTable) {
    table.invites.forEach(function (nom) {
      tousLesInvites.push({ nom: nom, table: table, indexTable: indexTable });
    });
  });

  window.AppUtils = {
    normaliser: normaliser,
    el: el,
    tousLesInvites: tousLesInvites,
    estMariage: CONFIG.event.type !== "entreprise",
  };
})();
