// ============================================================================
// Page : Accueil
// ============================================================================

(function () {
  "use strict";
  const el = AppUtils.el;

  // Extrait les initiales du titre de l'événement pour le monogramme.
  // Mariage : « Sophie & Mathieu » → « S · M ». Entreprise : première lettre.
  function extraireInitiales(titre) {
    if (!titre) return "";
    const propre = titre.trim();
    if (!propre) return "";

    if (!AppUtils.estMariage) {
      return propre.charAt(0).toLocaleUpperCase("fr-FR");
    }

    const parties = propre
      .split(/\s*(?:&|\+|,|\bet\b)\s*/i)
      .map(function (p) { return p.trim(); })
      .filter(Boolean);

    if (parties.length >= 2) {
      return parties
        .slice(0, 2)
        .map(function (p) { return p.charAt(0).toLocaleUpperCase("fr-FR"); })
        .join(" · ");
    }

    // Repli : pas de séparateur reconnu, on prend le premier et le dernier mot
    const mots = propre.split(/\s+/).filter(Boolean);
    if (mots.length >= 2) {
      return mots[0].charAt(0).toLocaleUpperCase("fr-FR") +
        " · " + mots[mots.length - 1].charAt(0).toLocaleUpperCase("fr-FR");
    }
    return mots.length ? mots[0].charAt(0).toLocaleUpperCase("fr-FR") : "";
  }

  // Construit le bloc « compte à rebours » (ou renvoie null si non configuré).
  // L'intervalle se nettoie automatiquement dès que la section quitte le DOM
  // (navigation vers une autre page), évitant toute fuite mémoire.
  function creerCompteARebours() {
    if (!CONFIG.event.dateISO) return null;

    const cible = new Date(CONFIG.event.dateISO);
    if (isNaN(cible.getTime())) return null;

    // Minuit suivant la date de l'événement (fin du « jour J »)
    const finDuJour = new Date(
      cible.getFullYear(), cible.getMonth(), cible.getDate() + 1, 0, 0, 0, 0
    );

    // Si l'événement est déjà complètement terminé, ne rien afficher
    if (Date.now() >= finDuJour.getTime()) return null;

    const section = el("section", "compte-rebours anim-entree anim-5");
    section.appendChild(el("p", "compte-rebours-titre", "Compte à rebours"));

    const grille = el("div", "compte-rebours-grille");
    const unites = [
      { libelle: "jours", nombre: el("span", "compte-rebours-nombre", "00") },
      { libelle: "heures", nombre: el("span", "compte-rebours-nombre", "00") },
      { libelle: "minutes", nombre: el("span", "compte-rebours-nombre", "00") },
      { libelle: "secondes", nombre: el("span", "compte-rebours-nombre", "00") },
    ];
    unites.forEach(function (u) {
      const bloc = el("div", "compte-rebours-unite");
      bloc.appendChild(u.nombre);
      bloc.appendChild(el("span", "compte-rebours-libelle", u.libelle));
      grille.appendChild(bloc);
    });
    section.appendChild(grille);

    const messageAujourdhui = el("p", "compte-rebours-aujourdhui", "C'est aujourd'hui! ");
    messageAujourdhui.appendChild(Icones.creer("fete", 20));
    messageAujourdhui.hidden = true;
    section.appendChild(messageAujourdhui);

    function pad(n) { return String(n).padStart(2, "0"); }

    // Calcule et affiche l'état courant. Ne dépend pas de la présence dans le
    // DOM : utilisée pour le premier affichage (avant l'ajout à la page) et
    // pour chaque battement de l'intervalle.
    function calculerEtAfficher() {
      const maintenant = Date.now();

      if (maintenant < cible.getTime()) {
        const diff = cible.getTime() - maintenant;
        unites[0].nombre.textContent = pad(Math.floor(diff / 86400000));
        unites[1].nombre.textContent = pad(Math.floor((diff % 86400000) / 3600000));
        unites[2].nombre.textContent = pad(Math.floor((diff % 3600000) / 60000));
        unites[3].nombre.textContent = pad(Math.floor((diff % 60000) / 1000));
        grille.hidden = false;
        messageAujourdhui.hidden = true;
      } else if (maintenant < finDuJour.getTime()) {
        grille.hidden = true;
        messageAujourdhui.hidden = false;
      } else {
        clearInterval(intervalId);
        section.remove();
      }
    }

    // Battement périodique : ne fait rien (et coupe l'intervalle) dès que la
    // section n'est plus attachée au DOM — le rendu de page vide
    // contenu.innerHTML à chaque navigation, sans jamais rappeler ce module.
    function tic() {
      if (!section.isConnected) {
        clearInterval(intervalId);
        return;
      }
      calculerEtAfficher();
    }

    const intervalId = setInterval(tic, 1000);
    calculerEtAfficher();
    return section;
  }

  function rendreAccueil(racine) {
    const hero = el("section", "hero");

    const initiales = extraireInitiales(CONFIG.event.titre);
    if (initiales) {
      const monogramme = el("div", "monogramme anim-entree anim-1");
      const cercle = el("div", "monogramme-cercle");
      cercle.appendChild(el("span", "monogramme-lettres", initiales));
      monogramme.appendChild(cercle);
      hero.appendChild(monogramme);
    }

    hero.appendChild(el("p", "hero-ornement anim-entree anim-2", "✦"));
    hero.appendChild(el("h2", "hero-titre anim-entree anim-2", CONFIG.event.titre));
    if (CONFIG.event.sousTitre) {
      hero.appendChild(el("p", "hero-sous-titre anim-entree anim-3", CONFIG.event.sousTitre));
    }
    hero.appendChild(el("div", "hero-separateur anim-entree anim-3"));
    const infos = el("p", "hero-infos anim-entree anim-4");
    infos.textContent = [CONFIG.event.date, CONFIG.event.lieu].filter(Boolean).join(" · ");
    hero.appendChild(infos);
    racine.appendChild(hero);

    const compteARebours = creerCompteARebours();
    if (compteARebours) racine.appendChild(compteARebours);

    if (CONFIG.event.messageBienvenue) {
      const carte = el("section", "carte anim-entree anim-6");
      carte.appendChild(el("p", "texte-centre", CONFIG.event.messageBienvenue));
      racine.appendChild(carte);
    }

    // Raccourcis vers les autres pages
    const pages = window.PAGES_MODULES
      .filter(function (p) { return p.active && p.id !== "accueil"; })
      .sort(function (a, b) { return a.ordre - b.ordre; });
    const raccourcis = el("section", "raccourcis anim-entree anim-7");
    pages.forEach(function (page) {
      const b = el("button", "raccourci");
      const iconeRaccourci = el("span", "raccourci-icone");
      iconeRaccourci.appendChild(Icones.creer(page.icone, 26));
      b.appendChild(iconeRaccourci);
      b.appendChild(el("span", "", page.libelle));
      b.addEventListener("click", function () { location.hash = page.id; });
      raccourcis.appendChild(b);
    });
    racine.appendChild(raccourcis);
  }

  window.PAGES_MODULES.push({
    id: "accueil",
    ordre: 10,
    libelle: "Accueil",
    icone: "accueil",
    active: true,
    rendu: rendreAccueil,
  });
})();
