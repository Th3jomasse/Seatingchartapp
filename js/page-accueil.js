// ============================================================================
// Page : Accueil
// ============================================================================

(function () {
  "use strict";
  const el = AppUtils.el;

  function rendreAccueil(racine) {
    const hero = el("section", "hero");
    hero.appendChild(el("p", "hero-ornement", "✦"));
    hero.appendChild(el("h2", "hero-titre", CONFIG.event.titre));
    if (CONFIG.event.sousTitre) hero.appendChild(el("p", "hero-sous-titre", CONFIG.event.sousTitre));
    const infos = el("p", "hero-infos");
    infos.textContent = [CONFIG.event.date, CONFIG.event.lieu].filter(Boolean).join(" · ");
    hero.appendChild(infos);
    racine.appendChild(hero);

    if (CONFIG.event.messageBienvenue) {
      const carte = el("section", "carte");
      carte.appendChild(el("p", "texte-centre", CONFIG.event.messageBienvenue));
      racine.appendChild(carte);
    }

    // Raccourcis vers les autres pages
    const pages = window.PAGES_MODULES
      .filter(function (p) { return p.active && p.id !== "accueil"; })
      .sort(function (a, b) { return a.ordre - b.ordre; });
    const raccourcis = el("section", "raccourcis");
    pages.forEach(function (page) {
      const b = el("button", "raccourci");
      b.appendChild(el("span", "raccourci-icone", page.icone));
      b.appendChild(el("span", "", page.libelle));
      b.addEventListener("click", function () { location.hash = page.id; });
      raccourcis.appendChild(b);
    });
    racine.appendChild(raccourcis);
  }

  window.PAGES_MODULES.push({
    id: "accueil",
    ordre: 10,
    libelle: "Accueil",
    icone: "🏠",
    active: true,
    rendu: rendreAccueil,
  });
})();
