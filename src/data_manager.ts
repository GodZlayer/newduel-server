import { ZITEM_SERVER_DATA } from "./data/zitem_server";
import MAPS from "./data/maps.json";
import MAP_SPAWNS from "./data/map_spawns.json";
import MAP_WORLDITEMS from "./data/map_worlditems.json";
import GAMETYPECFG from "./data/gametypecfg.json";
import CHANNELRULE from "./data/channelrule.json";
import WORLDITEM from "./data/worlditem.json";
import NPCS from "./data/npcs.json";
import SKILLS from "./data/skills.json";
import QUESTS from "./data/quests.json";
let MAP_COLLISION: any = {};
import LEGACY_ITEM_EFFECTS from "./data/legacy_item_effects.json";
import LEGACY_EFFECTS from "./data/legacy_effects.json";
import MELEE_MOTION_TABLE from "./data/melee_motion_table.json";
import PROTOCOL from "../data/game/protocol.json";
import SHOP from "../data/game/shop.json";
import DROPTABLE from "../data/game/droptable.json";
import FORMULA from "../data/game/formula.json";
import QUESTMAP from "../data/game/questmap.json";
import SCENARIO from "../data/game/scenario.json";
import NPCSET from "../data/game/npcset.json";
import CHANNEL from "../data/game/channel.json";
import CHANNELRULE_GAME from "../data/game/channelrule.json";
import STRINGS from "../data/game/strings.json";
import STRINGS_LOCALES from "../data/game/strings_locales.json";
import MESSAGES from "../data/game/messages.json";
import TIPS from "../data/game/tips.json";
import SHUTDOWN from "../data/game/shutdown.json";
import NOTIFY from "../data/game/notify.json";
import CSERROR from "../data/game/cserror.json";
import EVENT from "../data/game/event.json";
import EVENT_LIST from "../data/game/event_list.json";
import GUNGAME from "../data/game/gungame.json";
import SPAWNS from "../data/game/spawns.json";
import SACRIFICE_TABLE from "../data/game/sacrifice_table.json";
import ZITEM_GAME from "../data/game/zitem.json";
import LADDER_STAT from "../data/game/ladder_stat.json";
import REPORT_QUESTMAP from "../data/game/report_questmap.json";
import MAPS_MANIFEST from "../data/game/maps_manifest.json";

let itemsCount = 0;
let mapsCount = 0;
let questsCount = 0;
let protocolCount = 0;
let shopCount = 0;
let droptableCount = 0;
let formulaCount = 0;
let worlditemCount = 0;
const shopSellSet = new Set<number>();
const GAME_DATA: Record<string, any> = {
    channel: CHANNEL,
    channelrule: CHANNELRULE_GAME,
    zitem: ZITEM_GAME,
    shop: SHOP,
    formula: FORMULA,
    droptable: DROPTABLE,
    worlditem: WORLDITEM,
    npc: NPCS,
    npcset: NPCSET,
    scenario: SCENARIO,
    questmap: QUESTMAP,
    spawns: SPAWNS,
    sacrifice_table: SACRIFICE_TABLE,
    strings: STRINGS,
    strings_locales: STRINGS_LOCALES,
    messages: MESSAGES,
    tips: TIPS,
    notify: NOTIFY,
    protocol: PROTOCOL,
    cserror: CSERROR,
    event: EVENT,
    event_list: EVENT_LIST,
    gungame: GUNGAME,
    ladder_stat: LADDER_STAT,
    report_questmap: REPORT_QUESTMAP,
    shutdown: SHUTDOWN,
    maps_manifest: MAPS_MANIFEST
};

export function loadGameData(nk: nkruntime.Nakama) {
    itemsCount = Object.keys(ZITEM_SERVER_DATA).length;
    mapsCount = Object.keys(MAPS).length;
    questsCount = 1;
    protocolCount = Object.keys((PROTOCOL as any)?.commands ?? {}).length;
    shopCount = Number((SHOP as any)?.count ?? 0);
    droptableCount = Number((DROPTABLE as any)?.count ?? 0);
    formulaCount = Number((FORMULA as any)?.count ?? 0);
    worlditemCount = Number((WORLDITEM as any)?.items?.length ?? 0);
    shopSellSet.clear();
    for (const entry of ((SHOP as any)?.sell ?? [])) {
        const id = Number(entry?.itemid);
        if (Number.isFinite(id)) shopSellSet.add(id);
    }

    try {
        const collisionData = nk.fileRead("game/map_collision.json");
        if (collisionData) {
            MAP_COLLISION = JSON.parse(collisionData);
        }
    } catch (e) {
        // Fallback or log error if needed
    }
}

