import { redirect } from '@sveltejs/kit';

// The overview page arrives in phase 3; until then start at the garden plan.
export const load = () => {
	redirect(307, '/gartenplan');
};
