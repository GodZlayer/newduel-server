import { addItemToInventory } from "./items";

export interface Character {
    id: string;
    charIndex: number;
    name: string;
    level: number;
    xp: number;
    hp: number;
    ap: number;
    bounty: number;
    sex: number;
    hair: number;
    face: number;
    equipment: {
        head?: number;
        chest?: number;
        hands?: number;
        legs?: number;
        feet?: number;
        fingerl?: number;
        fingerr?: number;
        melee?: number;
        primary?: number;
        secondary?: number;
        item1?: number;
        item2?: number;
    };
}

const MAX_CHARS = 4;
const MIN_CHARNAME = 3;
const MAX_CHARNAME = 16;
const MAX_COSTUME_TEMPLATE = 6;
const MAX_COSTUME_HAIR = 5;
const MAX_COSTUME_FACE = 20;

const NAME_REGEX = /^[0-9a-zA-Z\-._]+$/;
const RESERVED_NAME_REGEX = /(D.?e.?v.?e.?l.?o.?p.?e.?r|A.?d.?m.?i.?n|M.?o.?d.?e.?r.?a.?t.?o.?r|G.?a.?m.?e.?M.?a.?s.?t.?e.?r|M2O|M20)/i;

const INITIAL_COSTUME: Array<Array<{
    melee: number;
    primary: number;
    secondary: number;
    item1: number;
    item2: number;
    chest: number;
    hands: number;
    legs: number;
    feet: number;
}>> = [
    [
        { melee: 1, primary: 5001, secondary: 4001, item1: 30301, item2: 0, chest: 21001, hands: 0, legs: 23001, feet: 0 },
        { melee: 1, primary: 5001, secondary: 4001, item1: 30301, item2: 0, chest: 21501, hands: 0, legs: 23501, feet: 0 },
    ],
    [
        { melee: 2, primary: 5002, secondary: 0, item1: 30301, item2: 0, chest: 21001, hands: 0, legs: 23001, feet: 0 },
        { melee: 2, primary: 5002, secondary: 0, item1: 30301, item2: 0, chest: 21501, hands: 0, legs: 23501, feet: 0 },
    ],
    [
        { melee: 1, primary: 4005, secondary: 5001, item1: 30401, item2: 0, chest: 21001, hands: 0, legs: 23001, feet: 0 },
        { melee: 1, primary: 4005, secondary: 5001, item1: 30401, item2: 0, chest: 21501, hands: 0, legs: 23501, feet: 0 },
    ],
    [
        { melee: 2, primary: 4001, secondary: 0, item1: 30401, item2: 0, chest: 21001, hands: 0, legs: 23001, feet: 0 },
        { melee: 2, primary: 4001, secondary: 0, item1: 30401, item2: 0, chest: 21501, hands: 0, legs: 23501, feet: 0 },
    ],
    [
        { melee: 2, primary: 4002, secondary: 0, item1: 30401, item2: 30001, chest: 21001, hands: 0, legs: 23001, feet: 0 },
        { melee: 2, primary: 4002, secondary: 0, item1: 30401, item2: 30001, chest: 21501, hands: 0, legs: 23501, feet: 0 },
    ],
    [
        { melee: 1, primary: 4006, secondary: 0, item1: 30101, item2: 30001, chest: 21001, hands: 0, legs: 23001, feet: 0 },
        { melee: 1, primary: 4006, secondary: 4006, item1: 30101, item2: 30001, chest: 21501, hands: 0, legs: 23501, feet: 0 },
    ],
];

type CharacterListObject = { characters: Character[] };

const readCharacterList = (nk: nkruntime.Nakama, userId: string): Character[] => {
    const objects = nk.storageRead([{ collection: "characters", key: "list", userId }]);
    if (objects.length === 0) return [];
    const value = objects[0].value as CharacterListObject;
    return Array.isArray(value?.characters) ? value.characters : [];
};

const writeCharacterList = (nk: nkruntime.Nakama, userId: string, characters: Character[]): void => {
    nk.storageWrite([{
        collection: "characters",
        key: "list",
        userId,
        value: { characters },
        permissionRead: 1,
        permissionWrite: 0
    }]);
};

const readActiveCharacterId = (nk: nkruntime.Nakama, userId: string): string | null => {
    const objects = nk.storageRead([{ collection: "characters", key: "active", userId }]);
    if (objects.length === 0) return null;
    const value = objects[0].value as { charId?: string };
    return value?.charId ?? null;
};

