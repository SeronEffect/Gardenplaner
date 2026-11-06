import { describe, expect, it } from 'vitest';
import { generateTasks, taskCategory, type PlantingForTasks, type TaskStep } from './tasks.ts';
import { DEFAULT_FROST } from './timeline.ts';
import { addDaysIso, isoWeek, mondayOf, mondayOfWeekId, weekId } from './weeks.ts';
import { SPECIES } from '../data/plants.ts';

const stepsOf = (slug: string, route = 0): TaskStep[] =>
	SPECIES.find((s) => s.slug === slug)!.routes[route].steps.map((s, i) => ({ ...s, sortOrder: i }));

const planting = (o: Partial<PlantingForTasks>): PlantingForTasks => ({
	id: 1,
	startDate: '2027-05-15',
	endDate: '2027-10-31',
	speciesDe: 'Tomate',
	feedingType: 'HEAVY',
	...o
});

describe('weeks', () => {
	it('computes ISO weeks', () => {
		expect(isoWeek('2027-05-12')).toEqual({ year: 2027, week: 19 });
		expect(isoWeek('2027-01-01')).toEqual({ year: 2026, week: 53 });
		expect(weekId('2026-11-04')).toBe('2026-W45');
		expect(mondayOf('2026-11-08')).toBe('2026-11-02');
		expect(mondayOfWeekId('2027-W19')).toBe('2027-05-10');
		expect(mondayOfWeekId('2027-W99')).toBeNull();
		expect(addDaysIso('2027-02-27', 2)).toBe('2027-03-01');
	});
});

describe('generateTasks', () => {
	it('creates the tomato tasks with sourced dates', () => {
		const tasks = generateTasks(planting({}), stepsOf('tomate'), DEFAULT_FROST);
		const byTitle = (t: string) => tasks.filter((x) => x.titleDe === t);
		expect(byTitle('Tomaten auf der Fensterbank säen')[0]).toMatchObject({ dueStart: '2027-03-15', dueEnd: '2027-04-15', location: 'WINDOWSILL' });
		expect(byTitle('Tomaten auspflanzen')[0]).toMatchObject({ dueStart: '2027-05-15', dueEnd: '2027-05-22' });
		expect(byTitle('Tomaten ernten')[0]).toMatchObject({ dueStart: '2027-08-01', dueEnd: '2027-10-31' });
		// weekly pinching out from 2 weeks after planting until the end
		const care = byTitle('Tomaten ausgeizen und aufbinden');
		expect(care[0].dueStart).toBe('2027-05-29');
		expect(care.at(-1)!.dueStart <= '2027-10-31').toBe(true);
		expect(care.length).toBeGreaterThan(20);
		// heavy feeder: every 14 days, 14 days after planting, until end of September
		const fert = byTitle('Tomate düngen');
		expect(fert[0].dueStart).toBe('2027-05-29');
		expect(fert.at(-1)!.dueStart <= '2027-09-30').toBe(true);
		expect(fert.length).toBe(9);
	});

	it('moves pre-culture and relative steps with a later planting date', () => {
		const tasks = generateTasks(planting({ startDate: '2027-05-25' }), stepsOf('tomate'), DEFAULT_FROST);
		expect(tasks.find((t) => t.titleDe.includes('säen'))!.dueStart).toBe('2027-03-25');
		expect(tasks.find((t) => t.titleDe === 'Tomaten pikieren')!.dueStart).toBe('2027-04-08');
		// harvest keeps its frost-based window
		expect(tasks.find((t) => t.titleDe === 'Tomaten ernten')!.dueStart).toBe('2027-08-01');
	});

	it('clips steps to the time in the bed', () => {
		const tasks = generateTasks(planting({ endDate: '2027-08-15' }), stepsOf('tomate'), DEFAULT_FROST);
		expect(tasks.find((t) => t.titleDe === 'Tomaten ernten')).toMatchObject({ dueStart: '2027-08-01', dueEnd: '2027-08-15' });
		expect(tasks.every((t) => t.dueStart <= '2027-08-15')).toBe(true);
	});

	it('repeats perennial care every year', () => {
		const tasks = generateTasks(
			planting({ speciesDe: 'Erdbeere', feedingType: 'MEDIUM', startDate: '2027-07-01', endDate: '2030-07-01' }),
			stepsOf('erdbeere'),
			DEFAULT_FROST
		);
		const harvest = tasks.filter((t) => t.titleDe === 'Erdbeeren ernten').map((t) => t.dueStart);
		expect(harvest).toEqual(['2028-06-01', '2029-06-01', '2030-06-01']); // not in the planting year
		expect(tasks.filter((t) => t.titleDe === 'Erdbeeren pflanzen')).toHaveLength(1);
	});

	it('fertilizes light feeders once, green manure never', () => {
		const salat = generateTasks(planting({ speciesDe: 'Salat', feedingType: 'LIGHT', startDate: '2027-04-01', endDate: '2027-05-30' }), stepsOf('salat'), DEFAULT_FROST);
		expect(salat.filter((t) => t.type === 'FERTILIZE')).toHaveLength(1);
		const phacelia = generateTasks(planting({ speciesDe: 'Phacelia', feedingType: 'NONE', startDate: '2027-08-01', endDate: '2027-12-31' }), stepsOf('phacelia'), DEFAULT_FROST);
		expect(phacelia.filter((t) => t.type === 'FERTILIZE')).toHaveLength(0);
	});

	it('creates unique keys', () => {
		for (const s of SPECIES) {
			s.routes.forEach((r, ri) => {
				const tasks = generateTasks(planting({ speciesDe: s.nameDe, feedingType: s.feedingType, startDate: '2027-04-01', endDate: '2029-10-01' }), stepsOf(s.slug, ri), DEFAULT_FROST);
				const keys = tasks.map((t) => t.key);
				expect(new Set(keys).size, `${s.slug}/${r.slug}`).toBe(keys.length);
				for (const t of tasks) expect(t.dueEnd >= t.dueStart, `${t.key}`).toBe(true);
			});
		}
	});

	it('maps types to categories', () => {
		expect(taskCategory('DIRECT_SOW')).toBe('sow');
		expect(taskCategory('PLANT_OUT')).toBe('plant');
		expect(taskCategory('MANUAL')).toBe('own');
	});
});
