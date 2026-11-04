// Pure date logic for culture steps – shared by server and browser.
// Dates are handled as UTC midnight to avoid DST/timezone shifts.

export type StepType =
	| 'PRESOW'
	| 'PRICK_OUT'
	| 'PRESPROUT'
	| 'HARDEN_OFF'
	| 'DIRECT_SOW'
	| 'PLANT_OUT'
	| 'CARE'
	| 'FERTILIZE'
	| 'PRUNE'
	| 'HARVEST'
	| 'CLEAR';
export type StepLocation = 'WINDOWSILL' | 'GREENHOUSE' | 'BED';
export type Anchor = 'LAST_FROST' | 'FIRST_FROST' | 'PLANTING_START' | 'PREV_STEP' | 'FIXED_MMDD';

export interface Step {
	type: StepType;
	location: StepLocation;
	anchor: Anchor;
	fixedMmdd?: string | null;
	offsetStartDays: number;
	offsetEndDays: number;
	isPlantingStart?: boolean;
	labelDe?: string;
}

export interface FrostDates {
	/** MM-DD */
	lastFrost: string;
	/** MM-DD */
	firstFrost: string;
}

export interface ResolvedStep<S extends Step = Step> {
	step: S;
	start: Date;
	end: Date;
}

const DAY = 86_400_000;

/** Reference year for converting calendar dates to offsets (not a leap year). */
export const REFERENCE_YEAR = 2025;
export const DEFAULT_FROST: FrostDates = { lastFrost: '05-15', firstFrost: '10-15' };

export function parseMmdd(mmdd: string): { month: number; day: number } {
	const m = /^(\d{2})-(\d{2})$/.exec(mmdd);
	if (!m) throw new Error(`Invalid MM-DD date: ${mmdd}`);
	const month = Number(m[1]);
	const day = Number(m[2]);
	if (month < 1 || month > 12 || day < 1 || day > 31) throw new Error(`Invalid MM-DD date: ${mmdd}`);
	return { month, day };
}

export function dateFromMmdd(year: number, mmdd: string): Date {
	const { month, day } = parseMmdd(mmdd);
	return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(d: Date, days: number): Date {
	return new Date(d.getTime() + days * DAY);
}

export function daysBetween(a: Date, b: Date): number {
	return Math.round((b.getTime() - a.getTime()) / DAY);
}

/** Offset in days of `mmdd` relative to `anchorMmdd` in the reference year. */
export function offsetFrom(anchorMmdd: string, mmdd: string): number {
	return daysBetween(
		dateFromMmdd(REFERENCE_YEAR, anchorMmdd),
		dateFromMmdd(REFERENCE_YEAR, mmdd)
	);
}

/**
 * Turns the steps of one culture route into concrete date windows for a season.
 * Steps must be in route order (PREV_STEP refers to the previous resolved step).
 */
export function resolveSteps<S extends Step>(
	steps: readonly S[],
	frost: FrostDates,
	year: number
): ResolvedStep<S>[] {
	const out: ResolvedStep<S>[] = [];
	let plantingStart: ResolvedStep<S> | undefined;

	for (const step of steps) {
		let start: Date;
		let end: Date;
		switch (step.anchor) {
			case 'LAST_FROST':
			case 'FIRST_FROST':
			case 'FIXED_MMDD': {
				const mmdd =
					step.anchor === 'LAST_FROST'
						? frost.lastFrost
						: step.anchor === 'FIRST_FROST'
							? frost.firstFrost
							: step.fixedMmdd;
				if (!mmdd) throw new Error(`Step "${step.labelDe ?? step.type}" needs fixedMmdd`);
				const base = dateFromMmdd(year, mmdd);
				start = addDays(base, step.offsetStartDays);
				end = addDays(base, step.offsetEndDays);
				break;
			}
			case 'PREV_STEP':
			case 'PLANTING_START': {
				const ref = step.anchor === 'PREV_STEP' ? out.at(-1) : plantingStart;
				if (!ref)
					throw new Error(`Step "${step.labelDe ?? step.type}" has no ${step.anchor} to refer to`);
				start = addDays(ref.start, step.offsetStartDays);
				end = addDays(ref.end, step.offsetEndDays);
				break;
			}
		}
		if (end < start) throw new Error(`Step "${step.labelDe ?? step.type}" ends before it starts`);
		const resolved = { step, start, end };
		out.push(resolved);
		if (step.isPlantingStart) plantingStart = resolved;
	}
	return out;
}

// ── Year strip for the plant card ────────────────────────────────────────

export type TimelineCategory = 'windowsill' | 'greenhouse' | 'directSow' | 'plantOut' | 'harvest';
export const TIMELINE_CATEGORIES: TimelineCategory[] = [
	'windowsill',
	'greenhouse',
	'directSow',
	'plantOut',
	'harvest'
];

/** Which bar of the year strip a step belongs to (null = not shown). */
export function categoryOf(step: Pick<Step, 'type' | 'location'>): TimelineCategory | null {
	switch (step.type) {
		case 'PRESOW':
		case 'PRESPROUT':
			return step.location === 'GREENHOUSE' ? 'greenhouse' : 'windowsill';
		case 'DIRECT_SOW':
			return step.location === 'GREENHOUSE' ? 'greenhouse' : 'directSow';
		case 'PLANT_OUT':
			return step.location === 'GREENHOUSE' ? 'greenhouse' : 'plantOut';
		case 'HARVEST':
			return 'harvest';
		default:
			return null;
	}
}

/** 24 half-month cells: index 0 = 1.–15. Jan, 1 = 16.–31. Jan, … */
export const HALF_MONTHS = 24;

function halfMonthIndex(d: Date): number {
	return d.getUTCMonth() * 2 + (d.getUTCDate() >= 16 ? 1 : 0);
}

/**
 * Marks which half-months a set of windows covers. Windows reaching into the next
 * year (e.g. a harvest in the following season) wrap around, since the strip shows
 * a typical year.
 */
export function halfMonthCells(windows: readonly { start: Date; end: Date }[]): boolean[] {
	const cells = new Array<boolean>(HALF_MONTHS).fill(false);
	for (const { start, end } of windows) {
		const span = daysBetween(start, end);
		if (span >= 365) {
			cells.fill(true);
			continue;
		}
		const first = halfMonthIndex(start);
		const steps = (end.getUTCFullYear() - start.getUTCFullYear()) * HALF_MONTHS + halfMonthIndex(end) - first;
		for (let i = 0; i <= steps; i++) cells[(first + i) % HALF_MONTHS] = true;
	}
	return cells;
}

export type YearStrip = Record<TimelineCategory, boolean[]>;

/** Year strip over all routes of a species. */
export function yearStrip(
	routes: readonly (readonly Step[])[],
	frost: FrostDates = DEFAULT_FROST,
	year: number = REFERENCE_YEAR
): YearStrip {
	const windows: Record<TimelineCategory, { start: Date; end: Date }[]> = {
		windowsill: [],
		greenhouse: [],
		directSow: [],
		plantOut: [],
		harvest: []
	};
	for (const steps of routes) {
		for (const r of resolveSteps(steps, frost, year)) {
			const cat = categoryOf(r.step);
			if (cat) windows[cat].push(r);
		}
	}
	return Object.fromEntries(
		TIMELINE_CATEGORIES.map((c) => [c, halfMonthCells(windows[c])])
	) as YearStrip;
}
