import { UserRole, hasPermission } from "./roles";
import { startTime } from "./context";

export const rpcServerAnnounce: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    if (!hasPermission(ctx, nk, UserRole.ADMIN)) {
        throw new Error("Permissão insuficiente para realizar anúncios.");
    }

    const request = JSON.parse(payload);
    const message = request.message;

    if (!message) {
        throw new Error("Mensagem vazia.");
    }

    const content = { msg: message };
    const allUsers: string[] = [];
    try {
        const rows = nk.sqlQuery("SELECT id FROM users", []);
        for (const row of rows) {
            if (row?.id) allUsers.push(row.id);
        }
    } catch (e) {
        logger.error("Erro ao listar usuarios para anuncio: %v", e);
    }

    if (allUsers.length === 0) {
        throw new Error("Nenhum usuario para receber anuncio.");
    }

    const notifications = allUsers.map((userId) => ({
        code: 100,
        content,
        persistent: false,
        subject: "SERVER_ANNOUNCEMENT",
        userId
    }));

    nk.notificationsSend(notifications);

    logger.info("Admin %s fez um anúncio: %s", ctx.username, message);

    return JSON.stringify({ success: true });
}

export const rpcAdminKickUsers: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    if (!hasPermission(ctx, nk, UserRole.ADMIN)) {
        throw new Error("PermissÃ£o insuficiente.");
    }

    const request = JSON.parse(payload);
    const userIds: string[] = Array.isArray(request?.userIds) ? request.userIds : [];
    if (userIds.length === 0) {
        throw new Error("userIds Ã© obrigatÃ³rio.");
    }

    nk.sessionLogout(userIds);

    logger.info("Admin %s kickou %d usuarios.", ctx.username, userIds.length);
    return JSON.stringify({ success: true, count: userIds.length });
};

export const rpcAdminBanUsers: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    if (!hasPermission(ctx, nk, UserRole.ADMIN)) {
        throw new Error("PermissÃ£o insuficiente.");
    }

    const request = JSON.parse(payload);
    const userIds: string[] = Array.isArray(request?.userIds) ? request.userIds : [];
    if (userIds.length === 0) {
        throw new Error("userIds Ã© obrigatÃ³rio.");
    }

    nk.usersBanId(userIds);

    logger.info("Admin %s baniu %d usuarios.", ctx.username, userIds.length);
    return JSON.stringify({ success: true, count: userIds.length });
};

export const rpcGetAdminStats: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    if (!hasPermission(ctx, nk, UserRole.ADMIN)) {
        throw new Error("Permissão insuficiente.");
    }

    let userCount = 0;
    let groupCount = 0;
    let activeMatches = 0;
    let activeSessions = 0;
    try {
        const userCountRow = nk.sqlQuery("SELECT count(*) as count FROM users", []);
        const groupCountRow = nk.sqlQuery("SELECT count(*) as count FROM groups", []);
        userCount = Number(userCountRow[0].count);
        groupCount = Number(groupCountRow[0].count);
    } catch (e) {
        logger.error("Erro ao buscar stats: %v", e);
    }
    try {
        const matches = nk.matchList(1000, true, null, null, null, null);
        activeMatches = matches.length;
    } catch (e) {
        logger.error("Erro ao listar matches: %v", e);
    }
    try {
        const rows = nk.sqlQuery("SELECT count(*) as count FROM user_sessions WHERE logout_time IS NULL", []);
        activeSessions = Number(rows[0].count);
    } catch (e) {
        logger.error("Erro ao buscar sessoes ativas: %v", e);
    }

    const stats = {
        users: userCount,
        clans: groupCount,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        version: "1.0.0-OpenGunZ",
        matches: activeMatches,
        sessions: activeSessions
    };

    return JSON.stringify(stats);
}

export const rpcAdminListUsers: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    if (!hasPermission(ctx, nk, UserRole.ADMIN)) {
        throw new Error("Permissão insuficiente.");
    }

    const users: any[] = [];
    try {
        const rows = nk.sqlQuery("SELECT id, username, display_name, create_time, update_time FROM users LIMIT 100", []);
        for (const row of rows) {
            users.push(row);
        }
    } catch (e) {
        logger.error("Erro ao listar usuários: %v", e);
    }

    return JSON.stringify({ users });
}

