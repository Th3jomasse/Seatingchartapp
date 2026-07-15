// ============================================================================
// Générateur de code QR — JavaScript pur, aucune dépendance externe.
//
// Implémente l'algorithme standard (ISO/IEC 18004) : encodage en mode octet,
// niveau de correction d'erreur M, sélection automatique de la version
// (1 à 10, ce qui couvre des textes/URL jusqu'à environ 210 caractères),
// arithmétique de Reed-Solomon sur GF(256), calcul des informations de
// format et de version (codes BCH), et masquage avec choix de pénalité
// parmi les 8 motifs standards.
//
// API publique :
//   genererQR(texte)                          -> matrice (tableau 2D de booléens)
//   dessinerQR(canvas, texte, taille, marge)   -> dessine sur un <canvas>
// ============================================================================

(function (global) {
  "use strict";

  // --------------------------------------------------------------------------
  // Arithmétique sur le corps de Galois GF(256), polynôme primitif x^8+x^4+x^3+x^2+1
  // --------------------------------------------------------------------------
  const TABLE_EXP = new Array(256);
  const TABLE_LOG = new Array(256);
  (function initialiserGF256() {
    for (let i = 0; i < 8; i++) TABLE_EXP[i] = 1 << i;
    for (let i = 8; i < 256; i++) {
      TABLE_EXP[i] = TABLE_EXP[i - 4] ^ TABLE_EXP[i - 5] ^ TABLE_EXP[i - 6] ^ TABLE_EXP[i - 8];
    }
    for (let i = 0; i < 255; i++) TABLE_LOG[TABLE_EXP[i]] = i;
  })();

  function gexp(n) {
    while (n < 0) n += 255;
    while (n >= 256) n -= 255;
    return TABLE_EXP[n];
  }
  function glog(n) {
    if (n < 1) throw new Error("glog(" + n + ")");
    return TABLE_LOG[n];
  }

  // --------------------------------------------------------------------------
  // Polynômes sur GF(256) — utilisés pour construire le code de Reed-Solomon
  // --------------------------------------------------------------------------
  function Polynome(nombres, decalage) {
    let debut = 0;
    while (debut < nombres.length && nombres[debut] === 0) debut++;
    this.nombres = new Array(nombres.length - debut + decalage);
    for (let i = 0; i < nombres.length - debut; i++) this.nombres[i] = nombres[i + debut];
  }
  Polynome.prototype.get = function (index) {
    return this.nombres[index];
  };
  Polynome.prototype.longueur = function () {
    return this.nombres.length;
  };
  Polynome.prototype.multiplier = function (autre) {
    const resultat = new Array(this.longueur() + autre.longueur() - 1);
    for (let i = 0; i < this.longueur(); i++) {
      for (let j = 0; j < autre.longueur(); j++) {
        resultat[i + j] ^= gexp(glog(this.get(i)) + glog(autre.get(j)));
      }
    }
    return new Polynome(resultat, 0);
  };
  Polynome.prototype.modulo = function (autre) {
    if (this.longueur() - autre.longueur() < 0) return this;
    const ratio = glog(this.get(0)) - glog(autre.get(0));
    const nombres = new Array(this.longueur());
    for (let i = 0; i < this.longueur(); i++) nombres[i] = this.get(i);
    for (let i = 0; i < autre.longueur(); i++) {
      nombres[i] ^= gexp(glog(autre.get(i)) + ratio);
    }
    return new Polynome(nombres, 0).modulo(autre);
  };

  function polynomeCorrecteurErreur(nombreSymboles) {
    let a = new Polynome([1], 0);
    for (let i = 0; i < nombreSymboles; i++) {
      a = a.multiplier(new Polynome([1, gexp(i)], 0));
    }
    return a;
  }

  // --------------------------------------------------------------------------
  // Table des blocs Reed-Solomon (ISO/IEC 18004, versions 1 à 10)
  // Format par entrée : [nbBlocs, motsTotalParBloc, motsDonnéesParBloc, ...]
  // (un second quadruplet quand la version a deux groupes de blocs)
  // Ordre des colonnes par version : L, M, Q, H — seul le niveau M est exposé.
  // --------------------------------------------------------------------------
  const TABLE_BLOCS_RS = [
    // version 1
    [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
    // version 2
    [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
    // version 3
    [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
    // version 4
    [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
    // version 5
    [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
    // version 6
    [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
    // version 7
    [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
    // version 8
    [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
    // version 9
    [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
    // version 10
    [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
  ];

  // Positions des centres de motifs d'alignement, par version (1 à 10)
  const TABLE_POSITIONS_ALIGNEMENT = [
    [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
  ];

  // Nombre de bits de remplissage restants après le dernier mot de code, par version
  const TABLE_BITS_RESTANTS = [0, 7, 7, 7, 7, 7, 0, 0, 0, 0];

  // Indicateurs de niveau de correction utilisés dans les infos de format (bits fixes du standard)
  const NIVEAU_M = 0; // L=1, M=0, Q=3, H=2

  function blocsRS(version) {
    const entree = TABLE_BLOCS_RS[(version - 1) * 4 + NIVEAU_M_INDEX()];
    const blocs = [];
    // entree peut contenir un ou deux groupes de [nbBlocs, total, donnees]
    for (let g = 0; g < entree.length; g += 3) {
      const nb = entree[g];
      const total = entree[g + 1];
      const donnees = entree[g + 2];
      for (let k = 0; k < nb; k++) blocs.push({ total: total, donnees: donnees });
    }
    return blocs;
  }
  // Le niveau M est toujours en 2e position (index 1) dans chaque groupe de 4 colonnes
  function NIVEAU_M_INDEX() {
    return 1;
  }

  // --------------------------------------------------------------------------
  // Tampon de bits
  // --------------------------------------------------------------------------
  function TamponBits() {
    this.octets = [];
    this.longueurBits = 0;
  }
  TamponBits.prototype.mettre = function (valeur, nbBits) {
    for (let i = 0; i < nbBits; i++) {
      this.mettreBit(((valeur >>> (nbBits - i - 1)) & 1) === 1);
    }
  };
  TamponBits.prototype.mettreBit = function (bit) {
    const indexOctet = Math.floor(this.longueurBits / 8);
    if (this.octets.length <= indexOctet) this.octets.push(0);
    if (bit) this.octets[indexOctet] |= 0x80 >>> (this.longueurBits % 8);
    this.longueurBits++;
  };

  // --------------------------------------------------------------------------
  // Conversion d'une chaîne en octets UTF-8 (mode octet du QR)
  // --------------------------------------------------------------------------
  function utf8VersOctets(chaine) {
    const octets = [];
    for (let i = 0; i < chaine.length; i++) {
      let code = chaine.codePointAt(i);
      if (code > 0xffff) i++; // saute la 2e moitié d'une paire de substitution (emoji, etc.)
      if (code < 0x80) {
        octets.push(code);
      } else if (code < 0x800) {
        octets.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0x10000) {
        octets.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        octets.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f)
        );
      }
    }
    return octets;
  }

  // Nombre de bits de l'indicateur de longueur en mode octet, selon la version
  function bitsIndicateurLongueur(version) {
    return version < 10 ? 8 : 16;
  }

  // --------------------------------------------------------------------------
  // Choix automatique de la plus petite version (1 à 10) qui contient le texte
  // --------------------------------------------------------------------------
  function choisirVersion(nbOctets) {
    for (let version = 1; version <= 10; version++) {
      const blocs = blocsRS(version);
      let capaciteOctets = 0;
      blocs.forEach(function (b) { capaciteOctets += b.donnees; });
      const enTeteBits = 4 + bitsIndicateurLongueur(version);
      const bitsNecessaires = enTeteBits + nbOctets * 8;
      if (bitsNecessaires <= capaciteOctets * 8) return version;
    }
    throw new Error(
      "Texte trop long pour un code QR (niveau M, jusqu'à la version 10) : " +
        nbOctets +
        " octets. Raccourcissez l'URL ou le texte."
    );
  }

  // --------------------------------------------------------------------------
  // Codes BCH pour les informations de format (15 bits) et de version (18 bits)
  // --------------------------------------------------------------------------
  const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
  const G18 =
    (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
  const MASQUE_G15 = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

  function chiffresBCH(valeur) {
    let n = 0;
    while (valeur !== 0) {
      n++;
      valeur >>>= 1;
    }
    return n;
  }
  function bchInfoFormat(donnees) {
    let d = donnees << 10;
    while (chiffresBCH(d) - chiffresBCH(G15) >= 0) {
      d ^= G15 << (chiffresBCH(d) - chiffresBCH(G15));
    }
    return ((donnees << 10) | d) ^ MASQUE_G15;
  }
  function bchInfoVersion(version) {
    let d = version << 12;
    while (chiffresBCH(d) - chiffresBCH(G18) >= 0) {
      d ^= G18 << (chiffresBCH(d) - chiffresBCH(G18));
    }
    return (version << 12) | d;
  }

  // --------------------------------------------------------------------------
  // Les 8 motifs de masquage standards
  // --------------------------------------------------------------------------
  function appliquerMasque(motif, i, j) {
    switch (motif) {
      case 0: return (i + j) % 2 === 0;
      case 1: return i % 2 === 0;
      case 2: return j % 3 === 0;
      case 3: return (i + j) % 3 === 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case 5: return ((i * j) % 2) + ((i * j) % 3) === 0;
      case 6: return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
      case 7: return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
      default: throw new Error("motif de masque invalide : " + motif);
    }
  }

  // --------------------------------------------------------------------------
  // Construction des mots de code (données + correction, entrelacés)
  // --------------------------------------------------------------------------
  function construireDonnees(version, octetsTexte) {
    const blocs = blocsRS(version);

    const tampon = new TamponBits();
    tampon.mettre(0x4, 4); // indicateur de mode : octet (0100)
    tampon.mettre(octetsTexte.length, bitsIndicateurLongueur(version));
    octetsTexte.forEach(function (o) { tampon.mettre(o, 8); });

    let totalDonnees = 0;
    blocs.forEach(function (b) { totalDonnees += b.donnees; });

    if (tampon.longueurBits > totalDonnees * 8) {
      throw new Error("dépassement de capacité du code QR");
    }

    // Séquence de terminaison (jusqu'à 4 bits à zéro)
    if (tampon.longueurBits + 4 <= totalDonnees * 8) tampon.mettre(0, 4);
    // Complète jusqu'à l'octet suivant
    while (tampon.longueurBits % 8 !== 0) tampon.mettreBit(false);
    // Octets de bourrage alternés 0xEC / 0x11
    let alterne = true;
    while (tampon.longueurBits < totalDonnees * 8) {
      tampon.mettre(alterne ? 0xec : 0x11, 8);
      alterne = !alterne;
    }

    // Découpe en blocs et calcule les mots de correction Reed-Solomon
    let decalage = 0;
    let maxDonnees = 0;
    let maxCorrection = 0;
    const donneesParBloc = [];
    const correctionParBloc = [];

    blocs.forEach(function (bloc) {
      const nbCorrection = bloc.total - bloc.donnees;
      maxDonnees = Math.max(maxDonnees, bloc.donnees);
      maxCorrection = Math.max(maxCorrection, nbCorrection);

      const donnees = new Array(bloc.donnees);
      for (let i = 0; i < bloc.donnees; i++) donnees[i] = 0xff & tampon.octets[i + decalage];
      decalage += bloc.donnees;

      const polyCorrecteur = polynomeCorrecteurErreur(nbCorrection);
      const polyBrut = new Polynome(donnees, polyCorrecteur.longueur() - 1);
      const polyMod = polyBrut.modulo(polyCorrecteur);

      const correction = new Array(nbCorrection);
      for (let i = 0; i < nbCorrection; i++) {
        const indexMod = i + polyMod.longueur() - nbCorrection;
        correction[i] = indexMod >= 0 ? polyMod.get(indexMod) || 0 : 0;
      }

      donneesParBloc.push(donnees);
      correctionParBloc.push(correction);
    });

    // Entrelacement : d'abord toutes les données colonne par colonne, puis la correction
    const resultat = [];
    for (let i = 0; i < maxDonnees; i++) {
      donneesParBloc.forEach(function (d) { if (i < d.length) resultat.push(d[i]); });
    }
    for (let i = 0; i < maxCorrection; i++) {
      correctionParBloc.forEach(function (c) { if (i < c.length) resultat.push(c[i]); });
    }
    return resultat;
  }

  // --------------------------------------------------------------------------
  // Construction de la matrice complète pour une version et un masque donnés
  // --------------------------------------------------------------------------
  function construireMatrice(version, masque, test, donnees) {
    const nbModules = version * 4 + 17;
    const modules = new Array(nbModules);
    for (let r = 0; r < nbModules; r++) modules[r] = new Array(nbModules).fill(null);

    function motifRepere(ligne, colonne) {
      for (let r = -1; r <= 7; r++) {
        if (ligne + r <= -1 || nbModules <= ligne + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (colonne + c <= -1 || nbModules <= colonne + c) continue;
          if (
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            modules[ligne + r][colonne + c] = true;
          } else {
            modules[ligne + r][colonne + c] = false;
          }
        }
      }
    }
    motifRepere(0, 0);
    motifRepere(nbModules - 7, 0);
    motifRepere(0, nbModules - 7);

    // Motifs d'alignement
    const positions = TABLE_POSITIONS_ALIGNEMENT[version - 1];
    positions.forEach(function (ligne) {
      positions.forEach(function (colonne) {
        if (modules[ligne][colonne] !== null) return;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            modules[ligne + r][colonne + c] = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
          }
        }
      });
    });

    // Motifs de synchronisation (ligne/colonne 6)
    for (let r = 8; r < nbModules - 8; r++) {
      if (modules[r][6] === null) modules[r][6] = r % 2 === 0;
    }
    for (let c = 8; c < nbModules - 8; c++) {
      if (modules[6][c] === null) modules[6][c] = c % 2 === 0;
    }

    // Informations de format (15 bits, dupliquées à deux endroits)
    const donneesFormat = (NIVEAU_M << 3) | masque;
    const bitsFormat = bchInfoFormat(donneesFormat);
    for (let i = 0; i < 15; i++) {
      const bit = !test && ((bitsFormat >> i) & 1) === 1;
      if (i < 6) modules[i][8] = bit;
      else if (i < 8) modules[i + 1][8] = bit;
      else modules[nbModules - 15 + i][8] = bit;
    }
    for (let i = 0; i < 15; i++) {
      const bit = !test && ((bitsFormat >> i) & 1) === 1;
      if (i < 8) modules[8][nbModules - i - 1] = bit;
      else if (i < 9) modules[8][15 - i - 1 + 1] = bit;
      else modules[8][15 - i - 1] = bit;
    }
    modules[nbModules - 8][8] = !test; // module toujours sombre

    // Informations de version (18 bits, versions >= 7 seulement)
    if (version >= 7) {
      const bitsVersion = bchInfoVersion(version);
      for (let i = 0; i < 18; i++) {
        const bit = !test && ((bitsVersion >> i) & 1) === 1;
        modules[Math.floor(i / 3)][(i % 3) + nbModules - 8 - 3] = bit;
      }
      for (let i = 0; i < 18; i++) {
        const bit = !test && ((bitsVersion >> i) & 1) === 1;
        modules[(i % 3) + nbModules - 8 - 3][Math.floor(i / 3)] = bit;
      }
    }

    // Placement des données en zigzag, de bas en haut puis haut en bas,
    // deux colonnes à la fois (la colonne 6, réservée à la synchronisation, est sautée)
    let increment = -1;
    let ligne = nbModules - 1;
    let indexBit = 7;
    let indexOctet = 0;
    for (let colonne = nbModules - 1; colonne > 0; colonne -= 2) {
      if (colonne === 6) colonne--;
      for (;;) {
        for (let c = 0; c < 2; c++) {
          const col = colonne - c;
          if (modules[ligne][col] === null) {
            let sombre = false;
            if (indexOctet < donnees.length) {
              sombre = ((donnees[indexOctet] >>> indexBit) & 1) === 1;
            }
            if (appliquerMasque(masque, ligne, col)) sombre = !sombre;
            modules[ligne][col] = sombre;
            indexBit--;
            if (indexBit === -1) {
              indexOctet++;
              indexBit = 7;
            }
          }
        }
        ligne += increment;
        if (ligne < 0 || nbModules <= ligne) {
          ligne -= increment;
          increment = -increment;
          break;
        }
      }
    }

    return modules;
  }

  // --------------------------------------------------------------------------
  // Calcul de la pénalité d'un masque (les 4 règles standards) — sert
  // uniquement à choisir le masque le plus lisible parmi les 8 possibles.
  // --------------------------------------------------------------------------
  function calculerPenalite(modules) {
    const n = modules.length;
    function sombre(r, c) { return modules[r][c]; }
    let penalite = 0;

    // Règle 1 : voisinage de modules identiques (variante par comptage de voisins)
    for (let ligne = 0; ligne < n; ligne++) {
      for (let colonne = 0; colonne < n; colonne++) {
        const couleur = sombre(ligne, colonne);
        let memeCompte = 0;
        for (let r = -1; r <= 1; r++) {
          if (ligne + r < 0 || n <= ligne + r) continue;
          for (let c = -1; c <= 1; c++) {
            if (colonne + c < 0 || n <= colonne + c) continue;
            if (r === 0 && c === 0) continue;
            if (couleur === sombre(ligne + r, colonne + c)) memeCompte++;
          }
        }
        if (memeCompte > 5) penalite += 3 + memeCompte - 5;
      }
    }

    // Règle 2 : blocs 2x2 uniformes
    for (let ligne = 0; ligne < n - 1; ligne++) {
      for (let colonne = 0; colonne < n - 1; colonne++) {
        let compte = 0;
        if (sombre(ligne, colonne)) compte++;
        if (sombre(ligne + 1, colonne)) compte++;
        if (sombre(ligne, colonne + 1)) compte++;
        if (sombre(ligne + 1, colonne + 1)) compte++;
        if (compte === 0 || compte === 4) penalite += 3;
      }
    }

    // Règle 3 : motif ressemblant à un repère de position (1:1:3:1:1)
    for (let ligne = 0; ligne < n; ligne++) {
      for (let colonne = 0; colonne < n - 6; colonne++) {
        if (
          sombre(ligne, colonne) && !sombre(ligne, colonne + 1) && sombre(ligne, colonne + 2) &&
          sombre(ligne, colonne + 3) && sombre(ligne, colonne + 4) && !sombre(ligne, colonne + 5) &&
          sombre(ligne, colonne + 6)
        ) {
          penalite += 40;
        }
      }
    }
    for (let colonne = 0; colonne < n; colonne++) {
      for (let ligne = 0; ligne < n - 6; ligne++) {
        if (
          sombre(ligne, colonne) && !sombre(ligne + 1, colonne) && sombre(ligne + 2, colonne) &&
          sombre(ligne + 3, colonne) && sombre(ligne + 4, colonne) && !sombre(ligne + 5, colonne) &&
          sombre(ligne + 6, colonne)
        ) {
          penalite += 40;
        }
      }
    }

    // Règle 4 : équilibre global sombre/clair (idéalement 50 %)
    let compteSombre = 0;
    for (let ligne = 0; ligne < n; ligne++) {
      for (let colonne = 0; colonne < n; colonne++) if (sombre(ligne, colonne)) compteSombre++;
    }
    const ratio = Math.abs((100 * compteSombre) / (n * n) - 50) / 5;
    penalite += ratio * 10;

    return penalite;
  }

  // --------------------------------------------------------------------------
  // API publique
  // --------------------------------------------------------------------------

  // Génère la matrice (tableau 2D de booléens, true = module sombre) du code QR
  // représentant `texte`, en mode octet (UTF-8) avec correction d'erreur M.
  function genererQR(texte) {
    const octetsTexte = utf8VersOctets(String(texte));
    const version = choisirVersion(octetsTexte.length);
    const donnees = construireDonnees(version, octetsTexte);

    // Ajoute les bits de remplissage final (spécifiques à la version)
    const donneesCompletes = donnees.slice();
    const bitsRestants = TABLE_BITS_RESTANTS[version - 1];
    if (bitsRestants > 0) donneesCompletes.push(0);

    // Essaie les 8 masques (mode test, sans écrire les vraies infos de format)
    // et choisit celui qui minimise la pénalité.
    let meilleurMasque = 0;
    let meilleurePenalite = Infinity;
    for (let m = 0; m < 8; m++) {
      const matriceTest = construireMatrice(version, m, true, donneesCompletes);
      const p = calculerPenalite(matriceTest);
      if (p < meilleurePenalite) {
        meilleurePenalite = p;
        meilleurMasque = m;
      }
    }

    return construireMatrice(version, meilleurMasque, false, donneesCompletes);
  }

  // Dessine le code QR de `texte` sur un <canvas>, avec zone de silence
  // (marge blanche) de `marge` modules (4 par défaut) et des modules de
  // `taille` pixels de côté (6 par défaut).
  function dessinerQR(canvas, texte, taille, marge) {
    const t = taille || 6;
    const m = marge === undefined ? 4 : marge;
    const matrice = genererQR(texte);
    const n = matrice.length;
    const cote = (n + 2 * m) * t;

    canvas.width = cote;
    canvas.height = cote;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cote, cote);
    ctx.fillStyle = "#000000";
    for (let ligne = 0; ligne < n; ligne++) {
      for (let colonne = 0; colonne < n; colonne++) {
        if (matrice[ligne][colonne]) {
          ctx.fillRect((m + colonne) * t, (m + ligne) * t, t, t);
        }
      }
    }
    return matrice;
  }

  global.genererQR = genererQR;
  global.dessinerQR = dessinerQR;
})(typeof globalThis !== "undefined" ? globalThis : this);
