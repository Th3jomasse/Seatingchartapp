// ============================================================================
// Page « Codes QR » (organisateur) : génère le QR du site et un QR par
// invité (lien profond vers sa table), avec téléchargement PNG et impression
// de cartons prêts à découper.
// ============================================================================

(function () {
  "use strict";
  const el = AppUtils.el;

  const champUrl = document.getElementById("qr-url-base");
  const canvasSite = document.getElementById("qr-canvas-site");
  const urlSiteAffichee = document.getElementById("qr-site-url-affiche");
  const boutonTelechargerSite = document.getElementById("qr-telecharger-site");
  const grilleInvites = document.getElementById("qr-grille-invites");
  const boutonImprimer = document.getElementById("qr-imprimer");

  // ---------------------------------------------------------------- Utilitaires

  // Devine l'adresse du site à partir de l'URL courante de cette page
  // (retire "qr.html" ainsi que les paramètres et l'ancre, s'il y a lieu).
  function urlBaseParDefaut() {
    let url = location.href.split("#")[0].split("?")[0];
    url = url.replace(/qr\.html$/i, "");
    return url;
  }

  // Construit le lien profond d'un invité à partir de l'URL de base, en
  // évitant de doubler "index.html" si l'URL de base l'inclut déjà.
  function construireLienInvite(urlBase, nom) {
    let base = (urlBase || "").trim();
    if (!base) return "";
    base = base.replace(/index\.html$/i, "");
    if (!base.endsWith("/")) base += "/";
    return base + "index.html?invite=" + encodeURIComponent(nom) + "#plan";
  }

  // Nom de fichier « propre » (sans accents ni caractères spéciaux) pour le téléchargement
  function nomDeFichier(texte) {
    const propre = AppUtils.normaliser(texte).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return (propre || "qr") + ".png";
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

  // ------------------------------------------------------------- Construction

  // Construit (une seule fois) la grille de cartes invités, avec un canvas vide
  // par invité. Les QR sont ensuite (re)dessinés par regenererTout().
  let cartesInvites = []; // { invite, canvas }
  function construireGrilleInvites() {
    grilleInvites.innerHTML = "";
    cartesInvites = [];

    if (!AppUtils.tousLesInvites.length) {
      grilleInvites.appendChild(el("p", "qr-vide", "Aucun invité dans la configuration (CONFIG.salle.tables)."));
      return;
    }

    AppUtils.tousLesInvites.forEach(function (invite) {
      const carte = el("div", "carte qr-carte-invite");
      const canvas = document.createElement("canvas");
      canvas.className = "qr-canvas";
      carte.appendChild(canvas);
      carte.appendChild(el("p", "qr-invite-nom", invite.nom));
      carte.appendChild(el("p", "qr-carton-legende", "Scannez pour trouver votre place"));

      const boutonTelecharger = el("button", "qr-bouton-telecharger no-print", "Télécharger PNG");
      boutonTelecharger.type = "button";
      boutonTelecharger.addEventListener("click", function () {
        telechargerCanvas(canvas, nomDeFichier(invite.nom));
      });
      carte.appendChild(boutonTelecharger);

      grilleInvites.appendChild(carte);
      cartesInvites.push({ invite: invite, canvas: canvas });
    });
  }

  // (Re)dessine le QR du site et tous les QR d'invités à partir de l'URL de base actuelle
  function regenererTout() {
    const urlBase = champUrl.value.trim() || urlBaseParDefaut();

    // QR du site
    try {
      dessinerQR(canvasSite, urlBase, 6, 4);
      urlSiteAffichee.textContent = urlBase;
      boutonTelechargerSite.disabled = false;
    } catch (erreur) {
      urlSiteAffichee.textContent = "Erreur : " + erreur.message;
      boutonTelechargerSite.disabled = true;
    }

    // QR par invité
    cartesInvites.forEach(function (item) {
      const lien = construireLienInvite(urlBase, item.invite.nom);
      try {
        dessinerQR(item.canvas, lien, 5, 4);
      } catch (erreur) {
        // Laisse le canvas tel quel et signale l'erreur dans la console —
        // n'arrête pas la génération des autres invités.
        console.error("Impossible de générer le QR pour " + item.invite.nom + " :", erreur.message);
      }
    });
  }

  // Petite temporisation pour éviter de régénérer 48 QR à chaque frappe
  let minuteur = null;
  function regenererAvecDelai() {
    if (minuteur) clearTimeout(minuteur);
    minuteur = setTimeout(regenererTout, 250);
  }

  // ------------------------------------------------------------------- Départ

  document.title = "Codes QR — " + CONFIG.event.titre;

  champUrl.value = urlBaseParDefaut();
  champUrl.addEventListener("input", regenererAvecDelai);

  boutonTelechargerSite.addEventListener("click", function () {
    telechargerCanvas(canvasSite, "qr-site.png");
  });

  boutonImprimer.addEventListener("click", function () {
    window.print();
  });

  construireGrilleInvites();
  regenererTout();
})();
