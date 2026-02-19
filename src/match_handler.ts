import { getGameTypeConfig, getItemData, getLegacyEffectById, getLegacyItemEffect, getMapCollision, getMapSpawn, getQuestByMap, getSkillTemplate, getWorldItemDesc, getWorldItemDescByModel, getWorldItemSpawns, getQuestMapsetByName, getScenarioForMapset, getMapById } from "./data_manager";
import { getServerFeatureFlags } from "./server_flags";
import { clamp, dist2, dist3, dot, normalize } from "./match/math";
import { adjustMoveAgainstCollision, checkSolidCylinder, checkWallBetween, getFloorDistance, isBlockedMovement, isNearWall, raycastCollision, raycastCollisionImpact } from "./match/collision";
import { applyDamage, createMt19937, distanceLineSegment, distancePointToSegment, getMeleeMotionParams, getPiercingRatio, getSpreadDir, normalizeWeaponType, playerHitTest, rayCylinderHit, reflect } from "./match/combat";
import { applySkillDamage as questApplySkillDamage, awardQuestRewards as questAwardQuestRewards, broadcastNpcSpawn as questBroadcastNpcSpawn, buildQuestNpcs as questBuildQuestNpcs, buildScenarioNpcs as questBuildScenarioNpcs, damageNpc as questDamageNpc, moveTowards as questMoveTowards, pickNearestPlayer as questPickNearestPlayer, updateActiveCharXp as questUpdateActiveCharXp } from "./match/quest";
import { processProjectiles } from "./match/projectiles";
import { runLoopInputPhase } from "./match/loop_input";
import { runLoopPostPhase } from "./match/loop_post";
import { assignAssassinationVips as roomAssignAssassinationVips, broadcastMatchState as roomBroadcastMatchState, broadcastReadyState as roomBroadcastReadyState, broadcastRoomUpdate as roomBroadcastRoomUpdate, cleanupDisconnected as roomCleanupDisconnected, isActivePlayer as roomIsActivePlayer, reassignMaster as roomReassignMaster, updateDuelState as roomUpdateDuelState } from "./match/room";
import { checkScoreLimitReached as roundCheckScoreLimitReached, endRound as roundEndRound } from "./match/round";
import { createLifecycleHandlers } from "./match/lifecycle";
import type { MatchState, NpcState, PlayerState, WorldItemState } from "./match/types";



// OpCodes para o OpenGunZ Nakama
export enum OpCode {
    // Legacy opcodes (accepted for compatibility)
    MOVE = 1,
    ATTACK = 2,
    DAMAGE = 3,
    HEARTBEAT = 4,
    // Contract opcodes
    S_MATCH_WELCOME = 1000,
    S_MATCH_STATE = 1001,
    S_MATCH_DELTA = 1002,
    S_MATCH_START = 1003,
    S_MATCH_END = 1004,
    S_MATCH_ERROR = 1099,
    C_INPUT_MOVE = 2001,
    C_INPUT_ATTACK = 2002,
    C_INPUT_SKILL = 2003,
    C_INPUT_EMOTE = 2004,
    // Room/Stage
    C_READY = 4001,
    C_UNREADY = 4002,
    S_READY_STATE = 4003,
    S_ROOM_UPDATE = 4004,
    C_TEAM_CHANGE = 4106,
    C_ROOM_CHAT = 4107,
    C_CLIENT_READY = 4108,
    // Match flow
    // Gameplay events
    S_PLAYER_SPAWN = 3001,
    S_PLAYER_DAMAGE = 3002,
    S_PLAYER_DIE = 3003,
    S_PLAYER_RESPAWN = 3004
    ,
    S_NPC_SPAWN = 3101,
    S_NPC_DAMAGE = 3102,
    S_NPC_DIE = 3103,
    TIME_SYNC = 4201
}

