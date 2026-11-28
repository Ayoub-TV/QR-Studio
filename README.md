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
| Backend (scans) | Cloudflare Pages Function `functions/r/[[slug]].ts` |
| Accès Firestore serveur | API REST Firestore + jeton OAuth de compte de service (WebCrypto) |
| QR codes | `qrcode` (PNG, SVG, redirection) · `recharts` pour les graphiques |
| Hébergement | **Cloudflare Pages** (frontend + fonction) |

> Le projet n'utilise plus Netlify. Les Pages Functions remplacent les Netlify
> Functions, et `firebase-admin` a été retiré : il ne peut pas s'exécuter sur le
> runtime Cloudflare (workerd), l'équivalent exact est un client Firestore REST
> transactionnel (`functions/_lib/firestore.ts`).

## Pages

| Route | Contenu |
| --- | --- |
| `/` | Page d'accueil publique |
| `/signup`, `/login`, `/forgot-password` | Inscription, connexion, réinitialisation |
| `/app` | Tableau de bord (KPIs, graphique, top QR, derniers scans) |
| `/app/qrcodes` | Liste des QR codes (recherche, filtre, suppression) |
| `/app/qrcodes/:id` | Détails, statistiques, édition de la destination, activation/désactivation, exports |
| `/app/new` | Création d'un QR code avec aperçu en direct |
| `/app/settings` | Profil, mot de passe, informations du compte |
| `/r/:slug` | **Pages Function** : enregistre le scan puis redirige (302) |

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

1. `GET /r/:slug` → le routeur de Cloudflare Pages appelle
   `functions/r/[[slug]].ts` (le fichier remplace la réécriture `netlify.toml`).
2. La fonction lit `slugs/{slug}` puis exécute **une seule transaction** :
   `totalScans`, `uniqueVisitors`, `lastScanAt`, le compteur du jour, le
   visiteur haché et l'événement de scan.
3. Elle répond `302 Location: <destination>` (ou une page HTML pour un QR
   « texte simple »), avec `Cache-Control: no-store`.
4. Le tableau de bord écoute Firestore en temps réel : les compteurs bougent
   sans rechargement.

Aucune adresse IP brute n'est stockée : seules des empreintes hachées
(`SCAN_HASH_SALT`) permettent d'estimer les visiteurs uniques.

### Accès Firestore côté serveur

`firebase-admin` (gRPC, `fs`, `http2`) ne fonctionne pas dans workerd. La
fonction utilise donc :

- `functions/_lib/credentials.ts` : signe un JWT RS256 avec la clé de compte de
  service (WebCrypto) et l'échange contre un jeton OAuth (`datastore` scope).
  Le jeton est mis en cache dans l'instance de la fonction.
- `functions/_lib/firestore.ts` : appels REST (`documents:beginTransaction`,
  `get`, `documents:commit`) avec masques de champs (sémantique `merge: true`).

Comme l'Admin SDK, ce compte de service contourne les règles de sécurité : c'est
la fonction, et elle seule, qui écrit les compteurs et les analytiques.

## Développement local

```bash
npm install
npm run emulators     # terminal 1 : Auth (9099) + Firestore (8080)
npm run dev           # terminal 2 : http://127.0.0.1:5173
```

`.env.local` fourni utilise les émulateurs (`VITE_USE_EMULATORS=true`). Les
émulateurs Firestore nécessitent **Java 11+** ; si votre `java` est trop ancien,
installez un JDK 17/21 et pointez `JAVA_HOME` dessus.

Le serveur Vite route lui-même `/r/:slug` vers le **même handler** que la Pages
Function (`handleScan` dans `functions/_lib/handler.ts`, branché dans
`vite.config.ts`), donc la redirection et les scans sont testables sans runtime
Cloudflare. Les variables `FIREBASE_*`, `FIRESTORE_*` et `SCAN_*` de
`.env.local` sont chargées automatiquement.

Pour tester le runtime Cloudflare réel :

```bash
npm run pages:dev     # build + wrangler pages dev dist (http://127.0.0.1:8787)
```

`wrangler pages dev` lit les variables serveur dans un fichier `.dev.vars`
(gitignoré, jamais commité) ou le fichier `.env` passé via `--env-file`.

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
   privée** (fichier JSON). Elle sera utilisée par la Pages Function pour
   écrire les scans en contournant les règles.

7. **Firebase Authentication → Settings → Authorized domains** : ajoutez
   `qr-studio-dne.pages.dev` (et votre domaine personnalisé). Sans cela, la
   connexion échoue avec `auth/unauthorized-domain`.

## Déploiement sur Cloudflare Pages

### 1. Paramètres de build

Workers & Pages → **qr-studio-dne** → Settings → Build configuration :

| Réglage | Valeur |
| --- | --- |
| Framework preset | Vite (ou *None*) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(vide)* |
| Node version | 20 ou 22 (`NODE_VERSION`) |

### 2. Variables d'environnement

