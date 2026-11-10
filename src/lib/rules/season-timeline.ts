// Season timeline (docs/Redesign.md, D3): one lane per row position, segments over the year.
// Pure functions, shared by server and browser. Dates are ISO strings (YYYY-MM-DD).
import type { TaskType } from './tasks.ts';

export type SegmentKind = 'pre' | 'bed' | 'harvest' | 'manure' | 'suggestion';

export interface TimelinePlanting {
	id: number;
	bedId: number;
	speciesId: number;
	speciesDe: string;
	speciesSlug: string;
	offsetCm: number;
	widthCm: number;
	startDate: string;
	endDate: string;
	isGreenManure: boolean;
}

/** The parts of a generated task the timeline needs (see rules/tasks.ts) */
export interface TimelineStep {
	type: TaskType;
	location: string;
	dueStart: string;
	dueEnd: string;
}

export interface Segment {
	kind: SegmentKind;
	start: string;
	end: string;
	/** Position on the year axis in percent */
	left: number;
	width: number;
	plantingId: number | null;
	label: string;
}

export interface Lane {
	key: string;
	bedId: number;
	speciesDe: string;
	speciesSlug: string;
	offsetCm: number;
	widthCm: number;
	/** First planting of the lane – target of a click */
	plantingId: number;
	plantingIds: number[];
	count: number;
	segments: Segment[];
}

export interface TimelineBed {
	id: number;
	name: string;
	type: string;
	lanes: Lane[];
	/** Green manure suggestions for gaps ≥ 6 weeks (planned seasons, outdoor beds) */
	suggestions: (Segment & { offsetCm: number; widthCm: number; afterDe: string })[];
}

/** Pre-culture away from the bed: sowing on the windowsill, pricking out, pre-sprouting, hardening off */
const PRE_TYPES = new Set<TaskType>(['PRESOW', 'PRICK_OUT', 'PRESPROUT', 'HARDEN_OFF']);
const DAY = 86_400_000;

const dayIndex = (iso: string, year: number) => Math.round((Date.parse(iso) - Date.UTC(year, 0, 1)) / DAY);
export const daysInYear = (year: number) => dayIndex(`${year + 1}-01-01`, year);

/** Clips a date range to the year and turns it into percent; null if it lies outside. */
export function placeOnYear(start: string, end: string, year: number): { start: string; end: string; left: number; width: number } | null {
	const from = start < `${year}-01-01` ? `${year}-01-01` : start;
	const to = end > `${year}-12-31` ? `${year}-12-31` : end;
	if (to < from) return null;
	const total = daysInYear(year);
	const a = dayIndex(from, year);
	const b = dayIndex(to, year) + 1;
	return { start: from, end: to, left: (a / total) * 100, width: ((b - a) / total) * 100 };
}

/** Segments of one planting: pre-culture, time in the bed (or green manure), harvest windows. */
export function plantingSegments(p: TimelinePlanting, steps: readonly TimelineStep[], year: number): Segment[] {
	const out: Segment[] = [];
	const push = (kind: SegmentKind, start: string, end: string, label: string) => {
		const pos = placeOnYear(start, end, year);
		if (pos) out.push({ kind, ...pos, plantingId: p.id, label });
	};
	const pre = steps.filter((s) => PRE_TYPES.has(s.type) && s.location !== 'BED');
	if (pre.length) {
		const first = pre.reduce((m, s) => (s.dueStart < m ? s.dueStart : m), pre[0].dueStart);
		if (first < p.startDate) push('pre', first, addDays(p.startDate, -1), `${p.speciesDe}: Vorkultur`);
	}
	push(p.isGreenManure ? 'manure' : 'bed', p.startDate, p.endDate, p.speciesDe);
	for (const s of steps) if (s.type === 'HARVEST') push('harvest', s.dueStart, s.dueEnd, `${p.speciesDe}: Ernte`);
	return out;
}

function addDays(iso: string, n: number): string {
	return new Date(Date.parse(iso) + n * DAY).toISOString().slice(0, 10);
}

/**
 * Builds lanes for a season: plantings of the same crop at the same place in a bed share a lane
 * (succession sowing shows as several bars one after another). Sorted by bed order, then position.
 */
export function seasonLanes(
	year: number,
	plantings: readonly TimelinePlanting[],
	stepsOf: (plantingId: number) => readonly TimelineStep[],
	bedOrder: readonly number[] = []
): Lane[] {
	const lanes = new Map<string, Lane>();
	const sorted = [...plantings].sort((a, b) => a.startDate.localeCompare(b.startDate));
	for (const p of sorted) {
		const segments = plantingSegments(p, stepsOf(p.id), year);
		if (!segments.length) continue;
		const key = `${p.bedId}:${p.offsetCm}:${p.widthCm}:${p.speciesId}`;
		const lane = lanes.get(key);
		if (lane) {
			lane.segments.push(...segments);
			lane.plantingIds.push(p.id);
			lane.count++;
		} else {
			lanes.set(key, {
				key,
				bedId: p.bedId,
				speciesDe: p.speciesDe,
				speciesSlug: p.speciesSlug,
				offsetCm: p.offsetCm,
				widthCm: p.widthCm,
				plantingId: p.id,
				plantingIds: [p.id],
				count: 1,
				segments
			});
		}
	}
	const rank = (bedId: number) => {
		const i = bedOrder.indexOf(bedId);
		return i < 0 ? Number.MAX_SAFE_INTEGER : i;
	};
	return [...lanes.values()].sort(
		(a, b) => rank(a.bedId) - rank(b.bedId) || a.bedId - b.bedId || a.offsetCm - b.offsetCm || firstStart(a).localeCompare(firstStart(b))
	);
}

const firstStart = (l: Lane) => l.segments.reduce((m, s) => (s.start < m ? s.start : m), l.segments[0].start);

/** Position of a date on the year axis (percent), e.g. for frost marks or "today"; null outside the year. */
export function markAt(iso: string, year: number): number | null {
	if (iso.slice(0, 4) !== String(year)) return null;
	return (dayIndex(iso, year) / daysInYear(year)) * 100;
}
