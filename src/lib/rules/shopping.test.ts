import { describe, expect, it } from 'vitest';
import { shoppingList, type ShoppingPlanting } from './shopping.ts';

const base = {
	bedLengthCm: 400,
	quantityMode: 'FULL_ROW' as const,
	count: null,
	isGreenManure: false,
	setWeightG: null
};
const carrot: ShoppingPlanting = {
	...base,
	speciesId: 1,
	speciesDe: 'Möhre',
	sourcing: 'SEED',
	widthCm: 50,
	rowSpacingCm: 25,
	inRowSpacingCm: 4
};

describe('shoppingList', () => {
	it('counts seed over all rows of a full-length planting', () => {
		const [item] = shoppingList([carrot]);
		expect(item).toMatchObject({ key: '1:SEED', kind: 'SEED', labelDe: 'Möhre', quantity: 200, unit: 'Pflanzen' });
		expect(item.detailDe).toBe('2 Reihen · 8 m Reihe');
	});

	it('adds up several plantings of the same crop and kind', () => {
		const [item] = shoppingList([carrot, { ...carrot, widthCm: 25, quantityMode: 'COUNT', count: 40 }]);
		expect(item.quantity).toBe(240);
		expect(item.detailDe).toBe('3 Reihen · 12 m Reihe');
	});

	it('gives seed potatoes in kg from the set weight', () => {
		const potato: ShoppingPlanting = {
			...base,
			speciesId: 2,
			speciesDe: 'Kartoffel',
			sourcing: 'SETS',
			widthCm: 120,
			rowSpacingCm: 60,
			inRowSpacingCm: 30,
			setWeightG: 70
		};
		// 2 rows × 13 plants = 26 tubers × 70 g = 1.82 kg
		expect(shoppingList([potato])[0]).toMatchObject({ kind: 'SETS', quantity: 1.8, unit: 'kg', detailDe: '≈ 26 Knollen' });
	});

	it('counts onion sets and seedlings as pieces', () => {
		const onion: ShoppingPlanting = { ...carrot, speciesId: 3, speciesDe: 'Zwiebel', sourcing: 'SETS', widthCm: 25, inRowSpacingCm: 10 };
		const tomato: ShoppingPlanting = {
			...carrot,
			speciesId: 4,
			speciesDe: 'Tomate',
			sourcing: 'SEEDLING',
			quantityMode: 'COUNT',
			count: 5,
			widthCm: 60,
			rowSpacingCm: 60
		};
		const items = shoppingList([onion, tomato]);
		expect(items.find((i) => i.speciesId === 3)).toMatchObject({ kind: 'SETS', quantity: 40, unit: 'Stück' });
		expect(items.find((i) => i.speciesId === 4)).toMatchObject({ kind: 'SEEDLING', quantity: 5, unit: 'Stück' });
	});

	it('gives green manure as bed area and skips existing plants', () => {
		const phacelia: ShoppingPlanting = {
			...base,
			speciesId: 5,
			speciesDe: 'Phacelia',
			sourcing: 'SEED',
			widthCm: 150,
			rowSpacingCm: null,
			inRowSpacingCm: null,
			isGreenManure: true
		};
		const items = shoppingList([phacelia, { ...carrot, sourcing: 'EXISTING' }]);
		expect(items).toEqual([
			expect.objectContaining({ key: '5:GREEN_MANURE', kind: 'GREEN_MANURE', quantity: 6, unit: 'm²' })
		]);
	});

	it('sorts by kind, then crop', () => {
		const items = shoppingList([
			{ ...carrot, speciesId: 9, speciesDe: 'Radieschen' },
			{ ...carrot, speciesId: 8, speciesDe: 'Tomate', sourcing: 'SEEDLING' },
			carrot
		]);
		expect(items.map((i) => i.labelDe)).toEqual(['Möhre', 'Radieschen', 'Tomate']);
	});
});
