import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';

// The connection is opened on the first query, so importing this module is safe at build time.
// DATABASE_URL is checked on server start (src/hooks.server.ts).
const options = { max: 5, onnotice: () => {} };
const url = process.env.DATABASE_URL;

export const client = url ? postgres(url, options) : postgres(options);
export const db = drizzle(client, { schema });
export type Db = typeof db;
