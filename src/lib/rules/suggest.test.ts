import { describe, expect, it } from 'vitest';
import { companionMap, type CropRow } from './rotation.ts';
import { freeGaps, suggestForBed, type SuggestBed, type SuggestSpecies } from './suggest.ts';

const bed: SuggestBed = { id: 1, lengthCm: 400, widthCm: 400, rotationMode: 'STRICT', rowDirection: 'HORIZONTAL' };
const sp = (o: Partial<SuggestSpecies> & Pick<SuggestSpecies, 'speciesId' | 'speciesDe'>): SuggestSpecies => ({
	familyId: o.speciesId,
	familyDe: 'Familie',
	rotationPauseYears: 3,
	feedingType: 'MEDIUM',
	rowSpacingCm: 50,
	heightMaxCm: 40,
	routeId: 10 + o.speciesId,
	startDate: '2027-05-01',
	endDate: '2027-08-31',
	...o
});
const row = (o: Partial<CropRow> & Pick<CropRow, 'id' | 'speciesId' | 'offsetCm' | 'widthCm'>): CropRow => ({
	quantityMode: 'FULL_ROW',
	startDate: '2027-05-01',
	endDate: '2027-08-31',
	speciesDe: `Art ${o.speciesId}`,
	familyId: o.speciesId,
	familyDe: 'Familie',
	rotationPauseYears: 3,
	feedingType: 'MEDIUM',
	...o
});

describe('freeGaps', () => {
	it('returns the free stretches across the bed during the window', () => {
		const others = [row({ id: 1, speciesId: 1, offsetCm: 100, widthCm: 50 }), row({ id: 2, speciesId: 1, offsetCm: 300, widthCm: 100 })];
		expect(freeGaps(bed, '2027-06-01', '2027-06-30', others)).toEqual([
			{ fromCm: 0, toCm: 100 },
			{ fromCm: 150, toCm: 300 }
		]);
	});

	it('ignores rows outside the window', () => {
		const others = [row({ id: 1, speciesId: 1, offsetCm: 0, widthCm: 400, startDate: '2027-03-01', endDate: '2027-04-15' })];
		expect(freeGaps(bed, '2027-05-01', '2027-08-31', others)).toEqual([{ fromCm: 0, toCm: 400 }]);
	});
});

describe('suggestForBed', () => {
	it('ranks crops for a free space by rotation, feeding order and neighbours', () => {
		// Last year: heavy feeder of family 7 on the whole bed
		const history = [row({ id: 1, speciesId: 7, offsetCm: 0, widthCm: 400, feedingType: 'HEAVY', startDate: '2026-05-01', endDate: '2026-09-30' })];
		const species = [
			sp({ speciesId: 7, speciesDe: 'Gleiche Familie' }),
			sp({ speciesId: 2, speciesDe: 'Mittelzehrer', feedingType: 'MEDIUM' }),
			sp({ speciesId: 3, speciesDe: 'Schwachzehrer', feedingType: 'LIGHT' })
		];
		const [slot] = suggestForBed(bed, history, species, companionMap([]));
		expect(slot.offsetCm).toBe(0);
		// Same family is blocked in a STRICT bed and left out; medium after heavy is the good order
		expect(slot.candidates.map((c) => c.speciesDe)).toEqual(['Mittelzehrer', 'Schwachzehrer']);
		expect(slot.candidates[0].score).toBe(2);
		expect(slot.candidates[0].reasons.some((r) => r.level === 'good')).toBe(true);
	});

	it('keeps same-family crops in WARN beds but ranks them low', () => {
		const history = [row({ id: 1, speciesId: 7, offsetCm: 0, widthCm: 400, startDate: '2026-05-01', endDate: '2026-09-30' })];
		const [slot] = suggestForBed({ ...bed, rotationMode: 'WARN' }, history, [sp({ speciesId: 7, speciesDe: 'A' }), sp({ speciesId: 2, speciesDe: 'B' })], companionMap([]));
		expect(slot.candidates.map((c) => c.speciesDe)).toEqual(['B', 'A']);
		expect(slot.candidates[1].score).toBeLessThan(0);
	});

	it('gives a free space per gap and counts good neighbours', () => {
		const rows = [row({ id: 1, speciesId: 5, speciesDe: 'Zwiebel', offsetCm: 0, widthCm: 100 })];
		const species = [sp({ speciesId: 2, speciesDe: 'Möhre' }), sp({ speciesId: 3, speciesDe: 'Salat' })];
		const companions = companionMap([{ speciesAId: 2, speciesBId: 5, relation: 'GOOD' }]);
		const [slot] = suggestForBed(bed, rows, species, companions);
		expect(slot.offsetCm).toBe(100);
		expect(slot.candidates[0]).toMatchObject({ speciesDe: 'Möhre', offsetCm: 100, widthCm: 50, maxRows: 6, score: 1 });
	});

	it('prefers tall crops on the north edge of horizontal beds', () => {
		const rows = [row({ id: 1, speciesId: 9, offsetCm: 0, widthCm: 300 })];
		const tall = sp({ speciesId: 2, speciesDe: 'Tomate', heightMaxCm: 200 });
		// The only gap is in the south (300–400 cm): tall crop gets a minus
		expect(suggestForBed(bed, rows, [tall], companionMap([]))[0].candidates[0].score).toBe(-1);
		// Empty bed: the gap starts at the north edge → plus
		expect(suggestForBed(bed, [], [tall], companionMap([]))[0].candidates[0].score).toBe(1);
		// Vertical rows: no north side
		expect(suggestForBed({ ...bed, rowDirection: 'VERTICAL' }, [], [tall], companionMap([]))[0].candidates[0].score).toBe(0);
	});

	it('skips gaps narrower than the row spacing and returns the top 3 with a rest count', () => {
		const rows = [row({ id: 1, speciesId: 9, offsetCm: 30, widthCm: 370 })];
		const species = [1, 2, 3, 4].map((i) => sp({ speciesId: i, speciesDe: `S${i}`, rowSpacingCm: i === 4 ? 40 : 25 }));
		const [slot] = suggestForBed(bed, rows, species, companionMap([]), 3);
		expect(slot.candidates.map((c) => c.speciesDe)).toEqual(['S1', 'S2', 'S3']);
		expect(slot.more).toBe(0);
		const top2 = suggestForBed(bed, rows, species, companionMap([]), 2)[0];
		expect(top2.candidates).toHaveLength(2);
		expect(top2.more).toBe(1);
	});

	it('returns nothing for a full bed', () => {
		const rows = [row({ id: 1, speciesId: 9, offsetCm: 0, widthCm: 400 })];
		expect(suggestForBed(bed, rows, [sp({ speciesId: 2, speciesDe: 'X' })], companionMap([]))).toEqual([]);
	});
});
