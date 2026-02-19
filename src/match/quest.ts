import { getDropTableData, getMapSpawn, getNpcSetByName, getNpcTemplate, getQuestByMap, getWorldItemDesc } from "../data_manager";
import { getLevelFromXp } from "../experience";
import { addItemToInventory } from "../items";
import { updateXpLeaderboard } from "../leaderboards";
import { applyDamage, getPiercingRatio, getResistRatio } from "./combat";
import { dist3, normalize } from "./math";
import type { MatchState, NpcState, PlayerState, Vec3 } from "./types";

export const buildQuestNpcs = (quest: any, stageIndex: number, mapId: number) => {
    const stage = quest?.stages?.[stageIndex];
    if (!stage) return {};
    const npcs: Record<string, NpcState> = {};
    let idx = 0;
    for (const entry of (stage.npcs ?? [])) {
        const template = getNpcTemplate(Number(entry.id));
        if (!template) continue;
        const count = Math.max(1, Number(entry.count) || 1);
        for (let i = 0; i < count; i++) {
            const base = getMapSpawn(mapId, 0, false);
            const pos = {
                x: base.x + (Math.random() - 0.5) * 200,
                y: base.y + (Math.random() - 0.5) * 200,
                z: base.z
            };
            const npcId = `npc-${stageIndex}-${idx++}`;
            npcs[npcId] = {
                id: npcId,
                templateId: template.id,
                name: template.name,
                health: Number(template.max_hp || 0),
                ap: Number(template.max_ap || 0),
                maxHealth: Number(template.max_hp || 0),
                maxAp: Number(template.max_ap || 0),
                pos,
                radius: Number(template.collision?.radius || 30),
                height: Number(template.collision?.height || 120),
                viewAngle: Number(template.view_angle || 20),
                speed: Number(template.speed?.default || 300),
                attackRange: Number(template.attack?.range || 150),
                weaponItemId: Number(template.attack?.weaponitem_id || 0),
                skills: Array.isArray(template.skills) ? template.skills : [],
                nextAttackTick: 0,
                nextSkillTick: {},
                dead: false
            };
        }
    }
    return npcs;
};

const mapScenarioNpcsetName = (name: string) => {
    if (!name) return name;
    const m = name.match(/^G(\d)(\d)$/i);
    if (!m) return name;
    const group = Number(m[1]);
    const idx = Number(m[2]);
    const letters = ["a", "b", "c", "d", "e", "f", "x"];
    const letter = letters[group] ?? "a";
    return `G${letter}${idx}`;
};

const pickNpcIdFromSet = (set: any) => {
    const base = Number(set?.basenpc);
    const add = Array.isArray(set?.addnpc) ? set.addnpc : [];
    let chosen = base;
    for (const entry of add) {
        const min = Number(entry?.min_rate ?? 0);
        const max = Number(entry?.max_rate ?? min);
        const rate = Math.max(0, Math.min(100, min + Math.random() * Math.max(0, max - min)));
        if (Math.random() * 100 <= rate) {
            const nid = Number(entry?.npc_id);
            if (Number.isFinite(nid)) chosen = nid;
        }
    }
    return Number.isFinite(chosen) ? chosen : null;
};

