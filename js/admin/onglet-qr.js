// ============================================================================
// Onglet « Codes QR » (tableau de bord)
//
// Affiche :
//   - un rappel de l'URL publique de l'événement + un grand QR à télécharger;
//   - un QR personnalisé par invité (lien profond vers sa table), avec
//     téléchargement individuel;
//   - un bouton d'impression qui transforme la grille d'invités en planche de
//     cartons prêts à découper (voir css/admin-publication.css, @media print).
//
// Rendu détruit/recréé à chaque changement d'événement : aucun état global
// n'est conservé ici, tout est recalculé depuis window.Admin à chaque appel
// de rendu(conteneur).
// ============================================================================

(function () {
  "use strict";

  // --------------------------------------------------------------------------
  // Utilitaires locaux
  // --------------------------------------------------------------------------

  // Une URL est jugée « locale » (donc inutilisable pour un QR destiné aux
  // invités) si elle pointe vers 127.0.0.1 ou localhost.
  function estUrlLocale(url) {
    return /^(https?:)?\/\/(127\.0\.0\.1|localhost)([:/]|$)/i.test(url || "");
  }

  // Nom de fichier « propre » (sans accents ni caractères spéciaux) pour le
  // téléchargement du PNG d'un invité.
  function nomFichierDepuis(texte) {
    const propre = String(texte || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return propre || "invite";
  }

  function creerElement(balise, className, texte) {
    const el = document.createElement(balise);
    if (className) el.className = className;
    if (texte !== undefined) el.textContent = texte;
    return el;
  }

  // Déclenche le téléchargement d'un canvas en PNG
  function telechargerCanvas(canvas, nomFichier) {
    const lien = document.createElement("a");
    lien.href = canvas.toDataURL("image/png");
    lien.download = nomFichier;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
  }

  // Copie un texte dans le presse-papiers, avec repli sur execCommand si
  // l'API Clipboard n'est pas disponible (contexte non sécurisé, etc.), et
  // affiche une confirmation temporaire sur le bouton cliqué.
  function copierTexte(texte, bouton) {
    function confirmer() {
      const original = bouton.textContent;
      bouton.textContent = "Copié !";
      bouton.disabled = true;
      setTimeout(function () {
        bouton.textContent = original;
        bouton.disabled = false;
      }, 1500);
    }
    function repli() {
      try {
        const champ = document.createElement("textarea");
        champ.value = texte;
        champ.style.position = "fixed";
        champ.style.opacity = "0";
        document.body.appendChild(champ);
        champ.select();
        document.execCommand("copy");
        champ.remove();
        confirmer();
      } catch (erreur) {
        alert("Impossible de copier automatiquement. Voici le lien :\n\n" + texte);
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texte).then(confirmer, repli);
    } else {
      repli();
    }
  }

  // Bascule la classe d'impression sur <body>, imprime, puis nettoie —
  // même si l'évènement « afterprint » n'est pas déclenché par le navigateur.
  function imprimerCartons() {
    document.body.classList.add("impression-qr");
    let nettoye = false;
    function nettoyer() {
      if (nettoye) return;
      nettoye = true;
      document.body.classList.remove("impression-qr");
      window.removeEventListener("afterprint", nettoyer);
    }
    window.addEventListener("afterprint", nettoyer);
    window.print();
    // Filet de sécurité si l'évènement afterprint ne se déclenche pas
    setTimeout(nettoyer, 1500);
  }

  // --------------------------------------------------------------------------
  // Construction des sections
  // --------------------------------------------------------------------------

  function construireAvertissement(urlBase) {
    const locale = estUrlLocale(urlBase);
    if (urlBase && !locale) return null;
    const carte = creerElement("div", "a-carte qr-avertissement");
    const p = creerElement("p");
    p.innerHTML =
      "⚠️ " +
      (urlBase
        ? "L'URL publique configurée pointe vers une adresse locale (" + urlBase + ")."
        : "Aucune URL publique n'est configurée pour le moment.") +
      " Les codes QR ci-dessous ne mèneront pas vos invités au bon endroit tant que " +
      "l'URL publique du site n'est pas définie dans l'onglet <strong>Publication</strong>.";
    carte.appendChild(p);
    return carte;
  }

  function construireCarteSite(urlEvenement, nomFichierSite) {
    const carte = creerElement("div", "a-carte");
    carte.appendChild(creerElement("h2", null, "Lien de l'événement"));

    const rangeeUrl = creerElement("div", "qr-rangee-url");
    const code = creerElement("code", "qr-url-texte", urlEvenement);
    const boutonCopier = creerElement("button", "a-bouton-contour", "Copier");
    boutonCopier.type = "button";
    boutonCopier.addEventListener("click", function () { copierTexte(urlEvenement, boutonCopier); });
    rangeeUrl.appendChild(code);
    rangeeUrl.appendChild(boutonCopier);
    carte.appendChild(rangeeUrl);

    const zone = creerElement("div", "qr-zone-site");
    const canvas = document.createElement("canvas");
    canvas.className = "qr-canvas qr-canvas-site";
    zone.appendChild(canvas);

    const actions = creerElement("div", "qr-colonne-actions");
    const boutonTelecharger = creerElement("button", "a-bouton", "Télécharger PNG");
    boutonTelecharger.type = "button";
    actions.appendChild(boutonTelecharger);
    zone.appendChild(actions);
    carte.appendChild(zone);

    try {
      window.dessinerQR(canvas, urlEvenement, 8, 4);
      boutonTelecharger.addEventListener("click", function () {
        telechargerCanvas(canvas, nomFichierSite);
      });
    } catch (erreur) {
      boutonTelecharger.disabled = true;
      carte.appendChild(creerElement("p", "a-note", "Erreur de génération du QR : " + erreur.message));
    }

    return carte;
  }

  // Construit une carte d'invité (nom + QR + légende + téléchargement) et
  // dessine son QR. `lien` est déjà l'URL complète à encoder.
  function construireCarteInvite(nom, lien, nomFichierPng) {
    const carte = creerElement("div", "qr-carte-invite");
    const canvas = document.createElement("canvas");
    canvas.className = "qr-canvas qr-canvas-invite";
    carte.appendChild(canvas);
    carte.appendChild(creerElement("p", "qr-invite-nom", nom));
    carte.appendChild(creerElement("p", "qr-carton-legende", "Scannez pour trouver votre place"));

    const boutonTelecharger = creerElement("button", "a-bouton-contour qr-invite-telecharger", "Télécharger PNG");
    boutonTelecharger.type = "button";
    carte.appendChild(boutonTelecharger);

    try {
      window.dessinerQR(canvas, lien, 4, 3);
      boutonTelecharger.addEventListener("click", function () {
        telechargerCanvas(canvas, nomFichierPng);
      });
    } catch (erreur) {
      boutonTelecharger.disabled = true;
      console.error("Impossible de générer le QR pour " + nom + " :", erreur.message);
    }

    return carte;
  }

  function listerInvites(config) {
    const liste = [];
    ((config.salle && config.salle.tables) || []).forEach(function (table) {
      (table.invites || []).forEach(function (nom) {
        liste.push(nom);
      });
    });
    return liste;
  }

  function construireCarteInvites(urlBase, slug, invites) {
    const carte = creerElement("div", "a-carte qr-section-invites");
    carte.appendChild(creerElement("h2", null, "QR personnalisés par invité"));

    if (!invites.length) {
      carte.appendChild(creerElement(
        "p", "a-note",
        "Aucun invité pour le moment — ajoutez des invités dans l'onglet Plan de salle."
      ));
      return carte;
    }

    const entete = creerElement("div", "qr-entete-invites");
    entete.appendChild(creerElement("p", "a-note", invites.length + " invité(s)"));
    const boutonImprimer = creerElement("button", "a-bouton", "🖨 Imprimer les cartons");
    boutonImprimer.type = "button";
    boutonImprimer.addEventListener("click", imprimerCartons);
    entete.appendChild(boutonImprimer);
    carte.appendChild(entete);

    const grille = creerElement("div", "qr-grille-invites");
    invites.forEach(function (nom) {
      const lien = urlBase + "index.html?e=" + slug + "&invite=" + encodeURIComponent(nom) + "#plan";
      const nomFichier = slug + "-" + nomFichierDepuis(nom) + "-qr.png";
      grille.appendChild(construireCarteInvite(nom, lien, nomFichier));
    });
    carte.appendChild(grille);

    return carte;
  }

  // --------------------------------------------------------------------------
  // Rendu principal
  // --------------------------------------------------------------------------

  function rendu(conteneur) {
    conteneur.innerHTML = "";

    const config = window.Admin.brouillon();
    const slug = window.Admin.slugCourant();
    const urlBase = window.Admin.urlBase();
    const urlEvenement = urlBase + "index.html?e=" + slug;

    const avertissement = construireAvertissement(urlBase);
    if (avertissement) conteneur.appendChild(avertissement);

    conteneur.appendChild(construireCarteSite(urlEvenement, slug + "-qr.png"));
    conteneur.appendChild(construireCarteInvites(urlBase, slug, listerInvites(config)));
  }

  window.Admin.onglets.push({ id: "qr", libelle: "Codes QR", ordre: 40, rendu: rendu });
})();
