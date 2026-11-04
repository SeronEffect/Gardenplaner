// Task generation (spec §4.4): culture steps + planting dates → dated tasks.
// Pure functions, shared by server and browser. Dates are ISO strings (YYYY-MM-DD).
import { resolveSteps, type FrostDates, type Step, type StepLocation, type StepType } from './timeline.ts';
import { addDaysIso, toIso } from './weeks.ts';

export type TaskType = StepType | 'MANUAL';

export interface TaskStep extends Step {
	sortOrder: number;
	labelDe: string;
	repeatEveryDays?: number | null;
}

export interface PlantingForTasks {
	id: number;
	startDate: string;
	endDate: string;
	speciesDe: string;
	feedingType: 'HEAVY' | 'MEDIUM' | 'LIGHT' | 'NONE';
	fertilizeIntervalDays?: number | null;
}

export interface TaskDraft {
	/** Stable key – tasks are matched by it when plantings change */
	key: string;
	type: TaskType;
	location: StepLocation;
	titleDe: string;
	dueStart: string;
	dueEnd: string;
}

/** Fertilizing interval by feeding type (spec §4.4); null = no regular fertilizing */
export const FERTILIZE_DAYS: Record<PlantingForTasks['feedingType'], number | 'ONCE' | null> = {
	HEAVY: 14,
	MEDIUM: 28,
	LIGHT: 'ONCE',
	NONE: null
};

/** Fertilizing only during the main growing season */
const FERTILIZE_SEASON = { from: '03-15', to: '09-30' };
const MAX_REPEATS = 60;

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const minIso = (a: string, b: string) => (a < b ? a : b);
const maxIso = (a: string, b: string) => (a > b ? a : b);

/**
 * Generates the tasks of one planting.
 * - Steps up to the planting start move with the planting date (pre-culture, pre-sprouting).
 * - Steps counted from the planting (PREV_STEP / PLANTING_START) move as well.
 * - Steps with their own calendar window (harvest until first frost, perennial care) keep it,
 *   clipped to the time the planting is in the bed.
 * - Perennials get their calendar-based steps again in every following year.
 */
export function generateTasks(planting: PlantingForTasks, steps: readonly TaskStep[], frost: FrostDates): TaskDraft[] {
	const out: TaskDraft[] = [];
	if (!steps.length) return out;
	const year0 = Number(planting.startDate.slice(0, 4));
	const endYear = Math.min(Number(planting.endDate.slice(0, 4)), year0 + 10);
	const psIndex = Math.max(0, steps.findIndex((s) => s.isPlantingStart));

	// Generic dates for the season, planting start collapsed to its first day
	const collapsed = steps.map((s, i) => (i === psIndex ? { ...s, offsetEndDays: s.offsetStartDays } : s));
	const generic = resolveSteps(collapsed, frost, year0);
	const genericFull = resolveSteps(steps, frost, year0);
	const delta = days(toIso(generic[psIndex].start), planting.startDate);

	const inBed = (from: string, to: string) => !(to < planting.startDate || from > planting.endDate);
	const clip = (from: string, to: string): [string, string] => [
		maxIso(from, planting.startDate),
		minIso(to, planting.endDate)
	];

	steps.forEach((step, i) => {
		const isRelative = step.anchor === 'PREV_STEP' || step.anchor === 'PLANTING_START';
		let from: string;
		let to: string;
		if (i === psIndex) {
			// The row is planted/sown on its start date – give it at most one week
			from = planting.startDate;
			to = addDaysIso(from, Math.min(7, days(toIso(genericFull[i].start), toIso(genericFull[i].end))));
		} else if (i < psIndex || isRelative) {
			from = addDaysIso(toIso(generic[i].start), delta);
			to = addDaysIso(toIso(generic[i].end), delta);
		} else {
			from = toIso(generic[i].start);
			to = toIso(generic[i].end);
		}

		const emit = (f: string, t: string, year: number) => {
			if (i > psIndex) {
				if (!inBed(f, t)) return;
				[f, t] = clip(f, t);
			}
			if (step.repeatEveryDays && step.repeatEveryDays > 0) {
				const until = minIso(planting.endDate, `${year}-12-31`);
				for (let n = 0, d = f; d <= until && n < MAX_REPEATS; n++, d = addDaysIso(d, step.repeatEveryDays)) {
					out.push({
						key: `p${planting.id}:s${step.sortOrder}:${year}:${n}`,
						type: step.type,
						location: step.location,
						titleDe: step.labelDe,
						dueStart: d,
						dueEnd: addDaysIso(d, Math.min(step.repeatEveryDays - 1, 6))
					});
				}
				return;
			}
			out.push({
				key: `p${planting.id}:s${step.sortOrder}:${year}`,
				type: step.type,
				location: step.location,
				titleDe: step.labelDe,
				dueStart: f,
				dueEnd: t
			});
		};

		// Perennials: a calendar step that already began before planting starts next year
		// (e.g. no strawberry harvest in the planting summer)
		const perennial = endYear > year0;
		if (!(perennial && i > psIndex && !isRelative && from < planting.startDate)) emit(from, to, year0);

		// Perennials: calendar-based steps after planting come back every year
		if (i > psIndex && !isRelative && perennial) {
			for (let y = year0 + 1; y <= endYear; y++) {
				const [r] = resolveSteps([step], frost, y);
				emit(toIso(r.start), toIso(r.end), y);
			}
		}
	});

	out.push(...fertilizeTasks(planting, endYear));
	return out;
}

function fertilizeTasks(p: PlantingForTasks, endYear: number): TaskDraft[] {
	const interval = p.fertilizeIntervalDays ?? FERTILIZE_DAYS[p.feedingType];
	if (!interval) return [];
	const first = addDaysIso(p.startDate, 14);
	const title = `${p.speciesDe} düngen`;
	if (interval === 'ONCE') {
		return first <= p.endDate
			? [{ key: `p${p.id}:f:once`, type: 'FERTILIZE', location: 'BED', titleDe: title, dueStart: first, dueEnd: addDaysIso(first, 6) }]
			: [];
	}
	const out: TaskDraft[] = [];
	for (let y = Number(p.startDate.slice(0, 4)); y <= endYear; y++) {
		const from = maxIso(first, `${y}-${FERTILIZE_SEASON.from}`);
		const to = minIso(p.endDate, `${y}-${FERTILIZE_SEASON.to}`);
		for (let n = 0, d = from; d <= to && n < MAX_REPEATS; n++, d = addDaysIso(d, interval)) {
			out.push({
				key: `p${p.id}:f:${y}:${n}`,
				type: 'FERTILIZE',
				location: 'BED',
				titleDe: title,
				dueStart: d,
				dueEnd: addDaysIso(d, Math.min(interval - 1, 6))
			});
		}
	}
	return out;
}

// ── Categories for filters and colours ───────────────────────────────────
export type TaskCategory = 'sow' | 'plant' | 'care' | 'fertilize' | 'harvest' | 'after' | 'own';

export function taskCategory(type: TaskType): TaskCategory {
	switch (type) {
		case 'PRESOW':
		case 'PRESPROUT':
		case 'DIRECT_SOW':
			return 'sow';
		case 'PRICK_OUT':
		case 'HARDEN_OFF':
		case 'PLANT_OUT':
			return 'plant';
		case 'CARE':
		case 'PRUNE':
			return 'care';
		case 'FERTILIZE':
			return 'fertilize';
		case 'HARVEST':
			return 'harvest';
		case 'CLEAR':
			return 'after';
		default:
			return 'own';
	}
}
