import { error, fail, redirect } from '@sveltejs/kit';
import {
	deleteBed,
	deletePlanting,
	getBed,
	plantingsOfBed,
	saveBed,
	savePlanting,
	saveSuccession,
	speciesOptions
} from '#lib/server/garden.ts';
import { readBedForm, readPlantingForm, readScope, readSuccessionForm } from '#lib/server/garden-forms.ts';
import { companionList, cropRowsOfBed, greenManureOptions } from '#lib/server/planning.ts';
import { greenManureSuggestions } from '#lib/rules/succession.ts';
import type { Actions, PageServerLoad } from './$types';

const bedId = (raw: string) => {
	const id = Number(raw);
	if (!Number.isInteger(id) || id < 1) error(404, 'Beet nicht gefunden');
	return id;
};

export const load: PageServerLoad = async ({ params, parent }) => {
	const id = bedId(params.id);
	const bed = await getBed(id);
	if (!bed) error(404, 'Beet nicht gefunden');
	const [history, species, companions, rows, options, { season, frost }] = await Promise.all([
		plantingsOfBed(id),
		speciesOptions(),
		companionList(),
		cropRowsOfBed(id),
		greenManureOptions(),
		parent()
	]);
	// Green manure only outdoors and for seasons that are still planned (spec §4.5)
	const greenManure =
		season && season.status !== 'HISTORY' && bed.type !== 'GREENHOUSE'
			? greenManureSuggestions(bed, season.year, rows, options, frost)
			: [];
	return { bed, history, species, companions, greenManure };
};

const back = (url: URL, id: number) => {
	const jahr = url.searchParams.get('jahr');
	return `/gartenplan/beet/${id}${jahr ? `?jahr=${jahr}` : ''}`;
};

export const actions: Actions = {
	beet: async ({ request, params, url }) => {
		const id = bedId(params.id);
		const { values, errors } = readBedForm(await request.formData());
		if (!values) return fail(400, { form: 'beet', errors });
		await saveBed(id, values);
		redirect(303, back(url, id));
	},
	beetLoeschen: async ({ params, url }) => {
		await deleteBed(bedId(params.id));
		const jahr = url.searchParams.get('jahr');
		redirect(303, `/gartenplan${jahr ? `?jahr=${jahr}` : ''}`);
	},
	reihe: async ({ request, params, url }) => {
		const id = bedId(params.id);
		const fd = await request.formData();
		const { values, errors } = readPlantingForm(fd, id);
		const succession = readSuccessionForm(fd);
		if (!values || succession?.errors.length) return fail(400, { form: 'reihe', errors: [...errors, ...(succession?.errors ?? [])] });
		const res = succession
			? await saveSuccession(values, succession.sets, succession.intervalDays)
			: await savePlanting(null, values);
		if (!res.ok) return fail(400, { form: 'reihe', errors: res.issues.map((i) => i.messageDe) });
		redirect(303, back(url, id));
	},
	reiheLoeschen: async ({ request, params, url }) => {
		const id = bedId(params.id);
		const fd = await request.formData();
		const pid = Number(fd.get('plantingId'));
		if (Number.isInteger(pid) && pid > 0) await deletePlanting(pid, readScope(fd) === 'following');
		redirect(303, back(url, id));
	},
	/** Plans a suggested green manure (spec §4.5) */
	gruenduengung: async ({ request, params, url }) => {
		const id = bedId(params.id);
		const { values, errors } = readPlantingForm(await request.formData(), id);
		if (!values) return fail(400, { form: 'gruen', errors });
		const res = await savePlanting(null, values);
		if (!res.ok) return fail(400, { form: 'gruen', errors: res.issues.map((i) => i.messageDe) });
		redirect(303, back(url, id));
	}
};
