import type { MatchState, NpcState, PlayerState } from "./types";

type LoopPostDeps = {
    tickRate: number;
    guardRecoilDuration: number;
    guardDuration: number;
    worldItemPickupRadius: number;
    npcTargetRange: number;
    npcMoveSpeedScale: number;
    npcAttackCooldownTicks: number;
    zstBlocked: number;
    zstNone: number;
    zstLoop: number;
    opCode: {
        sPlayerRespawn: number;
        sPlayerDamage: number;
        cRoomChat: number;
        heartbeat: number;
    };
    wrapPayload: (payload: any) => any;
    updateCAFactor: (player: PlayerState) => void;
    normalize: (v: { x: number; y: number; z: number }) => { x: number; y: number; z: number };
    applyKnockback: (state: MatchState, target: PlayerState, dir: { x: number; y: number; z: number }, force: number) => void;
    getSpawnPos: (state: MatchState, player: PlayerState) => { x: number; y: number; z: number };
    dist3: (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => number;
    applyWorldItemToPlayer: (dispatcher: nkruntime.MatchDispatcher, player: PlayerState, item: any) => boolean;
    pickNearestPlayer: (state: MatchState, pos: { x: number; y: number; z: number }) => { player: PlayerState; dist: number } | null;
    moveTowards: (from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }, step: number) => { x: number; y: number; z: number };
    getMapCollision: (mapId: number) => any;
    isBlockedMovement: (collision: any, from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) => boolean;
    getSkillTemplate: (skillId: number) => any;
    raycastCollision: (collision: any, from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) => boolean;
    applySkillDamage: (target: PlayerState, attacker: PlayerState, damage: number, resistType: number) => number;
    getItemData: (itemId: string) => any;
    getPiercingRatio: (weaponType: string, isHeadshot: boolean) => number;
    applyDamage: (target: PlayerState, attacker: PlayerState | null, damage: number, piercingRatio: number) => void;
    handlePlayerDeath: (dispatcher: nkruntime.MatchDispatcher, state: MatchState, target: PlayerState, attacker: PlayerState | null, tick: number) => void;
    damageNpc: (nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, state: MatchState, attacker: PlayerState, npc: NpcState, damage: number) => void;
    getQuestByMap: (mapId: number) => any;
    buildScenarioNpcs: (sector: any, mapId: number) => Record<string, NpcState>;
    buildQuestNpcs: (quest: any, stageIndex: number, mapId: number) => Record<string, NpcState>;
    broadcastNpcSpawn: (dispatcher: nkruntime.MatchDispatcher, npcs: Record<string, NpcState>, presences?: nkruntime.Presence[]) => void;
    updateActiveCharXp: (nk: nkruntime.Nakama, userId: string, amount: number) => void;
    awardQuestRewards: (nk: nkruntime.Nakama, state: MatchState, quest: any) => void;
    endRound: (dispatcher: nkruntime.MatchDispatcher, state: MatchState, reason: string) => void;
    broadcastMatchState: (dispatcher: nkruntime.MatchDispatcher, state: MatchState, tick: number) => void;
};

