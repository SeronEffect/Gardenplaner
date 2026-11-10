// Diary (phase 5, spec §4.9): harvests and notes.
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from './db/index.ts';
import * as t from './db/schema.ts';
import { plantingsInYear } from './garden.ts';

export async function listEntries(year: number, bedId: number | null) {
	return db
		.select({
			id: t.logEntries.id,
			date: t.logEntries.date,
			type: t.logEntries.type,
			amount: t.logEntries.amount,
			unit: t.logEntries.unit,
			textDe: t.logEntries.textDe,
			bedId: t.logEntries.bedId,
			bedName: t.beds.name,
			plantingId: t.logEntries.plantingId,
			speciesDe: t.species.nameDe
		})
		.from(t.logEntries)
		.leftJoin(t.beds, eq(t.logEntries.bedId, t.beds.id))
		.leftJoin(t.species, eq(t.logEntries.speciesId, t.species.id))
		.where(
			and(
				gte(t.logEntries.date, `${year}-01-01`),
				lte(t.logEntries.date, `${year}-12-31`),
				bedId ? eq(t.logEntries.bedId, bedId) : undefined
			)
		)
		.orderBy(desc(t.logEntries.date), desc(t.logEntries.id));
}

/** Rows that grow in the year, to link a harvest or note to. */
export async function plantingChoices(year: number) {
	const [rows, beds] = await Promise.all([plantingsInYear(year), db.select().from(t.beds).orderBy(asc(t.beds.sortOrder), asc(t.beds.id))]);
	const name = new Map(beds.map((b) => [b.id, b.name]));
	return rows.map((p) => ({
		id: p.id,
		bedId: p.bedId,
		labelDe: `${name.get(p.bedId) ?? 'Beet'} · ${p.speciesDe} (${p.offsetCm}–${p.offsetCm + p.widthCm} cm)`
	}));
}

export interface EntryInput {
	date: string;
	type: 'HARVEST' | 'NOTE';
	bedId: number | null;
	plantingId: number | null;
	speciesId: number | null;
	amount: number | null;
	unit: string | null;
	textDe: string | null;
}

/** A linked row decides bed and crop, so yields stay correct even if the row is deleted later. */
export async function addEntry(input: EntryInput) {
	let { bedId, speciesId } = input;
	if (input.plantingId) {
		const [p] = await db
			.select({ bedId: t.plantings.bedId, speciesId: t.plantings.speciesId })
			.from(t.plantings)
			.where(eq(t.plantings.id, input.plantingId));
		if (p) ({ bedId, speciesId } = p);
	}
	await db.insert(t.logEntries).values({ ...input, bedId, speciesId });
}

export async function deleteEntry(id: number) {
	await db.delete(t.logEntries).where(eq(t.logEntries.id, id));
}
