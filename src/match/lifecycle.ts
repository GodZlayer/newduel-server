import type { MatchState, NpcState, PlayerState, StageSettings, Vec3 } from "./types";

type LifecycleDeps = {
    tickRate: number;
    baseMaxWeight: number;
    zstNone: number;
    dotTickInterval: number;
    reconnectGraceTicks: number;
    teamRed: number;
    teamBlue: number;
    opCode: {
        sMatchWelcome: number;
        sPlayerSpawn: number;
        sMatchStart: number;
        sMatchEnd: number;
        cRoomChat: number;
    };
    normalizeTimeLimit: (value: number) => number;
    wrapPayload: (payload: any) => any;
    getGameTypeConfig: (gameTypeId: number) => any;
    getMapById: (mapId: number) => any;
    getQuestMapsetByName: (mapName: string) => any;
    getScenarioForMapset: (name: string, questLevel: number) => any;
    getQuestByMap: (mapId: number) => any;
    buildScenarioNpcs: (sector: any, mapId: number) => Record<string, NpcState>;
    buildQuestNpcs: (quest: any, stageIndex: number, mapId: number) => Record<string, NpcState>;
    getWorldItemSpawns: (mapId: number, teamMode: boolean) => any[];
    getWorldItemDesc: (itemName: string) => any;
    getLegacyItemEffect: (itemId: number) => any;
    getWeaponInfo: (weaponId?: number) => any;
    ensureAmmoState: (player: PlayerState, weaponId: number, weapon: any) => any;
    computeEquipmentStats: (equipment: any) => any;
    getSpawnPos: (state: MatchState, player: PlayerState) => Vec3;
    isActivePlayer: (p: PlayerState) => boolean;
    reassignMaster: (state: MatchState) => void;
    broadcastNpcSpawn: (dispatcher: nkruntime.MatchDispatcher, npcs: Record<string, NpcState>, presences?: nkruntime.Presence[]) => void;
    broadcastRoomUpdate: (dispatcher: nkruntime.MatchDispatcher, state: MatchState) => void;
    broadcastReadyState: (dispatcher: nkruntime.MatchDispatcher, state: MatchState) => void;
    assignAssassinationVips: (state: MatchState) => void;
};

const buildWorldItems = (deps: LifecycleDeps, mapId: number, teamMode: boolean) =>
    deps.getWorldItemSpawns(mapId, teamMode).map((entry: any, idx: number) => {
        const desc = deps.getWorldItemDesc(entry.item) || {};
        const respawnSec = Number.isFinite(entry.timeSec) && entry.timeSec > 0
            ? entry.timeSec
            : (Number.isFinite(desc.time) ? Number(desc.time) / 1000 : 30);
        return {
            id: `${mapId}-${idx}-${entry.item}`,
            name: entry.item,
            type: String(desc.type ?? "unknown"),
            amount: Number.isFinite(desc.amount) ? Number(desc.amount) : 0,
            pos: entry.pos ?? { x: 0, y: 0, z: 0 },
            active: true,
            respawnTick: 0,
            respawnSec
        };
    });

