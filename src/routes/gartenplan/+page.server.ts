import { redirect } from '@sveltejs/kit';
import { addNextSeason } from '#lib/server/garden.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	neueSaison: async () => {
		const year = await addNextSeason();
		redirect(303, `/gartenplan?jahr=${year}`);
	}
};
