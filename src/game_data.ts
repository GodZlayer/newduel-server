import { getGameData } from "./data_manager";

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

export const rpcGetGameData: nkruntime.RpcFunction = (ctx, logger, nk, payload: string): string => {
    const input = parsePayload(payload);
    const key = typeof input?.key === "string" ? input.key : null;
    return JSON.stringify({ data: getGameData(key ?? undefined) });
};

const makeGetter = (key: string): nkruntime.RpcFunction => {
    return () => JSON.stringify({ data: getGameData(key) });
};

export const rpcGetChannel = makeGetter("channel");
export const rpcGetChannelrule = makeGetter("channelrule");
export const rpcGetZitem = makeGetter("zitem");
export const rpcGetShop = makeGetter("shop");
export const rpcGetFormula = makeGetter("formula");
export const rpcGetDroptable = makeGetter("droptable");
export const rpcGetWorlditem = makeGetter("worlditem");
export const rpcGetNpc = makeGetter("npc");
export const rpcGetNpcset = makeGetter("npcset");
export const rpcGetScenario = makeGetter("scenario");
export const rpcGetQuestmap = makeGetter("questmap");
export const rpcGetSpawns = makeGetter("spawns");
export const rpcGetSacrificeTable = makeGetter("sacrifice_table");
export const rpcGetStrings = makeGetter("strings");
export const rpcGetStringsLocales = makeGetter("strings_locales");
export const rpcGetMessages = makeGetter("messages");
export const rpcGetTips = makeGetter("tips");
export const rpcGetNotify = makeGetter("notify");
export const rpcGetProtocol = makeGetter("protocol");
export const rpcGetCserror = makeGetter("cserror");
export const rpcGetEvent = makeGetter("event");
export const rpcGetEventList = makeGetter("event_list");
export const rpcGetGungame = makeGetter("gungame");
export const rpcGetLadderStat = makeGetter("ladder_stat");
export const rpcGetReportQuestmap = makeGetter("report_questmap");
export const rpcGetShutdown = makeGetter("shutdown");
export const rpcGetMapsManifest = makeGetter("maps_manifest");
