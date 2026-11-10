// Suggestion engine (spec §4.8, phase 5): the best crops for every free space of a bed.
// Pure functions, shared by server and browser.
import { assessRow, type CropRow, type Feeding, type PlanLevel, type RotationMode } from './rotation.ts';
import type { BedSize, RowLike } from './space.ts';

export interface SuggestBed extends BedSize {
	id: number;
	rotationMode: RotationMode;
	rowDirection: 'HORIZONTAL' | 'VERTICAL';
}

/** A wished-for crop with its planting window in the season (from the default culture route). */
export interface SuggestSpecies {
	speciesId: number;
	speciesDe: string;
	familyId: number;
	familyDe: string;
	rotationPauseYears: number;
	feedingType: Feeding;
	rowSpacingCm: number | null;
	heightMaxCm: number | null;
	routeId: number;
	startDate: string;
	endDate: string;
}

export interface Reason {
	level: PlanLevel;
	messageDe: string;
}

export interface Candidate {
	speciesId: number;
	speciesDe: string;
	routeId: number;
	offsetCm: number;
	/** One row */
	widthCm: number;
	/** Rows of this crop that fit into the free space */
	maxRows: number;
	startDate: string;
	endDate: string;
	score: number;
	reasons: Reason[];
}

export interface Slot {
	/** Start of the free space across the bed (top/left edge) */
	offsetCm: number;
	candidates: Candidate[];
	/** Further crops that fit here but are not among the top ones */
	more: number;
}

/** Crops at least this tall should stand on the north side so they do not shade the others. */
export const TALL_CM = 120;

/** Free stretches across the bed that no row uses during [start, end]. */
export function freeGaps(bed: BedSize, startDate: string, endDate: string, others: readonly RowLike[]) {
	const busy = others
		.filter((o) => o.startDate <= endDate && startDate <= o.endDate)
		.map((o) => [o.offsetCm, o.offsetCm + o.widthCm] as const)
		.sort((a, b) => a[0] - b[0]);
	const gaps: { fromCm: number; toCm: number }[] = [];
	let pos = 0;
	for (const [from, to] of busy) {
		if (from > pos) gaps.push({ fromCm: pos, toCm: Math.min(from, bed.widthCm) });
		pos = Math.max(pos, to);
	}
	if (pos < bed.widthCm) gaps.push({ fromCm: pos, toCm: bed.widthCm });
	return gaps.filter((g) => g.toCm > g.fromCm);
}

/**
 * Tall crops (spec §4.8): with horizontal rows the top of the map is north. A tall crop in the
 * northern third shades nothing (+1); south of the middle it shades the rows north of it (−1).
 */
function heightReason(bed: SuggestBed, s: SuggestSpecies, offsetCm: number, widthCm: number): (Reason & { score: number }) | null {
	if (bed.rowDirection !== 'HORIZONTAL' || (s.heightMaxCm ?? 0) < TALL_CM) return null;
	if (offsetCm + widthCm <= bed.widthCm / 3) {
		return { level: 'good', score: 1, messageDe: `Hohe Kultur (bis ${s.heightMaxCm} cm) am Nordrand – beschattet keine anderen Reihen.` };
	}
	if (offsetCm >= bed.widthCm / 2) {
		return { level: 'info', score: -1, messageDe: `Hohe Kultur (bis ${s.heightMaxCm} cm) im Süden des Beets – beschattet die Reihen nördlich davon.` };
	}
	return null;
}

/**
 * For every free space of the bed: the crops of the wishlist ranked by score (rotation, feeding
 * order, neighbours, height). Crops blocked by the rotation of a STRICT bed are left out.
 */
export function suggestForBed(
	bed: SuggestBed,
	rows: readonly CropRow[],
	wishlist: readonly SuggestSpecies[],
	companions: Map<string, 'GOOD' | 'BAD'>,
	top = 3
): Slot[] {
	const bySlot = new Map<number, Candidate[]>();
	for (const s of wishlist) {
		const rowCm = s.rowSpacingCm;
		if (!rowCm || rowCm <= 0) continue;
		for (const gap of freeGaps(bed, s.startDate, s.endDate, rows)) {
			const free = gap.toCm - gap.fromCm;
			if (free < rowCm) continue;
			const candidate: CropRow = {
				...s,
				offsetCm: gap.fromCm,
				widthCm: rowCm,
				quantityMode: 'FULL_ROW',
				isGreenManure: false
			};
			const a = assessRow(candidate, rows, bed.rotationMode, companions);
			if (a.issues.some((i) => i.level === 'block')) continue;
			const h = heightReason(bed, s, gap.fromCm, rowCm);
			const reasons: Reason[] = [...a.issues.map((i) => ({ level: i.level, messageDe: i.messageDe })), ...(h ? [h] : [])];
			const list = bySlot.get(gap.fromCm) ?? [];
			list.push({
				speciesId: s.speciesId,
				speciesDe: s.speciesDe,
				routeId: s.routeId,
				offsetCm: gap.fromCm,
				widthCm: rowCm,
				maxRows: Math.floor(free / rowCm),
				startDate: s.startDate,
				endDate: s.endDate,
				score: a.score + (h?.score ?? 0),
				reasons
			});
			bySlot.set(gap.fromCm, list);
		}
	}
	return [...bySlot.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([offsetCm, list]) => {
			const sorted = list.sort(
				(a, b) => b.score - a.score || a.startDate.localeCompare(b.startDate) || a.speciesDe.localeCompare(b.speciesDe, 'de')
			);
			return { offsetCm, candidates: sorted.slice(0, top), more: Math.max(0, sorted.length - top) };
		});
}
