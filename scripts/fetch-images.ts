// Fills in plant pictures from Wikimedia Commons (author + licence are stored for the credit line).
// Usage: pnpm images:fetch [--force]   (needs DATABASE_URL, e.g. via .env)
import { eq } from 'drizzle-orm';
import { SPECIES } from '../src/lib/data/plants.ts';
import { client, db } from '../src/lib/server/db/index.ts';
import { species } from '../src/lib/server/db/schema.ts';
import { findPlantImage } from './wikimedia.ts';

const force = process.argv.includes('--force');

async function main() {
	const rows = await db.select({ slug: species.slug, imageUrl: species.imageUrl }).from(species);
	for (const row of rows) {
		if (row.imageUrl && !force) continue;
		const data = SPECIES.find((s) => s.slug === row.slug);
		if (!data) continue;
		try {
			const img = await findPlantImage(data.wikiTitle);
			if (!img) {
				console.log(`– ${row.slug}: kein Bild gefunden`);
				continue;
			}
			await db
				.update(species)
				.set({
					imageUrl: img.url,
					imageCredit: img.credit,
					imageLicense: img.license,
					imagePageUrl: img.pageUrl
				})
				.where(eq(species.slug, row.slug));
			console.log(`✓ ${row.slug}: ${img.license}, ${img.credit}`);
		} catch (e) {
			console.error(`✗ ${row.slug}: ${(e as Error).message}`);
		}
		await new Promise((r) => setTimeout(r, 300)); // be polite to the API
	}
}

main().finally(() => client.end());
