import { getChannelRule, getGameTypeConfig, getMapById } from "./data_manager";

import { resolveMapRecipe } from "./map_recipe_v2";

type StageCreatePayload = {
    name?: string;
    mapId?: number;
    mode?: string;
    modeProfile?: string;
    gameTypeId?: number;
    maxPlayers?: number;
    round?: number;
    limitTimeSec?: number;
    limitTime?: number;
    password?: string;
    teamMode?: boolean;
    channelRule?: string;
    rule?: string;
};

type StageResolved = {
    name: string;
    mapId: number;
    mapName: string;
    mode: string;
    modeProfile: string;
    gameTypeId: number;
    maxPlayers: number;
    roundLimit: number;
    timeLimitSec: number;
    password: string;
    teamMode: boolean;
    channelRule: string;
};

const GAME_TYPE_INFO: Record<number, { mode: string; teamMode: boolean }> = {
    0: { mode: "DM", teamMode: false },
    1: { mode: "TDM", teamMode: true },
    2: { mode: "GL", teamMode: false },
    3: { mode: "TGL", teamMode: true },
    4: { mode: "ASSASSINATE", teamMode: true },
    5: { mode: "TRAIN", teamMode: false },
    6: { mode: "SURVIVAL", teamMode: false },
    7: { mode: "QUEST", teamMode: false },
    8: { mode: "BERSERKER", teamMode: false },
    9: { mode: "TDM2", teamMode: true },
    10: { mode: "DUEL", teamMode: false }
};

const parsePayload = (payload: string): any => {
    let input: any = {};
    try {
        input = payload ? JSON.parse(payload) : {};
    } catch {
        input = {};
    }
    if (typeof input === "string") {
        try {
            input = JSON.parse(input);
        } catch {
            input = {};
        }
    }
    return input;
};

const normalizeModeProfile = (raw: any): string => {
    const value = String(raw ?? "").trim().toLowerCase();
    if (!value) return "classic";
    const clean = value.replace(/[^a-z0-9_\-]/g, "");
    return clean || "classic";
};

const resolveStageConfig = (input: StageCreatePayload): StageResolved => {
    const name = (input?.name ?? "Room").toString();
    const mapId = Number.isFinite(input?.mapId as number) ? (input?.mapId as number) : 0;
    const gameTypeId = Number.isFinite(input?.gameTypeId as number) ? (input?.gameTypeId as number) : 0;
    const password = typeof input?.password === "string" ? input.password : "";
    const channelRule = (input?.channelRule ?? input?.rule ?? "free_all_maps").toString();

    const map = getMapById(mapId);
    if (!map) throw new Error("mapId inválido.");
    if (map.available === false) throw new Error("Mapa indisponível.");

    const rule = getChannelRule(channelRule);
    if (!rule) throw new Error("channelRule inválido.");
    if (!rule.maps.has(String(map.name).toLowerCase())) {
        throw new Error("Mapa não permitido no canal.");
    }
    if (!rule.gametypes.has(gameTypeId)) {
        throw new Error("GameType não permitido no canal.");
    }

    const gt = getGameTypeConfig(gameTypeId);
    if (!gt || !gt.maxPlayers || gt.maxPlayers.length === 0) {
        throw new Error("GameType inválido.");
    }

    const requestedMax = Number.isFinite(input?.maxPlayers as number) ? (input?.maxPlayers as number) : gt.defaultMaxPlayers;
    const maxPlayers = requestedMax ?? gt.maxPlayers[0];
    if (!gt.maxPlayers.includes(maxPlayers)) {
        throw new Error("maxPlayers inválido para o modo.");
    }
    if (maxPlayers > map.max_players) {
        throw new Error("maxPlayers excede o limite do mapa.");
    }

    const info = GAME_TYPE_INFO[gameTypeId] ?? { mode: `GT_${gameTypeId}`, teamMode: false };
    const mode = (input?.mode ?? info.mode).toString();
    const teamMode = typeof input?.teamMode === "boolean" ? input.teamMode : info.teamMode;
    const requestedRound = Number.isFinite(input?.round as number) ? (input?.round as number) : gt.defaultRound;
    const roundLimit = Number.isFinite(requestedRound as number) ? (requestedRound as number) : (gt.defaultRound ?? 0);
    if (gt.rounds && gt.rounds.length > 0 && roundLimit && !gt.rounds.includes(roundLimit)) {
        throw new Error("round inválido para o modo.");
    }
    const normalizeTimeLimit = (value: number) => {
        if (!Number.isFinite(value)) return 0;
        if (value >= 99999) return 0;
        if (value <= 300) return value * 60;
        return value;
    };
    const inputLimit = Number.isFinite(input?.limitTimeSec as number) ? (input?.limitTimeSec as number)
        : (Number.isFinite(input?.limitTime as number) ? (input?.limitTime as number) : gt.defaultTimeSec);
    const timeLimitSec = normalizeTimeLimit(Number.isFinite(inputLimit as number) ? (inputLimit as number) : (gt.defaultTimeSec ?? 0));
    if (gt.timeLimitsSec && gt.timeLimitsSec.length > 0 && timeLimitSec && !gt.timeLimitsSec.includes(timeLimitSec)) {
        throw new Error("limitTime inválido para o modo.");
    }

    return {
        name,
        mapId,
        mapName: map.name,
        mode,
        modeProfile: normalizeModeProfile(input?.modeProfile),
        gameTypeId,
        maxPlayers,
        roundLimit,
        timeLimitSec,
        password,
        teamMode,
        channelRule
    };
};

