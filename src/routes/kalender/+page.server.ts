import { listBeds } from '#lib/server/garden.ts';
import { taskActions } from '#lib/server/task-actions.ts';
import { tasksBetween } from '#lib/server/tasks.ts';
import { addDaysIso, isoWeek, mondayOf, mondayOfWeekId, todayIso, weekId } from '#lib/rules/weeks.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const today = todayIso();
	const monday = mondayOfWeekId(url.searchParams.get('woche') ?? '') ?? mondayOf(today);
	const sunday = addDaysIso(monday, 6);
	const [tasks, beds] = await Promise.all([tasksBetween(monday, sunday), listBeds()]);
	return {
		today,
		monday,
		sunday,
		week: isoWeek(monday),
		prev: weekId(addDaysIso(monday, -7)),
		next: weekId(addDaysIso(monday, 7)),
		current: weekId(today),
		tasks,
		beds: beds.map((b) => ({ id: b.id, name: b.name }))
	};
};

export const actions: Actions = taskActions;
