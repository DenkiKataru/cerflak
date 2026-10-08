# Cerflak : contexte du projet

Cerflak est une application d'écriture et d'archivage unifiée, développée par un auteur indépendant (non développeur de métier). Elle tient dans **une seule application à trois onglets** : Scriptum (éditeur chiffré), Punk Records (fichiers + rimes) et CopMonk (archivage d'articles web, version améliorée d'Archiveur). L'onglet Dédale (mind mapping) a été abandonné : les liens de Scriptum vers les fichiers de Punk Records le remplacent.

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
- Interface en **trois onglets** : Scriptum, Punk Records, CopMonk. Une seule base de code, une seule navigation. La clé de chiffrement déverrouillée reste en mémoire le temps de la session et sert à tous les onglets (pas de nouveau mot de passe en changeant d'onglet). Charger les onglets lourds à la demande pour garder un démarrage rapide.
- Capacitor est abandonné (complexité du toolchain Android). Ne pas le réintroduire sans me le demander.
- Attention au cache du service worker : après chaque déploiement, prévoir un moyen de forcer la mise à jour de la PWA.

## Abandons définitifs (ne pas réintroduire)

- Dédale (mind mapping) : onglet retiré. Ne pas le réintroduire sans me le demander.
- Synchronisation automatique et gestion de conflits de Scriptum (auto-save local, envoi périodique vers Kura, indicateur d'état) : abandonnées.
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
- **Décision : pas de synchronisation automatique ni de gestion de conflits** (abandonné). L'enregistrement sur Kura reste une action manuelle.
- Liens dans le texte (faits) : sélection de texte → adresse web, autre gtext, ou fichier de Punk Records (PDF, son, vidéo). Un lien est un `<a href>` dans le texte ; les liens vers un gtext ou un fichier Punk Records sont des adresses de l'appli (`?dossier=...&fichier=...` ou `?type=...&media=...`), donc cliquables aussi dans les exports PDF.
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

## Feuille de route (dans cet ordre)

0. Test WebAuthn : fait (page jetable hors de l'app principale).
1. Coquille à onglets avec clé et jeton partagés en mémoire : faite (trois onglets).
2. Finir Scriptum : Georgia avec Gelasio en secours : fait (import docx / odt / pdf, PDF chiffré dans Horodater et synchronisation automatique abandonnés).
3. Liens dans le texte de Scriptum : faits (adresse web, autre gtext, fichier de Punk Records). Reste à ajouter les articles CopMonk comme cibles quand CopMonk existera.
4. Punk Records : catalogage par mots-clés (rattacher le moteur de rimes aux mots-clés des fichiers).
5. CopMonk : archivage d'articles web en PDF vers Punk Records.
6. Surveillance (ping) de Kura : à reprendre plus tard si je le redemande.
