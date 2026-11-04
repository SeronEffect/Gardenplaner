import { error, fail, redirect } from '@sveltejs/kit';
import { deletePlanting, getBed, getPlanting, plantingsOfBed, savePlanting, speciesOptions } from '#lib/server/garden.ts';
import { readPlantingForm } from '#lib/server/garden-forms.ts';
import type { Actions, PageServerLoad } from './$types';

async function find(params: { id: string; pid: string }) {
	const bed = await getBed(Number(params.id));
	const planting = await getPlanting(Number(params.pid));
	if (!bed || !planting || planting.bedId !== bed.id) error(404, 'Reihe nicht gefunden');
	return { bed, planting };
}

const back = (url: URL, id: number) => {
	const jahr = url.searchParams.get('jahr');
	return `/gartenplan/beet/${id}${jahr ? `?jahr=${jahr}` : ''}`;
};

export const load: PageServerLoad = async ({ params }) => {
	const { bed, planting } = await find(params);
	const [history, species] = await Promise.all([plantingsOfBed(bed.id), speciesOptions()]);
	return { bed, planting, history, species };
};

export const actions: Actions = {
	speichern: async ({ request, params, url }) => {
		const { bed, planting } = await find(params);
		const { values, errors } = readPlantingForm(await request.formData(), bed.id);
		if (!values) return fail(400, { errors });
		const res = await savePlanting(planting.id, values);
		if (!res.ok) return fail(400, { errors: res.issues.map((i) => i.messageDe) });
		redirect(303, back(url, bed.id));
	},
	loeschen: async ({ params, url }) => {
		const { bed, planting } = await find(params);
		await deletePlanting(planting.id);
		redirect(303, back(url, bed.id));
	}
};