export const buildScenarioNpcs = (
    sector: { sectorId: number; npcsets: string[]; meleeSpawn?: number; rangeSpawn?: number; bossSpawn?: boolean },
    mapId: number
) => {
    const npcs: Record<string, NpcState> = {};
    const total = Math.max(1, (sector.meleeSpawn ?? 0) + (sector.rangeSpawn ?? 0) + (sector.bossSpawn ? 1 : 0));
    let idx = 0;
    for (let i = 0; i < total; i++) {
        const setNameRaw = sector.npcsets[i % sector.npcsets.length] ?? "";
        const setName = mapScenarioNpcsetName(setNameRaw);
        const set = getNpcSetByName(setName) ?? getNpcSetByName(setNameRaw);
        if (!set) continue;
        const npcId = pickNpcIdFromSet(set);
        if (!npcId) continue;
        const template = getNpcTemplate(npcId);
        if (!template) continue;
        const base = getMapSpawn(mapId, 0, false);
        const pos = {
            x: base.x + (Math.random() - 0.5) * 200,
            y: base.y + (Math.random() - 0.5) * 200,
            z: base.z
        };
        const npcKey = `npc-s-${sector.sectorId}-${idx++}`;
        npcs[npcKey] = {
            id: npcKey,
            templateId: template.id,
            name: template.name,
            health: Number(template.max_hp || 0),
            ap: Number(template.max_ap || 0),
            maxHealth: Number(template.max_hp || 0),
            maxAp: Number(template.max_ap || 0),
            pos,
            radius: Number(template.collision?.radius || 30),
            height: Number(template.collision?.height || 120),
            viewAngle: Number(template.view_angle || 20),
            speed: Number(template.speed?.default || 300),
            attackRange: Number(template.attack?.range || 150),
            weaponItemId: Number(template.attack?.weaponitem_id || 0),
            skills: Array.isArray(template.skills) ? template.skills : [],
            nextAttackTick: 0,
            nextSkillTick: {},
            dead: false
        };
    }
    return npcs;
};

export const broadcastNpcSpawn = (
    dispatcher: nkruntime.MatchDispatcher,
    npcs: Record<string, NpcState>,
    opCodeNpcSpawn: number,
    wrapPayload: (payload: any) => any,
    presences?: nkruntime.Presence[]
) => {
    const list = Object.values(npcs).map(n => ({
        id: n.id,
        templateId: n.templateId,
        name: n.name,
        pos: n.pos,
        health: n.health,
        maxHealth: n.maxHealth
    }));
    if (list.length === 0) return;
    dispatcher.broadcastMessage(
        opCodeNpcSpawn,
        JSON.stringify(wrapPayload({ npcs: list })),
        presences ?? null,
        null,
        true
    );
};

export const updateActiveCharXp = (nk: nkruntime.Nakama, userId: string, deltaXp: number) => {
    if (!deltaXp || deltaXp <= 0) return;
    const active = nk.storageRead([{ collection: "characters", key: "active", userId }]);
    const list = nk.storageRead([{ collection: "characters", key: "list", userId }]);
    if (active.length === 0 || list.length === 0) return;
    const activeId = (active[0].value as any)?.charId ?? null;
    if (!activeId) return;
    const obj = list[0].value as { characters: any[] };
    const idx = obj.characters.findIndex(c => c.id === activeId);
    if (idx === -1) return;
    const ch = obj.characters[idx];
    ch.xp = Number(ch.xp || 0) + deltaXp;
    const oldLevel = Number(ch.level || 1);
    ch.level = getLevelFromXp(ch.xp);

    if (ch.level > oldLevel) {
        // Reserved for level-up side effects.
    }

    updateXpLeaderboard(nk, userId, ch.name, ch.xp);

    nk.storageWrite([{
        collection: "characters",
        key: "list",
        userId,
        value: obj,
        permissionRead: 1,
        permissionWrite: 0
    }]);
};

export const awardQuestRewards = (nk: nkruntime.Nakama, state: MatchState, quest: any) => {
    const bounty = Number(quest?.rewards?.bounty || 0);
    const xp = Number(quest?.rewards?.xp || 0);
    for (const p of Object.values(state.players)) {
        if (bounty > 0) {
            nk.walletUpdate(p.presence.userId, { bounty }, { action: "quest_reward", questId: quest?.id ?? 0 }, true);
        }
        if (xp > 0) {
            updateActiveCharXp(nk, p.presence.userId, xp);
        }
    }
};

const dropIdToWorldItemName = (id: string) => {
    switch (id) {
        case "hp1": return "hp01";
        case "hp2": return "hp02";
        case "ap1": return "ap01";
        case "ap2": return "ap02";
        case "mag1": return "bullet01";
        case "mag2": return "bullet02";
        default: return null;
    }
};

