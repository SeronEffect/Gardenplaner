import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	authEnabled: locals.authEnabled ?? false,
	loggedIn: locals.loggedIn ?? false
});
