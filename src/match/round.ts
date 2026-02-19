import type { MatchState } from "./types";

export const getTopPlayer = (state: MatchState) => {
    let topUserId = "";
    let topKills = -1;
    for (const p of Object.values(state.players)) {
        if (p.kills > topKills) {
            topKills = p.kills;
            topUserId = p.presence.userId;
        }
    }
    return { topUserId, topKills };
};

export const getRoundLeader = (state: MatchState, teamRed: number, teamBlue: number) => {
    if (state.stage.teamMode) {
        if (state.score.red === state.score.blue) return { winnerTeam: 0 };
        return { winnerTeam: state.score.red > state.score.blue ? teamRed : teamBlue };
    }
    const top = getTopPlayer(state);
    if (top.topKills < 0) return { winnerUserId: "" };
    return { winnerUserId: top.topUserId, topKills: top.topKills };
};

export const checkScoreLimitReached = (state: MatchState) => {
    const limit = state.stage.roundLimit ?? 0;
    if (!limit || limit <= 0) return false;
    if (state.stage.teamMode) {
        return state.score.red >= limit || state.score.blue >= limit;
    }
    for (const p of Object.values(state.players)) {
        if (p.kills >= limit) return true;
    }
    return false;
};

export const endRound = (
    dispatcher: nkruntime.MatchDispatcher,
    state: MatchState,
    reason: string,
    options: {
        teamRed: number;
        teamBlue: number;
        opCodeMatchEnd: number;
        wrapPayload: (payload: any) => any;
    }
) => {
    state.stage.started = false;
    state.stage.roundEndTick = 0;
    const leader = getRoundLeader(state, options.teamRed, options.teamBlue);
    dispatcher.broadcastMessage(
        options.opCodeMatchEnd,
        JSON.stringify(options.wrapPayload({
            round: state.stage.round,
            reason,
            score: state.score,
            ...leader
        })),
        null,
        null,
        true
    );
};