const RT_VERSION = 1;
const MAX_POS_ABS = 100000;
const MAX_ATTACK_RANGE = 600;
const ATTACK_COOLDOWN_TICKS = 4;
const DEFAULT_DAMAGE = 10;
const DEFAULT_DELAY_MS = 350;
const AIM_CONE_DOT = 0.8;
const PLAYER_HEIGHT = 180;
const PLAYER_RADIUS = 33;
const HEAD_OFFSET_Z = PLAYER_HEIGHT - 10;
const BODY_OFFSET_Z = 100;
const LEGS_OFFSET_Z = 40;
const HEAD_RADIUS = Math.max(12, Math.floor(PLAYER_RADIUS * 0.5));
const BODY_RADIUS = PLAYER_RADIUS;
const LEGS_RADIUS = PLAYER_RADIUS;
const TEAM_RED = 1;
const TEAM_BLUE = 2;
const SHOTGUN_PELLETS = 12;
const SHOTGUN_DIFFUSE_RANGE = 0.1;
const TICK_RATE = 20;
const TICK_DT = 1 / TICK_RATE;
const MAX_SPEED = 1000;
const RUN_SPEED = 630;
const BACK_SPEED = 450;
const ACCEL_SPEED = 7000;
const STOP_SPEED = 3000;
const STOP_FORMAX_SPEED = 7100;
const SWORD_DASH = 1000;
const GUN_DASH = 900;
const AIR_MOVE = 0.05;
const JUMP_QUEUE_TIME = 0.3;
const JUMP_VELOCITY = 900;
const WALL_JUMP_VELOCITY = 350;
const JUMP2_WALL_VELOCITY = 300;
const JUMP2_VELOCITY = 1400;
const WALL_JUMP2_VELOCITY = 1300;
const TUMBLE_DELAY_TIME = 0.5;
const WALL_JUMP_TIME_FRONT = 1.5;
const WALL_JUMP_TIME_SIDE = 2.3;
const WALL_JUMP2_TIME_FRONT = 0.95;
const WALL_JUMP2_TIME_SIDE = 2.1;
const ZC_STATE_LOWER_END = 72;
const ZC_STATE_LOWER_RUN_FORWARD = 5;
const ZC_STATE_LOWER_RUN_BACK = 6;
const ZC_STATE_LOWER_RUN_LEFT = 7;
const ZC_STATE_LOWER_RUN_RIGHT = 8;
const ZC_STATE_LOWER_JUMP_UP = 9;
const ZC_STATE_LOWER_JUMP_DOWN = 10;
const ZC_STATE_LOWER_RUN_WALL_LEFT = 15;
const ZC_STATE_LOWER_RUN_WALL_LEFT_DOWN = 16;
const ZC_STATE_LOWER_RUN_WALL = 17;
const ZC_STATE_LOWER_RUN_WALL_DOWN_FORWARD = 18;
const ZC_STATE_LOWER_RUN_WALL_DOWN = 19;
const ZC_STATE_LOWER_RUN_WALL_RIGHT = 20;
const ZC_STATE_LOWER_RUN_WALL_RIGHT_DOWN = 21;
const ZC_STATE_LOWER_TUMBLE_FORWARD = 22;
const ZC_STATE_LOWER_TUMBLE_BACK = 23;
const ZC_STATE_LOWER_TUMBLE_RIGHT = 24;
const ZC_STATE_LOWER_TUMBLE_LEFT = 25;
const ZC_STATE_LOWER_BIND = 26;
const ZC_STATE_LOWER_JUMP_WALL_FORWARD = 27;
const ZC_STATE_LOWER_JUMP_WALL_BACK = 28;
const ZC_STATE_LOWER_JUMP_WALL_LEFT = 29;
const ZC_STATE_LOWER_JUMP_WALL_RIGHT = 30;
const ZC_STATE_LOWER_GUARD_START = 42;
const ZC_STATE_LOWER_GUARD_IDLE = 43;
const ZC_STATE_LOWER_GUARD_BLOCK1 = 44;
const ZC_STATE_LOWER_GUARD_BLOCK1_RET = 45;
const ZC_STATE_LOWER_GUARD_BLOCK2 = 46;
const ZC_STATE_LOWER_GUARD_CANCEL = 47;
const ZC_STATE_LOWER_UPPERCUT = 54;
const ZC_SKILL_UPPERCUT = 1;
const ZC_SKILL_SPLASHSHOT = 2;
const ZC_SKILL_DASH = 3;
const ZC_SKILL_CHARGEDSHOT = 4;
const ZST_NONE = -1;
const ZST_DAMAGE1 = 0;
const ZST_DAMAGE2 = 1;
const ZST_SLASH = 2;
const ZST_BLOCKED = 3;
const ZST_LIGHTNING = 4;
const ZST_LOOP = 5;
const DOT_TICK_INTERVAL = 20;
const CA_FACTOR_PISTOL = 0.3;
const CA_FACTOR_SMG = 0.3;
const CA_FACTOR_REVOLVER = 0.35;
const CA_FACTOR_SHOTGUN = 1.0;
const CA_FACTOR_RIFLE = 0.25;
const CA_FACTOR_MACHINEGUN = 1.0;
const CA_FACTOR_ROCKET = 1.0;
const CAFACTOR_DEC_DELAY_TIME = 0.2;
const GUARD_RECOIL_DELAY = 0.2;
const GUARD_RECOIL_DURATION = 0.2;
const CHARGED_TIME = 15;
const COUNTER_CHARGED_TIME = 1;
const GUARD_DURATION = 2.0;
const DEFAULT_RELOAD_TICKS = 80;
const WORLD_ITEM_PICKUP_RADIUS = 80;
const RECONNECT_GRACE_TICKS = 30 * TICK_RATE;
const BASE_MAX_WEIGHT = 100;
const NPC_ATTACK_COOLDOWN_TICKS = TICK_RATE;
const NPC_MOVE_SPEED_SCALE = 0.02;
const NPC_TARGET_RANGE = 5000;
const PROJECTILE_SPEED_ROCKET = 2700 / TICK_RATE;
const PROJECTILE_SPEED_GRENADE = 160;
const FLASHBANG_DISTANCE = 2000;
const FLASHBANG_DURATION_TICKS = 200;
const SMOKE_DURATION_TICKS = 600;

const nowMs = () => Date.now();

const wrapPayload = (payload: any) => ({
    v: RT_VERSION,
    t: nowMs(),
    payload
});

const parseEnvelope = (raw: any) => {
    if (raw && typeof raw === "object" && raw.payload !== undefined) {
        const v = raw.v ?? RT_VERSION;
        return { payload: raw.payload ?? {}, versionOk: v === RT_VERSION };
    }
    return { payload: raw ?? {}, versionOk: true };
};

const isFiniteNumber = (v: unknown) => typeof v === "number" && Number.isFinite(v);

const normalizeTimeLimit = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    if (value >= 99999) return 0;
    if (value <= 300) return value * 60;
    return value;
};

const isVec3 = (v: any) =>
    v && isFiniteNumber(v.x) && isFiniteNumber(v.y) && isFiniteNumber(v.z) &&
    Math.abs(v.x) <= MAX_POS_ABS && Math.abs(v.y) <= MAX_POS_ABS && Math.abs(v.z) <= MAX_POS_ABS;

const isLowerState = (anim: number) => Number.isFinite(anim) && anim >= 0 && anim < ZC_STATE_LOWER_END;
const isWallRunState = (anim: number) =>
    anim === ZC_STATE_LOWER_RUN_WALL_LEFT ||
    anim === ZC_STATE_LOWER_RUN_WALL_LEFT_DOWN ||
    anim === ZC_STATE_LOWER_RUN_WALL ||
    anim === ZC_STATE_LOWER_RUN_WALL_DOWN_FORWARD ||
    anim === ZC_STATE_LOWER_RUN_WALL_DOWN ||
    anim === ZC_STATE_LOWER_RUN_WALL_RIGHT ||
    anim === ZC_STATE_LOWER_RUN_WALL_RIGHT_DOWN;
const isWallJumpState = (anim: number) =>
    anim === ZC_STATE_LOWER_JUMP_WALL_FORWARD ||
    anim === ZC_STATE_LOWER_JUMP_WALL_BACK ||
    anim === ZC_STATE_LOWER_JUMP_WALL_LEFT ||
    anim === ZC_STATE_LOWER_JUMP_WALL_RIGHT;
const isWallJump2State = (anim: number) =>
    anim === ZC_STATE_LOWER_RUN_WALL_LEFT_DOWN ||
    anim === ZC_STATE_LOWER_RUN_WALL_RIGHT_DOWN ||
    anim === ZC_STATE_LOWER_RUN_WALL_DOWN_FORWARD ||
    anim === ZC_STATE_LOWER_RUN_WALL_DOWN;

