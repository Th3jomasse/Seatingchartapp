// ============================================================================
// Page : Photos
// ============================================================================

(function () {
  "use strict";
  const el = AppUtils.el;

  // Copie un texte dans le presse-papiers, avec repli pour les vieux navigateurs
  function copierTexte(texte, callback) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(texte)
        .then(function () {
          if (callback) callback(true);
        })
        .catch(function () {
          copierTexteRepli(texte, callback);
        });
    } else {
      copierTexteRepli(texte, callback);
    }
  }

  // Repli via un champ temporaire + document.execCommand("copy")
  function copierTexteRepli(texte, callback) {
    const zone = document.createElement("textarea");
    zone.value = texte;
    zone.setAttribute("readonly", "");
    zone.style.position = "fixed";
    zone.style.top = "0";
    zone.style.left = "0";
    zone.style.opacity = "0";
    document.body.appendChild(zone);
    zone.focus();
    zone.select();
    let succes = false;
    try {
      succes = document.execCommand("copy");
    } catch (erreur) {
      succes = false;
    }
    document.body.removeChild(zone);
    if (callback) callback(succes);
  }

  function rendrePhotos(racine) {
    const section = el("section");
    section.appendChild(el("h2", "titre-page", CONFIG.photos.titre));
    const carte = el("div", "carte texte-centre photos-carte");
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

    // Boutons secondaires : copier le lien, et partager (si pris en charge)
    const actions = el("div", "photos-actions");

    const boutonCopier = el("button", "bouton-secondaire", "Copier le lien");
    boutonCopier.type = "button";
    const confirmation = el("p", "photos-confirmation");
    confirmation.setAttribute("aria-live", "polite");
    let minuteurConfirmation = null;
    boutonCopier.addEventListener("click", function () {
      copierTexte(CONFIG.photos.lien, function (succes) {
        confirmation.textContent = succes ? "Lien copié ✓" : "Impossible de copier le lien";
        confirmation.classList.add("visible");
        clearTimeout(minuteurConfirmation);
        minuteurConfirmation = setTimeout(function () {
          confirmation.classList.remove("visible");
        }, 2000);
      });
    });
    actions.appendChild(boutonCopier);

    if (navigator.share) {
      const boutonPartager = el("button", "bouton-secondaire", "Partager");
      boutonPartager.type = "button";
      boutonPartager.addEventListener("click", function () {
        navigator
          .share({
            title: CONFIG.photos.titre,
            text: CONFIG.photos.description,
            url: CONFIG.photos.lien,
          })
          .catch(function () {
            /* partage annulé par l'utilisateur : rien à faire */
          });
      });
      actions.appendChild(boutonPartager);
    }

    carte.appendChild(actions);
    carte.appendChild(confirmation);

    section.appendChild(carte);
    racine.appendChild(section);
  }

  window.PAGES_MODULES.push({
    id: "photos",
    ordre: 40,
    libelle: "Photos",
    icone: "📸",
    active: CONFIG.pages.photos,
    rendu: rendrePhotos,
  });
})();
