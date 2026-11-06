// Garden data: beds, seasons, plantings (phase 2).
import { and, asc, desc, eq, gt, gte, inArray, lte } from 'drizzle-orm';
import { db } from './db/index.ts';
import * as t from './db/schema.ts';
import { getFrost } from './plants.ts';
import { checkRow, plantingWindow } from '../rules/space.ts';
import { planSuccession } from '../rules/succession.ts';
import type { CropRow } from '../rules/rotation.ts';
import { assessPlanting, cropRowsOfBed } from './planning.ts';
import { syncBedTasks } from './tasks.ts';

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
	successionSeriesId: t.plantings.successionSeriesId,
	speciesSlug: t.species.slug,
	speciesDe: t.species.nameDe,
	inRowSpacingCm: t.species.inRowSpacingCm,
	rowSpacingCm: t.species.rowSpacingCm,
	familyId: t.species.familyId,
	familyDe: t.families.nameDe,
	rotationPauseYears: t.families.rotationPauseYears,
	feedingType: t.species.feedingType,
	isGreenManure: t.species.isGreenManure,
	routeDe: t.cultureRoutes.nameDe,
	seasonYear: t.seasons.year,
	seasonStatus: t.seasons.status
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
			outdoor: t.species.outdoor,
			familyId: t.species.familyId,
			familyDe: t.families.nameDe,
			rotationPauseYears: t.families.rotationPauseYears,
			feedingType: t.species.feedingType,
			isGreenManure: t.species.isGreenManure
		})
		.from(t.species)
		.innerJoin(t.families, eq(t.species.familyId, t.families.id))
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

export interface Problem {
	messageDe: string;
}
type SaveResult = { ok: true; id: number } | { ok: false; issues: Problem[] };

async function context(input: PlantingInput) {
	const bed = await getBed(input.bedId);
	const [season] = await db.select().from(t.seasons).where(eq(t.seasons.id, input.seasonId));
	const [sp] = await db
		.select({ species: t.species, family: t.families })
		.from(t.species)
		.innerJoin(t.families, eq(t.species.familyId, t.families.id))
		.where(eq(t.species.id, input.speciesId));
	return bed && season && sp ? { bed, season, sp } : null;
}
type Ctx = NonNullable<Awaited<ReturnType<typeof context>>>;

/** Missing dates are taken from the culture route. */
async function withDates(input: PlantingInput, ctx: Ctx) {
	let { startDate, endDate } = input;
	if (!startDate || !endDate) {
		const steps = input.routeId
			? await db.select().from(t.cultureSteps).where(eq(t.cultureSteps.routeId, input.routeId)).orderBy(asc(t.cultureSteps.sortOrder))
			: [];
		if (steps.length) {
			const w = plantingWindow(steps, await getFrost(), ctx.season.year, ctx.sp.species.lifespanYears);
			startDate ||= w.startDate;
			endDate ||= w.endDate;
		}
	}
	return startDate && endDate ? { startDate, endDate } : null;
}

const asCropRow = (input: PlantingInput, ctx: Ctx, id: number | null, startDate: string, endDate: string): CropRow => ({
	...input,
	id: id ?? undefined,
	startDate,
	endDate,
	speciesDe: ctx.sp.species.nameDe,
	familyId: ctx.sp.family.id,
	familyDe: ctx.sp.family.nameDe,
	rotationPauseYears: ctx.sp.family.rotationPauseYears,
	feedingType: ctx.sp.species.feedingType,
	isGreenManure: ctx.sp.species.isGreenManure
});

/** Space (spec §4.1) and rotation (§4.2, STRICT beds) – everything that stops a row from being saved. */
async function blockers(row: CropRow, ctx: Ctx, others: CropRow[]): Promise<Problem[]> {
	const space = checkRow(ctx.bed, row, others, {
		inRowSpacingCm: ctx.sp.species.inRowSpacingCm,
		rowSpacingCm: ctx.sp.species.rowSpacingCm
	});
	const { issues } = await assessPlanting(ctx.bed, row, ctx.season.status === 'HISTORY', others);
	return [...space, ...issues.filter((i) => i.level === 'block')];
}

const valuesOf = (input: PlantingInput, startDate: string, endDate: string) => ({
	...input,
	startDate,
	endDate,
	count: input.quantityMode === 'COUNT' ? input.count : null
});

/**
 * Validates and saves a planting. Returns the problems instead of saving if the row does not fit
 * or breaks the rotation in a STRICT bed.
 */
export async function savePlanting(id: number | null, input: PlantingInput): Promise<SaveResult> {
	const ctx = await context(input);
	if (!ctx) return { ok: false, issues: [{ messageDe: 'Beet, Saison oder Pflanze nicht gefunden.' }] };
	const dates = await withDates(input, ctx);
	if (!dates) return { ok: false, issues: [{ messageDe: 'Bitte Beginn und Ende angeben.' }] };

	const others = await cropRowsOfBed(ctx.bed.id);
	const issues = await blockers(asCropRow(input, ctx, id, dates.startDate, dates.endDate), ctx, others);
	if (issues.length) return { ok: false, issues };

	const values = valuesOf(input, dates.startDate, dates.endDate);
	if (id === null) {
		const [row] = await db.insert(t.plantings).values(values).returning({ id: t.plantings.id });
		id = row.id;
	} else {
		await db.update(t.plantings).set(values).where(eq(t.plantings.id, id));
	}
	await syncBedTasks(ctx.bed.id);
	return { ok: true, id };
}

