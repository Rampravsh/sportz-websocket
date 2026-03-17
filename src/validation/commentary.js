import { z } from "zod";

// --- Query Schema ---

export const listCommentaryQuerySchema = z.object({
    limit: z.coerce
        .number()
        .positive()
        .max(100)
        .optional(),
});

// --- Create Commentary Schema ---

export const createCommentarySchema = z.object({
    minutes: z.coerce
        .number()
        .int()
        .nonnegative()
        .optional(),
    sequence: z.coerce
        .number()
        .int()
        .optional(),
    period: z.string().optional(),
    eventType: z.string().optional(),
    actor: z.string().optional(),
    team: z.string().optional(),
    message: z.string().min(1, "message is required"),
    metadata: z.record(z.string(), z.any()).optional(),
    tags: z.array(z.string()).optional(),
});
