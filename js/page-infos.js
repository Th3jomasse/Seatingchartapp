// ============================================================================
// Page : Infos pratiques
// ============================================================================

(function () {
  "use strict";
  const el = AppUtils.el;

  // Crée une carte avec une petite icône et un titre en en-tête
  function creerCarte(nomIcone, titre) {
    const carte = el("div", "carte infos-carte");
    const entete = el("div", "infos-entete");
    const icone = el("span", "infos-icone");
    icone.appendChild(Icones.creer(nomIcone, 22));
    entete.appendChild(icone);
    entete.appendChild(el("h3", "infos-titre", titre));
    carte.appendChild(entete);
    return carte;
  }

  function rendreInfos(racine) {
    const section = el("section");
    section.appendChild(el("h2", "titre-page", "Infos pratiques"));
    const infos = CONFIG.infos || {};

    // Adresse
    if (infos.adresse) {
      const carte = creerCarte("adresse", "Adresse");
      carte.appendChild(el("p", "infos-texte", infos.adresse));
      if (infos.googleMapsLien) {
        const lien = el("a", "bouton-principal", "Ouvrir dans Google Maps");
        lien.href = infos.googleMapsLien;
        lien.target = "_blank";
        lien.rel = "noopener";
        carte.appendChild(lien);
      }
      section.appendChild(carte);
    }

    // Stationnement
    if (infos.stationnement) {
      const carte = creerCarte("stationnement", "Stationnement");
      carte.appendChild(el("p", "infos-texte", infos.stationnement));
      section.appendChild(carte);
    }

    // Hébergement
    if (infos.hebergement) {
      const carte = creerCarte("hebergement", "Hébergement");
      carte.appendChild(el("p", "infos-texte", infos.hebergement));
      section.appendChild(carte);
    }

    // Code vestimentaire
    if (infos.codeVestimentaire) {
      const carte = creerCarte("vestimentaire", "Code vestimentaire");
      carte.appendChild(el("p", "infos-texte", infos.codeVestimentaire));
      section.appendChild(carte);
    }

    // Une question?
    const contact = infos.contact || {};
    if (contact.nom || contact.telephone || contact.courriel) {
      const carte = creerCarte("question", "Une question?");
      if (contact.nom) {
        carte.appendChild(el("p", "infos-texte", contact.nom));
      }
      const liensContact = el("div", "infos-contact-liens");
      if (contact.telephone) {
        const lienTel = el("a", "infos-lien-contact");
        lienTel.appendChild(Icones.creer("telephone", 16));
        lienTel.appendChild(el("span", "", contact.telephone));
        lienTel.href = "tel:" + contact.telephone.replace(/\s+/g, "");
        liensContact.appendChild(lienTel);
      }
      if (contact.courriel) {
        const lienCourriel = el("a", "infos-lien-contact");
        lienCourriel.appendChild(Icones.creer("courriel", 16));
        lienCourriel.appendChild(el("span", "", contact.courriel));
        lienCourriel.href = "mailto:" + contact.courriel;
        liensContact.appendChild(lienCourriel);
      }
      carte.appendChild(liensContact);
      section.appendChild(carte);
    }

    // RSVP
    if (infos.rsvpLien) {
      const carte = creerCarte("rsvp", "RSVP");
      carte.appendChild(el("p", "infos-texte", "Merci de confirmer votre présence dès que possible."));
      const lienRsvp = el("a", "bouton-principal", "Confirmer ma présence");
      lienRsvp.href = infos.rsvpLien;
      lienRsvp.target = "_blank";
      lienRsvp.rel = "noopener";
      carte.appendChild(lienRsvp);
      section.appendChild(carte);
    }

    racine.appendChild(section);
  }

  window.PAGES_MODULES.push({
    id: "infos",
    ordre: 50,
    libelle: "Infos",
    icone: "infos",
    active: CONFIG.pages.infos,
    rendu: rendreInfos,
  });
})();
