import { describe, expect, it } from 'vitest';
import { yieldPerCrop } from './diary.ts';

describe('yieldPerCrop', () => {
	it('adds up harvests per crop and unit, biggest first, and ignores notes', () => {
		const out = yieldPerCrop([
			{ type: 'HARVEST', speciesDe: 'Tomate', amount: 1.5, unit: 'kg' },
			{ type: 'HARVEST', speciesDe: 'Tomate', amount: 2.25, unit: 'kg' },
			{ type: 'HARVEST', speciesDe: 'Tomate', amount: 3, unit: 'Stück' },
			{ type: 'HARVEST', speciesDe: 'Radieschen', amount: 4, unit: 'Bund' },
			{ type: 'HARVEST', speciesDe: null, amount: 1, unit: 'kg' },
			{ type: 'NOTE', speciesDe: 'Tomate', amount: null, unit: null }
		]);
		expect(out).toEqual([
			{ speciesDe: 'Tomate', unit: 'kg', amount: 3.75, harvests: 2 },
			{ speciesDe: 'Ohne Zuordnung', unit: 'kg', amount: 1, harvests: 1 },
			{ speciesDe: 'Radieschen', unit: 'Bund', amount: 4, harvests: 1 },
			{ speciesDe: 'Tomate', unit: 'Stück', amount: 3, harvests: 1 }
		]);
	});
});
