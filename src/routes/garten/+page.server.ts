import { fail } from '@sveltejs/kit';
import { addEntry } from '#lib/server/diary.ts';
import { FormReader } from '#lib/server/forms.ts';
import { listBeds } from '#lib/server/garden.ts';
import { taskActions } from '#lib/server/task-actions.ts';
import { overdueTasks, tasksBetween } from '#lib/server/tasks.ts';
import { HARVEST_UNITS } from '#lib/rules/diary.ts';
import { addDaysIso, isoWeek, mondayOf, todayIso } from '#lib/rules/weeks.ts';
import type { Actions, PageServerLoad } from './$types';

// Gartenmodus (spec §6, screen 1m): this week's tasks as a checklist for the phone
export const load: PageServerLoad = async () => {
	const today = todayIso();
	const monday = mondayOf(today);
	const sunday = addDaysIso(monday, 6);
	const [week, overdue, beds] = await Promise.all([
		tasksBetween(monday, sunday),
		overdueTasks(addDaysIso(monday, -21), monday),
		listBeds()
	]);
	return {
		today,
		week: isoWeek(today).week,
		tasks: week,
		overdue,
		beds: beds.map((b) => ({ id: b.id, name: b.name }))
	};
};

export const actions: Actions = {
	...taskActions,
	/** Quick harvest for a harvest task: goes to the diary, linked to the row */
	ernte: async ({ request }) => {
		const f = new FormReader(await request.formData());
		const plantingId = f.int('plantingId', 'Reihe', { required: true, min: 1 });
		const raw = (f.str('amount', 'Menge', { required: true, max: 20 }) ?? '').replace(',', '.');
		const amount = Number(raw);
		if (raw && (!Number.isFinite(amount) || amount <= 0)) f.errors.push('Menge: bitte eine positive Zahl.');
		const unit = f.oneOf('unit', 'Einheit', HARVEST_UNITS);
		if (f.errors.length || !plantingId) return fail(400, { form: 'ernte', plantingId, errors: f.errors });
		await addEntry({ date: todayIso(), type: 'HARVEST', plantingId, bedId: null, speciesId: null, amount, unit, textDe: null });
		return { form: 'ernte', plantingId, saved: true };
	},
	notiz: async ({ request }) => {
		const f = new FormReader(await request.formData());
		const textDe = f.str('text', 'Notiz', { required: true, max: 1000 });
		const bedId = f.int('bedId', 'Beet', { min: 1 });
		if (f.errors.length || !textDe) return fail(400, { form: 'notiz', errors: f.errors });
		await addEntry({ date: todayIso(), type: 'NOTE', plantingId: null, bedId, speciesId: null, amount: null, unit: null, textDe });
		return { form: 'notiz', saved: true };
	}
};
