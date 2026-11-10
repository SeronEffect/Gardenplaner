import { pickSeason } from '#lib/server/garden.ts';
import { getFrost } from '#lib/server/plants.ts';
import { seasonTimeline } from '#lib/server/season-timeline.ts';
import { todayIso } from '#lib/rules/weeks.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const { seasons, season } = await pickSeason(url.searchParams.get('jahr'));
	const [beds, frost] = await Promise.all([season ? seasonTimeline(season) : Promise.resolve([]), getFrost()]);
	return { seasons, season, beds, frost, today: todayIso() };
};
