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

  // ----------------------------------------------------------------------
  // Applique le thème défini dans CONFIG.theme : mode clair/sombre et
  // couleurs personnalisées (remplacent les variables CSS par défaut).
  // ----------------------------------------------------------------------
  (function appliquerTheme() {
    const theme = CONFIG.theme || {};
    const racine = document.documentElement;

    const mode = theme.mode || "clair";
    const prefereSombre = window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (mode === "sombre" || (mode === "auto" && prefereSombre)) {
      racine.setAttribute("data-mode", "sombre");
    }

    const correspondance = {
      accent: "--accent",
      accentFonce: "--accent-fonce",
      surlignage: "--surlignage",
      sauge: "--sauge",
      fond: "--fond",
      carte: "--carte",
      encre: "--encre",
    };
    const couleurs = theme.couleurs || {};
    Object.keys(correspondance).forEach(function (cle) {
      if (couleurs[cle]) racine.style.setProperty(correspondance[cle], couleurs[cle]);
    });

    // Polices personnalisées (Google Fonts) : theme.polices = {titre, texte}
    const polices = theme.polices || {};
    const familles = [];
    if (polices.titre) {
      racine.style.setProperty("--police-titre", '"' + polices.titre + '", Georgia, serif');
      familles.push("family=" + encodeURIComponent(polices.titre).replace(/%20/g, "+") + ":ital,wght@0,400;0,600;1,400");
    }
    if (polices.texte) {
      racine.style.setProperty("--police-texte", '"' + polices.texte + '", "Segoe UI", sans-serif');
      familles.push("family=" + encodeURIComponent(polices.texte).replace(/%20/g, "+") + ":wght@300;400;500;600");
    }
    if (familles.length) {
      const lien = document.createElement("link");
      lien.rel = "stylesheet";
      lien.href = "https://fonts.googleapis.com/css2?" + familles.join("&") + "&display=swap";
      document.head.appendChild(lien);
    }
  })();

  window.AppUtils = {
    normaliser: normaliser,
    el: el,
    tousLesInvites: tousLesInvites,
    estMariage: CONFIG.event.type !== "entreprise",
  };
})();
