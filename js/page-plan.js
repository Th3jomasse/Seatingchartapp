// ============================================================================
// Page : Trouver ma place + plan de salle
// ============================================================================

(function () {
  "use strict";
  const el = AppUtils.el;
  const normaliser = AppUtils.normaliser;
  const tousLesInvites = AppUtils.tousLesInvites;

  // Limite une valeur entre un minimum et un maximum
  function clamp(valeur, min, max) {
    return Math.min(Math.max(valeur, min), max);
  }

  // Distance de Levenshtein (nombre minimal d'ajouts/suppressions/substitutions
  // pour transformer une chaîne en une autre) — sert à la recherche tolérante.
  function distanceLevenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const rangee = new Array(n + 1);
    for (let j = 0; j <= n; j++) rangee[j] = j;
    for (let i = 1; i <= m; i++) {
      let precedent = rangee[0];
      rangee[0] = i;
      for (let j = 1; j <= n; j++) {
        const temp = rangee[j];
        const cout = a[i - 1] === b[j - 1] ? 0 : 1;
        rangee[j] = Math.min(
          rangee[j] + 1,        // suppression
          rangee[j - 1] + 1,    // insertion
          precedent + cout      // substitution
        );
        precedent = temp;
      }
    }
    return rangee[n];
  }

  // Cherche des suggestions « vouliez-vous dire » par distance de Levenshtein
  // (≤ 2) sur les mots du nom, triées par pertinence.
  function trouverSuggestions(requete) {
    const candidats = [];
    tousLesInvites.forEach(function (invite) {
      const nomNorm = normaliser(invite.nom);
      const mots = nomNorm.split(/\s+/);
      let meilleure = distanceLevenshtein(requete, nomNorm);
      mots.forEach(function (mot) {
        const d = distanceLevenshtein(requete, mot);
        if (d < meilleure) meilleure = d;
      });
      if (meilleure <= 2) candidats.push({ invite: invite, distance: meilleure });
    });
    candidats.sort(function (a, b) {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.invite.nom.localeCompare(b.invite.nom, "fr");
    });
    return candidats.slice(0, 6).map(function (c) { return c.invite; });
  }

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
      montrerTable(indexTable, null, false);
    });
    section.appendChild(plan.element);
    racine.appendChild(section);

    // Affiche les détails d'une table (et surligne/centre sur le plan)
    function montrerTable(indexTable, nomInvite, zoomerDoucement) {
      const table = CONFIG.salle.tables[indexTable];
      plan.surligner(indexTable);
      plan.centrerSur(indexTable, !!zoomerDoucement);
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

    // Recherche en direct (inclusion exacte, puis suggestions tolérantes)
    champ.addEventListener("input", function () {
      const requete = normaliser(champ.value);
      resultats.innerHTML = "";
      if (requete.length < 2) return;

      let correspondances = tousLesInvites.filter(function (i) {
        return normaliser(i.nom).indexOf(requete) !== -1;
      }).slice(0, 8);

      let suggestion = false;
      if (correspondances.length === 0 && requete.length >= 3) {
        correspondances = trouverSuggestions(requete);
        suggestion = correspondances.length > 0;
      }

      if (correspondances.length === 0) {
        resultats.appendChild(el("div", "recherche-vide",
          "Aucun invité trouvé. Vérifiez l'orthographe ou demandez aux hôtes."));
        return;
      }

      if (suggestion) {
        resultats.appendChild(el("div", "recherche-suggestion-entete", "Vouliez-vous dire :"));
      }

      correspondances.forEach(function (invite) {
        const item = el("button", suggestion ? "recherche-item recherche-item-suggestion" : "recherche-item");
        item.appendChild(el("span", "recherche-nom", invite.nom));
        item.appendChild(el("span", "recherche-table", invite.table.nom));
        item.addEventListener("click", function () {
          champ.value = invite.nom;
          resultats.innerHTML = "";
          montrerTable(invite.indexTable, invite.nom, false);
        });
        resultats.appendChild(item);
      });
    });

    // Lien profond : ?invite=Nom dans l'URL présélectionne un invité
    const parametres = new URLSearchParams(location.search);
    const inviteParam = parametres.get("invite");
    if (inviteParam) {
      const norm = normaliser(inviteParam);
      const trouve = tousLesInvites.find(function (i) { return normaliser(i.nom) === norm; });
      if (trouve) {
        champ.value = trouve.nom;
        montrerTable(trouve.indexTable, trouve.nom, true);
      }
    }
  }

  // Construit le plan de salle en SVG à partir de la configuration, avec
  // chaises décoratives, zoom/déplacement et surlignage.
  // Retourne { element, surligner(indexTable), centrerSur(indexTable, zoomerDoucement) }.
  function construirePlan(surClicTable) {
    const NS = "http://www.w3.org/2000/svg";
    const largeur = 100, hauteur = 120; // unités du plan (viewBox de base)
    const ratioAspect = hauteur / largeur;
    const zoomMax = 5;
    const largeurMin = largeur / zoomMax;

    function x(p) { return (p / 100) * largeur; }
    function y(p) { return (p / 100) * hauteur; }

    // ---------------------------------------------------------- Structure DOM
    const enveloppe = el("div", "plan-enveloppe");
    const conteneur = el("div", "plan-conteneur");
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + largeur + " " + hauteur);
    svg.setAttribute("class", "plan-svg");
    conteneur.appendChild(svg);

    const controles = el("div", "plan-controles");
    const boutonPlus = el("button", "plan-bouton", "+");
    boutonPlus.type = "button";
    boutonPlus.setAttribute("aria-label", "Zoomer avant");
    const boutonMoins = el("button", "plan-bouton", "−");
    boutonMoins.type = "button";
    boutonMoins.setAttribute("aria-label", "Zoomer arrière");
    const boutonReset = el("button", "plan-bouton plan-bouton-reset", "⟲");
    boutonReset.type = "button";
    boutonReset.setAttribute("aria-label", "Réinitialiser la vue");
    controles.appendChild(boutonPlus);
    controles.appendChild(boutonMoins);
    controles.appendChild(boutonReset);
    conteneur.appendChild(controles);

    enveloppe.appendChild(conteneur);

    // Légende discrète
    const legende = el("div", "plan-legende");
    const itemHonneur = el("span", "plan-legende-item");
    itemHonneur.appendChild(el("span", "plan-legende-puce plan-legende-puce-honneur", "★"));
    itemHonneur.appendChild(el("span", "", "Table d'honneur"));
    const itemTable = el("span", "plan-legende-item");
    itemTable.appendChild(el("span", "plan-legende-puce plan-legende-puce-table"));
    itemTable.appendChild(el("span", "", "Table"));
    const itemRepere = el("span", "plan-legende-item");
    itemRepere.appendChild(el("span", "plan-legende-puce plan-legende-puce-repere"));
    itemRepere.appendChild(el("span", "", "Repère (scène, bar…)"));
    legende.appendChild(itemHonneur);
    legende.appendChild(itemTable);
    legende.appendChild(itemRepere);
    enveloppe.appendChild(legende);

    // ------------------------------------------------------------- Repères
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

    // -------------------------------------------------------------- Chaises
    // Petits cercles décoratifs autour de chaque table (une chaise par invité).
    function dessinerChaisesRonde(g, cx, cy, rayonTable, nombre) {
      if (nombre <= 0) return;
      const rayonChaises = rayonTable + 2.3;
      for (let i = 0; i < nombre; i++) {
        const angle = (Math.PI * 2 * i) / nombre - Math.PI / 2;
        const chaise = document.createElementNS(NS, "circle");
        chaise.setAttribute("cx", cx + rayonChaises * Math.cos(angle));
        chaise.setAttribute("cy", cy + rayonChaises * Math.sin(angle));
        chaise.setAttribute("r", 1);
        chaise.setAttribute("class", "plan-chaise");
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
          chaise.setAttribute("class", "plan-chaise");
          g.appendChild(chaise);
        }
      }
      placerRangee(nHaut, rectY - decalage);
      placerRangee(nBas, rectY + hauteurRect + decalage);
    }

    // ----------------------------------------------------------------- Tables
    const formes = [];
    CONFIG.salle.tables.forEach(function (table, index) {
      const nombreInvites = table.invites.length;
      const cx = x(table.x), cy = y(table.y);

      const gChaises = document.createElementNS(NS, "g");
      gChaises.setAttribute("class", "plan-chaises");
      svg.appendChild(gChaises);

      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "plan-table");
      let forme;
      if (table.forme === "rect") {
        const rectX = cx - 9, rectY = cy - 4;
        forme = document.createElementNS(NS, "rect");
        forme.setAttribute("x", rectX);
        forme.setAttribute("y", rectY);
        forme.setAttribute("width", 18);
        forme.setAttribute("height", 8);
        forme.setAttribute("rx", 1.5);
        dessinerChaisesRect(gChaises, rectX, rectY, 18, 8, nombreInvites);
      } else {
        forme = document.createElementNS(NS, "circle");
        forme.setAttribute("cx", cx);
        forme.setAttribute("cy", cy);
        forme.setAttribute("r", 6);
        dessinerChaisesRonde(gChaises, cx, cy, 6, nombreInvites);
      }
      forme.setAttribute("class", "plan-table-forme");
      g.appendChild(forme);
      formes.push(forme);

      // Numéro court au centre de la table
      const num = document.createElementNS(NS, "text");
      num.setAttribute("x", cx);
      num.setAttribute("y", cy);
      num.setAttribute("class", "plan-table-numero");
      const nombre = table.nom.match(/\d+/);
      num.textContent = nombre ? nombre[0] : (index === 0 ? "★" : String(index + 1));
      g.appendChild(num);

      g.addEventListener("click", function () { surClicTable(index); });
      svg.appendChild(g);
    });

    // ------------------------------------------------------- Zoom / déplacement
    // On manipule directement le viewBox du SVG (compatible sans dépendance).
    const vb = { x: 0, y: 0, w: largeur, h: hauteur };

    function definirViewBox() {
      svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.w + " " + vb.h);
    }

    function ajusterVb(cible) {
      cible.w = clamp(cible.w, largeurMin, largeur);
      cible.h = cible.w * ratioAspect;
      if (cible.x < 0) cible.x = 0;
      if (cible.y < 0) cible.y = 0;
      if (cible.x + cible.w > largeur) cible.x = largeur - cible.w;
      if (cible.y + cible.h > hauteur) cible.y = hauteur - cible.h;
      return cible;
    }

    function estZoome() {
      return vb.w < largeur - 0.5;
    }

    // Convertit des coordonnées écran (client) en coordonnées du plan (unités
    // du viewBox de référence), en se basant sur la taille affichée du SVG.
    function clientVersPlan(clientX, clientY, refVb) {
      const rect = svg.getBoundingClientRect();
      const px = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      const py = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;
      return { x: refVb.x + px * refVb.w, y: refVb.y + py * refVb.h };
    }

    function calculerZoom(facteur, cx, cy, refVb) {
      const nouvelleLargeur = clamp(refVb.w / facteur, largeurMin, largeur);
      const ratio = nouvelleLargeur / refVb.w;
      return ajusterVb({
        x: cx - (cx - refVb.x) * ratio,
        y: cy - (cy - refVb.y) * ratio,
        w: nouvelleLargeur,
        h: nouvelleLargeur * ratioAspect,
      });
    }

    let animationEnCours = null;
    function animerVers(cible, duree) {
      duree = duree || 320;
      if (animationEnCours) cancelAnimationFrame(animationEnCours);
      const depart = { x: vb.x, y: vb.y, w: vb.w, h: vb.h };
      const t0 = performance.now();
      function etape(t) {
        const progres = clamp((t - t0) / duree, 0, 1);
        const e = 1 - Math.pow(1 - progres, 3); // ease-out cubique
        vb.x = depart.x + (cible.x - depart.x) * e;
        vb.y = depart.y + (cible.y - depart.y) * e;
        vb.w = depart.w + (cible.w - depart.w) * e;
        vb.h = depart.h + (cible.h - depart.h) * e;
        definirViewBox();
        if (progres < 1) {
          animationEnCours = requestAnimationFrame(etape);
        } else {
          animationEnCours = null;
        }
      }
      animationEnCours = requestAnimationFrame(etape);
    }

    function appliquerImmediat(cible) {
      if (animationEnCours) { cancelAnimationFrame(animationEnCours); animationEnCours = null; }
      vb.x = cible.x; vb.y = cible.y; vb.w = cible.w; vb.h = cible.h;
      definirViewBox();
    }

    // Boutons + / − / réinitialiser
    boutonPlus.addEventListener("click", function () {
      animerVers(calculerZoom(1.4, vb.x + vb.w / 2, vb.y + vb.h / 2, vb), 220);
    });
    boutonMoins.addEventListener("click", function () {
      animerVers(calculerZoom(1 / 1.4, vb.x + vb.w / 2, vb.y + vb.h / 2, vb), 220);
    });
    boutonReset.addEventListener("click", function () {
      animerVers({ x: 0, y: 0, w: largeur, h: hauteur }, 320);
    });

    // Molette : zoom centré sur le curseur
    conteneur.addEventListener("wheel", function (e) {
      e.preventDefault();
      const p = clientVersPlan(e.clientX, e.clientY, vb);
      const facteur = e.deltaY < 0 ? 1.18 : 1 / 1.18;
      appliquerImmediat(calculerZoom(facteur, p.x, p.y, vb));
    }, { passive: false });

    // Glisser (souris/tactile) + pincement à deux doigts
    const SEUIL_CLIC = 6; // px — au-delà, on considère que c'est un glissement
    const pointeurs = new Map();
    let panDepart = null;       // { x, y, clientX, clientY }
    let pinceDepart = null;     // { vb: {...}, distance }
    let distanceParcourue = 0;
    let gesteEstDeplacement = false;

    function distanceEntre(p1, p2) { return Math.hypot(p2.x - p1.x, p2.y - p1.y); }
    function milieuEntre(p1, p2) { return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }; }

    // Remarque : on ne capture le pointeur (setPointerCapture) qu'une fois le
    // geste confirmé comme un glissement. Capturer trop tôt reciblerait aussi
    // l'événement « click » vers le conteneur, empêchant un simple tapotement
    // d'ouvrir les détails d'une table.
    conteneur.addEventListener("pointerdown", function (e) {
      if (e.target.closest && e.target.closest(".plan-controles")) return;
      pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      distanceParcourue = 0;
      gesteEstDeplacement = false;

      if (pointeurs.size === 1) {
        panDepart = { x: vb.x, y: vb.y, clientX: e.clientX, clientY: e.clientY };
        pinceDepart = null;
      } else if (pointeurs.size === 2) {
        panDepart = null;
        const pts = Array.from(pointeurs.values());
        pinceDepart = {
          vb: { x: vb.x, y: vb.y, w: vb.w, h: vb.h },
          distance: distanceEntre(pts[0], pts[1]),
        };
        gesteEstDeplacement = true;
        conteneur.classList.add("plan-conteneur--glisse");
        // Un pincement à deux doigts est toujours un geste : capture immédiate.
        pointeurs.forEach(function (_v, id) {
          try { conteneur.setPointerCapture(id); } catch (err) { /* ignore */ }
        });
      }
    });

    conteneur.addEventListener("pointermove", function (e) {
      if (!pointeurs.has(e.pointerId)) return;
      pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointeurs.size === 1 && panDepart) {
        const dx = e.clientX - panDepart.clientX;
        const dy = e.clientY - panDepart.clientY;
        distanceParcourue = Math.hypot(dx, dy);
        if (distanceParcourue > SEUIL_CLIC && !gesteEstDeplacement) {
          gesteEstDeplacement = true;
          conteneur.classList.add("plan-conteneur--glisse");
          // On capture seulement maintenant : le geste est confirmé comme un
          // glissement, un simple tapotement pourra donc encore déclencher
          // un clic natif normal sur la table.
          try { conteneur.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        }
        const rect = svg.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const cible = {
            x: panDepart.x - (dx * vb.w) / rect.width,
            y: panDepart.y - (dy * vb.h) / rect.height,
            w: vb.w,
            h: vb.h,
          };
          appliquerImmediat(ajusterVb(cible));
        }
      } else if (pointeurs.size === 2 && pinceDepart) {
        e.preventDefault();
        const pts = Array.from(pointeurs.values());
        const distanceNow = distanceEntre(pts[0], pts[1]);
        if (distanceNow <= 0 || pinceDepart.distance <= 0) return;
        const milieu = milieuEntre(pts[0], pts[1]);
        const rect = svg.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const facteur = distanceNow / pinceDepart.distance;
        const milieuPlan = clientVersPlan(milieu.x, milieu.y, pinceDepart.vb);
        const nouvelleLargeur = clamp(pinceDepart.vb.w / facteur, largeurMin, largeur);
        const nouvelleHauteur = nouvelleLargeur * ratioAspect;
        const px = (milieu.x - rect.left) / rect.width;
        const py = (milieu.y - rect.top) / rect.height;
        const cible = {
          x: milieuPlan.x - px * nouvelleLargeur,
          y: milieuPlan.y - py * nouvelleHauteur,
          w: nouvelleLargeur,
          h: nouvelleHauteur,
        };
        appliquerImmediat(ajusterVb(cible));
      }
    }, { passive: false });

    function relacherPointeur(e) {
      pointeurs.delete(e.pointerId);
      conteneur.classList.remove("plan-conteneur--glisse");
      if (pointeurs.size === 1) {
        // Il reste un doigt : on relance un glissement simple à partir de maintenant.
        const restant = Array.from(pointeurs.entries())[0];
        panDepart = { x: vb.x, y: vb.y, clientX: restant[1].x, clientY: restant[1].y };
        pinceDepart = null;
      } else if (pointeurs.size === 0) {
        panDepart = null;
        pinceDepart = null;
      }
    }
    conteneur.addEventListener("pointerup", relacherPointeur);
    conteneur.addEventListener("pointercancel", relacherPointeur);

    // Empêche le clic « fantôme » sur une table quand le geste était un
    // glissement plutôt qu'un tapotement franc (seuil ~6px).
    svg.addEventListener("click", function (e) {
      if (gesteEstDeplacement) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);

    return {
      element: enveloppe,
      surligner: function (indexTable) {
        formes.forEach(function (f, i) {
          f.classList.toggle("surligne", i === indexTable);
        });
      },
      // Centre la vue sur une table. Si zoomerDoucement est vrai, zoome
      // légèrement même si la vue était à son niveau par défaut (lien profond,
      // sélection depuis la recherche). Sinon, ne recentre que si un zoom est
      // déjà actif, pour ne pas déplacer la vue sans que l'utilisateur zoome.
      centrerSur: function (indexTable, zoomerDoucement) {
        const table = CONFIG.salle.tables[indexTable];
        const cx = x(table.x), cy = y(table.y);
        let cible;
        if (zoomerDoucement) {
          const w = clamp(largeur / 2.4, largeurMin, largeur);
          cible = ajusterVb({ x: cx - w / 2, y: cy - (w * ratioAspect) / 2, w: w, h: w * ratioAspect });
        } else if (estZoome()) {
          cible = ajusterVb({ x: cx - vb.w / 2, y: cy - vb.h / 2, w: vb.w, h: vb.h });
        } else {
          return;
        }
        animerVers(cible, 380);
      },
    };
  }

  window.PAGES_MODULES.push({
    id: "plan",
    ordre: 20,
    libelle: "Ma place",
    icone: "place",
    active: CONFIG.pages.plan,
    rendu: rendrePlan,
  });
})();