const getWallJumpDirFromAnim = (anim: number) => {
    switch (anim) {
        case ZC_STATE_LOWER_RUN_WALL_LEFT:
        case ZC_STATE_LOWER_JUMP_WALL_LEFT:
        case ZC_STATE_LOWER_RUN_WALL_LEFT_DOWN:
            return 0;
        case ZC_STATE_LOWER_RUN_WALL:
        case ZC_STATE_LOWER_RUN_WALL_DOWN_FORWARD:
        case ZC_STATE_LOWER_RUN_WALL_DOWN:
        case ZC_STATE_LOWER_JUMP_WALL_FORWARD:
        case ZC_STATE_LOWER_JUMP_WALL_BACK:
            return 1;
        case ZC_STATE_LOWER_RUN_WALL_RIGHT:
        case ZC_STATE_LOWER_JUMP_WALL_RIGHT:
        case ZC_STATE_LOWER_RUN_WALL_RIGHT_DOWN:
            return 2;
        default:
            return -1;
    }
};
const isTumbleState = (anim: number) =>
    anim === ZC_STATE_LOWER_TUMBLE_FORWARD ||
    anim === ZC_STATE_LOWER_TUMBLE_BACK ||
    anim === ZC_STATE_LOWER_TUMBLE_RIGHT ||
    anim === ZC_STATE_LOWER_TUMBLE_LEFT;

const checkScoreLimitReached = (state: MatchState) => roundCheckScoreLimitReached(state);

const endRound = (dispatcher: nkruntime.MatchDispatcher, state: MatchState, reason: string) =>
    roundEndRound(dispatcher, state, reason, {
        teamRed: TEAM_RED,
        teamBlue: TEAM_BLUE,
        opCodeMatchEnd: OpCode.S_MATCH_END,
        wrapPayload
    });

const processStatusEffects = (nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, state: MatchState, player: PlayerState, tick: number) => {
    if (player.dead) return;

    // Poison DOT
    if (player.poisonUntilTick && tick <= player.poisonUntilTick) {
        if (!player.nextPoisonTick || tick >= player.nextPoisonTick) {
            const damage = player.poisonDamage ?? 5;
            applyDamage(player, null, damage, 0);
            player.nextPoisonTick = tick + TICK_RATE; // 1 second
            dispatcher.broadcastMessage(OpCode.S_PLAYER_DAMAGE, JSON.stringify(wrapPayload({
                targetUserId: player.presence.userId,
                attackerUserId: "",
                damage,
                hp: player.health,
                ap: player.ap,
                part: "body"
            })));
        }
    }

    // Burn DOT
    if (player.burnUntilTick && tick <= player.burnUntilTick) {
        if (!player.nextBurnTick || tick >= player.nextBurnTick) {
            const damage = player.burnDamage ?? 5;
            applyDamage(player, null, damage, 0);
            player.nextBurnTick = tick + TICK_RATE;
            dispatcher.broadcastMessage(OpCode.S_PLAYER_DAMAGE, JSON.stringify(wrapPayload({
                targetUserId: player.presence.userId,
                attackerUserId: "",
                damage,
                hp: player.health,
                ap: player.ap,
                part: "body"
            })));
        }
    }

    // Shock/Lightning DOT
    if (player.lightningUntilTick && tick <= player.lightningUntilTick) {
        if (!player.nextLightningTick || tick >= player.nextLightningTick) {
            const damage = player.lightningDamage ?? 5;
            applyDamage(player, null, damage, 0);
            player.nextLightningTick = tick + TICK_RATE;
            dispatcher.broadcastMessage(OpCode.S_PLAYER_DAMAGE, JSON.stringify(wrapPayload({
                targetUserId: player.presence.userId,
                attackerUserId: "",
                damage,
                hp: player.health,
                ap: player.ap,
                part: "body"
            })));
        }
    }

    // Check if player died from status effects
    if (player.health <= 0 && !player.dead) {
        player.dead = true;
        player.respawnTick = tick + 7 * TICK_RATE;
        player.deaths += 1;
        dispatcher.broadcastMessage(OpCode.S_PLAYER_DIE, JSON.stringify(wrapPayload({
            targetUserId: player.presence.userId,
            attackerUserId: ""
        })));
    }
};

const getWeaponCAFBase = (weaponType: string) => {
    switch (weaponType) {
        case "pistol":
        case "pistolx2":
            return CA_FACTOR_PISTOL;
        case "revolver":
        case "revolverx2":
            return CA_FACTOR_REVOLVER;
        case "smg":
        case "smgx2":
            return CA_FACTOR_SMG;
        case "shotgun":
        case "sawedshotgun":
            return CA_FACTOR_SHOTGUN;
        case "machinegun":
            return CA_FACTOR_MACHINEGUN;
        case "rifle":
        case "snifer":
            return CA_FACTOR_RIFLE;
        case "rocket":
            return CA_FACTOR_ROCKET;
        default:
            return 1.0;
    }
};

const isGuardNonrecoilable = (anim: number) =>
    anim >= ZC_STATE_LOWER_GUARD_IDLE && anim <= ZC_STATE_LOWER_GUARD_CANCEL;

const isGuardRecoilable = (anim: number) =>
    anim >= ZC_STATE_LOWER_GUARD_IDLE && anim <= ZC_STATE_LOWER_GUARD_BLOCK2;

const canGuardWithWeapon = (weaponType: string) =>
    weaponType === "katana" || weaponType === "doublekatana";

const isGuarding = (player: PlayerState, tick?: number) => {
    if (player.guardCancelUntilTick && tick !== undefined && tick < player.guardCancelUntilTick) return false;
    if (!isGuardNonrecoilable(player.anim)) return false;
    const weaponId = player.currentWeaponId;
    const weapon = weaponId ? getWeaponInfo(weaponId) : null;
    if (!weapon) return false;
    return canGuardWithWeapon(weapon.weaponType);
};

