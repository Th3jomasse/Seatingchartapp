// ============================================================================
// Onglet « Apparence » du tableau de bord
//
// Permet de personnaliser le thème visuel de l'application invités :
// thèmes prêts à l'emploi, mode clair/sombre/auto, 7 couleurs fines,
// polices de titres/texte (Google Fonts) et logo.
//
// Contrat respecté : aucune donnée n'est conservée en dehors de
// Admin.brouillon().theme — chaque modification appelle immédiatement
// Admin.notifierChangement() pour sauvegarder et rafraîchir l'aperçu.
// ============================================================================

(function () {
  "use strict";

  // --------------------------------------------------------------------------
  // Données de référence
  // --------------------------------------------------------------------------

  // Couleurs par défaut appliquées par l'app quand une valeur est "" (mode clair)
  const DEFAUTS_CLAIR = {
    accent: "#8a7a4f",
    accentFonce: "#6e6140",
    surlignage: "#c9a84c",
    sauge: "#5c6b5a",
    fond: "#faf7f2",
    carte: "#ffffff",
    encre: "#3c3a36",
  };

  // Couleurs par défaut en mode sombre — utilisées uniquement pour prévisualiser
  // fidèlement les pastilles des thèmes prêts à l'emploi qui ciblent ce mode.
  const DEFAUTS_SOMBRE = {
    accent: "#b9a468",
    accentFonce: "#cdbb85",
    surlignage: "#c9a84c",
    sauge: "#8ba087",
    fond: "#201e1b",
    carte: "#2a2723",
    encre: "#e8e3d9",
  };

  const CLES_COULEURS = ["accent", "accentFonce", "surlignage", "sauge", "fond", "carte", "encre"];

  const LIBELLES_COULEURS = {
    accent: "Accent principal",
    accentFonce: "Accent foncé (survol)",
    surlignage: "Surlignage",
    sauge: "Vert sauge",
    fond: "Fond de la page",
    carte: "Fond des cartes",
    encre: "Texte (encre)",
  };

  const POLICES_TITRE = [
    { valeur: "", label: "Cormorant Garamond (défaut)", famille: "Cormorant Garamond" },
    { valeur: "Playfair Display", label: "Playfair Display", famille: "Playfair Display" },
    { valeur: "Libre Baskerville", label: "Libre Baskerville", famille: "Libre Baskerville" },
    { valeur: "Marcellus", label: "Marcellus", famille: "Marcellus" },
    { valeur: "DM Serif Display", label: "DM Serif Display", famille: "DM Serif Display" },
    { valeur: "Fraunces", label: "Fraunces", famille: "Fraunces" },
  ];

  const POLICES_TEXTE = [
    { valeur: "", label: "Jost (défaut)", famille: "Jost" },
    { valeur: "Source Sans 3", label: "Source Sans 3", famille: "Source Sans 3" },
    { valeur: "Montserrat", label: "Montserrat", famille: "Montserrat" },
    { valeur: "Nunito Sans", label: "Nunito Sans", famille: "Nunito Sans" },
    { valeur: "DM Sans", label: "DM Sans", famille: "DM Sans" },
    { valeur: "Work Sans", label: "Work Sans", famille: "Work Sans" },
  ];

  // Thèmes prêts à l'emploi : mode + couleurs + polices, appliqués d'un clic
  const PRESETS = [
    {
      id: "classique",
      nom: "Classique or",
      theme: {
        mode: "clair",
        couleurs: { accent: "", accentFonce: "", surlignage: "", sauge: "", fond: "", carte: "", encre: "" },
        polices: { titre: "", texte: "" },
      },
    },
    {
      id: "jardin",
      nom: "Jardin sauge",
      theme: {
        mode: "clair",
        couleurs: { accent: "#6f826c", accentFonce: "#55654f", surlignage: "#a9bc98", sauge: "#6f826c", fond: "", carte: "", encre: "" },
        polices: { titre: "Marcellus", texte: "Nunito Sans" },
      },
    },
    {
      id: "marine",
      nom: "Marine élégant",
      theme: {
        mode: "clair",
        couleurs: { accent: "#44597a", accentFonce: "#32415a", surlignage: "#8fa3c4", sauge: "#5a6b84", fond: "", carte: "", encre: "" },
        polices: { titre: "Playfair Display", texte: "Source Sans 3" },
      },
    },
    {
      id: "bordeaux",
      nom: "Bordeaux",
      theme: {
        mode: "clair",
        couleurs: { accent: "#86414c", accentFonce: "#632f38", surlignage: "#c48f97", sauge: "#7a5a60", fond: "", carte: "", encre: "" },
        polices: { titre: "Libre Baskerville", texte: "Montserrat" },
      },
    },
    {
      id: "gala",
      nom: "Gala noir & or",
      theme: {
        mode: "sombre",
        couleurs: { accent: "", accentFonce: "", surlignage: "", sauge: "", fond: "", carte: "", encre: "" },
        polices: { titre: "Fraunces", texte: "Work Sans" },
      },
    },
    {
      id: "corporatif",
      nom: "Corporatif",
      theme: {
        mode: "clair",
        couleurs: { accent: "#2c6bab", accentFonce: "#1f4d7d", surlignage: "#7ba7d4", sauge: "#4a6a8a", fond: "#f7f9fb", carte: "", encre: "" },
        polices: { titre: "DM Serif Display", texte: "DM Sans" },
      },
    },
  ];

  const MODES = [
    { valeur: "clair", label: "Clair" },
    { valeur: "sombre", label: "Sombre" },
    { valeur: "auto", label: "Auto" },
  ];

  const NOTES_MODE = {
    clair: "La palette claire est toujours utilisée, peu importe l'appareil de l'invité.",
    sombre: "La palette sombre est toujours utilisée, peu importe l'appareil de l'invité.",
    auto: "L'application suit le réglage clair/sombre du téléphone de chaque invité.",
  };

  const TOUTES_FAMILLES = [
    "Cormorant Garamond", "Jost", "Playfair Display", "Libre Baskerville", "Marcellus",
    "DM Serif Display", "Fraunces", "Source Sans 3", "Montserrat", "Nunito Sans",
    "DM Sans", "Work Sans",
  ];

  const TAILLE_AVERTISSEMENT = 300 * 1024; // 300 Ko
  const TAILLE_MAX = 1024 * 1024; // 1 Mo

  // --------------------------------------------------------------------------
  // Utilitaires
  // --------------------------------------------------------------------------
  function creerEl(balise, classe, texte) {
    const e = document.createElement(balise);
    if (classe) e.className = classe;
    if (texte !== undefined) e.textContent = texte;
    return e;
  }

  function normaliserHex(valeur) {
    const v = (valeur || "").trim().replace(/^#/, "");
    return /^[0-9a-fA-F]{6}$/.test(v) ? "#" + v.toLowerCase() : "";
  }

  function couleurEffective(cle, valeur, mode) {
    if (valeur) return valeur;
    return (mode === "sombre" ? DEFAUTS_SOMBRE : DEFAUTS_CLAIR)[cle];
  }

  // S'assure que le brouillon a une structure de thème complète, sans écraser
  // les valeurs déjà présentes (certains événements existants n'ont pas
  // encore de sous-objet « polices »).
  function assurerStructure(theme) {
    if (!theme.mode) theme.mode = "clair";
    if (typeof theme.logo !== "string") theme.logo = "";
    if (!theme.couleurs) theme.couleurs = {};
    CLES_COULEURS.forEach(function (cle) {
      if (typeof theme.couleurs[cle] !== "string") theme.couleurs[cle] = "";
    });
    if (!theme.polices) theme.polices = {};
    if (typeof theme.polices.titre !== "string") theme.polices.titre = "";
    if (typeof theme.polices.texte !== "string") theme.polices.texte = "";
  }

  function themeCorrespondPreset(theme, preset) {
    if (theme.mode !== preset.theme.mode) return false;
    for (const cle of CLES_COULEURS) {
      if ((theme.couleurs[cle] || "") !== (preset.theme.couleurs[cle] || "")) return false;
    }
    return (theme.polices.titre || "") === (preset.theme.polices.titre || "")
      && (theme.polices.texte || "") === (preset.theme.polices.texte || "");
  }

  // Ajoute une seule fois la balise <link> Google Fonts (toutes les familles
  // utilisées par les préréglages et les sélecteurs de polices).
  function assurerLienPolices() {
    if (document.getElementById("lien-polices-apparence")) return;
    const lien = document.createElement("link");
    lien.id = "lien-polices-apparence";
    lien.rel = "stylesheet";
    const familles = TOUTES_FAMILLES.map(function (f) {
      return "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":ital,wght@0,400;0,500;0,600;1,400";
    }).join("&");
    lien.href = "https://fonts.googleapis.com/css2?" + familles + "&display=swap";
    document.head.appendChild(lien);
  }

  function formaterKo(octets) {
    return Math.round(octets / 1024) + " Ko";
  }

  // --------------------------------------------------------------------------
  // Rendu principal
  // --------------------------------------------------------------------------
  function rendu(conteneur) {
    assurerLienPolices();

    const config = window.Admin.brouillon();
    const theme = config.theme;
    assurerStructure(theme);

    function sauvegarder() {
      window.Admin.notifierChangement();
      actualiserEtatsPresets();
    }

    // ------------------------------------------------------------------ //
    // Carte 1 — Thèmes prêts à l'emploi
    // ------------------------------------------------------------------ //
    const carteThemes = creerEl("section", "a-carte");
    carteThemes.appendChild(creerEl("h2", null, "Thèmes prêts à l'emploi"));
    carteThemes.appendChild(creerEl("p", "a-note", "Cliquez sur un thème pour appliquer d'un coup son mode, ses couleurs et ses polices. Le logo n'est pas modifié."));

    const grille = creerEl("div", "apparence-grille-presets");
    const cartesPresets = [];

    PRESETS.forEach(function (preset) {
      const carte = creerEl("button", "apparence-preset");
      carte.type = "button";
      carte.setAttribute("aria-pressed", "false");

      const bandeau = creerEl("span", "apparence-preset-bandeau");
      const teinteAccent = couleurEffective("accent", preset.theme.couleurs.accent, preset.theme.mode);
      const teinteAccentFonce = couleurEffective("accentFonce", preset.theme.couleurs.accentFonce, preset.theme.mode);
      const teinteSurlignage = couleurEffective("surlignage", preset.theme.couleurs.surlignage, preset.theme.mode);
      bandeau.style.background = "linear-gradient(120deg, " + teinteAccent + ", " + teinteAccentFonce + " 55%, " + teinteSurlignage + ")";
      carte.appendChild(bandeau);

      const insigne = creerEl("span", "apparence-preset-insigne", "✓ Actif");
      carte.appendChild(insigne);

      const nom = creerEl("span", "apparence-preset-nom", preset.nom);
      carte.appendChild(nom);

      const pastilles = creerEl("span", "apparence-pastilles");
      ["accent", "accentFonce", "surlignage", "sauge"].forEach(function (cle) {
        const pastille = creerEl("span", "apparence-pastille");
        pastille.style.background = couleurEffective(cle, preset.theme.couleurs[cle], preset.theme.mode);
        pastille.title = LIBELLES_COULEURS[cle];
        pastilles.appendChild(pastille);
      });
      carte.appendChild(pastilles);

      const polices = creerEl("span", "apparence-preset-polices");
      const spanTitre = creerEl("span", null, preset.theme.polices.titre || "Cormorant Garamond");
      spanTitre.style.fontFamily = "'" + (preset.theme.polices.titre || "Cormorant Garamond") + "', serif";
      const spanTexte = creerEl("span", null, " / " + (preset.theme.polices.texte || "Jost"));
      spanTexte.style.fontFamily = "'" + (preset.theme.polices.texte || "Jost") + "', sans-serif";
      polices.appendChild(spanTitre);
      polices.appendChild(spanTexte);
      carte.appendChild(polices);

      if (preset.theme.mode === "sombre") {
        carte.classList.add("apparence-preset-sombre");
      }

      carte.addEventListener("click", function () {
        theme.mode = preset.theme.mode;
        theme.couleurs = Object.assign({}, preset.theme.couleurs);
        theme.polices = Object.assign({}, preset.theme.polices);
        actualiserModeUI();
        actualiserToutesLesCouleurs();
        actualiserPolicesUI();
        sauvegarder();
      });

      grille.appendChild(carte);
      cartesPresets.push({ carte: carte, preset: preset });
    });
    carteThemes.appendChild(grille);

    function actualiserEtatsPresets() {
      cartesPresets.forEach(function (item) {
        const actif = themeCorrespondPreset(theme, item.preset);
        item.carte.classList.toggle("actif", actif);
        item.carte.setAttribute("aria-pressed", actif ? "true" : "false");
      });
    }

    // ------------------------------------------------------------------ //
    // Carte 2 — Mode d'affichage
    // ------------------------------------------------------------------ //
    const carteMode = creerEl("section", "a-carte");
    carteMode.appendChild(creerEl("h2", null, "Mode d'affichage"));

    const segmente = creerEl("div", "apparence-segmente");
    const boutonsMode = [];
    MODES.forEach(function (m) {
      const bouton = creerEl("button", null, m.label);
      bouton.type = "button";
      bouton.addEventListener("click", function () {
        theme.mode = m.valeur;
        actualiserModeUI();
        sauvegarder();
      });
      segmente.appendChild(bouton);
      boutonsMode.push({ bouton: bouton, valeur: m.valeur });
    });
    carteMode.appendChild(segmente);

    const noteMode = creerEl("p", "a-note", NOTES_MODE[theme.mode] || "");
    carteMode.appendChild(noteMode);

    function actualiserModeUI() {
      boutonsMode.forEach(function (item) {
        item.bouton.classList.toggle("actif", item.valeur === theme.mode);
      });
      noteMode.textContent = NOTES_MODE[theme.mode] || "";
    }

    // ------------------------------------------------------------------ //
    // Carte 3 — Couleurs fines
    // ------------------------------------------------------------------ //
    const carteCouleurs = creerEl("section", "a-carte");
    carteCouleurs.appendChild(creerEl("h2", null, "Couleurs"));
    carteCouleurs.appendChild(creerEl("p", "a-note", "Laissez une couleur sur « défaut » pour suivre automatiquement la palette du thème."));

    const lignesCouleurs = {};

    CLES_COULEURS.forEach(function (cle) {
      const ligne = creerEl("div", "apparence-ligne-couleur");

      const libelle = creerEl("span", "apparence-libelle-couleur", LIBELLES_COULEURS[cle]);
      ligne.appendChild(libelle);

      const inputColor = document.createElement("input");
      inputColor.type = "color";
      inputColor.className = "apparence-pastille-input";

      const inputHex = document.createElement("input");
      inputHex.type = "text";
      inputHex.className = "apparence-hex-input";
      inputHex.spellcheck = false;
      inputHex.maxLength = 7;

      const boutonDefaut = creerEl("button", "a-bouton-contour apparence-bouton-mini", "Défaut");
      boutonDefaut.type = "button";

      function actualiserLigne() {
        const valeur = theme.couleurs[cle];
        const defautHex = (theme.mode === "sombre" ? DEFAUTS_SOMBRE : DEFAUTS_CLAIR)[cle];
        inputColor.value = valeur || defautHex;
        inputHex.value = valeur || "";
        inputHex.placeholder = defautHex;
        boutonDefaut.disabled = !valeur;
      }

      inputColor.addEventListener("input", function () {
        theme.couleurs[cle] = inputColor.value;
        inputHex.value = inputColor.value;
        boutonDefaut.disabled = false;
        sauvegarder();
      });

      inputHex.addEventListener("input", function () {
        const brut = inputHex.value.trim();
        if (brut === "") {
          theme.couleurs[cle] = "";
          boutonDefaut.disabled = true;
          sauvegarder();
          return;
        }
        const normalise = normaliserHex(brut);
        if (normalise) {
          theme.couleurs[cle] = normalise;
          inputColor.value = normalise;
          boutonDefaut.disabled = false;
          sauvegarder();
        }
      });

      inputHex.addEventListener("blur", function () {
        // Revient à l'affichage propre si l'utilisateur laisse une valeur invalide
        actualiserLigne();
      });

      boutonDefaut.addEventListener("click", function () {
        theme.couleurs[cle] = "";
        actualiserLigne();
        sauvegarder();
      });

      actualiserLigne();

      ligne.appendChild(inputColor);
      ligne.appendChild(inputHex);
      ligne.appendChild(boutonDefaut);
      carteCouleurs.appendChild(ligne);

      lignesCouleurs[cle] = { actualiser: actualiserLigne };
    });

    function actualiserToutesLesCouleurs() {
      CLES_COULEURS.forEach(function (cle) { lignesCouleurs[cle].actualiser(); });
    }

    // ------------------------------------------------------------------ //
    // Carte 4 — Polices
    // ------------------------------------------------------------------ //
    const cartePolices = creerEl("section", "a-carte");
    cartePolices.appendChild(creerEl("h2", null, "Polices"));

    const rangeePolices = creerEl("div", "a-rangee");

    const champTitre = creerEl("div", "a-champ");
    champTitre.appendChild(creerEl("label", null, "Police des titres"));
    const selectTitre = document.createElement("select");
    POLICES_TITRE.forEach(function (p) {
      const option = creerEl("option", null, p.label);
      option.value = p.valeur;
      option.style.fontFamily = "'" + p.famille + "', serif";
      selectTitre.appendChild(option);
    });
    champTitre.appendChild(selectTitre);

    const champTexte = creerEl("div", "a-champ");
    champTexte.appendChild(creerEl("label", null, "Police du texte"));
    const selectTexte = document.createElement("select");
    POLICES_TEXTE.forEach(function (p) {
      const option = creerEl("option", null, p.label);
      option.value = p.valeur;
      option.style.fontFamily = "'" + p.famille + "', sans-serif";
      selectTexte.appendChild(option);
    });
    champTexte.appendChild(selectTexte);

    rangeePolices.appendChild(champTitre);
    rangeePolices.appendChild(champTexte);
    cartePolices.appendChild(rangeePolices);

    const apercuPolices = creerEl("p", "apparence-apercu-polices");
    const apercuTexte = creerEl("span", "apparence-apercu-texte", "Aa Bb — ");
    const apercuTitre = creerEl("span", "apparence-apercu-titre", "Sophie & Mathieu");
    apercuPolices.appendChild(apercuTexte);
    apercuPolices.appendChild(apercuTitre);
    cartePolices.appendChild(apercuPolices);

    function actualiserPolicesUI() {
      selectTitre.value = theme.polices.titre || "";
      selectTexte.value = theme.polices.texte || "";
      apercuTitre.style.fontFamily = "'" + (theme.polices.titre || "Cormorant Garamond") + "', Georgia, serif";
      apercuTexte.style.fontFamily = "'" + (theme.polices.texte || "Jost") + "', 'Segoe UI', sans-serif";
    }

    selectTitre.addEventListener("change", function () {
      theme.polices.titre = selectTitre.value;
      actualiserPolicesUI();
      sauvegarder();
    });
    selectTexte.addEventListener("change", function () {
      theme.polices.texte = selectTexte.value;
      actualiserPolicesUI();
      sauvegarder();
    });

    // ------------------------------------------------------------------ //
    // Carte 5 — Logo
    // ------------------------------------------------------------------ //
    const carteLogo = creerEl("section", "a-carte");
    carteLogo.appendChild(creerEl("h2", null, "Logo"));
    carteLogo.appendChild(creerEl("p", "a-note", "Sans logo, un monogramme élégant (initiales) est utilisé automatiquement."));

    const ligneLogo = creerEl("div", "apparence-logo-ligne");

    const vignette = creerEl("div", "apparence-logo-vignette");
    ligneLogo.appendChild(vignette);

    const actionsLogo = creerEl("div", "apparence-logo-actions");

    const etiquetteFichier = creerEl("label", "a-bouton-contour apparence-bouton-fichier", "Téléverser un logo…");
    const champFichier = document.createElement("input");
    champFichier.type = "file";
    champFichier.accept = "image/*";
    champFichier.className = "apparence-champ-fichier-cache";
    etiquetteFichier.appendChild(champFichier);
    actionsLogo.appendChild(etiquetteFichier);

    const boutonRetirer = creerEl("button", "a-bouton-danger", "Retirer le logo");
    boutonRetirer.type = "button";
    actionsLogo.appendChild(boutonRetirer);

    ligneLogo.appendChild(actionsLogo);
    carteLogo.appendChild(ligneLogo);

    const noteTaille = creerEl("p", "a-note");
    carteLogo.appendChild(noteTaille);

    const champUrl = creerEl("div", "a-champ apparence-champ-url");
    champUrl.appendChild(creerEl("label", null, "Ou URL d'une image en ligne"));
    const inputUrl = document.createElement("input");
    inputUrl.type = "url";
    inputUrl.placeholder = "https://exemple.com/logo.png";
    champUrl.appendChild(inputUrl);
    carteLogo.appendChild(champUrl);

    function actualiserLogoUI() {
      vignette.innerHTML = "";
      if (theme.logo) {
        const img = document.createElement("img");
        img.src = theme.logo;
        img.alt = "Logo actuel";
        vignette.appendChild(img);
        boutonRetirer.disabled = false;
        inputUrl.value = theme.logo.indexOf("data:") === 0 ? "" : theme.logo;
        inputUrl.placeholder = theme.logo.indexOf("data:") === 0
          ? "Un fichier est déjà téléversé — entrez une URL pour le remplacer"
          : "https://exemple.com/logo.png";
      } else {
        vignette.appendChild(creerEl("span", "apparence-logo-vide", "Aucun logo"));
        boutonRetirer.disabled = true;
        inputUrl.value = "";
        inputUrl.placeholder = "https://exemple.com/logo.png";
      }
    }

    champFichier.addEventListener("change", function () {
      const fichier = champFichier.files && champFichier.files[0];
      if (!fichier) return;

      if (fichier.size > TAILLE_MAX) {
        noteTaille.textContent = "Ce fichier fait " + formaterKo(fichier.size) + " : la limite est de 1 Mo. Compressez l'image avant de la téléverser.";
        noteTaille.classList.add("apparence-note-alerte");
        champFichier.value = "";
        return;
      }

      const lecteur = new FileReader();
      lecteur.onload = function () {
        theme.logo = String(lecteur.result);
        actualiserLogoUI();
        if (fichier.size > TAILLE_AVERTISSEMENT) {
          noteTaille.textContent = "Logo téléversé (" + formaterKo(fichier.size) + ") — envisagez de le compresser sous 300 Ko pour un chargement plus rapide chez vos invités.";
          noteTaille.classList.add("apparence-note-alerte");
        } else {
          noteTaille.textContent = "Logo téléversé (" + formaterKo(fichier.size) + ").";
          noteTaille.classList.remove("apparence-note-alerte");
        }
        sauvegarder();
      };
      lecteur.onerror = function () {
        noteTaille.textContent = "Impossible de lire ce fichier.";
        noteTaille.classList.add("apparence-note-alerte");
      };
      lecteur.readAsDataURL(fichier);
      champFichier.value = "";
    });

    boutonRetirer.addEventListener("click", function () {
      theme.logo = "";
      noteTaille.textContent = "";
      noteTaille.classList.remove("apparence-note-alerte");
      actualiserLogoUI();
      sauvegarder();
    });

    inputUrl.addEventListener("change", function () {
      const valeur = inputUrl.value.trim();
      if (!valeur) return;
      theme.logo = valeur;
      noteTaille.textContent = "";
      noteTaille.classList.remove("apparence-note-alerte");
      actualiserLogoUI();
      sauvegarder();
    });

    actualiserLogoUI();

    // ------------------------------------------------------------------ //
    // Assemblage
    // ------------------------------------------------------------------ //
    actualiserModeUI();
    actualiserPolicesUI();
    actualiserEtatsPresets();

    conteneur.appendChild(carteThemes);
    conteneur.appendChild(carteMode);
    conteneur.appendChild(carteCouleurs);
    conteneur.appendChild(cartePolices);
    conteneur.appendChild(carteLogo);
  }

  window.Admin.onglets.push({
    id: "apparence",
    libelle: "Apparence",
    ordre: 20,
    rendu: rendu,
  });
})();
