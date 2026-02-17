export const rpcCreateClan: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    const input = JSON.parse(payload);
    const { name, description } = input;

    try {
        const group = nk.groupCreate(ctx.userId, name, ctx.userId, "pt", description, "", false, {}, 100);
        logger.info("Clã criado: %s por %s", name, ctx.username);
        return JSON.stringify(group);
    } catch (error) {
        throw new Error("Não foi possível criar o clã.");
    }
};

export const rpcListFriends: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    const friends = nk.friendsList(ctx.userId);
    return JSON.stringify(friends);
};