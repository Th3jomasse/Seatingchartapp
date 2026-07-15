// ============================================================================
// Éditeur de plan de salle (outil de l'organisateur)
// Charge js/config.js, travaille sur une copie profonde, permet de glisser
// les tables/repères, de les modifier dans un panneau, puis d'exporter un
// nouveau js/config.js complet (toutes les sections préservées).
// ============================================================================

(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const LARGEUR = 100, HAUTEUR = 120; // même viewBox que l'application des invités

  // -------------------------------------------------------------------- État
  const config = clonerProfond(CONFIG);
  config.salle = config.salle || {};
  config.salle.tables = config.salle.tables || [];
  config.salle.reperes = config.salle.reperes || [];

  let selection = null; // { type: "table" | "repere", index } ou null
  let modifieDepuisExport = false;

  // ------------------------------------------------------------------ Repères DOM
  const svg = document.getElementById("plan-svg");
  const panneau = document.getElementById("panneau");
  const compteTables = document.getElementById("compte-tables");
  const compteInvites = document.getElementById("compte-invites");
  const zoneExport = document.getElementById("zone-export");
  const texteExport = document.getElementById("texte-export");
  const boutonCopier = document.getElementById("bouton-copier");

  // ----------------------------------------------------------------- Utilitaires

  function clonerProfond(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function el(balise, classe, texte) {
    const e = document.createElement(balise);
    if (classe) e.className = classe;
    if (texte !== undefined) e.textContent = texte;
    return e;
  }

  function marquerModifie() {
    modifieDepuisExport = true;
  }

  function x(p) { return (p / 100) * LARGEUR; }
  function y(p) { return (p / 100) * HAUTEUR; }

  function estSelectionne(type, index) {
    return selection && selection.type === type && selection.index === index;
  }

  // ------------------------------------------------------------ Rendu du plan SVG

  function rendrePlan() {
    svg.innerHTML = "";
    config.salle.reperes.forEach(function (repere, index) {
      svg.appendChild(creerGroupeRepere(repere, index));
    });
    config.salle.tables.forEach(function (table, index) {
      svg.appendChild(creerGroupeTable(table, index));
    });
  }

  function creerGroupeRepere(repere, index) {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "editeur-repere");

    const rect = document.createElementNS(NS, "rect");
    rect.setAttribute("rx", 1.5);
    rect.setAttribute("class", "editeur-repere-forme" + (estSelectionne("repere", index) ? " selectionne" : ""));
    g.appendChild(rect);

    const texte = document.createElementNS(NS, "text");
    texte.setAttribute("class", "editeur-repere-texte");
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

  function creerGroupeTable(table, index) {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "editeur-table");

    let forme;
    if (table.forme === "rect") {
      forme = document.createElementNS(NS, "rect");
      forme.setAttribute("width", 18);
      forme.setAttribute("height", 8);
      forme.setAttribute("rx", 1.5);
    } else {
      forme = document.createElementNS(NS, "circle");
      forme.setAttribute("r", 6);
    }
    forme.setAttribute("class", "editeur-table-forme" + (estSelectionne("table", index) ? " selectionne" : ""));
    g.appendChild(forme);

    const texte = document.createElementNS(NS, "text");
    texte.setAttribute("class", "editeur-table-texte");
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

  // -------------------------------------------------------------- Glisser-déposer

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

  // Attache le glisser-déposer (souris + tactile via pointer events) à un
  // groupe (table ou repère). Un simple clic (sans déplacement) sélectionne
  // l'élément plutôt que de le déplacer.
  function attacherGlisser(g, type, index, positionnerFn) {
    let enGlissement = false;
    let aBouge = false;
    let depart = null;
    let positionDepart = null;

    g.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      enGlissement = true;
      aBouge = false;
      depart = pointClientVersSvg(e.clientX, e.clientY);
      const obj = type === "table" ? config.salle.tables[index] : config.salle.reperes[index];
      positionDepart = { x: obj.x, y: obj.y };
      g.classList.add("glisse");
      try { g.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
    });

    g.addEventListener("pointermove", function (e) {
      if (!enGlissement) return;
      const point = pointClientVersSvg(e.clientX, e.clientY);
      const dxPct = ((point.x - depart.x) / LARGEUR) * 100;
      const dyPct = ((point.y - depart.y) / HAUTEUR) * 100;
      if (Math.abs(dxPct) > 0.05 || Math.abs(dyPct) > 0.05) aBouge = true;
      const obj = type === "table" ? config.salle.tables[index] : config.salle.reperes[index];
      let nx = positionDepart.x + dxPct;
      let ny = positionDepart.y + dyPct;
      nx = Math.max(0, Math.min(100, nx));
      ny = Math.max(0, Math.min(100, ny));
      obj.x = Math.round(nx * 10) / 10;
      obj.y = Math.round(ny * 10) / 10;
      positionnerFn(g, obj);
    });

    function terminerGlissement(e) {
      if (!enGlissement) return;
      enGlissement = false;
      g.classList.remove("glisse");
      try { g.releasePointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
      if (aBouge) {
        marquerModifie();
        // Rafraîchit tout le plan (met à jour l'ordre d'affichage et le surlignage).
        rendrePlan();
      } else {
        selectionner(type, index);
      }
    }

    g.addEventListener("pointerup", terminerGlissement);
    g.addEventListener("pointercancel", terminerGlissement);
  }

  // Clic sur une zone vide du plan : désélectionne.
  svg.addEventListener("click", function () {
    selectionner(null, null);
  });

  // ------------------------------------------------------------------- Sélection

  function selectionner(type, index) {
    selection = type === null ? null : { type: type, index: index };
    rendrePlan();
    rendrePanneau();
  }

  // ---------------------------------------------------------------- Compteurs

  function mettreAJourCompteurs() {
    compteTables.textContent = String(config.salle.tables.length);
    let total = 0;
    config.salle.tables.forEach(function (table) {
      total += (table.invites || []).length;
    });
    compteInvites.textContent = String(total);
  }

  // ------------------------------------------------------------------- Panneau

  function rendrePanneau() {
    panneau.innerHTML = "";
    if (!selection) {
      panneau.appendChild(el("p", "editeur-panneau-vide",
        "Sélectionnez une table ou un repère sur le plan pour le modifier ici."));
      return;
    }
    if (selection.type === "table") rendrePanneauTable(selection.index);
    else rendrePanneauRepere(selection.index);
  }

  function champTexte(label, valeur, surChangement) {
    const groupe = el("div", "champ-groupe");
    groupe.appendChild(el("label", "champ-label", label));
    const input = document.createElement("input");
    input.type = "text";
    input.className = "champ-input";
    input.value = valeur;
    input.addEventListener("input", function () { surChangement(input.value); });
    groupe.appendChild(input);
    return groupe;
  }

  function champNombre(label, valeur, surChangement) {
    const groupe = el("div", "champ-groupe");
    groupe.appendChild(el("label", "champ-label", label));
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "100";
    input.step = "0.5";
    input.className = "champ-input";
    input.value = valeur;
    input.addEventListener("input", function () {
      const n = parseFloat(input.value);
      surChangement(isNaN(n) ? 0 : n);
    });
    groupe.appendChild(input);
    return groupe;
  }

  function rendrePanneauTable(index) {
    const table = config.salle.tables[index];

    panneau.appendChild(el("h2", "editeur-panneau-titre", "Table"));

    panneau.appendChild(champTexte("Nom de la table", table.nom, function (valeur) {
      table.nom = valeur;
      marquerModifie();
      rendrePlan();
    }));

    const groupeForme = el("div", "champ-groupe");
    groupeForme.appendChild(el("label", "champ-label", "Forme"));
    const selectForme = document.createElement("select");
    selectForme.className = "champ-select";
    [["ronde", "Ronde"], ["rect", "Rectangulaire"]].forEach(function (paire) {
      const option = document.createElement("option");
      option.value = paire[0];
      option.textContent = paire[1];
      if (table.forme === paire[0]) option.selected = true;
      selectForme.appendChild(option);
    });
    selectForme.addEventListener("change", function () {
      table.forme = selectForme.value;
      marquerModifie();
      rendrePlan();
    });
    groupeForme.appendChild(selectForme);
    panneau.appendChild(groupeForme);

    const groupeInvites = el("div", "champ-groupe");
    groupeInvites.appendChild(el("label", "champ-label", "Invités (un nom par ligne)"));
    const zoneInvites = document.createElement("textarea");
    zoneInvites.className = "champ-textarea";
    zoneInvites.value = (table.invites || []).join("\n");
    zoneInvites.addEventListener("input", function () {
      table.invites = zoneInvites.value
        .split("\n")
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 0; });
      marquerModifie();
      mettreAJourCompteurs();
    });
    groupeInvites.appendChild(zoneInvites);
    panneau.appendChild(groupeInvites);

    const actions = el("div", "editeur-panneau-actions");
    const boutonSupprimer = el("button", "editeur-bouton editeur-bouton-danger", "Supprimer la table");
    boutonSupprimer.type = "button";
    boutonSupprimer.addEventListener("click", function () {
      if (!confirm("Supprimer la table « " + table.nom + " » et la liste de ses invités ?")) return;
      config.salle.tables.splice(index, 1);
      selection = null;
      marquerModifie();
      rendrePlan();
      rendrePanneau();
      mettreAJourCompteurs();
    });
    actions.appendChild(boutonSupprimer);
    panneau.appendChild(actions);
  }

  function rendrePanneauRepere(index) {
    const repere = config.salle.reperes[index];

    panneau.appendChild(el("h2", "editeur-panneau-titre", "Repère"));

    panneau.appendChild(champTexte("Nom du repère", repere.nom, function (valeur) {
      repere.nom = valeur;
      marquerModifie();
      rendrePlan();
    }));

    const ligne = el("div", "champ-ligne-double");
    ligne.appendChild(champNombre("Largeur (%)", repere.largeur, function (valeur) {
      repere.largeur = valeur;
      marquerModifie();
      rendrePlan();
    }));
    ligne.appendChild(champNombre("Hauteur (%)", repere.hauteur, function (valeur) {
      repere.hauteur = valeur;
      marquerModifie();
      rendrePlan();
    }));
    panneau.appendChild(ligne);

    const actions = el("div", "editeur-panneau-actions");
    const boutonSupprimer = el("button", "editeur-bouton editeur-bouton-danger", "Supprimer le repère");
    boutonSupprimer.type = "button";
    boutonSupprimer.addEventListener("click", function () {
      if (!confirm("Supprimer le repère « " + repere.nom + " » ?")) return;
      config.salle.reperes.splice(index, 1);
      selection = null;
      marquerModifie();
      rendrePlan();
      rendrePanneau();
    });
    actions.appendChild(boutonSupprimer);
    panneau.appendChild(actions);
  }

  // ------------------------------------------------------- Ajout de tables/repères

  document.getElementById("bouton-ajouter-table").addEventListener("click", function () {
    config.salle.tables.push({
      nom: "Nouvelle table",
      forme: "ronde",
      x: 50,
      y: 60,
      invites: [],
    });
    marquerModifie();
    selectionner("table", config.salle.tables.length - 1);
    mettreAJourCompteurs();
  });

  document.getElementById("bouton-ajouter-repere").addEventListener("click", function () {
    config.salle.reperes.push({
      nom: "Nouveau repère",
      x: 50,
      y: 60,
      largeur: 15,
      hauteur: 8,
    });
    marquerModifie();
    selectionner("repere", config.salle.reperes.length - 1);
  });

  // --------------------------------------------------------- Sérialisation JS

  // Convertit une valeur JS (chaîne, nombre, booléen, tableau, objet) en texte
  // JS lisible et joliment indenté (2 espaces), avec des clés sans guillemets
  // lorsque ce sont des identifiants valides — pour rester proche du style de
  // js/config.js d'origine.
  function versJS(valeur, niveau) {
    if (valeur === null || valeur === undefined) return "null";
    if (Array.isArray(valeur)) return versJSTableau(valeur, niveau);
    if (typeof valeur === "object") return versJSObjet(valeur, niveau);
    if (typeof valeur === "string") return JSON.stringify(valeur);
    return String(valeur);
  }

  function estValeurSimple(v) {
    return v === null || v === undefined || typeof v === "string" ||
      typeof v === "number" || typeof v === "boolean";
  }

  function versJSTableau(tableau, niveau) {
    if (tableau.length === 0) return "[]";
    const pad = "  ".repeat(niveau);
    const padEnfant = "  ".repeat(niveau + 1);
    const tousSimples = tableau.every(estValeurSimple);
    if (tousSimples) {
      const items = tableau.map(function (v) { return versJS(v, niveau + 1); });
      const ligneUnique = "[" + items.join(", ") + "]";
      if (ligneUnique.length <= 118) return ligneUnique;
      return "[\n" + items.map(function (it) { return padEnfant + it; }).join(",\n") + "\n" + pad + "]";
    }
    const items = tableau.map(function (v) { return padEnfant + versJS(v, niveau + 1); });
    return "[\n" + items.join(",\n") + ",\n" + pad + "]";
  }

  function formaterCle(cle) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(cle) ? cle : JSON.stringify(cle);
  }

  function versJSObjet(objet, niveau) {
    const cles = Object.keys(objet);
    if (cles.length === 0) return "{}";
    const pad = "  ".repeat(niveau);
    const padEnfant = "  ".repeat(niveau + 1);
    const tousSimples = cles.every(function (c) { return estValeurSimple(objet[c]); });
    if (tousSimples) {
      const items = cles.map(function (c) { return formaterCle(c) + ": " + versJS(objet[c], niveau + 1); });
      const ligneUnique = "{ " + items.join(", ") + " }";
      if (ligneUnique.length <= 118) return ligneUnique;
    }
    const lignes = cles.map(function (c) {
      return padEnfant + formaterCle(c) + ": " + versJS(objet[c], niveau + 1);
    });
    return "{\n" + lignes.join(",\n") + ",\n" + pad + "}";
  }

  // Génère le contenu complet du fichier js/config.js, avec toutes les
  // sections de CONFIG (event, pages, infos, salle, menu, photos, aPropos,
  // horaire, etc.) — rien n'est perdu, seule la section « salle » peut avoir
  // été modifiée par l'éditeur.
  function genererTexteConfig() {
    const entete =
      "// ============================================================================\n" +
      "// CONFIGURATION DE L'ÉVÉNEMENT\n" +
      "// Ce fichier remplace js/config.js. Il a été généré automatiquement par\n" +
      "// l'éditeur de plan de salle (editeur.html) — copiez-le (ou utilisez le\n" +
      "// fichier téléchargé) pour mettre à jour js/config.js.\n" +
      "// Généré le " + new Date().toLocaleString("fr-CA") + "\n" +
      "// ============================================================================\n\n";
    return entete + "const CONFIG = " + versJS(config, 0) + ";\n";
  }

  // ------------------------------------------------------------------- Export

  function telechargerFichier(texte) {
    const blob = new Blob([texte], { type: "text/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = "config.js";
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function copierTexteSecours(texte) {
    texteExport.value = texte;
    texteExport.select();
    try { document.execCommand("copy"); } catch (err) { /* ignoré */ }
  }

  function afficherConfirmationCopie() {
    const texteOriginal = boutonCopier.textContent;
    boutonCopier.textContent = "Copié !";
    setTimeout(function () { boutonCopier.textContent = texteOriginal; }, 1500);
  }

  document.getElementById("bouton-exporter").addEventListener("click", function () {
    const texte = genererTexteConfig();
    texteExport.value = texte;
    zoneExport.hidden = false;
    telechargerFichier(texte);
    modifieDepuisExport = false;
  });

  document.getElementById("bouton-copier").addEventListener("click", function () {
    const texte = genererTexteConfig();
    texteExport.value = texte;
    zoneExport.hidden = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texte).then(afficherConfirmationCopie, function () {
        copierTexteSecours(texte);
        afficherConfirmationCopie();
      });
    } else {
      copierTexteSecours(texte);
      afficherConfirmationCopie();
    }
    modifieDepuisExport = false;
  });

  document.getElementById("bouton-fermer-export").addEventListener("click", function () {
    zoneExport.hidden = true;
  });

  // -------------------------------------------------------- Garde-fou de sortie

  window.addEventListener("beforeunload", function (e) {
    if (!modifieDepuisExport) return;
    e.preventDefault();
    e.returnValue = "";
  });

  // ---------------------------------------------------------------- Démarrage

  rendrePlan();
  rendrePanneau();
  mettreAJourCompteurs();

  // Exposé pour les tests automatisés (et pour un usage avancé éventuel).
  window.EditeurPlan = {
    obtenirConfig: function () { return clonerProfond(config); },
    genererTexteConfig: genererTexteConfig,
  };
})();
