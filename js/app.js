// ============================================================================
// Application « Trouvez votre place »
// Aucune modification nécessaire ici — tout se configure dans js/config.js
// ============================================================================

(function () {
  "use strict";

  const estMariage = CONFIG.event.type !== "entreprise";
  const contenu = document.getElementById("contenu");
  const nav = document.getElementById("nav");

  document.title = CONFIG.event.titre + " — Trouvez votre place";
  document.getElementById("entete-titre").textContent = CONFIG.event.titre;

  // --------------------------------------------------------------------------
  // Utilitaires
  // --------------------------------------------------------------------------

  // Normalise un nom pour la recherche (minuscules, sans accents)
  function normaliser(texte) {
    return texte
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

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

  // --------------------------------------------------------------------------
  // Pages disponibles
  // --------------------------------------------------------------------------

  const PAGES = [
    { id: "accueil", libelle: "Accueil", icone: "🏠", active: true, rendu: rendreAccueil },
    { id: "plan", libelle: "Ma place", icone: "🪑", active: CONFIG.pages.plan, rendu: rendrePlan },
    { id: "menu", libelle: "Menu", icone: "🍽️", active: CONFIG.pages.menu, rendu: rendreMenu },
    { id: "photos", libelle: "Photos", icone: "📸", active: CONFIG.pages.photos, rendu: rendrePhotos },
    {
      id: "apropos",
      libelle: estMariage ? "Les mariés" : "À propos",
      icone: estMariage ? "💍" : "ℹ️",
      active: CONFIG.pages.aPropos,
      rendu: rendreAPropos,
    },
  ].filter(function (p) { return p.active; });

  // --------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------

  PAGES.forEach(function (page) {
    const bouton = el("button", "nav-bouton");
    bouton.setAttribute("data-page", page.id);
    bouton.appendChild(el("span", "nav-icone", page.icone));
    bouton.appendChild(el("span", "nav-libelle", page.libelle));
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

  // --------------------------------------------------------------------------
  // Page : Accueil
  // --------------------------------------------------------------------------

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
    const raccourcis = el("section", "raccourcis");
    PAGES.filter(function (p) { return p.id !== "accueil"; }).forEach(function (page) {
      const b = el("button", "raccourci");
      b.appendChild(el("span", "raccourci-icone", page.icone));
      b.appendChild(el("span", "", page.libelle));
      b.addEventListener("click", function () { location.hash = page.id; });
      raccourcis.appendChild(b);
    });
    racine.appendChild(raccourcis);
  }

  // --------------------------------------------------------------------------
  // Page : Trouver ma place + plan de salle
  // --------------------------------------------------------------------------

  function rendrePlan(racine) {
    const section = el("section");
    section.appendChild(el("h2", "titre-page", "Trouvez votre place"));
    section.appendChild(el("p", "sous-titre-page", "Entrez votre nom pour trouver votre table."));

    // Champ de recherche
    const zoneRecherche = el("div", "recherche");
    const champ = el("input", "recherche-champ");
    champ.type = "search";
    champ.placeholder = "Votre nom…";
    champ.setAttribute("autocomplete", "off");
    zoneRecherche.appendChild(champ);
    const resultats = el("div", "recherche-resultats");
    zoneRecherche.appendChild(resultats);
    section.appendChild(zoneRecherche);

    // Zone du résultat sélectionné
    const detail = el("div", "detail-table");
    section.appendChild(detail);

    // Plan de salle
    const titrePlan = el("h3", "titre-plan", "Plan de salle");
    section.appendChild(titrePlan);
    section.appendChild(el("p", "sous-titre-page", "Touchez une table pour voir qui y est assis."));
    const plan = construirePlan(function (indexTable) {
      montrerTable(indexTable, null);
    });
    section.appendChild(plan.element);
    racine.appendChild(section);

    // Affiche les détails d'une table (et surligne sur le plan)
    function montrerTable(indexTable, nomInvite) {
      const table = CONFIG.salle.tables[indexTable];
      plan.surligner(indexTable);
      detail.innerHTML = "";
      const carte = el("div", "carte carte-resultat");
      if (nomInvite) {
        carte.appendChild(el("p", "resultat-invite", nomInvite));
        carte.appendChild(el("p", "resultat-phrase", "vous êtes assis(e) à la"));
      }
      carte.appendChild(el("p", "resultat-table", table.nom));
      const listeTitre = el("p", "resultat-avec", "À cette table :");
      carte.appendChild(listeTitre);
      const liste = el("ul", "resultat-liste");
      table.invites.forEach(function (nom) {
        const item = el("li", "", nom);
        if (nomInvite && normaliser(nom) === normaliser(nomInvite)) item.classList.add("moi");
        liste.appendChild(item);
      });
      carte.appendChild(liste);
      detail.appendChild(carte);
      detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // Recherche en direct
    champ.addEventListener("input", function () {
      const requete = normaliser(champ.value);
      resultats.innerHTML = "";
      if (requete.length < 2) return;
      const correspondances = tousLesInvites.filter(function (i) {
        return normaliser(i.nom).indexOf(requete) !== -1;
      }).slice(0, 8);
      if (correspondances.length === 0) {
        resultats.appendChild(el("div", "recherche-vide",
          "Aucun invité trouvé. Vérifiez l'orthographe ou demandez aux hôtes."));
        return;
      }
      correspondances.forEach(function (invite) {
        const item = el("button", "recherche-item");
        item.appendChild(el("span", "recherche-nom", invite.nom));
        item.appendChild(el("span", "recherche-table", invite.table.nom));
        item.addEventListener("click", function () {
          champ.value = invite.nom;
          resultats.innerHTML = "";
          montrerTable(invite.indexTable, invite.nom);
        });
        resultats.appendChild(item);
      });
    });
  }

  // Construit le plan de salle en SVG à partir de la configuration.
  // Retourne { element, surligner(indexTable) }.
  function construirePlan(surClicTable) {
    const NS = "http://www.w3.org/2000/svg";
    const largeur = 100, hauteur = 120; // unités du plan (viewBox)

    const conteneur = el("div", "plan-conteneur");
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + largeur + " " + hauteur);
    svg.setAttribute("class", "plan-svg");
    conteneur.appendChild(svg);

    function x(p) { return (p / 100) * largeur; }
    function y(p) { return (p / 100) * hauteur; }

    // Repères (scène, bar, etc.)
    (CONFIG.salle.reperes || []).forEach(function (repere) {
      const g = document.createElementNS(NS, "g");
      const rect = document.createElementNS(NS, "rect");
      const w = (repere.largeur / 100) * largeur;
      const h = (repere.hauteur / 100) * hauteur;
      rect.setAttribute("x", x(repere.x) - w / 2);
      rect.setAttribute("y", y(repere.y) - h / 2);
      rect.setAttribute("width", w);
      rect.setAttribute("height", h);
      rect.setAttribute("rx", 1.5);
      rect.setAttribute("class", "plan-repere");
      g.appendChild(rect);
      const texte = document.createElementNS(NS, "text");
      texte.setAttribute("x", x(repere.x));
      texte.setAttribute("y", y(repere.y));
      texte.setAttribute("class", "plan-repere-texte");
      texte.textContent = repere.nom;
      g.appendChild(texte);
      svg.appendChild(g);
    });

    // Tables
    const formes = [];
    CONFIG.salle.tables.forEach(function (table, index) {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "plan-table");
      let forme;
      if (table.forme === "rect") {
        forme = document.createElementNS(NS, "rect");
        forme.setAttribute("x", x(table.x) - 9);
        forme.setAttribute("y", y(table.y) - 4);
        forme.setAttribute("width", 18);
        forme.setAttribute("height", 8);
        forme.setAttribute("rx", 1.5);
      } else {
        forme = document.createElementNS(NS, "circle");
        forme.setAttribute("cx", x(table.x));
        forme.setAttribute("cy", y(table.y));
        forme.setAttribute("r", 6);
      }
      forme.setAttribute("class", "plan-table-forme");
      g.appendChild(forme);
      formes.push(forme);

      // Numéro court au centre de la table ("H" pour table d'honneur,
      // sinon le premier nombre trouvé dans le nom, sinon l'index)
      const num = document.createElementNS(NS, "text");
      num.setAttribute("x", x(table.x));
      num.setAttribute("y", y(table.y));
      num.setAttribute("class", "plan-table-numero");
      const nombre = table.nom.match(/\d+/);
      num.textContent = nombre ? nombre[0] : (index === 0 ? "★" : String(index + 1));
      g.appendChild(num);

      g.addEventListener("click", function () { surClicTable(index); });
      svg.appendChild(g);
    });

    return {
      element: conteneur,
      surligner: function (indexTable) {
        formes.forEach(function (f, i) {
          f.classList.toggle("surligne", i === indexTable);
        });
      },
    };
  }

  // --------------------------------------------------------------------------
  // Page : Menu
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // Page : Photos
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // Page : Les mariés / À propos
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // Démarrage
  // --------------------------------------------------------------------------

  afficherPage();
})();
