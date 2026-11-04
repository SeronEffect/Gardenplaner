// Form actions shared by the overview and the calendar.
import { fail, type RequestEvent } from '@sveltejs/kit';
import { FormReader } from './forms.ts';
import { addManualTask, deleteManualTask, setTaskStatus } from './tasks.ts';
import { todayIso } from '../rules/weeks.ts';

export const taskActions = {
	status: async ({ request }: RequestEvent) => {
		const f = new FormReader(await request.formData());
		const id = f.int('taskId', 'Aufgabe', { required: true, min: 1 });
		const status = f.oneOf('status', 'Status', ['OPEN', 'DONE', 'SKIPPED'] as const);
		if (f.errors.length || !id) return fail(400, { errors: f.errors });
		await setTaskStatus(id, status, todayIso());
	},
	neu: async ({ request }: RequestEvent) => {
		const f = new FormReader(await request.formData());
		const titleDe = f.str('title', 'Aufgabe', { required: true, max: 200 });
		const dueStart = f.date('dueStart', 'Fällig ab');
		const dueEnd = f.date('dueEnd', 'Fällig bis') ?? dueStart;
		const bedId = f.int('bedId', 'Beet', { min: 1 });
		const notesDe = f.str('notes', 'Notiz', { max: 500 });
		if (!dueStart) f.errors.push('Fällig ab: Pflichtfeld.');
		if (dueStart && dueEnd && dueEnd < dueStart) f.errors.push('Das Ende liegt vor dem Beginn.');
		if (f.errors.length || !titleDe || !dueStart || !dueEnd) return fail(400, { form: 'neu', errors: f.errors });
		await addManualTask({ titleDe, dueStart, dueEnd, bedId, notesDe });
	},
	loeschen: async ({ request }: RequestEvent) => {
		const f = new FormReader(await request.formData());
		const id = f.int('taskId', 'Aufgabe', { required: true, min: 1 });
		if (id) await deleteManualTask(id);
	}
};