const writeActiveCharacterId = (nk: nkruntime.Nakama, userId: string, charId: string): void => {
    nk.storageWrite([{
        collection: "characters",
        key: "active",
        userId,
        value: { charId },
        permissionRead: 1,
        permissionWrite: 0
    }]);
};

const validateName = (name: string): void => {
    if (typeof name !== "string") {
        throw new Error("Nome de personagem inválido.");
    }
    if (name.length < MIN_CHARNAME) {
        throw new Error("Nome de personagem muito curto.");
    }
    if (name.length > MAX_CHARNAME) {
        throw new Error("Nome de personagem muito longo.");
    }
    if (!NAME_REGEX.test(name)) {
        throw new Error("Nome de personagem contÃ©m caracteres invÃ¡lidos.");
    }
    if (RESERVED_NAME_REGEX.test(name)) {
        throw new Error("Nome de personagem reservado.");
    }
};

const resolveCharIndex = (characters: Character[], requested?: number): number => {
    if (Number.isFinite(requested as number)) {
        const idx = requested as number;
        if (idx < 0 || idx >= MAX_CHARS) {
            throw new Error("CharIndex fora do limite.");
        }
        if (characters.some(c => c.charIndex === idx)) {
            throw new Error("CharIndex jÃ¡ estÃ¡ em uso.");
        }
        return idx;
    }

    for (let i = 0; i < MAX_CHARS; i++) {
        if (!characters.some(c => c.charIndex === i)) return i;
    }
    throw new Error("Limite de personagens atingido.");
};

const buildInitialEquipment = (sex: number, costume: number): Character["equipment"] => {
    const sexIndex = sex === 1 ? 1 : 0;
    const template = INITIAL_COSTUME[costume][sexIndex];
    return {
        melee: template.melee,
        primary: template.primary,
        secondary: template.secondary,
        item1: template.item1,
        item2: template.item2,
        chest: template.chest,
        hands: template.hands,
        legs: template.legs,
        feet: template.feet,
    };
};

const addInitialItemsToInventory = (nk: nkruntime.Nakama, userId: string, equipment: Character["equipment"]): void => {
    const itemIds = Object.values(equipment).filter((id): id is number => typeof id === "number" && id > 0);
    itemIds.forEach((itemId) => addItemToInventory(nk, userId, itemId, 1));
};

export const rpcListCharacters: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    let input: { offset?: number; limit?: number } = {};
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

    const offset = Math.max(0, Number.isFinite(input.offset as number) ? (input.offset as number) : 0);
    const limit = Math.min(50, Math.max(1, Number.isFinite(input.limit as number) ? (input.limit as number) : 50));

    const characters = readCharacterList(nk, ctx.userId)
        .slice()
        .sort((a, b) => a.charIndex - b.charIndex);
    const activeCharId = readActiveCharacterId(nk, ctx.userId);
    const paged = characters.slice(offset, offset + limit);

    return JSON.stringify({
        total: characters.length,
        offset,
        limit,
        activeCharId,
        characters: paged
    });
};

