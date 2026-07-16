// ============================================================================
// Onglet « Plan de salle » (admin.html)
//
// Grand plan SVG (mêmes proportions que l'application invités) avec :
//   - glisser-déposer des tables et des repères (pointer events),
//   - sélection au clic (panneau latéral d'édition : nom, forme, invités…),
//   - boutons d'ajout, compteurs permanents, import express d'invités.
//
// Travaille directement sur Admin.brouillon().salle. Aucun état global :
// tout (sélection, écouteurs) vit dans la fermeture de rendu(conteneur) et
// est recréé à chaque activation de l'onglet ou changement d'événement.
// ============================================================================

(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const LARGEUR = 100, HAUTEUR = 120; // même viewBox que js/page-plan.js
  const SEUIL_CLIC = 5; // px écran — au-delà, un pointerdown devient un glissement

  // -------------------------------------------------------------- Utilitaires

  function el(balise, classe, texte) {
    const e = document.createElement(balise);
    if (classe) e.className = classe;
    if (texte !== undefined) e.textContent = texte;
    return e;
  }

  function clamp(valeur, min, max) {
    return Math.min(Math.max(valeur, min), max);
  }

  function x(p) { return (p / 100) * LARGEUR; }
  function y(p) { return (p / 100) * HAUTEUR; }

  // ------------------------------------------------------------------ Rendu

  function rendu(conteneur) {
    const brouillon = window.Admin.brouillon();
    brouillon.salle = brouillon.salle || {};
    brouillon.salle.tables = brouillon.salle.tables || [];
    brouillon.salle.reperes = brouillon.salle.reperes || [];
    const salle = brouillon.salle;

    let selection = null; // { type: "table" | "repere", index } ou null

    // ------------------------------------------------------------ Structure DOM

    conteneur.innerHTML = "";
    const mise = el("div", "aplan-mise-en-page");
    conteneur.appendChild(mise);

    // ---- Colonne de gauche : actions, compteurs, plan, import ----
    const zonePlan = el("div", "aplan-zone-plan");
    mise.appendChild(zonePlan);

    const barre = el("div", "aplan-barre-actions");
    const boutonAjouterTable = el("button", "a-bouton", "+ Table");
    boutonAjouterTable.type = "button";
    const boutonAjouterRepere = el("button", "a-bouton-contour", "+ Repère");
    boutonAjouterRepere.type = "button";
    const boutonImporter = el("button", "a-bouton-contour", "Importer une liste");
    boutonImporter.type = "button";
    barre.appendChild(boutonAjouterTable);
    barre.appendChild(boutonAjouterRepere);
    barre.appendChild(boutonImporter);
    zonePlan.appendChild(barre);

    const compteurs = el("p", "aplan-compteurs");
    zonePlan.appendChild(compteurs);

    const cartePlan = el("div", "aplan-plan-carte a-carte");
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + LARGEUR + " " + HAUTEUR);
    svg.setAttribute("class", "aplan-svg");
    cartePlan.appendChild(svg);
    zonePlan.appendChild(cartePlan);

    const carteImport = el("div", "aplan-import a-carte");
    carteImport.hidden = true;
    zonePlan.appendChild(carteImport);

    // ---- Colonne de droite : panneau d'édition ----
    const panneau = el("div", "aplan-panneau a-carte");
    mise.appendChild(panneau);

    // -------------------------------------------------------------- Compteurs

    function mettreAJourCompteurs() {
      compteurs.innerHTML = "";
      const nbTables = salle.tables.length;
      let nbInvites = 0;
      salle.tables.forEach(function (t) { nbInvites += (t.invites || []).length; });

      const fortTables = document.createElement("strong");
      fortTables.textContent = String(nbTables);
      compteurs.appendChild(fortTables);
      compteurs.appendChild(document.createTextNode(" table" + (nbTables !== 1 ? "s" : "") + " · "));

      const fortInvites = document.createElement("strong");
      fortInvites.textContent = String(nbInvites);
      compteurs.appendChild(fortInvites);
      compteurs.appendChild(document.createTextNode(" invité" + (nbInvites !== 1 ? "s" : "")));
    }

    // ---------------------------------------------------------------- Plan SVG

    function estSelectionne(type, index) {
      return !!selection && selection.type === type && selection.index === index;
    }

    function rendrePlan() {
      svg.innerHTML = "";
      salle.reperes.forEach(function (repere, index) {
        svg.appendChild(creerGroupeRepere(repere, index));
      });
      salle.tables.forEach(function (table, index) {
        const gChaises = document.createElementNS(NS, "g");
        gChaises.setAttribute("class", "aplan-chaises");
        svg.appendChild(gChaises);
        svg.appendChild(creerGroupeTable(table, index, gChaises));
      });
    }

    function creerGroupeRepere(repere, index) {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "aplan-repere");

      const rect = document.createElementNS(NS, "rect");
      rect.setAttribute("rx", 1.5);
      rect.setAttribute("class", "aplan-repere-forme" + (estSelectionne("repere", index) ? " aplan-selectionne" : ""));
      g.appendChild(rect);

      const texte = document.createElementNS(NS, "text");
      texte.setAttribute("class", "aplan-repere-texte");
      texte.textContent = repere.nom;
      g.appendChild(texte);

      g._forme = rect;
      g._texte = texte;
      positionnerRepere(g, repere);

      g.addEventListener("click", function (e) { e.stopPropagation(); });
      attacherGlisser(g, "repere", index, positionnerRepere);
      return g;
    }

    function positionnerRepere(g, repere) {
      const w = (repere.largeur / 100) * LARGEUR;
      const h = (repere.hauteur / 100) * HAUTEUR;
      g._forme.setAttribute("x", x(repere.x) - w / 2);
      g._forme.setAttribute("y", y(repere.y) - h / 2);
      g._forme.setAttribute("width", w);
      g._forme.setAttribute("height", h);
      g._texte.setAttribute("x", x(repere.x));
      g._texte.setAttribute("y", y(repere.y));
    }

    // Petites chaises décoratives autour des tables (même logique que
    // js/page-plan.js), purement visuelles.
    function dessinerChaisesRonde(g, cx, cy, rayonTable, nombre) {
      if (nombre <= 0) return;
      const rayonChaises = rayonTable + 2.3;
      for (let i = 0; i < nombre; i++) {
        const angle = (Math.PI * 2 * i) / nombre - Math.PI / 2;
        const chaise = document.createElementNS(NS, "circle");
        chaise.setAttribute("cx", cx + rayonChaises * Math.cos(angle));
        chaise.setAttribute("cy", cy + rayonChaises * Math.sin(angle));
        chaise.setAttribute("r", 1);
        chaise.setAttribute("class", "aplan-chaise");
        g.appendChild(chaise);
      }
    }

    function dessinerChaisesRect(g, rectX, rectY, largeurRect, hauteurRect, nombre) {
      if (nombre <= 0) return;
      const marge = 2;
      const decalage = 2.3;
      const nHaut = Math.ceil(nombre / 2);
      const nBas = nombre - nHaut;
      function placerRangee(n, yChaise) {
        if (n <= 0) return;
        for (let i = 0; i < n; i++) {
          const cx = n === 1
            ? rectX + largeurRect / 2
            : rectX + marge + (i * (largeurRect - 2 * marge)) / (n - 1);
          const chaise = document.createElementNS(NS, "circle");
          chaise.setAttribute("cx", cx);
          chaise.setAttribute("cy", yChaise);
          chaise.setAttribute("r", 1);
          chaise.setAttribute("class", "aplan-chaise");
          g.appendChild(chaise);
        }
      }
      placerRangee(nHaut, rectY - decalage);
      placerRangee(nBas, rectY + hauteurRect + decalage);
    }

    function creerGroupeTable(table, index, gChaises) {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "aplan-table");

      const nombreInvites = (table.invites || []).length;
      let forme;
      if (table.forme === "rect") {
        forme = document.createElementNS(NS, "rect");
        forme.setAttribute("width", 18);
        forme.setAttribute("height", 8);
        forme.setAttribute("rx", 1.5);
        dessinerChaisesRect(gChaises, x(table.x) - 9, y(table.y) - 4, 18, 8, nombreInvites);
      } else {
        forme = document.createElementNS(NS, "circle");
        forme.setAttribute("r", 6);
        dessinerChaisesRonde(gChaises, x(table.x), y(table.y), 6, nombreInvites);
      }
      forme.setAttribute("class", "aplan-table-forme" + (estSelectionne("table", index) ? " aplan-selectionne" : ""));
      g.appendChild(forme);

      const texte = document.createElementNS(NS, "text");
      texte.setAttribute("class", "aplan-table-texte");
      const nombre = table.nom.match(/\d+/);
      texte.textContent = nombre ? nombre[0] : (index === 0 ? "★" : String(index + 1));
      g.appendChild(texte);

      g._forme = forme;
      g._texte = texte;
      positionnerTable(g, table);

      g.addEventListener("click", function (e) { e.stopPropagation(); });
      attacherGlisser(g, "table", index, positionnerTable);
      return g;
    }

    function positionnerTable(g, table) {
      if (table.forme === "rect") {
        g._forme.setAttribute("x", x(table.x) - 9);
        g._forme.setAttribute("y", y(table.y) - 4);
      } else {
        g._forme.setAttribute("cx", x(table.x));
        g._forme.setAttribute("cy", y(table.y));
      }
      g._texte.setAttribute("x", x(table.x));
      g._texte.setAttribute("y", y(table.y));
    }

    // ------------------------------------------------------------ Glisser-déposer

    // Convertit des coordonnées écran (clientX/clientY) en coordonnées du viewBox SVG.
    function pointClientVersSvg(clientX, clientY) {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const transforme = pt.matrixTransform(ctm.inverse());
      return { x: transforme.x, y: transforme.y };
    }

    // Un simple clic (déplacement < SEUIL_CLIC px écran) sélectionne l'élément
    // plutôt que de le déplacer. Admin.notifierChangement() n'est appelé
    // qu'une fois, au relâchement — jamais à chaque pixel de déplacement.
    function attacherGlisser(g, type, index, positionnerFn) {
      let pointerId = null;
      let departClient = null;
      let departSvg = null;
      let positionDepart = null;
      let aBouge = false;

      g.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        e.stopPropagation();
        pointerId = e.pointerId;
        aBouge = false;
        departClient = { x: e.clientX, y: e.clientY };
        departSvg = pointClientVersSvg(e.clientX, e.clientY);
        const obj = type === "table" ? salle.tables[index] : salle.reperes[index];
        positionDepart = { x: obj.x, y: obj.y };
        g.classList.add("aplan-glisse");
        try { g.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
      });

      g.addEventListener("pointermove", function (e) {
        if (pointerId === null || e.pointerId !== pointerId) return;
        if (!aBouge) {
          const distance = Math.hypot(e.clientX - departClient.x, e.clientY - departClient.y);
          if (distance < SEUIL_CLIC) return;
          aBouge = true;
        }
        const point = pointClientVersSvg(e.clientX, e.clientY);
        const dxPct = ((point.x - departSvg.x) / LARGEUR) * 100;
        const dyPct = ((point.y - departSvg.y) / HAUTEUR) * 100;
        const obj = type === "table" ? salle.tables[index] : salle.reperes[index];
        const nx = clamp(positionDepart.x + dxPct, 0, 100);
        const ny = clamp(positionDepart.y + dyPct, 0, 100);
        obj.x = Math.round(nx * 10) / 10;
        obj.y = Math.round(ny * 10) / 10;
        positionnerFn(g, obj);
      });

      function terminerGlissement(e) {
        if (pointerId === null || e.pointerId !== pointerId) return;
        pointerId = null;
        g.classList.remove("aplan-glisse");
        try { g.releasePointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
        if (aBouge) {
          window.Admin.notifierChangement();
          rendrePlan(); // remet à jour le surlignage/l'ordre d'affichage
        } else {
          selectionner(type, index);
        }
      }

      g.addEventListener("pointerup", terminerGlissement);
      g.addEventListener("pointercancel", terminerGlissement);
    }

    // Clic sur une zone vide du plan : désélectionne.
    svg.addEventListener("click", function () { selectionner(null, null); });

    // ------------------------------------------------------------------- Sélection

    function selectionner(type, index) {
      selection = type === null ? null : { type: type, index: index };
      rendrePlan();
      rendrePanneau();
    }

    // -------------------------------------------------------------------- Panneau

    function champTexte(label, valeur, surChangement) {
      const groupe = el("div", "a-champ");
      groupe.appendChild(el("label", "", label));
      const input = document.createElement("input");
      input.type = "text";
      input.value = valeur;
      input.addEventListener("input", function () { surChangement(input.value); });
      groupe.appendChild(input);
      return groupe;
    }

    function champNombre(label, valeur, surChangement) {
      const groupe = el("div", "a-champ");
      groupe.appendChild(el("label", "", label));
      const input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.max = "100";
      input.step = "0.5";
      input.value = valeur;
      input.addEventListener("input", function () {
        const n = parseFloat(input.value);
        surChangement(isNaN(n) ? 0 : n);
      });
      groupe.appendChild(input);
      return groupe;
    }

    function rendrePanneau() {
      panneau.innerHTML = "";
      if (!selection) {
        panneau.appendChild(el("p", "aplan-panneau-vide",
          "Sélectionnez une table ou un repère sur le plan pour le modifier ici."));
        return;
      }
      if (selection.type === "table") rendrePanneauTable(selection.index);
      else rendrePanneauRepere(selection.index);
    }

    function rendrePanneauTable(index) {
      const table = salle.tables[index];

      panneau.appendChild(el("h2", "", "Table"));

      panneau.appendChild(champTexte("Nom de la table", table.nom, function (valeur) {
        table.nom = valeur;
        window.Admin.notifierChangement();
        rendrePlan();
      }));

      const groupeForme = el("div", "a-champ");
      groupeForme.appendChild(el("label", "", "Forme"));
      const selectForme = document.createElement("select");
      [["ronde", "Ronde"], ["rect", "Rectangulaire"]].forEach(function (paire) {
        const option = document.createElement("option");
        option.value = paire[0];
        option.textContent = paire[1];
        if (table.forme === paire[0]) option.selected = true;
        selectForme.appendChild(option);
      });
      selectForme.addEventListener("change", function () {
        table.forme = selectForme.value;
        window.Admin.notifierChangement();
        rendrePlan();
      });
      groupeForme.appendChild(selectForme);
      panneau.appendChild(groupeForme);

      const groupeInvites = el("div", "a-champ");
      groupeInvites.appendChild(el("label", "", "Invités (un nom par ligne)"));
      const zoneInvites = document.createElement("textarea");
      zoneInvites.rows = 8;
      zoneInvites.value = (table.invites || []).join("\n");
      zoneInvites.addEventListener("input", function () {
        table.invites = zoneInvites.value
          .split("\n")
          .map(function (s) { return s.trim(); })
          .filter(function (s) { return s.length > 0; });
        window.Admin.notifierChangement();
        mettreAJourCompteurs();
        rendrePlan(); // met à jour le nombre de chaises décoratives
      });
      groupeInvites.appendChild(zoneInvites);
      panneau.appendChild(groupeInvites);

      const actions = el("div", "aplan-panneau-actions");
      const boutonSupprimer = el("button", "a-bouton-danger", "Supprimer la table");
      boutonSupprimer.type = "button";
      boutonSupprimer.addEventListener("click", function () {
        if (!confirm("Supprimer la table « " + table.nom + " » et la liste de ses invités ?")) return;
        salle.tables.splice(index, 1);
        selection = null;
        window.Admin.notifierChangement();
        rendrePlan();
        rendrePanneau();
        mettreAJourCompteurs();
      });
      actions.appendChild(boutonSupprimer);
      panneau.appendChild(actions);
    }

    function rendrePanneauRepere(index) {
      const repere = salle.reperes[index];

      panneau.appendChild(el("h2", "", "Repère"));

      panneau.appendChild(champTexte("Nom du repère", repere.nom, function (valeur) {
        repere.nom = valeur;
        window.Admin.notifierChangement();
        rendrePlan();
      }));

      const ligne = el("div", "aplan-ligne-double");
      ligne.appendChild(champNombre("Largeur (%)", repere.largeur, function (valeur) {
        repere.largeur = valeur;
        window.Admin.notifierChangement();
        rendrePlan();
      }));
      ligne.appendChild(champNombre("Hauteur (%)", repere.hauteur, function (valeur) {
        repere.hauteur = valeur;
        window.Admin.notifierChangement();
        rendrePlan();
      }));
      panneau.appendChild(ligne);

      const actions = el("div", "aplan-panneau-actions");
      const boutonSupprimer = el("button", "a-bouton-danger", "Supprimer le repère");
      boutonSupprimer.type = "button";
      boutonSupprimer.addEventListener("click", function () {
        if (!confirm("Supprimer le repère « " + repere.nom + " » ?")) return;
        salle.reperes.splice(index, 1);
        selection = null;
        window.Admin.notifierChangement();
        rendrePlan();
        rendrePanneau();
      });
      actions.appendChild(boutonSupprimer);
      panneau.appendChild(actions);
    }

    // ------------------------------------------------------- Ajout de tables/repères

    boutonAjouterTable.addEventListener("click", function () {
      salle.tables.push({ nom: "Nouvelle table", forme: "ronde", x: 50, y: 60, invites: [] });
      window.Admin.notifierChangement();
      selectionner("table", salle.tables.length - 1);
      mettreAJourCompteurs();
    });

    boutonAjouterRepere.addEventListener("click", function () {
      salle.reperes.push({ nom: "Nouveau repère", x: 50, y: 60, largeur: 15, hauteur: 8 });
      window.Admin.notifierChangement();
      selectionner("repere", salle.reperes.length - 1);
    });

    // --------------------------------------------------- Import rapide d'invités
    //
    // UX : une zone de texte où l'on colle soit :
    //   - des lignes « Nom de table : invité 1, invité 2, … » (ajoutées à la
    //     table correspondante, quelle que soit la sélection courante) ;
    //   - des lignes contenant un seul nom d'invité (sans « : »), ajoutées à
    //     la table actuellement sélectionnée sur le plan.
    // Les deux formes peuvent être mélangées dans le même collage.

    carteImport.appendChild(el("h2", "", "Importer une liste d'invités"));
    carteImport.appendChild(el("p", "a-note",
      "Collez une ligne par table — « Nom de la table : invité 1, invité 2 » — pour remplir plusieurs tables " +
      "d'un coup. Ou collez un nom d'invité par ligne (sans « : ») pour les ajouter tous à la table " +
      "actuellement sélectionnée sur le plan."));
    const zoneTexteImport = document.createElement("textarea");
    zoneTexteImport.className = "aplan-import-texte";
    zoneTexteImport.rows = 6;
    zoneTexteImport.placeholder = "Table 1 : Alice Untel, Bob Untel\nTable 2 : Chloé Tremblay, David Roy";
    carteImport.appendChild(zoneTexteImport);
    const actionsImport = el("div", "aplan-import-actions");
    const boutonAppliquerImport = el("button", "a-bouton", "Appliquer l'import");
    boutonAppliquerImport.type = "button";
    const boutonAnnulerImport = el("button", "a-bouton-contour", "Annuler");
    boutonAnnulerImport.type = "button";
    actionsImport.appendChild(boutonAppliquerImport);
    actionsImport.appendChild(boutonAnnulerImport);
    carteImport.appendChild(actionsImport);

    boutonImporter.addEventListener("click", function () {
      carteImport.hidden = !carteImport.hidden;
      if (!carteImport.hidden) zoneTexteImport.focus();
    });

    boutonAnnulerImport.addEventListener("click", function () {
      zoneTexteImport.value = "";
      carteImport.hidden = true;
    });

    function appliquerImport(texte) {
      const lignes = texte.split("\n").map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });
      let total = 0;
      let ignorees = 0;
      const tablesInconnues = [];

      lignes.forEach(function (ligne) {
        const sep = ligne.indexOf(":");
        if (sep !== -1) {
          const nomTable = ligne.slice(0, sep).trim();
          const noms = ligne.slice(sep + 1).trim()
            .split(",")
            .map(function (s) { return s.trim(); })
            .filter(function (s) { return s.length > 0; });
          const table = salle.tables.find(function (t) {
            return t.nom.trim().toLowerCase() === nomTable.toLowerCase();
          });
          if (!table) {
            if (nomTable && tablesInconnues.indexOf(nomTable) === -1) tablesInconnues.push(nomTable);
            return;
          }
          table.invites = table.invites || [];
          noms.forEach(function (nom) {
            if (table.invites.indexOf(nom) === -1) { table.invites.push(nom); total++; }
          });
        } else {
          if (!selection || selection.type !== "table") { ignorees++; return; }
          const table = salle.tables[selection.index];
          table.invites = table.invites || [];
          if (table.invites.indexOf(ligne) === -1) { table.invites.push(ligne); total++; }
        }
      });

      return { total: total, ignorees: ignorees, tablesInconnues: tablesInconnues };
    }

    boutonAppliquerImport.addEventListener("click", function () {
      const resultat = appliquerImport(zoneTexteImport.value);
      if (resultat.total > 0) {
        window.Admin.notifierChangement();
        rendrePlan();
        rendrePanneau();
        mettreAJourCompteurs();
      }
      let message = resultat.total + " invité" + (resultat.total !== 1 ? "s" : "") + " importé" + (resultat.total !== 1 ? "s" : "") + ".";
      if (resultat.tablesInconnues.length) {
        message += "\nTable" + (resultat.tablesInconnues.length > 1 ? "s" : "") + " introuvable" +
          (resultat.tablesInconnues.length > 1 ? "s" : "") + " : " + resultat.tablesInconnues.join(", ") + ".";
      }
      if (resultat.ignorees > 0) {
        message += "\n" + resultat.ignorees + " ligne(s) sans « : » ignorée(s) (aucune table sélectionnée sur le plan).";
      }
      alert(message);
      if (resultat.total > 0) {
        zoneTexteImport.value = "";
        carteImport.hidden = true;
      }
    });

    // ---------------------------------------------------------------- Démarrage

    rendrePlan();
    rendrePanneau();
    mettreAJourCompteurs();
  }

  window.Admin.onglets.push({
    id: "plan",
    libelle: "Plan de salle",
    ordre: 30,
    rendu: rendu,
  });
})();
