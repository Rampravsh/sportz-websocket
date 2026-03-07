import { eq } from 'drizzle-orm';
import { db, pool } from './db/db.js';
import { matches } from './db/schema.js';

async function main() {
    try {
        console.log('Performing CRUD operations...\n');

        // CREATE: Insert a new user
        const [newMatch] = await db
            .insert(matches)
            .values({ sport: 'Football', homeTeam: 'Team A', awayTeam: 'Team B', status: 'scheduled', startTime: new Date() })
            .returning();

        if (!newMatch) {
            throw new Error('Failed to create match');
        }

        console.log('✅ CREATE: New match created:', newMatch);

        // READ: Select the match
        const foundMatch = await db.select().from(matches).where(eq(matches.id, newMatch.id));
        console.log('✅ READ: Found match:', foundMatch[0]);

        // UPDATE: Change the match's name
        const [updatedMatch] = await db
            .update(matches)
            .set({ homeScore: 1, awayScore: 2 })
            .where(eq(matches.id, newMatch.id))
            .returning();

        if (!updatedMatch) {
            throw new Error('Failed to update match');
        }

        console.log('✅ UPDATE: Match updated:', updatedMatch);

        // DELETE: Remove the match
        // await db.delete(matches).where(eq(matches.id, newMatch.id));
        // console.log('✅ DELETE: Match deleted.');

        console.log('\n🎉 CRUD operations completed successfully!');
    } catch (error) {
        console.error('❌ Error performing CRUD operations:', error);
        process.exit(1);
    } finally {
        // Close the pool to end the connection
        await pool.end();
        console.log('Database pool closed.');
    }
}

main();
