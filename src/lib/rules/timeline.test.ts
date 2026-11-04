import { describe, expect, it } from 'vitest';
import {
	DEFAULT_FROST,
	categoryOf,
	halfMonthCells,
	offsetFrom,
	resolveSteps,
	yearStrip,
	type Step
} from './timeline.ts';

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('offsetFrom', () => {
	it('counts days relative to the anchor', () => {
		expect(offsetFrom('05-15', '05-15')).toBe(0);
		expect(offsetFrom('05-15', '03-15')).toBe(-61);
		expect(offsetFrom('05-15', '06-05')).toBe(21);
	});
});

describe('resolveSteps', () => {
	const tomato: Step[] = [
		{ type: 'PRESOW', location: 'WINDOWSILL', anchor: 'LAST_FROST', offsetStartDays: -61, offsetEndDays: -30 },
		{ type: 'PRICK_OUT', location: 'WINDOWSILL', anchor: 'PREV_STEP', offsetStartDays: 14, offsetEndDays: 21 },
		{ type: 'PLANT_OUT', location: 'BED', anchor: 'LAST_FROST', offsetStartDays: 0, offsetEndDays: 21, isPlantingStart: true },
		{ type: 'CARE', location: 'BED', anchor: 'PLANTING_START', offsetStartDays: 7, offsetEndDays: 7 },
		{ type: 'HARVEST', location: 'BED', anchor: 'FIRST_FROST', offsetStartDays: -75, offsetEndDays: 16 }
	];

	it('resolves all anchor types', () => {
		const r = resolveSteps(tomato, DEFAULT_FROST, 2027);
		expect(r.map((x) => [iso(x.start), iso(x.end)])).toEqual([
			['2027-03-15', '2027-04-15'],
			['2027-03-29', '2027-05-06'],
			['2027-05-15', '2027-06-05'],
			['2027-05-22', '2027-06-12'],
			['2027-08-01', '2027-10-31']
		]);
	});

	it('moves frost-anchored steps when the frost date changes', () => {
		const r = resolveSteps(tomato, { lastFrost: '05-25', firstFrost: '10-15' }, 2027);
		expect(iso(r[0].start)).toBe('2027-03-25');
		expect(iso(r[2].start)).toBe('2027-05-25');
	});

	it('fails when PREV_STEP has nothing before it', () => {
		expect(() =>
			resolveSteps(
				[{ type: 'HARVEST', location: 'BED', anchor: 'PREV_STEP', offsetStartDays: 1, offsetEndDays: 2 }],
				DEFAULT_FROST,
				2027
			)
		).toThrow();
	});

	it('handles fixed dates', () => {
		const [r] = resolveSteps(
			[{ type: 'PRUNE', location: 'BED', anchor: 'FIXED_MMDD', fixedMmdd: '02-01', offsetStartDays: 0, offsetEndDays: 42 }],
			DEFAULT_FROST,
			2027
		);
		expect([iso(r.start), iso(r.end)]).toEqual(['2027-02-01', '2027-03-15']);
	});
});

describe('halfMonthCells', () => {
	const d = (s: string) => new Date(`${s}T00:00:00Z`);

	it('marks covered half-months', () => {
		const cells = halfMonthCells([{ start: d('2027-03-15'), end: d('2027-04-15') }]);
		expect(cells.flatMap((c, i) => (c ? [i] : []))).toEqual([4, 5, 6]);
	});

	it('wraps windows into the next year', () => {
		const cells = halfMonthCells([{ start: d('2027-12-20'), end: d('2028-01-10') }]);
		expect(cells.flatMap((c, i) => (c ? [i] : []))).toEqual([0, 23]);
	});
});

describe('categoryOf / yearStrip', () => {
	it('maps steps to the card bars', () => {
		expect(categoryOf({ type: 'PRESOW', location: 'WINDOWSILL' })).toBe('windowsill');
		expect(categoryOf({ type: 'PLANT_OUT', location: 'GREENHOUSE' })).toBe('greenhouse');
		expect(categoryOf({ type: 'PLANT_OUT', location: 'BED' })).toBe('plantOut');
		expect(categoryOf({ type: 'CARE', location: 'BED' })).toBeNull();
	});

	it('combines routes', () => {
		const strip = yearStrip([
			[{ type: 'DIRECT_SOW', location: 'BED', anchor: 'FIXED_MMDD', fixedMmdd: '05-01', offsetStartDays: 0, offsetEndDays: 10 }],
			[{ type: 'DIRECT_SOW', location: 'BED', anchor: 'FIXED_MMDD', fixedMmdd: '08-01', offsetStartDays: 0, offsetEndDays: 10 }]
		]);
		expect(strip.directSow.flatMap((c, i) => (c ? [i] : []))).toEqual([8, 14]);
		expect(strip.harvest.every((c) => !c)).toBe(true);
	});
});
