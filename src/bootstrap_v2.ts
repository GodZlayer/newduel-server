import { getGameData, getGameTypeConfigData, getMapsCatalog } from "./data_manager";
import { hashObject } from "./hash_utils";
import { getServerFeatureFlags } from "./server_flags";

let cachedBootstrapSignature: string | null = null;
let cachedBootstrapPayload: any | null = null;

const asArray = <T = any>(value: any): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (value === null || value === undefined) return [];
    return [value as T];
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

const buildMapList = () => {
    const rawMaps = getMapsCatalog();
    const maps = rawMaps && typeof rawMaps === "object" ? (rawMaps as Record<string, any>) : {};
    const out: any[] = [];
    for (const key of Object.keys(maps)) {
        const map = maps[key] ?? {};
        out.push({
            id: Number(map.id),
            name: String(map.name ?? ""),
            maxPlayers: Number(map.max_players ?? 16),
            modes: Array.isArray(map.modes) ? map.modes : [],
            available: map.available !== false
        });
    }
    out.sort((a, b) => a.id - b.id);
    return out;
};

const buildGameTypeList = () => {
    const gt = getGameTypeConfigData();
    const rows = asArray<any>((gt as any)?.data?.GAMETYPE);
    return rows.map((entry: any) => {
        const maxPlayers = asArray<any>(entry?.MAXPLAYERS)
            .map((mp: any) => Number(mp?.["@"]?.player))
            .filter((v: number) => Number.isFinite(v));
        const rounds = asArray<any>(entry?.ROUNDS)
            .map((r: any) => Number(r?.["@"]?.round))
            .filter((v: number) => Number.isFinite(v));
        const timeLimits = asArray<any>(entry?.LIMITTIME)
            .map((t: any) => Number(t?.["@"]?.sec))
            .filter((v: number) => Number.isFinite(v));
        return {
            id: Number(entry?.["@"]?.id ?? -1),
            maxPlayers,
            rounds,
            timeLimits
        };
    });
};

const buildChannelRules = () => {
    const data = getGameData("channelrule") as any;
    const rules = asArray<any>(data?.rules);
    return rules.map((rule: any) => ({
        name: String(rule?.name ?? ""),
        maps: asArray<any>(rule?.maps).map((m: any) => String(m?.name ?? "")),
        gametypes: asArray<any>(rule?.gametypes)
            .map((g: any) => Number(g?.id))
            .filter((v: number) => Number.isFinite(v))
    }));
};

const buildCharacterCreateProfile = () => ({
    maxNameLength: 16,
    slotsPerAccount: 4,
    sexValues: [0, 1],
    faceValues: [0, 1, 2, 3],
    hairValues: [0],
    costumeValues: [0, 1, 2]
});

export const buildBootstrapV2Payload = (nk: nkruntime.Nakama) => {
    const flags = getServerFeatureFlags(nk);
    const cacheSignature = [
        flags.enableV2Bootstrap ? "1" : "0",
        flags.enableMapRecipe ? "1" : "0",
        flags.enforceRecipeHash ? "1" : "0"
    ].join(":");
    if (cachedBootstrapPayload && cachedBootstrapSignature === cacheSignature) {
        return cachedBootstrapPayload;
    }

    const maps = buildMapList();
    const gameTypes = buildGameTypeList();
    const channelRules = buildChannelRules();
    const characterCreate = buildCharacterCreateProfile();
    const serverProfile = {
        rtVersion: 1,
        tickRate: 20,
        modeProfiles: ["classic", "duel", "quest", "training"]
    };

    const contentCore = {
        maps,
        gameTypes,
        channelRules,
        characterCreate,
        serverProfile
    };
    const contentHash = hashObject(contentCore);
    const contentVersion = `v2-${contentHash}`;

    const payload = {
        compat: { v1: true, v2: true },
        flags: {
            enableV2Bootstrap: flags.enableV2Bootstrap,
            enableMapRecipe: flags.enableMapRecipe,
            enforceRecipeHash: flags.enforceRecipeHash
        },
        contentVersion,
        contentHash,
        maps,
        gameTypes,
        channelRules,
        characterCreate,
        serverProfile
    };

    cachedBootstrapSignature = cacheSignature;
    cachedBootstrapPayload = payload;
    return payload;
};

export const rpcGetBootstrapV2: nkruntime.RpcFunction = (_ctx, _logger, nk, payload: string): string => {
    const input = parsePayload(payload);
    const flags = getServerFeatureFlags(nk);
    if (!flags.enableV2Bootstrap) {
        return JSON.stringify({
            ok: false,
            reason: "bootstrap_v2_disabled",
            compat: { v1: true, v2: false }
        });
    }

    const bootstrap = buildBootstrapV2Payload(nk);
    return JSON.stringify({
        ok: true,
        clientVersion: input?.clientVersion ?? "",
        rtVersion: input?.rtVersion ?? 1,
        ...bootstrap
    });
};
