# Cerflak : contexte du projet

Cerflak est une application d'écriture et d'archivage unifiée, développée par un auteur indépendant (non développeur de métier). Elle tient dans **une seule application à quatre onglets** : Scriptum (éditeur chiffré), Punk Records (fichiers + rimes), Dédale (mind mapping) et CopMonk (archivage d'articles web, version améliorée d'Archiveur).

## Règles de collaboration

- Réponds en français, avec des explications simples. Pas de jargon sans explication.
- Ne me demande jamais de copier-coller du code : modifie les fichiers toi-même.
- Avant de coder un module, propose un plan court et attends mon accord.
- Travaille par petites étapes, une fonctionnalité à la fois, et fais un commit Git après chaque étape qui marche.
- Écris des tests pour la logique pure (chiffrement, format .gtext, liens, rimes, conversion de fichiers). Dis-moi clairement ce que seul un test sur mon téléphone ou mon Mac peut vérifier.
- Demande-moi confirmation avant : tout déploiement sur le VPS ou Kura, toute suppression de fichiers, toute commande touchant aux secrets.
- Aucun secret dans le dépôt (clés API, mots de passe). Utilise des variables d'environnement et un `.env` ignoré par Git.
- Sois honnête : si une idée est risquée ou mal pensée, dis-le au lieu de t'exécuter.
- Finir un module avant de passer au suivant (principe : Scriptum d'abord).

## Cibles et architecture générale

- Deux cibles seulement : Honor Magic 7 (Android) et Mac. Pas de Windows.
- Une seule PWA (HTML/JS), hébergée sur GitHub Pages, dépôt `DenkiKataru/cerflak`, URL `https://denkikataru.github.io/cerflak/`.
- Interface en **quatre onglets** : Scriptum, Punk Records, Dédale, CopMonk. Une seule base de code, une seule navigation. La clé de chiffrement déverrouillée reste en mémoire le temps de la session et sert à tous les onglets (pas de nouveau mot de passe en changeant d'onglet). Charger les onglets lourds à la demande pour garder un démarrage rapide.
- Capacitor est abandonné (complexité du toolchain Android). Ne pas le réintroduire sans me le demander.
- Attention au cache du service worker : après chaque déploiement, prévoir un moyen de forcer la mise à jour de la PWA.

## Abandons définitifs (ne pas réintroduire)

- LanguageTool, LibreTranslate et Mother Thong : la qualité de traduction obtenue était mauvaise. Plus de module correcteur/traducteur dans Cerflak.
- Windows / Shadow comme cible.

## Infrastructure

- Chemin de sauvegarde : navigateur → VPS OVH (HTTPS) → relais interne → serveur Node.js en conteneur Docker sur Kura (port 3002) → `/volume1/Nindo/Fûinjutsu/`. Le passage par le VPS est obligatoire : les navigateurs bloquent le contenu mixte (HTTPS vers l'IP Kura en HTTP).
- L'arborescence de `/volume1/Nindo/Fûinjutsu/` contient de nombreux sous-dossiers, de profondeur variable. Ne suppose jamais une liste fixe de dossiers : l'app doit lister le contenu réel via la route `/list` et naviguer dynamiquement.
- Routes côté serveur : `/list`, `/file` (ouverture), `/export` (LibreOffice headless, profil temporaire isolé par conversion ; PDF chiffré par mot de passe via qpdf ; l'ODT reste non chiffré volontairement).
- Horodatage OpenTimestamps (OTS) : pipeline sur le VPS OVH, envoi du mail via Brevo, domaine `lesplumeslestees.fr` authentifié (DKIM, DMARC). Le .ots confirmé est récupéré 24 h plus tard.
- Fichiers Punk Records sur Kura : `/volume1/Nindo/Sharingan` avec trois sous-dossiers : `PDF`, `SONS`, `VIDÉOS`.
- Archiveur existe déjà : application web (captures d'écran → PDF) déployée sur le VPS OVH à `archiveur.garofali.fr`, avec données centralisées.

## Onglet Scriptum

- Éditeur de fichiers `.gtext`, chiffrés en AES-256. La clé est protégée par un mot de passe (PBKDF2).
- Trois actions distinctes : Chiffrer, Horodater (OTS), Enregistrer sur Kura. Ne pas les fusionner.
- Ouverture directe par URL : `?dossier=...&fichier=...`, déclenchée juste après un déverrouillage réussi, via la fonction `openFile` existante.
- Interface cible : style Word, **police Georgia** (Mac), taille modifiable (11 par défaut), gras / italique / souligné, alignements gauche / droite / centré / justifié, copier-coller. Le zoom au pincement n'est plus une exigence. Sur Android, où Georgia est absente, la police de secours est **Gelasio** (licence libre SIL OFL, embarquée dans `fonts/`).
- Export : PDF (chiffré) et ODT via le serveur, déjà en place. **Décision : pas d'import ni d'ouverture de docx, odt ou pdf dans Scriptum, et pas d'export docx** (abandonné, ne pas réintroduire sans me le demander).
- Règles de sync à implémenter : le fichier original reste sur l'appareil d'écriture ; « Enregistrer sur Kura » envoie une copie ; à l'ouverture sur un autre appareil, vérification non bloquante d'une version plus récente sur Kura ; en cas de conflit, trois choix (garder le local, récupérer Kura, garder les deux sous un nom séparé) ; auto-save local fréquent (quelques secondes d'inactivité) distinct de l'envoi vers Kura (30 s à 2 min) ; indicateur à trois états (synchronisé / en cours / échec) avec retry automatique et heure de dernière sauvegarde réussie au tap sur l'icône d'échec.
- Le bouton Horodater envoie déjà par mail le fichier gtext chiffré avec la preuve OTS. **Décision : pas de PDF chiffré supplémentaire dans Horodater** (abandonné).
- Surveillance automatique (ping) de Kura à prévoir, pour éviter une panne silencieuse.

## Onglet Punk Records

- Gestion de fichiers vidéo/audio/PDF avec mots-clés, et recherche par rimes : on tape un mot, l'app renvoie les fichiers dont un mot-clé rime avec lui. Niveau par défaut : rime suffisante (deux sons finaux communs).
- Déjà fait : moteur de rimes autonome (`rimes.json`, dérivé de Lexique383, sur le dépôt).
- À faire : rattacher le moteur aux mots-clés des fichiers (catalogage).
- Punk Records reçoit aussi les articles archivés par CopMonk (PDF).

## Onglet CopMonk (version améliorée d'Archiveur)

- Reprend la fonction d'Archiveur (captures d'écran → PDF) et ajoute l'enregistrement d'articles vus sur le web, façon Pocket : garder l'article avec titre, source et date, lisible plus tard, et le sauvegarder en **PDF** pour le stocker dans Punk Records (dossier PDF de `/volume1/Nindo/Sharingan`).
- À cadrer dans le plan : comment capturer un article depuis le téléphone ou le Mac (partage Android, bookmarklet, coller une URL), extraction du contenu lisible côté VPS, génération du PDF, et sa mise en place dans Punk Records avec des mots-clés.
- Données centralisées sur Kura via le VPS, comme le reste.

## Onglet Dédale (périmètre à cadrer)

- Mind mapping façon Inspiration : des satellites (rectangles avec un titre) reliés par des flèches.
- Un satellite peut être associé à un fichier Punk Records (vidéo, PDF, son), un article CopMonk, un lien YouTube ou un `.gtext` (ouverture via le mécanisme d'URL de Scriptum).
- Toute la carte tient dans un fichier JSON enregistré sur Kura via le VPS.
- Utiliser une bibliothèque de graphe existante (React Flow ou Cytoscape) plutôt que tout recoder. Le tactile (déplacer, zoomer, relier au doigt) doit marcher sur le Magic 7.

## Feuille de route (dans cet ordre)

0. Test WebAuthn : page jetable, hors de l'app principale. Vérifier si l'extension PRF permet de dériver une clé de chiffrement sur le Magic 7 (navigateur utilisé à préciser) et sur le Mac (Touch ID). Si PRF échoue : l'empreinte sert seulement de verrou d'écran, le mot de passe reste la vraie protection. Pas de Capacitor.
1. Coquille à quatre onglets : intégrer Scriptum existant et créer les trois autres onglets vides, avec la clé de chiffrement partagée en mémoire.
2. Finir Scriptum : Georgia avec Gelasio en secours (import docx / odt / pdf et PDF chiffré dans Horodater abandonnés).
3. Liens dans le texte de Scriptum : une plage de texte avec une cible (autre .gtext, fichier Punk Records, URL), cliquable. Stocker les liens dans le format .gtext sans casser les anciens fichiers.
4. Sync et conflits de Scriptum, et surveillance de Kura.
5. Dédale minimal : satellites, flèches, un .gtext attaché, sauvegarde JSON.
6. Punk Records : catalogage par mots-clés.
7. CopMonk : archivage d'articles web en PDF vers Punk Records.
8. Liens des satellites de Dédale vers Punk Records, CopMonk et YouTube.