const isGuardingRecoilable = (player: PlayerState, tick?: number) => {
    if (player.guardCancelUntilTick && tick !== undefined && tick < player.guardCancelUntilTick) return false;
    if (!isGuardRecoilable(player.anim)) return false;
    const weaponId = player.currentWeaponId;
    const weapon = weaponId ? getWeaponInfo(weaponId) : null;
    if (!weapon) return false;
    return canGuardWithWeapon(weapon.weaponType);
};

const getStunTypeForMelee = (motion: string, attacker: PlayerState) => {
    const m = motion.toLowerCase();
    if (m === "slash5" || m === "massive") {
        return attacker.enchantType === "enchant_lightning" ? ZST_LIGHTNING : ZST_SLASH;
    }
    const match = m.match(/slash([1-4])/);
    if (match) {
        const idx = Number(match[1]);
        return idx % 2 === 1 ? ZST_DAMAGE1 : ZST_DAMAGE2;
    }
    return ZST_DAMAGE1;
};

const getProjectileSpeed = (weaponType: string) => {
    switch (weaponType) {
        case "rocket":
            return PROJECTILE_SPEED_ROCKET;
        case "fragmentation":
            return PROJECTILE_SPEED_GRENADE;
        default:
            return PROJECTILE_SPEED_ROCKET;
    }
};

const isMeleeWeaponType = (weaponType: string) => {
    switch (weaponType) {
        case "dagger":
        case "dualdagger":
        case "katana":
        case "doublekatana":
        case "greatsword":
            return true;
        default:
            return false;
    }
};

const getKnockbackForce = (itemId?: number) => {
    if (!itemId) return 0;
    const item = getItemData(String(itemId)) as any;
    const type = String(item?.type ?? "").toLowerCase();
    const legacy = getLegacyItemEffect(itemId);
    const effectId = legacy?.effect_id ? Number(legacy.effect_id) : 0;
    const effect = effectId ? getLegacyEffectById(effectId) : null;
    const effectKb = effect?.knockback ? Number(effect.knockback) : 0;
    if (type === "melee") return 200;
    if (type === "range") return effectKb > 0 ? effectKb : 200;
    return effectKb;
};

const applyKnockback = (state: MatchState, target: PlayerState, dir: { x: number; y: number; z: number }, force: number) => {
    if (!force || !Number.isFinite(force)) return;
    const scale = 0.05;
    const offset = { x: dir.x * force * scale, y: dir.y * force * scale, z: dir.z * force * scale };
    const nextPos = { x: target.pos.x + offset.x, y: target.pos.y + offset.y, z: target.pos.z + offset.z };
    const collision = getMapCollision(state.stage.mapId);
    if (!isBlockedMovement(collision, target.pos, nextPos)) {
        target.pos = nextPos;
    }
};

const getHitOffsets = (_anim: number) => {
    return { head: HEAD_OFFSET_Z, body: BODY_OFFSET_Z, legs: LEGS_OFFSET_Z };
};

const getHitboxProfile = (_anim: number) => {
    return { height: PLAYER_HEIGHT, radius: PLAYER_RADIUS };
};
const getWeaponInfo = (weaponId?: number) => {
    if (!weaponId) return null;
    const item = getItemData(String(weaponId)) as any;
    if (!item) return null;
    const damage = Number(item.damage);
    const range = Number(item.range);
    const delay = Number(item.delay);
    const reloadTime = Number(item.reloadtime);
    const magazine = Number(item.magazine);
    const maxbullet = Number(item.maxbullet);
    const ctrlAbility = Number(item.ctrl_ability);
    const limitSpeed = Number(item.limitspeed);
    const limitWall = Number(item.limitwall);
    const limitJump = Number(item.limitjump);
    const limitTumble = Number(item.limittumble);
    const weaponType = normalizeWeaponType(String(item.weapon ?? item.type ?? "unknown").toLowerCase());
    return {
        id: weaponId,
        damage: Number.isFinite(damage) ? damage : DEFAULT_DAMAGE,
        range: Number.isFinite(range) ? range : MAX_ATTACK_RANGE,
        delay: Number.isFinite(delay) ? delay : DEFAULT_DELAY_MS,
        reloadTime: Number.isFinite(reloadTime) ? reloadTime : 0,
        magazine: Number.isFinite(magazine) ? magazine : 0,
        maxbullet: Number.isFinite(maxbullet) ? maxbullet : 0,
        ctrlAbility: Number.isFinite(ctrlAbility) ? ctrlAbility : 0,
        limitSpeed: Number.isFinite(limitSpeed) ? limitSpeed : 0,
        limitWall: Number.isFinite(limitWall) ? limitWall : 0,
        limitJump: Number.isFinite(limitJump) ? limitJump : 0,
        limitTumble: Number.isFinite(limitTumble) ? limitTumble : 0,
        weaponType
    };
};

const getWeaponCooldownTicks = (weapon: { delay?: number }) => {
    const delayMs = Number.isFinite(weapon.delay) ? (weapon.delay as number) : DEFAULT_DELAY_MS;
    return Math.max(1, Math.ceil(delayMs / 50));
};

const getReloadTicks = (weapon: { reloadTime?: number }) => {
    const seconds = Number.isFinite(weapon.reloadTime) ? (weapon.reloadTime as number) : 0;
    if (seconds <= 0) return DEFAULT_RELOAD_TICKS;
    return Math.max(1, Math.ceil(seconds * TICK_RATE));
};

const getItemStat = (itemId: number | undefined, field: "hp" | "ap" | "weight" | "maxwt" | "sf" | "fr" | "cr" | "pr" | "lr") => {
    if (!itemId) return 0;
    const item = getItemData(String(itemId)) as any;
    if (!item) return 0;
    const val = Number(item[field]);
    return Number.isFinite(val) ? val : 0;
};

const computeEquipmentStats = (equipment: any) => {
    if (!equipment) return { hp: 0, ap: 0, weight: 0, maxwt: 0, sf: 0, fr: 0, cr: 0, pr: 0, lr: 0 };
    const ids = Object.values(equipment).filter((v): v is number => typeof v === "number" && v > 0);
    let hp = 0;
    let ap = 0;
    let weight = 0;
    let maxwt = 0;
    let sf = 0;
    let fr = 0;
    let cr = 0;
    let pr = 0;
    let lr = 0;
    for (const id of ids) {
        hp += getItemStat(id, "hp");
        ap += getItemStat(id, "ap");
        weight += getItemStat(id, "weight");
        maxwt += getItemStat(id, "maxwt");
        sf += getItemStat(id, "sf");
        fr += getItemStat(id, "fr");
        cr += getItemStat(id, "cr");
        pr += getItemStat(id, "pr");
        lr += getItemStat(id, "lr");
    }
    return { hp, ap, weight, maxwt, sf, fr, cr, pr, lr };
};