export const createLifecycleHandlers = (deps: LifecycleDeps) => {
    const matchInit: nkruntime.MatchInitFunction = (ctx, logger, nk, params) => {
        const gameTypeId = params?.gameTypeId ?? 0;
        const gt = deps.getGameTypeConfig(gameTypeId);
        const roundLimit = Number.isFinite(params?.roundLimit) ? params.roundLimit : (gt?.defaultRound ?? 0);
        const timeLimitSec = deps.normalizeTimeLimit(Number.isFinite(params?.timeLimitSec) ? params.timeLimitSec : (gt?.defaultTimeSec ?? 0));
        const settings: StageSettings = {
            name: params?.name ?? "Room",
            mapId: params?.mapId ?? 0,
            mode: params?.mode ?? "DM",
            modeProfile: params?.modeProfile ?? "classic",
            gameTypeId,
            maxPlayers: params?.maxPlayers ?? 16,
            roundLimit,
            timeLimitSec,
            password: params?.password ?? "",
            teamMode: params?.teamMode ?? false,
            channelRule: params?.channelRule ?? "free_all_maps",
            seed: Number.isFinite(params?.seed) ? (params.seed >>> 0) : 0,
            recipeHash: params?.recipeHash ?? "",
            contentVersion: params?.contentVersion ?? "",
            contentHash: params?.contentHash ?? "",
            generatorId: params?.generatorId ?? "",
            generatorVersion: params?.generatorVersion ?? "",
            collisionHash: params?.collisionHash ?? ""
        };

        const map = deps.getMapById(settings.mapId);
        const mapName = map?.name ?? "";
        const questLevel = Number.isFinite(params?.questLevel) ? params.questLevel : (Number.isFinite(params?.ql) ? params.ql : 0);
        const mapset = mapName ? deps.getQuestMapsetByName(mapName) : null;
        const scenario = mapset ? deps.getScenarioForMapset(mapset.title ?? mapset.name ?? mapName, questLevel) : null;
        let questState: MatchState["quest"] | undefined;
        let initialNpcs: Record<string, NpcState> = {};
        if (scenario && mapset) {
            const sectors = (scenario.maps ?? [])
                .slice()
                .sort((a: any, b: any) => Number(a?.dice ?? 0) - Number(b?.dice ?? 0))
                .map((m: any) => {
                    const sectorId = Number(m?.key_sector ?? 0);
                    const sector = (mapset.sectors ?? []).find((s: any) => Number(s?.id) === sectorId) ?? {};
                    return {
                        sectorId,
                        npcsets: Array.isArray(m?.npcset_array) ? m.npcset_array : [],
                        meleeSpawn: Number(sector?.melee_spawn ?? 0),
                        rangeSpawn: Number(sector?.range_spawn ?? 0),
                        bossSpawn: String(sector?.boss_spawn ?? "") === "1"
                    };
                });
            questState = {
                mode: "scenario",
                stageIndex: 0,
                completed: false,
                scenarioTitle: scenario.title,
                scenarioXp: Number(scenario.XP ?? 0),
                scenarioBp: Number(scenario.BP ?? 0),
                sectors
            };
            if (sectors.length > 0) {
                initialNpcs = deps.buildScenarioNpcs(sectors[0], settings.mapId);
            }
        } else {
            const quest = deps.getQuestByMap(settings.mapId);
            questState = quest?.stages ? { mode: "simple", questId: quest.id, stageIndex: 0, completed: false } : undefined;
            initialNpcs = questState && quest ? deps.buildQuestNpcs(quest, 0, settings.mapId) : {};
        }

        return {
            state: {
                players: {},
                pendingJoinMeta: {},
                startTime: Date.now(),
                stage: {
                    ...settings,
                    started: false,
                    round: 0,
                    roundStartTick: 0,
                    roundEndTick: 0
                },
                score: { red: 0, blue: 0 },
                worldItems: buildWorldItems(deps, settings.mapId, !!settings.teamMode),
                projectiles: [],
                nextProjectileId: 1,
                smokeZones: [],
                quest: questState,
                npcs: questState ? initialNpcs : {}
            },
            tickRate: deps.tickRate,
            label: JSON.stringify({
                name: settings.name,
                mapId: settings.mapId,
                mode: settings.mode,
                modeProfile: settings.modeProfile,
                gameTypeId: settings.gameTypeId,
                maxPlayers: settings.maxPlayers,
                roundLimit: settings.roundLimit,
                timeLimitSec: settings.timeLimitSec,
                hasPassword: !!settings.password,
                seed: settings.seed ?? 0,
                recipeHash: settings.recipeHash ?? "",
                contentVersion: settings.contentVersion ?? "",
                contentHash: settings.contentHash ?? ""
            })
        };
    };

    const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = (ctx, logger, nk, dispatcher, tick, state: MatchState, presence, metadata) => {
        const currentSize = Object.values(state.players).filter(deps.isActivePlayer).length;
        const metaSpectator = (metadata as any)?.spectator === true || (metadata as any)?.spectator === "true";
        const existing = Object.values(state.players).find(p => p.userId === presence.userId);
        if (currentSize >= state.stage.maxPlayers && !metaSpectator && !existing) {
            return { state, accept: false, rejectMessage: "Room full." };
        }
        if (state.stage.password && state.stage.password.length > 0) {
            const provided = (metadata as any)?.password ?? "";
            if (provided !== state.stage.password) {
                return { state, accept: false, rejectMessage: "Invalid password." };
            }
        }
        if (!state.pendingJoinMeta) state.pendingJoinMeta = {};
        state.pendingJoinMeta[presence.userId] = { spectator: metaSpectator };
        return { state, accept: true };
    };

    const matchJoin: nkruntime.MatchJoinFunction = (ctx, logger, nk, dispatcher, tick, state: MatchState, presences) => {
        presences.forEach((p) => {
            const meta = state.pendingJoinMeta?.[p.userId] ?? {};
            const spectator = !!meta.spectator;

            const existingEntry = Object.entries(state.players).find(([, st]) => st.userId === p.userId && st.disconnected);
            if (existingEntry) {
                const [oldSessionId, oldState] = existingEntry;
                delete state.players[oldSessionId];
                oldState.presence = p;
                oldState.userId = p.userId;
                oldState.disconnected = false;
                oldState.disconnectedUntilTick = 0;
                oldState.spectator = spectator || oldState.spectator;
                state.players[p.sessionId] = oldState;
                if (state.stage.masterSessionId === oldSessionId) {
                    state.stage.masterSessionId = p.sessionId;
                    state.stage.masterUserId = p.userId;
                }
            } else {
                if (!state.stage.masterUserId && !spectator) {
                    state.stage.masterUserId = p.userId;
                    state.stage.masterSessionId = p.sessionId;
                }
                state.players[p.sessionId] = {
                    presence: p,
                    userId: p.userId,
                    health: 100,
                    ap: 100,
                    pos: { x: 0, y: 0, z: 0 },
                    rot: { x: 0, y: 0, z: 0 },
                    vel: { x: 0, y: 0, z: 0 },
                    anim: 0,
                    ready: false,
                    team: 0,
                    loaded: false,
                    dead: false,
                    respawnTick: 0,
                    lastAttackTick: -999999,
                    kills: 0,
                    deaths: 0,
                    maxHealth: 100,
                    maxAp: 100,
                    weight: 0,
                    maxWeight: deps.baseMaxWeight,
                    sf: 0,
                    fr: 0,
                    cr: 0,
                    pr: 0,
                    lr: 0,
                    limitSpeed: 100,
                    limitWall: 0,
                    limitJump: 0,
                    limitTumble: 0,
                    caFactor: 1.0,
                    caElapsed: 0.0,
                    lastShotTick: -999999,
                    pendingGuardRecoilTick: 0,
                    chargedUntilTick: 0,
                    guardCancelUntilTick: 0,
                    stunType: deps.zstNone,
                    guardStartTick: 0,
                    pendingDashTick: 0,
                    pendingDashDir: undefined,
                    wallJumpStartTick: 0,
                    wallJumpDir: -1,
                    wallJump2: false,
                    wallJump2Dir: -1,
                    lastTumbleTick: 0,
                    lastJumpTick: 0,
                    ammo: {},
                    weapons: {},
                    spectator,
                    disconnected: false,
                    disconnectedUntilTick: 0,
                    flashUntilTick: 0,
                    stunUntilTick: 0,
                    slowUntilTick: 0,
                    slowRatio: 1,
                    poisonUntilTick: 0,
                    nextPoisonTick: 0,
                    poisonDamage: 0,
                    burnUntilTick: 0,
                    nextBurnTick: 0,
                    burnDamage: 0,
                    lightningUntilTick: 0,
                    nextLightningTick: 0,
                    lightningDamage: 0,
                    enchantType: "",
                    enchantLevel: 0,
                    enchantDamage: 0,
                    enchantDurationTicks: 0,
                    enchantLimitSpeed: 0
                };
            }
            if (state.pendingJoinMeta) delete state.pendingJoinMeta[p.userId];

            const playerState = state.players[p.sessionId];
            if (!playerState.spectator) {
                const active = nk.storageRead([{ collection: "characters", key: "active", userId: p.userId }]);
                const list = nk.storageRead([{ collection: "characters", key: "list", userId: p.userId }]);
                let activeId: string | null = null;
                if (active.length > 0) activeId = (active[0].value as any)?.charId ?? null;
                const chars = (list.length > 0 ? (list[0].value as any)?.characters : []) ?? [];
                const char = (activeId ? chars.find((c: any) => c?.id === activeId) : null) ?? chars[0] ?? null;
                if (char?.equipment) {
                    playerState.weapons = {
                        melee: char.equipment.melee,
                        primary: char.equipment.primary,
                        secondary: char.equipment.secondary
                    };
                    const enchantIds = [char.equipment.item1, char.equipment.item2].filter((id: any) => typeof id === "number");
                    for (const eid of enchantIds) {
                        const legacy = deps.getLegacyItemEffect(Number(eid));
                        const weaponType = String(legacy?.weapon || "").toLowerCase();
                        if (weaponType.startsWith("enchant_")) {
                            playerState.enchantType = weaponType;
                            playerState.enchantLevel = Number(legacy?.effect_level || 1);
                            playerState.enchantDamage = Number(legacy?.damage || 0);
                            const delayMs = Number(legacy?.delay || 0);
                            playerState.enchantDurationTicks = delayMs > 0 ? Math.max(1, Math.ceil(delayMs / 50)) : deps.dotTickInterval;
                            playerState.enchantLimitSpeed = Number(legacy?.limitspeed || 0);
                            break;
                        }
                    }
                }
                if (playerState.weapons) {
                    const ids = Object.values(playerState.weapons).filter((id): id is number => typeof id === "number");
                    for (const id of ids) {
                        const weapon = deps.getWeaponInfo(id);
                        if (weapon) deps.ensureAmmoState(playerState, id, weapon);
                    }
                }
                if (char) {
                    const baseHp = Number.isFinite(char.hp) ? char.hp : 100;
                    const baseAp = Number.isFinite(char.ap) ? char.ap : 0;
                    const bonus = deps.computeEquipmentStats(char.equipment);
                    playerState.maxHealth = baseHp + bonus.hp;
                    playerState.maxAp = baseAp + bonus.ap;
                    playerState.weight = bonus.weight;
                    playerState.maxWeight = deps.baseMaxWeight + bonus.maxwt;
                    playerState.sf = bonus.sf;
                    playerState.fr = bonus.fr;
                    playerState.cr = bonus.cr;
                    playerState.pr = bonus.pr;
                    playerState.lr = bonus.lr;
                    playerState.health = playerState.maxHealth;
                    playerState.ap = playerState.maxAp;
                }
                const currentWeaponId = playerState.weapons.primary ?? playerState.weapons.secondary ?? playerState.weapons.melee;
                if (currentWeaponId) {
                    const w = deps.getWeaponInfo(currentWeaponId);
                    if (w) {
                        playerState.currentWeaponId = currentWeaponId;
                        playerState.limitSpeed = w.limitSpeed || 100;
                        playerState.limitWall = w.limitWall || 0;
                        playerState.limitJump = w.limitJump || 0;
                        playerState.limitTumble = w.limitTumble || 0;
                    }
                }
                playerState.pos = deps.getSpawnPos(state, playerState);
            }

            const welcome = {
                matchId: ctx.matchId,
                tickRate: deps.tickRate,
                mapId: state.stage.mapId,
                seed: state.stage.seed ?? 0,
                modeProfile: state.stage.modeProfile ?? "classic",
                recipeHash: state.stage.recipeHash ?? "",
                contentVersion: state.stage.contentVersion ?? "",
                contentHash: state.stage.contentHash ?? "",
                players: Object.values(state.players).map(sp => ({
                    uid: sp.presence.userId,
                    name: sp.presence.username
                }))
            };
            dispatcher.broadcastMessage(
                deps.opCode.sMatchWelcome,
                JSON.stringify(deps.wrapPayload(welcome)),
                [p],
                null,
                true
            );
            if (!playerState.spectator) {
                dispatcher.broadcastMessage(
                    deps.opCode.sPlayerSpawn,
                    JSON.stringify(deps.wrapPayload({ userId: p.userId, username: p.username, pos: playerState.pos })),
                    null,
                    null,
                    true
                );
            }
        });

        if (state.npcs && Object.keys(state.npcs).length > 0) {
            deps.broadcastNpcSpawn(dispatcher, state.npcs, presences);
        }
        deps.broadcastRoomUpdate(dispatcher, state);
        return { state };
    };

    const matchLeave: nkruntime.MatchLeaveFunction = (ctx, logger, nk, dispatcher, tick, state: MatchState, presences) => {
        presences.forEach((p) => {
            const player = state.players[p.sessionId];
            if (!player) return;
            if (player.spectator) {
                delete state.players[p.sessionId];
            } else {
                player.disconnected = true;
                player.disconnectedUntilTick = tick + deps.reconnectGraceTicks;
                player.ready = false;
            }
            if (state.stage.masterSessionId === p.sessionId) {
                deps.reassignMaster(state);
            }
        });
        deps.broadcastRoomUpdate(dispatcher, state);
        return { state };
    };

    const matchTerminate: nkruntime.MatchTerminateFunction = (ctx, logger, nk, dispatcher, tick, state, graceSeconds) => {
        return { state };
    };

    const matchSignal: nkruntime.MatchSignalFunction = (ctx, logger, nk, dispatcher, tick, state: MatchState, data) => {
        let input: any = {};
        try {
            input = data ? JSON.parse(data) : {};
        } catch {
            input = {};
        }

        const op = input?.op;
        if (op === "get_state") {
            return {
                state,
                data: JSON.stringify({
                    stage: state.stage,
                    players: state.players,
                    score: state.score,
                    worldItems: state.worldItems,
                    npcs: state.npcs,
                    projectiles: state.projectiles,
                    smokeZones: state.smokeZones
                })
            };
        }

        if (op === "check_join") {
            const ok = !state.stage.password || state.stage.password === (input?.password ?? "");
            return { state, data: JSON.stringify({ ok }) };
        }

        if (op === "set_ready") {
            const userId = input?.userId;
            const ready = !!input?.ready;
            const player = Object.values(state.players).find(p => p.presence.userId === userId);
            if (player && !player.spectator && !player.disconnected) {
                player.ready = ready;
                deps.broadcastReadyState(dispatcher, state);
            }
            return { state, data: JSON.stringify({ ok: true }) };
        }

        if (op === "set_team") {
            const userId = input?.userId;
            const team = typeof input?.team === "number" ? input.team : 0;
            const player = Object.values(state.players).find(p => p.presence.userId === userId);
            if (player && !player.spectator && !player.disconnected) {
                player.team = team;
                deps.broadcastRoomUpdate(dispatcher, state);
            }
            return { state, data: JSON.stringify({ ok: true }) };
        }

        if (op === "update_stage") {
            if (state.stage.masterUserId && input?.userId !== state.stage.masterUserId) {
                return { state, data: JSON.stringify({ ok: false, reason: "not_master" }) };
            }
            const prevMapId = state.stage.mapId;
            const prevTeamMode = !!state.stage.teamMode;
            state.stage.name = input?.name ?? state.stage.name;
            state.stage.mapId = typeof input?.mapId === "number" ? input.mapId : state.stage.mapId;
            state.stage.mode = input?.mode ?? state.stage.mode;
            if (typeof input?.modeProfile === "string") state.stage.modeProfile = input.modeProfile;
            state.stage.gameTypeId = typeof input?.gameTypeId === "number" ? input.gameTypeId : state.stage.gameTypeId;
            state.stage.maxPlayers = typeof input?.maxPlayers === "number" ? input.maxPlayers : state.stage.maxPlayers;
            state.stage.roundLimit = typeof input?.roundLimit === "number" ? input.roundLimit : state.stage.roundLimit;
            state.stage.timeLimitSec = typeof input?.timeLimitSec === "number" ? input.timeLimitSec : state.stage.timeLimitSec;
            if (typeof input?.password === "string") state.stage.password = input.password;
            if (typeof input?.teamMode === "boolean") state.stage.teamMode = input.teamMode;
            if (typeof input?.channelRule === "string") state.stage.channelRule = input.channelRule;
            if (typeof input?.seed === "number") state.stage.seed = input.seed >>> 0;
            if (typeof input?.recipeHash === "string") state.stage.recipeHash = input.recipeHash;
            if (typeof input?.contentVersion === "string") state.stage.contentVersion = input.contentVersion;
            if (typeof input?.contentHash === "string") state.stage.contentHash = input.contentHash;
            if (typeof input?.generatorId === "string") state.stage.generatorId = input.generatorId;
            if (typeof input?.generatorVersion === "string") state.stage.generatorVersion = input.generatorVersion;
            if (typeof input?.collisionHash === "string") state.stage.collisionHash = input.collisionHash;
            if (state.stage.mapId !== prevMapId || !!state.stage.teamMode !== prevTeamMode) {
                state.worldItems = buildWorldItems(deps, state.stage.mapId, !!state.stage.teamMode);
                state.projectiles = [];
            }
            deps.broadcastRoomUpdate(dispatcher, state);
            return { state, data: JSON.stringify({ ok: true }) };
        }

        if (op === "start") {
            if (state.stage.masterUserId && input?.userId !== state.stage.masterUserId) {
                return { state, data: JSON.stringify({ ok: false, reason: "not_master" }) };
            }
            const activePlayers = Object.values(state.players).filter(deps.isActivePlayer);
            const allReady = activePlayers.length > 0 && activePlayers.every(p => p.ready);
            if (!allReady) {
                return { state, data: JSON.stringify({ ok: false, reason: "not_ready" }) };
            }
            if (state.stage.roundLimit > 0 && state.stage.round >= state.stage.roundLimit) {
                return { state, data: JSON.stringify({ ok: false, reason: "round_limit" }) };
            }
            state.stage.started = true;
            state.stage.round += 1;
            state.stage.roundStartTick = tick;
            state.stage.roundEndTick = state.stage.timeLimitSec > 0 ? tick + Math.ceil(state.stage.timeLimitSec * deps.tickRate) : 0;
            state.score = { red: 0, blue: 0 };
            deps.assignAssassinationVips(state);
            dispatcher.broadcastMessage(
                deps.opCode.sMatchStart,
                JSON.stringify(deps.wrapPayload({ round: state.stage.round })),
                null,
                null,
                true
            );

            return { state, data: JSON.stringify({ ok: true }) };
        }

        if (op === "end") {
            if (state.stage.masterUserId && input?.userId !== state.stage.masterUserId) {
                return { state, data: JSON.stringify({ ok: false, reason: "not_master" }) };
            }
            state.stage.started = false;
            state.stage.roundEndTick = 0;
            dispatcher.broadcastMessage(
                deps.opCode.sMatchEnd,
                JSON.stringify(deps.wrapPayload({ round: state.stage.round })),
                null,
                null,
                true
            );
            return { state, data: JSON.stringify({ ok: true }) };
        }

        if (op === "chat") {
            const message = String(input?.message ?? "");
            const userId = input?.userId ?? "";

            if (message.startsWith("/") && userId) {
                const parts = message.substring(1).split(" ");
                const cmd = parts[0].toLowerCase();
                const args = parts.slice(1);

                const accounts = nk.accountsGetId([userId]);
                const account = accounts.length > 0 ? accounts[0] : null;
                const role = (account?.user?.metadata as any)?.role ?? "player";
                const isAdmin = role === "admin" || role === "developer";

                if (isAdmin) {
                    if (cmd === "kick" && args.length > 0) {
                        const targetName = args[0];
                        const target = Object.values(state.players).find(p => p.presence.username === targetName);
                        if (target) {
                            dispatcher.matchKick([target.presence]);
                            return { state, data: JSON.stringify({ ok: true }) };
                        }
                    }
                    if (cmd === "announce") {
                        dispatcher.broadcastMessage(
                            deps.opCode.cRoomChat,
                            JSON.stringify(deps.wrapPayload({
                                userId: "system",
                                username: "ANNOUNCEMENT",
                                message: args.join(" ")
                            })),
                            null,
                            null,
                            true
                        );
                        return { state, data: JSON.stringify({ ok: true }) };
                    }
                }
            }

            dispatcher.broadcastMessage(
                deps.opCode.cRoomChat,
                JSON.stringify(deps.wrapPayload({
                    userId: input?.userId ?? "",
                    username: input?.username ?? "",
                    message: input?.message ?? ""
                })),
                null,
                null,
                true
            );
            return { state, data: JSON.stringify({ ok: true }) };
        }

        return { state, data };
    };

    return { matchInit, matchJoinAttempt, matchJoin, matchLeave, matchTerminate, matchSignal };
};
