import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { matchIdParamSchema } from "../validation/matches.js";
import {
    listCommentaryQuerySchema,
    createCommentarySchema,
} from "../validation/commentary.js";

const MAX_LIMIT = 100;

export const commentaryRouter = Router({ mergeParams: true });

commentaryRouter.get("/", async (req, res) => {
    const paramsParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
        return res.status(400).json({ errors: paramsParsed.error.issues });
    }

    const queryParsed = listCommentaryQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
        return res.status(400).json({ errors: queryParsed.error.issues });
    }

    const limit = Math.min(queryParsed.data.limit ?? 100, MAX_LIMIT);

    try {
        const results = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, paramsParsed.data.id))
            .orderBy(desc(commentary.createdAt))
            .limit(limit);

        res.status(200).json({ data: results });
    } catch (error) {
        console.error("Failed to fetch commentary:", error);
        res.status(500).json({ error: "Failed to fetch commentary" });
    }
});

commentaryRouter.post("/", async (req, res) => {
    const paramsParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
        return res.status(400).json({ errors: paramsParsed.error.issues });
    }

    const bodyParsed = createCommentarySchema.safeParse(req.body);
    if (!bodyParsed.success) {
        return res.status(400).json({ errors: bodyParsed.error.issues });
    }

    try {
        const [result] = await db
            .insert(commentary)
            .values({
                ...bodyParsed.data,
                matchId: paramsParsed.data.id,
            })
            .returning();
        
        try {
            if(res.app.locals.broadcastCommentary){
                res.app.locals.broadcastCommentary(result.matchId,result);
            }
        } catch (err) {
            console.error("Failed to broadcast commentary:", err);
        }

        res.status(201).json({ message: "Commentary created successfully", data: result });
    } catch (error) {
        console.error("Failed to create commentary:", error);
        res.status(500).json({ error: "Failed to create commentary" });
    }
});
