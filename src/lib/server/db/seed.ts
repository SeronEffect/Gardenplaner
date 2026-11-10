// Writes the plant reference data (src/lib/data/plants.ts) into the database.
// Idempotent: runs on every server start. Pictures already fetched are kept.
import { and, eq, inArray, notInArray } from 'drizzle-orm';
import { COMPANIONS, FAMILIES, SPECIES } from '../../data/plants.ts';
import type { Db } from './index.ts';
import * as t from './schema.ts';

export async function seedPlants(db: Db): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.insert(t.settings).values({ id: 1 }).onConflictDoNothing();

		const familyIds = new Map<string, number>();
		for (const f of FAMILIES) {
			const values = {
				nameDe: f.nameDe,
				nameLat: f.nameLat,
				rotationPauseYears: f.rotationPauseYears,
				sourceRef: f.sourceRef ?? null
			};
			const [row] = await tx
				.insert(t.families)
				.values({ slug: f.slug, ...values })
				.onConflictDoUpdate({ target: t.families.slug, set: values })
				.returning({ id: t.families.id });
			familyIds.set(f.slug, row.id);
		}

		const speciesIds = new Map<string, number>();
		for (const s of SPECIES) {
			const values = {
				nameDe: s.nameDe,
				nameLat: s.nameLat,
				familyId: familyIds.get(s.family)!,
				feedingType: s.feedingType,
				lifecycle: s.lifecycle,
				lifespanYears: s.lifespanYears ?? null,
				rowSpacingCm: s.rowSpacingCm ?? null,
				inRowSpacingCm: s.inRowSpacingCm ?? null,
				toxicityLevel: s.toxicityLevel ?? 'NONE',
				toxicityDe: s.toxicityDe ?? null,
				careDe: s.careDe ?? null,
				storageDe: s.storageDe ?? null,
				defaultSourcing: s.defaultSourcing ?? 'SEED',
				outdoor: s.outdoor ?? true,
				greenhouse: s.greenhouse ?? false,
				isGreenManure: s.isGreenManure ?? false,
				heightMinCm: s.heightMinCm ?? null,
				heightMaxCm: s.heightMaxCm ?? null,
				setWeightG: s.setWeightG ?? null,
				germTempMinC: s.germTempMinC ?? null,
				germTempMaxC: s.germTempMaxC ?? null,
				minSoilTempSowC: s.minSoilTempSowC ?? null,
				sourceRef: s.sourceRef
			} satisfies Partial<typeof t.species.$inferInsert>;
			const [row] = await tx
				.insert(t.species)
				.values({ slug: s.slug, ...values })
				.onConflictDoUpdate({ target: t.species.slug, set: values })
				.returning({ id: t.species.id });
			speciesIds.set(s.slug, row.id);

			// Routes: upsert by slug, steps are replaced completely
			const keep: string[] = [];
			for (const [i, r] of s.routes.entries()) {
				keep.push(r.slug);
				const routeValues = { nameDe: r.nameDe, isDefault: r.isDefault ?? false, sortOrder: i };
				const [route] = await tx
					.insert(t.cultureRoutes)
					.values({ speciesId: row.id, slug: r.slug, ...routeValues })
					.onConflictDoUpdate({
						target: [t.cultureRoutes.speciesId, t.cultureRoutes.slug],
						set: routeValues
					})
					.returning({ id: t.cultureRoutes.id });
				await tx.delete(t.cultureSteps).where(eq(t.cultureSteps.routeId, route.id));
				await tx.insert(t.cultureSteps).values(
					r.steps.map((st, j) => ({
						routeId: route.id,
						sortOrder: j,
						type: st.type,
						location: st.location,
						anchor: st.anchor,
						fixedMmdd: st.fixedMmdd ?? null,
						offsetStartDays: st.offsetStartDays,
						offsetEndDays: st.offsetEndDays,
						repeatEveryDays: st.repeatEveryDays ?? null,
						labelDe: st.labelDe,
						isPlantingStart: st.isPlantingStart ?? false,
						isPlantingEnd: st.isPlantingEnd ?? false,
						sourceRef: st.sourceRef
					}))
				);
			}
			// Remove routes that were dropped from the data
			await tx
				.delete(t.cultureRoutes)
				.where(and(eq(t.cultureRoutes.speciesId, row.id), notInArray(t.cultureRoutes.slug, keep)));
		}

		// Neighbours: replace all pairs between reference species
		const ids = [...speciesIds.values()];
		await tx.delete(t.companions).where(inArray(t.companions.speciesAId, ids));
		await tx.insert(t.companions).values(
			COMPANIONS.map((c) => {
				const [a, b] = [speciesIds.get(c.a)!, speciesIds.get(c.b)!].sort((x, y) => x - y);
				return { speciesAId: a, speciesBId: b, relation: c.relation, sourceRef: c.sourceRef };
			})
		);
	});
}
