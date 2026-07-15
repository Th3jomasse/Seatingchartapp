// ============================================================================
// PWA — enregistrement du service worker
// Ne s'exécute que dans un contexte sécurisé (https, ou localhost/127.0.0.1
// en développement) puisque les service workers exigent HTTPS. Échec
// silencieux (avertissement console) en cas de problème.
// ============================================================================

(function () {
  "use strict";

  function contexteAutorise() {
    return (
      location.protocol === "https:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1"
    );
  }

  if ("serviceWorker" in navigator && contexteAutorise()) {
    window.addEventListener("load", function () {
      // Chemin relatif : l'app est servie depuis un sous-chemin GitHub Pages.
      navigator.serviceWorker.register("sw.js").catch(function (erreur) {
        console.warn("PWA : échec de l'enregistrement du service worker.", erreur);
      });
    });
  }
})();