export const rpcListStages: nkruntime.RpcFunction = (ctx, logger, nk, payload): string => {
    const input = parsePayload(payload);
    const limit = Math.min(100, Math.max(1, Number.isFinite(input?.limit) ? input.limit : 50));
    const offset = Math.max(0, Number.isFinite(input?.offset) ? input.offset : 0);
    const minSize = Number.isFinite(input?.minSize) ? input.minSize : null;
    const maxSize = Number.isFinite(input?.maxSize) ? input.maxSize : null;
    const mode = typeof input?.mode === "string" ? input.mode : null;
    const mapId = Number.isFinite(input?.mapId) ? input.mapId : null;
    const gameTypeId = Number.isFinite(input?.gameTypeId) ? input.gameTypeId : null;
    const hasPassword = typeof input?.hasPassword === "boolean" ? input.hasPassword : null;
    const nameQuery = typeof input?.name === "string" ? input.name : null;
    const sort = typeof input?.sort === "string" ? input.sort : "size_desc";
    const rawQuery = typeof input?.query === "string" ? input.query : null;

    const maxFetch = Math.min(200, offset + limit);
    const matches = nk.matchList(maxFetch, true, null, minSize, maxSize, rawQuery);
    const stages = matches.map(m => {
        let label: any = {};
        try {
            label = m.label ? JSON.parse(m.label) : {};
        } catch {
            label = {};
        }
        return {
            matchId: m.matchId,
            size: m.size,
            label
        };
    });

    let filtered = stages;
    if (mode) {
        filtered = filtered.filter(s => (s.label?.mode ?? "").toString().toLowerCase() === mode.toLowerCase());
    }
    if (mapId !== null) {
        filtered = filtered.filter(s => Number(s.label?.mapId) === mapId);
    }
    if (gameTypeId !== null) {
        filtered = filtered.filter(s => Number(s.label?.gameTypeId) === gameTypeId);
    }
    if (hasPassword !== null) {
        filtered = filtered.filter(s => !!s.label?.hasPassword === hasPassword);
    }
    if (nameQuery) {
        const q = nameQuery.toLowerCase();
        filtered = filtered.filter(s => (s.label?.name ?? "").toString().toLowerCase().includes(q));
    }

    switch (sort) {
        case "size_asc":
            filtered = filtered.sort((a, b) => a.size - b.size);
            break;
        case "name_asc":
            filtered = filtered.sort((a, b) => (a.label?.name ?? "").localeCompare(b.label?.name ?? ""));
            break;
        case "name_desc":
            filtered = filtered.sort((a, b) => (b.label?.name ?? "").localeCompare(a.label?.name ?? ""));
            break;
        case "map_asc":
            filtered = filtered.sort((a, b) => Number(a.label?.mapId) - Number(b.label?.mapId));
            break;
        case "map_desc":
            filtered = filtered.sort((a, b) => Number(b.label?.mapId) - Number(a.label?.mapId));
            break;
        case "size_desc":
        default:
            filtered = filtered.sort((a, b) => b.size - a.size);
            break;
    }

    const paged = filtered.slice(offset, offset + limit);
    return JSON.stringify({ total: filtered.length, offset, limit, stages: paged });
};

