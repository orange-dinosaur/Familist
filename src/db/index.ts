/**
 * Postgres connection. Server-side only - never import this from a screen.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, types } from 'pg';

/**
 * `day` columns are calendar days, not instants. Left alone, node-postgres
 * parses them into a JS Date at local midnight, which shifts the day once it
 * is serialised in another timezone. Hand them back as the YYYY-MM-DD strings
 * the app already uses.
 */
types.setTypeParser(types.builtins.DATE, (value) => value);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });

export const db = drizzle({ client: pool });
