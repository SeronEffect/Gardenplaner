import { pickSeason } from '#lib/server/garden.ts';
import type { LayoutServerLoad } from './$types';

// Planning only makes sense for seasons that are not history (spec §4.8)
export const load: LayoutServerLoad = async ({ url }) => {
	const { seasons } = await pickSeason(null);
	const open = seasons.filter((s) => s.status === 'PLANNING' || s.status === 'ACTIVE');
	const wanted = url.searchParams.get('jahr');
	const season =
		open.find((s) => String(s.year) === wanted) ?? open.find((s) => s.status === 'PLANNING') ?? open.at(-1) ?? null;
	return { seasons: open, season, nextYear: (seasons.at(-1)?.year ?? new Date().getFullYear()) + 1 };
};
