// Garden data: beds, seasons, plantings (phase 2).
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from './db/index.ts';
import * as t from './db/schema.ts';
import { getFrost } from './plants.ts';
import { checkRow, plantingWindow, type SpaceIssue } from '../rules/space.ts';
import { syncPlantingTasks } from './tasks.ts';

// ── Seasons ──────────────────────────────────────────────────────────────
export async function listSeasons() {
	return db.select().from(t.seasons).orderBy(asc(t.seasons.year));
}

/** Selected season from ?jahr=, else the season being planned, else the latest one. */
export async function pickSeason(yearParam: string | null) {
	const seasons = await listSeasons();
	const wanted = seasons.find((s) => String(s.year) === yearParam);
	return {
		seasons,
		season:
			wanted ??
			seasons.find((s) => s.status === 'PLANNING') ??
			seasons.find((s) => s.status === 'ACTIVE') ??
			seasons.at(-1) ??
			null
	};
}

export async function addNextSeason() {
	const [last] = await db.select().from(t.seasons).orderBy(desc(t.seasons.year)).limit(1);
	const year = (last?.year ?? new Date().getFullYear()) + 1;
	await db.insert(t.seasons).values({ year, status: 'PLANNING' }).onConflictDoNothing();
	return year;
}

// ── Beds ─────────────────────────────────────────────────────────────────
export async function listBeds() {
	return db.select().from(t.beds).where(eq(t.beds.active, true)).orderBy(asc(t.beds.sortOrder), asc(t.beds.id));
}

export async function getBed(id: number) {
	const [bed] = await db.select().from(t.beds).where(eq(t.beds.id, id));
	return bed ?? null;
}

export type BedInput = Omit<typeof t.beds.$inferInsert, 'id'>;

export async function saveBed(id: number | null, input: BedInput) {
	if (id === null) {
		const [row] = await db.insert(t.beds).values(input).returning({ id: t.beds.id });
		return row.id;
	}
	await db.update(t.beds).set(input).where(eq(t.beds.id, id));
	return id;
}

export async function deleteBed(id: number) {
	await db.delete(t.beds).where(eq(t.beds.id, id));
}

// ── Plantings ────────────────────────────────────────────────────────────
const plantingColumns = {
	id: t.plantings.id,
	seasonId: t.plantings.seasonId,
	bedId: t.plantings.bedId,
	speciesId: t.plantings.speciesId,
	routeId: t.plantings.routeId,
	offsetCm: t.plantings.offsetCm,
	widthCm: t.plantings.widthCm,
	quantityMode: t.plantings.quantityMode,
	count: t.plantings.count,
	startDate: t.plantings.startDate,
	endDate: t.plantings.endDate,
	sourcing: t.plantings.sourcing,
	status: t.plantings.status,
	notesDe: t.plantings.notesDe,
	speciesSlug: t.species.slug,
	speciesDe: t.species.nameDe,
	inRowSpacingCm: t.species.inRowSpacingCm,
	rowSpacingCm: t.species.rowSpacingCm,
	familyDe: t.families.nameDe,
	feedingType: t.species.feedingType,
	routeDe: t.cultureRoutes.nameDe,
	seasonYear: t.seasons.year
};

function plantingQuery() {
	return db
		.select(plantingColumns)
		.from(t.plantings)
		.innerJoin(t.species, eq(t.plantings.speciesId, t.species.id))
		.innerJoin(t.families, eq(t.species.familyId, t.families.id))
		.innerJoin(t.seasons, eq(t.plantings.seasonId, t.seasons.id))
		.leftJoin(t.cultureRoutes, eq(t.plantings.routeId, t.cultureRoutes.id));
}

export type PlantingRow = Awaited<ReturnType<typeof plantingQuery>>[number];

/** All plantings that take up space at some point in the given year (incl. perennials from earlier years). */
export async function plantingsInYear(year: number) {
	return plantingQuery()
		.where(and(lte(t.plantings.startDate, `${year}-12-31`), gte(t.plantings.endDate, `${year}-01-01`)))
		.orderBy(asc(t.plantings.bedId), asc(t.plantings.offsetCm), asc(t.plantings.startDate));
}

/** Everything that ever grew in a bed, newest first (bed history). */
export async function plantingsOfBed(bedId: number) {
	return plantingQuery()
		.where(eq(t.plantings.bedId, bedId))
		.orderBy(desc(t.plantings.startDate), asc(t.plantings.offsetCm));
}

