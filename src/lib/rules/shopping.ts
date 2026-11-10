// Shopping list (spec §4.7) – what to buy for a season, without stock. Pure function.
import { plantsInPlanting, rowsInWidth } from './space.ts';

export type ShoppingKind = 'SEED' | 'SEEDLING' | 'SETS' | 'GREEN_MANURE';

/** One planting of the season with what the list needs to know. */
export interface ShoppingPlanting {
	speciesId: number;
	speciesDe: string;
	sourcing: 'SEED' | 'SEEDLING' | 'SETS' | 'EXISTING';
	quantityMode: 'FULL_ROW' | 'COUNT';
	count: number | null;
	widthCm: number;
	bedLengthCm: number;
	rowSpacingCm: number | null;
	inRowSpacingCm: number | null;
	setWeightG: number | null;
	isGreenManure: boolean;
}

export interface ShoppingLine {
	/** `<speciesId>:<kind>` – stable key to keep the "gekauft" tick when the list is regenerated */
	key: string;
	speciesId: number;
	kind: ShoppingKind;
	labelDe: string;
	quantity: number;
	unit: 'Pflanzen' | 'Stück' | 'kg' | 'm²';
	detailDe: string | null;
}

const KIND_ORDER: Record<ShoppingKind, number> = { SEED: 0, SETS: 1, SEEDLING: 2, GREEN_MANURE: 3 };
const round1 = (n: number) => Math.round(n * 10) / 10;
const metres = (cm: number) => `${(cm / 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} m`;

function plantsOf(p: ShoppingPlanting): number {
	if (p.quantityMode === 'COUNT' && p.count) return p.count;
	return plantsInPlanting(p.bedLengthCm, p.widthCm, p.rowSpacingCm, p.inRowSpacingCm) ?? 0;
}

function kindOf(p: ShoppingPlanting): ShoppingKind | null {
	if (p.sourcing === 'EXISTING') return null;
	if (p.isGreenManure) return 'GREEN_MANURE';
	return p.sourcing;
}

interface Acc {
	line: Omit<ShoppingLine, 'quantity' | 'detailDe'>;
	quantity: number;
	plants: number;
	rows: number;
	rowCm: number;
}

/** One line per crop and kind; quantities of all plantings of the season added up. */
export function shoppingList(plantings: readonly ShoppingPlanting[]): ShoppingLine[] {
	const acc = new Map<string, Acc>();
	for (const p of plantings) {
		const kind = kindOf(p);
		if (!kind) continue;
		const key = `${p.speciesId}:${kind}`;
		const byWeight = kind === 'SETS' && !!p.setWeightG;
		const unit: ShoppingLine['unit'] =
			kind === 'GREEN_MANURE' ? 'm²' : kind === 'SEED' ? 'Pflanzen' : byWeight ? 'kg' : 'Stück';
		const a = acc.get(key) ?? {
			line: { key, speciesId: p.speciesId, kind, labelDe: p.speciesDe, unit },
			quantity: 0,
			plants: 0,
			rows: 0,
			rowCm: 0
		};
		const plants = plantsOf(p);
		const rows = rowsInWidth(p.widthCm, p.rowSpacingCm);
		a.plants += plants;
		a.rows += rows;
		a.rowCm += rows * p.bedLengthCm;
		if (kind === 'GREEN_MANURE') a.quantity += (p.bedLengthCm * p.widthCm) / 10_000;
		else if (byWeight) a.quantity += (plants * p.setWeightG!) / 1000;
		else a.quantity += plants;
		acc.set(key, a);
	}
	return [...acc.values()]
		.map(({ line, quantity, plants, rows, rowCm }) => ({
			...line,
			quantity: line.unit === 'kg' || line.unit === 'm²' ? round1(quantity) : quantity,
			detailDe:
				line.kind === 'SEED'
					? `${rows} ${rows === 1 ? 'Reihe' : 'Reihen'} · ${metres(rowCm)} Reihe`
					: line.unit === 'kg'
						? `≈ ${plants} Knollen`
						: null
		}))
		.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.labelDe.localeCompare(b.labelDe, 'de'));
}
