import ts from 'typescript';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

/**
 * Vite ne sait pas encore transformer les décorateurs standards (`@property() accessor`) utilisés par Lit.
 * On laisse TypeScript compiler les composants avant Vite.
 */
function standardDecorators(): Plugin {
	return {
		name: 'standard-decorators',
		enforce: 'pre',
		transform(code, id) {
			if (!id.endsWith('.ts') || !code.includes('@')) {
				return null;
			}
			const output = ts.transpileModule(code, {
				fileName: id,
				compilerOptions: {
					target: ts.ScriptTarget.ES2022,
					module: ts.ModuleKind.ESNext,
					useDefineForClassFields: false,
					verbatimModuleSyntax: true,
					sourceMap: true,
				},
			});
			return { code: output.outputText, map: output.sourceMapText ?? null };
		},
	};
}

export default defineConfig({
	root: 'src/client',
	/**
	 * Chemins relatifs : l'appli marche aussi bien à la racine d'un domaine (serveur Node)
	 * que dans un sous-dossier comme https://arthurg94.github.io/loup-garou-mj/ (GitHub Pages).
	 */
	base: './',
	plugins: [standardDecorators()],
	build: {
		outDir: '../../dist/client',
		emptyOutDir: true,
	},
	server: {
		// Utile seulement avec `npm run dev:serveur` : l'appli statique n'appelle aucune API.
		proxy: {
			'/api': 'http://localhost:3000',
		},
	},
});