export function getMapById(mapId: number) {
    const entry = (MAPS as Record<string, any>)[String(mapId)];
    return entry || null;
}

export function getQuestMapsetByName(name: string) {
    const mapsets = (QUESTMAP as any)?.mapsets ?? [];
    return mapsets.find((m: any) => (m?.title ?? "").toLowerCase() === name.toLowerCase()) ?? null;
}

export function getScenarioForMapset(name: string, ql: number) {
    const list = (SCENARIO as any)?.scenarios ?? [];
    return list.find((s: any) => Number(s?.QL) === ql && (s?.mapset ?? "").toLowerCase() === name.toLowerCase()) ?? null;
}

export function getNpcSetByName(name: string) {
    const sets = (NPCSET as any)?.sets ?? [];
    return sets.find((s: any) => (s?.name ?? "").toLowerCase() === name.toLowerCase()) ?? null;
}

const getMapByNameLower = (nameLower: string) => {
    const entries = MAPS as Record<string, any>;
    for (const key of Object.keys(entries)) {
        const entry = entries[key];
        if ((entry?.name ?? "").toLowerCase() === nameLower) return entry;
    }
    return null;
};

export function getMapSpawn(mapId: number, team: number, teamMode: boolean) {
    const entry = getMapById(mapId);
    if (!entry) return { x: 0, y: 0, z: 0 };
    const spawns = (MAP_SPAWNS as Record<string, any>)[entry.name];
    if (!spawns) return { x: 0, y: 0, z: 0 };

    let list: Array<{ x: number; y: number; z: number }> = spawns.solo || [];
    if (teamMode) {
        if (team === 1 && spawns.team1?.length) list = spawns.team1;
        else if (team === 2 && spawns.team2?.length) list = spawns.team2;
        else if (spawns.solo?.length) list = spawns.solo;
        else if (spawns.team1?.length) list = spawns.team1;
        else if (spawns.team2?.length) list = spawns.team2;
    }
    if (!list || list.length === 0) return { x: 0, y: 0, z: 0 };
    const pick = list[Math.floor(Math.random() * list.length)];
    return pick || { x: 0, y: 0, z: 0 };
}

export function getWorldItemSpawns(mapId: number, teamMode: boolean) {
    const entry = getMapById(mapId);
    if (!entry) return [];
    const mapItems = (MAP_WORLDITEMS as Record<string, any>)[entry.name];
    if (!mapItems) return [];
    const list = teamMode ? (mapItems.team ?? []) : (mapItems.solo ?? []);
    return Array.isArray(list) ? list : [];
}

export function getWorldItemDesc(name: string) {
    const items = (WORLDITEM as any)?.items ?? [];
    const item = items.find((i: any) => (i?.name ?? "").toLowerCase() === String(name).toLowerCase());
    return item ?? null;
}

export function getWorldItemDescByModel(modelName: string) {
    const items = (WORLDITEM as any)?.items ?? [];
    const item = items.find((i: any) => (i?.modelname ?? "").toLowerCase() === String(modelName).toLowerCase());
    return item ?? null;
}

export function getLegacyItemEffect(itemId: number) {
    return (LEGACY_ITEM_EFFECTS as any)[String(itemId)] ?? null;
}

export function getLegacyEffectById(effectId: number) {
    return (LEGACY_EFFECTS as any)[String(effectId)] ?? null;
}

export function getMeleeMotionTable() {
    return (MELEE_MOTION_TABLE as any) ?? {};
}

