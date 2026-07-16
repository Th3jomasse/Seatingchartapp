// ============================================================================
// Chargeur multi-événements
// Détermine quel événement afficher, charge sa configuration, puis démarre
// l'application. Trois sources possibles, dans l'ordre :
//   1. Mode aperçu (?apercu=1) : la config arrive du tableau de bord
//      (admin.html) par postMessage — utilisé pour l'aperçu en direct.
//   2. Fichier evenements/<slug>.json — le slug vient de ?e=<slug> dans
//      l'URL, sinon de « parDefaut » dans evenements/index.json.
//   3. Repli : l'objet CONFIG de js/config.js (déjà chargé), utile en
//      ouverture directe du fichier (file://) ou si les JSON sont absents.
// ============================================================================

(function () {
  "use strict";

  // Les scripts de l'app, démarrés seulement une fois la config connue
  const SCRIPTS = [
    "js/utils.js",
    "js/icones.js",
    "js/page-accueil.js",
    "js/page-plan.js",
    "js/page-menu.js",
    "js/page-photos.js",
    "js/page-infos.js",
    "js/page-apropos.js",
    "js/app.js",
    "js/pwa.js",
  ];

  let demarre = false;
  function demarrer(config) {
    if (demarre) return;
    demarre = true;
    if (config) window.CONFIG = config;
    SCRIPTS.forEach(function (src) {
      const script = document.createElement("script");
      script.src = src;
      script.async = false; // préserve l'ordre d'exécution
      document.body.appendChild(script);
    });
  }

  const params = new URLSearchParams(location.search);

  // --- Mode aperçu (iframe du tableau de bord) -----------------------------
  if (params.has("apercu")) {
    window.addEventListener("message", function (evenement) {
      if (evenement.data && evenement.data.type === "config" && evenement.data.config) {
        demarrer(evenement.data.config);
      }
    });
    if (window.parent !== window) {
      window.parent.postMessage({ type: "pret" }, "*");
    }
    // Sécurité : si aucune config ne vient après 3 s, démarrer avec le repli
    setTimeout(function () { demarrer(null); }, 3000);
    return;
  }

  // --- Chargement normal ----------------------------------------------------
  const slugDemande = params.get("e");

  fetch("evenements/index.json")
    .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function (index) {
      const existe = (index.evenements || []).some(function (e) { return e.slug === slugDemande; });
      const slug = existe ? slugDemande : index.parDefaut;
      if (!slug) throw new Error();
      return fetch("evenements/" + encodeURIComponent(slug) + ".json")
        .then(function (r) { if (!r.ok) throw new Error(); return r.json(); });
    })
    .then(demarrer)
    .catch(function () { demarrer(null); }); // repli : CONFIG de js/config.js
})();
