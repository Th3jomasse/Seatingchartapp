# Trouvez votre place 🪑

Plateforme **multi-événements** pour gestionnaires d'événements — inspirée de
*Please Find Your Seat*, mais interactive de bout en bout. Un seul déploiement
gratuit (GitHub Pages), autant d'événements que vous voulez, chacun avec son
lien, son thème, son logo et ses codes QR.

## 🛠️ Le tableau de bord (`admin.html`) — votre outil de travail

Ouvrez `https://VOTRE-SITE/admin.html` :

- **Événements multiples** : créez, **dupliquez** (réutilisez un ancien comme
  modèle), supprimez, importez/exportez des sauvegardes JSON.
- **Onglet Contenu** : titre, dates, message, **menu complet** (sections et
  plats), **liens photos/photobooth**, infos pratiques, horaire, pages
  activées.
- **Onglet Apparence** : **6 thèmes prêts à l'emploi** (Classique or, Jardin
  sauge, Marine élégant, Bordeaux, Gala noir & or, Corporatif), chaque couleur
  ajustable à la pipette, **6 paires de polices** Google Fonts, **logo
  d'entreprise téléversé** (intégré dans la config, aucun hébergement
  d'image requis), mode clair/sombre/auto.
- **Onglet Plan de salle** : glissez-déposez tables et repères, éditez les
  invités, **import express** d'une liste collée.
- **Onglet Codes QR** : QR de l'événement + un QR par invité (lien profond qui
  affiche directement sa place), téléchargement PNG, **impression de cartons**.
- **Onglet Publication** : bouton **« Publier »** qui pousse la config sur
  GitHub directement depuis le navigateur (jeton fine-grained requis, aide
  incluse) → le site se met à jour en ~1 minute. Aucun outil à installer.
- **Aperçu en direct** : un téléphone simulé montre l'app invités pendant que
  vous modifiez.

Les brouillons vivent dans votre navigateur (localStorage) tant que vous
n'avez pas publié — pensez à « Tout exporter » régulièrement en sauvegarde.

## 📱 L'app invités (`index.html`)

Chaque événement a son lien : `https://VOTRE-SITE/index.html?e=slug-evenement`
(les invités le scannent via QR — rien à installer) :

- 🔍 **Trouver leur place** — recherche sans accents, tolérante aux fautes
  (« emlie » trouve Émile), liens profonds `&invite=Nom`
- 🗺️ **Plan de salle interactif** — zoom/pincement/déplacement, chaises
  dessinées, légende, table trouvée surlignée et centrée
- ⏳ **Compte à rebours** en direct, monogramme ou logo
- 🍽️ **Menu filtrable** — badges 🌱 végétarien / 🌾 sans gluten automatiques
- 📸 **Partage de photos** — bouton album, copie du lien, partage natif
- ℹ️ **Infos pratiques** — Google Maps, stationnement, hébergement, contact
- 📱 **PWA hors ligne** — fonctionne même si le réseau est faible dans la salle
- 🎨 **Thème par événement** — couleurs, polices, logo, clair/sombre

## Architecture (100 % statique, zéro dépendance)

```
admin.html                 tableau de bord (organisateur)
index.html                 app invités (une page, navigation par onglets)
editeur.html / qr.html     outils autonomes (hérités, toujours fonctionnels)
evenements/index.json      liste des événements + événement par défaut
evenements/<slug>.json     ★ une config par événement
js/chargeur.js             choisit l'événement (?e=slug) et démarre l'app
js/config.js               config de repli (ouverture directe sans serveur)
js/page-*.js               modules des pages invités
js/admin/noyau.js          noyau du dashboard (contrat window.Admin)
js/admin/onglet-*.js       onglets du dashboard
js/qrcode.js               générateur QR intégré (Reed-Solomon, vérifié)
js/pwa.js + sw.js          installation + hors ligne
css/…                      styles (app, dashboard, impression)
```

## Démarrage local

```bash
python3 -m http.server 8000
# app invités : http://localhost:8000
# dashboard   : http://localhost:8000/admin.html
```

## Publication initiale (une fois)

1. Poussez le code sur GitHub.
2. **Settings → Pages → Source : GitHub Actions** (le workflow
   `.github/workflows/pages.yml` déploie à chaque poussée).
3. Créez un jeton fine-grained (Contents : Read and write sur ce repo) et
   entrez-le dans l'onglet Publication du dashboard — ensuite tout se publie
   depuis le navigateur.
