# Loup-Garou · Maître du jeu

Assistant pour le maître du jeu de notre Loup-Garou de Thiercelieux maison (cartes et règles personnalisées).
Il dit, phase par phase, qui réveiller, quoi dire et quoi demander, et suit l'état de la partie (morts, potions, amoureux, louveteau…).

## Ce que fait l'appli

- **Préparation** : joueurs dans l'ordre de la table, paquet de cartes (32 rôles), mode MJ expérimenté pour les étapes « *** » de l'Excel.
- **Narration** : une étape à la fois, la carte du rôle appelé au centre, le texte à lire, et l'outil de l'étape (désigner une victime, voir un rôle, utiliser une potion…).
  Les rôles morts ou paralysés restent appelés « pour de faux » afin de ne rien révéler.
- **Village** : vivants et morts, rôles, pouvoirs restants, journal de la partie.
- **Cartes** : toutes les cartes avec leur texte.

La partie en cours est sauvegardée dans le navigateur du MJ ; « Annuler » revient en arrière d'une action.

## Développement

Node.js 22 ou plus. Pour l'instant, l'appli est **100 % statique** : tout tourne dans le navigateur, la partie est sauvegardée dans le `localStorage`, aucun serveur n'est nécessaire.

```bash
npm install
npm run dev        # interface Vite sur :5173
npm run lint       # @turtl/eslint-config
npm run typecheck
npm test           # Vitest, règles du jeu
npm run build      # site statique dans dist/client
npm run preview    # sert dist/client pour vérifier le build
```

Le build utilise des chemins relatifs (`base: './'` dans `vite.config.ts`) : le même `dist/client` marche à la racine d'un domaine comme dans un sous-dossier.

## Organisation

| Dossier | Contenu |
| --- | --- |
| `src/shared` | Rôles, ordre des étapes, moteur de règles. Sans dépendance au navigateur, pour pouvoir tourner aussi côté serveur. |
| `src/client` | Interface Lit (composants `lg-*`), construite par Vite. C'est tout ce que publie GitHub Pages. |
| `src/server` | Serveur Fastify, **pas utilisé pour l'instant** (voir plus bas). |

Pour ajouter un rôle : une entrée dans `src/shared/roles.ts`, son illustration dans `src/client/public/cards/<id>.webp`, et ses étapes dans `src/shared/steps.ts`.

## Déploiement sur GitHub Pages

Le workflow vérifie (lint, types, tests), construit et publie `dist/client` à chaque push sur `main` (ou à la main depuis l'onglet Actions).

Mise en place, une seule fois :

1. Déplacer `docs/github-pages.yml` vers `.github/workflows/pages.yml` (Claude ne peut pas pousser de workflow lui-même, faute de droit `workflow` sur le jeton).
2. Dans *Settings → Pages* du dépôt, choisir **Source : GitHub Actions**.

L'appli est alors en ligne sur https://arthurg94.github.io/loup-garou-mj/.

## Plus tard : serveur Node

Le serveur Fastify de `src/server` est gardé pour le futur mode où les joueurs rejoignent depuis leur téléphone (hébergement classique, pas GitHub Pages). L'appli statique n'en dépend pas : il sert juste l'interface construite et une petite API (`/api/health`, `/api/roles`).

```bash
npm run dev:serveur    # serveur sur :3000 et interface Vite sur :5173 (proxy /api)
npm run build:serveur  # dist/client (interface) et dist/server (Node)
npm start              # sert l'appli construite sur :3000

docker build -t loup-garou-mj .
docker run -p 3000:3000 loup-garou-mj
```

Variables : `PORT` (3000 par défaut), `HOST` (0.0.0.0), `LOG_LEVEL` (info).