export function getGameTypeConfig(gameTypeId: number) {
    const data = (GAMETYPECFG as any)?.data?.GAMETYPE ?? [];
    const entry = data.find((gt: any) => Number(gt?.["@"]?.id) === gameTypeId);
    if (!entry) return null;
    const maxPlayers = (entry.MAXPLAYERS ?? [])
        .map((mp: any) => Number(mp?.["@"]?.player))
        .filter((v: number) => Number.isFinite(v));
    const defaultEntry = (entry.MAXPLAYERS ?? []).find((mp: any) => mp?.["@"]?.default === "true");
    const defaultMax = defaultEntry ? Number(defaultEntry?.["@"]?.player) : (maxPlayers[0] ?? null);
    const rounds = (entry.ROUNDS ?? [])
        .map((r: any) => Number(r?.["@"]?.round))
        .filter((v: number) => Number.isFinite(v));
    const defaultRoundEntry = (entry.ROUNDS ?? []).find((r: any) => r?.["@"]?.default === "true");
    const defaultRound = defaultRoundEntry ? Number(defaultRoundEntry?.["@"]?.round) : (rounds[0] ?? null);
    const timeLimitsSec = (entry.LIMITTIME ?? [])
        .map((t: any) => Number(t?.["@"]?.sec))
        .filter((v: number) => Number.isFinite(v))
        .map((v: number) => {
            if (v >= 99999) return 0;
            if (v <= 300) return v * 60;
            return v;
        });
    const defaultTimeEntry = (entry.LIMITTIME ?? []).find((t: any) => t?.["@"]?.default === "true");
    const defaultTimeRaw = defaultTimeEntry ? Number(defaultTimeEntry?.["@"]?.sec) : (timeLimitsSec[0] ?? 0);
    const defaultTimeSec = Number.isFinite(defaultTimeRaw)
        ? (defaultTimeRaw >= 99999 ? 0 : (defaultTimeRaw <= 300 ? defaultTimeRaw * 60 : defaultTimeRaw))
        : 0;
    return {
        id: gameTypeId,
        maxPlayers,
        defaultMaxPlayers: defaultMax,
        rounds,
        defaultRound,
        timeLimitsSec,
        defaultTimeSec
    };
}

export function getChannelRule(ruleName: string) {
    const rules = (CHANNELRULE as any)?.rules ?? [];
    const entry = rules.find((r: any) => (r?.name ?? "").toLowerCase() === ruleName.toLowerCase());
    if (!entry) return null;
    const mapSet = new Set(
        (entry.maps ?? [])
            .map((m: any) => String(m?.name ?? "").toLowerCase())
            .filter((n: string) => n)
            .filter((n: string) => {
                const map = getMapByNameLower(n);
                return map && map.available !== false;
            })
    );
    const gametypeSet = new Set(
        (entry.gametypes ?? []).map((g: any) => Number(g?.id)).filter((n: number) => Number.isFinite(n))
    );
    return {
        name: entry.name,
        maps: mapSet,
        gametypes: gametypeSet
    };
}

export function getDataCounts() {
    return {
        items: itemsCount,
        maps: mapsCount,
        quests: questsCount,
        protocol: protocolCount,
        shop: shopCount,
        droptable: droptableCount,
        formula: formulaCount,
        worlditem: worlditemCount
    };
}

export function getProtocolData() {
    return PROTOCOL as any;
}

export function getGameData(key?: string) {
    if (!key) return GAME_DATA;
    return GAME_DATA[key] ?? null;
}

export function getShopData() {
    return SHOP as any;
}

export function isShopItem(itemId: number) {
    return shopSellSet.has(itemId);
}

export function getDropTableData() {
    return DROPTABLE as any;
}

export function getFormulaData() {
    return FORMULA as any;
}

export function getItemData(id: string) {
    return ZITEM_SERVER_DATA[id] || null;
}

export function getAllItems() {
    return ZITEM_SERVER_DATA;
}

export function getNpcTemplate(id: number) {
    return (NPCS as Record<string, any>)[String(id)] ?? null;
}

export function getSkillTemplate(id: number) {
    return (SKILLS as Record<string, any>)[String(id)] ?? null;
}

export function getQuestByMap(mapId: number) {
    const entries = QUESTS as Record<string, any>;
    for (const key of Object.keys(entries)) {
        const quest = entries[key];
        if (Number(quest?.map_id) === mapId) return quest;
    }
    return null;
}

export function getMapCollision(mapId: number) {
    const entry = getMapById(mapId);
    if (!entry) return null;
    return (MAP_COLLISION as Record<string, any>)[entry.name] ?? null;
}

export function getMapsCatalog() {
    return MAPS as Record<string, any>;
}

export function getGameTypeConfigData() {
    return GAMETYPECFG as any;
}
