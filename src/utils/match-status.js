import { MATCH_STATUS } from '../validation/matches.js';

/**
 * Determine a match status (SCHEDULED, LIVE, or FINISHED) from start and end times.
 * @param {string|number|Date} startTime - Value parseable by Date representing the match start.
 * @param {string|number|Date} endTime - Value parseable by Date representing the match end.
 * @param {Date} [now=new Date()] - Reference time used to evaluate the status.
 * @returns {string|null} One of `MATCH_STATUS.SCHEDULED`, `MATCH_STATUS.LIVE`, or `MATCH_STATUS.FINISHED`; `null` if `startTime` or `endTime` are not valid dates.
 */
export function getMatchStatus(startTime, endTime, now = new Date()) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
    }

    if (now < start) {
        return MATCH_STATUS.SCHEDULED;
    }

    if (now >= end) {
        return MATCH_STATUS.FINISHED;
    }

    return MATCH_STATUS.LIVE;
}

/**
 * Synchronizes a match's status based on its startTime and endTime, calling the provided updater when a change is required.
 * @param {Object} match - Match object with `startTime`, `endTime`, and `status` properties; `status` may be mutated when updated.
 * @param {Function} updateStatus - Async function invoked with the new status when an update is needed.
 * @returns {string} The match's status after synchronization.
 */
export async function syncMatchStatus(match, updateStatus) {
    const nextStatus = getMatchStatus(match.startTime, match.endTime);
    if (!nextStatus) {
        return match.status;
    }
    if (match.status !== nextStatus) {
        await updateStatus(nextStatus);
        match.status = nextStatus;
    }
    return match.status;
}