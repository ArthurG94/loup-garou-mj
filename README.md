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

Node.js 22 ou plus.

```bash
npm install
npm run dev        # serveur sur :3000 et interface Vite sur :5173
npm run lint       # @turtl/eslint-config
npm run typecheck
npm test           # Vitest, règles du jeu
npm run build      # dist/client (interface) et dist/server (Node)
npm start          # sert l'appli construite sur :3000
```

## Organisation

| Dossier | Contenu |
| --- | --- |
| `src/shared` | Rôles, ordre des étapes, moteur de règles. Sans dépendance au navigateur, pour pouvoir tourner aussi côté serveur. |
| `src/client` | Interface Lit (composants `lg-*`), construite par Vite. |
| `src/server` | Serveur Fastify : sert l'interface et l'API (`/api/health`, `/api/roles`). Base du futur mode où les joueurs rejoignent depuis leur téléphone. |

Pour ajouter un rôle : une entrée dans `src/shared/roles.ts`, son illustration dans `src/client/public/cards/<id>.webp`, et ses étapes dans `src/shared/steps.ts`.

## Déploiement

```bash
docker build -t loup-garou-mj .
docker run -p 3000:3000 loup-garou-mj
```

Variables : `PORT` (3000 par défaut), `HOST` (0.0.0.0), `LOG_LEVEL` (info).
