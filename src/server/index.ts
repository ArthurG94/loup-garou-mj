import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { ROLES } from '../shared/roles.js';

const here = dirname(fileURLToPath(import.meta.url));
/** En production, l'interface construite par Vite est dans dist/client. */
const clientDir = resolve(here, '../../client');
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

app.get('/api/health', () => ({ status: 'ok' }));

/** Liste des rôles : servira aux téléphones des joueurs dans une prochaine version. */
app.get('/api/roles', () => ROLES);

if (existsSync(clientDir)) {
	await app.register(fastifyStatic, { root: clientDir, prefix: '/' });
	app.setNotFoundHandler((request, reply) => {
		if (request.url.startsWith('/api/')) {
			return reply.code(404).send({ error: 'Introuvable' });
		}
		return reply.sendFile('index.html');
	});
} else {
	app.log.info(`Pas d'interface construite dans ${clientDir} : en développement, Vite la sert sur le port 5173.`);
}

try {
	await app.listen({ port, host });
} catch (error) {
	app.log.error(error);
	process.exit(1);
}
