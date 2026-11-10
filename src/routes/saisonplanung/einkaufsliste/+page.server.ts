import { fail } from '@sveltejs/kit';
import { FormReader } from '#lib/server/forms.ts';
import { addManualItem, deleteShoppingItem, listShopping, setBought, syncShoppingList } from '#lib/server/shopping.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { season } = await parent();
	if (!season) return { items: [] };
	await syncShoppingList(season.id);
	return { items: await listShopping(season.id) };
};

export const actions: Actions = {
	gekauft: async ({ request }) => {
		const f = new FormReader(await request.formData());
		const id = f.int('id', 'Eintrag', { required: true, min: 1 });
		if (id) await setBought(id, f.bool('bought'));
	},
	neu: async ({ request }) => {
		const f = new FormReader(await request.formData());
		const seasonId = f.int('seasonId', 'Saison', { required: true, min: 1 });
		const label = f.str('label', 'Was', { required: true, max: 120 });
		const raw = (f.str('quantity', 'Menge', { max: 20 }) ?? '').replace(',', '.');
		const quantity = raw ? Number(raw) : null;
		if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) f.errors.push('Menge: bitte eine positive Zahl.');
		const unit = f.str('unit', 'Einheit', { max: 20 });
		if (f.errors.length || !seasonId || !label) return fail(400, { errors: f.errors });
		await addManualItem(seasonId, label, quantity, unit);
	},
	loeschen: async ({ request }) => {
		const f = new FormReader(await request.formData());
		const id = f.int('id', 'Eintrag', { required: true, min: 1 });
		if (id) await deleteShoppingItem(id);
	}
};
