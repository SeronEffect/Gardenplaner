/// <reference types="vitest/config" />
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { appOrigin } from './scripts/origin.ts';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			// Build-time origin for the CSRF check (adapter-node 6 ignores ORIGIN at runtime)
			paths: { origin: appOrigin(process.env) }
		})
	],
	test: {
		include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']
	}
});
