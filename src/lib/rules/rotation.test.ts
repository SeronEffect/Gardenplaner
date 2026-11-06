import { describe, expect, it } from 'vitest';
import { assessRow, checkFeeding, checkNeighbours, checkRotation, companionMap, soilTask, type CropRow } from './rotation.ts';
import { greenManureSuggestions, planSuccession, type GreenManureOption } from './succession.ts';
import { DEFAULT_FROST } from './timeline.ts';
import { SPECIES } from '../data/plants.ts';

// Families: 1 Nachtschatten, 2 Kreuzblütler, 3 Doldenblütler, 4 Raublatt, 5 Korbblütler
const crop = {
	tomate: { speciesId: 1, speciesDe: 'Tomate', familyId: 1, familyDe: 'Nachtschattengewächse', rotationPauseYears: 3, feedingType: 'HEAVY' },
	kartoffel: { speciesId: 2, speciesDe: 'Kartoffel', familyId: 1, familyDe: 'Nachtschattengewächse', rotationPauseYears: 3, feedingType: 'HEAVY' },
	radieschen: { speciesId: 3, speciesDe: 'Radieschen', familyId: 2, familyDe: 'Kreuzblütler', rotationPauseYears: 4, feedingType: 'LIGHT' },
	moehre: { speciesId: 4, speciesDe: 'Möhre', familyId: 3, familyDe: 'Doldenblütler', rotationPauseYears: 3, feedingType: 'MEDIUM' },
	gelbsenf: { speciesId: 5, speciesDe: 'Gelbsenf', familyId: 2, familyDe: 'Kreuzblütler', rotationPauseYears: 4, feedingType: 'NONE', isGreenManure: true },
	phacelia: { speciesId: 6, speciesDe: 'Phacelia', familyId: 4, familyDe: 'Raublattgewächse', rotationPauseYears: 3, feedingType: 'NONE', isGreenManure: true },
	salat: { speciesId: 7, speciesDe: 'Salat', familyId: 5, familyDe: 'Korbblütler', rotationPauseYears: 3, feedingType: 'LIGHT' }
} as const;

let nextId = 1;
const row = (c: keyof typeof crop, o: Partial<CropRow> = {}): CropRow => ({
	id: nextId++,
	offsetCm: 0,
	widthCm: 60,
	quantityMode: 'FULL_ROW',
	startDate: '2027-05-15',
	endDate: '2027-09-30',
	...crop[c],
	...o
});
const newRow = (c: keyof typeof crop, o: Partial<CropRow> = {}) => ({ ...row(c, o), id: undefined });

describe('checkRotation', () => {
	const history = [row('kartoffel', { startDate: '2026-04-15', endDate: '2026-08-31' })];

	it('blocks the same family on the same space within the pause (STRICT)', () => {
		const [i] = checkRotation(newRow('tomate'), history, 'STRICT');
		expect(i).toMatchObject({ kind: 'ROTATION', level: 'block', before: true });
		expect(i.messageDe).toContain('Kartoffel');
		expect(i.messageDe).toContain('frei ab 08/2029');
	});

	it('only warns in WARN beds and skips OFF beds', () => {
		expect(checkRotation(newRow('tomate'), history, 'WARN')[0].level).toBe('warn');
		expect(checkRotation(newRow('tomate'), history, 'OFF')).toEqual([]);
	});

	it('is fine after the pause, on other space or for another family', () => {
		expect(checkRotation(newRow('tomate', { startDate: '2029-09-01', endDate: '2029-10-01' }), history, 'STRICT')).toEqual([]);
		expect(checkRotation(newRow('tomate', { offsetCm: 60 }), history, 'STRICT')).toEqual([]);
		expect(checkRotation(newRow('moehre'), history, 'STRICT')).toEqual([]);
	});

	it('counts partial overlap across the bed', () => {
		expect(checkRotation(newRow('tomate', { offsetCm: 50 }), history, 'STRICT')).toHaveLength(1);
	});

	it('allows the same crop again in the same season, but not another species of the family', () => {
		const lettuce = [row('salat', { startDate: '2027-04-01', endDate: '2027-05-31' })];
		expect(checkRotation(newRow('salat', { startDate: '2027-06-15', endDate: '2027-08-15' }), lettuce, 'STRICT')).toEqual([]);
		expect(checkRotation(newRow('salat', { startDate: '2028-04-15', endDate: '2028-06-15' }), lettuce, 'STRICT')).toHaveLength(1);
		const radish = [row('radieschen', { startDate: '2027-04-01', endDate: '2027-05-31' })];
		expect(checkRotation(newRow('gelbsenf', { startDate: '2027-08-15', endDate: '2027-11-30' }), radish, 'STRICT')).toHaveLength(1);
	});

	it('also looks forward: a planned crop of the same family later on the space', () => {
		const later = [row('radieschen', { startDate: '2028-04-01', endDate: '2028-05-15' })];
		const [i] = checkRotation(newRow('gelbsenf', { startDate: '2027-08-15', endDate: '2027-11-30' }), later, 'WARN');
		expect(i).toMatchObject({ before: false });
		expect(i.messageDe).toContain('für 2028 geplant');
	});
});

