import { Inventory, readAccountInventory, writeAccountInventory, readCharInventory, writeCharInventory } from "./items";
import { CHAR_ITEM_PART_SLOTS } from "./char_item_parts";
import { Character } from "./characters";
import { getItemData } from "./data_manager";

const BASE_MAX_WEIGHT = 100;

const getItemStat = (itemId: number | undefined, field: "weight" | "maxwt") => {
    if (!itemId) return 0;
    const item = getItemData(String(itemId)) as any;
    if (!item) return 0;
    const val = Number(item[field]);
    return Number.isFinite(val) ? val : 0;
};

const getEquipmentTotals = (equipment: Character["equipment"]) => {
    const ids = Object.values(equipment || {}).filter((v): v is number => typeof v === "number" && v > 0);
    let weight = 0;
    let maxwt = 0;
    for (const id of ids) {
        weight += getItemStat(id, "weight");
        maxwt += getItemStat(id, "maxwt");
    }
    return { weight, maxwt };
};

const normalizeSlotName = (slot: any): string | null => {
    if (typeof slot === "number") {
        return CHAR_ITEM_PART_SLOTS[slot] ?? null;
    }
    if (typeof slot !== "string") return null;
    if (slot === "custom1") return "item1";
    if (slot === "custom2") return "item2";
    return slot;
};

export const rpcEquipItem: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    const input = JSON.parse(payload);
    const { charId, instanceId, slot } = input;
    const slotName = normalizeSlotName(slot);
    if (!slotName || CHAR_ITEM_PART_SLOTS.indexOf(slotName) === -1) {
        throw new Error("Slot invalido.");
    }

    // 1. Ler inventarios (personagem + conta)
    const charInv = readCharInventory(nk, ctx.userId, charId);
    const accountInv = readAccountInventory(nk, ctx.userId);

    // 2. Encontrar o item (prioriza inventario do personagem)
    let itemInstance = charInv.items.find(i => i.instanceId === instanceId);
    if (!itemInstance) {
        const idx = accountInv.items.findIndex(i => i.instanceId === instanceId);
        if (idx === -1) throw new Error("Item nao encontrado no inventario.");
        itemInstance = accountInv.items[idx];
        accountInv.items.splice(idx, 1);
        charInv.items.push(itemInstance);
        writeAccountInventory(nk, ctx.userId, accountInv);
        writeCharInventory(nk, ctx.userId, charId, charInv);
    }

    // 3. Ler a lista de personagens
    const charResult = nk.storageRead([{ collection: 'characters', key: 'list', userId: ctx.userId }]);
    if (charResult.length === 0) throw new Error("Personagens nao encontrados.");
    const charactersObj = charResult[0].value as { characters: Character[] };

    const charIndex = charactersObj.characters.findIndex(c => c.id === charId);
    if (charIndex === -1) throw new Error("Personagem nao encontrado.");

    const character = charactersObj.characters[charIndex];

    // 4. Validar Requisitos (Nivel e Peso)
    const itemData = getItemData(String(itemInstance.itemId)) as any;
    if (itemData) {
        const resLevel = Number(itemData.res_level || 0);
        if (character.level < resLevel) {
            throw new Error(`Nivel insuficiente. Requerido: ${resLevel}`);
        }
    }

    const currentTotals = getEquipmentTotals(character.equipment);

    const oldItemId = (character.equipment as any)[slotName] as number | undefined;
    const oldWeight = getItemStat(oldItemId, "weight");
    const oldMaxwt = getItemStat(oldItemId, "maxwt");
    const newWeight = currentTotals.weight - oldWeight + getItemStat(itemInstance.itemId, "weight");
    const newMaxWeight = BASE_MAX_WEIGHT + currentTotals.maxwt - oldMaxwt + getItemStat(itemInstance.itemId, "maxwt");
    if (newWeight > newMaxWeight) {
        throw new Error("Peso excede o limite.");
    }

    // 5. Atualizar o slot
    // @ts-ignore
    character.equipment[slotName] = itemInstance.itemId;

    // 6. Salvar de volta
    nk.storageWrite([{
        collection: 'characters',
        key: 'list',
        userId: ctx.userId,
        value: charactersObj,
        permissionRead: 1,
        permissionWrite: 0
    }]);

    logger.info("Personagem %s equipou item %d no slot %s", character.name, itemInstance.itemId, slotName);

    return JSON.stringify({ success: true, character });
};

export const rpcTakeoffItem: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    const input = JSON.parse(payload);
    const { charId, slot } = input;

    const charResult = nk.storageRead([{ collection: 'characters', key: 'list', userId: ctx.userId }]);
    const charactersObj = charResult[0].value as { characters: Character[] };

    const charIndex = charactersObj.characters.findIndex(c => c.id === charId);
    if (charIndex === -1) throw new Error("Personagem nao encontrado.");

    const character = charactersObj.characters[charIndex];

    const slotName = normalizeSlotName(slot);
    if (!slotName || CHAR_ITEM_PART_SLOTS.indexOf(slotName) === -1) {
        throw new Error("Slot invalido.");
    }

    const currentTotals = getEquipmentTotals(character.equipment);
    const oldItemId = (character.equipment as any)[slotName] as number | undefined;
    if (oldItemId) {
        const oldWeight = getItemStat(oldItemId, "weight");
        const oldMaxwt = getItemStat(oldItemId, "maxwt");
        const newWeight = currentTotals.weight - oldWeight;
        const newMaxWeight = BASE_MAX_WEIGHT + currentTotals.maxwt - oldMaxwt;
        if (newWeight > newMaxWeight) {
            throw new Error("Nao e possivel remover: excede peso maximo.");
        }
    }

    // Remover do slot
    // @ts-ignore
    delete character.equipment[slotName];

    nk.storageWrite([{
        collection: 'characters',
        key: 'list',
        userId: ctx.userId,
        value: charactersObj,
        permissionRead: 1,
        permissionWrite: 0
    }]);

    return JSON.stringify({ success: true, character });
};
