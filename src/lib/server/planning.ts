// Planning data for the rotation, neighbour and green manure rules (phase 4).
// Kept separate from garden.ts so tasks.ts can use it without a circular import.
import { asc, eq } from 'drizzle-orm';
import { db } from './db/index.ts';
import * as t from './db/schema.ts';
import { assessRow, companionMap, type Assessment, type CropRow, type RotationMode } from '../rules/rotation.ts';
import type { GreenManureOption } from '../rules/succession.ts';

/** Every planting of a bed (all seasons) with what the rules need. */
export async function cropRowsOfBed(bedId: number) {
	const rows = await db
		.select({
			id: t.plantings.id,
			offsetCm: t.plantings.offsetCm,
			widthCm: t.plantings.widthCm,
			quantityMode: t.plantings.quantityMode,
			count: t.plantings.count,
			startDate: t.plantings.startDate,
			endDate: t.plantings.endDate,
			speciesId: t.plantings.speciesId,
			speciesDe: t.species.nameDe,
			familyId: t.species.familyId,
			familyDe: t.families.nameDe,
			rotationPauseYears: t.families.rotationPauseYears,
			feedingType: t.species.feedingType,
			isGreenManure: t.species.isGreenManure,
			seasonStatus: t.seasons.status
		})
		.from(t.plantings)
		.innerJoin(t.species, eq(t.plantings.speciesId, t.species.id))
		.innerJoin(t.families, eq(t.species.familyId, t.families.id))
		.innerJoin(t.seasons, eq(t.plantings.seasonId, t.seasons.id))
		.where(eq(t.plantings.bedId, bedId))
		.orderBy(asc(t.plantings.startDate));
	return rows.map((r) => ({ ...r, label: `${r.speciesDe} (${r.offsetCm}–${r.offsetCm + r.widthCm} cm)` }));
}

export async function companionList() {
	return db
		.select({ speciesAId: t.companions.speciesAId, speciesBId: t.companions.speciesBId, relation: t.companions.relation })
		.from(t.companions);
}

/** Rotation, feeding order and neighbours for one row. Rows in history seasons are never blocked. */
export async function assessPlanting(
	bed: { id: number; rotationMode: RotationMode },
	row: CropRow,
	historySeason: boolean,
	rows?: CropRow[]
): Promise<Assessment> {
	const [others, companions] = await Promise.all([rows ?? cropRowsOfBed(bed.id), companionList()]);
	const a = assessRow(row, others, bed.rotationMode, companionMap(companions));
	if (historySeason) a.issues = a.issues.map((i) => (i.level === 'block' ? { ...i, level: 'warn' } : i));
	return a;
}

/** Green manure species with their routes and steps. */
export async function greenManureOptions(): Promise<GreenManureOption[]> {
	const sp = await db
		.select({
			speciesId: t.species.id,
			speciesDe: t.species.nameDe,
			familyId: t.species.familyId,
			familyDe: t.families.nameDe,
			rotationPauseYears: t.families.rotationPauseYears
		})
		.from(t.species)
		.innerJoin(t.families, eq(t.species.familyId, t.families.id))
		.where(eq(t.species.isGreenManure, true))
		// Shorter rotation pause first: Phacelia (fits any rotation) before Gelbsenf (Kreuzblütler)
		.orderBy(asc(t.families.rotationPauseYears), asc(t.species.nameDe));
	const routes = await db.select().from(t.cultureRoutes).orderBy(asc(t.cultureRoutes.sortOrder));
	const steps = await db.select().from(t.cultureSteps).orderBy(asc(t.cultureSteps.sortOrder));
	return sp.map((s) => ({
		...s,
		routes: routes
			.filter((r) => r.speciesId === s.speciesId)
			.map((r) => ({ id: r.id, nameDe: r.nameDe, steps: steps.filter((st) => st.routeId === r.id) }))
	}));
}
