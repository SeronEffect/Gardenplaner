// Login for the single user (spec §4.10): scrypt password hash in settings, signed session cookie.
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'garden_session';
export const SESSION_DAYS = 30;
export const MIN_PASSWORD_LENGTH = 10;

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;

function scryptAsync(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
	return new Promise((resolve, reject) =>
		scrypt(password, salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)))
	);
}

/** `scrypt$N$r$p$saltHex$hashHex` */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const key = await scryptAsync(password, salt, N, R, P);
	return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const parts = stored.split('$');
	if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
	const [, n, r, p, saltHex, hashHex] = parts;
	const expected = Buffer.from(hashHex, 'hex');
	if (!expected.length) return false;
	const key = await scryptAsync(password, Buffer.from(saltHex, 'hex'), Number(n), Number(r), Number(p));
	return key.length === expected.length && timingSafeEqual(key, expected);
}

const sign = (passwordHash: string, expires: number) =>
	createHmac('sha256', passwordHash).update(String(expires)).digest('hex');

/** Cookie value `<expiresMs>.<signature>`; the password hash is the key, so a new password logs everyone out. */
export function createSession(passwordHash: string, now = Date.now()): string {
	const expires = now + SESSION_DAYS * 86_400_000;
	return `${expires}.${sign(passwordHash, expires)}`;
}

export function verifySession(token: string | undefined, passwordHash: string, now = Date.now()): boolean {
	if (!token) return false;
	const [exp, sig] = token.split('.');
	const expires = Number(exp);
	if (!Number.isFinite(expires) || expires < now || !sig) return false;
	const expected = Buffer.from(sign(passwordHash, expires), 'hex');
	const given = Buffer.from(sig, 'hex');
	return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Pages and files that work without a session (login page and the app shell for the PWA). */
export function isPublicPath(path: string): boolean {
	return (
		path === '/anmelden' ||
		path === '/manifest.webmanifest' ||
		path === '/service-worker.js' ||
		path === '/robots.txt' ||
		path.startsWith('/favicon') ||
		path.startsWith('/icons/') ||
		path.startsWith('/_app/')
	);
}

/** Slows down guessing: each failed login doubles the wait for that address (1 s … 30 s). */
export class LoginThrottle {
	private failures = new Map<string, number>();
	waitMs(ip: string): number {
		const n = this.failures.get(ip) ?? 0;
		return n === 0 ? 0 : Math.min(30_000, 1000 * 2 ** (n - 1));
	}
	fail(ip: string) {
		this.failures.set(ip, (this.failures.get(ip) ?? 0) + 1);
		// Keep the map small
		if (this.failures.size > 1000) this.failures.delete(this.failures.keys().next().value!);
	}
	succeed(ip: string) {
		this.failures.delete(ip);
	}
}
