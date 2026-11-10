// Shopping list (phase 5, spec §4.7): generated from the season's plantings, kept in the DB so
// "gekauft" ticks and manual lines survive.
import { and, asc, eq, inArray, isNotNull, ne } from 'drizzle-orm';
import { db } from './db/index.ts';
import * as t from './db/schema.ts';
import { shoppingList, type ShoppingLine } from '../rules/shopping.ts';

/** Lines the plan needs for a season (plantings PLANNED or ACTIVE). */
export async function plannedLines(seasonId: number): Promise<ShoppingLine[]> {
	const rows = await db
		.select({
			speciesId: t.plantings.speciesId,
			speciesDe: t.species.nameDe,
			sourcing: t.plantings.sourcing,
			quantityMode: t.plantings.quantityMode,
			count: t.plantings.count,
			widthCm: t.plantings.widthCm,
			bedLengthCm: t.beds.lengthCm,
			rowSpacingCm: t.species.rowSpacingCm,
			inRowSpacingCm: t.species.inRowSpacingCm,
			setWeightG: t.species.setWeightG,
			isGreenManure: t.species.isGreenManure
		})
		.from(t.plantings)
		.innerJoin(t.species, eq(t.plantings.speciesId, t.species.id))
		.innerJoin(t.beds, eq(t.plantings.bedId, t.beds.id))
		.where(and(eq(t.plantings.seasonId, seasonId), ne(t.plantings.status, 'DONE')));
	return shoppingList(rows);
}

/**
 * Brings the stored list in line with the plan: generated lines are inserted/updated by key
 * (the tick stays), lines no longer needed are removed unless ticked. Manual lines are untouched.
 */
export async function syncShoppingList(seasonId: number) {
	const lines = await plannedLines(seasonId);
	await db.transaction(async (tx) => {
		const stored = await tx
			.select({ id: t.shoppingItems.id, key: t.shoppingItems.generatedKey, bought: t.shoppingItems.bought })
			.from(t.shoppingItems)
			.where(and(eq(t.shoppingItems.seasonId, seasonId), isNotNull(t.shoppingItems.generatedKey)));
		const wanted = new Set(lines.map((l) => l.key));
		const gone = stored.filter((s) => !wanted.has(s.key!) && !s.bought).map((s) => s.id);
		if (gone.length) await tx.delete(t.shoppingItems).where(inArray(t.shoppingItems.id, gone));
		for (const l of lines) {
			const values = {
				speciesId: l.speciesId,
				kind: l.kind,
				labelDe: l.labelDe,
				quantity: l.quantity,
				unit: l.unit,
				detailDe: l.detailDe
			};
			await tx
				.insert(t.shoppingItems)
				.values({ seasonId, generatedKey: l.key, ...values })
				.onConflictDoUpdate({ target: [t.shoppingItems.seasonId, t.shoppingItems.generatedKey], set: values });
		}
	});
}

export async function listShopping(seasonId: number) {
	const items = await db
		.select()
		.from(t.shoppingItems)
		.where(eq(t.shoppingItems.seasonId, seasonId))
		.orderBy(asc(t.shoppingItems.id));
	const wanted = new Set((await plannedLines(seasonId)).map((l) => l.key));
	const order = { SEED: 0, SETS: 1, SEEDLING: 2, GREEN_MANURE: 3 } as const;
	return items
		.map((i) => ({ ...i, stale: i.generatedKey !== null && !wanted.has(i.generatedKey) }))
		.sort(
			(a, b) =>
				(a.kind ? order[a.kind] : 9) - (b.kind ? order[b.kind] : 9) || a.labelDe.localeCompare(b.labelDe, 'de')
		);
}

export async function setBought(id: number, bought: boolean) {
	await db.update(t.shoppingItems).set({ bought }).where(eq(t.shoppingItems.id, id));
}

export async function addManualItem(seasonId: number, labelDe: string, quantity: number | null, unit: string | null) {
	await db.insert(t.shoppingItems).values({ seasonId, labelDe, quantity, unit });
}

/** Removes a manual line, or a ticked generated line that is no longer in the plan. */
export async function deleteShoppingItem(id: number) {
	await db.delete(t.shoppingItems).where(eq(t.shoppingItems.id, id));
}
