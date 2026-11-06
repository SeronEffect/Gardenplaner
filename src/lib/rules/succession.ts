// Succession growing (spec §4.6) and green manure suggestions (spec §4.5) – pure functions.
import { checkRow, nextFreeOffset, plantingWindow, type BedSize, type RowLike } from './space.ts';
import { checkRotation, type CropRow, type RotationMode } from './rotation.ts';
import type { FrostDates, Step } from './timeline.ts';
import { addDaysIso } from './weeks.ts';

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const spaceOk = (bed: BedSize, row: RowLike, others: readonly RowLike[]) =>
	checkRow(bed, { ...row, quantityMode: 'FULL_ROW' }, others).length === 0;

export interface SuccessionSet {
	index: number;
	offsetCm: number | null;
	startDate: string;
	endDate: string;
}

/**
 * Places `count` sets of a crop every `intervalDays`. Each set stays in the first row if that space is
 * free again, otherwise it takes the next free space across the bed (null = bed full at that time).
 */
export function planSuccession(
	bed: BedSize,
	first: RowLike,
	count: number,
	intervalDays: number,
	others: readonly RowLike[]
): SuccessionSet[] {
	const placed: RowLike[] = [];
	const out: SuccessionSet[] = [];
	for (let i = 0; i < count; i++) {
		const startDate = addDaysIso(first.startDate, i * intervalDays);
		const endDate = addDaysIso(first.endDate, i * intervalDays);
		const busy = [...others.filter((o) => o.id === undefined || o.id !== first.id), ...placed];
		const here = { ...first, id: undefined, startDate, endDate };
		const offsetCm = spaceOk(bed, here, busy)
			? first.offsetCm
			: nextFreeOffset(bed, first.widthCm, startDate, endDate, busy);
		if (offsetCm !== null) placed.push({ ...here, offsetCm });
		out.push({ index: i, offsetCm, startDate, endDate });
	}
	return out;
}

// ── Green manure (spec §4.5) ──────────────────────────────────────────────
export interface GreenManureOption {
	speciesId: number;
	speciesDe: string;
	familyId: number;
	familyDe: string;
	rotationPauseYears: number;
	routes: { id: number; nameDe: string; steps: (Step & { isPlantingEnd?: boolean })[] }[];
}

export interface GreenManureSuggestion {
	/** Planting after which the space is free */
	afterId: number;
	afterDe: string;
	speciesId: number;
	speciesDe: string;
	routeId: number;
	routeDe: string;
	offsetCm: number;
	widthCm: number;
	startDate: string;
	endDate: string;
	/** Free days until the next crop (null = nothing planned after it) */
	gapDays: number | null;
}

/** A gap after a harvest is worth a green manure from this many days on. */
export const MIN_GAP_DAYS = 42;

/**
 * For every row of the season that ends with free space of at least 6 weeks behind it, lists the
 * green manures whose sowing time fits and that do not clash with the rotation (e.g. no Gelbsenf
 * after or before a Kreuzblütler).
 */
export function greenManureSuggestions(
	bed: BedSize,
	year: number,
	rows: readonly CropRow[],
	options: readonly GreenManureOption[],
	frost: FrostDates
): GreenManureSuggestion[] {
	const out: GreenManureSuggestion[] = [];
	for (const r of rows) {
		if (r.id === undefined || r.isGreenManure || Number(r.endDate.slice(0, 4)) !== year) continue;
		const freeFrom = addDaysIso(r.endDate, 1);
		const next = rows
			.filter(
				(o) =>
					o.startDate > r.endDate &&
					o.offsetCm < r.offsetCm + r.widthCm &&
					r.offsetCm < o.offsetCm + o.widthCm
			)
			.sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
		// Something is already sown right behind it (e.g. a green manure) → nothing to suggest
		if (next && next.isGreenManure && days(freeFrom, next.startDate) < MIN_GAP_DAYS) continue;
		const freeUntil = next ? addDaysIso(next.startDate, -1) : null;
		const gapDays = freeUntil ? days(freeFrom, freeUntil) + 1 : null;
		if (gapDays !== null && gapDays < MIN_GAP_DAYS) continue;

		for (const gm of options) {
			for (const route of gm.routes) {
				const sow = route.steps.find((s) => s.isPlantingStart) ?? route.steps[0];
				if (!sow) continue;
				let w: { startDate: string; endDate: string };
				let sowEnd: string;
				try {
					w = plantingWindow(route.steps, frost, year);
					sowEnd = plantingWindow(
						route.steps.map((s) => (s === sow ? { ...s, offsetStartDays: s.offsetEndDays } : s)),
						frost,
						year
					).startDate;
				} catch {
					continue;
				}
				const startDate = freeFrom > w.startDate ? freeFrom : w.startDate;
				if (startDate > sowEnd) continue;
				const end = route.steps.find((s) => s.isPlantingEnd);
				const relativeEnd = end && (end.anchor === 'PREV_STEP' || end.anchor === 'PLANTING_START');
				let endDate = relativeEnd ? addDaysIso(w.endDate, days(w.startDate, startDate)) : w.endDate;
				if (freeUntil && endDate > freeUntil) endDate = freeUntil;
				if (days(startDate, endDate) + 1 < MIN_GAP_DAYS) continue;

				const candidate: CropRow = {
					offsetCm: r.offsetCm,
					widthCm: r.widthCm,
					quantityMode: 'FULL_ROW',
					startDate,
					endDate,
					speciesId: gm.speciesId,
					speciesDe: gm.speciesDe,
					familyId: gm.familyId,
					familyDe: gm.familyDe,
					rotationPauseYears: gm.rotationPauseYears,
					feedingType: 'NONE',
					isGreenManure: true
				};
				// Cross-family conflict is agronomic, so it always counts here (not only in STRICT beds)
				const mode: RotationMode = 'WARN';
				if (checkRotation(candidate, rows, mode).length) continue;
				if (!spaceOk(bed, candidate, rows)) continue;
				out.push({
					afterId: r.id,
					afterDe: r.speciesDe,
					speciesId: gm.speciesId,
					speciesDe: gm.speciesDe,
					routeId: route.id,
					routeDe: route.nameDe,
					offsetCm: r.offsetCm,
					widthCm: r.widthCm,
					startDate,
					endDate,
					gapDays
				});
				break; // one route per green manure is enough
			}
		}
	}
	return out;
}
