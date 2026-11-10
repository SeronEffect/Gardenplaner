import type { ServerInit } from '@sveltejs/kit/hooks';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { client, db } from '#lib/server/db/index.ts';
import { closeOnShutdown } from '#lib/server/db/shutdown.ts';
import { seedPlants } from '#lib/server/db/seed.ts';
import { seedGardenStarter } from '#lib/server/db/starter.ts';
import { syncAllTasks } from '#lib/server/tasks.ts';

// Runs once when the server starts: apply DB migrations, then (re)write the plant reference data
// create the starter beds/seasons on the very first run and bring generated tasks up to date.
export const init: ServerInit = async () => {
	if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (see .env.example)');
	closeOnShutdown(process, client);
	await migrate(db, { migrationsFolder: 'drizzle' });
	await seedPlants(db);
	await seedGardenStarter(db);
	await syncAllTasks();
};
