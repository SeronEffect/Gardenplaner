// Read access to the plant reference data for the UI.
import { asc, eq, or } from 'drizzle-orm';
import { db } from './db/index.ts';
import * as t from './db/schema.ts';
import { DEFAULT_FROST, type FrostDates } from '../rules/timeline.ts';

export async function getFrost(): Promise<FrostDates> {
	const [s] = await db.select().from(t.settings).where(eq(t.settings.id, 1));
	return s ? { lastFrost: s.lastFrost, firstFrost: s.firstFrost } : DEFAULT_FROST;
}

export async function listSpecies() {
	return db
		.select({
			slug: t.species.slug,
			nameDe: t.species.nameDe,
			nameLat: t.species.nameLat,
			feedingType: t.species.feedingType,
			lifecycle: t.species.lifecycle,
			isGreenManure: t.species.isGreenManure,
			toxicityLevel: t.species.toxicityLevel,
			imageUrl: t.species.imageUrl,
			familySlug: t.families.slug,
			familyDe: t.families.nameDe
		})
		.from(t.species)
		.innerJoin(t.families, eq(t.species.familyId, t.families.id))
		.orderBy(asc(t.species.isGreenManure), asc(t.species.nameDe));
}

export type SpeciesListItem = Awaited<ReturnType<typeof listSpecies>>[number];

export async function getSpecies(slug: string) {
	const sp = await db.query.species.findFirst({ where: eq(t.species.slug, slug) });
	if (!sp) return null;

	const [family] = await db.select().from(t.families).where(eq(t.families.id, sp.familyId));

	const routes = await db
		.select()
		.from(t.cultureRoutes)
		.where(eq(t.cultureRoutes.speciesId, sp.id))
		.orderBy(asc(t.cultureRoutes.sortOrder));
	const steps = routes.length
		? await db
				.select()
				.from(t.cultureSteps)
				.innerJoin(t.cultureRoutes, eq(t.cultureSteps.routeId, t.cultureRoutes.id))
				.where(eq(t.cultureRoutes.speciesId, sp.id))
				.orderBy(asc(t.cultureSteps.sortOrder))
		: [];

	const pairs = await db
		.select()
		.from(t.companions)
		.where(or(eq(t.companions.speciesAId, sp.id), eq(t.companions.speciesBId, sp.id)));
	const others = await db
		.select({ id: t.species.id, slug: t.species.slug, nameDe: t.species.nameDe })
		.from(t.species);
	const byId = new Map(others.map((o) => [o.id, o]));
	const neighbours = pairs
		.map((p) => {
			const other = byId.get(p.speciesAId === sp.id ? p.speciesBId : p.speciesAId)!;
			return { slug: other.slug, nameDe: other.nameDe, relation: p.relation, sourceRef: p.sourceRef };
		})
		.sort((a, b) => a.nameDe.localeCompare(b.nameDe, 'de'));

	return {
		species: sp,
		family,
		routes: routes.map((r) => ({
			...r,
			steps: steps.filter((s) => s.culture_routes.id === r.id).map((s) => s.culture_steps)
		})),
		neighbours
	};
}

export type SpeciesDetail = NonNullable<Awaited<ReturnType<typeof getSpecies>>>;
