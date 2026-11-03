import { error } from '@sveltejs/kit';
import { getFrost, getSpecies } from '#lib/server/plants.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [detail, frost] = await Promise.all([getSpecies(params.slug), getFrost()]);
	if (!detail) error(404, 'Pflanze nicht gefunden');
	return { detail, frost };
};
