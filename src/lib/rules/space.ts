// Space rules for rows in a bed (spec §4.1) – shared by server and browser.
import { resolveSteps, type FrostDates, type Step } from './timeline.ts';

export interface BedSize {
	lengthCm: number;
	widthCm: number;
}

export interface RowLike {
	id?: number;
	offsetCm: number;
	widthCm: number;
	quantityMode: 'FULL_ROW' | 'COUNT';
	count?: number | null;
	/** ISO dates YYYY-MM-DD */
	startDate: string;
	endDate: string;
	label?: string;
}

export interface SpaceIssue {
	kind: 'OUT_OF_BED' | 'OVERLAP' | 'TOO_LONG' | 'INVALID';
	messageDe: string;
}

/** Number of plants that fit into one full row. */
export function plantsPerRow(bedLengthCm: number, inRowSpacingCm: number | null | undefined): number | null {
	if (!inRowSpacingCm || inRowSpacingCm <= 0) return null;
	return Math.floor(bedLengthCm / inRowSpacingCm);
}

/**
 * A planting may cover several neighbouring rows of the same crop (bug-fix-001).
 * The width is the source of truth; the number of rows is derived from it (at least 1).
 */
export function rowsInWidth(widthCm: number, rowSpacingCm: number | null | undefined): number {
	if (!rowSpacingCm || rowSpacingCm <= 0) return 1;
	return Math.max(1, Math.floor(widthCm / rowSpacingCm));
}

/** Plants of a full-length planting over all its rows. */
export function plantsInPlanting(
	bedLengthCm: number,
	widthCm: number,
	rowSpacingCm: number | null | undefined,
	inRowSpacingCm: number | null | undefined
): number | null {
	const perRow = plantsPerRow(bedLengthCm, inRowSpacingCm);
	return perRow === null ? null : perRow * rowsInWidth(widthCm, rowSpacingCm);
}

export interface Spacing {
	rowSpacingCm?: number | null;
	inRowSpacingCm?: number | null;
}

const rangesOverlap = (a1: number, a2: number, b1: number, b2: number) => a1 < b2 && b1 < a2;

/** Rows overlap if they share space across the bed AND time. */
export function rowsOverlap(a: RowLike, b: RowLike): boolean {
	return (
		rangesOverlap(a.offsetCm, a.offsetCm + a.widthCm, b.offsetCm, b.offsetCm + b.widthCm) &&
		a.startDate <= b.endDate &&
		b.startDate <= a.endDate
	);
}

/** Checks a row against the bed and the other rows of the same bed. */
export function checkRow(
	bed: BedSize,
	row: RowLike,
	others: readonly RowLike[],
	spacing: Spacing = {}
): SpaceIssue[] {
	const issues: SpaceIssue[] = [];
	const { inRowSpacingCm, rowSpacingCm } = spacing;
	const rows = rowsInWidth(row.widthCm, rowSpacingCm);
	if (row.widthCm <= 0 || row.offsetCm < 0) {
		issues.push({ kind: 'INVALID', messageDe: 'Position und Breite der Reihe müssen positiv sein.' });
	}
	if (row.endDate < row.startDate) {
		issues.push({ kind: 'INVALID', messageDe: 'Das Ende liegt vor dem Beginn.' });
	}
	if (row.offsetCm + row.widthCm > bed.widthCm) {
		issues.push({
			kind: 'OUT_OF_BED',
			messageDe: `Die Reihe ragt über das Beet hinaus (${row.offsetCm + row.widthCm} cm von ${bed.widthCm} cm Breite).`
		});
	}
	if (row.quantityMode === 'COUNT') {
		if (!row.count || row.count < 1) {
			issues.push({ kind: 'INVALID', messageDe: 'Bitte eine Anzahl Pflanzen angeben.' });
		} else if (inRowSpacingCm && row.count > (plantsInPlanting(bed.lengthCm, row.widthCm, rowSpacingCm, inRowSpacingCm) ?? Infinity)) {
			const max = plantsInPlanting(bed.lengthCm, row.widthCm, rowSpacingCm, inRowSpacingCm);
			issues.push({
				kind: 'TOO_LONG',
				messageDe:
					rows > 1
						? `${row.count} Pflanzen passen nicht in ${rows} Reihen à ${bed.lengthCm} cm (maximal ${max}).`
						: `${row.count} Pflanzen brauchen ${row.count * inRowSpacingCm} cm, die Reihe ist nur ${bed.lengthCm} cm lang (maximal ${max}).`
			});
		}
	}
	for (const other of others) {
		if (other.id !== undefined && other.id === row.id) continue;
		if (rowsOverlap(row, other)) {
			issues.push({
				kind: 'OVERLAP',
				messageDe: `Überschneidet sich mit ${other.label ?? 'einer anderen Reihe'} (${other.startDate.slice(8, 10)}.${other.startDate.slice(5, 7)}.–${other.endDate.slice(8, 10)}.${other.endDate.slice(5, 7)}.${other.endDate.slice(0, 4)}).`
			});
		}
	}
	return issues;
}

