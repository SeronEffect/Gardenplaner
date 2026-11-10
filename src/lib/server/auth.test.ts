import { describe, expect, it } from 'vitest';
import { LoginThrottle, createSession, hashPassword, isPublicPath, verifyPassword, verifySession } from './auth.ts';

describe('password hashing', () => {
	it('verifies the right password and rejects others', async () => {
		const hash = await hashPassword('richtig-geheim');
		expect(hash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$[0-9a-f]+\$[0-9a-f]+$/);
		expect(await verifyPassword('richtig-geheim', hash)).toBe(true);
		expect(await verifyPassword('falsch', hash)).toBe(false);
	});

	it('uses a new salt every time', async () => {
		expect(await hashPassword('x'.repeat(10))).not.toBe(await hashPassword('x'.repeat(10)));
	});

	it('rejects malformed hashes', async () => {
		expect(await verifyPassword('a', 'nonsense')).toBe(false);
	});
});

describe('session cookie', () => {
	const now = Date.UTC(2027, 4, 1);
	it('is valid until it expires', () => {
		const token = createSession('hash-1', now);
		expect(verifySession(token, 'hash-1', now + 1000)).toBe(true);
		expect(verifySession(token, 'hash-1', now + 31 * 86_400_000)).toBe(false);
	});

	it('is invalid after a password change or when tampered with', () => {
		const token = createSession('hash-1', now);
		expect(verifySession(token, 'hash-2', now)).toBe(false);
		const [exp, sig] = token.split('.');
		expect(verifySession(`${Number(exp) + 1e9}.${sig}`, 'hash-1', now)).toBe(false);
		expect(verifySession('', 'hash-1', now)).toBe(false);
		expect(verifySession(undefined, 'hash-1', now)).toBe(false);
	});
});

describe('LoginThrottle', () => {
	it('doubles the wait after each failure, up to 30 s, and resets on success', () => {
		const t = new LoginThrottle();
		expect(t.waitMs('1.2.3.4')).toBe(0);
		t.fail('1.2.3.4');
		expect(t.waitMs('1.2.3.4')).toBe(1000);
		for (let i = 0; i < 10; i++) t.fail('1.2.3.4');
		expect(t.waitMs('1.2.3.4')).toBe(30_000);
		expect(t.waitMs('5.6.7.8')).toBe(0);
		t.succeed('1.2.3.4');
		expect(t.waitMs('1.2.3.4')).toBe(0);
	});
});

describe('isPublicPath', () => {
	it('lets the login page and app shell files through', () => {
		for (const p of ['/anmelden', '/manifest.webmanifest', '/service-worker.js', '/favicon.png', '/icons/icon-192.png', '/_app/immutable/x.js', '/robots.txt']) {
			expect(isPublicPath(p), p).toBe(true);
		}
		for (const p of ['/', '/garten', '/tagebuch', '/anmelden-x', '/gartenplan/beet/1']) expect(isPublicPath(p), p).toBe(false);
	});
});
