// ============================================================================
// Page : Menu
// ============================================================================

(function () {
  "use strict";
  const el = AppUtils.el;
  const normaliser = AppUtils.normaliser;

  // Régimes alimentaires détectés dans les notes des plats.
  // "regexNorm" teste le texte normalisé (sans accents/majuscules).
  // "regexTexte" retire la mention du texte original pour ne garder que le reste.
  const REGIMES = [
    {
      cle: "vegetarien",
      icone: "vegetarien",
      libelle: "Végétarien",
      regexNorm: /vegetarien/,
      regexTexte: /v[ée]g[ée]tarien(?:ne)?s?/gi,
    },
    {
      cle: "sansGluten",
      icone: "sans-gluten",
      libelle: "Sans gluten",
      regexNorm: /sans\s*gluten/,
      regexTexte: /sans\s*gluten/gi,
    },
    {
      cle: "vegane",
      icone: "vegane",
      libelle: "Végane",
      regexNorm: /vegan(?:e)?/,
      regexTexte: /v[ée]gan(?:e)?s?/gi,
    },
  ];

  // Retourne la liste des régimes (parmi REGIMES) mentionnés dans une note.
  function detecterRegimes(note) {
    if (!note) return [];
    const texteNorm = normaliser(note);
    return REGIMES.filter(function (regime) {
      return regime.regexNorm.test(texteNorm);
    });
  }

  // Retire les mentions de régimes déjà transformées en pastilles pour ne
  // garder que le reste de la note (ex. allergènes précisés en plus).
  function texteRestant(note, regimes) {
    if (!note || !regimes.length) return note || "";
    let reste = note;
    regimes.forEach(function (regime) {
      reste = reste.replace(regime.regexTexte, "");
    });
    return reste
      .replace(/^[\s,;/–-]+|[\s,;/–-]+$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function rendreMenu(racine) {
    let filtreActif = "tout";

    const section = el("section");
    section.appendChild(el("h2", "titre-page", "Menu"));

    // Régimes réellement présents dans le menu, pour ne proposer que des
    // filtres pertinents (dans l'ordre de la liste REGIMES).
    const clesPresentes = [];
    CONFIG.menu.sections.forEach(function (partie) {
      partie.plats.forEach(function (plat) {
        detecterRegimes(plat.note).forEach(function (regime) {
          if (clesPresentes.indexOf(regime.cle) === -1) clesPresentes.push(regime.cle);
        });
      });
    });
    const regimesDispo = REGIMES.filter(function (regime) {
      return clesPresentes.indexOf(regime.cle) !== -1;
    });

    const barreFiltres = el("div", "menu-filtres");
    const rangeePuces = el("div", "menu-puces");
    const compteur = el("p", "menu-compteur");
    barreFiltres.appendChild(rangeePuces);
    barreFiltres.appendChild(compteur);

    const conteneur = el("div", "menu-conteneur");

    function creerPuce(cle, texte, nomIcone) {
      const puce = el("button", "menu-puce");
      if (nomIcone) puce.appendChild(Icones.creer(nomIcone, 15));
      puce.appendChild(el("span", "", texte));
      puce.type = "button";
      puce.dataset.cle = cle;
      puce.setAttribute("aria-pressed", cle === filtreActif ? "true" : "false");
      puce.addEventListener("click", function () {
        if (filtreActif === cle) return;
        filtreActif = cle;
        actualiser();
      });
      return puce;
    }

    rangeePuces.appendChild(creerPuce("tout", "Tout"));
    regimesDispo.forEach(function (regime) {
      rangeePuces.appendChild(creerPuce(regime.cle, regime.libelle, regime.icone));
    });

    function actualiser() {
      Array.prototype.forEach.call(rangeePuces.querySelectorAll(".menu-puce"), function (puce) {
        const active = puce.dataset.cle === filtreActif;
        puce.classList.toggle("menu-puce-actif", active);
        puce.setAttribute("aria-pressed", active ? "true" : "false");
      });

      conteneur.innerHTML = "";
      let totalAffiche = 0;

      CONFIG.menu.sections.forEach(function (partie) {
        const platsRetenus = partie.plats.filter(function (plat) {
          if (filtreActif === "tout") return true;
          return detecterRegimes(plat.note).some(function (regime) {
            return regime.cle === filtreActif;
          });
        });
        if (!platsRetenus.length) return;

        totalAffiche += platsRetenus.length;

        const carte = el("div", "carte carte-menu menu-anime");
        carte.appendChild(el("h3", "menu-section", partie.titre));
        platsRetenus.forEach(function (plat) {
          const regimes = detecterRegimes(plat.note);
          const ligne = el("div", "menu-plat");

          const entete = el("div", "menu-plat-entete");
          entete.appendChild(el("p", "menu-plat-nom", plat.nom));
          if (regimes.length) {
            const pastilles = el("span", "menu-pastilles");
            regimes.forEach(function (regime) {
              const pastille = el("span", "menu-pastille");
              pastille.appendChild(Icones.creer(regime.icone, 13));
              pastille.appendChild(el("span", "", regime.libelle));
              pastille.title = regime.libelle;
              pastilles.appendChild(pastille);
            });
            entete.appendChild(pastilles);
          }
          ligne.appendChild(entete);

          const reste = texteRestant(plat.note, regimes);
          if (reste) ligne.appendChild(el("p", "menu-plat-note", reste));

          carte.appendChild(ligne);
        });

        conteneur.appendChild(carte);
        // Petite transition d'apparition, une fois l'élément inséré au DOM.
        requestAnimationFrame(function () {
          carte.classList.add("menu-anime-actif");
        });
      });

      if (filtreActif === "tout") {
        compteur.textContent = "";
      } else {
        compteur.textContent = totalAffiche + (totalAffiche > 1 ? " plats" : " plat");
      }
    }

    actualiser();

    section.appendChild(barreFiltres);
    section.appendChild(conteneur);

    if (CONFIG.menu.note) {
      section.appendChild(el("p", "menu-note", CONFIG.menu.note));
    }
    racine.appendChild(section);
  }

  window.PAGES_MODULES.push({
    id: "menu",
    ordre: 30,
    libelle: "Menu",
    icone: "menu",
    active: CONFIG.pages.menu,
    rendu: rendreMenu,
  });
})();