describe('checkFeeding', () => {
	it('likes heavy → medium and notes heavy twice', () => {
		const prev = [row('kartoffel', { startDate: '2026-04-15', endDate: '2026-08-31' })];
		expect(checkFeeding(newRow('moehre'), prev)[0]).toMatchObject({ kind: 'FEEDING_GOOD', level: 'good' });
		expect(checkFeeding(newRow('tomate', { familyId: 9 }), prev)[0]).toMatchObject({ kind: 'FEEDING_SAME' });
	});

	it('ignores green manure as predecessor and very old crops', () => {
		const prev = [
			row('kartoffel', { startDate: '2026-04-15', endDate: '2026-08-31' }),
			row('phacelia', { startDate: '2026-09-01', endDate: '2026-12-31' })
		];
		expect(checkFeeding(newRow('moehre'), prev)[0].kind).toBe('FEEDING_GOOD');
		const old = [row('kartoffel', { startDate: '2024-04-15', endDate: '2024-08-31' })];
		expect(checkFeeding(newRow('moehre'), old)).toEqual([]);
	});
});

describe('checkNeighbours', () => {
	const companions = companionMap([
		{ speciesAId: 1, speciesBId: 2, relation: 'BAD' },
		{ speciesAId: 1, speciesBId: 4, relation: 'GOOD' }
	]);

	it('finds good and bad direct neighbours at the same time', () => {
		const others = [row('kartoffel', { offsetCm: 60 }), row('moehre', { offsetCm: 125, widthCm: 25 })];
		const issues = checkNeighbours(newRow('tomate', { offsetCm: 65, widthCm: 60 }), others, companions);
		// Kartoffel overlaps in space (space rule), Möhre is 0 cm away
		expect(issues.map((i) => i.kind)).toEqual(['NEIGHBOUR_GOOD']);
		const bad = checkNeighbours(newRow('tomate', { offsetCm: 125 }), [row('kartoffel', { offsetCm: 60, widthCm: 60 })], companions);
		expect(bad[0]).toMatchObject({ kind: 'NEIGHBOUR_BAD', level: 'warn' });
	});

	it('ignores rows further away than 10 cm or at another time', () => {
		expect(checkNeighbours(newRow('tomate', { offsetCm: 131 }), [row('kartoffel', { offsetCm: 60 })], companions)).toEqual([]);
		const other = [row('kartoffel', { offsetCm: 60, startDate: '2026-04-01', endDate: '2026-08-01' })];
		expect(checkNeighbours(newRow('tomate', { offsetCm: 120 }), other, companions)).toEqual([]);
	});

	it('scores the assessment and sorts by severity', () => {
		const others = [
			row('kartoffel', { offsetCm: 0, startDate: '2026-04-15', endDate: '2026-08-31' }),
			row('moehre', { offsetCm: 60, widthCm: 25 })
		];
		const a = assessRow(newRow('tomate'), others, 'WARN', companions);
		expect(a.issues.map((i) => i.kind)).toEqual(['ROTATION', 'FEEDING_SAME', 'NEIGHBOUR_GOOD']);
		expect(a.score).toBe(-5 - 1 + 1);
	});
});