const applyWorldItemToPlayer = (dispatcher: nkruntime.MatchDispatcher, player: PlayerState, item: WorldItemState) => {
    const amount = Math.max(0, Number(item.amount) || 0);
    let consumed = false;

    switch (item.type) {
        case "hp": {
            if (player.health < player.maxHealth) {
                player.health = clamp(player.health + amount, 0, player.maxHealth);
                consumed = true;
            }
            break;
        }
        case "ap": {
            if (player.ap < player.maxAp) {
                player.ap = clamp(player.ap + amount, 0, player.maxAp);
                consumed = true;
            }
            break;
        }
        case "hpap": {
            if (player.health < player.maxHealth || player.ap < player.maxAp) {
                player.health = clamp(player.health + amount, 0, player.maxHealth);
                player.ap = clamp(player.ap + amount, 0, player.maxAp);
                consumed = true;
            }
            break;
        }
        case "bullet": {
            const weapons = [player.weapons.primary, player.weapons.secondary].filter((id): id is number => typeof id === "number");
            let ammoAdded = false;
            for (const weaponId of weapons) {
                const weapon = getWeaponInfo(weaponId);
                if (!weapon) continue;
                const ammo = ensureAmmoState(player, weaponId, weapon);
                const magazineSize = ammo.magazineSize;
                const maxbullet = Math.max(magazineSize, Number(weapon.maxbullet) || 0);
                const currentTotal = ammo.magazine + ammo.reserve;
                if (currentTotal < maxbullet) {
                    const add = amount * Math.max(1, magazineSize);
                    const newTotal = Math.min(maxbullet, currentTotal + add);
                    if (ammo.magazine < magazineSize) {
                        const fill = Math.min(magazineSize - ammo.magazine, newTotal - currentTotal);
                        ammo.magazine += Math.max(0, fill);
                    }
                    ammo.reserve = Math.max(0, newTotal - ammo.magazine);
                    ammoAdded = true;
                }
            }
            consumed = ammoAdded;
            break;
        }
    }

    if (consumed) {
        // Enviar broadcast de atualização de estado para o jogador (Sync HP/AP/Ammo)
        dispatcher.broadcastMessage(
            OpCode.S_MATCH_STATE,
            JSON.stringify(wrapPayload({
                userId: player.presence.userId,
                hp: player.health,
                ap: player.ap,
                ammo: player.ammo
            })),
            [player.presence],
            null,
            true
        );
    }

    return consumed;
};

const buildQuestNpcs = questBuildQuestNpcs;
const buildScenarioNpcs = questBuildScenarioNpcs;
const updateActiveCharXp = questUpdateActiveCharXp;
const awardQuestRewards = questAwardQuestRewards;
const pickNearestPlayer = questPickNearestPlayer;
const moveTowards = questMoveTowards;
const applySkillDamage = questApplySkillDamage;
const broadcastNpcSpawn = (dispatcher: nkruntime.MatchDispatcher, npcs: Record<string, NpcState>, presences?: nkruntime.Presence[]) =>
    questBroadcastNpcSpawn(dispatcher, npcs, OpCode.S_NPC_SPAWN, wrapPayload, presences);
const damageNpc = (nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, state: MatchState, attacker: PlayerState, npc: NpcState, damage: number) =>
    questDamageNpc(nk, dispatcher, state, attacker, npc, damage, wrapPayload, OpCode.S_NPC_DAMAGE, OpCode.S_NPC_DIE);

const getMoveDeltaLimit = (player: PlayerState, tick?: number) => {
    const limitSpeed = Number.isFinite(player.limitSpeed) && player.limitSpeed > 0 ? player.limitSpeed : 100;
    const ratio = Math.max(0.1, Math.min(limitSpeed / 100, 1));
    const slow = tick !== undefined && player.slowUntilTick && player.slowUntilTick > tick
        ? (player.slowRatio ?? 0.6)
        : 1.0;
    const maxSpeed = MAX_SPEED * ratio * slow;
    return maxSpeed * TICK_DT;
};

const getMaxMoveSpeedForAnim = (player: PlayerState, anim: number, tick?: number) => {
    const limitSpeed = Number.isFinite(player.limitSpeed) && player.limitSpeed > 0 ? player.limitSpeed : 100;
    const ratio = Math.max(0.1, Math.min(limitSpeed / 100, 1));
    const slow = tick !== undefined && player.slowUntilTick && player.slowUntilTick > tick
        ? (player.slowRatio ?? 0.6)
        : 1.0;

    if (isTumbleState(anim)) {
        const weapon = player.currentWeaponId ? getWeaponInfo(player.currentWeaponId) : null;
        const isMelee = weapon ? isMeleeWeaponType(String(weapon.weaponType)) : false;
        return (isMelee ? SWORD_DASH : GUN_DASH) * slow;
    }
    if (isWallJumpState(anim)) {
        return JUMP2_VELOCITY * slow;
    }
    if (anim === ZC_STATE_LOWER_RUN_FORWARD) {
        return RUN_SPEED * ratio * slow;
    }
    if (anim === ZC_STATE_LOWER_RUN_BACK || anim === ZC_STATE_LOWER_RUN_LEFT || anim === ZC_STATE_LOWER_RUN_RIGHT) {
        return BACK_SPEED * ratio * slow;
    }
    if (isWallRunState(anim)) {
        return RUN_SPEED * slow;
    }
    return MAX_SPEED * ratio * slow;
};

const ensureAmmoState = (player: PlayerState, weaponId: number, weapon: any) => {
    const key = String(weaponId);
    if (player.ammo[key]) return player.ammo[key];
    const magazineSize = Math.max(0, Number(weapon.magazine) || 0);
    const maxbullet = Math.max(0, Number(weapon.maxbullet) || 0);
    const reserve = Math.max(0, maxbullet - magazineSize);
    const state = {
        magazine: magazineSize,
        reserve,
        reloadEndTick: 0,
        magazineSize,
        reloadTicks: getReloadTicks(weapon)
    };
    player.ammo[key] = state;
    return state;
};

