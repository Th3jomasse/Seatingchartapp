# Trouvez votre place 🪑

Une application web pour vos invités — inspirée de *Please Find Your Seat*, mais en plus techno :
là où l'app d'origine montre des images ou des PDF, ici tout est **interactif**.
Vos invités ouvrent un simple lien (ou scannent un code QR) sur leur téléphone :

## Pour les invités

- 🔍 **Trouver leur place** en tapant leur nom — recherche sans accents, suggestions,
  et tolérance aux fautes de frappe (« emlie » trouve Émile)
- 🗺️ **Plan de salle interactif** — zoom (boutons, molette, pincement à deux doigts),
  déplacement au doigt, chaises dessinées autour des tables, légende ;
  touchez une table pour voir qui y est assis
- ⏳ **Compte à rebours** en direct jusqu'au grand jour, monogramme élégant
- 🍽️ **Menu filtrable** — puces 🌱 Végétarien / 🌾 Sans gluten avec badges par plat
- 📸 **Partage de photos / photobooth** — bouton vers votre album, copie du lien,
  partage natif mobile, mot-clic
- ℹ️ **Infos pratiques** — adresse + Google Maps, stationnement, hébergement,
  code vestimentaire, contact (appel/courriel en un tap), RSVP optionnel
- 💍 **Page sur les mariés** (ou sur l'entreprise) + déroulement de la journée
- 📱 **PWA installable et hors ligne** — l'app continue de fonctionner même si le
  réseau est faible dans la salle de réception
- 🌙 **Mode sombre** automatique

## Pour l'organisateur (vous)

- 🛠️ **[`editeur.html`](editeur.html)** — éditeur visuel du plan de salle :
  glissez-déposez vos tables et repères à la souris, éditez noms et invités,
  puis **Exporter config.js** et remplacez le fichier. Fini l'édition de coordonnées à la main.
- 🎟️ **[`qr.html`](qr.html)** — générateur de codes QR **sans aucun service externe**
  (algorithme QR complet intégré) : QR du site, un QR personnalisé par invité
  (lien profond `?invite=Nom` qui affiche directement sa place), téléchargement PNG,
  et **impression de cartons** prête à l'emploi.

Aucune installation pour les invités, aucun serveur, aucune base de données :
c'est un site 100 % statique, hébergeable **gratuitement sur GitHub Pages**.

## Personnalisation

**Tout se configure dans un seul fichier : [`js/config.js`](js/config.js)** — ou visuellement
via `editeur.html` pour le plan de salle.

| Section | Quoi |
|---|---|
| `event` | Type (`"mariage"` ou `"entreprise"`), titre, date, lieu, `dateISO` (compte à rebours), message de bienvenue |
| `pages` | Activer/désactiver chaque page (`true`/`false`) |
| `salle` | Les tables (nom, forme `"ronde"`/`"rect"`, position `x`/`y` en %, invités) et les repères (scène, bar, piste de danse…) |
| `menu` | Les sections du menu et leurs plats — les notes « végétarien », « sans gluten », « végane » deviennent badges et filtres automatiquement |
| `photos` | Le lien vers votre album partagé / photobooth et le mot-clic |
| `infos` | Adresse, lien Google Maps, stationnement, hébergement, code vestimentaire, contact, lien RSVP |
| `aPropos` | Le texte sur les mariés (ou l'entreprise) |
| `horaire` | Le déroulement de la journée |

## Tester localement

```bash
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

## Publier gratuitement (GitHub Pages)

1. Poussez le code sur GitHub (branche `main`).
2. Dans le dépôt : **Settings → Pages → Source : GitHub Actions**.
3. Le workflow inclus (`.github/workflows/pages.yml`) publie le site automatiquement.
4. Votre site sera à `https://VOTRE-NOM.github.io/Seatingchartapp/`.
5. Ouvrez `https://…/qr.html` pour générer et imprimer vos codes QR.

## Technologie

HTML, CSS et JavaScript purs — **zéro dépendance, zéro build, zéro service externe**.

```
index.html            page des invités (une seule page, navigation par onglets)
editeur.html          éditeur visuel du plan (organisateur)
qr.html               générateur de codes QR (organisateur)
js/config.js          ★ vos données — le seul fichier à modifier
js/utils.js           utilitaires + registre des pages
js/page-*.js          un module par page (accueil, plan, menu, photos, infos, à propos)
js/app.js             routeur + navigation
js/qrcode.js          générateur QR complet (Reed-Solomon, masques, versions 1-10)
js/editeur.js         logique de l'éditeur (glisser-déposer, export)
js/pwa.js + sw.js     installation + mode hors ligne
css/*.css             style de base + un fichier par page (mode sombre automatique)
```
