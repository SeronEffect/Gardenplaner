import { listBeds, pickSeason, plantingsInYear } from '#lib/server/garden.ts';
import { getFrost } from '#lib/server/plants.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url }) => {
	const { seasons, season } = await pickSeason(url.searchParams.get('jahr'));
	const [beds, plantings, frost] = await Promise.all([
		listBeds(),
		season ? plantingsInYear(season.year) : Promise.resolve([]),
		getFrost()
	]);
	return { seasons, season, beds, plantings, frost };
};
