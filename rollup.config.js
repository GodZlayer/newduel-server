import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: 'src/main.ts',
  external: ['nakama-runtime'],
  output: {
    file: 'data/modules/main.js',
    format: 'iife', 
    name: 'MainBundle',
    exports: 'named',
    footer: `
// Pontes de função RPC (Satisfazendo Nakama 3.x Goja)
var rpcServerAnnounce = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcServerAnnounce); };
var rpcGetAdminStats = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetAdminStats); };
var rpcAdminListUsers = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcAdminListUsers); };
var rpcAdminKickUsers = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcAdminKickUsers); };
var rpcAdminBanUsers = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcAdminBanUsers); };
var rpcLogout = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcLogout); };
var SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000;
var SESSION_IDLE_COLLECTION = "session_idle";
var sessionIdleRead = function(ctx, nk) {
    if (!ctx || !ctx.userId || !ctx.sessionId) return null;
    try {
        var rows = nk.storageRead([{ collection: SESSION_IDLE_COLLECTION, key: ctx.sessionId, userId: ctx.userId }]);
        if (!rows || rows.length === 0 || !rows[0].value) return null;
        var raw = rows[0].value;
        var last = Number(raw.lastActiveMs || raw.last_active_ms || 0);
        return Number.isFinite(last) && last > 0 ? last : null;
    } catch (_e) {
        return null;
    }
};
var sessionIdleTouch = function(ctx, nk) {
    if (!ctx || !ctx.userId || !ctx.sessionId) return;
    try {
        nk.storageWrite([{
            collection: SESSION_IDLE_COLLECTION,
            key: ctx.sessionId,
            userId: ctx.userId,
            value: { lastActiveMs: Date.now() },
            permissionRead: 0,
            permissionWrite: 0
        }]);
    } catch (_e) {}
};
var sessionIdleDelete = function(ctx, nk) {
    if (!ctx || !ctx.userId || !ctx.sessionId) return;
    try {
        nk.storageDelete([{ collection: SESSION_IDLE_COLLECTION, key: ctx.sessionId, userId: ctx.userId }]);
    } catch (_e) {}
};
var invokeRpcWithIdle = function(ctx, logger, nk, payload, fn) {
    if (fn !== MainBundle.rpcLogout) {
        var last = sessionIdleRead(ctx, nk);
        if (last && (Date.now() - last) > SESSION_IDLE_TIMEOUT_MS) {
            sessionIdleDelete(ctx, nk);
            if (ctx && ctx.sessionId) {
                try { nk.sessionDisconnect(ctx.sessionId); } catch (_e) {}
            }
            throw new Error("session idle timeout");
        }
    }
    var out = fn(ctx, logger, nk, payload);
    sessionIdleTouch(ctx, nk);
    return out;
};
var rpcCreateCharacter = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcCreateCharacter); };
var rpcListCharacters = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcListCharacters); };
var rpcDeleteCharacter = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcDeleteCharacter); };
var rpcSelectCharacter = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcSelectCharacter); };
var rpcGetCharacterInfo = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetCharacterInfo); };
var rpcListInventory = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcListInventory); };
var rpcListCharInventory = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcListCharInventory); };
var rpcBringAccountItem = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcBringAccountItem); };
var rpcBringBackAccountItem = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcBringBackAccountItem); };
var rpcBuyItem = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcBuyItem); };
var rpcListShop = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcListShop); };
var rpcSellItem = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcSellItem); };
var rpcGetGameData = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetGameData); };
var rpcGetChannel = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetChannel); };
var rpcGetChannelrule = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetChannelrule); };
var rpcGetZitem = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetZitem); };
var rpcGetShop = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetShop); };
var rpcGetFormula = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetFormula); };
var rpcGetDroptable = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetDroptable); };
var rpcGetWorlditem = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetWorlditem); };
var rpcGetNpc = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetNpc); };
var rpcGetNpcset = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetNpcset); };
var rpcGetScenario = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetScenario); };
var rpcGetQuestmap = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetQuestmap); };
var rpcGetSpawns = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetSpawns); };
var rpcGetSacrificeTable = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetSacrificeTable); };
var rpcGetStrings = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetStrings); };
var rpcGetStringsLocales = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetStringsLocales); };
var rpcGetMessages = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetMessages); };
var rpcGetTips = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetTips); };
var rpcGetNotify = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetNotify); };
var rpcGetProtocol = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetProtocol); };
var rpcGetCserror = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetCserror); };
var rpcGetEvent = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetEvent); };
var rpcGetEventList = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetEventList); };
var rpcGetGungame = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetGungame); };
var rpcGetLadderStat = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetLadderStat); };
var rpcGetReportQuestmap = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetReportQuestmap); };
var rpcGetShutdown = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetShutdown); };
var rpcGetMapsManifest = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetMapsManifest); };
var rpcGetBootstrapV2 = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetBootstrapV2); };
var rpcGetMapRecipeV2 = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcGetMapRecipeV2); };
var rpcEquipItem = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcEquipItem); };
var rpcTakeoffItem = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcTakeoffItem); };
var rpcListStages = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcListStages); };
var rpcCreateStage = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcCreateStage); };
var rpcJoinStage = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcJoinStage); };
var rpcRequestStageState = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcRequestStageState); };
var rpcSetReady = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcSetReady); };
var rpcSetTeam = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcSetTeam); };
var rpcStageUpdate = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcStageUpdate); };
var rpcStageChat = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcStageChat); };
var rpcStartStage = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcStartStage); };
var rpcEndStage = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcEndStage); };
var rpcCreateClan = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcCreateClan); };
var rpcListFriends = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcListFriends); };
var rpcFindClanWar = function(ctx, logger, nk, payload) { return invokeRpcWithIdle(ctx, logger, nk, payload, MainBundle.rpcFindClanWar); };

// Pontes de função Match
var matchmakerMatched = function(ctx, logger, nk, matches) { return MainBundle.matchmakerMatched(ctx, logger, nk, matches); };
var matchInit = function(c, l, n, p) { return MainBundle.matchInit(c, l, n, p); };
var matchJoinAttempt = function(c, l, n, d, t, s, p, m) { return MainBundle.matchJoinAttempt(c, l, n, d, t, s, p, m); };
var matchJoin = function(c, l, n, d, t, s, p) { return MainBundle.matchJoin(c, l, n, d, t, s, p); };
var matchLeave = function(c, l, n, d, t, s, p) { return MainBundle.matchLeave(c, l, n, d, t, s, p); };
var matchLoop = function(c, l, n, d, t, s, m) { return MainBundle.matchLoop(c, l, n, d, t, s, m); };
var matchTerminate = function(c, l, n, d, t, s, g) { return MainBundle.matchTerminate(c, l, n, d, t, s, g); };
var matchSignal = function(c, l, n, d, t, s, data) { return MainBundle.matchSignal(c, l, n, d, t, s, data); };

// Entrypoint Oficial
function InitModule(ctx, logger, nk, initializer) {
    logger.info("=========================================");
    logger.info("   GUNZ NAKAMA SERVER - STARTING UP      ");
    logger.info("=========================================");

    // Registros de RPC
    initializer.registerRpc('logout', rpcLogout);
    initializer.registerRpc('server_announce', rpcServerAnnounce);
    initializer.registerRpc('get_admin_stats', rpcGetAdminStats);
    initializer.registerRpc('admin_list_users', rpcAdminListUsers);
    initializer.registerRpc('admin_kick_users', rpcAdminKickUsers);
    initializer.registerRpc('admin_ban_users', rpcAdminBanUsers);
    initializer.registerRpc('create_character', rpcCreateCharacter);
    initializer.registerRpc('list_characters', rpcListCharacters);
    initializer.registerRpc('delete_character', rpcDeleteCharacter);
    initializer.registerRpc('select_character', rpcSelectCharacter);
    initializer.registerRpc('get_character_info', rpcGetCharacterInfo);
    initializer.registerRpc('list_inventory', rpcListInventory);
    initializer.registerRpc('list_char_inventory', rpcListCharInventory);
    initializer.registerRpc('bring_account_item', rpcBringAccountItem);
    initializer.registerRpc('bring_back_account_item', rpcBringBackAccountItem);
    initializer.registerRpc('buy_item', rpcBuyItem);
    initializer.registerRpc('list_shop', rpcListShop);
    initializer.registerRpc('sell_item', rpcSellItem);
    initializer.registerRpc('get_game_data', rpcGetGameData);
    initializer.registerRpc('get_channel', rpcGetChannel);
    initializer.registerRpc('get_channelrule', rpcGetChannelrule);
    initializer.registerRpc('get_zitem', rpcGetZitem);
    initializer.registerRpc('get_shop', rpcGetShop);
    initializer.registerRpc('get_formula', rpcGetFormula);
    initializer.registerRpc('get_droptable', rpcGetDroptable);
    initializer.registerRpc('get_worlditem', rpcGetWorlditem);
    initializer.registerRpc('get_npc', rpcGetNpc);
    initializer.registerRpc('get_npcset', rpcGetNpcset);
    initializer.registerRpc('get_scenario', rpcGetScenario);
    initializer.registerRpc('get_questmap', rpcGetQuestmap);
    initializer.registerRpc('get_spawns', rpcGetSpawns);
    initializer.registerRpc('get_sacrifice_table', rpcGetSacrificeTable);
    initializer.registerRpc('get_strings', rpcGetStrings);
    initializer.registerRpc('get_strings_locales', rpcGetStringsLocales);
    initializer.registerRpc('get_messages', rpcGetMessages);
    initializer.registerRpc('get_tips', rpcGetTips);
    initializer.registerRpc('get_notify', rpcGetNotify);
    initializer.registerRpc('get_protocol', rpcGetProtocol);
    initializer.registerRpc('get_cserror', rpcGetCserror);
    initializer.registerRpc('get_event', rpcGetEvent);
    initializer.registerRpc('get_event_list', rpcGetEventList);
    initializer.registerRpc('get_gungame', rpcGetGungame);
    initializer.registerRpc('get_ladder_stat', rpcGetLadderStat);
    initializer.registerRpc('get_report_questmap', rpcGetReportQuestmap);
    initializer.registerRpc('get_shutdown', rpcGetShutdown);
    initializer.registerRpc('get_maps_manifest', rpcGetMapsManifest);
    initializer.registerRpc('get_bootstrap_v2', rpcGetBootstrapV2);
    initializer.registerRpc('get_map_recipe_v2', rpcGetMapRecipeV2);
    initializer.registerRpc('equip_item', rpcEquipItem);
    initializer.registerRpc('takeoff_item', rpcTakeoffItem);
    initializer.registerRpc('list_stages', rpcListStages);
    initializer.registerRpc('create_stage', rpcCreateStage);
    initializer.registerRpc('join_stage', rpcJoinStage);
    initializer.registerRpc('request_stage_state', rpcRequestStageState);
    initializer.registerRpc('set_ready', rpcSetReady);
    initializer.registerRpc('set_team', rpcSetTeam);
    initializer.registerRpc('stage_update', rpcStageUpdate);
    initializer.registerRpc('stage_chat', rpcStageChat);
    initializer.registerRpc('stage_start', rpcStartStage);
    initializer.registerRpc('stage_end', rpcEndStage);
    initializer.registerRpc('create_clan', rpcCreateClan);
    initializer.registerRpc('list_friends', rpcListFriends);
    initializer.registerRpc('find_clan_war', rpcFindClanWar);

    // Registros de Matchmaker
    initializer.registerMatchmakerMatched(matchmakerMatched);

    // Storage index for character name uniqueness
    initializer.registerStorageIndex('idx_characters_name', 'character_names', '', ['name'], 100000, true);

    // Registro do Match Handler (Authoritative)
    initializer.registerMatch('match_handler', {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal
    });

    // Carregamento de Dados
    MainBundle.loadGameData(nk);
    MainBundle.setupLeaderboards(nk);
    var counts = MainBundle.getDataCounts();
    logger.info(
        ">> DATA LOADED: Items: %d, Maps: %d, Protocol: %d, Shop: %d",
        counts.items,
        counts.maps,
        counts.protocol,
        counts.shop
    );

    logger.info("   GUNZ NAKAMA SERVER 100 PERCENT FUNCTIONAL ");
    logger.info("=========================================");
}
`
  },
  plugins: [
    resolve({
      browser: false,
      preferBuiltins: true
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
    })
  ]
};
