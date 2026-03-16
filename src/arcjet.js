import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === "DRY_RUN" ? 'DRY_RUN' : 'LIVE';

if (!arcjetKey) {
    console.warn('ARCJET_KEY is not defined, Arcjet will not be initialized');
}

export const httpArcjet = arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules: [
            shield({ mode: arcjetMode }),
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', "CATEGORY:PREVIEW"] }),
            slidingWindow({ mode: arcjetMode, interval: "10s", max: 50 })
        ]

    }) : null


export const wsArcjet = arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules: [
            shield({ mode: arcjetMode }),
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', "CATEGORY:PREVIEW"] }),
            slidingWindow({ mode: arcjetMode, interval: "5s", max: 10, characteristics: ["ip.src"] })
        ]
    }) : null


export function securityMiddleware(){
    return async (req,res,next)=>{
        if(!httpArcjet) return next();
        try {
            const decision = await httpArcjet.protect(req,res);
            if(decision.isDenied()){
                if(decision.reason.isRateLimit()){
                    return res.status(429).json({error:"Too Many Requests"});
                }
                return res.status(403).json({error:"Forbidden"});
            }
        } catch (error) {
            console.error("Arcjet Middleware Error:", error);
            return res.status(503).json({error:"Service Unavailable"});
        }
        next();
    }
}