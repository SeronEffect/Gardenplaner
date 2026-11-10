import { describe, expect, it } from 'vitest';
import { markAt, placeOnYear, plantingSegments, seasonLanes, type TimelinePlanting } from './season-timeline.ts';
import { generateTasks, type TaskStep } from './tasks.ts';
import { DEFAULT_FROST } from './timeline.ts';
import { SPECIES } from '../data/plants.ts';

const stepsOf = (slug: string, route = 0): TaskStep[] =>
	SPECIES.find((s) => s.slug === slug)!.routes[route].steps.map((s, i) => ({ ...s, sortOrder: i }));

const planting = (o: Partial<TimelinePlanting>): TimelinePlanting => ({
	id: 1,
	bedId: 1,
	speciesId: 1,
	speciesDe: 'Tomate',
	speciesSlug: 'tomate',
	offsetCm: 0,
	widthCm: 60,
	startDate: '2027-05-15',
	endDate: '2027-10-31',
	isGreenManure: false,
	...o
});

const drafts = (p: TimelinePlanting, slug: string) =>
	generateTasks({ ...p, feedingType: 'HEAVY' }, stepsOf(slug), DEFAULT_FROST);

describe('placeOnYear', () => {
	it('clips to the year and returns percent', () => {
		expect(placeOnYear('2027-01-01', '2027-12-31', 2027)).toMatchObject({ left: 0, width: 100 });
		const p = placeOnYear('2026-11-01', '2027-01-31', 2027)!;
		expect(p.start).toBe('2027-01-01');
		expect(p.width).toBeCloseTo((31 / 365) * 100);
		expect(placeOnYear('2026-03-01', '2026-04-01', 2027)).toBeNull();
	});
	it('handles leap years', () => {
		expect(placeOnYear('2028-12-31', '2028-12-31', 2028)!.width).toBeCloseTo(100 / 366);
	});
});

describe('plantingSegments', () => {
	it('shows pre-culture, time in the bed and harvest for a tomato', () => {
		const p = planting({});
		const segs = plantingSegments(p, drafts(p, 'tomate'), 2027);
		expect(segs.map((s) => s.kind)).toEqual(['pre', 'bed', 'harvest']);
		expect(segs[0]).toMatchObject({ start: '2027-03-15', end: '2027-05-14' });
		expect(segs[1]).toMatchObject({ start: '2027-05-15', end: '2027-10-31' });
		expect(segs[2]).toMatchObject({ start: '2027-08-01', end: '2027-10-31' });
	});
	it('has no pre-culture for direct sowing', () => {
		const p = planting({ speciesDe: 'Radieschen', speciesSlug: 'radieschen', startDate: '2027-04-01', endDate: '2027-05-15' });
		const segs = plantingSegments(p, drafts(p, 'radieschen'), 2027);
		expect(segs.some((s) => s.kind === 'pre')).toBe(false);
		expect(segs[0].kind).toBe('bed');
	});
	it('marks green manure', () => {
		const p = planting({ speciesDe: 'Phacelia', isGreenManure: true, startDate: '2027-08-01', endDate: '2027-11-30' });
		expect(plantingSegments(p, [], 2027).map((s) => s.kind)).toEqual(['manure']);
	});
	it('shows only the part of a perennial that falls into the year', () => {
		const p = planting({ speciesDe: 'Erdbeere', startDate: '2025-08-01', endDate: '2029-08-31' });
		const [bed] = plantingSegments(p, [], 2027);
		expect(bed).toMatchObject({ start: '2027-01-01', end: '2027-12-31', left: 0, width: 100 });
	});
});

describe('seasonLanes', () => {
	it('puts succession sowings at the same place into one lane, sorted by bed order and position', () => {
		const a = planting({ id: 1, bedId: 2, speciesId: 5, speciesDe: 'Salat', offsetCm: 30, startDate: '2027-04-01', endDate: '2027-05-20' });
		const b = { ...a, id: 2, startDate: '2027-05-21', endDate: '2027-07-10' };
		const c = planting({ id: 3, bedId: 2, offsetCm: 0 });
		const d = planting({ id: 4, bedId: 1, offsetCm: 0 });
		const lanes = seasonLanes(2027, [b, c, a, d], () => [], [2, 1]);
		expect(lanes.map((l) => [l.bedId, l.offsetCm, l.count])).toEqual([
			[2, 0, 1],
			[2, 30, 2],
			[1, 0, 1]
		]);
		expect(lanes[1].plantingId).toBe(1);
		expect(lanes[1].segments.map((s) => s.start)).toEqual(['2027-04-01', '2027-05-21']);
	});
	it('drops plantings outside the year', () => {
		expect(seasonLanes(2027, [planting({ startDate: '2026-04-01', endDate: '2026-06-01' })], () => [])).toEqual([]);
	});
});

describe('markAt', () => {
	it('places frost dates and ignores other years', () => {
		expect(markAt('2027-01-01', 2027)).toBe(0);
		expect(markAt('2027-05-15', 2027)).toBeCloseTo((134 / 365) * 100);
		expect(markAt('2026-05-15', 2027)).toBeNull();
	});
});
