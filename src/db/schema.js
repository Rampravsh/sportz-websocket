import { pgTable, serial, text, integer, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';

export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'finished']);

export const matches = pgTable('matches', {
    id: serial('id').primaryKey(),
    sport: text('sport').notNull(),
    homeTeam: text('home_team').notNull(),
    awayTeam: text('away_team').notNull(),
    status: matchStatusEnum('status').notNull(),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    homeScore: integer('home_score').default(0).notNull(),
    awayScore: integer('away_score').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});


export const commentary = pgTable('commentary', {
    id: serial('id').primaryKey(),
    matchId: integer('match_id').references(() => matches.id).notNull(),
    minute: integer('minute'),
    sequence: integer('sequence'),
    period: text('period'),
    eventType: text('event_type'),
    actor: text('actor'),
    team: text('team'),
    message: text('message'),
    metadata: jsonb('metadata'),
    tags: text('tags').array(), // Using array of text for tags
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
