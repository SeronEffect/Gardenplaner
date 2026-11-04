import { listSpecies } from '#lib/server/plants.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => ({
	plants: await listSpecies()
});
