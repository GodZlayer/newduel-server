import { buildBootstrapV2Payload } from "./bootstrap_v2";
import { getMapById, getMapCollision } from "./data_manager";
import { hashObject } from "./hash_utils";
import { getServerFeatureFlags } from "./server_flags";

type MapRecipeInput = {
    mapId?: number;
    gameTypeId?: number;
    modeProfile?: string;
    seed?: number;
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

const stringSeed = (text: string): number => {
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
};

export const resolveMapRecipe = (nk: nkruntime.Nakama, input: MapRecipeInput) => {
    const mapId = Number(input?.mapId ?? 0);
    const gameTypeId = Number(input?.gameTypeId ?? 0);
    const modeProfile = normalizeModeProfile(input?.modeProfile);
    const map = getMapById(mapId);
    if (!map) throw new Error("mapId invalido para recipe.");
    if (map.available === false) throw new Error("Mapa indisponivel para recipe.");

    const seed = Number.isFinite(input?.seed as number)
        ? ((Number(input?.seed) >>> 0) || 0)
        : stringSeed(`${mapId}:${gameTypeId}:${modeProfile}`);

    const generatorId = "rs3_seed_profile_v1";
    const generatorVersion = "1.0.0";
    const collision = getMapCollision(mapId);
    const collisionHash = hashObject(collision ?? {});
    const recipeParams = {
        profile: modeProfile,
        spawnPolicy: "server_spawns_v1",
        collisionModel: collision ? "server_collision_v1" : "none"
    };

    const recipeCore = {
        generatorId,
        generatorVersion,
        mapId,
        gameTypeId,
        modeProfile,
        seed,
        recipeParams,
        collisionHash
    };
    const recipeHash = hashObject(recipeCore);
    const bootstrap = buildBootstrapV2Payload(nk);

    return {
        ...recipeCore,
        recipeHash,
        contentVersion: bootstrap.contentVersion,
        contentHash: bootstrap.contentHash
    };
};

export const rpcGetMapRecipeV2: nkruntime.RpcFunction = (_ctx, _logger, nk, payload: string): string => {
    const flags = getServerFeatureFlags(nk);
    if (!flags.enableMapRecipe) {
        return JSON.stringify({
            ok: false,
            reason: "map_recipe_v2_disabled",
            compat: { v1: true, v2: false }
        });
    }

    const input = parsePayload(payload);
    const recipe = resolveMapRecipe(nk, input);
    return JSON.stringify({
        ok: true,
        ...recipe
    });
};