/** Free space across the bed from `offsetCm` to the next row (in that time) or the bed edge. */
export function freeWidthAt(
	bed: BedSize,
	offsetCm: number,
	startDate: string,
	endDate: string,
	others: readonly RowLike[]
): number {
	let limit = bed.widthCm;
	for (const o of others) {
		if (!(o.startDate <= endDate && startDate <= o.endDate)) continue;
		if (o.offsetCm <= offsetCm && offsetCm < o.offsetCm + o.widthCm) return 0;
		if (o.offsetCm > offsetCm) limit = Math.min(limit, o.offsetCm);
	}
	return Math.max(0, limit - offsetCm);
}

/**
 * First position across the bed where a row of `widthCm` fits during the given time,
 * or null if the bed is full.
 */
export function nextFreeOffset(
	bed: BedSize,
	widthCm: number,
	startDate: string,
	endDate: string,
	others: readonly RowLike[]
): number | null {
	const busy = others
		.filter((o) => o.startDate <= endDate && startDate <= o.endDate)
		.map((o) => [o.offsetCm, o.offsetCm + o.widthCm] as const)
		.sort((a, b) => a[0] - b[0]);
	let pos = 0;
	for (const [from, to] of busy) {
		if (from - pos >= widthCm) break;
		pos = Math.max(pos, to);
	}
	return pos + widthCm <= bed.widthCm ? pos : null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Time a planting takes up its row, derived from the culture route: from the start of the step
 * marked as planting start to the end of the step marked as planting end. A single row is sown or
 * planted on one day, so steps that count from the planting (e.g. "harvest 90–105 days after sowing")
 * are measured from the start of the sowing window, not from its end.
 * Perennials without an end step stay `lifespanYears` (default 1) years.
 */
export function plantingWindow(
	steps: readonly (Step & { isPlantingEnd?: boolean })[],
	frost: FrostDates,
	year: number,
	lifespanYears?: number | null
): { startDate: string; endDate: string } {
	if (!steps.length) throw new Error('Route has no steps');
	// Collapse the planting-start window to its first day
	const collapsed = steps.map((s) => (s.isPlantingStart ? { ...s, offsetEndDays: s.offsetStartDays } : s));
	const resolved = resolveSteps(collapsed, frost, year);
	const start = resolved.find((r) => r.step.isPlantingStart) ?? resolved[0];
	const end = resolved.find((r) => r.step.isPlantingEnd);
	if (end) return { startDate: iso(start.start), endDate: iso(end.end) };
	const until = new Date(start.start);
	until.setUTCFullYear(until.getUTCFullYear() + (lifespanYears ?? 1));
	return { startDate: iso(start.start), endDate: iso(until) };
}
