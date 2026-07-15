// ============================================================================
// Page : Photos
// ============================================================================

(function () {
  "use strict";
  const el = AppUtils.el;

  function rendrePhotos(racine) {
    const section = el("section");
    section.appendChild(el("h2", "titre-page", CONFIG.photos.titre));
    const carte = el("div", "carte texte-centre");
    carte.appendChild(el("p", "photos-icone", "📸"));
    carte.appendChild(el("p", "", CONFIG.photos.description));
    const lien = el("a", "bouton-principal", CONFIG.photos.texteBouton);
    lien.href = CONFIG.photos.lien;
    lien.target = "_blank";
    lien.rel = "noopener";
    carte.appendChild(lien);
    if (CONFIG.photos.motClic) {
      carte.appendChild(el("p", "photos-motclic", CONFIG.photos.motClic));
    }
    section.appendChild(carte);
    racine.appendChild(section);
  }

  window.PAGES_MODULES.push({
    id: "photos",
    ordre: 40,
    libelle: "Photos",
    icone: "📸",
    active: CONFIG.pages.photos,
    rendu: rendrePhotos,
  });
})();
