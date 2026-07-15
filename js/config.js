// ============================================================================
// CONFIGURATION DE L'ÉVÉNEMENT
// C'est le SEUL fichier à modifier pour personnaliser l'application.
// ============================================================================

const CONFIG = {

  // --------------------------------------------------------------------------
  // Informations générales
  // --------------------------------------------------------------------------
  event: {
    // "mariage" ou "entreprise" — change certains libellés (ex. « Les mariés »
    // devient « À propos de nous »)
    type: "mariage",

    // Titre affiché partout (ex. les prénoms des mariés ou le nom de l'entreprise)
    titre: "Sophie & Mathieu",

    // Sous-titre affiché sous le titre sur la page d'accueil
    sousTitre: "Nous célébrons notre mariage",

    // Date et lieu affichés sur l'accueil
    date: "Samedi 12 septembre 2026",
    lieu: "Domaine du Lac, Québec",

    // Date/heure exacte au format ISO — utilisée pour le compte à rebours.
    // Laisser vide "" pour cacher le compte à rebours.
    dateISO: "2026-09-12T15:00:00-04:00",

    // Message de bienvenue sur la page d'accueil
    messageBienvenue:
      "Bienvenue! Merci de célébrer avec nous. " +
      "Trouvez votre place, consultez le menu et partagez vos photos de la soirée.",
  },

  // --------------------------------------------------------------------------
  // Pages activées (mettre false pour cacher une page)
  // --------------------------------------------------------------------------
  pages: {
    plan: true,      // Trouver ma place + plan de salle
    menu: true,      // Menu
    photos: true,    // Partage photo / photobooth
    infos: true,     // Infos pratiques (adresse, stationnement, etc.)
    aPropos: true,   // Les mariés / À propos
    horaire: true,   // Déroulement de la journée (affiché sur la page À propos)
  },

  // --------------------------------------------------------------------------
  // Infos pratiques — laisser un champ vide "" pour le cacher
  // --------------------------------------------------------------------------
  infos: {
    adresse: "Domaine du Lac, 1234 chemin du Lac, Québec (QC) G1A 2B3",
    googleMapsLien: "https://maps.google.com/?q=Domaine+du+Lac+Quebec",
    stationnement: "Stationnement gratuit sur place, à droite de l'entrée principale.",
    hebergement:
      "Un bloc de chambres est réservé à l'Hôtel du Fleuve (10 min) — " +
      "mentionnez « mariage Sophie et Mathieu » au 1 800 555-0199.",
    codeVestimentaire: "Tenue de soirée (cocktail). La cérémonie a lieu à l'extérieur, prévoyez un lainage.",
    contact: {
      nom: "Julie (témoin)",
      telephone: "418 555-0123",
      courriel: "julie@example.com",
    },
    // Lien RSVP (formulaire Google, etc.) — laisser vide "" pour cacher le bouton
    rsvpLien: "",
  },

  // --------------------------------------------------------------------------
  // Plan de salle
  // Chaque table a : un nom, une forme ("ronde" ou "rect"), une position x/y
  // en pourcentage (0 à 100) sur le plan, et la liste des invités assis.
  // --------------------------------------------------------------------------
  salle: {
    // Petits repères affichés sur le plan (scène, bar, piste de danse, etc.)
    reperes: [
      { nom: "Scène",          x: 50, y: 6,  largeur: 30, hauteur: 8 },
      { nom: "Piste de danse", x: 50, y: 24, largeur: 24, hauteur: 16 },
      { nom: "Bar",            x: 92, y: 50, largeur: 10, hauteur: 22 },
      { nom: "Entrée",         x: 50, y: 96, largeur: 20, hauteur: 6 },
    ],

    tables: [
      {
        nom: "Table d'honneur",
        forme: "rect",
        x: 50, y: 14,
        invites: ["Sophie Tremblay", "Mathieu Gagnon", "Julie Tremblay", "Marc Tremblay", "Diane Gagnon", "Pierre Gagnon"],
      },
      {
        nom: "Table 1 — Famille Tremblay",
        forme: "ronde",
        x: 20, y: 38,
        invites: ["Luc Tremblay", "Nathalie Bouchard", "Émile Tremblay", "Léa Tremblay", "Ginette Roy", "Robert Roy"],
      },
      {
        nom: "Table 2 — Famille Gagnon",
        forme: "ronde",
        x: 80, y: 38,
        invites: ["Sylvie Gagnon", "André Gagnon", "Catherine Gagnon", "Vincent Lavoie", "Monique Lavoie", "Jean-Guy Lavoie"],
      },
      {
        nom: "Table 3 — Amis du cégep",
        forme: "ronde",
        x: 20, y: 62,
        invites: ["Alexandre Côté", "Marie-Pier Fortin", "Samuel Bergeron", "Camille Ouellet", "Jonathan Pelletier", "Audrey Morin"],
      },
      {
        nom: "Table 4 — Collègues",
        forme: "ronde",
        x: 50, y: 62,
        invites: ["Isabelle Girard", "Patrick Simard", "Karine Lévesque", "François Bédard", "Mélanie Caron", "Stéphane Paquette"],
      },
      {
        nom: "Table 5 — Amis d'enfance",
        forme: "ronde",
        x: 80, y: 62,
        invites: ["Gabriel Nadeau", "Rosalie Dubé", "William Poirier", "Laurence Gauthier", "Antoine Mercier", "Jade Lachance"],
      },
      {
        nom: "Table 6 — Voisins et amis",
        forme: "ronde",
        x: 35, y: 82,
        invites: ["Denis Beaulieu", "Lise Beaulieu", "Marco Dion", "Chantal Dion", "Yves Fournier", "Micheline Fournier"],
      },
      {
        nom: "Table 7 — Cousins et cousines",
        forme: "ronde",
        x: 65, y: 82,
        invites: ["Olivier Tremblay", "Maude Gagnon", "Félix Bouchard", "Ariane Roy", "Nicolas Lavoie", "Sarah Côté"],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Menu — chaque section a un titre et une liste de plats.
  // "note" est optionnelle (allergènes, options végé, etc.)
  // --------------------------------------------------------------------------
  menu: {
    note: "Veuillez aviser le personnel de toute allergie alimentaire.",
    sections: [
      {
        titre: "Cocktail",
        plats: [
          { nom: "Bouchées de saumon fumé", note: "" },
          { nom: "Mini-brochettes de poulet érable et moutarde", note: "" },
          { nom: "Croustades de champignons", note: "végétarien" },
        ],
      },
      {
        titre: "Entrée",
        plats: [
          { nom: "Velouté de courge musquée", note: "sans gluten" },
          { nom: "Salade de chèvre chaud, noix et miel", note: "végétarien" },
        ],
      },
      {
        titre: "Plat principal",
        plats: [
          { nom: "Filet mignon, sauce au vin rouge, légumes racines", note: "" },
          { nom: "Pavé de saumon, beurre citronné, riz sauvage", note: "sans gluten" },
          { nom: "Risotto aux champignons sauvages", note: "végétarien" },
        ],
      },
      {
        titre: "Dessert",
        plats: [
          { nom: "Gâteau des mariés — vanille et framboises", note: "" },
          { nom: "Table à desserts et café", note: "" },
        ],
      },
      {
        titre: "Bar",
        plats: [
          { nom: "Vin rouge et blanc, bière locale, mousseux", note: "" },
          { nom: "Cocktail signature « Le Sophie-Mathieu »", note: "" },
          { nom: "Boissons sans alcool", note: "" },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Partage de photos / photobooth
  // --------------------------------------------------------------------------
  photos: {
    titre: "Partagez vos photos!",
    description:
      "Toutes vos photos de la soirée au même endroit. " +
      "Cliquez sur le bouton ci-dessous pour accéder à notre album partagé " +
      "et au photobooth.",
    // Lien vers votre album partagé (Google Photos, photobooth, etc.)
    lien: "https://photos.app.goo.gl/VOTRE-LIEN-ICI",
    texteBouton: "Ouvrir l'album photo",
    // Mot-clic suggéré (laisser vide "" pour le cacher)
    motClic: "#SophieEtMathieu2026",
  },

  // --------------------------------------------------------------------------
  // Page « Les mariés » (ou « À propos » en mode entreprise)
  // --------------------------------------------------------------------------
  aPropos: {
    titre: "Notre histoire",
    // Chaque paragraphe est un élément de la liste
    paragraphes: [
      "Sophie et Mathieu se sont rencontrés en 2018 lors d'un souper entre amis à Québec. " +
      "Ce qui devait être une simple soirée s'est transformé en une belle histoire d'amour.",
      "Après sept ans d'aventures, de voyages et de projets communs, " +
      "Mathieu a fait la grande demande au sommet du mont Sainte-Anne, à l'automne 2025.",
      "Aujourd'hui, nous sommes tellement heureux de partager ce moment avec vous, " +
      "les personnes qui comptent le plus dans nos vies. Merci d'être là!",
    ],
  },

  // --------------------------------------------------------------------------
  // Déroulement de la journée (affiché sur la page À propos)
  // --------------------------------------------------------------------------
  horaire: [
    { heure: "15 h 00", activite: "Cérémonie" },
    { heure: "16 h 00", activite: "Cocktail et photos" },
    { heure: "18 h 00", activite: "Souper" },
    { heure: "20 h 30", activite: "Première danse" },
    { heure: "21 h 00", activite: "Soirée dansante" },
    { heure: "23 h 00", activite: "Table à desserts de fin de soirée" },
  ],
};
