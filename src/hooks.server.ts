import type { ServerInit } from '@sveltejs/kit/hooks';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '#lib/server/db/index.ts';
import { seedPlants } from '#lib/server/db/seed.ts';
import { seedGardenStarter } from '#lib/server/db/starter.ts';

// Runs once when the server starts: apply DB migrations, then (re)write the plant reference data
// and create the starter beds/seasons on the very first run.
export const init: ServerInit = async () => {
	if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (see .env.example)');
	await migrate(db, { migrationsFolder: 'drizzle' });
	await seedPlants(db);
	await seedGardenStarter(db);
};
