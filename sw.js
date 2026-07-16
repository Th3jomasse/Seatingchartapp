// ============================================================================
// Service worker — mise en cache du shell applicatif pour un fonctionnement
// hors ligne fiable (réseau souvent faible dans les salles de réception).
// Chemins RELATIFS uniquement : l'app est servie depuis un sous-chemin
// GitHub Pages, donc tout est résolu par rapport à l'emplacement de ce
// fichier (la racine du dépôt).
// ============================================================================

"use strict";

// Incrémenter cette version à chaque changement du shell pour invalider
// proprement les anciens caches.
const VERSION = "v5";
const CACHE_NAME = "place-shell-" + VERSION;

// Liste des fichiers du shell applicatif (voir index.html pour la liste
// exacte des CSS/JS utilisés par l'app).
const FICHIERS_SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "css/accueil.css",
  "css/plan.css",
  "css/menu.css",
  "css/photos.css",
  "css/infos.css",
  "css/apropos.css",
  "js/config.js",
  "js/utils.js",
  "js/chargeur.js",
  "js/icones.js",
  "evenements/index.json",
  "evenements/mariage-demo.json",
  "js/page-accueil.js",
  "js/page-plan.js",
  "js/page-menu.js",
  "js/page-photos.js",
  "js/page-infos.js",
  "js/page-apropos.js",
  "js/app.js",
  "js/pwa.js",
  "icons/icone.svg",
  "icons/icone-maskable.svg"
];

// ----------------------------------------------------------------------------
// Installation : précache du shell applicatif, puis activation immédiate.
// ----------------------------------------------------------------------------
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(FICHIERS_SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

// ----------------------------------------------------------------------------
// Activation : suppression des caches des anciennes versions, puis prise de
// contrôle immédiate des pages ouvertes.
// ----------------------------------------------------------------------------
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (noms) {
        return Promise.all(
          noms
            .filter(function (nom) { return nom !== CACHE_NAME; })
            .map(function (nom) { return caches.delete(nom); })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

// ----------------------------------------------------------------------------
// Fetch : stratégies de mise en cache selon le type de requête.
// ----------------------------------------------------------------------------
self.addEventListener("fetch", function (event) {
  const requete = event.request;

  // On ne gère que les requêtes GET ; le reste (POST, etc.) passe tel quel.
  if (requete.method !== "GET") {
    return;
  }

  let url;
  try {
    url = new URL(requete.url);
  } catch (erreur) {
    return;
  }

  // On ignore les schémas non http(s) (extensions de navigateur, etc.).
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return;
  }

  const memeOrigine = url.origin === self.location.origin;

  // Navigation (chargement/rechargement d'une page) : jamais casser l'app.
  // On tente le réseau, on met à jour le cache, et en cas d'échec (hors
  // ligne) on retombe sur le shell mis en cache (index.html).
  if (requete.mode === "navigate") {
    event.respondWith(
      (async function () {
        const cache = await caches.open(CACHE_NAME);
        try {
          const reponseReseau = await fetch(requete);
          cache.put(requete, reponseReseau.clone());
          return reponseReseau;
        } catch (erreur) {
          const repliCache =
            (await cache.match(requete)) ||
            (await cache.match("index.html")) ||
            (await cache.match("./"));
          return repliCache || Response.error();
        }
      })()
    );
    return;
  }

  if (memeOrigine) {
    // Même origine : stale-while-revalidate — on répond immédiatement avec
    // le cache si disponible, tout en rafraîchissant le cache en arrière-plan.
    event.respondWith(
      (async function () {
        const cache = await caches.open(CACHE_NAME);
        const reponseCache = await cache.match(requete);

        const misAJourReseau = fetch(requete)
          .then(function (reponseReseau) {
            if (reponseReseau && reponseReseau.ok) {
              cache.put(requete, reponseReseau.clone());
            }
            return reponseReseau;
          })
          .catch(function () {
            // Pas de réseau : on ignore silencieusement, le cache suffit.
            return undefined;
          });

        return reponseCache || (await misAJourReseau) || Response.error();
      })()
    );
  } else {
    // Origine externe (ex. Google Fonts) : réseau d'abord, repli sur le
    // cache si disponible, échec silencieux sinon (on ne bloque jamais
    // l'affichage de l'app pour une police manquante).
    event.respondWith(
      (async function () {
        const cache = await caches.open(CACHE_NAME);
        try {
          const reponseReseau = await fetch(requete);
          if (reponseReseau && reponseReseau.ok) {
            cache.put(requete, reponseReseau.clone());
          }
          return reponseReseau;
        } catch (erreur) {
          const reponseCache = await cache.match(requete);
          // Réponse d'erreur réseau "propre" (sans corps ni type MIME
          // fantaisiste) pour ne jamais générer d'avertissement de type
          // MIME invalide dans la console.
          return reponseCache || Response.error();
        }
      })()
    );
  }
});
