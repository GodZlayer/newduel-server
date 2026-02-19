import type { MatchState, PlayerState, Vec3 } from "./types";

export const isActivePlayer = (p: PlayerState) => !p.spectator && !p.disconnected;

export const reassignMaster = (state: MatchState) => {
    const next = Object.values(state.players).find(isActivePlayer);
    state.stage.masterSessionId = next?.presence.sessionId;
    state.stage.masterUserId = next?.presence.userId;
};

export const cleanupDisconnected = (state: MatchState, tick: number) => {
    let removedMaster = false;
    for (const [sessionId, p] of Object.entries(state.players)) {
        if (!p.disconnected) continue;
        if (p.disconnectedUntilTick && tick >= p.disconnectedUntilTick) {
            if (state.stage.masterSessionId === sessionId) removedMaster = true;
            delete state.players[sessionId];
        }
    }
    if (removedMaster) reassignMaster(state);
};

export const broadcastRoomUpdate = (
    dispatcher: nkruntime.MatchDispatcher,
    state: MatchState,
    opCodeRoomUpdate: number,
    wrapPayload: (payload: any) => any
) => {
    const payload = {
        stage: state.stage,
        players: Object.values(state.players).map(p => ({
            userId: p.presence.userId,
            username: p.presence.username,
            ready: p.ready,
            team: p.team,
            loaded: p.loaded,
            spectator: !!p.spectator,
            disconnected: !!p.disconnected
        }))
    };
    dispatcher.broadcastMessage(opCodeRoomUpdate, JSON.stringify(wrapPayload(payload)), null, null, true);
};

export const broadcastReadyState = (
    dispatcher: nkruntime.MatchDispatcher,
    state: MatchState,
    opCodeReadyState: number,
    wrapPayload: (payload: any) => any
) => {
    const payload = {
        players: Object.values(state.players).map(p => ({
            userId: p.presence.userId,
            ready: p.ready
        }))
    };
    dispatcher.broadcastMessage(opCodeReadyState, JSON.stringify(wrapPayload(payload)), null, null, true);
};

export const broadcastMatchState = (
    dispatcher: nkruntime.MatchDispatcher,
    state: MatchState,
    tick: number,
    opCodeMatchState: number,
    wrapPayload: (payload: any) => any
) => {
    const payload = {
        tick,
        players: Object.values(state.players).reduce((acc: any, p) => {
            acc[p.presence.userId] = {
                hp: p.health,
                ap: p.ap,
                maxHp: p.maxHealth,
                maxAp: p.maxAp,
                weight: p.weight,
                maxWeight: p.maxWeight,
                sf: p.sf,
                fr: p.fr,
                cr: p.cr,
                pr: p.pr,
                lr: p.lr,
                limitSpeed: p.limitSpeed,
                limitWall: p.limitWall,
                pos: p.pos,
                rot: p.rot,
                anim: p.anim,
                dead: p.dead,
                team: p.team,
                kills: p.kills,
                deaths: p.deaths,
                ammo: p.ammo,
                flashUntilTick: p.flashUntilTick ?? 0,
                stunUntilTick: p.stunUntilTick ?? 0,
                slowUntilTick: p.slowUntilTick ?? 0,
                poisonUntilTick: p.poisonUntilTick ?? 0,
                burnUntilTick: p.burnUntilTick ?? 0,
                enchantType: p.enchantType ?? "",
                spectator: !!p.spectator,
                disconnected: !!p.disconnected
            };
            return acc;
        }, {}),
        score: state.score,
        npcs: Object.values(state.npcs).map(npc => ({
            id: npc.id,
            templateId: npc.templateId,
            name: npc.name,
            hp: npc.health,
            ap: npc.ap,
            pos: npc.pos,
            dead: npc.dead
        })),
        worldItems: state.worldItems.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            amount: item.amount,
            pos: item.pos,
            active: item.active
        })),
        projectiles: state.projectiles.map(p => ({
            id: p.id,
            ownerUserId: p.ownerUserId,
            weaponType: p.weaponType,
            pos: p.pos,
            dir: p.dir
        })),
        smokeZones: state.smokeZones.map(z => ({
            id: z.id,
            pos: z.pos,
            radius: z.radius,
            endTick: z.endTick
        }))
    };
    dispatcher.broadcastMessage(opCodeMatchState, JSON.stringify(wrapPayload(payload)), null, null, true);
};

export const updateDuelState = (
    dispatcher: nkruntime.MatchDispatcher,
    state: MatchState,
    tick: number,
    options: {
        getSpawnPos: (state: MatchState, player: PlayerState) => Vec3;
        opCodePlayerRespawn: number;
        wrapPayload: (payload: any) => any;
    }
) => {
    if (state.stage.mode !== "duel" || !state.stage.started) return;

    if (!state.duel) {
        state.duel = {
            queue: Object.keys(state.players).filter(id => !state.players[id].spectator)
        };
    }

    if (!state.duel.p1 && state.duel.queue.length > 0) {
        state.duel.p1 = state.duel.queue.shift();
    }
    if (!state.duel.p2 && state.duel.queue.length > 0) {
        state.duel.p2 = state.duel.queue.shift();
    }

    if (state.duel.p1 && !state.players[state.duel.p1]) state.duel.p1 = undefined;
    if (state.duel.p2 && !state.players[state.duel.p2]) state.duel.p2 = undefined;

    [state.duel.p1, state.duel.p2].forEach(sid => {
        if (!sid) return;
        const p = state.players[sid];
        if (!p || !p.dead || tick < p.respawnTick) return;
        p.dead = false;
        p.health = p.maxHealth;
        p.ap = p.maxAp;
        p.pos = options.getSpawnPos(state, p);
        dispatcher.broadcastMessage(
            options.opCodePlayerRespawn,
            JSON.stringify(options.wrapPayload({ userId: p.presence.userId, pos: p.pos })),
            null,
            null,
            true
        );
    });
};

export const assignAssassinationVips = (state: MatchState, teamRed: number, teamBlue: number) => {
    for (const player of Object.values(state.players)) {
        player.isVip = false;
    }
    if (state.stage.mode !== "assassination") return;
    const redPlayers = Object.values(state.players).filter(p => !p.spectator && !p.disconnected && p.team === teamRed);
    const bluePlayers = Object.values(state.players).filter(p => !p.spectator && !p.disconnected && p.team === teamBlue);
    if (redPlayers.length > 0) {
        const vip = redPlayers[Math.floor(Math.random() * redPlayers.length)];
        vip.isVip = true;
    }
    if (bluePlayers.length > 0) {
        const vip = bluePlayers[Math.floor(Math.random() * bluePlayers.length)];
        vip.isVip = true;
    }
};
