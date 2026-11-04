// First-run garden setup: only runs while the tables are empty, never overwrites your data.
// Beds as described (04.11.2026); sizes/positions marked "prüfen" are placeholders to adjust in the app.
import type { Db } from './index.ts';
import * as t from './schema.ts';

const CHECK = 'Maße und Position bitte prüfen (Platzhalter).';

export async function seedGardenStarter(db: Db): Promise<void> {
	const seasons = await db.select({ id: t.seasons.id }).from(t.seasons).limit(1);
	if (seasons.length === 0) {
		await db.insert(t.seasons).values([
			{ year: 2026, status: 'HISTORY' },
			{ year: 2027, status: 'PLANNING' }
		]);
	}

	const beds = await db.select({ id: t.beds.id }).from(t.beds).limit(1);
	if (beds.length === 0) {
		await db.insert(t.beds).values([
			{ name: 'Beet 1', xCm: 0, yCm: 150, lengthCm: 400, widthCm: 400, sortOrder: 1, notesDe: 'Position bitte prüfen.' },
			{ name: 'Beet 2', xCm: 500, yCm: 150, lengthCm: 400, widthCm: 400, sortOrder: 2, notesDe: 'Position bitte prüfen.' },
			{
				name: 'Gewächshaus',
				type: 'GREENHOUSE',
				xCm: 1000,
				yCm: 150,
				lengthCm: 300,
				widthCm: 200,
				rotationMode: 'WARN',
				sortOrder: 3,
				notesDe: CHECK
			},
			{
				name: 'Erdbeerbeet (Zaun)',
				xCm: 0,
				yCm: 0,
				lengthCm: 400,
				widthCm: 90,
				rotationMode: 'OFF',
				sortOrder: 4,
				notesDe: `Dauerkultur Erdbeeren, ganzes Beet. ${CHECK}`
			},
			{
				name: 'Himbeeren (Zaun)',
				xCm: 500,
				yCm: 0,
				lengthCm: 300,
				widthCm: 60,
				rotationMode: 'OFF',
				sortOrder: 5,
				notesDe: `Dauerkultur Himbeeren auf 3 m, Rest des Zaunbeets ist Deko. ${CHECK}`
			}
		]);
	}
}
