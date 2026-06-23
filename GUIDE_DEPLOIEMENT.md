# Guide de déploiement — Gestion Employés

## 1. Prérequis

- Un compte [Firebase](https://console.firebase.google.com) (gratuit, plan Spark suffit)
- Un compte [Render](https://render.com) (backend)
- Un compte [Vercel](https://vercel.com) (frontend)
- Node.js ≥ 18 en local

## 2. Créer le projet Firebase

1. [console.firebase.google.com](https://console.firebase.google.com) → **Ajouter un projet** (ex: `gestion-employees`).
2. **Firestore Database** → Créer une base, mode production, région la plus proche.
3. **Paramètres du projet → Comptes de service → Générer une nouvelle clé privée** → télécharge un fichier JSON. Il contient `project_id`, `client_email`, `private_key` — c'est tout ce qu'il faut pour le backend (Admin SDK, aucune règle Firestore à écrire : le backend bypass les règles).

Aucune configuration "Authentication" Firebase n'est nécessaire : l'app utilise son propre système de comptes (identifiant + mot de passe géré par le backend), pas Firebase Auth.

## 3. Configuration locale

**Backend** (`server/.env`, copier depuis `.env.example`) :
```
JWT_SECRET=une_longue_chaine_aleatoire
FIREBASE_PROJECT_ID=<project_id du JSON>
FIREBASE_CLIENT_EMAIL=<client_email du JSON>
FIREBASE_PRIVATE_KEY="<private_key du JSON, avec les \n tels quels>"
PORT=3003
CLIENT_URL=http://localhost:5173
```

**Frontend** (`client/.env`, copier depuis `.env.example`) :
```
VITE_API_BASE=http://localhost:3003
```

## 4. Lancer en local

```bash
cd server && npm install && npm run dev
cd client && npm install && npm run dev
```

Frontend sur http://localhost:5173, backend sur http://localhost:3003.

## 5. Créer le premier compte admin

Une seule fois, tant qu'aucun utilisateur n'existe :
```bash
curl -X POST http://localhost:3003/api/auth/seed
```
Crée `admin` / `Admin@2026!` — **changez ce mot de passe immédiatement** depuis l'app (Profil → Changer mon mot de passe).

## 6. Déploiement backend (Render)

1. Poussez le code sur GitHub.
2. Render → **New → Web Service** → connectez le repo.
3. Render détecte `server/render.yaml` (root dir `server`, build `npm install`, start `node server.js`, health check `/health`).
4. Dans l'onglet **Environment**, ajoutez manuellement : `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (coller la clé avec ses `\n` littéraux), `CLIENT_URL` (URL Vercel, à mettre à jour après l'étape 7).
5. `JWT_SECRET` est généré automatiquement par Render (`generateValue: true`).
6. Déployez. Vérifiez : `curl https://<votre-service>.onrender.com/health`.

## 7. Déploiement frontend (Vercel)

1. Vercel → **Add New Project** → importez le repo, **Root Directory = `client`**.
2. Variable d'environnement : `VITE_API_BASE=https://<votre-service>.onrender.com`.
3. Déployez. Mettez ensuite à jour `CLIENT_URL` sur Render avec l'URL Vercel obtenue (`https://....vercel.app`), pour que CORS autorise le frontend.

## 8. Vérifications post-déploiement

- `https://<frontend>.vercel.app` charge la page de connexion.
- Connexion avec `admin` fonctionne.
- L'app propose "Ajouter à l'écran d'accueil" (PWA installable) sur mobile.
- Dans **Paramètres pointage**, générer le QR, ajouter l'IP et la position GPS de chaque établissement (voir `MODE_EMPLOI.md`).

## 9. Notes importantes

- **Render free tier** : le service s'endort après 15 min d'inactivité, ~30s de réveil au premier appel — normal.
- **Icônes PWA** : `client/public/icons/icon-192.png` et `icon-512.png` sont des carrés verts génériques (placeholders). Remplacez-les par vos vrais logos (ex: via [realfavicongenerator.net](https://realfavicongenerator.net)) en conservant les mêmes noms de fichiers.
- **HTTPS obligatoire** pour la caméra et la géolocalisation : fonctionne automatiquement sur Vercel, mais pas en accès HTTP simple (seul `localhost` fait exception en local).