/**
 * Succession growing (spec §4.6): `count` sets every `intervalDays`. All sets are checked first;
 * nothing is saved if one of them does not fit.
 */
export async function saveSuccession(input: PlantingInput, count: number, intervalDays: number): Promise<SaveResult> {
	const ctx = await context(input);
	if (!ctx) return { ok: false, issues: [{ messageDe: 'Beet, Saison oder Pflanze nicht gefunden.' }] };
	const dates = await withDates(input, ctx);
	if (!dates) return { ok: false, issues: [{ messageDe: 'Bitte Beginn und Ende angeben.' }] };

	const others = await cropRowsOfBed(ctx.bed.id);
	const sets = planSuccession(ctx.bed, { ...input, ...dates }, count, intervalDays, others);
	const problems: Problem[] = [];
	const placed: CropRow[] = [];
	for (const s of sets) {
		if (s.offsetCm === null) {
			problems.push({ messageDe: `Satz ${s.index + 1} (ab ${s.startDate.split('-').reverse().join('.')}): kein Platz im Beet.` });
			continue;
		}
		const row = asCropRow({ ...input, offsetCm: s.offsetCm }, ctx, null, s.startDate, s.endDate);
		const issues = await blockers(row, ctx, [...others, ...placed]);
		problems.push(...issues.map((i) => ({ messageDe: `Satz ${s.index + 1}: ${i.messageDe}` })));
		placed.push(row);
	}
	if (problems.length) return { ok: false, issues: problems };

	const firstId = await db.transaction(async (tx) => {
		const [series] = await tx
			.insert(t.successionSeries)
			.values({ bedId: ctx.bed.id, speciesId: input.speciesId, intervalDays, count })
			.returning({ id: t.successionSeries.id });
		const rows = await tx
			.insert(t.plantings)
			.values(
				sets.map((s) => ({
					...valuesOf({ ...input, offsetCm: s.offsetCm! }, s.startDate, s.endDate),
					successionSeriesId: series.id
				}))
			)
			.returning({ id: t.plantings.id });
		return rows[0].id;
	});
	await syncBedTasks(ctx.bed.id);
	return { ok: true, id: firstId };
}

/** Later sets of the same series (start after the given one). */
async function followingSets(p: { id: number; successionSeriesId: number | null; startDate: string }) {
	if (!p.successionSeriesId) return [];
	return db
		.select()
		.from(t.plantings)
		.where(and(eq(t.plantings.successionSeriesId, p.successionSeriesId), gt(t.plantings.startDate, p.startDate)))
		.orderBy(asc(t.plantings.startDate));
}

const shift = (iso: string, d: number) => new Date(Date.parse(iso) + d * 86_400_000).toISOString().slice(0, 10);

/**
 * "alle folgenden" (spec §4.6): changes this set and moves all later sets of the series by the same
 * number of days; crop, route, width, quantity, sourcing and note are taken over, each set keeps its row.
 */
export async function savePlantingAndFollowing(id: number, input: PlantingInput): Promise<SaveResult> {
	const [old] = await db.select().from(t.plantings).where(eq(t.plantings.id, id));
	const ctx = await context(input);
	if (!old || !ctx) return { ok: false, issues: [{ messageDe: 'Reihe nicht gefunden.' }] };
	const dates = await withDates(input, ctx);
	if (!dates) return { ok: false, issues: [{ messageDe: 'Bitte Beginn und Ende angeben.' }] };
	const following = await followingSets(old);
	const delta = Math.round((Date.parse(dates.startDate) - Date.parse(old.startDate)) / 86_400_000);
	const changed = [
		{ id, values: valuesOf(input, dates.startDate, dates.endDate) },
		...following.map((f) => ({
			id: f.id,
			values: valuesOf(
				{ ...input, offsetCm: f.offsetCm, status: f.status, seasonId: f.seasonId },
				shift(f.startDate, delta),
				shift(f.endDate, delta)
			)
		}))
	];

	const ids = new Set(changed.map((c) => c.id));
	const others = (await cropRowsOfBed(ctx.bed.id)).filter((r) => !ids.has(r.id));
	const problems: Problem[] = [];
	const placed: CropRow[] = [];
	for (const [n, c] of changed.entries()) {
		const row = asCropRow(c.values, ctx, c.id, c.values.startDate, c.values.endDate);
		const issues = await blockers(row, ctx, [...others, ...placed]);
		problems.push(...issues.map((i) => ({ messageDe: n === 0 ? i.messageDe : `Folgender Satz ab ${row.startDate.split('-').reverse().join('.')}: ${i.messageDe}` })));
		placed.push(row);
	}
	if (problems.length) return { ok: false, issues: problems };

	await db.transaction(async (tx) => {
		for (const c of changed) await tx.update(t.plantings).set(c.values).where(eq(t.plantings.id, c.id));
	});
	await syncBedTasks(ctx.bed.id);
	return { ok: true, id };
}

/** Deletes a planting; with `following` also all later sets of its succession series. */
export async function deletePlanting(id: number, following = false) {
	const [p] = await db.select().from(t.plantings).where(eq(t.plantings.id, id));
	if (!p) return;
	const ids = [id, ...(following ? (await followingSets(p)).map((f) => f.id) : [])];
	await db.delete(t.plantings).where(inArray(t.plantings.id, ids));
	await syncBedTasks(p.bedId);
}

/** Number of sets in the series after this one (for the "nur diesen / alle folgenden" choice). */
export async function followingCount(p: { id: number; successionSeriesId: number | null; startDate: string }) {
	return (await followingSets(p)).length;
}
