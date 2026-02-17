/**
 * IDs dos Leaderboards
 */
export const LEADERBOARD_XP = "xp_global";
export const LEADERBOARD_CLAN = "clan_global";

/**
 * Inicializa os leaderboards no servidor
 */
export const setupLeaderboards = (nk: nkruntime.Nakama) => {
    // Leaderboard de XP: Maior valor ganha (descendente), reset nunca
    try {
        nk.leaderboardCreate(LEADERBOARD_XP, true, nkruntime.SortOrder.DESCENDING, nkruntime.Operator.BEST, "0 0 * * *", {}, false);
    } catch (e) {}

    // Leaderboard de Clas: Pontuacao de vitorias
    try {
        nk.leaderboardCreate(LEADERBOARD_CLAN, true, nkruntime.SortOrder.DESCENDING, nkruntime.Operator.INCREMENTAL, "0 0 * * *", {}, false);
    } catch (e) {}
};

/**
 * Atualiza o XP do jogador no Leaderboard
 */
export const updateXpLeaderboard = (nk: nkruntime.Nakama, userId: string, username: string, xp: number) => {
    try {
        nk.leaderboardRecordWrite(LEADERBOARD_XP, userId, username, xp);
    } catch (e) {}
};

/**
 * Atualiza a pontuacao do cla no Leaderboard
 */
export const updateClanLeaderboard = (nk: nkruntime.Nakama, clanId: string, clanName: string, score: number) => {
    try {
        nk.leaderboardRecordWrite(LEADERBOARD_CLAN, clanId, clanName, score);
    } catch (e) {}
};
