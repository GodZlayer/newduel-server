export interface ItemInstance {
    instanceId: string; // ID unico desta instancia do item no inventario
    itemId: number;     // ID do item conforme o zitem.xml
    count: number;      // Quantidade (para itens consumiveis/balas)
    purchaseTime: number;
    expireTime: number; // 0 para permanente
}

export interface Inventory {
    items: ItemInstance[];
}

const readAccountInventory = (nk: nkruntime.Nakama, userId: string): Inventory => {
    const result = nk.storageRead([{ collection: 'inventory', key: 'items', userId }]);
    return result.length > 0 ? (result[0].value as Inventory) : { items: [] };
};

const writeAccountInventory = (nk: nkruntime.Nakama, userId: string, inventory: Inventory): void => {
    nk.storageWrite([{
        collection: 'inventory',
        key: 'items',
        userId,
        value: inventory,
        permissionRead: 1,
        permissionWrite: 0
    }]);
};

const readCharInventory = (nk: nkruntime.Nakama, userId: string, charId: string): Inventory => {
    const result = nk.storageRead([{ collection: 'char_inventory', key: charId, userId }]);
    return result.length > 0 ? (result[0].value as Inventory) : { items: [] };
};

const writeCharInventory = (nk: nkruntime.Nakama, userId: string, charId: string, inventory: Inventory): void => {
    nk.storageWrite([{
        collection: 'char_inventory',
        key: charId,
        userId,
        value: inventory,
        permissionRead: 1,
        permissionWrite: 0
    }]);
};

/**
 * Adiciona um item ao inventario da conta.
 */
export function addItemToInventory(nk: nkruntime.Nakama, userId: string, itemId: number, count: number = 1): void {
    const inventory = readAccountInventory(nk, userId);

    const newItem: ItemInstance = {
        instanceId: nk.uuidv4(),
        itemId: itemId,
        count: count,
        purchaseTime: Date.now(),
        expireTime: 0
    };

    inventory.items.push(newItem);
    writeAccountInventory(nk, userId, inventory);
}

/**
 * RPC para listar o inventario da conta.
 */
export const rpcListInventory: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    const inventory = readAccountInventory(nk, ctx.userId);
    return JSON.stringify(inventory);
};

/**
 * RPC para listar o inventario do personagem.
 */
export const rpcListCharInventory: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    const input = payload ? JSON.parse(payload) : {};
    const charId = input?.charId;
    if (!charId) throw new Error("charId e obrigatorio.");
    const inventory = readCharInventory(nk, ctx.userId, charId);
    return JSON.stringify(inventory);
};

/**
 * Move item da conta para o inventario do personagem.
 */
export const rpcBringAccountItem: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    const input = payload ? JSON.parse(payload) : {};
    const charId = input?.charId;
    const instanceId = input?.instanceId;
    const count = Number.isFinite(input?.count) ? Math.max(1, Math.floor(input.count)) : 1;
    if (!charId || !instanceId) throw new Error("charId e instanceId sao obrigatorios.");

    const accountInv = readAccountInventory(nk, ctx.userId);
    const idx = accountInv.items.findIndex(i => i.instanceId === instanceId);
    if (idx === -1) throw new Error("Item nao encontrado no inventario da conta.");
    const item = accountInv.items[idx];
    if (count > item.count) throw new Error("Quantidade invalida.");

    const charInv = readCharInventory(nk, ctx.userId, charId);
    if (count === item.count) {
        accountInv.items.splice(idx, 1);
        charInv.items.push(item);
    } else {
        item.count -= count;
        charInv.items.push({
            instanceId: nk.uuidv4(),
            itemId: item.itemId,
            count,
            purchaseTime: item.purchaseTime,
            expireTime: item.expireTime
        });
    }

    writeAccountInventory(nk, ctx.userId, accountInv);
    writeCharInventory(nk, ctx.userId, charId, charInv);
    return JSON.stringify({ success: true });
};

/**
 * Move item do inventario do personagem para a conta.
 */
export const rpcBringBackAccountItem: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    const input = payload ? JSON.parse(payload) : {};
    const charId = input?.charId;
    const instanceId = input?.instanceId;
    const count = Number.isFinite(input?.count) ? Math.max(1, Math.floor(input.count)) : 1;
    if (!charId || !instanceId) throw new Error("charId e instanceId sao obrigatorios.");

    const charInv = readCharInventory(nk, ctx.userId, charId);
    const idx = charInv.items.findIndex(i => i.instanceId === instanceId);
    if (idx === -1) throw new Error("Item nao encontrado no inventario do personagem.");
    const item = charInv.items[idx];
    if (count > item.count) throw new Error("Quantidade invalida.");

    const accountInv = readAccountInventory(nk, ctx.userId);
    if (count === item.count) {
        charInv.items.splice(idx, 1);
        accountInv.items.push(item);
    } else {
        item.count -= count;
        accountInv.items.push({
            instanceId: nk.uuidv4(),
            itemId: item.itemId,
            count,
            purchaseTime: item.purchaseTime,
            expireTime: item.expireTime
        });
    }

    writeCharInventory(nk, ctx.userId, charId, charInv);
    writeAccountInventory(nk, ctx.userId, accountInv);
    return JSON.stringify({ success: true });
};

export {
    readAccountInventory,
    writeAccountInventory,
    readCharInventory,
    writeCharInventory
};
