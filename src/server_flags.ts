export type ServerFeatureFlags = {
    enableV2Bootstrap: boolean;
    enableMapRecipe: boolean;
    enforceRecipeHash: boolean;
};

const DEFAULT_FLAGS: ServerFeatureFlags = {
    enableV2Bootstrap: true,
    enableMapRecipe: true,
    enforceRecipeHash: false
};

let cachedFlags: ServerFeatureFlags | null = null;

const parseBool = (value: any, fallback: boolean): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        const v = value.trim().toLowerCase();
        if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
        if (v === "false" || v === "0" || v === "no" || v === "off") return false;
    }
    return fallback;
};

const normalizeFlags = (raw: any): ServerFeatureFlags => {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
        enableV2Bootstrap: parseBool(
            source.enableV2Bootstrap ?? source.enable_v2_bootstrap,
            DEFAULT_FLAGS.enableV2Bootstrap
        ),
        enableMapRecipe: parseBool(
            source.enableMapRecipe ?? source.enable_map_recipe,
            DEFAULT_FLAGS.enableMapRecipe
        ),
        enforceRecipeHash: parseBool(
            source.enforceRecipeHash ?? source.enforce_recipe_hash,
            DEFAULT_FLAGS.enforceRecipeHash
        )
    };
};

export const getServerFeatureFlags = (nk?: nkruntime.Nakama, forceReload = false): ServerFeatureFlags => {
    if (cachedFlags && !forceReload) return { ...cachedFlags };

    let flags = { ...DEFAULT_FLAGS };
    if (nk) {
        try {
            const raw = nk.fileRead("game/feature_flags.json");
            if (raw) {
                const parsed = JSON.parse(raw);
                flags = normalizeFlags(parsed);
            }
        } catch (_) {
            // Keep defaults if file is missing or invalid.
        }
    }

    cachedFlags = flags;
    return { ...flags };
};
