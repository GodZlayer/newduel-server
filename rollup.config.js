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
var rpcServerAnnounce = function(ctx, logger, nk, payload) { return MainBundle.rpcServerAnnounce(ctx, logger, nk, payload); };
var rpcGetAdminStats = function(ctx, logger, nk, payload) { return MainBundle.rpcGetAdminStats(ctx, logger, nk, payload); };
var rpcAdminListUsers = function(ctx, logger, nk, payload) { return MainBundle.rpcAdminListUsers(ctx, logger, nk, payload); };
var rpcAdminKickUsers = function(ctx, logger, nk, payload) { return MainBundle.rpcAdminKickUsers(ctx, logger, nk, payload); };
var rpcAdminBanUsers = function(ctx, logger, nk, payload) { return MainBundle.rpcAdminBanUsers(ctx, logger, nk, payload); };
var rpcCreateCharacter = function(ctx, logger, nk, payload) { return MainBundle.rpcCreateCharacter(ctx, logger, nk, payload); };
var rpcListCharacters = function(ctx, logger, nk, payload) { return MainBundle.rpcListCharacters(ctx, logger, nk, payload); };
var rpcDeleteCharacter = function(ctx, logger, nk, payload) { return MainBundle.rpcDeleteCharacter(ctx, logger, nk, payload); };
var rpcSelectCharacter = function(ctx, logger, nk, payload) { return MainBundle.rpcSelectCharacter(ctx, logger, nk, payload); };
var rpcGetCharacterInfo = function(ctx, logger, nk, payload) { return MainBundle.rpcGetCharacterInfo(ctx, logger, nk, payload); };
var rpcListInventory = function(ctx, logger, nk, payload) { return MainBundle.rpcListInventory(ctx, logger, nk, payload); };
var rpcListCharInventory = function(ctx, logger, nk, payload) { return MainBundle.rpcListCharInventory(ctx, logger, nk, payload); };
var rpcBringAccountItem = function(ctx, logger, nk, payload) { return MainBundle.rpcBringAccountItem(ctx, logger, nk, payload); };
var rpcBringBackAccountItem = function(ctx, logger, nk, payload) { return MainBundle.rpcBringBackAccountItem(ctx, logger, nk, payload); };
var rpcBuyItem = function(ctx, logger, nk, payload) { return MainBundle.rpcBuyItem(ctx, logger, nk, payload); };
var rpcListShop = function(ctx, logger, nk, payload) { return MainBundle.rpcListShop(ctx, logger, nk, payload); };
var rpcSellItem = function(ctx, logger, nk, payload) { return MainBundle.rpcSellItem(ctx, logger, nk, payload); };
var rpcGetGameData = function(ctx, logger, nk, payload) { return MainBundle.rpcGetGameData(ctx, logger, nk, payload); };
var rpcGetChannel = function(ctx, logger, nk, payload) { return MainBundle.rpcGetChannel(ctx, logger, nk, payload); };
var rpcGetChannelrule = function(ctx, logger, nk, payload) { return MainBundle.rpcGetChannelrule(ctx, logger, nk, payload); };
var rpcGetZitem = function(ctx, logger, nk, payload) { return MainBundle.rpcGetZitem(ctx, logger, nk, payload); };
var rpcGetShop = function(ctx, logger, nk, payload) { return MainBundle.rpcGetShop(ctx, logger, nk, payload); };
var rpcGetFormula = function(ctx, logger, nk, payload) { return MainBundle.rpcGetFormula(ctx, logger, nk, payload); };
var rpcGetDroptable = function(ctx, logger, nk, payload) { return MainBundle.rpcGetDroptable(ctx, logger, nk, payload); };
var rpcGetWorlditem = function(ctx, logger, nk, payload) { return MainBundle.rpcGetWorlditem(ctx, logger, nk, payload); };
var rpcGetNpc = function(ctx, logger, nk, payload) { return MainBundle.rpcGetNpc(ctx, logger, nk, payload); };
var rpcGetNpcset = function(ctx, logger, nk, payload) { return MainBundle.rpcGetNpcset(ctx, logger, nk, payload); };
var rpcGetScenario = function(ctx, logger, nk, payload) { return MainBundle.rpcGetScenario(ctx, logger, nk, payload); };
var rpcGetQuestmap = function(ctx, logger, nk, payload) { return MainBundle.rpcGetQuestmap(ctx, logger, nk, payload); };
var rpcGetSpawns = function(ctx, logger, nk, payload) { return MainBundle.rpcGetSpawns(ctx, logger, nk, payload); };
var rpcGetSacrificeTable = function(ctx, logger, nk, payload) { return MainBundle.rpcGetSacrificeTable(ctx, logger, nk, payload); };
var rpcGetStrings = function(ctx, logger, nk, payload) { return MainBundle.rpcGetStrings(ctx, logger, nk, payload); };
var rpcGetStringsLocales = function(ctx, logger, nk, payload) { return MainBundle.rpcGetStringsLocales(ctx, logger, nk, payload); };
var rpcGetMessages = function(ctx, logger, nk, payload) { return MainBundle.rpcGetMessages(ctx, logger, nk, payload); };
var rpcGetTips = function(ctx, logger, nk, payload) { return MainBundle.rpcGetTips(ctx, logger, nk, payload); };
var rpcGetNotify = function(ctx, logger, nk, payload) { return MainBundle.rpcGetNotify(ctx, logger, nk, payload); };
var rpcGetProtocol = function(ctx, logger, nk, payload) { return MainBundle.rpcGetProtocol(ctx, logger, nk, payload); };
var rpcGetCserror = function(ctx, logger, nk, payload) { return MainBundle.rpcGetCserror(ctx, logger, nk, payload); };
var rpcGetEvent = function(ctx, logger, nk, payload) { return MainBundle.rpcGetEvent(ctx, logger, nk, payload); };
var rpcGetEventList = function(ctx, logger, nk, payload) { return MainBundle.rpcGetEventList(ctx, logger, nk, payload); };
var rpcGetGungame = function(ctx, logger, nk, payload) { return MainBundle.rpcGetGungame(ctx, logger, nk, payload); };
var rpcGetLadderStat = function(ctx, logger, nk, payload) { return MainBundle.rpcGetLadderStat(ctx, logger, nk, payload); };
var rpcGetReportQuestmap = function(ctx, logger, nk, payload) { return MainBundle.rpcGetReportQuestmap(ctx, logger, nk, payload); };
var rpcGetShutdown = function(ctx, logger, nk, payload) { return MainBundle.rpcGetShutdown(ctx, logger, nk, payload); };
var rpcGetMapsManifest = function(ctx, logger, nk, payload) { return MainBundle.rpcGetMapsManifest(ctx, logger, nk, payload); };
var rpcGetBootstrapV2 = function(ctx, logger, nk, payload) { return MainBundle.rpcGetBootstrapV2(ctx, logger, nk, payload); };
var rpcGetMapRecipeV2 = function(ctx, logger, nk, payload) { return MainBundle.rpcGetMapRecipeV2(ctx, logger, nk, payload); };
var rpcEquipItem = function(ctx, logger, nk, payload) { return MainBundle.rpcEquipItem(ctx, logger, nk, payload); };
var rpcTakeoffItem = function(ctx, logger, nk, payload) { return MainBundle.rpcTakeoffItem(ctx, logger, nk, payload); };
var rpcListStages = function(ctx, logger, nk, payload) { return MainBundle.rpcListStages(ctx, logger, nk, payload); };
var rpcCreateStage = function(ctx, logger, nk, payload) { return MainBundle.rpcCreateStage(ctx, logger, nk, payload); };
var rpcJoinStage = function(ctx, logger, nk, payload) { return MainBundle.rpcJoinStage(ctx, logger, nk, payload); };
var rpcRequestStageState = function(ctx, logger, nk, payload) { return MainBundle.rpcRequestStageState(ctx, logger, nk, payload); };
var rpcSetReady = function(ctx, logger, nk, payload) { return MainBundle.rpcSetReady(ctx, logger, nk, payload); };
var rpcSetTeam = function(ctx, logger, nk, payload) { return MainBundle.rpcSetTeam(ctx, logger, nk, payload); };
var rpcStageUpdate = function(ctx, logger, nk, payload) { return MainBundle.rpcStageUpdate(ctx, logger, nk, payload); };
var rpcStageChat = function(ctx, logger, nk, payload) { return MainBundle.rpcStageChat(ctx, logger, nk, payload); };
var rpcStartStage = function(ctx, logger, nk, payload) { return MainBundle.rpcStartStage(ctx, logger, nk, payload); };
var rpcEndStage = function(ctx, logger, nk, payload) { return MainBundle.rpcEndStage(ctx, logger, nk, payload); };
var rpcCreateClan = function(ctx, logger, nk, payload) { return MainBundle.rpcCreateClan(ctx, logger, nk, payload); };
var rpcListFriends = function(ctx, logger, nk, payload) { return MainBundle.rpcListFriends(ctx, logger, nk, payload); };
var rpcFindClanWar = function(ctx, logger, nk, payload) { return MainBundle.rpcFindClanWar(ctx, logger, nk, payload); };

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
