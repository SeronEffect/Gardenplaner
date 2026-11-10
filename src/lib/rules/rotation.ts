// Crop rotation and neighbours (spec §4.2, §4.3) – pure functions, shared by server and browser.
import type { RowLike } from './space.ts';
import { addDaysIso } from './weeks.ts';

export type Feeding = 'HEAVY' | 'MEDIUM' | 'LIGHT' | 'NONE';
export type RotationMode = 'STRICT' | 'WARN' | 'OFF';

/** A row with what the rotation and neighbour checks need to know about its crop. */
export interface CropRow extends RowLike {
	speciesId: number;
	speciesDe: string;
	familyId: number;
	familyDe: string;
	rotationPauseYears: number;
	feedingType: Feeding;
	isGreenManure?: boolean;
}

export interface Companion {
	speciesAId: number;
	speciesBId: number;
	relation: 'GOOD' | 'BAD';
}

export type PlanLevel = 'block' | 'warn' | 'info' | 'good';

export interface PlanIssue {
	kind: 'ROTATION' | 'FEEDING_GOOD' | 'FEEDING_SAME' | 'NEIGHBOUR_GOOD' | 'NEIGHBOUR_BAD';
	level: PlanLevel;
	messageDe: string;
	/** The other planting this is about */
	otherId?: number;
	/** ROTATION only: the other planting grew here before (true) or is planned later (false) */
	before?: boolean;
}

export interface Assessment {
	issues: PlanIssue[];
	/** Rotation + neighbour score (spec §4.2/4.3), used by the suggestion engine later */
	score: number;
}

/** Rows next to each other count as neighbours up to this gap between their edges (spec §4.3). */
export const NEIGHBOUR_GAP_CM = 10;
/** Only the crop of the last ~1.5 years counts as the predecessor for the feeding order. */
const PREDECESSOR_DAYS = 550;

const FEEDING_DE: Record<Feeding, string> = {
	HEAVY: 'Starkzehrer',
	MEDIUM: 'Mittelzehrer',
	LIGHT: 'Schwachzehrer',
	NONE: 'Gründüngung'
};
/** Expected predecessor of a main crop: heavy → medium → light → (green manure) → heavy */
const EXPECTED_BEFORE: Record<Feeding, Feeding[]> = {
	HEAVY: ['LIGHT', 'NONE'],
	MEDIUM: ['HEAVY'],
	LIGHT: ['MEDIUM'],
	NONE: []
};

const spaceOverlap = (a: RowLike, b: RowLike) =>
	a.offsetCm < b.offsetCm + b.widthCm && b.offsetCm < a.offsetCm + a.widthCm;
const timeOverlap = (a: RowLike, b: RowLike) => a.startDate <= b.endDate && b.startDate <= a.endDate;
const addYears = (iso: string, n: number) => `${Number(iso.slice(0, 4)) + n}${iso.slice(4)}`;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const monthYear = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const where = (r: RowLike) => `${r.offsetCm}–${r.offsetCm + r.widthCm} cm`;

/**
 * Crop rotation: same family on the same space within the rotation pause.
 * Checks both directions – what grew here before and what is planned here later.
 */
export function checkRotation(row: CropRow, others: readonly CropRow[], mode: RotationMode): PlanIssue[] {
	if (mode === 'OFF') return [];
	const out: PlanIssue[] = [];
	const level: PlanLevel = mode === 'STRICT' ? 'block' : 'warn';
	for (const o of others) {
		if (o.id !== undefined && o.id === row.id) continue;
		if (o.familyId !== row.familyId || !spaceOverlap(row, o) || timeOverlap(row, o)) continue;
		const before = o.endDate < row.startDate;
		const [first, second] = before ? [o, row] : [row, o];
		// Sowing the same crop again in the same season is succession growing, not a rotation problem
		// (another species of the family still counts, e.g. Gelbsenf after Radieschen)
		if (o.speciesId === row.speciesId && first.endDate.slice(0, 4) === second.startDate.slice(0, 4)) continue;
		const pause = Math.max(row.rotationPauseYears, o.rotationPauseYears);
		const freeFrom = addYears(first.endDate, pause);
		if (second.startDate >= freeFrom) continue;
		out.push({
			kind: 'ROTATION',
			level,
			otherId: o.id,
			before,
			messageDe: before
				? `Fruchtfolge: ${o.speciesDe} (${o.familyDe}) stand hier ${o.startDate.slice(0, 4)}. ${pause} Jahre Anbaupause – frei ab ${monthYear(freeFrom)}.`
				: `Fruchtfolge: ${o.speciesDe} (${o.familyDe}) ist hier für ${o.startDate.slice(0, 4)} geplant – zu kurz danach (${pause} Jahre Pause).`
		});
	}
	return out;
}

