export const rpcFindClanWar: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    const groups = nk.userGroupsList(ctx.userId);
    if (!groups.userGroups || groups.userGroups.length === 0) {
        throw new Error("Voce precisa pertencer a um cla.");
    }
    // No Nakama TS, userGroups contem objetos do tipo UserGroupListUserGroup
    const clan = groups.userGroups[0].group;

    if (!clan) {
        throw new Error("Erro ao identificar o cla.");
    }

    return JSON.stringify({
        matchmaking_properties: {
            mode: "clan_war",
            clan_id: clan.id,
            clan_name: clan.name
        },
        matchmaking_query: `+properties.mode:clan_war -properties.clan_id:${clan.id}`
    });
};

// Callback chamado pelo Nakama quando o Matchmaker encontra uma partida
export const matchmakerMatched: nkruntime.MatchmakerMatchedFunction = (ctx, logger, nk, matches) => {
    logger.info("Matchmaker encontrou uma Clan War!");

    // Criar uma partida autoritativa para o duelo de clas
    const matchId = nk.matchCreate("match_handler", {
        mode: "clan_war",
        teamMode: true
    });

    return matchId;
};