export async function getPlanting(id: number) {
	const [p] = await plantingQuery().where(eq(t.plantings.id, id));
	return p ?? null;
}

/** Species with their routes for the row form (incl. steps so the browser can propose dates). */
export async function speciesOptions() {
	const sp = await db
		.select({
			id: t.species.id,
			slug: t.species.slug,
			nameDe: t.species.nameDe,
			rowSpacingCm: t.species.rowSpacingCm,
			inRowSpacingCm: t.species.inRowSpacingCm,
			lifespanYears: t.species.lifespanYears,
			defaultSourcing: t.species.defaultSourcing,
			greenhouse: t.species.greenhouse,
			outdoor: t.species.outdoor
		})
		.from(t.species)
		.orderBy(asc(t.species.isGreenManure), asc(t.species.nameDe));
	const routes = await db.select().from(t.cultureRoutes).orderBy(asc(t.cultureRoutes.sortOrder));
	const steps = await db.select().from(t.cultureSteps).orderBy(asc(t.cultureSteps.sortOrder));
	return sp.map((s) => ({
		...s,
		routes: routes
			.filter((r) => r.speciesId === s.id)
			.map((r) => ({
				id: r.id,
				nameDe: r.nameDe,
				isDefault: r.isDefault,
				steps: steps.filter((st) => st.routeId === r.id)
			}))
	}));
}

export type SpeciesOption = Awaited<ReturnType<typeof speciesOptions>>[number];

export interface PlantingInput {
	seasonId: number;
	bedId: number;
	speciesId: number;
	routeId: number | null;
	offsetCm: number;
	widthCm: number;
	quantityMode: 'FULL_ROW' | 'COUNT';
	count: number | null;
	startDate: string | null;
	endDate: string | null;
	sourcing: 'SEED' | 'SEEDLING' | 'SETS' | 'EXISTING';
	status: 'PLANNED' | 'ACTIVE' | 'DONE';
	notesDe: string | null;
}

/**
 * Validates and saves a planting. Missing dates are taken from the culture route.
 * Returns the issues instead of saving if the row does not fit.
 */
export async function savePlanting(
	id: number | null,
	input: PlantingInput
): Promise<{ ok: true; id: number } | { ok: false; issues: SpaceIssue[] }> {
	const bed = await getBed(input.bedId);
	const [season] = await db.select().from(t.seasons).where(eq(t.seasons.id, input.seasonId));
	const [sp] = await db.select().from(t.species).where(eq(t.species.id, input.speciesId));
	if (!bed || !season || !sp) {
		return { ok: false, issues: [{ kind: 'INVALID', messageDe: 'Beet, Saison oder Pflanze nicht gefunden.' }] };
	}

	let { startDate, endDate } = input;
	if (!startDate || !endDate) {
		const steps = input.routeId
			? await db.select().from(t.cultureSteps).where(eq(t.cultureSteps.routeId, input.routeId)).orderBy(asc(t.cultureSteps.sortOrder))
			: [];
		if (steps.length) {
			const w = plantingWindow(steps, await getFrost(), season.year, sp.lifespanYears);
			startDate ||= w.startDate;
			endDate ||= w.endDate;
		}
	}
	if (!startDate || !endDate) {
		return { ok: false, issues: [{ kind: 'INVALID', messageDe: 'Bitte Beginn und Ende angeben.' }] };
	}

	const others = (await plantingsOfBed(bed.id)).map((p) => ({ ...p, label: `${p.speciesDe} (${p.offsetCm}–${p.offsetCm + p.widthCm} cm)` }));
	const issues = checkRow(bed, { ...input, id: id ?? undefined, startDate, endDate }, others, {
		inRowSpacingCm: sp.inRowSpacingCm,
		rowSpacingCm: sp.rowSpacingCm
	});
	if (issues.length) return { ok: false, issues };

	const values = { ...input, startDate, endDate, count: input.quantityMode === 'COUNT' ? input.count : null };
	if (id === null) {
		const [row] = await db.insert(t.plantings).values(values).returning({ id: t.plantings.id });
		await syncPlantingTasks(row.id);
		return { ok: true, id: row.id };
	}
	await db.update(t.plantings).set(values).where(eq(t.plantings.id, id));
	await syncPlantingTasks(id);
	return { ok: true, id };
}

export async function deletePlanting(id: number) {
	await db.delete(t.plantings).where(eq(t.plantings.id, id));
}
