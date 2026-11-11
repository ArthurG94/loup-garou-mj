import config from '@turtl/eslint-config';

export default [
	{
		ignores: ['dist/**', 'node_modules/**', 'eslint.config.mjs']
	},
	...config,
	{
		files: ['vite.config.ts', 'vitest.config.ts'],
		rules: {
			'import-x/no-extraneous-dependencies': 'off'
		}
	}
];
