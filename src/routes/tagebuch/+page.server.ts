import { fail } from '@sveltejs/kit';
import { listBeds, listSeasons, speciesOptions } from '#lib/server/garden.ts';
import { addEntry, deleteEntry, listEntries, plantingChoices } from '#lib/server/diary.ts';
import { FormReader } from '#lib/server/forms.ts';
import { HARVEST_UNITS, yieldPerCrop } from '#lib/rules/diary.ts';
import { todayIso } from '#lib/rules/weeks.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const today = todayIso();
	const seasons = await listSeasons();
	const years = [...new Set([...seasons.map((s) => s.year), Number(today.slice(0, 4))])].sort((a, b) => b - a);
	const wanted = Number(url.searchParams.get('jahr'));
	const year = years.includes(wanted) ? wanted : Number(today.slice(0, 4));
	const bedId = Number(url.searchParams.get('beet')) || null;
	const [entries, beds, plantings, species] = await Promise.all([
		listEntries(year, bedId),
		listBeds(),
		plantingChoices(year),
		speciesOptions()
	]);
	return {
		today,
		year,
		years,
		bedId,
		entries,
		yields: yieldPerCrop(entries),
		beds: beds.map((b) => ({ id: b.id, name: b.name })),
		plantings,
		species: species.map((s) => ({ id: s.id, nameDe: s.nameDe })),
		/** ?reihe= preselects a row, e.g. from a harvest task */
		plantingId: Number(url.searchParams.get('reihe')) || null
	};
};

export const actions: Actions = {
	neu: async ({ request }) => {
		const f = new FormReader(await request.formData());
		const type = f.oneOf('type', 'Art', ['HARVEST', 'NOTE'] as const);
		const date = f.date('date', 'Datum');
		if (!date) f.errors.push('Datum: Pflichtfeld.');
		const plantingId = f.int('plantingId', 'Reihe', { min: 1 });
		const bedId = f.int('bedId', 'Beet', { min: 1 });
		const speciesId = f.int('speciesId', 'Kultur', { min: 1 });
		const textDe = f.str('text', 'Notiz', { max: 1000 });
		let amount: number | null = null;
		let unit: string | null = null;
		if (type === 'HARVEST') {
			const raw = (f.str('amount', 'Menge', { required: true, max: 20 }) ?? '').replace(',', '.');
			amount = raw ? Number(raw) : null;
			if (raw && (!Number.isFinite(amount) || amount! <= 0)) f.errors.push('Menge: bitte eine positive Zahl.');
			unit = f.oneOf('unit', 'Einheit', HARVEST_UNITS);
			if (!plantingId && !speciesId) f.errors.push('Bitte eine Reihe oder eine Kultur wählen.');
		} else if (!textDe) {
			f.errors.push('Notiz: Pflichtfeld.');
		}
		if (f.errors.length || !date) return fail(400, { errors: f.errors });
		await addEntry({ date, type, bedId, plantingId, speciesId, amount, unit, textDe });
		return { saved: true };
	},
	loeschen: async ({ request }) => {
		const f = new FormReader(await request.formData());
		const id = f.int('id', 'Eintrag', { required: true, min: 1 });
		if (id) await deleteEntry(id);
	}
};