export const rpcCreateStage: nkruntime.RpcFunction = (ctx, logger, nk, payload): string => {
    const input = parsePayload(payload) as StageCreatePayload;
    const resolved = resolveStageConfig(input);
    const recipe = resolveMapRecipe(nk, {
        mapId: resolved.mapId,
        gameTypeId: resolved.gameTypeId,
        modeProfile: resolved.modeProfile
    });

    const matchId = nk.matchCreate("match_handler", {
        name: resolved.name,
        mapId: resolved.mapId,
        mode: resolved.mode,
        modeProfile: resolved.modeProfile,
        gameTypeId: resolved.gameTypeId,
        maxPlayers: resolved.maxPlayers,
        roundLimit: resolved.roundLimit,
        timeLimitSec: resolved.timeLimitSec,
        password: resolved.password,
        teamMode: resolved.teamMode,
        channelRule: resolved.channelRule,
        seed: recipe.seed,
        recipeHash: recipe.recipeHash,
        contentVersion: recipe.contentVersion,
        contentHash: recipe.contentHash,
        generatorId: recipe.generatorId,
        generatorVersion: recipe.generatorVersion,
        collisionHash: recipe.collisionHash
    });

    return JSON.stringify({
        matchId,
        name: resolved.name,
        mapId: resolved.mapId,
        mode: resolved.mode,
        modeProfile: resolved.modeProfile,
        gameTypeId: resolved.gameTypeId,
        maxPlayers: resolved.maxPlayers,
        roundLimit: resolved.roundLimit,
        timeLimitSec: resolved.timeLimitSec,
        hasPassword: !!resolved.password,
        seed: recipe.seed,
        recipeHash: recipe.recipeHash,
        contentVersion: recipe.contentVersion,
        contentHash: recipe.contentHash,
        generatorId: recipe.generatorId,
        generatorVersion: recipe.generatorVersion
    });
};

export const rpcJoinStage: nkruntime.RpcFunction = (ctx, logger, nk, payload): string => {
    const input = parsePayload(payload);
    const matchId = input?.matchId;
    if (!matchId) throw new Error("matchId é obrigatório.");
    const match = nk.matchGet(matchId);
    if (!match) throw new Error("matchId não encontrado.");
    // Password validation ocorre no matchJoinAttempt via metadata do socket RT.
    return JSON.stringify({ ok: true, matchId });
};

export const rpcRequestStageState: nkruntime.RpcFunction = (ctx, logger, nk, payload): string => {
    const input = parsePayload(payload);
    const matchId = input?.matchId;
    if (!matchId) throw new Error("matchId é obrigatório.");
    const response = nk.matchSignal(matchId, JSON.stringify({ op: "get_state" }));
    return response ?? "{}";
};

export const rpcSetReady: nkruntime.RpcFunction = (ctx, logger, nk, payload): string => {
    const input = parsePayload(payload);
    const matchId = input?.matchId;
    const ready = !!input?.ready;
    if (!matchId) throw new Error("matchId é obrigatório.");
    const response = nk.matchSignal(matchId, JSON.stringify({ op: "set_ready", userId: ctx.userId, ready }));
    return response ?? "{}";
};

export const rpcSetTeam: nkruntime.RpcFunction = (ctx, logger, nk, payload): string => {
    const input = parsePayload(payload);
    const matchId = input?.matchId;
    const team = Number.isFinite(input?.team as number) ? (input?.team as number) : 0;
    if (!matchId) throw new Error("matchId é obrigatório.");
    const response = nk.matchSignal(matchId, JSON.stringify({ op: "set_team", userId: ctx.userId, team }));
    return response ?? "{}";
};