export const runLoopPostPhase = (
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    state: MatchState,
    tick: number,
    deps: LoopPostDeps
) => {
    Object.values(state.players).forEach((p) => {
        if (p.spectator || p.disconnected) return;
        if (!p.dead && tick !== p.lastShotTick) {
            deps.updateCAFactor(p);
        }
        if (p.pendingGuardRecoilTick && tick >= p.pendingGuardRecoilTick) {
            p.pendingGuardRecoilTick = 0;
            p.stunUntilTick = Math.max(p.stunUntilTick ?? 0, tick + Math.ceil(deps.guardRecoilDuration * deps.tickRate));
            p.stunType = deps.zstBlocked;
        }
        if (p.stunUntilTick && tick >= p.stunUntilTick) {
            p.stunUntilTick = 0;
            p.stunType = deps.zstNone;
            p.slowRatio = 1;
        }
        if (p.pendingDashTick && tick >= p.pendingDashTick) {
            p.pendingDashTick = 0;
            const dir = p.pendingDashDir ?? { x: 0, y: 0, z: 0 };
            if (dir.x || dir.y || dir.z) {
                const blastDir = deps.normalize({ x: dir.x * 300, y: dir.y * 300, z: 1700 });
                deps.applyKnockback(state, p, blastDir, Math.sqrt(300 * 300 + 1700 * 1700));
            }
        }
        if (p.guardStartTick && p.guardStartTick > 0) {
            const guardElapsed = (tick - p.guardStartTick) / deps.tickRate;
            if (guardElapsed > deps.guardDuration) {
                p.guardStartTick = 0;
                p.guardCancelUntilTick = tick + Math.ceil(0.2 * deps.tickRate);
            }
        }
        if (p.dead && tick >= p.respawnTick) {
            p.dead = false;
            p.health = p.maxHealth;
            p.ap = p.maxAp;
            p.pos = deps.getSpawnPos(state, p);
            p.rot = { x: 0, y: 0, z: 0 };
            dispatcher.broadcastMessage(
                deps.opCode.sPlayerRespawn,
                JSON.stringify(deps.wrapPayload({ userId: p.presence.userId, pos: p.pos })),
                null,
                null,
                true
            );
        }
        for (const ammo of Object.values(p.ammo)) {
            if (ammo.reloadEndTick > 0 && tick >= ammo.reloadEndTick) {
                ammo.reloadEndTick = 0;
                const load = Math.min(ammo.magazineSize, ammo.reserve);
                ammo.magazine = load;
                ammo.reserve -= load;
            }
        }
    });

    for (let i = state.worldItems.length - 1; i >= 0; i--) {
        const item = state.worldItems[i];
        if (!item.active && item.respawnTick > 0 && tick >= item.respawnTick) {
            item.active = true;
            item.respawnTick = 0;
        }
        if (!item.active) continue;
        for (const p of Object.values(state.players)) {
            if (p.spectator || p.disconnected) continue;
            if (p.dead) continue;
            if (deps.dist3(p.pos, item.pos) > deps.worldItemPickupRadius) continue;
            if (deps.applyWorldItemToPlayer(dispatcher, p, item)) {
                item.active = false;
                if (item.oneShot || item.respawnSec <= 0) {
                    state.worldItems.splice(i, 1);
                } else {
                    item.respawnTick = tick + Math.ceil(item.respawnSec * deps.tickRate);
                }
                break;
            }
        }
    }

    state.smokeZones = state.smokeZones.filter(z => z.endTick > tick);
    for (const zone of state.smokeZones) {
        for (const p of Object.values(state.players)) {
            if (p.spectator || p.disconnected) continue;
            if (p.dead) continue;
            if (deps.dist3(zone.pos, p.pos) > zone.radius) continue;
            if (zone.kind === "tear") {
                p.slowUntilTick = Math.max(p.slowUntilTick ?? 0, tick + 10);
                p.slowRatio = Math.min(p.slowRatio ?? 1, 0.7);
                p.poisonDamage = Math.max(p.poisonDamage ?? 1, 1);
                p.poisonUntilTick = Math.max(p.poisonUntilTick ?? 0, tick + 40);
            }
        }
    }

    for (const npc of Object.values(state.npcs)) {
        if (npc.dead) continue;
        const targetInfo = deps.pickNearestPlayer(state, npc.pos);
        if (!targetInfo || targetInfo.dist > deps.npcTargetRange) continue;
        const target = targetInfo.player;

        if (targetInfo.dist > npc.attackRange) {
            const step = npc.speed * deps.npcMoveSpeedScale;
            const nextPos = deps.moveTowards(npc.pos, target.pos, step);
            const collision = deps.getMapCollision(state.stage.mapId);
            if (!deps.isBlockedMovement(collision, npc.pos, nextPos)) {
                npc.pos = nextPos;
            }
            continue;
        }

        const collision = deps.getMapCollision(state.stage.mapId);
        let usedSkill = false;
        for (const skillId of npc.skills) {
            const skill = deps.getSkillTemplate(skillId);
            if (!skill) continue;
            const nextTick = npc.nextSkillTick[String(skillId)] ?? 0;
            if (tick < nextTick) continue;
            const delayTicks = Math.max(1, Math.ceil((Number(skill.delay) || 0) / 50));
            npc.nextSkillTick[String(skillId)] = tick + delayTicks;
            usedSkill = true;

            if (Number(skill.mod?.heal) > 0) {
                npc.health = Math.min(npc.maxHealth, npc.health + Number(skill.mod.heal));
                break;
            }

            const area = Number(skill.effectarea || 0);
            if (area > 0 || Number(skill.effecttype) === 4) {
                const radius = Math.max(1, area * 100);
                for (const p of Object.values(state.players)) {
                    if (p.spectator || p.disconnected) continue;
                    if (p.dead) continue;
                    if (deps.dist3(npc.pos, p.pos) > radius) continue;
                    const pPos = { x: p.pos.x, y: p.pos.y, z: p.pos.z + 80 };
                    if (collision && deps.raycastCollision(collision, npc.pos, pPos)) continue;
                    const dmg = deps.applySkillDamage(p, p, Number(skill.mod?.damage || 0), Number(skill.resisttype || 0));
                    if (skill.mod?.root || skill.mod?.antimotion) {
                        const durationMs = Number(skill.effecttime || 0);
                        if (durationMs > 0) {
                            const durationTicks = Math.ceil(durationMs / 50);
                            p.stunUntilTick = Math.max(p.stunUntilTick ?? 0, tick + durationTicks);
                            p.stunType = deps.zstLoop;
                            p.slowUntilTick = Math.max(p.slowUntilTick ?? 0, tick + durationTicks);
                            p.slowRatio = 0;
                        }
                    }
                    dispatcher.broadcastMessage(
                        deps.opCode.sPlayerDamage,
                        JSON.stringify(deps.wrapPayload({
                            targetUserId: p.presence.userId,
                            attackerUserId: npc.id,
                            damage: dmg,
                            hp: p.health,
                            ap: p.ap,
                            part: "body"
                        })),
                        null,
                        null,
                        true
                    );
                }
                break;
            }

            const targetPos = { x: target.pos.x, y: target.pos.y, z: target.pos.z + 80 };
            if (collision && deps.raycastCollision(collision, npc.pos, targetPos)) break;
            const dmg = deps.applySkillDamage(target, target, Number(skill.mod?.damage || 0), Number(skill.resisttype || 0));
            if (skill.mod?.root || skill.mod?.antimotion) {
                const durationMs = Number(skill.effecttime || 0);
                if (durationMs > 0) {
                    const durationTicks = Math.ceil(durationMs / 50);
                    target.stunUntilTick = Math.max(target.stunUntilTick ?? 0, tick + durationTicks);
                    target.stunType = deps.zstLoop;
                    target.slowUntilTick = Math.max(target.slowUntilTick ?? 0, tick + durationTicks);
                    target.slowRatio = 0;
                }
            }
            dispatcher.broadcastMessage(
                deps.opCode.sPlayerDamage,
                JSON.stringify(deps.wrapPayload({
                    targetUserId: target.presence.userId,
                    attackerUserId: npc.id,
                    damage: dmg,
                    hp: target.health,
                    ap: target.ap,
                    part: "body"
                })),
                null,
                null,
                true
            );
            if (target.health <= 0) {
                deps.handlePlayerDeath(dispatcher, state, target, null, tick);
            }
            break;
        }

        if (usedSkill) continue;
        if (tick < npc.nextAttackTick) continue;
        npc.nextAttackTick = tick + deps.npcAttackCooldownTicks;
        const targetPos = { x: target.pos.x, y: target.pos.y, z: target.pos.z + 80 };
        if (collision && deps.raycastCollision(collision, npc.pos, targetPos)) continue;
        const item = deps.getItemData(String(npc.weaponItemId)) as any;
        const damage = Number(item?.damage || 5);
        const piercing = deps.getPiercingRatio("dagger", false);
        deps.applyDamage(target, target, damage, piercing);
        dispatcher.broadcastMessage(
            deps.opCode.sPlayerDamage,
            JSON.stringify(deps.wrapPayload({
                targetUserId: target.presence.userId,
                attackerUserId: npc.id,
                damage,
                hp: target.health,
                ap: target.ap,
                part: "body"
            })),
            null,
            null,
            true
        );
        if (target.health <= 0) {
            deps.handlePlayerDeath(dispatcher, state, target, null, tick);
        }
    }

    if (state.quest && !state.quest.completed) {
        if (state.quest.stageTransitionTick && state.quest.stageTransitionTick > 0) {
            if (tick >= state.quest.stageTransitionTick) {
                state.quest.stageTransitionTick = 0;
                const nextIndex = state.quest.stageIndex + 1;
                if (state.quest.mode === "scenario" && state.quest.sectors) {
                    if (nextIndex < state.quest.sectors.length) {
                        state.quest.stageIndex = nextIndex;
                        state.npcs = deps.buildScenarioNpcs(state.quest.sectors[nextIndex], state.stage.mapId);
                        deps.broadcastNpcSpawn(dispatcher, state.npcs);
                    } else {
                        state.quest.completed = true;
                        const bounty = Number(state.quest.scenarioBp ?? 0);
                        const xp = Number(state.quest.scenarioXp ?? 0);
                        for (const p of Object.values(state.players)) {
                            if (p.spectator || p.disconnected) continue;
                            if (bounty > 0) nk.walletUpdate(p.presence.userId, { bounty }, { action: "quest_reward", scenario: state.quest.scenarioTitle ?? "" }, true);
                            if (xp > 0) deps.updateActiveCharXp(nk, p.presence.userId, xp);
                        }
                        deps.endRound(dispatcher, state, "quest_clear");
                    }
                } else {
                    const quest = deps.getQuestByMap(state.stage.mapId);
                    if (quest?.stages) {
                        if (nextIndex < quest.stages.length) {
                            state.quest.stageIndex = nextIndex;
                            state.npcs = deps.buildQuestNpcs(quest, nextIndex, state.stage.mapId);
                            deps.broadcastNpcSpawn(dispatcher, state.npcs);
                        } else {
                            state.quest.completed = true;
                            deps.awardQuestRewards(nk, state, quest);
                            deps.endRound(dispatcher, state, "quest_clear");
                        }
                    }
                }
            }
        } else {
            const allDead = Object.values(state.npcs).length > 0 && Object.values(state.npcs).every(n => n.dead);
            if (allDead) {
                state.quest.stageTransitionTick = tick + (5 * deps.tickRate);
                for (const p of Object.values(state.players)) {
                    if (p.dead) {
                        p.dead = false;
                        p.health = p.maxHealth;
                        p.ap = p.maxAp;
                        p.pos = deps.getSpawnPos(state, p);
                        dispatcher.broadcastMessage(
                            deps.opCode.sPlayerRespawn,
                            JSON.stringify(deps.wrapPayload({ userId: p.presence.userId, pos: p.pos })),
                            null,
                            null,
                            true
                        );
                    }
                }
                dispatcher.broadcastMessage(
                    deps.opCode.cRoomChat,
                    JSON.stringify(deps.wrapPayload({
                        userId: "system",
                        username: "SERVER",
                        message: "STAGE CLEAR! Prepare-se para a proxima fase..."
                    })),
                    null,
                    null,
                    true
                );
            }
        }
    }

    const broadcastData = {
        players: state.players,
        tick
    };
    dispatcher.broadcastMessage(deps.opCode.heartbeat, JSON.stringify(deps.wrapPayload(broadcastData)));
    deps.broadcastMatchState(dispatcher, state, tick);
};
