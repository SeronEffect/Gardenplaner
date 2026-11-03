import { describe, expect, it } from 'vitest';
import { COMPANIONS, FAMILIES, SPECIES } from './plants.ts';
import { SOURCES } from './sources.ts';
import { DEFAULT_FROST, resolveSteps, yearStrip } from '../rules/timeline.ts';

const keys = (ref: string) => ref.split(/[,;]\s*/).map((k) => k.trim());
const knownSource = (k: string) => k in SOURCES;

describe('plant data', () => {
	it('has unique slugs and known families', () => {
		const slugs = SPECIES.map((s) => s.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		const families = new Set(FAMILIES.map((f) => f.slug));
		for (const s of SPECIES) expect(families.has(s.family), s.slug).toBe(true);
	});

	it('only references known sources', () => {
		const refs = [
			...SPECIES.map((s) => s.sourceRef),
			...SPECIES.flatMap((s) => s.routes.flatMap((r) => r.steps.map((st) => st.sourceRef))),
			...COMPANIONS.map((c) => c.sourceRef),
			...FAMILIES.flatMap((f) => (f.sourceRef ? [f.sourceRef] : []))
		];
		for (const ref of refs) for (const k of keys(ref)) expect(knownSource(k), `${ref} → ${k}`).toBe(true);
	});

	it.each(SPECIES.map((s) => [s.slug, s] as const))('%s: routes are valid', (_slug, s) => {
		expect(s.routes.filter((r) => r.isDefault)).toHaveLength(1);
		expect(new Set(s.routes.map((r) => r.slug)).size).toBe(s.routes.length);
		for (const r of s.routes) {
			expect(r.steps.filter((st) => st.isPlantingStart), r.slug).toHaveLength(1);
			expect(() => resolveSteps(r.steps, DEFAULT_FROST, 2027)).not.toThrow();
		}
		const strip = yearStrip(s.routes.map((r) => r.steps));
		expect(Object.values(strip).some((cells) => cells.some(Boolean))).toBe(true);
	});

	it('has consistent neighbour pairs', () => {
		const slugs = new Set(SPECIES.map((s) => s.slug));
		const seen = new Map<string, string>();
		for (const c of COMPANIONS) {
			expect(slugs.has(c.a), c.a).toBe(true);
			expect(slugs.has(c.b), c.b).toBe(true);
			expect(c.a).not.toBe(c.b);
			const key = [c.a, c.b].sort().join('|');
			expect(seen.has(key), `duplicate pair ${key}`).toBe(false);
			seen.set(key, c.relation);
		}
	});

	it('matches the sourced BZfE dates for tomatoes (spot check)', () => {
		const tomato = SPECIES.find((s) => s.slug === 'tomate')!;
		const [presow, , , plantOut] = resolveSteps(tomato.routes[0].steps, DEFAULT_FROST, 2027);
		expect(presow.start.toISOString().slice(5, 10)).toBe('03-15');
		expect(presow.end.toISOString().slice(5, 10)).toBe('04-15');
		expect(plantOut.start.toISOString().slice(5, 10)).toBe('05-15');
	});
});
