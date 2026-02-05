import { eq } from 'drizzle-orm';
import { db, pool } from './db/db.js';
import { demoUsers } from './db/schema.js';

async function main() {
    try {
        console.log('Performing CRUD operations...\n');

        // CREATE: Insert a new user
        const [newUser] = await db
            .insert(demoUsers)
            .values({ name: 'Admin User', email: 'admin@example.com' })
            .returning();

        if (!newUser) {
            throw new Error('Failed to create user');
        }

        console.log('✅ CREATE: New user created:', newUser);

        // READ: Select the user
        const foundUser = await db.select().from(demoUsers).where(eq(demoUsers.id, newUser.id));
        console.log('✅ READ: Found user:', foundUser[0]);

        // UPDATE: Change the user's name
        const [updatedUser] = await db
            .update(demoUsers)
            .set({ name: 'Super Admin' })
            .where(eq(demoUsers.id, newUser.id))
            .returning();

        if (!updatedUser) {
            throw new Error('Failed to update user');
        }

        console.log('✅ UPDATE: User updated:', updatedUser);

        // DELETE: Remove the user
        await db.delete(demoUsers).where(eq(demoUsers.id, newUser.id));
        console.log('✅ DELETE: User deleted.');

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
