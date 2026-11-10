// Season timeline data (docs/Redesign.md, D3): lanes per bed built from the plantings and
// their growing steps. Computed from the steps, not from stored tasks, so history seasons work too.
import { asc, inArray } from 'drizzle-orm';
import { db } from './db/index.ts';
import * as t from './db/schema.ts';
import { listBeds, plantingsInYear } from './garden.ts';
import { getFrost } from './plants.ts';
import { cropRowsOfBed, greenManureOptions } from './planning.ts';
import { generateTasks, type TaskStep } from '../rules/tasks.ts';
import { placeOnYear, seasonLanes, type TimelineBed, type TimelineStep } from '../rules/season-timeline.ts';

export type { TimelineBed };
import { greenManureSuggestions } from '../rules/succession.ts';


export async function seasonTimeline(season: { year: number; status: string }): Promise<TimelineBed[]> {
	const year = season.year;
	const [beds, plantings, frost] = await Promise.all([listBeds(), plantingsInYear(year), getFrost()]);

	const routeIds = [...new Set(plantings.map((p) => p.routeId).filter((id): id is number => id !== null))];
	const steps = routeIds.length
		? await db.select().from(t.cultureSteps).where(inArray(t.cultureSteps.routeId, routeIds)).orderBy(asc(t.cultureSteps.sortOrder))
		: [];
	const stepsByRoute = Map.groupBy(steps, (s) => s.routeId);

	const drafts = new Map<number, TimelineStep[]>();
	for (const p of plantings) {
		const route: TaskStep[] = p.routeId ? (stepsByRoute.get(p.routeId) ?? []) : [];
		try {
			drafts.set(
				p.id,
				generateTasks(
					{ id: p.id, startDate: p.startDate, endDate: p.endDate, speciesDe: p.speciesDe, feedingType: p.feedingType },
					route,
					frost
				)
			);
		} catch {
			drafts.set(p.id, []); // a broken route must not take the whole page down
		}
	}

	const lanes = seasonLanes(year, plantings, (id) => drafts.get(id) ?? [], beds.map((b) => b.id));
	const byBed = Map.groupBy(lanes, (l) => l.bedId);

	const planned = season.status !== 'HISTORY';
	const options = planned ? await greenManureOptions() : [];
	return Promise.all(
		beds.map(async (b) => {
			let suggestions: TimelineBed['suggestions'] = [];
			if (planned && b.type !== 'GREENHOUSE' && options.length) {
				const rows = await cropRowsOfBed(b.id);
				const seen = new Set<string>();
				for (const s of greenManureSuggestions(b, year, rows, options, frost)) {
					// one bar per free gap – the first fitting green manure stands for the others
					const key = `${s.afterId}`;
					if (seen.has(key)) continue;
					seen.add(key);
					const pos = placeOnYear(s.startDate, s.endDate, year);
					if (pos)
						suggestions.push({
							kind: 'suggestion',
							...pos,
							plantingId: s.afterId,
							label: `Gründüngung möglich: ${s.speciesDe}`,
							offsetCm: s.offsetCm,
							widthCm: s.widthCm,
							afterDe: s.afterDe
						});
				}
			}
			return { id: b.id, name: b.name, type: b.type, lanes: byBed.get(b.id) ?? [], suggestions };
		})
	);
}