const calcShotDir = (dir: { x: number; y: number; z: number }, weapon: any, seed: number, caFactor: number) => {
    const ctrl = Number(weapon.ctrlAbility) || 0;
    if (ctrl <= 0) return dir;
    const maxSpread = (ctrl * caFactor) / 1000.0;
    if (maxSpread <= 0) return dir;
    const rng = createMt19937(seed >>> 0);
    return getSpreadDir(dir, maxSpread, rng);
};

const updateCAFactor = (player: PlayerState) => {
    const weaponId = player.currentWeaponId;
    const weapon = weaponId ? getWeaponInfo(weaponId) : null;
    const base = getWeaponCAFBase(weapon?.weaponType ?? "");
    if (player.caFactor < base) player.caFactor = base;
    player.caElapsed += TICK_DT;
    while (player.caElapsed > CAFACTOR_DEC_DELAY_TIME) {
        player.caFactor -= base;
        player.caElapsed -= CAFACTOR_DEC_DELAY_TIME;
    }
    if (player.caFactor < base) player.caFactor = base;
};

const selectWeaponId = (player: PlayerState, payload: any) => {
    const equipped = player.weapons || {};
    const slots = [equipped.primary, equipped.secondary, equipped.melee].filter((v): v is number => typeof v === "number");
    if (Number.isFinite(payload?.weaponId)) {
        const w = payload.weaponId as number;
        return slots.includes(w) ? w : null;
    }
    const slot = typeof payload?.weaponSlot === "string" ? payload.weaponSlot.toLowerCase() : "";
    if (slot && (equipped as any)[slot]) return (equipped as any)[slot];
    return equipped.primary ?? equipped.secondary ?? equipped.melee ?? null;
};

const handlePlayerDeath = (dispatcher: nkruntime.MatchDispatcher, state: MatchState, target: PlayerState, attacker: PlayerState | null, tick: number) => {
    if (target.dead) return;
    target.dead = true;
    target.respawnTick = tick + 7 * TICK_RATE;
    target.deaths += 1;

    if (attacker && attacker.presence.userId !== target.presence.userId) {
        attacker.kills += 1;
        if (state.stage.teamMode && attacker.team) {
            if (attacker.team === TEAM_RED) state.score.red += 1;
            if (attacker.team === TEAM_BLUE) state.score.blue += 1;
        }
    }

    dispatcher.broadcastMessage(
        OpCode.S_PLAYER_DIE,
        JSON.stringify(wrapPayload({ 
            targetUserId: target.presence.userId, 
            attackerUserId: attacker?.presence.userId ?? "" 
        })),
        null,
        null,
        true
    );

    if (state.stage.mode === "assassination" && target.isVip) {
        const reason = target.team === TEAM_RED ? "blue_win_vip_dead" : "red_win_vip_dead";
        endRound(dispatcher, state, reason);
    }

    if (state.stage.mode === "duel" && state.duel) {
        const sessionId = target.presence.sessionId;
        if (state.duel.p1 === sessionId || state.duel.p2 === sessionId) {
            state.duel.queue.push(sessionId);
            if (state.duel.p1 === sessionId) state.duel.p1 = undefined;
            else state.duel.p2 = undefined;
        }
    }
};

const updateDuelState = (dispatcher: nkruntime.MatchDispatcher, state: MatchState, tick: number) =>
    roomUpdateDuelState(dispatcher, state, tick, {
        getSpawnPos,
        opCodePlayerRespawn: OpCode.S_PLAYER_RESPAWN,
        wrapPayload
    });


const applyEnchantEffects = (tick: number, target: PlayerState, attacker: PlayerState) => {
    if (!attacker.enchantType) return;
    const durationTicks = Math.max(1, attacker.enchantDurationTicks ?? DOT_TICK_INTERVAL);
    const baseDamage = Math.max(0, attacker.enchantDamage ?? 0);
    switch (attacker.enchantType) {
        case "enchant_fire": {
            target.burnDamage = Math.max(1, 6 + baseDamage);
            target.burnUntilTick = tick + durationTicks;
            target.nextBurnTick = tick + DOT_TICK_INTERVAL;
            break;
        }
        case "enchant_poison": {
            target.poisonDamage = Math.max(1, 6 + baseDamage);
            target.poisonUntilTick = tick + durationTicks;
            target.nextPoisonTick = tick + DOT_TICK_INTERVAL;
            break;
        }
        case "enchant_lightning": {
            target.lightningDamage = Math.max(1, 6 + baseDamage);
            target.lightningUntilTick = tick + durationTicks;
            target.nextLightningTick = tick + DOT_TICK_INTERVAL;
            break;
        }
        case "enchant_cold": {
            const ratio = attacker.enchantLimitSpeed && attacker.enchantLimitSpeed > 0
                ? Math.max(0.1, Math.min(attacker.enchantLimitSpeed / 100, 1))
                : 0.6;
            target.slowRatio = ratio;
            target.slowUntilTick = tick + durationTicks;
            break;
        }
    }
};

