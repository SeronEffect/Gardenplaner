import { describe, expect, it } from 'vitest';
import { checkRow, nextFreeOffset, plantingWindow, plantsPerRow, rowsOverlap, type RowLike } from './space.ts';
import { DEFAULT_FROST } from './timeline.ts';
import { SPECIES } from '../data/plants.ts';

const bed = { lengthCm: 400, widthCm: 400 };
const row = (o: Partial<RowLike>): RowLike => ({
	offsetCm: 0,
	widthCm: 25,
	quantityMode: 'FULL_ROW',
	startDate: '2027-04-01',
	endDate: '2027-08-31',
	...o
});

describe('plantsPerRow', () => {
	it('fits plants into the bed length', () => {
		expect(plantsPerRow(400, 60)).toBe(6);
		expect(plantsPerRow(400, 4)).toBe(100);
		expect(plantsPerRow(400, null)).toBeNull();
	});
});

describe('rowsOverlap', () => {
	it('needs overlap in space and time', () => {
		expect(rowsOverlap(row({}), row({ offsetCm: 10 }))).toBe(true);
		expect(rowsOverlap(row({}), row({ offsetCm: 25 }))).toBe(false); // touching edges is fine
		expect(rowsOverlap(row({}), row({ startDate: '2027-09-01', endDate: '2027-10-31' }))).toBe(false);
	});
});

describe('checkRow', () => {
	it('accepts a row that fits', () => {
		expect(checkRow(bed, row({}), [])).toEqual([]);
	});

	it('rejects rows outside the bed', () => {
		expect(checkRow(bed, row({ offsetCm: 390, widthCm: 25 }), []).map((i) => i.kind)).toEqual(['OUT_OF_BED']);
	});

	it('rejects too many plants for the row length', () => {
		const issues = checkRow(bed, row({ quantityMode: 'COUNT', count: 7, widthCm: 60 }), [], 60);
		expect(issues.map((i) => i.kind)).toEqual(['TOO_LONG']);
		expect(issues[0].messageDe).toContain('maximal 6');
	});

	it('reports overlaps but ignores the row itself', () => {
		const existing = row({ id: 1, label: 'Möhre' });
		expect(checkRow(bed, row({ offsetCm: 10 }), [existing])[0].messageDe).toContain('Möhre');
		expect(checkRow(bed, row({ id: 1 }), [existing])).toEqual([]);
	});

	it('rejects an end before the start', () => {
		expect(checkRow(bed, row({ endDate: '2027-03-01' }), []).map((i) => i.kind)).toContain('INVALID');
	});
});

describe('nextFreeOffset', () => {
	it('finds the first gap', () => {
		const others = [row({ offsetCm: 0, widthCm: 25 }), row({ offsetCm: 60, widthCm: 25 })];
		expect(nextFreeOffset(bed, 30, '2027-05-01', '2027-06-01', others)).toBe(25);
		expect(nextFreeOffset(bed, 40, '2027-05-01', '2027-06-01', others)).toBe(85);
	});

	it('ignores rows at other times and returns null when full', () => {
		const later = [row({ offsetCm: 0, widthCm: 400, startDate: '2027-09-01', endDate: '2027-10-01' })];
		expect(nextFreeOffset(bed, 30, '2027-05-01', '2027-06-01', later)).toBe(0);
		expect(nextFreeOffset(bed, 30, '2027-09-10', '2027-09-20', later)).toBeNull();
	});
});

describe('plantingWindow', () => {
	const route = (slug: string, r = 0) => SPECIES.find((s) => s.slug === slug)!.routes[r].steps;

	it('runs from planting start to harvest end', () => {
		expect(plantingWindow(route('tomate'), DEFAULT_FROST, 2027)).toEqual({
			startDate: '2027-05-15',
			endDate: '2027-10-31'
		});
	});

	it('measures relative harvest windows from the sowing day', () => {
		// Möhre früh: sown from 01.03., harvest 90–105 days later
		expect(plantingWindow(route('moehre'), DEFAULT_FROST, 2027)).toEqual({
			startDate: '2027-03-01',
			endDate: '2027-06-14'
		});
	});

	it('uses the lifespan for perennials without an end step', () => {
		expect(plantingWindow(route('erdbeere'), DEFAULT_FROST, 2027, 4)).toEqual({
			startDate: '2027-07-01',
			endDate: '2031-07-01'
		});
	});
});
