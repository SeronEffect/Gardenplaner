// Tasks: generation from plantings (kept in sync), calendar queries, status changes, own tasks.
import { and, asc, eq, gte, inArray, like, lt, lte } from 'drizzle-orm';
import { db } from './db/index.ts';
import * as t from './db/schema.ts';
import { getFrost } from './plants.ts';
import { generateTasks, type TaskDraft } from '../rules/tasks.ts';
import { soilTask } from '../rules/rotation.ts';
import { assessPlanting, cropRowsOfBed } from './planning.ts';
import type { FrostDates } from '../rules/timeline.ts';

async function draftsFor(plantingId: number, frost: FrostDates): Promise<TaskDraft[]> {
	const [row] = await db
		.select({
			planting: t.plantings,
			speciesDe: t.species.nameDe,
			feedingType: t.species.feedingType,
			fertilizeIntervalDays: t.species.fertilizeIntervalDays,
			seasonStatus: t.seasons.status
		})
		.from(t.plantings)
		.innerJoin(t.species, eq(t.plantings.speciesId, t.species.id))
		.innerJoin(t.seasons, eq(t.plantings.seasonId, t.seasons.id))
		.where(eq(t.plantings.id, plantingId));
	// No tasks for history seasons, cleared rows or rows without a growing method
	if (!row || row.seasonStatus === 'HISTORY' || row.planting.status === 'DONE' || !row.planting.routeId) return [];
	const steps = await db
		.select()
		.from(t.cultureSteps)
		.where(eq(t.cultureSteps.routeId, row.planting.routeId))
		.orderBy(asc(t.cultureSteps.sortOrder));
	const drafts = generateTasks(
		{
			id: row.planting.id,
			startDate: row.planting.startDate,
			endDate: row.planting.endDate,
			speciesDe: row.speciesDe,
			feedingType: row.feedingType,
			fertilizeIntervalDays: row.fertilizeIntervalDays
		},
		steps,
		frost
	);

	// Same family grew here before (WARN beds) → swap soil / add compost first (spec §4.2)
	const [bed] = await db.select().from(t.beds).where(eq(t.beds.id, row.planting.bedId));
	if (bed && bed.rotationMode !== 'OFF') {
		const rows = await cropRowsOfBed(bed.id);
		const self = rows.find((r) => r.id === plantingId);
		if (self) {
			const { issues } = await assessPlanting(bed, self, false, rows);
			const soil = soilTask(plantingId, row.planting.startDate, issues);
			if (soil) drafts.push(soil);
		}
	}
	return drafts;
}

/** Re-syncs every planting of a bed – a change to one row can affect the rotation of the others. */
export async function syncBedTasks(bedId: number): Promise<void> {
	const frost = await getFrost();
	const rows = await db.select({ id: t.plantings.id }).from(t.plantings).where(eq(t.plantings.bedId, bedId));
	for (const r of rows) await syncPlantingTasks(r.id, frost);
}

/**
 * Brings the generated tasks of a planting up to date. Open tasks move with the planting;
 * done or skipped tasks stay untouched; open tasks that no longer apply are removed.
 */
