// ============================================================================
// Onglet « Contenu »
//
// Regroupe toutes les informations textuelles de l'événement : général,
// pages activées, menu, photos, infos pratiques, à propos et horaire.
//
// Contrat utilisé (voir js/admin/noyau.js) :
//   Admin.brouillon()        — config de l'événement courant (référence)
//   Admin.notifierChangement() — à appeler après chaque modification
//
// Important : cet onglet est détruit/recréé à chaque changement d'événement
// (voir noyau.js -> activerOnglet). On ne garde donc AUCUN état hors du DOM :
// tout est relu depuis Admin.brouillon() au moment du rendu.
// ============================================================================

(function () {
  "use strict";

  // --------------------------------------------------------------------------
  // Petits constructeurs d'éléments (réutilisent les classes .a-* du noyau)
  // --------------------------------------------------------------------------

  function creerCarte(titre) {
    const carte = document.createElement("section");
    carte.className = "a-carte";
    const h2 = document.createElement("h2");
    h2.textContent = titre;
    carte.appendChild(h2);
    return carte;
  }

  function creerRangee(elements) {
    const rangee = document.createElement("div");
    rangee.className = "a-rangee";
    elements.forEach(function (el) { rangee.appendChild(el); });
    return rangee;
  }

  // Champ étiqueté (.a-champ) contenant un input/textarea déjà construit
  function champLigne(etiquette, elementEntree, note) {
    const champ = document.createElement("div");
    champ.className = "a-champ";
    const lbl = document.createElement("label");
    lbl.textContent = etiquette;
    champ.appendChild(lbl);
    champ.appendChild(elementEntree);
    if (note) {
      const p = document.createElement("p");
      p.className = "a-note";
      p.textContent = note;
      champ.appendChild(p);
    }
    return champ;
  }

  // Input texte ou textarea, relié directement au brouillon via onChange
  function entreeTexte(valeur, onChange, options) {
    options = options || {};
    const el = document.createElement(options.zone ? "textarea" : "input");
    if (!options.zone) el.type = options.type || "text";
    el.value = valeur || "";
    if (options.placeholder) el.placeholder = options.placeholder;
    el.addEventListener("input", function () { onChange(el.value); });
    return el;
  }

  function entreeSelect(valeur, choix, onChange) {
    const select = document.createElement("select");
    choix.forEach(function (c) {
      const option = document.createElement("option");
      option.value = c.valeur;
      option.textContent = c.libelle;
      if (c.valeur === valeur) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener("change", function () { onChange(select.value); });
    return select;
  }

  function entreeCase(coche, onChange, etiquette) {
    const label = document.createElement("label");
    label.className = "contenu-case-ligne";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!coche;
    input.addEventListener("change", function () { onChange(input.checked); });
    const span = document.createElement("span");
    span.textContent = etiquette;
    label.appendChild(input);
    label.appendChild(span);
    return label;
  }

  function bouton(texte, classe, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = classe;
    b.textContent = texte;
    b.addEventListener("click", onClick);
    return b;
  }

  // --------------------------------------------------------------------------
  // a) Général
  // --------------------------------------------------------------------------
  function rendreGeneral(config) {
    const e = config.event;
    const carte = creerCarte("Général");

    carte.appendChild(champLigne("Type d'événement", entreeSelect(e.type, [
      { valeur: "mariage", libelle: "Mariage" },
      { valeur: "entreprise", libelle: "Entreprise / autre" },
    ], function (v) { e.type = v; Admin.notifierChangement(); })));

    carte.appendChild(creerRangee([
      champLigne("Titre", entreeTexte(e.titre, function (v) { e.titre = v; Admin.notifierChangement(); })),
      champLigne("Sous-titre", entreeTexte(e.sousTitre, function (v) { e.sousTitre = v; Admin.notifierChangement(); })),
    ]));

    const entreeDateISO = document.createElement("input");
    entreeDateISO.type = "datetime-local";
    entreeDateISO.value = (e.dateISO || "").slice(0, 16);
    entreeDateISO.addEventListener("input", function () {
      e.dateISO = entreeDateISO.value;
      Admin.notifierChangement();
    });

    carte.appendChild(creerRangee([
      champLigne(
        "Date affichée",
        entreeTexte(e.date, function (v) { e.date = v; Admin.notifierChangement(); }, { placeholder: "ex. Samedi 12 septembre 2026" })
      ),
      champLigne(
        "Date et heure exactes (compte à rebours)",
        entreeDateISO,
        "Laisser vide pour cacher le compte à rebours sur l'accueil."
      ),
    ]));

    carte.appendChild(champLigne("Lieu", entreeTexte(e.lieu, function (v) { e.lieu = v; Admin.notifierChangement(); })));

    carte.appendChild(champLigne(
      "Message de bienvenue",
      entreeTexte(e.messageBienvenue, function (v) { e.messageBienvenue = v; Admin.notifierChangement(); }, { zone: true })
    ));

    return carte;
  }

  // --------------------------------------------------------------------------
  // b) Pages activées
  // --------------------------------------------------------------------------
  function rendrePages(config) {
    const carte = creerCarte("Pages affichées");
    const pagesDisponibles = [
      ["plan", "Plan de salle (trouver ma place)"],
      ["menu", "Menu"],
      ["photos", "Partage de photos"],
      ["infos", "Infos pratiques"],
      ["aPropos", "À propos / Les mariés"],
      ["horaire", "Déroulement de la journée"],
    ];

    const conteneur = document.createElement("div");
    conteneur.className = "contenu-cases";
    pagesDisponibles.forEach(function (entree) {
      const cle = entree[0], etiquette = entree[1];
      conteneur.appendChild(entreeCase(config.pages[cle], function (v) {
        config.pages[cle] = v;
        Admin.notifierChangement();
      }, etiquette));
    });
    carte.appendChild(conteneur);

    return carte;
  }

  // --------------------------------------------------------------------------
  // c) Menu
  // --------------------------------------------------------------------------
  function rendreMenu(config) {
    const carte = creerCarte("Menu");
    const menu = config.menu;

    carte.appendChild(champLigne(
      "Note générale du menu",
      entreeTexte(menu.note, function (v) { menu.note = v; Admin.notifierChangement(); },
        { placeholder: "ex. Veuillez aviser le personnel de toute allergie alimentaire." })
    ));

    const note = document.createElement("p");
    note.className = "a-note";
    note.textContent = "Astuce : les notes « végétarien », « sans gluten » et « végane » sur un plat deviennent "
      + "automatiquement des badges et des filtres dans l'application des invités.";
    carte.appendChild(note);

    const conteneurSections = document.createElement("div");
    carte.appendChild(conteneurSections);

    function rendreSections() {
      conteneurSections.innerHTML = "";
      menu.sections.forEach(function (section, indexSection) {
        conteneurSections.appendChild(rendreSectionBloc(section, indexSection));
      });
    }

    function rendreSectionBloc(section, indexSection) {
      const bloc = document.createElement("div");
      bloc.className = "contenu-section-bloc";

      const entete = document.createElement("div");
      entete.className = "contenu-section-entete";
      const champTitre = entreeTexte(section.titre, function (v) {
        section.titre = v;
        Admin.notifierChangement();
      }, { placeholder: "Titre de la section (ex. Entrée)" });
      champTitre.className = "contenu-section-titre";
      entete.appendChild(champTitre);
      entete.appendChild(bouton("Supprimer la section", "a-bouton-danger", function () {
        menu.sections.splice(indexSection, 1);
        Admin.notifierChangement();
        rendreSections();
      }));
      bloc.appendChild(entete);

      const conteneurPlats = document.createElement("div");
      bloc.appendChild(conteneurPlats);

      function rendrePlats() {
        conteneurPlats.innerHTML = "";
        section.plats.forEach(function (plat, indexPlat) {
          const rangee = document.createElement("div");
          rangee.className = "contenu-plat-rangee";
          rangee.appendChild(entreeTexte(plat.nom, function (v) {
            plat.nom = v;
            Admin.notifierChangement();
          }, { placeholder: "Nom du plat" }));
          rangee.appendChild(entreeTexte(plat.note, function (v) {
            plat.note = v;
            Admin.notifierChangement();
          }, { placeholder: "Note (ex. végétarien)" }));
          rangee.appendChild(bouton("✕", "a-bouton-danger", function () {
            section.plats.splice(indexPlat, 1);
            Admin.notifierChangement();
            rendrePlats();
          }));
          conteneurPlats.appendChild(rangee);
        });
      }
      rendrePlats();

      bloc.appendChild(bouton("+ Plat", "a-bouton-contour", function () {
        section.plats.push({ nom: "", note: "" });
        Admin.notifierChangement();
        rendrePlats();
      }));

      return bloc;
    }

    rendreSections();

    carte.appendChild(bouton("+ Section", "a-bouton", function () {
      menu.sections.push({ titre: "Nouvelle section", plats: [] });
      Admin.notifierChangement();
      rendreSections();
    }));

    return carte;
  }

  // --------------------------------------------------------------------------
  // d) Photos
  // --------------------------------------------------------------------------
  function rendrePhotos(config) {
    const p = config.photos;
    const carte = creerCarte("Photos");

    carte.appendChild(creerRangee([
      champLigne("Titre", entreeTexte(p.titre, function (v) { p.titre = v; Admin.notifierChangement(); })),
      champLigne("Texte du bouton", entreeTexte(p.texteBouton, function (v) { p.texteBouton = v; Admin.notifierChangement(); })),
    ]));

    carte.appendChild(champLigne(
      "Description",
      entreeTexte(p.description, function (v) { p.description = v; Admin.notifierChangement(); }, { zone: true })
    ));

    carte.appendChild(champLigne(
      "Lien de l'album / photobooth",
      entreeTexte(p.lien, function (v) { p.lien = v; Admin.notifierChangement(); }, { type: "url", placeholder: "https://..." })
    ));

    carte.appendChild(champLigne(
      "Mot-clic suggéré",
      entreeTexte(p.motClic, function (v) { p.motClic = v; Admin.notifierChangement(); }, { placeholder: "ex. #SophieEtMathieu2026" }),
      "Laisser vide pour ne pas afficher de mot-clic."
    ));

    return carte;
  }

  // --------------------------------------------------------------------------
  // e) Infos pratiques
  // --------------------------------------------------------------------------
  function rendreInfos(config) {
    const i = config.infos;
    const carte = creerCarte("Infos pratiques");

    carte.appendChild(champLigne("Adresse", entreeTexte(i.adresse, function (v) { i.adresse = v; Admin.notifierChangement(); })));

    carte.appendChild(champLigne(
      "Lien Google Maps",
      entreeTexte(i.googleMapsLien, function (v) { i.googleMapsLien = v; Admin.notifierChangement(); }, { type: "url" })
    ));

    carte.appendChild(champLigne(
      "Stationnement",
      entreeTexte(i.stationnement, function (v) { i.stationnement = v; Admin.notifierChangement(); }, { zone: true })
    ));

    carte.appendChild(champLigne(
      "Hébergement",
      entreeTexte(i.hebergement, function (v) { i.hebergement = v; Admin.notifierChangement(); }, { zone: true })
    ));

    carte.appendChild(champLigne(
      "Code vestimentaire",
      entreeTexte(i.codeVestimentaire, function (v) { i.codeVestimentaire = v; Admin.notifierChangement(); }, { zone: true })
    ));

    carte.appendChild(creerRangee([
      champLigne("Contact — nom", entreeTexte(i.contact.nom, function (v) { i.contact.nom = v; Admin.notifierChangement(); })),
      champLigne("Contact — téléphone", entreeTexte(i.contact.telephone, function (v) { i.contact.telephone = v; Admin.notifierChangement(); })),
    ]));

    carte.appendChild(champLigne("Contact — courriel", entreeTexte(i.contact.courriel, function (v) { i.contact.courriel = v; Admin.notifierChangement(); })));

    carte.appendChild(champLigne(
      "Lien RSVP",
      entreeTexte(i.rsvpLien, function (v) { i.rsvpLien = v; Admin.notifierChangement(); }, { type: "url" }),
      "Laisser vide pour cacher le bouton RSVP."
    ));

    return carte;
  }

  // --------------------------------------------------------------------------
  // f) À propos
  // --------------------------------------------------------------------------
  function rendreAPropos(config) {
    const a = config.aPropos;
    const carte = creerCarte("À propos");

    carte.appendChild(champLigne("Titre de la section", entreeTexte(a.titre, function (v) { a.titre = v; Admin.notifierChangement(); })));

    const conteneurParagraphes = document.createElement("div");
    carte.appendChild(conteneurParagraphes);

    function rendreParagraphes() {
      conteneurParagraphes.innerHTML = "";
      a.paragraphes.forEach(function (texte, index) {
        const bloc = document.createElement("div");
        bloc.className = "contenu-paragraphe-bloc";
        bloc.appendChild(entreeTexte(texte, function (v) {
          a.paragraphes[index] = v;
          Admin.notifierChangement();
        }, { zone: true, placeholder: "Paragraphe " + (index + 1) }));
        bloc.appendChild(bouton("Supprimer ce paragraphe", "a-bouton-danger", function () {
          a.paragraphes.splice(index, 1);
          Admin.notifierChangement();
          rendreParagraphes();
        }));
        conteneurParagraphes.appendChild(bloc);
      });
    }
    rendreParagraphes();

    carte.appendChild(bouton("+ Paragraphe", "a-bouton-contour", function () {
      a.paragraphes.push("");
      Admin.notifierChangement();
      rendreParagraphes();
    }));

    return carte;
  }

  // --------------------------------------------------------------------------
  // g) Horaire
  // --------------------------------------------------------------------------
  function rendreHoraire(config) {
    const carte = creerCarte("Horaire — déroulement de la journée");

    const conteneurLignes = document.createElement("div");
    carte.appendChild(conteneurLignes);

    function rendreLignes() {
      conteneurLignes.innerHTML = "";
      config.horaire.forEach(function (ligne, index) {
        const rangee = document.createElement("div");
        rangee.className = "contenu-horaire-rangee";

        const champHeure = entreeTexte(ligne.heure, function (v) {
          ligne.heure = v;
          Admin.notifierChangement();
        }, { placeholder: "ex. 15 h 00" });
        champHeure.className = "contenu-horaire-heure";
        rangee.appendChild(champHeure);

        rangee.appendChild(entreeTexte(ligne.activite, function (v) {
          ligne.activite = v;
          Admin.notifierChangement();
        }, { placeholder: "Activité" }));

        rangee.appendChild(bouton("↑", "contenu-bouton-icone", function () {
          if (index === 0) return;
          const tmp = config.horaire[index - 1];
          config.horaire[index - 1] = config.horaire[index];
          config.horaire[index] = tmp;
          Admin.notifierChangement();
          rendreLignes();
        }));

        rangee.appendChild(bouton("↓", "contenu-bouton-icone", function () {
          if (index === config.horaire.length - 1) return;
          const tmp = config.horaire[index + 1];
          config.horaire[index + 1] = config.horaire[index];
          config.horaire[index] = tmp;
          Admin.notifierChangement();
          rendreLignes();
        }));

        rangee.appendChild(bouton("✕", "a-bouton-danger", function () {
          config.horaire.splice(index, 1);
          Admin.notifierChangement();
          rendreLignes();
        }));

        conteneurLignes.appendChild(rangee);
      });
    }
    rendreLignes();

    carte.appendChild(bouton("+ Activité", "a-bouton", function () {
      config.horaire.push({ heure: "", activite: "" });
      Admin.notifierChangement();
      rendreLignes();
    }));

    return carte;
  }

  // --------------------------------------------------------------------------
  // Rendu principal + enregistrement de l'onglet
  // --------------------------------------------------------------------------
  function rendu(conteneur) {
    const config = window.Admin.brouillon();
    conteneur.appendChild(rendreGeneral(config));
    conteneur.appendChild(rendrePages(config));
    conteneur.appendChild(rendreMenu(config));
    conteneur.appendChild(rendrePhotos(config));
    conteneur.appendChild(rendreInfos(config));
    conteneur.appendChild(rendreAPropos(config));
    conteneur.appendChild(rendreHoraire(config));
  }

  window.Admin.onglets.push({ id: "contenu", libelle: "Contenu", ordre: 10, rendu: rendu });
})();
