# QR Studio

Plateforme de création et de suivi de **QR codes dynamiques** : un QR code imprimé
pointe vers un lien court QR Studio (`/r/:slug`) qui redirige vers la destination
actuelle et enregistre chaque scan dans Firestore.

## Stack

| Couche | Technologie |
| --- | --- |
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4, React Router |
| Authentification | Firebase Authentication (email / mot de passe) |
| Base de données | Firebase Firestore + règles de sécurité |
| Backend (scans) | Netlify Function `netlify/functions/r.ts` + Firebase Admin SDK |
| QR codes | `qrcode` (PNG, SVG, redirection) · `recharts` pour les graphiques |
| Hébergement | Netlify (frontend + fonction) |

## Pages

| Route | Contenu |
| --- | --- |
| `/` | Page d'accueil publique |
| `/signup`, `/login`, `/forgot-password` | Inscription, connexion, réinitialisation |
| `/app` | Tableau de bord (KPIs, graphique, top QR, derniers scans) |
| `/app/qrcodes` | Liste des QR codes (recherche, filtre, suppression) |
| `/app/qrcodes/:id` | Détails, statistiques, édition de la destination, exports |
| `/app/new` | Création d'un QR code avec aperçu en direct |
| `/app/settings` | Profil, mot de passe, informations du compte |
| `/r/:slug` | **Fonction Netlify** : enregistre le scan puis redirige (302) |

## Modèle de données

```
users/{uid}                     email, displayName, createdAt
qrcodes/{qrId}                  ownerId, name, type, destination, slug,
                                totalScans, uniqueVisitors, lastScanAt,
                                active, createdAt, updatedAt
qrcodes/{qrId}/days/{YYYY-MM-DD}      count, visitors, ownerId, qrId
qrcodes/{qrId}/scans/{scanId}         ts, device, os, browser, country, city, referrer
qrcodes/{qrId}/visitors/{hash}        empreinte hachée (IP + User-Agent + sel)
slugs/{slug}                    qrId, ownerId  ← lookup public de la redirection
```

Le lien `/r/:slug` **ne change jamais** : modifier la destination met à jour
`qrcodes.destination`, donc les supports déjà imprimés continuent de fonctionner.

### Comment un scan est enregistré

1. `GET /r/:slug` → `netlify.toml` la réécrit vers la fonction `r`.
2. La fonction lit `slugs/{slug}` puis exécute **une seule transaction** :
   `totalScans`, `uniqueVisitors`, `lastScanAt`, le compteur du jour, le
   visiteur haché et l'événement de scan.
3. Elle répond `302 Location: <destination>` (ou une page HTML pour un QR
   « texte simple »), avec `Cache-Control: no-store`.
4. Le tableau de bord écoute Firestore en temps réel : les compteurs bougent
   sans rechargement.

Aucune adresse IP brute n'est stockée : seules des empreintes hachées
(`SCAN_HASH_SALT`) permettent d'estimer les visiteurs uniques.

## Développement local

```bash
npm install
npm run emulators     # terminal 1 : Auth (9099) + Firestore (8080)
npm run dev           # terminal 2 : http://127.0.0.1:5173
```

`.env.local` fourni utilise les émulateurs (`VITE_USE_EMULATORS=true`). Les
émulateurs Firestore nécessitent **Java 11+** ; si votre `java` est trop ancien,
installez un JDK 17/21 et pointez `JAVA_HOME` dessus.

Le serveur Vite route lui-même `/r/:slug` vers la vraie fonction pendant le
développement (voir `vite.config.ts`), donc la redirection et les scans sont
testables sans Netlify CLI.

## Configuration Firebase

1. Créez un projet sur <https://console.firebase.google.com>.
2. **Authentication → Sign-in method** : activez *Email/Password*.
3. **Firestore Database** : créez la base (mode production).
4. Ajoutez une **application Web** et copiez la configuration du SDK.
5. Déployez les règles et les index :

```bash
npx firebase login
npx firebase use --add          # sélectionnez votre projet
npx firebase deploy --only firestore:rules,firestore:indexes
```

Les index composites nécessaires sont dans `firestore.indexes.json`
(`qrcodes`, collection group `days`, collection group `scans`).

6. Générez une clé de compte de service :
   **Paramètres du projet → Comptes de service → Générer une nouvelle clé
   privée** (fichier JSON). Elle sera utilisée par la fonction Netlify pour
   écrire les scans en contournant les règles.

## Déploiement sur Netlify

### 1. Variables d'environnement (Site configuration → Environment variables)

| Variable | Portée | Valeur |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Build | Clé Web Firebase (publique) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Build | `votre-projet.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Build | `votre-projet` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Build | `votre-projet.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Build | depuis la console |
| `VITE_FIREBASE_APP_ID` | Build | depuis la console |
| `VITE_USE_EMULATORS` | Build | `false` |
| `FIREBASE_SERVICE_ACCOUNT` | Functions | le JSON complet de la clé de compte de service |
| `FIREBASE_PROJECT_ID` | Functions | `votre-projet` |
| `SCAN_HASH_SALT` | Functions | chaîne aléatoire longue, stable |

Les variables `VITE_*` sont publiques par nature (elles partent dans le bundle).
`FIREBASE_SERVICE_ACCOUNT` et `SCAN_HASH_SALT` restent côté fonction uniquement.

### 2. Déploiement

```bash
npx netlify-cli login
npx netlify-cli init            # lier le dossier au site
npx netlify-cli deploy --build --prod
```

Ou connectez le dépôt Git à Netlify : `netlify.toml` déclare déjà
`command = "npm run build"`, `publish = "dist"`, `functions = "netlify/functions"`.

### 3. Domaine

Une fois le domaine en place, **ne le changez plus** : les QR codes imprimés
encodent `https://votre-domaine/r/<slug>`. Un domaine personnalisé Netlify
fonctionne tant que l'ancien domaine reste actif.

## Sécurité

- Règles Firestore (`firestore.rules`) : lecture/écriture limitées au
  propriétaire (`ownerId == request.auth.uid`), compteurs non modifiables par
  le client, analytics en écriture serveur uniquement, table `slugs` privée.
- Chemins privés protégés par `ProtectedRoute` (session Firebase).
- Les QR codes d'un autre compte renvoient une erreur « introuvable » et la
  route redirige vers la liste.
- Aucune clé serveur dans le bundle frontend.

## Développement

```bash
npm run typecheck     # TypeScript strict
npm run build         # tsc + vite build
```
