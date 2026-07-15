# Trouvez votre place 🪑

Une application web pour vos invités — inspirée de *Please Find Your Seat*.
Vos invités ouvrent un simple lien (ou scannent un code QR) sur leur téléphone et peuvent :

- 🔍 **Trouver leur place** en tapant leur nom (recherche sans accents, avec suggestions)
- 🗺️ **Voir le plan de salle** interactif (touchez une table pour voir qui y est assis)
- 🍽️ **Consulter le menu** (cocktail, entrée, plat, dessert, bar, notes d'allergènes)
- 📸 **Accéder au partage de photos / photobooth** via votre lien
- 💍 **Lire une page sur les mariés** (ou sur l'entreprise) et le déroulement de la journée

Aucune installation pour les invités, aucun serveur, aucune base de données :
c'est un site 100 % statique, hébergeable **gratuitement sur GitHub Pages**.

## Personnalisation

**Tout se configure dans un seul fichier : [`js/config.js`](js/config.js).**

Vous pouvez y modifier :

| Section | Quoi |
|---|---|
| `event` | Type (`"mariage"` ou `"entreprise"`), titre, date, lieu, message de bienvenue |
| `pages` | Activer/désactiver chaque page (`true`/`false`) |
| `salle` | Les tables (nom, forme `"ronde"`/`"rect"`, position `x`/`y` en %, invités) et les repères (scène, bar, piste de danse…) |
| `menu` | Les sections du menu et leurs plats (avec notes : végétarien, sans gluten…) |
| `photos` | Le lien vers votre album partagé / photobooth et le mot-clic |
| `aPropos` | Le texte sur les mariés (ou l'entreprise) |
| `horaire` | Le déroulement de la journée |

### Positionner les tables sur le plan

Chaque table a une position `x` et `y` en **pourcentage** (0 à 100) :
`x: 0` = gauche, `x: 100` = droite, `y: 0` = haut, `y: 100` = bas.
Modifiez les valeurs, rechargez la page, et ajustez jusqu'à ce que le plan
ressemble à votre salle.

## Tester localement

Ouvrez simplement `index.html` dans un navigateur, ou lancez un petit serveur :

```bash
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

## Publier gratuitement (GitHub Pages)

1. Poussez le code sur GitHub (branche `main`).
2. Dans le dépôt : **Settings → Pages → Source : GitHub Actions**.
3. Le workflow inclus (`.github/workflows/pages.yml`) publie le site automatiquement
   à chaque poussée sur `main`.
4. Votre site sera à `https://VOTRE-NOM.github.io/Seatingchartapp/`.

> 💡 Générez ensuite un **code QR** pointant vers cette adresse (par exemple avec
> un générateur gratuit en ligne) et placez-le sur les cartons à l'entrée de la salle.

## Technologie

HTML, CSS et JavaScript purs — aucune dépendance, aucun outil de compilation.

- `index.html` — la page unique
- `js/config.js` — **vos données** (le seul fichier à modifier)
- `js/app.js` — la logique (recherche, plan de salle SVG, navigation)
- `css/style.css` — le style (palette ivoire / or / sauge)
