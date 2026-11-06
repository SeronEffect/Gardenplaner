import { listBeds, pickSeason, plantingsInYear } from '#lib/server/garden.ts';
import { taskActions } from '#lib/server/task-actions.ts';
import { overdueTasks, tasksBetween } from '#lib/server/tasks.ts';
import { addDaysIso, isoWeek, mondayOf, todayIso } from '#lib/rules/weeks.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const today = todayIso();
	const monday = mondayOf(today);
	const sunday = addDaysIso(monday, 6);
	const [week, overdue, nextWeek, beds, { season }] = await Promise.all([
		tasksBetween(monday, sunday),
		// Overdue: open tasks that ended in the last 3 weeks (older ones are not nagged about)
		overdueTasks(addDaysIso(monday, -21), monday),
		tasksBetween(addDaysIso(monday, 7), addDaysIso(monday, 13)),
		listBeds(),
		pickSeason(null)
	]);
	const plantings = season ? await plantingsInYear(season.year) : [];
	return {
		today,
		monday,
		sunday,
		week: isoWeek(today),
		tasks: week,
		overdue,
		nextWeek: nextWeek.filter((t) => t.status === 'OPEN' && t.dueStart > sunday),
		beds: beds.map((b) => ({ id: b.id, name: b.name })),
		season,
		plantingCount: plantings.length,
		bedsUsed: new Set(plantings.map((p) => p.bedId)).size
	};
};

export const actions: Actions = taskActions;
