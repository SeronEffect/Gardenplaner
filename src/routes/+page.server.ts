import { listBeds, pickSeason, plantingsInYear } from '#lib/server/garden.ts';
import { getFrost } from '#lib/server/plants.ts';
import { seasonTimeline } from '#lib/server/season-timeline.ts';
import { taskActions } from '#lib/server/task-actions.ts';
import { overdueTasks, tasksBetween } from '#lib/server/tasks.ts';
import { addDaysIso, isoWeek, mondayOf, todayIso } from '#lib/rules/weeks.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const today = todayIso();
	const monday = mondayOf(today);
	const sunday = addDaysIso(monday, 6);
	const [week, overdue, nextWeek, beds, { season }, growingNow, frost] = await Promise.all([
		tasksBetween(monday, sunday),
		// Overdue: open tasks that ended in the last 3 weeks (older ones are not nagged about)
		overdueTasks(addDaysIso(monday, -21), monday),
		tasksBetween(addDaysIso(monday, 7), addDaysIso(monday, 13)),
		listBeds(),
		pickSeason(null),
		plantingsInYear(Number(today.slice(0, 4))),
		getFrost()
	]);
	const [plantings, timeline] = season
		? await Promise.all([plantingsInYear(season.year), seasonTimeline(season)])
		: [[], []];

	// Bed cards: what stands in the bed today and what is to do there this week
	const now = growingNow.filter((p) => p.startDate <= today && p.endDate >= today && p.status !== 'DONE');
	const bedCards = beds.map((b) => {
		const open = week.filter((t) => t.bedId === b.id && t.status === 'OPEN' && t.location !== 'WINDOWSILL');
		const late = overdue.filter((t) => t.bedId === b.id);
		const crops = [...new Set(now.filter((p) => p.bedId === b.id).map((p) => p.speciesDe))];
		return {
			id: b.id,
			name: b.name,
			type: b.type,
			sizeCm: [b.lengthCm, b.widthCm] as const,
			crops,
			open: open.length,
			late: late.length,
			state: late.length ? 'warn' : crops.length ? 'ok' : ''
		};
	});

	return {
		today,
		monday,
		sunday,
		week: isoWeek(today),
		tasks: week,
		overdue,
		nextWeek: nextWeek.filter((t) => t.status === 'OPEN' && t.dueStart > sunday),
		beds: beds.map((b) => ({ id: b.id, name: b.name })),
		bedCards,
		season,
		timeline,
		frost,
		plantingCount: plantings.length,
		bedsUsed: new Set(plantings.map((p) => p.bedId)).size
	};
};

export const actions: Actions = taskActions;