export const rpcCreateCharacter: nkruntime.RpcFunction = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string => {
    let input: { name?: string; sex?: number; hair?: number; face?: number; costume?: number; charIndex?: number } = {};
    try {
        input = payload ? JSON.parse(payload) : {};
    } catch {
        input = {};
    }
    const { name, sex, hair, face, costume, charIndex } = input;

    if (!name || typeof name !== "string") {
        throw new Error("Nome de personagem inválido.");
    }
    validateName(name);

    // 1. Verificar se o nome já existe (Globalmente)
    const query = `+value.name:${name}`;
    const results = nk.storageIndexList('idx_characters_name', query, 1);
    const indexed = results && (results as any).objects ? (results as any).objects : [];
    if (indexed.length > 0) {
        throw new Error("Este nome de personagem já está em uso.");
    }

    // 2. Criar objeto do personagem
    const safeSex = Number.isFinite(sex as number) ? (sex as number) : 0;
    const safeHair = Number.isFinite(hair as number) ? (hair as number) : 0;
    const safeFace = Number.isFinite(face as number) ? (face as number) : 0;
    const safeCostume = Number.isFinite(costume as number) ? (costume as number) : 0;

    if (safeSex < 0 || safeSex > 1) throw new Error("Sexo inválido.");
    if (safeHair < 0 || safeHair >= MAX_COSTUME_HAIR) throw new Error("Hair inválido.");
    if (safeFace < 0 || safeFace >= MAX_COSTUME_FACE) throw new Error("Face inválida.");
    if (safeCostume < 0 || safeCostume >= MAX_COSTUME_TEMPLATE) throw new Error("Costume inválido.");

    const currentChars = readCharacterList(nk, ctx.userId);

    if (currentChars.length >= MAX_CHARS) {
        throw new Error("Limite de personagens atingido.");
    }

    const resolvedIndex = resolveCharIndex(currentChars, charIndex);
    const equipment = buildInitialEquipment(safeSex, safeCostume);
    const newChar: Character = {
        id: nk.uuidv4(),
        charIndex: resolvedIndex,
        name: name,
        level: 1,
        xp: 0,
        hp: 100,
        ap: 0,
        bounty: 0,
        sex: safeSex,
        hair: safeHair,
        face: safeFace,
        equipment
    };

    // 3. Salvar na coleção do usuário
    currentChars.push(newChar);

    writeCharacterList(nk, ctx.userId, currentChars);

    addInitialItemsToInventory(nk, ctx.userId, equipment);

    const activeCharId = readActiveCharacterId(nk, ctx.userId);
    if (!activeCharId) {
        writeActiveCharacterId(nk, ctx.userId, newChar.id);
    }

    // 4. Indexar nome para busca de unicidade
    nk.storageWrite([{
        collection: 'character_names',
        key: name,
        userId: ctx.userId,
        value: { charId: newChar.id, name: name },
        permissionRead: 2, // Public Read
        permissionWrite: 0
    }]);

    return JSON.stringify(newChar);
};

export const rpcDeleteCharacter: nkruntime.RpcFunction = (ctx, logger, nk, payload): string => {
    let input: { charId?: string; charIndex?: number } = {};
    try {
        input = payload ? JSON.parse(payload) : {};
    } catch {
        input = {};
    }

    const characters = readCharacterList(nk, ctx.userId);
    const charId = input.charId;
    const charIndex = input.charIndex;
    if (!charId && !Number.isFinite(charIndex as number)) {
        throw new Error("charId ou charIndex é obrigatório.");
    }

    const index = charId
        ? characters.findIndex(c => c.id === charId)
        : characters.findIndex(c => c.charIndex === charIndex);
    if (index === -1) {
        throw new Error("Personagem não encontrado.");
    }

    const activeCharId = readActiveCharacterId(nk, ctx.userId);
    if (activeCharId === characters[index].id) {
        throw new Error("Não é possível deletar o personagem ativo.");
    }

    const [removed] = characters.splice(index, 1);
    writeCharacterList(nk, ctx.userId, characters);

    nk.storageDelete([{ collection: "character_names", key: removed.name, userId: ctx.userId }]);

    return JSON.stringify({ deleted: true, charId: removed.id });
};

export const rpcSelectCharacter: nkruntime.RpcFunction = (ctx, logger, nk, payload): string => {
    let input: { charId?: string; charIndex?: number } = {};
    try {
        input = payload ? JSON.parse(payload) : {};
    } catch {
        input = {};
    }

    const characters = readCharacterList(nk, ctx.userId);
    const charId = input.charId;
    const charIndex = input.charIndex;
    if (!charId && !Number.isFinite(charIndex as number)) {
        throw new Error("charId ou charIndex é obrigatório.");
    }

    const character = charId
        ? characters.find(c => c.id === charId)
        : characters.find(c => c.charIndex === charIndex);
    if (!character) {
        throw new Error("Personagem não encontrado.");
    }

    writeActiveCharacterId(nk, ctx.userId, character.id);

    return JSON.stringify({ selected: true, charId: character.id });
};

export const rpcGetCharacterInfo: nkruntime.RpcFunction = (ctx, logger, nk, payload): string => {
    let input: { charId?: string; charIndex?: number } = {};
    try {
        input = payload ? JSON.parse(payload) : {};
    } catch {
        input = {};
    }

    const characters = readCharacterList(nk, ctx.userId);
    const charId = input.charId;
    const charIndex = input.charIndex;
    if (!charId && !Number.isFinite(charIndex as number)) {
        throw new Error("charId ou charIndex é obrigatório.");
    }

    const character = charId
        ? characters.find(c => c.id === charId)
        : characters.find(c => c.charIndex === charIndex);
    if (!character) {
        throw new Error("Personagem não encontrado.");
    }

    return JSON.stringify(character);
};





