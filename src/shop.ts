import { addItemToInventory, Inventory } from "./items";
import { getItemData, getShopData, isShopItem } from "./data_manager";
import { Character } from "./characters";

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

const getItemPrice = (item: any) => {
    const raw = Number(item?.bt_price ?? item?.price ?? 0);
    return Number.isFinite(raw) ? raw : 0;
};

const getSellPrice = (item: any) => {
    const price = getItemPrice(item);
    if (!price || price <= 0) return 0;
    return Math.max(1, Math.floor(price * 0.5));
};

const readInventory = (nk: nkruntime.Nakama, userId: string): Inventory => {
    const result = nk.storageRead([{ collection: 'inventory', key: 'items', userId }]);
    return result.length > 0 ? (result[0].value as Inventory) : { items: [] };
};

const writeInventory = (nk: nkruntime.Nakama, userId: string, inventory: Inventory): void => {
    nk.storageWrite([{
        collection: 'inventory',
        key: 'items',
        userId,
        value: inventory,
        permissionRead: 1,
        permissionWrite: 0
    }]);
};

const isEquippedByAnyCharacter = (characters: Character[], itemId: number): boolean => {
    for (const ch of characters) {
        const eq = ch.equipment || {};
        for (const id of Object.values(eq)) {
            if (Number(id) === itemId) return true;
        }
    }
    return false;
};

export const rpcListShop: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    const input = parsePayload(payload);
    const limit = Math.min(200, Math.max(1, Number.isFinite(input?.limit) ? input.limit : 50));
    const offset = Math.max(0, Number.isFinite(input?.offset) ? input.offset : 0);
    const nameQuery = typeof input?.name === "string" ? input.name.toLowerCase() : null;
    const typeFilter = typeof input?.type === "string" ? input.type.toLowerCase() : null;
    const slotFilter = typeof input?.slot === "string" ? input.slot.toLowerCase() : null;
    const minLevel = Number.isFinite(input?.minLevel) ? input.minLevel : null;
    const maxLevel = Number.isFinite(input?.maxLevel) ? input.maxLevel : null;

    const shop = getShopData();
    const sellList: Array<{ itemid: number }> = Array.isArray(shop?.sell) ? shop.sell : [];
    const items = sellList
        .map((entry) => Number(entry?.itemid))
        .filter((id) => Number.isFinite(id))
        .map((id) => {
            const item = getItemData(String(id));
            if (!item) return null;
            const price = getItemPrice(item);
            return {
                id,
                name: item.name,
                type: item.type,
                slot: item.slot,
                level: Number(item.res_level ?? 0),
                price
            };
        })
        .filter((v): v is { id: number; name: string; type: string; slot: string; level: number; price: number } => !!v);

    let filtered = items;
    if (nameQuery) filtered = filtered.filter(i => (i.name ?? "").toLowerCase().includes(nameQuery));
    if (typeFilter) filtered = filtered.filter(i => (i.type ?? "").toLowerCase() === typeFilter);
    if (slotFilter) filtered = filtered.filter(i => (i.slot ?? "").toLowerCase() === slotFilter);
    if (minLevel !== null) filtered = filtered.filter(i => i.level >= minLevel);
    if (maxLevel !== null) filtered = filtered.filter(i => i.level <= maxLevel);

    const paged = filtered.slice(offset, offset + limit);
    return JSON.stringify({ total: filtered.length, offset, limit, items: paged });
};

export const rpcBuyItem: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    const input = parsePayload(payload);
    const { itemId } = input;
    const count = Number.isFinite(input?.count) ? Math.max(1, Math.floor(input.count)) : 1;

    const item = getItemData(itemId);
    
    if (!item) {
        throw new Error("Item inexistente no catÃ¡logo.");
    }

    const id = Number(itemId);
    if (!Number.isFinite(id) || !isShopItem(id)) {
        throw new Error("Item nÃ£o estÃ¡ disponÃ­vel na loja.");
    }

    const price = getItemPrice(item);
    if (!price || price <= 0) {
        throw new Error("Item nÃ£o pode ser comprado.");
    }

    try {
        const totalPrice = price * count;
        const changeset = { bounty: -totalPrice };
        const metadata = { item_id: itemId, count, action: "buy" };
        
        nk.walletUpdate(ctx.userId, changeset, metadata, true);
        addItemToInventory(nk, ctx.userId, id, count);
        
        logger.info("UsuÃ¡rio %s comprou %s x%d por %d Bounty", ctx.username, item.name, count, totalPrice);
        
        return JSON.stringify({ success: true, item: item.name, count, totalPrice });
    } catch (error) {
        throw new Error("Saldo de Bounty insuficiente.");
    }
};

export const rpcSellItem: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    const input = parsePayload(payload);
    const { instanceId } = input;
    const count = Number.isFinite(input?.count) ? Math.max(1, Math.floor(input.count)) : 1;
    if (!instanceId) throw new Error("instanceId Ã© obrigatÃ³rio.");

    const inventory = readInventory(nk, ctx.userId);
    const itemInstance = inventory.items.find(i => i.instanceId === instanceId);
    if (!itemInstance) throw new Error("Item nÃ£o encontrado no inventÃ¡rio.");
    if (count > itemInstance.count) throw new Error("Quantidade invÃ¡lida.");

    const itemId = Number(itemInstance.itemId);
    if (!Number.isFinite(itemId) || !isShopItem(itemId)) {
        throw new Error("VocÃª nÃ£o pode vender este item.");
    }

    const charResult = nk.storageRead([{ collection: 'characters', key: 'list', userId: ctx.userId }]);
    const charsObj = charResult.length > 0 ? (charResult[0].value as { characters: Character[] }) : { characters: [] };
    if (isEquippedByAnyCharacter(charsObj.characters, itemId)) {
        throw new Error("NÃ£o Ã© permitido vender item equipado.");
    }

    const item = getItemData(String(itemId));
    if (!item) throw new Error("Item invÃ¡lido.");
    const sellPrice = getSellPrice(item);
    if (!sellPrice) throw new Error("Item nÃ£o pode ser vendido.");

    if (count === itemInstance.count) {
        inventory.items = inventory.items.filter(i => i.instanceId !== instanceId);
    } else {
        itemInstance.count -= count;
    }
    writeInventory(nk, ctx.userId, inventory);

    const total = sellPrice * count;
    nk.walletUpdate(ctx.userId, { bounty: total }, { item_id: itemId, count, action: "sell" }, true);

    logger.info("UsuÃ¡rio %s vendeu item %d x%d por %d Bounty", ctx.username, itemId, count, total);
    return JSON.stringify({ success: true, itemId, count, total });
};