Workers & Pages → **qr-studio-dne** → Settings → **Variables and Secrets**.

Variables **publiques** utilisées à la compilation (type *Text*), identiques à
celles de `.env.local` :

| Variable | Type | Valeur |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Text | clé Web Firebase (publique) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Text | `votre-projet.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Text | `votre-projet` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Text | `votre-projet.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Text | depuis la console |
| `VITE_FIREBASE_APP_ID` | Text | depuis la console |
| `VITE_FIREBASE_MEASUREMENT_ID` | Text | `G-…` (facultatif : sans valeur, Analytics reste désactivé) |
| `VITE_USE_EMULATORS` | Text | `false` |
| `NODE_VERSION` | Text | `22` |

Variables **serveur** (type *Secret*), lisibles uniquement par la Pages Function :

| Variable | Type | Valeur |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | Secret | le JSON complet de la clé de compte de service (obligatoire pour `/r/:slug`) |
| `FIREBASE_PROJECT_ID` | Text | `votre-projet` (facultatif) |
| `SCAN_HASH_SALT` | Secret | chaîne aléatoire longue, stable |

Après toute modification de variable, **redéployez** : les `VITE_*` sont figées
dans le bundle au moment du build.

### 3. Pourquoi la page « Configuration requise » apparaissait

Le frontend n'affichait `SetupNotice` que si `VITE_FIREBASE_API_KEY` ou
`VITE_FIREBASE_PROJECT_ID` manquait **au moment du build**. Sur Cloudflare Pages,
Vite ne lit pas `.env.local` (non versionné) : sans variables déclarées dans
*Settings → Variables and Secrets* **avant** le build, le bundle partait avec des
valeurs vides.

Depuis le 27/11/2026, `src/lib/firebase.ts` embarque la configuration Web
publique du projet `qr-studio-d2ebd` comme **valeurs par défaut** (apiKey,
authDomain, projectId, appId, measurementId). Ce sont des identifiants publics,
pas des secrets : ils sont de toute façon présents dans le bundle de chaque
visiteur, et `firestore.rules` reste la seule barrière d'accès. Conséquences :

- un build sans aucune variable `VITE_FIREBASE_*` (cas d'un build CI) fonctionne ;
- toute variable `VITE_FIREBASE_*` définie restaure la priorité sur le défaut ;
- aucune clé de compte de service n'est concernée (côté serveur uniquement).

### 4. Déploiement

Le projet Pages s'appelle **`qr-studio`** et sert le domaine
`qr-studio-dne.pages.dev` (`wrangler.toml` → `name = "qr-studio"`). Il est relié
à un dépôt GitHub : chaque push sur la branche de production reconstruit le site
**à partir du dépôt**, et remplace donc tout déploiement direct précédent.

Déploiement depuis la machine (ce qui a été utilisé le 27/11/2026) :

```bash
npx wrangler login
npm run build
npx wrangler pages deploy dist --project-name qr-studio --branch main
```

⚠️ Un déploiement direct ne survit pas au prochain build GitHub : pour que les
corrections soient permanentes, elles doivent être poussées dans le dépôt relié
(sinon le site revient à la version du dépôt au push suivant).

`public/_redirects` (SPA) et `public/_headers` (en-têtes de sécurité) sont
recopiés dans `dist` par Vite. `/r/*` est servi par la Function, qui a priorité
sur les règles statiques.

### 5. Domaine

Une fois le domaine en place, **ne le changez plus** : les QR codes imprimés
encodent `https://votre-domaine/r/<slug>`. Un domaine personnalisé Cloudflare
Pages fonctionne tant que l'ancien domaine reste actif — les liens déjà
imprimés sur l'ancien domaine Netlify continueront de pointer vers Netlify
jusqu'à sa suppression.

## Analytics (facultatif)

Firebase Analytics n'est initialisé que si `VITE_FIREBASE_MEASUREMENT_ID` est
défini et si le navigateur le supporte (`isSupported()`), jamais avec les
émulateurs. Sinon l'application fonctionne normalement, sans erreur ni script
supplémentaire. Code : `src/lib/analytics.ts`.

## Sécurité

- Règles Firestore (`firestore.rules`) : lecture/écriture limitées au
  propriétaire (`ownerId == request.auth.uid`), compteurs non modifiables par
  le client, analytics en écriture serveur uniquement, table `slugs` privée.
- Chemins privés protégés par `ProtectedRoute` (session Firebase).
- Les QR codes d'un autre compte renvoient une erreur « introuvable » et la
  route redirige vers la liste.
- Aucune clé serveur dans le bundle frontend : `FIREBASE_SERVICE_ACCOUNT` et
  `SCAN_HASH_SALT` sont des secrets Cloudflare, jamais des `VITE_*`.

## Développement

```bash
npm run typecheck     # TypeScript strict (src + functions)
npm run build         # tsc + vite build
npm run pages:dev     # build + runtime Cloudflare local
```
