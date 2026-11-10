// Spec §4.12: tell "database not running" apart from real bugs.
const CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH', 'CONNECT_TIMEOUT', '57P03']);

/** True if the error (or anything it wraps) means the database cannot be reached. */
export function isDbUnavailable(err: unknown, depth = 0): boolean {
	if (!err || typeof err !== 'object' || depth > 5) return false;
	const e = err as { code?: unknown; cause?: unknown; errors?: unknown };
	if (typeof e.code === 'string' && CODES.has(e.code)) return true;
	if (Array.isArray(e.errors) && e.errors.some((x) => isDbUnavailable(x, depth + 1))) return true;
	return isDbUnavailable(e.cause, depth + 1);
}

export const DB_UNAVAILABLE_DE =
	'Datenbank nicht erreichbar. Läuft Docker? Dann `docker compose up -d db` ausführen und die Seite neu laden.';