export const rpcStageUpdate: nkruntime.RpcFunction = (ctx, logger, nk, payload): string => {
    const input = parsePayload(payload);
    const matchId = input?.matchId;
    if (!matchId) throw new Error("matchId é obrigatório.");
    const currentRaw = nk.matchSignal(matchId, JSON.stringify({ op: "get_state" })) ?? "{}";
    let current: any = {};
    try { current = JSON.parse(currentRaw); } catch { current = {}; }
    const stage = current?.stage ?? {};

    const resolved = resolveStageConfig({
        name: input?.name ?? stage?.name,
        mapId: Number.isFinite(input?.mapId) ? input.mapId : stage?.mapId,
        mode: input?.mode ?? stage?.mode,
        modeProfile: input?.modeProfile ?? stage?.modeProfile,
        gameTypeId: Number.isFinite(input?.gameTypeId) ? input.gameTypeId : stage?.gameTypeId,
        maxPlayers: Number.isFinite(input?.maxPlayers) ? input.maxPlayers : stage?.maxPlayers,
        round: Number.isFinite(input?.round) ? input.round : stage?.roundLimit,
        limitTimeSec: Number.isFinite(input?.limitTimeSec) ? input.limitTimeSec : stage?.timeLimitSec,
        limitTime: Number.isFinite(input?.limitTime) ? input.limitTime : stage?.timeLimitSec,
        password: typeof input?.password === "string" ? input.password : stage?.password,
        teamMode: typeof input?.teamMode === "boolean" ? input.teamMode : stage?.teamMode,
        channelRule: input?.channelRule ?? input?.rule ?? stage?.channelRule
    });
    const recipe = resolveMapRecipe(nk, {
        mapId: resolved.mapId,
        gameTypeId: resolved.gameTypeId,
        modeProfile: resolved.modeProfile
    });

    const response = nk.matchSignal(matchId, JSON.stringify({
        op: "update_stage",
        userId: ctx.userId,
        name: resolved.name,
        mapId: resolved.mapId,
        mode: resolved.mode,
        modeProfile: resolved.modeProfile,
        gameTypeId: resolved.gameTypeId,
        maxPlayers: resolved.maxPlayers,
        roundLimit: resolved.roundLimit,
        timeLimitSec: resolved.timeLimitSec,
        password: resolved.password,
        teamMode: resolved.teamMode,
        channelRule: resolved.channelRule,
        seed: recipe.seed,
        recipeHash: recipe.recipeHash,
        contentVersion: recipe.contentVersion,
        contentHash: recipe.contentHash,
        generatorId: recipe.generatorId,
        generatorVersion: recipe.generatorVersion,
        collisionHash: recipe.collisionHash
    }));
    return response ?? "{}";
};

export const rpcStageChat: nkruntime.RpcFunction = (ctx, logger, nk, payload): string => {
    const input = parsePayload(payload);
    const matchId = input?.matchId;
    const message = input?.message ?? "";
    if (!matchId) throw new Error("matchId é obrigatório.");
    const response = nk.matchSignal(matchId, JSON.stringify({
        op: "chat",
        userId: ctx.userId,
        username: ctx.username ?? "",
        message
    }));
    return response ?? "{}";
};

export const rpcStartStage: nkruntime.RpcFunction = (ctx, logger, nk, payload): string => {
    const input = parsePayload(payload);
    const matchId = input?.matchId;
    if (!matchId) throw new Error("matchId é obrigatório.");
    const response = nk.matchSignal(matchId, JSON.stringify({ op: "start", userId: ctx.userId }));
    return response ?? "{}";
};

export const rpcEndStage: nkruntime.RpcFunction = (ctx, logger, nk, payload): string => {
    const input = parsePayload(payload);
    const matchId = input?.matchId;
    if (!matchId) throw new Error("matchId é obrigatório.");
    const response = nk.matchSignal(matchId, JSON.stringify({ op: "end", userId: ctx.userId }));
    return response ?? "{}";
};

