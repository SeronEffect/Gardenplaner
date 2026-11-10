// Suggestions per free space (phase 5, spec §4.8): loads beds, rows and the wishlist for a season.
import { companionMap } from '../rules/rotation.ts';
import { plantingWindow } from '../rules/space.ts';
import { suggestForBed, type Slot, type SuggestSpecies } from '../rules/suggest.ts';
import { listBeds, speciesOptions, type SpeciesOption } from './garden.ts';
import { companionList, cropRowsOfBed } from './planning.ts';
import { getFrost } from './plants.ts';

/** Crops that can be wished for: outdoor crops without green manure (that is suggested in gaps, §4.5). */
export function wishable(species: readonly SpeciesOption[]) {
	return species.filter((s) => s.outdoor && !s.isGreenManure && s.rowSpacingCm);
}

/** Wishlist from `?art=slug&art=slug` (kept in the URL only); none = all wishable crops. */
export function parseWishlist(slugs: readonly string[], species: readonly SpeciesOption[]) {
	const all = wishable(species);
	const wanted = new Set(slugs);
	const picked = all.filter((s) => wanted.has(s.slug));
	return picked.length ? picked : all;
}

export interface BedSuggestions {
	bed: { id: number; name: string; lengthCm: number; widthCm: number };
	slots: Slot[];
}

export async function suggestionsForSeason(year: number, wishlist: readonly SpeciesOption[]): Promise<BedSuggestions[]> {
	const [beds, companions, frost] = await Promise.all([listBeds(), companionList(), getFrost()]);
	const wished: SuggestSpecies[] = wishlist.flatMap((s) => {
		const route = s.routes.find((r) => r.isDefault) ?? s.routes[0];
		if (!route?.steps.length) return [];
		const w = plantingWindow(route.steps, frost, year, s.lifespanYears);
		return [
			{
				speciesId: s.id,
				speciesDe: s.nameDe,
				familyId: s.familyId,
				familyDe: s.familyDe,
				rotationPauseYears: s.rotationPauseYears,
				feedingType: s.feedingType,
				rowSpacingCm: s.rowSpacingCm,
				heightMaxCm: s.heightMaxCm,
				routeId: route.id,
				...w
			}
		];
	});
	const map = companionMap(companions);
	const out: BedSuggestions[] = [];
	// The greenhouse stays fixed for Tomate, Gurke, Paprika and Chili (decision 10.11.2026)
	for (const bed of beds.filter((b) => b.type !== 'GREENHOUSE')) {
		const rows = await cropRowsOfBed(bed.id);
		out.push({
			bed: { id: bed.id, name: bed.name, lengthCm: bed.lengthCm, widthCm: bed.widthCm },
			slots: suggestForBed(bed, rows, wished, map)
		});
	}
	return out;
}