describe('soilTask', () => {
	it('adds a soil task before the planting if the same family grew here', () => {
		const issues = checkRotation(newRow('tomate'), [row('kartoffel', { startDate: '2026-04-15', endDate: '2026-08-31' })], 'WARN');
		expect(soilTask(7, '2027-05-15', issues)).toMatchObject({ key: 'p7:soil', dueStart: '2027-05-01', dueEnd: '2027-05-14' });
		expect(soilTask(7, '2027-05-15', [])).toBeNull();
	});
});

describe('planSuccession', () => {
	const bed = { lengthCm: 400, widthCm: 100 };
	const first = { offsetCm: 0, widthCm: 30, quantityMode: 'FULL_ROW' as const, startDate: '2027-04-01', endDate: '2027-05-31' };

	it('moves sets into the next free row while the first still grows', () => {
		const sets = planSuccession(bed, first, 4, 21, []);
		expect(sets.map((s) => s.startDate)).toEqual(['2027-04-01', '2027-04-22', '2027-05-13', '2027-06-03']);
		expect(sets.map((s) => s.offsetCm)).toEqual([0, 30, 60, 0]);
	});

	it('reports sets that do not fit', () => {
		const sets = planSuccession(bed, first, 5, 7, []);
		expect(sets.map((s) => s.offsetCm)).toEqual([0, 30, 60, null, null]);
	});
});

describe('greenManureSuggestions', () => {
	const bed = { lengthCm: 400, widthCm: 400 };
	const gm = (slug: 'phacelia' | 'gelbsenf'): GreenManureOption => {
		const s = SPECIES.find((x) => x.slug === slug)!;
		return {
			...crop[slug],
			routes: s.routes.map((r, i) => ({ id: i + 1, nameDe: r.nameDe, steps: r.steps }))
		};
	};
	const options = [gm('phacelia'), gm('gelbsenf')];

	it('suggests a green manure after an early harvest', () => {
		const potato = row('kartoffel', { startDate: '2027-04-15', endDate: '2027-07-15' });
		const s = greenManureSuggestions(bed, 2027, [potato], options, DEFAULT_FROST);
		expect(s.map((x) => x.speciesDe)).toEqual(['Phacelia', 'Gelbsenf']);
		expect(s[0]).toMatchObject({ afterId: potato.id, startDate: '2027-08-01', endDate: '2027-12-31', gapDays: null });
	});

	it('leaves out Gelbsenf after a Kreuzblütler and short gaps', () => {
		const radish = row('radieschen', { startDate: '2027-06-01', endDate: '2027-08-10' });
		expect(greenManureSuggestions(bed, 2027, [radish], options, DEFAULT_FROST).map((x) => x.speciesDe)).toEqual(['Phacelia']);
		const next = row('salat', { startDate: '2027-09-01', endDate: '2027-10-15' });
		expect(greenManureSuggestions(bed, 2027, [radish, next], options, DEFAULT_FROST)).toEqual([]);
	});

	it('ends the green manure before the next crop', () => {
		const early = row('salat', { startDate: '2027-04-01', endDate: '2027-07-20' });
		const next = row('moehre', { startDate: '2027-10-15', endDate: '2027-12-01' });
		const [s] = greenManureSuggestions(bed, 2027, [early, next], options, DEFAULT_FROST);
		expect(s).toMatchObject({ speciesDe: 'Phacelia', startDate: '2027-08-01', endDate: '2027-10-14' });
	});

	it('suggests nothing for late harvests', () => {
		const tomato = row('tomate', { startDate: '2027-05-15', endDate: '2027-10-15' });
		expect(greenManureSuggestions(bed, 2027, [tomato], options, DEFAULT_FROST)).toEqual([]);
	});
});
