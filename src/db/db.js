import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);
