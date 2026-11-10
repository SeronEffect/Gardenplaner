import { redirect } from '@sveltejs/kit';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { SESSION_COOKIE, isPublicPath, verifySession } from '#lib/server/auth.ts';
import { client, db } from '#lib/server/db/index.ts';
import * as t from '#lib/server/db/schema.ts';
import { closeOnShutdown } from '#lib/server/db/shutdown.ts';
import { seedPlants } from '#lib/server/db/seed.ts';
import { seedGardenStarter } from '#lib/server/db/starter.ts';
import { DB_UNAVAILABLE_DE, isDbUnavailable } from '#lib/server/db/unavailable.ts';
import { syncAllTasks } from '#lib/server/tasks.ts';

// Apply DB migrations, (re)write the plant reference data, create the starter beds/seasons on the
// very first run and bring generated tasks up to date. Retried on the next request if the database
// was not reachable (spec §4.12), so the app shows a clear message instead of not starting at all.
let ready: Promise<void> | null = null;
function prepare() {
	ready ??= (async () => {
		await migrate(db, { migrationsFolder: 'drizzle' });
		await seedPlants(db);
		await seedGardenStarter(db);
		await syncAllTasks();
	})().catch((err) => {
		ready = null;
		throw err;
	});
	return ready;
}

export const init: ServerInit = async () => {
	if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (see .env.example)');
	closeOnShutdown(process, client);
	try {
		await prepare();
	} catch (err) {
		if (!isDbUnavailable(err)) throw err;
		console.error(`[gardenplaner] ${DB_UNAVAILABLE_DE}`);
	}
};

/** Login (spec §4.10): once a password is set, every page except the public ones needs a session. */
export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	if (isPublicPath(path) && path !== '/anmelden') return resolve(event);
	await prepare();
	const [s] = await db.select({ passwordHash: t.settings.passwordHash }).from(t.settings).where(eq(t.settings.id, 1));
	const hash = s?.passwordHash ?? null;
	event.locals.authEnabled = hash !== null;
	event.locals.loggedIn = hash !== null && verifySession(event.cookies.get(SESSION_COOKIE), hash);
	if (hash && !event.locals.loggedIn && !isPublicPath(path)) {
		// Back to the page after login (for form posts only the page, not the action)
		const target = event.request.method === 'GET' ? path + event.url.search : path;
		redirect(303, `/anmelden${target === '/' ? '' : `?ziel=${encodeURIComponent(target)}`}`);
	}
	return resolve(event);
};

// Other errors keep SvelteKit's defaults
export const handleError: HandleServerError = ({ error }) => {
	if (isDbUnavailable(error)) return { status: 503, message: DB_UNAVAILABLE_DE, dbDown: true };
};
