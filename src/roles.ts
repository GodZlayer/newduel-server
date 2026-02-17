export enum UserRole {
    PLAYER = 0,
    MODERATOR = 1,
    ADMIN = 2,
    DEVELOPER = 3
}

export interface UserMetadata {
    role: UserRole;
    title?: string;
}

/**
 * Verifica se um usuário tem a permissão mínima necessária.
 */
export function hasPermission(ctx: nkruntime.Context, nk: nkruntime.Nakama, minRole: UserRole): boolean {
    const account = nk.accountGetId(ctx.userId);
    const metadata = (account.user.metadata as unknown as UserMetadata) || { role: UserRole.PLAYER };
    
    return metadata.role >= minRole;
}