const applyExplosion = (nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, state: MatchState, attacker: PlayerState, origin: { x: number; y: number; z: number }, damage: number, range: number, minDamageRatio: number, knockback: number) => {
    const results: Array<{ target: PlayerState; damage: number; piercing: number }> = [];
    const maxRange = Math.max(range, 1);
    const collision = getMapCollision(state.stage.mapId);
    for (const target of Object.values(state.players)) {
        if (target.spectator || target.disconnected) continue;
        if (target.dead) continue;
        if (state.stage.teamMode && attacker.team && target.team && attacker.team === target.team) continue;
        const targetPos = { x: target.pos.x, y: target.pos.y, z: target.pos.z + 80 };
        const dist = dist3(origin, targetPos);
        if (dist > maxRange) continue;
        if (collision && raycastCollision(collision, origin, targetPos)) continue;
        let dmgRange = 1.0;
        const segA = { x: target.pos.x, y: target.pos.y, z: target.pos.z + 50 };
        const segB = { x: target.pos.x, y: target.pos.y, z: target.pos.z + 130 };
        if (distancePointToSegment(origin, segA, segB) >= 50) {
            if (maxRange > 50 && dist > 50) {
                dmgRange = 1.0 - (1.0 - minDamageRatio) * ((dist - 50) / (maxRange - 50));
            }
        }
        const actualDamage = Math.max(1, Math.floor(damage * dmgRange));
        const piercing = getPiercingRatio("fragmentation", false);
        applyDamage(target, attacker, actualDamage, piercing);
        if (knockback > 0) {
            const dir = normalize({
                x: origin.x - targetPos.x,
                y: origin.y - targetPos.y,
                z: origin.z - targetPos.z
            });
            const force = knockback * 7 * Math.max(0, maxRange - dist);
            applyKnockback(state, target, { x: -dir.x, y: -dir.y, z: -dir.z }, force);
        }
        results.push({ target, damage: actualDamage, piercing });
    }
    for (const npc of Object.values(state.npcs)) {
        if (npc.dead) continue;
        const npcPos = { x: npc.pos.x, y: npc.pos.y, z: npc.pos.z + 80 };
        const dist = dist3(origin, npcPos);
        if (dist > maxRange) continue;
        if (collision && raycastCollision(collision, origin, npcPos)) continue;
        let dmgRange = 1.0;
        if (maxRange > 50 && dist > 50) {
            dmgRange = 1.0 - (1.0 - minDamageRatio) * ((dist - 50) / (maxRange - 50));
        }
        const actualDamage = Math.max(1, Math.floor(damage * dmgRange));
        damageNpc(nk, dispatcher, state, attacker, npc, actualDamage);
    }
    return results;
};

const getSpawnPos = (state: MatchState, player: PlayerState) => {
    return getMapSpawn(state.stage.mapId, player.team, !!state.stage.teamMode);
};

const isActivePlayer = (p: PlayerState) => roomIsActivePlayer(p);

const reassignMaster = (state: MatchState) => roomReassignMaster(state);

const cleanupDisconnected = (state: MatchState, tick: number) => roomCleanupDisconnected(state, tick);

const broadcastRoomUpdate = (dispatcher: nkruntime.MatchDispatcher, state: MatchState) =>
    roomBroadcastRoomUpdate(dispatcher, state, OpCode.S_ROOM_UPDATE, wrapPayload);

const broadcastReadyState = (dispatcher: nkruntime.MatchDispatcher, state: MatchState) =>
    roomBroadcastReadyState(dispatcher, state, OpCode.S_READY_STATE, wrapPayload);

const broadcastMatchState = (dispatcher: nkruntime.MatchDispatcher, state: MatchState, tick: number) =>
    roomBroadcastMatchState(dispatcher, state, tick, OpCode.S_MATCH_STATE, wrapPayload);

const lifecycleHandlers = createLifecycleHandlers({
    tickRate: TICK_RATE,
    baseMaxWeight: BASE_MAX_WEIGHT,
    zstNone: ZST_NONE,
    dotTickInterval: DOT_TICK_INTERVAL,
    reconnectGraceTicks: RECONNECT_GRACE_TICKS,
    teamRed: TEAM_RED,
    teamBlue: TEAM_BLUE,
    opCode: {
        sMatchWelcome: OpCode.S_MATCH_WELCOME,
        sPlayerSpawn: OpCode.S_PLAYER_SPAWN,
        sMatchStart: OpCode.S_MATCH_START,
        sMatchEnd: OpCode.S_MATCH_END,
        cRoomChat: OpCode.C_ROOM_CHAT
    },
    normalizeTimeLimit,
    wrapPayload,
    getGameTypeConfig,
    getMapById,
    getQuestMapsetByName,
    getScenarioForMapset,
    getQuestByMap,
    buildScenarioNpcs,
    buildQuestNpcs,
    getWorldItemSpawns,
    getWorldItemDesc,
    getLegacyItemEffect,
    getWeaponInfo,
    ensureAmmoState,
    computeEquipmentStats,
    getSpawnPos,
    isActivePlayer,
    reassignMaster,
    broadcastNpcSpawn,
    broadcastRoomUpdate,
    broadcastReadyState,
    assignAssassinationVips: (state: MatchState) => roomAssignAssassinationVips(state, TEAM_RED, TEAM_BLUE)
});

export const matchInit: nkruntime.MatchInitFunction = lifecycleHandlers.matchInit;
export const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = lifecycleHandlers.matchJoinAttempt;
export const matchJoin: nkruntime.MatchJoinFunction = lifecycleHandlers.matchJoin;
export const matchLeave: nkruntime.MatchLeaveFunction = lifecycleHandlers.matchLeave;

