import { fail, redirect } from '@sveltejs/kit';
import { getPlanting, savePlanting, speciesOptions } from '#lib/server/garden.ts';
import { FormReader } from '#lib/server/forms.ts';
import { parseWishlist, suggestionsForSeason, wishable } from '#lib/server/suggest.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { season } = await parent();
	if (!season) return { options: [], picked: [], beds: [], added: null };
	const species = await speciesOptions();
	const picked = parseWishlist(url.searchParams.getAll('art'), species);
	const addedId = Number(url.searchParams.get('neu'));
	const added = addedId ? await getPlanting(addedId) : null;
	return {
		options: wishable(species).map((s) => ({ slug: s.slug, nameDe: s.nameDe })),
		picked: picked.map((s) => s.slug),
		beds: await suggestionsForSeason(season.year, picked),
		added: added ? { id: added.id, bedId: added.bedId, speciesDe: added.speciesDe } : null
	};
};

export const actions: Actions = {
	/** Takes a suggestion over as a PLANNED planting – with all the normal space and rotation checks. */
	uebernehmen: async ({ request, url }) => {
		const f = new FormReader(await request.formData());
		const seasonId = f.int('seasonId', 'Saison', { required: true, min: 1 });
		const bedId = f.int('bedId', 'Beet', { required: true, min: 1 });
		const speciesId = f.int('speciesId', 'Pflanze', { required: true, min: 1 });
		const routeId = f.int('routeId', 'Anbauweg', { min: 1 });
		const offsetCm = f.int('offsetCm', 'Position', { required: true, min: 0 });
		const rows = f.int('rows', 'Reihen', { required: true, min: 1, max: 100 });
		const sp = (await speciesOptions()).find((s) => s.id === speciesId);
		if (!sp?.rowSpacingCm) f.errors.push('Pflanze nicht gefunden.');
		if (f.errors.length || !seasonId || !bedId || !speciesId || offsetCm === null || !rows || !sp?.rowSpacingCm) {
			return fail(400, { errors: f.errors });
		}
		const res = await savePlanting(null, {
			seasonId,
			bedId,
			speciesId,
			routeId,
			offsetCm,
			widthCm: rows * sp.rowSpacingCm,
			quantityMode: 'FULL_ROW',
			count: null,
			startDate: null,
			endDate: null,
			sourcing: sp.defaultSourcing,
			status: 'PLANNED',
			notesDe: null
		});
		if (!res.ok) return fail(400, { errors: res.issues.map((i) => i.messageDe) });
		const q = new URLSearchParams(url.searchParams);
		q.delete('/uebernehmen');
		q.set('neu', String(res.id));
		redirect(303, `/saisonplanung?${q}`);
	}
};
