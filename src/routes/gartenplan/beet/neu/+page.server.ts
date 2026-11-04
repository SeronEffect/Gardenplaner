import { fail, redirect } from '@sveltejs/kit';
import { saveBed } from '#lib/server/garden.ts';
import { readBedForm } from '#lib/server/garden-forms.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, url }) => {
		const { values, errors } = readBedForm(await request.formData());
		if (!values) return fail(400, { errors });
		const id = await saveBed(null, values);
		redirect(303, `/gartenplan/beet/${id}${url.search}`);
	}
};