const spawnWorldItemDrop = (state: MatchState, name: string, pos: Vec3) => {
    const desc = getWorldItemDesc(name);
    if (!desc) return;
    const respawnSec = Number.isFinite(desc.time) ? Number(desc.time) / 1000 : 0;
    state.worldItems.push({
        id: `drop-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        name,
        type: String(desc.type ?? "unknown"),
        amount: Number.isFinite(desc.amount) ? Number(desc.amount) : 0,
        pos,
        active: true,
        respawnTick: 0,
        respawnSec: respawnSec > 0 ? respawnSec : 0,
        oneShot: true
    });
};

export const handleQuestNpcDeath = (nk: nkruntime.Nakama, state: MatchState, attacker: PlayerState, npc: NpcState) => {
    const quest = getQuestByMap(state.stage.mapId);
    if (!quest) return;
    const dt = getDropTableData();
    const dropset = dt?.dropsets?.[0];
    const itemset = dropset?.itemsets?.[0];
    const items = itemset?.items ?? [];
    for (const entry of items) {
        const rate = Number(entry?.rate ?? 0);
        if (rate <= 0) continue;
        if (Math.random() > rate) continue;
        const id = String(entry?.id ?? "");
        const worldName = dropIdToWorldItemName(id);
        if (worldName) {
            spawnWorldItemDrop(state, worldName, npc.pos);
        } else if (Number.isFinite(Number(id))) {
            addItemToInventory(nk, attacker.presence.userId, Number(id), 1);
        }
    }
};

export const damageNpc = (
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    state: MatchState,
    attacker: PlayerState,
    npc: NpcState,
    damage: number,
    wrapPayload: (payload: any) => any,
    opCodeNpcDamage: number,
    opCodeNpcDie: number
) => {
    if (npc.dead) return;
    const dmg = Math.max(1, Math.floor(damage));
    npc.health = Math.max(0, npc.health - dmg);
    dispatcher.broadcastMessage(
        opCodeNpcDamage,
        JSON.stringify(wrapPayload({
            npcId: npc.id,
            attackerUserId: attacker.presence.userId,
            damage: dmg,
            hp: npc.health,
            maxHp: npc.maxHealth
        })),
        null,
        null,
        true
    );
    if (npc.health <= 0) {
        npc.dead = true;
        attacker.kills += 1;
        dispatcher.broadcastMessage(
            opCodeNpcDie,
            JSON.stringify(wrapPayload({
                npcId: npc.id,
                attackerUserId: attacker.presence.userId
            })),
            null,
            null,
            true
        );
        handleQuestNpcDeath(nk, state, attacker, npc);
    }
};

export const applySkillDamage = (player: PlayerState, attacker: PlayerState, damage: number, resistType: number) => {
    const resist = getResistRatio(player, resistType);
    const finalDamage = Math.max(1, Math.floor(damage * (1 - resist)));
    const piercing = getPiercingRatio("fragmentation", false);
    applyDamage(player, attacker, finalDamage, piercing);
    return finalDamage;
};

export const pickNearestPlayer = (state: MatchState, from: Vec3) => {
    let best: PlayerState | null = null;
    let bestDist = Infinity;
    for (const p of Object.values(state.players)) {
        if (p.spectator || p.disconnected) continue;
        if (p.dead) continue;
        const d = dist3(from, p.pos);
        if (d < bestDist) {
            best = p;
            bestDist = d;
        }
    }
    return best ? { player: best, dist: bestDist } : null;
};

export const moveTowards = (pos: Vec3, target: Vec3, speed: number) => {
    const dir = normalize({ x: target.x - pos.x, y: target.y - pos.y, z: target.z - pos.z });
    return {
        x: pos.x + dir.x * speed,
        y: pos.y + dir.y * speed,
        z: pos.z + dir.z * speed
    };
};
