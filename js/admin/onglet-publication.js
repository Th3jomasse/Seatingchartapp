// ============================================================================
// Onglet « Publication » (tableau de bord)
//
// Permet de publier les événements directement depuis le navigateur, sans
// quitter la page, via l'API REST « Contents » de GitHub (api.github.com
// autorise les requêtes CORS depuis n'importe quelle origine).
//
// Deux cartes :
//   - Réglages : propriétaire/dépôt/branche/URL publique + jeton GitHub;
//   - Publier  : liste des événements, publication individuelle ou globale.
//
// Rendu détruit/recréé à chaque changement d'événement ou d'activation
// d'onglet : toutes les références DOM utilisées ici vivent dans la fermeture
// de rendu(conteneur) et sont donc jetées avec le conteneur. La SEULE
// exception volontaire est `jetonSession`, une variable de module qui
// conserve le jeton GitHub en mémoire pour la durée de la session du
// navigateur lorsque l'utilisateur choisit de ne pas le mémoriser sur
// l'appareil (voir mission : « garder le jeton seulement en mémoire de
// session »). Ce n'est pas un état d'interface — juste un secret volatil.
// ============================================================================

(function () {
  "use strict";

  // Jeton GitHub conservé en mémoire (jamais persisté) quand l'utilisateur
  // décoche « Mémoriser le jeton sur cet appareil ».
  let jetonSession = "";

  // --------------------------------------------------------------------------
  // Utilitaires : encodage, requêtes GitHub, messages d'erreur
  // --------------------------------------------------------------------------

  // Encode une chaîne UTF-8 en base64, par blocs, pour éviter tout
  // dépassement de la pile d'arguments de String.fromCharCode sur les gros
  // fichiers (String.fromCharCode.apply avec des dizaines de milliers
  // d'arguments peut échouer selon le moteur JS).
  function base64DepuisTexte(texte) {
    const octets = new TextEncoder().encode(texte);
    let binaire = "";
    const tailleBloc = 0x8000;
    for (let i = 0; i < octets.length; i += tailleBloc) {
      const bloc = octets.subarray(i, i + tailleBloc);
      binaire += String.fromCharCode.apply(null, bloc);
    }
    return btoa(binaire);
  }

  function enTetesGithub(jeton) {
    return {
      "Authorization": "Bearer " + jeton,
      "Accept": "application/vnd.github+json",
    };
  }

  function urlContenu(github, chemin) {
    return "https://api.github.com/repos/" + encodeURIComponent(github.owner) +
      "/" + encodeURIComponent(github.repo) + "/contents/" + chemin;
  }

  // Construit un message d'erreur français actionnable à partir d'une
  // réponse HTTP non satisfaisante.
  async function erreurDepuisReponse(reponse) {
    let detail = "";
    try {
      const corps = await reponse.json();
      if (corps && corps.message) detail = corps.message;
    } catch (e) { /* corps non-JSON ou vide : ignoré */ }

    let message;
    if (reponse.status === 401) {
      message = "Jeton GitHub invalide ou expiré. Vérifiez-le dans la carte « Réglages » ci-dessous.";
    } else if (reponse.status === 403) {
      message = "Accès refusé par GitHub (403). Le jeton n'a probablement pas la permission « Contents : Read and write » sur ce dépôt.";
    } else if (reponse.status === 404) {
      message = "Dépôt ou branche introuvable (404). Vérifiez le propriétaire, le nom du dépôt et la branche dans les réglages.";
    } else if (reponse.status === 409 || reponse.status === 422) {
      message = "Conflit lors de l'écriture du fichier (" + reponse.status + "). Une nouvelle tentative a échoué — réessayez dans un instant.";
    } else {
      message = "Erreur GitHub (" + reponse.status + ")" + (detail ? " : " + detail : "") + ".";
    }
    const erreur = new Error(message);
    erreur.statutHttp = reponse.status;
    return erreur;
  }

  // Récupère le sha courant d'un fichier (null si le fichier n'existe pas encore).
  async function obtenirSha(github, jeton, chemin) {
    let reponse;
    try {
      reponse = await fetch(urlContenu(github, chemin) + "?ref=" + encodeURIComponent(github.branche), {
        headers: enTetesGithub(jeton),
      });
    } catch (e) {
      throw new Error("Impossible de joindre l'API GitHub. Vérifiez votre connexion internet.");
    }
    if (reponse.status === 404) return null;
    if (!reponse.ok) throw await erreurDepuisReponse(reponse);
    const donnees = await reponse.json();
    return donnees.sha;
  }

  // Publie (crée ou met à jour) un fichier via l'API Contents. Retente une
  // fois en cas de conflit de sha (409/422) : un GET frais puis un nouveau PUT.
  async function publierFichier(github, jeton, chemin, contenuTexte, message, tentative) {
    tentative = tentative || 1;
    const sha = await obtenirSha(github, jeton, chemin);

    const corps = {
      message: message,
      content: base64DepuisTexte(contenuTexte),
      branch: github.branche,
    };
    if (sha) corps.sha = sha;

    let reponse;
    try {
      reponse = await fetch(urlContenu(github, chemin), {
        method: "PUT",
        headers: Object.assign({ "Content-Type": "application/json" }, enTetesGithub(jeton)),
        body: JSON.stringify(corps),
      });
    } catch (e) {
      throw new Error("Impossible de joindre l'API GitHub. Vérifiez votre connexion internet.");
    }

    if (reponse.ok) return reponse.json();

    if ((reponse.status === 409 || reponse.status === 422) && tentative < 2) {
      return publierFichier(github, jeton, chemin, contenuTexte, message, tentative + 1);
    }
    throw await erreurDepuisReponse(reponse);
  }

  // --------------------------------------------------------------------------
  // Logique de publication
  // --------------------------------------------------------------------------

  function jetonActuel() {
    const reglages = window.Admin.reglages();
    return reglages.github.memoriser ? (reglages.github.jeton || "") : jetonSession;
  }

  function verifierPrerequis() {
    const reglages = window.Admin.reglages();
    const github = reglages.github || {};
    if (!github.owner || !github.repo || !github.branche) {
      throw new Error("Réglages GitHub incomplets : renseignez le propriétaire, le dépôt et la branche dans la carte « Réglages ».");
    }
    if (!jetonActuel()) {
      throw new Error("Aucun jeton GitHub renseigné. Ajoutez-le dans la carte « Réglages » ci-dessous.");
    }
  }

  function indexPourPublication() {
    const index = window.Admin.index();
    return {
      parDefaut: index.parDefaut,
      evenements: index.evenements.map(function (e) {
        return { slug: e.slug, titre: e.titre, date: e.date };
      }),
    };
  }

  async function publierUnEvenement(slug, journal) {
    const reglages = window.Admin.reglages();
    const jeton = jetonActuel();
    const config = window.Admin.configDe(slug);
    const entree = window.Admin.index().evenements.find(function (e) { return e.slug === slug; }) || {};
    const titre = entree.titre || slug;

    journal("Publication de « " + titre + " »…");
    await publierFichier(
      reglages.github, jeton,
      "evenements/" + slug + ".json",
      JSON.stringify(config, null, 2),
      "Publication de l'événement " + titre
    );
    window.Admin.marquerPublie(slug);
    journal("« " + titre + " » publié.");
  }

  async function publierIndex(journal) {
    const reglages = window.Admin.reglages();
    const jeton = jetonActuel();
    journal("Mise à jour de l'index des événements…");
    await publierFichier(
      reglages.github, jeton,
      "evenements/index.json",
      JSON.stringify(indexPourPublication(), null, 2),
      "Mise à jour de l'index des événements"
    );
    journal("Index des événements mis à jour.");
  }

  // --------------------------------------------------------------------------
  // Petits utilitaires DOM
  // --------------------------------------------------------------------------

  function creerElement(balise, className, texte) {
    const el = document.createElement(balise);
    if (className) el.className = className;
    if (texte !== undefined) el.textContent = texte;
    return el;
  }

  function creerChamp(libelle, type, valeur, note) {
    const champ = creerElement("div", "a-champ");
    const label = creerElement("label", null, libelle);
    const input = document.createElement("input");
    input.type = type;
    input.value = valeur || "";
    champ.appendChild(label);
    champ.appendChild(input);
    if (note) champ.appendChild(creerElement("p", "a-note", note));
    return { champ: champ, input: input };
  }

  function lienActions(github) {
    return "https://github.com/" + github.owner + "/" + github.repo + "/actions";
  }

  // --------------------------------------------------------------------------
  // Carte Réglages
  // --------------------------------------------------------------------------

  function construireCarteReglages() {
    const reglages = window.Admin.reglages();
    const github = reglages.github || (reglages.github = { owner: "", repo: "", branche: "", jeton: "", memoriser: false });

    const carte = creerElement("div", "a-carte");
    carte.appendChild(creerElement("h2", null, "Réglages"));

    const rangee1 = creerElement("div", "a-rangee");
    const champOwner = creerChamp("Propriétaire (owner)", "text", github.owner);
    const champRepo = creerChamp("Dépôt (repo)", "text", github.repo);
    rangee1.appendChild(champOwner.champ);
    rangee1.appendChild(champRepo.champ);
    carte.appendChild(rangee1);

    const rangee2 = creerElement("div", "a-rangee");
    const champBranche = creerChamp("Branche", "text", github.branche);
    const champUrlBase = creerChamp("URL publique du site", "url", reglages.urlBase, "Doit se terminer par un « / », ex. : https://mon-compte.github.io/mon-depot/");
    rangee2.appendChild(champBranche.champ);
    rangee2.appendChild(champUrlBase.champ);
    carte.appendChild(rangee2);

    const champJetonInfo = creerChamp(
      "Jeton GitHub (fine-grained)", "password",
      github.memoriser ? (github.jeton || "") : jetonSession
    );
    carte.appendChild(champJetonInfo.champ);
    const champJeton = champJetonInfo.input;
    champJeton.addEventListener("input", function () {
      jetonSession = champJeton.value;
    });

    const ligneMemoriser = creerElement("label", "pub-case-ligne");
    const caseMemoriser = document.createElement("input");
    caseMemoriser.type = "checkbox";
    caseMemoriser.checked = !!github.memoriser;
    ligneMemoriser.appendChild(caseMemoriser);
    ligneMemoriser.appendChild(document.createTextNode(" Mémoriser le jeton sur cet appareil"));
    carte.appendChild(ligneMemoriser);

    const aide = document.createElement("details");
    aide.className = "pub-aide";
    const resume = document.createElement("summary");
    resume.textContent = "Comment créer un jeton GitHub ?";
    aide.appendChild(resume);
    const etapes = creerElement("ol", "pub-aide-etapes");
    [
      "Allez sur github.com/settings/personal-access-tokens.",
      "Choisissez « Fine-grained tokens » puis « Generate new token ».",
      "Limitez l'accès au seul dépôt de ce site (Repository access → Only select repositories).",
      "Sous Permissions, accordez « Contents : Read and write ».",
      "Générez le jeton, copiez-le, puis collez-le dans le champ ci-dessus.",
    ].forEach(function (etape) { etapes.appendChild(creerElement("li", null, etape)); });
    aide.appendChild(etapes);
    carte.appendChild(aide);

    const boutonEnregistrer = creerElement("button", "a-bouton", "Enregistrer les réglages");
    boutonEnregistrer.type = "button";
    const confirmationSpan = creerElement("span", "a-note pub-confirmation");
    boutonEnregistrer.addEventListener("click", function () {
      github.owner = champOwner.input.value.trim();
      github.repo = champRepo.input.value.trim();
      github.branche = champBranche.input.value.trim();
      reglages.urlBase = champUrlBase.input.value.trim();
      github.memoriser = caseMemoriser.checked;
      if (github.memoriser) {
        github.jeton = champJeton.value;
      } else {
        github.jeton = "";
        jetonSession = champJeton.value;
      }
      window.Admin.sauverReglages();
      confirmationSpan.textContent = "Réglages enregistrés.";
      setTimeout(function () { confirmationSpan.textContent = ""; }, 2500);
    });
    carte.appendChild(boutonEnregistrer);
    carte.appendChild(confirmationSpan);

    return carte;
  }

  // --------------------------------------------------------------------------
  // Carte Publier
  // --------------------------------------------------------------------------

  function construireCartePublier() {
    const carte = creerElement("div", "a-carte");
    const entete = creerElement("div", "pub-entete-publier");
    entete.appendChild(creerElement("h2", null, "Publier"));
    const boutonToutPublier = creerElement("button", "a-bouton", "Tout publier");
    boutonToutPublier.type = "button";
    entete.appendChild(boutonToutPublier);
    carte.appendChild(entete);

    const zoneStatut = creerElement("div", "pub-statut");
    carte.appendChild(zoneStatut);

    const journalEl = creerElement("ul", "pub-journal");
    carte.appendChild(journalEl);

    function journal(texte) {
      const ligne = creerElement("li", null, texte);
      journalEl.appendChild(ligne);
      journalEl.scrollTop = journalEl.scrollHeight;
    }

    function afficherStatut(type, texte, github) {
      zoneStatut.innerHTML = "";
      zoneStatut.className = "pub-statut pub-statut-" + type;
      zoneStatut.appendChild(creerElement("p", null, texte));
      if (type === "succes" && github && github.owner && github.repo) {
        const lien = document.createElement("a");
        lien.href = lienActions(github);
        lien.target = "_blank";
        lien.rel = "noopener";
        lien.textContent = "Voir la progression du déploiement →";
        zoneStatut.appendChild(lien);
      }
    }

    const liste = creerElement("div", "pub-liste-evenements");
    carte.appendChild(liste);

    const lignesParSlug = {};

    function construireLigne(entree) {
      const ligne = creerElement("div", "pub-rangee-evenement");
      const infos = creerElement("div", "pub-rangee-infos");
      const titre = creerElement("span", "pub-rangee-titre", entree.titre || entree.slug);
      infos.appendChild(titre);
      if (entree.modifie) {
        infos.appendChild(creerElement("span", "pub-pastille", "à publier"));
      }
      ligne.appendChild(infos);

      const boutonPublier = creerElement("button", "a-bouton-contour", "Publier cet événement");
      boutonPublier.type = "button";
      boutonPublier.addEventListener("click", function () {
        publierUnSeul(entree.slug);
      });
      ligne.appendChild(boutonPublier);

      lignesParSlug[entree.slug] = { ligne: ligne, infos: infos, bouton: boutonPublier, titre: titre };
      return ligne;
    }

    function rafraichirListe() {
      liste.innerHTML = "";
      Object.keys(lignesParSlug).forEach(function (slug) { delete lignesParSlug[slug]; });
      window.Admin.index().evenements.forEach(function (entree) {
        liste.appendChild(construireLigne(entree));
      });
    }
    rafraichirListe();

    function definirEnCours(enCours) {
      boutonToutPublier.disabled = enCours;
      Object.keys(lignesParSlug).forEach(function (slug) {
        lignesParSlug[slug].bouton.disabled = enCours;
      });
    }

    async function publierUnSeul(slug) {
      journalEl.innerHTML = "";
      afficherStatut("info", "Publication en cours…");
      definirEnCours(true);
      try {
        verifierPrerequis();
        await publierUnEvenement(slug, journal);
        await publierIndex(journal);
        rafraichirListe();
        afficherStatut("succes", "Publié — le site se met à jour d'ici ~1 minute.", window.Admin.reglages().github);
      } catch (erreur) {
        afficherStatut("erreur", erreur.message || "Erreur inattendue lors de la publication.");
      } finally {
        definirEnCours(false);
      }
    }

    async function publierTout() {
      journalEl.innerHTML = "";
      const aPublier = window.Admin.index().evenements.filter(function (e) { return e.modifie; });
      if (!aPublier.length) {
        afficherStatut("info", "Rien à publier — tous les événements sont déjà publiés.");
        return;
      }
      afficherStatut("info", "Publication de " + aPublier.length + " événement(s) en cours…");
      definirEnCours(true);
      try {
        verifierPrerequis();
        for (const entree of aPublier) {
          await publierUnEvenement(entree.slug, journal);
        }
        await publierIndex(journal);
        rafraichirListe();
        afficherStatut("succes", "Publié — le site se met à jour d'ici ~1 minute.", window.Admin.reglages().github);
      } catch (erreur) {
        afficherStatut("erreur", erreur.message || "Erreur inattendue lors de la publication.");
      } finally {
        definirEnCours(false);
      }
    }

    boutonToutPublier.addEventListener("click", publierTout);

    return carte;
  }

  // --------------------------------------------------------------------------
  // Rendu principal
  // --------------------------------------------------------------------------

  function rendu(conteneur) {
    conteneur.innerHTML = "";
    conteneur.appendChild(construireCarteReglages());
    conteneur.appendChild(construireCartePublier());
  }

  window.Admin.onglets.push({ id: "publication", libelle: "Publication", ordre: 50, rendu: rendu });
})();