/** Feeding order (spec §4.2): looks at the last main crop on the same space. */
export function checkFeeding(row: CropRow, others: readonly CropRow[]): PlanIssue[] {
	if (row.feedingType === 'NONE' || row.isGreenManure) return [];
	const prev = others
		.filter(
			(o) =>
				(o.id === undefined || o.id !== row.id) &&
				!o.isGreenManure &&
				o.feedingType !== 'NONE' &&
				spaceOverlap(row, o) &&
				o.endDate < row.startDate &&
				days(o.endDate, row.startDate) <= PREDECESSOR_DAYS
		)
		.sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
	if (!prev) return [];
	if (EXPECTED_BEFORE[row.feedingType].includes(prev.feedingType)) {
		return [
			{
				kind: 'FEEDING_GOOD',
				level: 'good',
				otherId: prev.id,
				messageDe: `Gute Folge: ${FEEDING_DE[prev.feedingType]} (${prev.speciesDe}) → ${FEEDING_DE[row.feedingType]}.`
			}
		];
	}
	if (prev.feedingType === row.feedingType) {
		return [
			{
				kind: 'FEEDING_SAME',
				level: 'info',
				otherId: prev.id,
				messageDe:
					row.feedingType === 'HEAVY'
						? `Wieder ein Starkzehrer nach ${prev.speciesDe} – vorher reichlich Kompost geben.`
						: `Wieder ein ${FEEDING_DE[row.feedingType]} nach ${prev.speciesDe}.`
			}
		];
	}
	return [];
}

const pairKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

export function companionMap(companions: readonly Companion[]): Map<string, 'GOOD' | 'BAD'> {
	return new Map(companions.map((c) => [pairKey(c.speciesAId, c.speciesBId), c.relation]));
}

/** Gap between the edges of two rows across the bed (0 = touching, negative = overlapping). */
export function edgeGap(a: RowLike, b: RowLike): number {
	return Math.max(b.offsetCm - (a.offsetCm + a.widthCm), a.offsetCm - (b.offsetCm + b.widthCm));
}

/** Neighbours (spec §4.3): rows directly next to each other at the same time. */
export function checkNeighbours(
	row: CropRow,
	others: readonly CropRow[],
	companions: Map<string, 'GOOD' | 'BAD'>
): PlanIssue[] {
	const out: PlanIssue[] = [];
	const seen = new Set<string>();
	for (const o of others) {
		if (o.id !== undefined && o.id === row.id) continue;
		if (o.speciesId === row.speciesId || !timeOverlap(row, o)) continue;
		const gap = edgeGap(row, o);
		if (gap < 0 || gap > NEIGHBOUR_GAP_CM) continue;
		const rel = companions.get(pairKey(row.speciesId, o.speciesId));
		// Several sets of the same crop next to each other count once
		if (!rel || seen.has(`${o.speciesId}:${rel}`)) continue;
		seen.add(`${o.speciesId}:${rel}`);
		out.push(
			rel === 'GOOD'
				? { kind: 'NEIGHBOUR_GOOD', level: 'good', otherId: o.id, messageDe: `Guter Nachbar: ${o.speciesDe} (${where(o)}).` }
				: {
						kind: 'NEIGHBOUR_BAD',
						level: 'warn',
						otherId: o.id,
						messageDe: `Schlechter Nachbar: ${o.speciesDe} (${where(o)}) – besser eine andere Reihe dazwischen.`
					}
		);
	}
	return out;
}

const SCORE: Record<PlanIssue['kind'], number> = {
	ROTATION: -5,
	FEEDING_GOOD: 2,
	FEEDING_SAME: -1,
	NEIGHBOUR_GOOD: 1,
	NEIGHBOUR_BAD: -3
};
const ORDER: Record<PlanLevel, number> = { block: 0, warn: 1, info: 2, good: 3 };

/** All planning checks for one row (space is checked separately in space.ts). */
export function assessRow(
	row: CropRow,
	others: readonly CropRow[],
	mode: RotationMode,
	companions: Map<string, 'GOOD' | 'BAD'>
): Assessment {
	const issues = [
		...checkRotation(row, others, mode),
		...checkFeeding(row, others),
		...checkNeighbours(row, others, companions)
	].sort((a, b) => ORDER[a.level] - ORDER[b.level]);
	return { issues, score: issues.reduce((s, i) => s + SCORE[i.kind], 0) };
}

/**
 * WARN mode (spec §4.2): a planting that follows the same family gets a task to swap soil / add compost
 * in the two weeks before it goes into the bed.
 */
export function soilTask(plantingId: number, startDate: string, issues: readonly PlanIssue[]) {
	const prev = issues.find((i) => i.kind === 'ROTATION' && i.before);
	if (!prev) return null;
	return {
		key: `p${plantingId}:soil`,
		type: 'CARE' as const,
		location: 'BED' as const,
		titleDe: 'Erde tauschen / Kompost einarbeiten (Fruchtfolge)',
		dueStart: addDaysIso(startDate, -14),
		dueEnd: addDaysIso(startDate, -1)
	};
}
