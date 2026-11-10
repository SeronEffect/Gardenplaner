import { describe, expect, it } from 'vitest';
import { appOrigin } from './origin.ts';

// bug-fix-002: adapter-node 6 ignores ORIGIN at runtime; the origin must be baked in at build time.
describe('appOrigin', () => {
	it('defaults to the local Docker/production URL over plain http', () => {
		expect(appOrigin({})).toBe('http://localhost:3000');
	});

	it('uses ORIGIN from the build environment', () => {
		expect(appOrigin({ ORIGIN: 'https://garten.example.de' })).toBe('https://garten.example.de');
	});

	it('normalises a trailing slash', () => {
		expect(appOrigin({ ORIGIN: 'http://localhost:3000/' })).toBe('http://localhost:3000');
	});

	it('rejects values that are not a bare http(s) origin', () => {
		expect(() => appOrigin({ ORIGIN: 'localhost:3000' })).toThrow(/ORIGIN/);
		expect(() => appOrigin({ ORIGIN: 'http://localhost:3000/app' })).toThrow(/ORIGIN/);
	});
});
