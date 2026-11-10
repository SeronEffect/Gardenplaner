// Diary (spec §4.9, phase 5): yield per crop for a season. Pure function.

export const HARVEST_UNITS = ['kg', 'Stück', 'Bund'] as const;
export type HarvestUnit = (typeof HARVEST_UNITS)[number];

export interface YieldEntry {
	type: 'HARVEST' | 'NOTE';
	speciesDe: string | null;
	amount: number | null;
	unit: string | null;
}

export interface YieldLine {
	speciesDe: string;
	unit: string;
	amount: number;
	harvests: number;
}

const UNIT_ORDER: Record<string, number> = { kg: 0, Bund: 1, Stück: 2 };

/** Harvests added up per crop and unit (kg first, then by amount). Notes are ignored. */
export function yieldPerCrop(entries: readonly YieldEntry[]): YieldLine[] {
	const acc = new Map<string, YieldLine>();
	for (const e of entries) {
		if (e.type !== 'HARVEST' || !e.amount || !e.unit) continue;
		const speciesDe = e.speciesDe ?? 'Ohne Zuordnung';
		const key = `${speciesDe}|${e.unit}`;
		const line = acc.get(key) ?? { speciesDe, unit: e.unit, amount: 0, harvests: 0 };
		line.amount = Math.round((line.amount + e.amount) * 100) / 100;
		line.harvests += 1;
		acc.set(key, line);
	}
	return [...acc.values()].sort(
		(a, b) => (UNIT_ORDER[a.unit] ?? 9) - (UNIT_ORDER[b.unit] ?? 9) || b.amount - a.amount || a.speciesDe.localeCompare(b.speciesDe, 'de')
	);
}