export const matchLoop: nkruntime.MatchLoopFunction = (ctx, logger, nk, dispatcher, tick, state: MatchState, messages) => {
    cleanupDisconnected(state, tick);
    if (state.stage.started && checkScoreLimitReached(state)) {
        endRound(dispatcher, state, "score");
    } else if (state.stage.started && state.stage.roundEndTick && tick >= state.stage.roundEndTick) {
        endRound(dispatcher, state, "time");
    }
    const msgList = messages || [];
    
    // Global tick updates
    for (const player of Object.values(state.players)) {
        processStatusEffects(nk, dispatcher, state, player, tick);
    }
    updateDuelState(dispatcher, state, tick);

    runLoopInputPhase(nk, dispatcher, state, tick, msgList, {
        opCode: {
            MOVE: OpCode.MOVE,
            ATTACK: OpCode.ATTACK,
            C_INPUT_MOVE: OpCode.C_INPUT_MOVE,
            C_INPUT_ATTACK: OpCode.C_INPUT_ATTACK,
            C_READY: OpCode.C_READY,
            C_UNREADY: OpCode.C_UNREADY,
            C_TEAM_CHANGE: OpCode.C_TEAM_CHANGE,
            C_CLIENT_READY: OpCode.C_CLIENT_READY,
            C_ROOM_CHAT: OpCode.C_ROOM_CHAT,
            TIME_SYNC: OpCode.TIME_SYNC,
            C_INPUT_SKILL: OpCode.C_INPUT_SKILL,
            S_MATCH_ERROR: OpCode.S_MATCH_ERROR,
            S_PLAYER_DAMAGE: OpCode.S_PLAYER_DAMAGE,
            S_PLAYER_DIE: OpCode.S_PLAYER_DIE
        },
        parseEnvelope,
        isVec3,
        getWeaponInfo,
        isMeleeWeaponType,
        isGuardNonrecoilable,
        isLowerState,
        isWallRunState,
        isWallJumpState,
        isWallJump2State,
        isTumbleState,
        getWallJumpDirFromAnim,
        dist3,
        getMaxMoveSpeedForAnim,
        getMoveDeltaLimit,
        getMapCollision,
        getFloorDistance,
        dist2,
        normalize,
        isNearWall,
        adjustMoveAgainstCollision,
        checkSolidCylinder,
        selectWeaponId,
        getWeaponCooldownTicks,
        ensureAmmoState,
        getWeaponCAFBase,
        getHitboxProfile,
        getMeleeMotionParams,
        checkWallBetween,
        isGuarding,
        dot,
        isGuardingRecoilable,
        getPiercingRatio,
        applyDamage,
        applyEnchantEffects,
        applyKnockback,
        getKnockbackForce,
        damageNpc,
        distanceLineSegment,
        getProjectileSpeed,
        createMt19937,
        nowMs,
        getSpreadDir,
        calcShotDir,
        playerHitTest,
        handlePlayerDeath,
        broadcastReadyState,
        broadcastRoomUpdate,
        getServerFeatureFlags,
        wrapPayload,
        rayCylinderHit,
        getItemData: (itemId: string) => getItemData(itemId),
        getStunTypeForMelee,
        TICK_RATE,
        TICK_DT,
        AIR_MOVE,
        ACCEL_SPEED,
        PLAYER_RADIUS,
        PLAYER_HEIGHT,
        TUMBLE_DELAY_TIME,
        JUMP_QUEUE_TIME,
        WALL_JUMP_TIME_FRONT,
        WALL_JUMP_TIME_SIDE,
        WALL_JUMP2_TIME_FRONT,
        WALL_JUMP2_TIME_SIDE,
        ZC_STATE_LOWER_JUMP_UP,
        ZC_STATE_LOWER_JUMP_DOWN,
        JUMP_VELOCITY,
        JUMP2_VELOCITY,
        WALL_JUMP_VELOCITY,
        WALL_JUMP2_VELOCITY,
        ZC_STATE_LOWER_RUN_WALL_LEFT_DOWN,
        ZC_STATE_LOWER_RUN_WALL_RIGHT_DOWN,
        MAX_ATTACK_RANGE,
        DEFAULT_DAMAGE,
        DEFAULT_DELAY_MS,
        AIM_CONE_DOT,
        TEAM_RED,
        TEAM_BLUE,
        SHOTGUN_PELLETS,
        SHOTGUN_DIFFUSE_RANGE,
        MAX_SPEED,
        GUARD_DURATION,
        GUARD_RECOIL_DURATION,
        COUNTER_CHARGED_TIME,
        GUARD_RECOIL_DELAY,
        FLASHBANG_DURATION_TICKS,
        SMOKE_DURATION_TICKS,
        ZC_SKILL_UPPERCUT,
        ZC_SKILL_SPLASHSHOT,
        ZC_SKILL_DASH,
        ZC_SKILL_CHARGEDSHOT,
        ZC_STATE_LOWER_UPPERCUT,
        CHARGED_TIME
    });
    // Projectile updates (server-authoritative)
    processProjectiles({
        nk,
        dispatcher,
        state,
        tick,
        tickRate: TICK_RATE,
        teamRed: TEAM_RED,
        teamBlue: TEAM_BLUE,
        flashbangDistance: FLASHBANG_DISTANCE,
        flashbangDurationTicks: FLASHBANG_DURATION_TICKS,
        smokeDurationTicks: SMOKE_DURATION_TICKS,
        opCodePlayerDamage: OpCode.S_PLAYER_DAMAGE,
        opCodePlayerDie: OpCode.S_PLAYER_DIE,
        wrapPayload,
        getMapCollision,
        getHitboxProfile,
        getBodyOffset: (anim: number) => getHitOffsets(anim).body,
        getWorldItemDescByModel,
        raycastCollision,
        raycastCollisionImpact,
        rayCylinderHit,
        normalize,
        reflect,
        dist3,
        applyExplosion,
        handlePlayerDeath
    });

    runLoopPostPhase(nk, dispatcher, state, tick, {
        tickRate: TICK_RATE,
        guardRecoilDuration: GUARD_RECOIL_DURATION,
        guardDuration: GUARD_DURATION,
        worldItemPickupRadius: WORLD_ITEM_PICKUP_RADIUS,
        npcTargetRange: NPC_TARGET_RANGE,
        npcMoveSpeedScale: NPC_MOVE_SPEED_SCALE,
        npcAttackCooldownTicks: NPC_ATTACK_COOLDOWN_TICKS,
        zstBlocked: ZST_BLOCKED,
        zstNone: ZST_NONE,
        zstLoop: ZST_LOOP,
        opCode: {
            sPlayerRespawn: OpCode.S_PLAYER_RESPAWN,
            sPlayerDamage: OpCode.S_PLAYER_DAMAGE,
            cRoomChat: OpCode.C_ROOM_CHAT,
            heartbeat: OpCode.HEARTBEAT
        },
        wrapPayload,
        updateCAFactor,
        normalize,
        applyKnockback,
        getSpawnPos,
        dist3,
        applyWorldItemToPlayer,
        pickNearestPlayer,
        moveTowards,
        getMapCollision,
        isBlockedMovement,
        getSkillTemplate,
        raycastCollision,
        applySkillDamage,
        getItemData: (itemId: string) => getItemData(itemId),
        getPiercingRatio,
        applyDamage,
        handlePlayerDeath,
        damageNpc,
        getQuestByMap,
        buildScenarioNpcs,
        buildQuestNpcs,
        broadcastNpcSpawn,
        updateActiveCharXp,
        awardQuestRewards,
        endRound,
        broadcastMatchState
    });

    return { state };
};

export const matchTerminate: nkruntime.MatchTerminateFunction = lifecycleHandlers.matchTerminate;
export const matchSignal: nkruntime.MatchSignalFunction = lifecycleHandlers.matchSignal;
