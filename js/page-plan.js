// ============================================================================
// Page : Trouver ma place + plan de salle
// ============================================================================

(function () {
  "use strict";
  const el = AppUtils.el;
  const normaliser = AppUtils.normaliser;
  const tousLesInvites = AppUtils.tousLesInvites;

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
    section.appendChild(el("h3", "titre-plan", "Plan de salle"));
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
      carte.appendChild(el("p", "resultat-avec", "À cette table :"));
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

      // Numéro court au centre de la table
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

  window.PAGES_MODULES.push({
    id: "plan",
    ordre: 20,
    libelle: "Ma place",
    icone: "🪑",
    active: CONFIG.pages.plan,
    rendu: rendrePlan,
  });
})();