export async function syncPlantingTasks(plantingId: number, frost?: FrostDates): Promise<void> {
	const drafts = await draftsFor(plantingId, frost ?? (await getFrost()));
	const [p] = await db.select({ bedId: t.plantings.bedId }).from(t.plantings).where(eq(t.plantings.id, plantingId));
	await db.transaction(async (tx) => {
		const existing = await tx
			.select()
			.from(t.tasks)
			.where(and(eq(t.tasks.plantingId, plantingId), like(t.tasks.generatedKey, `p${plantingId}:%`)));
		const byKey = new Map(existing.map((e) => [e.generatedKey!, e]));
		const wanted = new Set(drafts.map((d) => d.key));

		const stale = existing.filter((e) => e.status === 'OPEN' && !wanted.has(e.generatedKey!)).map((e) => e.id);
		if (stale.length) await tx.delete(t.tasks).where(inArray(t.tasks.id, stale));

		const inserts = [];
		for (const d of drafts) {
			const values = {
				type: d.type,
				location: d.location,
				titleDe: d.titleDe,
				dueStart: d.dueStart,
				dueEnd: d.dueEnd,
				bedId: p?.bedId ?? null
			};
			const e = byKey.get(d.key);
			if (!e) inserts.push({ ...values, plantingId, generatedKey: d.key });
			else if (
				e.status === 'OPEN' &&
				(e.dueStart !== d.dueStart || e.dueEnd !== d.dueEnd || e.titleDe !== d.titleDe || e.bedId !== values.bedId)
			) {
				await tx.update(t.tasks).set(values).where(eq(t.tasks.id, e.id));
			}
		}
		if (inserts.length) await tx.insert(t.tasks).values(inserts);
	});
}

/** On server start: plant data or frost dates may have changed. */
export async function syncAllTasks(): Promise<void> {
	const frost = await getFrost();
	const rows = await db.select({ id: t.plantings.id }).from(t.plantings);
	for (const r of rows) await syncPlantingTasks(r.id, frost);
}

const taskColumns = {
	id: t.tasks.id,
	type: t.tasks.type,
	location: t.tasks.location,
	titleDe: t.tasks.titleDe,
	dueStart: t.tasks.dueStart,
	dueEnd: t.tasks.dueEnd,
	status: t.tasks.status,
	doneAt: t.tasks.doneAt,
	notesDe: t.tasks.notesDe,
	generated: t.tasks.generatedKey,
	plantingId: t.tasks.plantingId,
	bedId: t.tasks.bedId,
	bedName: t.beds.name,
	speciesSlug: t.species.slug,
	speciesDe: t.species.nameDe
};

/** Tasks whose window touches [from, to]. */
export async function tasksBetween(from: string, to: string) {
	return db
		.select(taskColumns)
		.from(t.tasks)
		.leftJoin(t.beds, eq(t.tasks.bedId, t.beds.id))
		.leftJoin(t.plantings, eq(t.tasks.plantingId, t.plantings.id))
		.leftJoin(t.species, eq(t.plantings.speciesId, t.species.id))
		.where(and(lte(t.tasks.dueStart, to), gte(t.tasks.dueEnd, from)))
		.orderBy(asc(t.tasks.dueStart), asc(t.tasks.titleDe));
}

/** Open tasks whose window ended in the given period (overdue). */
export async function overdueTasks(from: string, before: string) {
	return db
		.select(taskColumns)
		.from(t.tasks)
		.leftJoin(t.beds, eq(t.tasks.bedId, t.beds.id))
		.leftJoin(t.plantings, eq(t.tasks.plantingId, t.plantings.id))
		.leftJoin(t.species, eq(t.plantings.speciesId, t.species.id))
		.where(and(eq(t.tasks.status, 'OPEN'), gte(t.tasks.dueEnd, from), lt(t.tasks.dueEnd, before)))
		.orderBy(asc(t.tasks.dueEnd));
}

export type TaskRow = Awaited<ReturnType<typeof tasksBetween>>[number];

export async function setTaskStatus(id: number, status: 'OPEN' | 'DONE' | 'SKIPPED', today: string) {
	await db
		.update(t.tasks)
		.set({ status, doneAt: status === 'OPEN' ? null : today })
		.where(eq(t.tasks.id, id));
}

export async function addManualTask(input: {
	titleDe: string;
	dueStart: string;
	dueEnd: string;
	bedId: number | null;
	notesDe: string | null;
}) {
	await db.insert(t.tasks).values({ ...input, type: 'MANUAL', location: 'BED' });
}

/** Only own tasks can be deleted – generated ones are skipped instead. */
export async function deleteManualTask(id: number) {
	await db.delete(t.tasks).where(and(eq(t.tasks.id, id), eq(t.tasks.type, 'MANUAL')));
}
