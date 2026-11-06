import { error, fail, redirect } from '@sveltejs/kit';
import {
	deletePlanting,
	followingCount,
	getBed,
	getPlanting,
	plantingsOfBed,
	savePlanting,
	savePlantingAndFollowing,
	speciesOptions
} from '#lib/server/garden.ts';
import { readPlantingForm, readScope } from '#lib/server/garden-forms.ts';
import { companionList } from '#lib/server/planning.ts';
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
	const [history, species, companions, following] = await Promise.all([
		plantingsOfBed(bed.id),
		speciesOptions(),
		companionList(),
		followingCount(planting)
	]);
	return { bed, planting, history, species, companions, following };
};

export const actions: Actions = {
	speichern: async ({ request, params, url }) => {
		const { bed, planting } = await find(params);
		const fd = await request.formData();
		const { values, errors } = readPlantingForm(fd, bed.id);
		if (!values) return fail(400, { errors });
		const res =
			readScope(fd) === 'following'
				? await savePlantingAndFollowing(planting.id, values)
				: await savePlanting(planting.id, values);
		if (!res.ok) return fail(400, { errors: res.issues.map((i) => i.messageDe) });
		redirect(303, back(url, bed.id));
	},
	loeschen: async ({ request, params, url }) => {
		const { bed, planting } = await find(params);
		await deletePlanting(planting.id, readScope(await request.formData()) === 'following');
		redirect(303, back(url, bed.id));
	}
};
