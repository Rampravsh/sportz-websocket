import { Router } from "express";
import { desc } from "drizzle-orm";
import { createMatchSchema, listMatchesQuerySchema, MATCH_STATUS } from "../validation/matches.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { getMatchStatus } from "../utils/match-status.js";

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get("/", async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query)
    // console.log(parsed)
    if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.issues })
    }
    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT)
    try {
        const data = await db.select().from(matches).limit(limit).orderBy(desc(matches.createdAt))
        // console.log(data)
        res.json({ data })
    } catch (e) {
        console.error("Failed to list matches:", e);
        res.status(500).json({ error: "Failed to list matches" })
    }
});

matchRouter.post('/', async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body)
    // console.log(req.body)
    // console.log(parsed) 

    if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.issues })
    }

    const { startTime, endTime, homeScore, awayScore } = parsed.data
    console.log(startTime, endTime, homeScore, awayScore)
    try {
        const [event] = await db.insert(matches).values(
            {
                ...parsed.data,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                homeScore: homeScore || 0,
                awayScore: awayScore || 0,
                status: getMatchStatus(startTime, endTime) || MATCH_STATUS.SCHEDULED
            }).returning();
        if (res.app.locals.broadcastMatchCreated) {
            res.app.locals.broadcastMatchCreated(event)
        }
        res.status(201).json({ message: "Match created successfully", event });
    } catch (error) {
        console.error("Failed to create match:", error);
        res.status(500).json({ message: "Failed to create match" })
    }
})
