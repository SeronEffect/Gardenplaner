import { error, fail, redirect } from '@sveltejs/kit';
import { deleteBed, deletePlanting, getBed, plantingsOfBed, saveBed, savePlanting, speciesOptions } from '#lib/server/garden.ts';
import { readBedForm, readPlantingForm } from '#lib/server/garden-forms.ts';
import type { Actions, PageServerLoad } from './$types';

const bedId = (raw: string) => {
	const id = Number(raw);
	if (!Number.isInteger(id) || id < 1) error(404, 'Beet nicht gefunden');
	return id;
};

export const load: PageServerLoad = async ({ params }) => {
	const id = bedId(params.id);
	const bed = await getBed(id);
	if (!bed) error(404, 'Beet nicht gefunden');
	const [history, species] = await Promise.all([plantingsOfBed(id), speciesOptions()]);
	return { bed, history, species };
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
		const { values, errors } = readPlantingForm(await request.formData(), id);
		if (!values) return fail(400, { form: 'reihe', errors });
		const res = await savePlanting(null, values);
		if (!res.ok) return fail(400, { form: 'reihe', errors: res.issues.map((i) => i.messageDe) });
		redirect(303, back(url, id));
	},
	reiheLoeschen: async ({ request, params, url }) => {
		const id = bedId(params.id);
		const pid = Number((await request.formData()).get('plantingId'));
		if (Number.isInteger(pid) && pid > 0) await deletePlanting(pid);
		redirect(303, back(url, id));
	}
};
