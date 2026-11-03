import { redirect } from '@sveltejs/kit';

// The overview page arrives in phase 3; until then start at the plant library.
export const load = () => {
	redirect(307, '/pflanzen');
};
