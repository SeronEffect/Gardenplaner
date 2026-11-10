import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { LoginThrottle, SESSION_COOKIE, SESSION_DAYS, createSession, verifyPassword } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import * as t from '#lib/server/db/schema.ts';
import type { Actions, PageServerLoad } from './$types';

const throttle = new LoginThrottle();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Only local paths – never redirect to another site after login. */
const target = (url: URL) => {
	const z = url.searchParams.get('ziel') ?? '/';
	return z.startsWith('/') && !z.startsWith('//') && !z.startsWith('/\\') ? z : '/';
};

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.authEnabled || locals.loggedIn) redirect(303, target(url));
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const ip = getClientAddress();
		const password = String((await request.formData()).get('password') ?? '');
		const [s] = await db.select({ hash: t.settings.passwordHash }).from(t.settings).where(eq(t.settings.id, 1));
		if (!s?.hash) redirect(303, target(url));
		await sleep(throttle.waitMs(ip));
		if (!password || !(await verifyPassword(password, s.hash))) {
			throttle.fail(ip);
			return fail(400, { error: 'Falsches Passwort.' });
		}
		throttle.succeed(ip);
		cookies.set(SESSION_COOKIE, createSession(s.hash), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: SESSION_DAYS * 86_400
		});
		redirect(303, target(url));
	}
};
