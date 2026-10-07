# Plan : retirer les clés d'accès du code public

Ce document est un **plan**, pas du code. Il ne contient aucune clé (ancienne ou nouvelle).
Rien n'est codé ni déployé avant l'accord de l'auteur.

## 1. Le problème

`index.html` contient deux clés d'accès écrites en clair (`KURA_API_SECRET` et `SCRIPTUM_API_SECRET`).
GitHub Pages sert ce fichier à tout le monde : n'importe qui peut les lire et appeler l'API
`scriptum-api.lesplumeslestees.fr` (lister, lire, enregistrer des fichiers sur Kura, lancer des exports et des horodatages).

Deux conséquences :

- **Retirer les clés du fichier ne suffit pas.** Elles restent dans l'historique Git et peuvent avoir été copiées.
  La vraie réparation est de les **remplacer côté serveur** : les anciennes valeurs deviennent alors inutiles.
- Une des clés est aussi placée **dans une adresse web** (`...&secret=...` pour lire les médias). Les adresses
  s'enregistrent dans les journaux du serveur et l'historique du navigateur. Il faut supprimer cet usage.

## 2. Ce que fait chaque clé aujourd'hui

| Clé | Routes concernées |
|---|---|
| `KURA_API_SECRET` | enregistrer, lister, ouvrir des fichiers, liste et lecture des médias Punk Records, mots-clés |
| `SCRIPTUM_API_SECRET` | horodatage (OTS) et export PDF/ODT/DOCX |

Les deux passent par le même nom de domaine (le VPS), dans l'en-tête `X-Api-Secret`.

## 3. Options étudiées

### Option A : jeton dérivé du mot de passe (PBKDF2, avec une autre « étiquette » que la clé de chiffrement)

- Avantage : rien de plus à saisir.
- Défauts importants :
  - Dans Cerflak, **le mot de passe est choisi appareil par appareil** et il change si tu restaures avec le code de récupération.
    Le jeton changerait avec lui, et il faudrait remettre à jour le serveur à chaque fois.
  - La solidité du jeton = la solidité du mot de passe. Un mot de passe moyen donne un jeton devinable
    (le serveur peut être attaqué en boucle, et si son fichier fuit, on peut deviner hors ligne).
  - Pas de moyen de couper l'accès d'un seul appareil perdu.

### Option B (recommandée) : jeton aléatoire, saisi une fois par appareil, rangé chiffré

- Un jeton **long et aléatoire** (64 caractères, généré par Bitwarden), **un par appareil** (Magic 7, Mac).
- Il est collé **une seule fois** sur chaque appareil, puis **gardé chiffré** avec la clé maîtresse de Scriptum
  (les fonctions de chiffrement existent déjà dans `scriptum.js`). Au déverrouillage, il est déchiffré **en mémoire seulement**.
- Le serveur ne garde **pas le jeton**, seulement son **empreinte** (SHA-256). Si le fichier du serveur fuit,
  les jetons restent introuvables.
- Appareil perdu : on supprime son empreinte côté serveur, les autres appareils continuent.
- Le jeton est **indépendant du mot de passe et de la clé de chiffrement** : changer de mot de passe ne casse rien.

Limite à connaître : le jeton existe en mémoire pendant la session, comme l'ancienne clé. Cette méthode protège contre
« tout le monde peut lire le code public », pas contre un appareil déjà piraté.

## 4. Changements dans l'application (étape de code, après accord)

1. **Une seule fonction d'appel au serveur** (`apiFetch`) remplace les ~15 appels qui écrivent chacun la clé. Elle ajoute
   l'en-tête `Authorization: Bearer <jeton>`.
2. **Saisie du jeton** : si aucun jeton n'est rangé sur l'appareil, un écran le demande une fois, juste après le déverrouillage.
   Il est chiffré avec la clé maîtresse et rangé dans le navigateur. En cas de refus du serveur (401), l'écran revient.
3. **Lecture des médias** (audio/vidéo qui ne peuvent pas envoyer d'en-tête) : le serveur fournit un **lien signé valable ~60 secondes**
   au lieu de mettre la clé dans l'adresse.
4. **Suppression des deux constantes** dans `index.html`.
5. **Tests** (Node) pour la logique pure : chiffrement/déchiffrement du jeton, refus avec une mauvaise clé.
6. `sw.js` : changer le numéro de version du cache pour que la PWA se mette à jour.
7. Période de transition : l'application envoie le nouveau jeton ; le serveur accepte **à la fois** les anciennes clés et les nouvelles,
   le temps de tout vérifier. Les anciennes clés sont coupées en dernier.

## 5. Changements côté serveur (à écrire après avoir vu le code serveur, sans les clés)

Le code du serveur n'est pas dans ce dépôt. Pour écrire le correctif, il faudra les fichiers du serveur Node.js (Kura)
et de la configuration du VPS, **avec les valeurs secrètes masquées**.

- Lire une liste d'empreintes autorisées depuis le fichier `.env` (une par appareil).
- Comparer l'empreinte du jeton reçu à cette liste, avec une comparaison à temps constant.
- Accepter temporairement aussi l'ancien en-tête, puis le retirer.
- Ajouter la route « lien signé court » pour les médias.
- N'autoriser que l'origine `https://denkikataru.github.io` (CORS).
- Limiter les essais (par exemple 10 refus par minute et par adresse IP, puis blocage temporaire).
- Ne plus écrire les en-têtes d'authentification ni les paramètres `secret=` dans les journaux.

## 6. Ordre des opérations (pour ne jamais être bloqué)

0. Copie de sécurité des dossiers sur Kura.
1. Générer et ranger les nouveaux jetons dans Bitwarden ; calculer leurs empreintes.
2. Mettre les empreintes dans le `.env` du serveur, qui accepte **anciennes et nouvelles** clés. Redémarrer.
3. Fusionner la nouvelle version de l'application ; mettre à jour la PWA ; saisir le jeton sur chaque appareil ; tester.
4. Retirer les anciennes clés du `.env` du serveur ; redémarrer ; vérifier que les anciennes sont refusées (erreur 401).
5. Nettoyer les journaux qui contiennent d'anciennes adresses avec `secret=`.
6. Vérifier les journaux et les fichiers de Kura pour repérer un usage inconnu.

L'historique Git n'est **pas** réécrit : cela ne protège plus de rien une fois les anciennes clés mortes,
et c'est une opération risquée (suppression de l'historique). À reconsidérer seulement si tu le demandes.

## 7. Points à valider par l'auteur

- Un jeton par appareil (recommandé) ou un seul pour les deux ?
- Un même jeton accepté par les deux services (Kura et horodatage/export), ou un jeton par service ?
- Accord pour la période de transition (anciennes + nouvelles clés acceptées quelques jours) ?
