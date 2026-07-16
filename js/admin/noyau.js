// ============================================================================
// Noyau du tableau de bord (admin.html)
//
// Fournit le CONTRAT utilisé par les onglets (js/admin/onglet-*.js) :
//
//   window.Admin = {
//     onglets,                — registre : push({id, libelle, ordre, rendu})
//     brouillon(),            — config (référence modifiable) de l'événement courant
//     notifierChangement(),   — à appeler après TOUTE modification du brouillon
//     slugCourant(),          — slug de l'événement sélectionné
//     index(),                — {parDefaut, evenements:[{slug, titre, date, modifie}]}
//     configDe(slug),         — config (référence) d'un événement quelconque
//     marquerPublie(slug),    — enlève l'indicateur « non publié » d'un événement
//     reglages(),             — réglages persistants {urlBase, github:{...}} (référence)
//     sauverReglages(),       — persiste les réglages après modification
//     urlBase(),              — URL publique du site, toujours terminée par « / »
//   }
//
// Les onglets s'enregistrent au chargement de leur script; le noyau construit
// la barre d'onglets une fois le DOM prêt et rappelle rendu(conteneur) à
// chaque activation d'onglet ou changement d'événement sélectionné.
// ============================================================================

(function () {
  "use strict";

  const CLE_INDEX = "tvp.index";
  const CLE_EVENEMENT = "tvp.evenement.";
  const CLE_REGLAGES = "tvp.reglages";

  // --------------------------------------------------------------------------
  // État
  // --------------------------------------------------------------------------
  let indexEvenements = null;   // {parDefaut, evenements:[{slug,titre,date,modifie}]}
  let slugSelectionne = null;
  const brouillons = {};        // slug -> config (chargée paresseusement)
  let reglages = null;
  let ongletActif = null;
  let minuteurApercu = null;
  let apercuPret = false;

  // --------------------------------------------------------------------------
  // Utilitaires
  // --------------------------------------------------------------------------
  function lireJSON(cle) {
    try { return JSON.parse(localStorage.getItem(cle)); } catch (e) { return null; }
  }
  function ecrireJSON(cle, valeur) {
    localStorage.setItem(cle, JSON.stringify(valeur));
  }
  function copieProfonde(objet) {
    return JSON.parse(JSON.stringify(objet));
  }
  function slugifier(texte) {
    return texte
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "evenement";
  }
  function telecharger(nomFichier, contenu) {
    const blob = new Blob([contenu], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomFichier;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }

  // Gabarit d'un nouvel événement vide
  function gabaritEvenement(titre, type) {
    return {
      event: {
        type: type || "mariage",
        titre: titre,
        sousTitre: "",
        date: "",
        lieu: "",
        dateISO: "",
        messageBienvenue: "",
      },
      theme: {
        mode: "clair",
        logo: "",
        couleurs: { accent: "", accentFonce: "", surlignage: "", sauge: "", fond: "", carte: "", encre: "" },
        polices: { titre: "", texte: "" },
      },
      pages: { plan: true, menu: true, photos: true, infos: true, aPropos: true, horaire: true },
      infos: {
        adresse: "", googleMapsLien: "", stationnement: "", hebergement: "",
        codeVestimentaire: "", contact: { nom: "", telephone: "", courriel: "" }, rsvpLien: "",
      },
      salle: {
        reperes: [{ nom: "Entrée", x: 50, y: 96, largeur: 20, hauteur: 6 }],
        tables: [
          { nom: "Table 1", forme: "ronde", x: 35, y: 40, invites: [] },
          { nom: "Table 2", forme: "ronde", x: 65, y: 40, invites: [] },
        ],
      },
      menu: { note: "", sections: [] },
      photos: {
        titre: "Partagez vos photos!",
        description: "Toutes vos photos de la soirée au même endroit.",
        lien: "", texteBouton: "Ouvrir l'album photo", motClic: "",
      },
      aPropos: { titre: type === "entreprise" ? "À propos" : "Notre histoire", paragraphes: [] },
      horaire: [],
    };
  }

  // --------------------------------------------------------------------------
  // Amorçage des données (localStorage, sinon fichiers du site)
  // --------------------------------------------------------------------------
  async function amorcer() {
    reglages = lireJSON(CLE_REGLAGES) || {
      urlBase: location.origin + location.pathname.replace(/admin\.html.*$/, ""),
      github: { owner: "Th3jomasse", repo: "Seatingchartapp", branche: "claude/wedding-guest-app-1ktb5u", jeton: "", memoriser: false },
    };

    indexEvenements = lireJSON(CLE_INDEX);
    if (!indexEvenements) {
      // Premier lancement : on importe les événements déjà publiés sur le site
      try {
        const idx = await fetch("evenements/index.json").then(function (r) {
          if (!r.ok) throw new Error(); return r.json();
        });
        indexEvenements = { parDefaut: idx.parDefaut, evenements: [] };
        for (const entree of idx.evenements || []) {
          try {
            const config = await fetch("evenements/" + entree.slug + ".json").then(function (r) {
              if (!r.ok) throw new Error(); return r.json();
            });
            ecrireJSON(CLE_EVENEMENT + entree.slug, config);
            indexEvenements.evenements.push({ slug: entree.slug, titre: entree.titre, date: entree.date, modifie: false });
          } catch (e) { /* événement illisible : ignoré */ }
        }
      } catch (e) {
        indexEvenements = { parDefaut: "", evenements: [] };
      }
      if (!indexEvenements.evenements.length) {
        const config = gabaritEvenement("Mon premier événement", "mariage");
        ecrireJSON(CLE_EVENEMENT + "mon-premier-evenement", config);
        indexEvenements = {
          parDefaut: "mon-premier-evenement",
          evenements: [{ slug: "mon-premier-evenement", titre: config.event.titre, date: "", modifie: true }],
        };
      }
      ecrireJSON(CLE_INDEX, indexEvenements);
    }

    slugSelectionne = indexEvenements.parDefaut || indexEvenements.evenements[0].slug;
  }

  function configDe(slug) {
    if (!brouillons[slug]) {
      brouillons[slug] = lireJSON(CLE_EVENEMENT + slug) || gabaritEvenement(slug, "mariage");
    }
    return brouillons[slug];
  }

  // --------------------------------------------------------------------------
  // Rendu : barre latérale, onglets, aperçu
  // --------------------------------------------------------------------------
  function rendreListeEvenements() {
    const liste = document.getElementById("liste-evenements");
    liste.innerHTML = "";
    indexEvenements.evenements.forEach(function (entree) {
      const item = document.createElement("li");
      item.className = "evenement-item" + (entree.slug === slugSelectionne ? " actif" : "");

      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.className = "evenement-bouton";
      const nom = document.createElement("span");
      nom.className = "evenement-nom";
      nom.textContent = entree.titre || entree.slug;
      const detail = document.createElement("span");
      detail.className = "evenement-date";
      detail.textContent = (entree.date || "") + (entree.modifie ? " · non publié" : "");
      bouton.appendChild(nom);
      bouton.appendChild(detail);
      bouton.addEventListener("click", function () { selectionner(entree.slug); });
      item.appendChild(bouton);

      const actions = document.createElement("span");
      actions.className = "evenement-actions";
      const dupliquer = document.createElement("button");
      dupliquer.type = "button";
      dupliquer.title = "Dupliquer (réutiliser comme modèle)";
      dupliquer.textContent = "⧉";
      dupliquer.addEventListener("click", function (e) { e.stopPropagation(); dupliquerEvenement(entree.slug); });
      const supprimer = document.createElement("button");
      supprimer.type = "button";
      supprimer.title = "Supprimer";
      supprimer.textContent = "✕";
      supprimer.addEventListener("click", function (e) { e.stopPropagation(); supprimerEvenement(entree.slug); });
      actions.appendChild(dupliquer);
      actions.appendChild(supprimer);
      item.appendChild(actions);

      liste.appendChild(item);
    });
  }

  function rendreEntete() {
    const entree = indexEvenements.evenements.find(function (e) { return e.slug === slugSelectionne; });
    document.getElementById("titre-evenement-courant").textContent = entree ? (entree.titre || entree.slug) : "";
    const statut = document.getElementById("statut-brouillon");
    statut.textContent = entree && entree.modifie ? "Modifications non publiées" : "Publié";
    statut.classList.toggle("non-publie", !!(entree && entree.modifie));
  }

  function rendreBarreOnglets() {
    const barre = document.getElementById("barre-onglets");
    barre.innerHTML = "";
    window.Admin.onglets
      .slice()
      .sort(function (a, b) { return a.ordre - b.ordre; })
      .forEach(function (onglet) {
        const bouton = document.createElement("button");
        bouton.type = "button";
        bouton.className = "onglet-bouton" + (ongletActif === onglet.id ? " actif" : "");
        bouton.textContent = onglet.libelle;
        bouton.addEventListener("click", function () { activerOnglet(onglet.id); });
        barre.appendChild(bouton);
      });
  }

  function activerOnglet(id) {
    ongletActif = id;
    rendreBarreOnglets();
    const conteneur = document.getElementById("conteneur-onglet");
    conteneur.innerHTML = "";
    const onglet = window.Admin.onglets.find(function (o) { return o.id === id; });
    if (onglet) onglet.rendu(conteneur);
  }

  function selectionner(slug) {
    slugSelectionne = slug;
    rendreListeEvenements();
    rendreEntete();
    if (ongletActif) activerOnglet(ongletActif);
    rafraichirApercu(true);
  }

  // --------------------------------------------------------------------------
  // Aperçu en direct (iframe index.html?apercu=1)
  // --------------------------------------------------------------------------
  const cadreApercu = document.getElementById("cadre-apercu");

  window.addEventListener("message", function (evenement) {
    if (evenement.data && evenement.data.type === "pret") {
      apercuPret = true;
      envoyerConfigApercu();
    }
  });

  function envoyerConfigApercu() {
    if (cadreApercu && cadreApercu.contentWindow) {
      cadreApercu.contentWindow.postMessage(
        { type: "config", config: copieProfonde(configDe(slugSelectionne)) }, "*"
      );
    }
  }

  function rafraichirApercu(immediat) {
    clearTimeout(minuteurApercu);
    minuteurApercu = setTimeout(function () {
      apercuPret = false;
      try { cadreApercu.contentWindow.location.reload(); }
      catch (e) { cadreApercu.src = "index.html?apercu=1"; }
    }, immediat ? 0 : 450);
  }

  // --------------------------------------------------------------------------
  // Actions : créer, dupliquer, supprimer, importer, exporter
  // --------------------------------------------------------------------------
  function slugLibre(base) {
    let slug = base, n = 2;
    while (indexEvenements.evenements.some(function (e) { return e.slug === slug; })) {
      slug = base + "-" + n++;
    }
    return slug;
  }

  function creerEvenement() {
    const titre = prompt("Nom du nouvel événement :", "");
    if (!titre) return;
    const type = confirm("Est-ce un mariage?\n\nOK = mariage · Annuler = entreprise / autre") ? "mariage" : "entreprise";
    const slug = slugLibre(slugifier(titre));
    brouillons[slug] = gabaritEvenement(titre, type);
    ecrireJSON(CLE_EVENEMENT + slug, brouillons[slug]);
    indexEvenements.evenements.push({ slug: slug, titre: titre, date: "", modifie: true });
    if (!indexEvenements.parDefaut) indexEvenements.parDefaut = slug;
    ecrireJSON(CLE_INDEX, indexEvenements);
    selectionner(slug);
  }

  function dupliquerEvenement(slugSource) {
    const source = configDe(slugSource);
    const copie = copieProfonde(source);
    copie.event.titre = source.event.titre + " (copie)";
    const slug = slugLibre(slugSource + "-copie");
    brouillons[slug] = copie;
    ecrireJSON(CLE_EVENEMENT + slug, copie);
    indexEvenements.evenements.push({ slug: slug, titre: copie.event.titre, date: copie.event.date || "", modifie: true });
    ecrireJSON(CLE_INDEX, indexEvenements);
    selectionner(slug);
  }

  function supprimerEvenement(slug) {
    const entree = indexEvenements.evenements.find(function (e) { return e.slug === slug; });
    if (!confirm("Supprimer « " + (entree ? entree.titre : slug) + " »?\n\nCette action est locale (le fichier publié, s'il existe, restera en ligne jusqu'à la prochaine publication).")) return;
    indexEvenements.evenements = indexEvenements.evenements.filter(function (e) { return e.slug !== slug; });
    delete brouillons[slug];
    localStorage.removeItem(CLE_EVENEMENT + slug);
    if (indexEvenements.parDefaut === slug) {
      indexEvenements.parDefaut = indexEvenements.evenements.length ? indexEvenements.evenements[0].slug : "";
    }
    if (!indexEvenements.evenements.length) {
      ecrireJSON(CLE_INDEX, indexEvenements);
      creerEvenement();
      return;
    }
    ecrireJSON(CLE_INDEX, indexEvenements);
    selectionner(slugSelectionne === slug ? indexEvenements.evenements[0].slug : slugSelectionne);
  }

  function toutExporter() {
    const paquet = { index: copieProfonde(indexEvenements), evenements: {} };
    indexEvenements.evenements.forEach(function (e) {
      paquet.evenements[e.slug] = copieProfonde(configDe(e.slug));
    });
    telecharger("trouvez-votre-place-sauvegarde.json", JSON.stringify(paquet, null, 2));
  }

  function importerFichier(fichier) {
    const lecteur = new FileReader();
    lecteur.onload = function () {
      try {
        const donnees = JSON.parse(lecteur.result);
        if (donnees.index && donnees.evenements) {
          // Sauvegarde complète
          Object.keys(donnees.evenements).forEach(function (slug) {
            ecrireJSON(CLE_EVENEMENT + slug, donnees.evenements[slug]);
            brouillons[slug] = donnees.evenements[slug];
            if (!indexEvenements.evenements.some(function (e) { return e.slug === slug; })) {
              const entree = (donnees.index.evenements || []).find(function (e) { return e.slug === slug; }) || {};
              indexEvenements.evenements.push({
                slug: slug, titre: entree.titre || slug, date: entree.date || "", modifie: true,
              });
            }
          });
        } else if (donnees.event && donnees.salle) {
          // Config d'un seul événement
          const slug = slugLibre(slugifier(donnees.event.titre || fichier.name.replace(/\.json$/i, "")));
          ecrireJSON(CLE_EVENEMENT + slug, donnees);
          brouillons[slug] = donnees;
          indexEvenements.evenements.push({
            slug: slug, titre: donnees.event.titre || slug, date: donnees.event.date || "", modifie: true,
          });
          slugSelectionne = slug;
        } else {
          alert("Fichier non reconnu : attendu une config d'événement ou une sauvegarde complète.");
          return;
        }
        ecrireJSON(CLE_INDEX, indexEvenements);
        selectionner(slugSelectionne);
      } catch (e) {
        alert("Impossible de lire ce fichier JSON.");
      }
    };
    lecteur.readAsText(fichier);
  }

  // --------------------------------------------------------------------------
  // Contrat public
  // --------------------------------------------------------------------------
  window.Admin = {
    onglets: [],

    brouillon: function () { return configDe(slugSelectionne); },
    slugCourant: function () { return slugSelectionne; },
    index: function () { return indexEvenements; },
    configDe: configDe,

    notifierChangement: function () {
      const config = configDe(slugSelectionne);
      ecrireJSON(CLE_EVENEMENT + slugSelectionne, config);
      const entree = indexEvenements.evenements.find(function (e) { return e.slug === slugSelectionne; });
      if (entree) {
        entree.titre = config.event.titre || slugSelectionne;
        entree.date = config.event.date || "";
        entree.modifie = true;
      }
      ecrireJSON(CLE_INDEX, indexEvenements);
      rendreListeEvenements();
      rendreEntete();
      rafraichirApercu(false);
    },

    marquerPublie: function (slug) {
      const entree = indexEvenements.evenements.find(function (e) { return e.slug === slug; });
      if (entree) entree.modifie = false;
      ecrireJSON(CLE_INDEX, indexEvenements);
      rendreListeEvenements();
      rendreEntete();
    },

    reglages: function () { return reglages; },
    sauverReglages: function () { ecrireJSON(CLE_REGLAGES, reglages); },

    urlBase: function () {
      let url = (reglages.urlBase || "").trim();
      if (url && !url.endsWith("/")) url += "/";
      return url;
    },
  };

  // --------------------------------------------------------------------------
  // Démarrage
  // --------------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    amorcer().then(function () {
      document.getElementById("bouton-nouvel-evenement").addEventListener("click", creerEvenement);
      document.getElementById("bouton-tout-exporter").addEventListener("click", toutExporter);
      const champImport = document.getElementById("champ-import");
      document.getElementById("bouton-importer").addEventListener("click", function () { champImport.click(); });
      champImport.addEventListener("change", function () {
        if (champImport.files[0]) importerFichier(champImport.files[0]);
        champImport.value = "";
      });

      rendreListeEvenements();
      rendreEntete();
      rendreBarreOnglets();
      const premier = window.Admin.onglets.slice().sort(function (a, b) { return a.ordre - b.ordre; })[0];
      if (premier) activerOnglet(premier.id);
      // L'iframe a peut-être déjà envoyé « pret » avant l'amorçage
      if (apercuPret) envoyerConfigApercu(); else rafraichirApercu(true);
    });
  });
})();
