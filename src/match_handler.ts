import { getGameTypeConfig, getItemData, getLegacyEffectById, getLegacyItemEffect, getMapCollision, getMapSpawn, getMeleeMotionTable, getNpcTemplate, getQuestByMap, getSkillTemplate, getWorldItemDesc, getWorldItemDescByModel, getWorldItemSpawns, getDropTableData, getQuestMapsetByName, getScenarioForMapset, getNpcSetByName, getMapById } from "./data_manager";
import { addItemToInventory } from "./items";
import { getLevelFromXp } from "./experience";
import { updateXpLeaderboard } from "./leaderboards";



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

type StageSettings = {
    name: string;
    mapId: number;
    mode: string;
    gameTypeId: number;
    maxPlayers: number;
    roundLimit: number;
    timeLimitSec: number;
    password?: string;
    teamMode?: boolean;
    channelRule?: string;
};

type PlayerState = {
    presence: nkruntime.Presence;
    userId: string;
    health: number;
    ap: number;
    pos: { x: number; y: number; z: number };
    rot: { x: number; y: number; z: number };
    vel: { x: number; y: number; z: number };
    anim: number;
    ready: boolean;
    team: number;
    loaded: boolean;
    dead: boolean;
    respawnTick: number;
    lastAttackTick: number;
    kills: number;
    deaths: number;
    maxHealth: number;
    maxAp: number;
    weight: number;
    maxWeight: number;
    sf: number;
    fr: number;
    cr: number;
    pr: number;
    lr: number;
    limitSpeed: number;
    limitWall: number;
    limitJump: number;
    limitTumble: number;
    currentWeaponId?: number;
    caFactor: number;
    caElapsed: number;
    lastShotTick: number;
    pendingGuardRecoilTick?: number;
    chargedUntilTick?: number;
    guardCancelUntilTick?: number;
    stunType?: number;
    guardStartTick?: number;
    pendingDashTick?: number;
    pendingDashDir?: { x: number; y: number; z: number };
    wallJumpStartTick?: number;
    wallJumpDir?: number;
    wallJump2?: boolean;
    wallJump2Dir?: number;
    lastTumbleTick?: number;
    lastJumpTick?: number;
    ammo: Record<string, {
        magazine: number;
        reserve: number;
        reloadEndTick: number;
        magazineSize: number;
        reloadTicks: number;
    }>;
    weapons: {
        melee?: number;
        primary?: number;
        secondary?: number;
    };
    spectator?: boolean;
    disconnected?: boolean;
    disconnectedUntilTick?: number;
    flashUntilTick?: number;
    stunUntilTick?: number;
    slowUntilTick?: number;
    slowRatio?: number;
    poisonUntilTick?: number;
    nextPoisonTick?: number;
    poisonDamage?: number;
    burnUntilTick?: number;
    nextBurnTick?: number;
    burnDamage?: number;
    lightningUntilTick?: number;
    nextLightningTick?: number;
    lightningDamage?: number;
    enchantType?: string;
    enchantLevel?: number;
    enchantDamage?: number;
    enchantDurationTicks?: number;
    enchantLimitSpeed?: number;
    isVip?: boolean;
};


type MatchState = {
    players: { [sessionId: string]: PlayerState };
    pendingJoinMeta?: Record<string, { spectator?: boolean }>;
    startTime: number;
    stage: StageSettings & { masterUserId?: string; masterSessionId?: string; started: boolean; round: number; roundStartTick?: number; roundEndTick?: number };
    score: { red: number; blue: number };
    worldItems: WorldItemState[];
    quest?: {
        mode: "simple" | "scenario";
        questId?: number;
        stageIndex: number;
        completed: boolean;
        scenarioTitle?: string;
        scenarioXp?: number;
        scenarioBp?: number;
        sectors?: Array<{
            sectorId: number;
            npcsets: string[];
            meleeSpawn?: number;
            rangeSpawn?: number;
            bossSpawn?: boolean;
        }>;
        stageTransitionTick?: number;
    };
    npcs: Record<string, NpcState>;
    projectiles: ProjectileState[];
    nextProjectileId: number;
    smokeZones: SmokeZoneState[];
    duel?: {
        queue: string[];
        p1?: string;
        p2?: string;
    };
};


type WorldItemState = {
    id: string;
    name: string;
    type: string;
    amount: number;
    pos: { x: number; y: number; z: number };
    active: boolean;
    respawnTick: number;
    respawnSec: number;
    oneShot?: boolean;
};

type NpcState = {
    id: string;
    templateId: number;
    name: string;
    health: number;
    ap: number;
    maxHealth: number;
    maxAp: number;
    pos: { x: number; y: number; z: number };
    radius: number;
    height: number;
    viewAngle: number;
    speed: number;
    attackRange: number;
    weaponItemId: number;
    skills: number[];
    nextAttackTick: number;
    nextSkillTick: Record<string, number>;
    dead: boolean;
};

type ProjectileState = {
    id: string;
    ownerUserId: string;
    weaponType: string;
    pos: { x: number; y: number; z: number };
    dir: { x: number; y: number; z: number };
    speed: number;
    remaining: number;
    damage: number;
    range: number;
    minDamageRatio: number;
    vel?: { x: number; y: number; z: number };
    gravity?: number;
    lifeTicks?: number;
    explodeAfterTicks?: number;
    kind?: "rocket" | "grenade" | "flashbang" | "smoke" | "itemkit";
    worldItemModel?: string;
    effectDurationTicks?: number;
};

type SmokeZoneState = {
    id: string;
    pos: { x: number; y: number; z: number };
    radius: number;
    endTick: number;
    kind?: "smoke" | "tear";
};

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

const normalize = (v: { x: number; y: number; z: number }) => {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (!len) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
};

const dot = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
    a.x * b.x + a.y * b.y + a.z * b.z;

const cross = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
});

const dist3 = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};

const getTopPlayer = (state: MatchState) => {
    let topUserId = "";
    let topKills = -1;
    for (const p of Object.values(state.players)) {
        if (p.kills > topKills) {
            topKills = p.kills;
            topUserId = p.presence.userId;
        }
    }
    return { topUserId, topKills };
};

const getRoundLeader = (state: MatchState) => {
    if (state.stage.teamMode) {
        if (state.score.red === state.score.blue) return { winnerTeam: 0 };
        return { winnerTeam: state.score.red > state.score.blue ? TEAM_RED : TEAM_BLUE };
    }
    const top = getTopPlayer(state);
    if (top.topKills < 0) return { winnerUserId: "" };
    return { winnerUserId: top.topUserId, topKills: top.topKills };
};

const checkScoreLimitReached = (state: MatchState) => {
    const limit = state.stage.roundLimit ?? 0;
    if (!limit || limit <= 0) return false;
    if (state.stage.teamMode) {
        return state.score.red >= limit || state.score.blue >= limit;
    }
    for (const p of Object.values(state.players)) {
        if (p.kills >= limit) return true;
    }
    return false;
};

const endRound = (dispatcher: nkruntime.MatchDispatcher, state: MatchState, reason: string) => {
    state.stage.started = false;
    state.stage.roundEndTick = 0;
    const leader = getRoundLeader(state);
    dispatcher.broadcastMessage(
        OpCode.S_MATCH_END,
        JSON.stringify(wrapPayload({
            round: state.stage.round,
            reason,
            score: state.score,
            ...leader
        })),
        null,
        null,
        true
    );
};

const processStatusEffects = (nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, state: MatchState, player: PlayerState, tick: number) => {
    if (player.dead) return;

    // Poison DOT
    if (player.poisonUntilTick && tick <= player.poisonUntilTick) {
        if (!player.nextPoisonTick || tick >= player.nextPoisonTick) {
            const damage = player.poisonDamage ?? 5;
            applyDamage(player, null as any, damage, 0); // Self-damage doesn't have an attacker for simpler logic
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
            applyDamage(player, null as any, damage, 0);
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
            applyDamage(player, null as any, damage, 0);
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

const reflect = (v: { x: number; y: number; z: number }, n: { x: number; y: number; z: number }) => {
    const d = dot(v, n);
    return {
        x: v.x - 2 * d * n.x,
        y: v.y - 2 * d * n.y,
        z: v.z - 2 * d * n.z
    };
};

const createMt19937 = (seed: number) => {
    const MT = new Array<number>(624);
    let index = 624;
    MT[0] = seed >>> 0;
    for (let i = 1; i < 624; i++) {
        const prev = MT[i - 1] ^ (MT[i - 1] >>> 30);
        MT[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    const twist = () => {
        for (let i = 0; i < 624; i++) {
            const y = (MT[i] & 0x80000000) + (MT[(i + 1) % 624] & 0x7fffffff);
            let v = MT[(i + 397) % 624] ^ (y >>> 1);
            if (y % 2 !== 0) v ^= 0x9908b0df;
            MT[i] = v >>> 0;
        }
        index = 0;
    };
    return () => {
        if (index >= 624) twist();
        let y = MT[index++];
        y ^= y >>> 11;
        y ^= (y << 7) & 0x9d2c5680;
        y ^= (y << 15) & 0xefc60000;
        y ^= y >>> 18;
        return (y >>> 0) / 4294967296;
    };
};

const rotateAroundAxis = (v: { x: number; y: number; z: number }, axis: { x: number; y: number; z: number }, angle: number) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dotVA = v.x * axis.x + v.y * axis.y + v.z * axis.z;
    return {
        x: v.x * cos + (axis.y * v.z - axis.z * v.y) * sin + axis.x * dotVA * (1 - cos),
        y: v.y * cos + (axis.z * v.x - axis.x * v.z) * sin + axis.y * dotVA * (1 - cos),
        z: v.z * cos + (axis.x * v.y - axis.y * v.x) * sin + axis.z * dotVA * (1 - cos)
    };
};

const getSpreadDir = (dir: { x: number; y: number; z: number }, maxSpread: number, rng: () => number) => {
    const force = rng() * maxSpread;
    const right = normalize(cross(dir, { x: 0, y: 0, z: 1 }));
    let ret = rotateAroundAxis(dir, right, force);
    const angle = rng() * Math.PI * 2;
    ret = rotateAroundAxis(ret, dir, angle);
    return normalize(ret);
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

const raySphereHit = (
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    center: { x: number; y: number; z: number },
    radius: number,
    maxDist: number
) => {
    const oc = { x: origin.x - center.x, y: origin.y - center.y, z: origin.z - center.z };
    const b = oc.x * dir.x + oc.y * dir.y + oc.z * dir.z;
    const c = oc.x * oc.x + oc.y * oc.y + oc.z * oc.z - radius * radius;
    const disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    if (t < 0 || t > maxDist) return null;
    return t;
};

const rayCylinderHit = (
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    foot: { x: number; y: number; z: number },
    height: number,
    radius: number,
    maxDist: number
) => {
    const ox = origin.x - foot.x;
    const oy = origin.y - foot.y;
    const dx = dir.x;
    const dy = dir.y;
    const a = dx * dx + dy * dy;
    if (a === 0) return null;
    const b = 2 * (ox * dx + oy * dy);
    const c = ox * ox + oy * oy - radius * radius;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);
    const pickT = (t: number) => {
        if (t < 0 || t > maxDist) return null;
        const z = origin.z + dir.z * t;
        if (z < foot.z || z > foot.z + height) return null;
        return t;
    };
    return pickT(t1) ?? pickT(t2);
};

const getHitOffsets = (_anim: number) => {
    return { head: HEAD_OFFSET_Z, body: BODY_OFFSET_Z, legs: LEGS_OFFSET_Z };
};

const classifyHitPart = (hitPos: { x: number; y: number; z: number }, foot: { x: number; y: number; z: number }, anim: number) => {
    const dz = hitPos.z - foot.z;
    const offs = getHitOffsets(anim);
    if (dz >= offs.head - 10) return "head" as const;
    if (dz >= offs.body - 10) return "body" as const;
    return "legs" as const;
};

const distancePointToSegment = (p: { x: number; y: number; z: number }, a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => {
    const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const ap = { x: p.x - a.x, y: p.y - a.y, z: p.z - a.z };
    const abLenSq = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
    if (abLenSq <= 0) return dist3(p, a);
    const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y + ap.z * ab.z) / abLenSq));
    const closest = { x: a.x + ab.x * t, y: a.y + ab.y * t, z: a.z + ab.z * t };
    return dist3(p, closest);
};

const closestPointOnSegment = (p: { x: number; y: number; z: number }, a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => {
    const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const ap = { x: p.x - a.x, y: p.y - a.y, z: p.z - a.z };
    const abLenSq = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
    if (abLenSq <= 0) return a;
    const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y + ap.z * ab.z) / abLenSq));
    return { x: a.x + ab.x * t, y: a.y + ab.y * t, z: a.z + ab.z * t };
};

const distanceLineSegment = (p: { x: number; y: number; z: number }, a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
    dist3(closestPointOnSegment(p, a, b), p);

const distanceBetweenLineSegments = (
    a: { x: number; y: number; z: number },
    aa: { x: number; y: number; z: number },
    c: { x: number; y: number; z: number },
    cc: { x: number; y: number; z: number }
) => {
    const b = { x: aa.x - a.x, y: aa.y - a.y, z: aa.z - a.z };
    const d = { x: cc.x - c.x, y: cc.y - c.y, z: cc.z - c.z };
    let cm = cross(b, d);
    const cmMag = Math.sqrt(cm.x * cm.x + cm.y * cm.y + cm.z * cm.z);
    let ap = a;
    let cp = c;

    if (cmMag < 1) {
        const edge = { x: a.x - c.x, y: a.y - c.y, z: a.z - c.z };
        const dMag = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z) || 1;
        const temp = (dot(edge, d) / dMag);
        const dDir = { x: d.x / dMag, y: d.y / dMag, z: d.z / dMag };
        const x = { x: c.x + temp * dDir.x - a.x, y: c.y + temp * dDir.y - a.y, z: c.z + temp * dDir.z - a.z };

        const dd = dot(d, d) || 1;
        const st0 = dot({ x: a.x + x.x - c.x, y: a.y + x.y - c.y, z: a.z + x.z - c.z }, d) / dd;
        const st1 = dot({ x: aa.x + x.x - c.x, y: aa.y + x.y - c.y, z: aa.z + x.z - c.z }, d) / dd;

        if (st0 < 0 && st1 < 0) {
            cp = c;
            ap = Math.abs(st0) > Math.abs(st1) ? aa : a;
        } else if (st0 > 1 && st1 > 1) {
            cp = cc;
            ap = Math.abs(st0) > Math.abs(st1) ? aa : a;
        } else {
            if (st0 >= 0 && st0 <= 1) {
                ap = a;
                cp = { x: c.x + st0 * d.x, y: c.y + st0 * d.y, z: c.z + st0 * d.z };
            } else if (st1 >= 0 && st1 <= 1) {
                ap = aa;
                cp = { x: c.x + st1 * d.x, y: c.y + st1 * d.y, z: c.z + st1 * d.z };
            } else {
                cp = c;
                ap = { x: cp.x - x.x, y: cp.y - x.y, z: cp.z - x.z };
            }
        }
        return { dist: dist3(ap, cp), ap, cp };
    }

    cm = { x: cm.x / cmMag, y: cm.y / cmMag, z: cm.z / cmMag };
    let r = cross(d, cm);
    const rMag = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z) || 1;
    r = { x: r.x / rMag, y: r.y / rMag, z: r.z / rMag };
    let t = (dot(r, c) - dot(r, a)) / (dot(r, b) || 1);

    r = cross(b, cm);
    const r2Mag = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z) || 1;
    r = { x: r.x / r2Mag, y: r.y / r2Mag, z: r.z / r2Mag };
    let s = (dot(r, a) - dot(r, c)) / (dot(r, d) || 1);

    t = Math.max(0, Math.min(1, t));
    s = Math.max(0, Math.min(1, s));
    ap = { x: a.x + t * b.x, y: a.y + t * b.y, z: a.z + t * b.z };
    cp = { x: c.x + s * d.x, y: c.y + s * d.y, z: c.z + s * d.z };
    return { dist: dist3(ap, cp), ap, cp };
};

const getHitboxProfile = (_anim: number) => {
    return { height: PLAYER_HEIGHT, radius: PLAYER_RADIUS };
};

const playerHitTest = (
    head: { x: number; y: number; z: number },
    foot: { x: number; y: number; z: number },
    src: { x: number; y: number; z: number },
    dest: { x: number; y: number; z: number }
) => {
    const footpos = { x: foot.x, y: foot.y, z: foot.z + 5 };
    const headpos = { x: head.x, y: head.y, z: head.z + 5 };
    const rootpos = { x: (footpos.x + headpos.x) * 0.5, y: (footpos.y + headpos.y) * 0.5, z: (footpos.z + headpos.z) * 0.5 };

    const nearest = closestPointOnSegment(headpos, src, dest);
    let fDist = dist3(nearest, headpos);
    if (fDist < 15) {
        return { part: "head" as const, hitPos: nearest };
    }

    const dir = normalize({ x: dest.x - src.x, y: dest.y - src.y, z: dest.z - src.z });
    const rootdir = normalize({ x: rootpos.x - headpos.x, y: rootpos.y - headpos.y, z: rootpos.z - headpos.z });

    let ap = { x: 0, y: 0, z: 0 };
    let cp = { x: 0, y: 0, z: 0 };
    let result = distanceBetweenLineSegments(src, dest,
        { x: headpos.x + 20 * rootdir.x, y: headpos.y + 20 * rootdir.y, z: headpos.z + 20 * rootdir.z },
        { x: rootpos.x - 20 * rootdir.x, y: rootpos.y - 20 * rootdir.y, z: rootpos.z - 20 * rootdir.z }
    );
    fDist = result.dist;
    ap = result.ap;
    cp = result.cp;
    if (fDist < 30) {
        const ap2cp = { x: ap.x - cp.x, y: ap.y - cp.y, z: ap.z - cp.z };
        const fap2cpsq = ap2cp.x * ap2cp.x + ap2cp.y * ap2cp.y + ap2cp.z * ap2cp.z;
        const fdiff = Math.sqrt(Math.max(0, 30 * 30 - fap2cpsq));
        const hitPos = { x: ap.x - dir.x * fdiff, y: ap.y - dir.y * fdiff, z: ap.z - dir.z * fdiff };
        return { part: "body" as const, hitPos };
    }

    result = distanceBetweenLineSegments(src, dest,
        { x: rootpos.x - 20 * rootdir.x, y: rootpos.y - 20 * rootdir.y, z: rootpos.z - 20 * rootdir.z },
        footpos
    );
    fDist = result.dist;
    ap = result.ap;
    cp = result.cp;
    if (fDist < 30) {
        const ap2cp = { x: ap.x - cp.x, y: ap.y - cp.y, z: ap.z - cp.z };
        const fap2cpsq = ap2cp.x * ap2cp.x + ap2cp.y * ap2cp.y + ap2cp.z * ap2cp.z;
        const fdiff = Math.sqrt(Math.max(0, 30 * 30 - fap2cpsq));
        const hitPos = { x: ap.x - dir.x * fdiff, y: ap.y - dir.y * fdiff, z: ap.z - dir.z * fdiff };
        return { part: "legs" as const, hitPos };
    }
    return null;
};
const getPiercingRatio = (weaponType: string, isHead: boolean) => {
    switch (weaponType) {
        case "dagger":
        case "dualdagger":
            return isHead ? 0.75 : 0.7;
        case "katana":
        case "doublekatana":
        case "greatsword":
            return isHead ? 0.65 : 0.6;
        case "pistol":
        case "pistolx2":
            return isHead ? 0.7 : 0.5;
        case "revolver":
        case "revolverx2":
            return isHead ? 0.9 : 0.7;
        case "smg":
        case "smgx2":
            return isHead ? 0.5 : 0.3;
        case "shotgun":
        case "sawedshotgun":
            return 0.2;
        case "machinegun":
        case "rifle":
        case "snifer":
            return isHead ? 0.8 : 0.4;
        case "fragmentation":
        case "flashbang":
        case "smokegrenade":
        case "smoke":
        case "rocket":
            return 0.4;
        default:
            return isHead ? 0.6 : 0.5;
    }
};

const normalizeWeaponType = (weaponType: string) => {
    switch (weaponType) {
        case "frag":
            return "fragmentation";
        default:
            return weaponType;
    }
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

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

const buildQuestNpcs = (quest: any, stageIndex: number, mapId: number) => {
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

const buildScenarioNpcs = (sector: { sectorId: number; npcsets: string[]; meleeSpawn?: number; rangeSpawn?: number; bossSpawn?: boolean }, mapId: number) => {
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

const broadcastNpcSpawn = (dispatcher: nkruntime.MatchDispatcher, npcs: Record<string, NpcState>, presences?: nkruntime.Presence[]) => {
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
        OpCode.S_NPC_SPAWN,
        JSON.stringify(wrapPayload({ npcs: list })),
        presences ?? null,
        null,
        true
    );
};

const updateActiveCharXp = (nk: nkruntime.Nakama, userId: string, deltaXp: number) => {
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
        // Enviar aviso de level up ou broadcast se necessário
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

const awardQuestRewards = (nk: nkruntime.Nakama, state: MatchState, quest: any) => {
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

const spawnWorldItemDrop = (state: MatchState, name: string, pos: { x: number; y: number; z: number }) => {
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

const handleQuestNpcDeath = (nk: nkruntime.Nakama, state: MatchState, attacker: PlayerState, npc: NpcState) => {
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

const damageNpc = (nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, state: MatchState, attacker: PlayerState, npc: NpcState, damage: number) => {
    if (npc.dead) return;
    const dmg = Math.max(1, Math.floor(damage));
    npc.health = Math.max(0, npc.health - dmg);
    dispatcher.broadcastMessage(
        OpCode.S_NPC_DAMAGE,
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
            OpCode.S_NPC_DIE,
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

const getResistRatio = (player: PlayerState, resistType: number) => {
    let resist = 0;
    switch (resistType) {
        case 1:
            resist = player.fr;
            break;
        case 2:
            resist = player.cr;
            break;
        case 3:
            resist = player.lr;
            break;
        case 4:
            resist = player.pr;
            break;
        default:
            resist = 0;
    }
    const ratio = Math.max(0, Math.min(resist / 100, 0.8));
    return ratio;
};

const applySkillDamage = (player: PlayerState, attacker: PlayerState, damage: number, resistType: number) => {
    const resist = getResistRatio(player, resistType);
    const finalDamage = Math.max(1, Math.floor(damage * (1 - resist)));
    const piercing = getPiercingRatio("fragmentation", false);
    applyDamage(player, attacker, finalDamage, piercing);
    return finalDamage;
};

const pickNearestPlayer = (state: MatchState, from: { x: number; y: number; z: number }) => {
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

const moveTowards = (pos: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }, speed: number) => {
    const dir = normalize({ x: target.x - pos.x, y: target.y - pos.y, z: target.z - pos.z });
    return {
        x: pos.x + dir.x * speed,
        y: pos.y + dir.y * speed,
        z: pos.z + dir.z * speed
    };
};

const dotPlane = (p: { a: number; b: number; c: number; d: number }, v: { x: number; y: number; z: number }) =>
    p.a * v.x + p.b * v.y + p.c * v.z + p.d;

const dotPlaneNormal = (p: { a: number; b: number; c: number }, v: { x: number; y: number; z: number }) =>
    p.a * v.x + p.b * v.y + p.c * v.z;

const PICK_TOLERENCE = 0.1;
const pickSign = (x: number) => (x < -PICK_TOLERENCE ? -1 : (x > PICK_TOLERENCE ? 1 : 0));

const getIntersectionOfTwoPlanes = (plane1: any, plane2: any) => {
    const n1 = { x: plane1.a, y: plane1.b, z: plane1.c };
    const n2 = { x: plane2.a, y: plane2.b, z: plane2.c };
    const dir = cross(n1, n2);
    const detDir = dot(dir, dir);
    if (detDir < 1e-6) return null;

    const dotN1N1 = dot(n1, n1);
    const dotN2N2 = dot(n2, n2);
    const dotN1N2 = dot(n1, n2);
    const determinant = dotN1N1 * dotN2N2 - dotN1N2 * dotN1N2;

    if (Math.abs(determinant) < 1e-6) return null;

    const c1 = (-plane1.d * dotN2N2 + plane2.d * dotN1N2) / determinant;
    const c2 = (-plane2.d * dotN1N1 + plane1.d * dotN1N2) / determinant;

    const point = {
        x: c1 * n1.x + c2 * n2.x,
        y: c1 * n1.y + c2 * n2.y,
        z: c1 * n1.z + c2 * n2.z
    };

    return { dir, point };
};

const intersectLineSegmentPlane = (plane: { a: number; b: number; c: number; d: number }, v0: { x: number; y: number; z: number }, v1: { x: number; y: number; z: number }) => {
    const dir = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
    const denom = dotPlaneNormal(plane, dir);
    if (Math.abs(denom) < 1e-6) return null;
    const t = -(plane.d + dotPlaneNormal(plane, v0)) / denom;
    if (!Number.isFinite(t)) return null;
    const tt = Math.max(0, Math.min(1, t));
    return { x: v0.x + dir.x * tt, y: v0.y + dir.y * tt, z: v0.z + dir.z * tt };
};
const pickCheckPlane = (
    side: number,
    plane: { a: number; b: number; c: number; d: number },
    v0: { x: number; y: number; z: number },
    v1: { x: number; y: number; z: number }
) => {
    const dotv0 = dotPlane(plane, v0);
    const dotv1 = dotPlane(plane, v1);
    const signv0 = pickSign(dotv0);
    const signv1 = pickSign(dotv1);
    if (signv0 !== -side) {
        const w0 = v0;
        let w1 = v1;
        if (signv1 === -side) {
            const intersect = intersectLineSegmentPlane(plane, v0, v1);
            if (intersect) w1 = intersect;
        }
        return { w0, w1 };
    }
    if (signv1 !== -side) {
        const w1 = v1;
        let w0 = v0;
        const intersect = intersectLineSegmentPlane(plane, v0, v1);
        if (intersect) w0 = intersect;
        return { w0, w1 };
    }
    return null;
};

const isPlaneCross = (plane: any, v0: any, v1: any) => {
    const dotv0 = dotPlane(plane, v0);
    const dotv1 = dotPlane(plane, v1);
    const signv0 = pickSign(dotv0);
    const signv1 = pickSign(dotv1);

    if (signv0 === 1 && signv1 === 1) return null;

    const dir = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
    if (dotPlaneNormal(plane, dir) > 0) {
        return { fParam: -1 };
    }

    if (signv0 === 0) {
        return { fParam: signv1 === 0 ? 1 : 0 };
    }

    if (dotv0 * dotv1 <= 0) {
        const fParam = Math.min(1, dotv0 / (dotv0 - dotv1));
        return { fParam };
    }

    return null;
};

const getColPlanesRecurse = (
    nodeIdx: number,
    collision: any,
    method: "sphere" | "cylinder",
    radius: number,
    height: number,
    origin: any,
    target: any,
    solidPlanes: any[],
    outList: any[],
    state: { impactDist: number; impact: any; impactPlane: any }
): boolean => {
    const node = collision.nodes[nodeIdx];
    if (!node) return false;

    const hasPos = node.pos !== -1;
    const hasNeg = node.neg !== -1;

    if (!hasPos && !hasNeg) { // leaf
        if (!node.solid) return false;

        for (const p of solidPlanes) {
            if (dotPlane(p, origin) > -0.1) return false;
        }

        const dir = { x: target.x - origin.x, y: target.y - origin.y, z: target.z - origin.z };
        let fMaxParam = 0;

        for (const p of solidPlanes) {
            const dotv0 = dotPlane(p, origin);
            const dotv1 = dotPlane(p, target);

            if (Math.abs(dotv0) < 0.1 && Math.abs(dotv1) < 0.1) {
                if (!outList.some(op => op.a === p.a && op.b === p.b && op.c === p.c && op.d === p.d)) {
                    outList.push(p);
                }
                return false;
            }

            if (dotPlaneNormal(p, dir) > 0) continue;
            if (0 < dotv0 && dotv0 < dotv1) continue;
            if (Math.abs(dotv0 - dotv1) < 0.01) continue;

            const fParam = dotv0 / (dotv0 - dotv1);
            fMaxParam = Math.max(fMaxParam, fParam);
        }

        const colPos = {
            x: origin.x + dir.x * fMaxParam,
            y: origin.y + dir.y * fMaxParam,
            z: origin.z + dir.z * fMaxParam
        };

        const fDist = dist3(origin, colPos);
        for (const p of solidPlanes) {
            if (dotPlaneNormal(p, dir) > 0) continue;
            if (Math.abs(dotPlane(p, colPos)) < 0.1) {
                if (!outList.some(op => op.a === p.a && op.b === p.b && op.c === p.c && op.d === p.d)) {
                    outList.push(p);
                }
                if (fDist < state.impactDist) {
                    state.impactDist = fDist;
                    state.impact = colPos;
                    state.impactPlane = p;
                }
            }
        }
        return true;
    }

    let fShift = 0;
    const plane = node.plane;
    if (method === "cylinder") {
        let rimpoint = { x: -plane.a, y: -plane.b, z: 0 };
        if (Math.abs(rimpoint.x) < 1e-6 && Math.abs(rimpoint.y) < 1e-6) {
            rimpoint.x = 1;
        }
        rimpoint = normalize(rimpoint);
        rimpoint.x *= radius;
        rimpoint.y *= radius;
        rimpoint.z += (plane.c < 0) ? height : -height;
        fShift = -dotPlaneNormal(plane, rimpoint);
    } else {
        fShift = radius;
    }

    let bHit = false;

    // Negative branch
    const negShiftPlane = { a: plane.a, b: plane.b, c: plane.c, d: plane.d - fShift };
    if (hasNeg && isPlaneCross(negShiftPlane, origin, target)) {
        solidPlanes.push(negShiftPlane);
        if (getColPlanesRecurse(node.neg, collision, method, radius, height, origin, target, solidPlanes, outList, state)) {
            bHit = true;
        }
        solidPlanes.pop();
    }

    // Positive branch
    const posShiftPlane = { a: -plane.a, b: -plane.b, c: -plane.c, d: -(plane.d + fShift) };
    if (hasPos && isPlaneCross(posShiftPlane, origin, target)) {
        solidPlanes.push(posShiftPlane);
        if (getColPlanesRecurse(node.pos, collision, method, radius, height, origin, target, solidPlanes, outList, state)) {
            bHit = true;
        }
        solidPlanes.pop();
    }

    return bHit;
};

const checkWall2 = (
    collision: any,
    impactPlanes: any[],
    origin: any,
    target: any,
    radius: number,
    height: number,
    method: "sphere" | "cylinder"
) => {
    impactPlanes.length = 0;
    const state = { impactDist: Infinity, impact: null, impactPlane: null };
    getColPlanesRecurse(collision.root ?? 0, collision, method, radius, height, origin, target, [], impactPlanes, state);

    if (impactPlanes.length > 0) {
        const diff = { x: target.x - origin.x, y: target.y - origin.y, z: target.z - origin.z };
        let bFound = false;
        let fMinProjDist = 0;
        let fMinDistToOrigin = 0;

        for (const plane of impactPlanes) {
            let fDistToOrigin = dotPlane(plane, origin);
            const fDistToTarget = dotPlane(plane, target);

            if (fDistToOrigin > -0.1 && fDistToTarget > -0.1) continue;

            let fProjDist = -dotPlaneNormal(plane, diff);

            if (fDistToOrigin <= 0 && fDistToTarget < fDistToOrigin) {
                fProjDist = 1;
                fDistToOrigin = 0;
            }

            if (fProjDist === 0) {
                fProjDist = 1;
                fDistToOrigin = 1;
            }

            if (!bFound) {
                bFound = true;
                fMinProjDist = fProjDist;
                fMinDistToOrigin = fDistToOrigin;
            } else {
                if (fDistToOrigin * fMinProjDist < fMinDistToOrigin * fProjDist) {
                    fMinProjDist = fProjDist;
                    fMinDistToOrigin = fDistToOrigin;
                }
            }
        }

        if (!bFound) return false;

        const fInter = Math.max(0, Math.min(1, fMinDistToOrigin / fMinProjDist));
        target.x = origin.x + fInter * diff.x;
        target.y = origin.y + fInter * diff.y;
        target.z = origin.z + fInter * diff.z;

        return true;
    }

    return false;
};

const checkWall = (
    collision: any,
    origin: any,
    target: any,
    radius: number,
    height: number,
    method: "sphere" | "cylinder"
) => {
    const checkwalldir = normalize({ x: target.x - origin.x, y: target.y - origin.y, z: target.z - origin.z });
    const impactPlanes: any[] = [];
    const state = { impactDist: Infinity, impact: null, impactPlane: null };

    getColPlanesRecurse(collision.root ?? 0, collision, method, radius, height, origin, target, [], impactPlanes, state);

    if (impactPlanes.length > 0) {
        const diff = { x: target.x - origin.x, y: target.y - origin.y, z: target.z - origin.z };
        let bFound = false;
        let fMinProjDist = 1;
        let fMinDistToOrigin = 0;

        for (const plane of impactPlanes) {
            let fProjDist = -dotPlaneNormal(plane, diff);
            let fDistToOrigin = dotPlane(plane, origin);

            if (fDistToOrigin <= -0.1) {
                fProjDist = 1;
                fDistToOrigin = 0;
            }
            if (fProjDist === 0) {
                fProjDist = 1;
                fDistToOrigin = 1;
            }

            if (!bFound) {
                bFound = true;
                fMinProjDist = fProjDist;
                fMinDistToOrigin = fDistToOrigin;
            } else {
                if (fDistToOrigin / fProjDist < fMinDistToOrigin / fMinProjDist) {
                    fMinProjDist = fProjDist;
                    fMinDistToOrigin = fDistToOrigin;
                }
            }
        }

        if (!bFound) return false;

        const fInter = Math.max(0, Math.min(1, fMinDistToOrigin / fMinProjDist));
        const currentorigin = {
            x: origin.x + fInter * diff.x,
            y: origin.y + fInter * diff.y,
            z: origin.z + fInter * diff.z
        };

        const simulplanes: any[] = [];
        for (const p of impactPlanes) {
            if (Math.abs(dotPlane(p, currentorigin)) < 0.1) {
                simulplanes.push(p);
            }
        }

        let fBestCase = 0;
        let newtargetpos = { ...currentorigin };
        let b1Case = false;

        // 1-Plane Case
        for (const plane of simulplanes) {
            const Ni = { x: plane.a, y: plane.b, z: plane.c };
            const adjtargetpos = {
                x: target.x + Ni.x * -dotPlane(plane, target),
                y: target.y + Ni.y * -dotPlane(plane, target),
                z: target.z + Ni.z * -dotPlane(plane, target)
            };

            const checktargetpos = { ...adjtargetpos };
            checkWall2(collision, [], currentorigin, checktargetpos, radius, height, method);
            const fDot = dot(checkwalldir, { x: checktargetpos.x - origin.x, y: checktargetpos.y - origin.y, z: checktargetpos.z - origin.z });

            if (fDot > fBestCase) {
                b1Case = true;
                fBestCase = fDot;
                newtargetpos = adjtargetpos;
            }
        }

        // 2-Planes Case
        let b2Case = false;
        for (let i = 0; i < simulplanes.length; i++) {
            for (let j = i + 1; j < simulplanes.length; j++) {
                const intersection = getIntersectionOfTwoPlanes(simulplanes[i], simulplanes[j]);
                if (intersection) {
                    const dir = normalize(intersection.dir);
                    const aPointToTarget = { x: target.x - intersection.point.x, y: target.y - intersection.point.y, z: target.z - intersection.point.z };
                    const dotDir = dot(dir, aPointToTarget);
                    const adjtargetpos = {
                        x: intersection.point.x + dotDir * dir.x,
                        y: intersection.point.y + dotDir * dir.y,
                        z: intersection.point.z + dotDir * dir.z
                    };

                    const checktargetpos = { ...adjtargetpos };
                    checkWall2(collision, [], currentorigin, checktargetpos, radius, height, method);
                    const fDot = dot(checkwalldir, { x: checktargetpos.x - origin.x, y: checktargetpos.y - origin.y, z: checktargetpos.z - origin.z });
                    if (fDot > fBestCase) {
                        fBestCase = fDot;
                        newtargetpos = adjtargetpos;
                        b2Case = true;
                    }
                }
            }
        }

        const newdir = { x: target.x - currentorigin.x, y: target.y - currentorigin.y, z: target.z - currentorigin.z };
        if (dot(newdir, checkwalldir) < -0.01) {
            target.x = currentorigin.x;
            target.y = currentorigin.y;
            target.z = currentorigin.z;
            return false;
        }

        if (!b2Case && !b1Case) {
            target.x = currentorigin.x;
            target.y = currentorigin.y;
            target.z = currentorigin.z;
            return true;
        }

        const finalCheckTarget = { ...newtargetpos };
        const finalImpactPlanes: any[] = [];
        checkWall2(collision, finalImpactPlanes, currentorigin, finalCheckTarget, radius, height, method);
        for (const plane of finalImpactPlanes) {
            if (dotPlane(plane, newtargetpos) < -0.05) {
                target.x = finalCheckTarget.x;
                target.y = finalCheckTarget.y;
                target.z = finalCheckTarget.z;
                return true;
            }
        }

        target.x = newtargetpos.x;
        target.y = newtargetpos.y;
        target.z = newtargetpos.z;
        return true;
    }

    return false;
};

const raycastCollisionDistance = (collision: any, origin: any, target: any) => {
    const res = raycastSolidBsp(collision, origin, target);
    return res ? res.impactDist : null;
};

const raycastCollision = (collision: any, origin: any, target: any) =>
    raycastCollisionDistance(collision, origin, target) !== null;

const raycastCollisionImpact = (collision: any, origin: any, target: any) => {
    const res = raycastSolidBsp(collision, origin, target);
    if (!res) return null;
    return { dist: res.impactDist, pos: res.impact, plane: res.impactPlane };
};

const raycastSolidBsp = (collision: any, origin: any, target: any) => {
    if (!collision?.nodes || collision.nodes.length === 0) return null;
    const impactPlanes: any[] = [];
    const state = { impactDist: Infinity, impact: null, impactPlane: null };
    getColPlanesRecurse(collision.root ?? 0, collision, "sphere", 0, 0, origin, target, [], impactPlanes, state);
    if (state.impactDist === Infinity) return null;
    return state;
};

const checkWallCylinder = (collision: any, origin: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }, radius: number, height: number) => {
    if (!collision) return { hit: false, pos: target };
    const newTarget = { ...target };
    const hit = checkWall(collision, origin, newTarget, radius, height, "cylinder");
    return { hit, pos: newTarget };
};

const checkWallBetween = (collision: any, a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => {
    if (!collision) return false;
    const p1 = { x: a.x, y: a.y, z: a.z + 100 };
    const p2 = { x: b.x, y: b.y, z: b.z + 100 };
    return raycastCollision(collision, p1, p2);
};

const checkSolidCylinder = (collision: any, pos: { x: number; y: number; z: number }, radius: number, height: number) => {
    if (!collision) return false;
    const target = { x: pos.x, y: pos.y, z: pos.z + 0.1 };
    const impactPlanes: any[] = [];
    const state = { impactDist: Infinity, impact: null, impactPlane: null };
    return getColPlanesRecurse(collision.root ?? 0, collision, "cylinder", radius, height, pos, target, [], impactPlanes, state);
};

const getFloorDistance = (collision: any, pos: { x: number; y: number; z: number }) => {
    if (!collision) return null;
    const origin = { x: pos.x, y: pos.y, z: pos.z + 5 };
    const target = { x: pos.x, y: pos.y, z: pos.z - 5000 };
    return raycastCollisionDistance(collision, origin, target);
};

const getFloorPos = (collision: any, pos: { x: number; y: number; z: number }) => {
    if (!collision) return null;
    const origin = { x: pos.x, y: pos.y, z: pos.z + 5 };
    const target = { x: pos.x, y: pos.y, z: pos.z - 10000 };
    const hit = raycastCollisionImpact(collision, origin, target);
    if (!hit) return target;
    return { x: hit.pos.x, y: hit.pos.y, z: hit.pos.z - PLAYER_HEIGHT };
};

const adjustMoveAgainstCollision = (collision: any, from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) => {
    if (!collision) return { pos: to, blocked: false };
    const newTo = { ...to };
    const hit = checkWall(collision, from, newTo, PLAYER_RADIUS, PLAYER_HEIGHT, "cylinder");
    return { pos: newTo, blocked: hit };
};

const isNearWall = (collision: any, pos: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, maxDist: number) => {
    if (!collision) return false;
    const norm = normalize({ x: dir.x, y: dir.y, z: 0 });
    if (!norm.x && !norm.y) return false;
    const p1 = { x: pos.x, y: pos.y, z: pos.z + 100 };
    const p2 = { x: pos.x, y: pos.y, z: pos.z + 180 };
    const t1 = { x: p1.x + norm.x * maxDist, y: p1.y + norm.y * maxDist, z: p1.z };
    const t2 = { x: p2.x + norm.x * maxDist, y: p2.y + norm.y * maxDist, z: p2.z };
    return !!(raycastCollisionDistance(collision, p1, t1) !== null && raycastCollisionDistance(collision, p2, t2) !== null);
};

const isBlockedMovement = (collision: any, from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) => {
    if (!collision) return false;
    const offsets = [
        { x: 0, y: 0 },
        { x: PLAYER_RADIUS, y: 0 },
        { x: -PLAYER_RADIUS, y: 0 },
        { x: 0, y: PLAYER_RADIUS },
        { x: 0, y: -PLAYER_RADIUS }
    ];
    for (const off of offsets) {
        const legsFrom = { x: from.x + off.x, y: from.y + off.y, z: from.z + LEGS_OFFSET_Z };
        const legsTo = { x: to.x + off.x, y: to.y + off.y, z: to.z + LEGS_OFFSET_Z };
        if (raycastCollision(collision, legsFrom, legsTo)) return true;
        const bodyFrom = { x: from.x + off.x, y: from.y + off.y, z: from.z + BODY_OFFSET_Z };
        const bodyTo = { x: to.x + off.x, y: to.y + off.y, z: to.z + BODY_OFFSET_Z };
        if (raycastCollision(collision, bodyFrom, bodyTo)) return true;
        const headFrom = { x: from.x + off.x, y: from.y + off.y, z: from.z + HEAD_OFFSET_Z };
        const headTo = { x: to.x + off.x, y: to.y + off.y, z: to.z + HEAD_OFFSET_Z };
        if (raycastCollision(collision, headFrom, headTo)) return true;
    }
    return false;
};

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

const applyDamage = (target: PlayerState, attacker: PlayerState, damage: number, piercingRatio: number) => {
    const hpDamage = Math.floor(damage * piercingRatio);
    let apDamage = damage - hpDamage;
    let finalHp = hpDamage;
    if (target.ap - apDamage < 0) {
        finalHp += apDamage - target.ap;
        apDamage -= apDamage - target.ap;
    }
    target.health -= finalHp;
    target.ap -= apDamage;
    if (target.health < 0) target.health = 0;
    if (target.ap < 0) target.ap = 0;
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

const updateDuelState = (dispatcher: nkruntime.MatchDispatcher, state: MatchState, tick: number) => {
    if (state.stage.mode !== "duel" || !state.stage.started) return;

    if (!state.duel) {
        state.duel = { 
            queue: Object.keys(state.players).filter(id => !state.players[id].spectator) 
        };
    }

    // Assign next fighters
    if (!state.duel.p1 && state.duel.queue.length > 0) {
        state.duel.p1 = state.duel.queue.shift();
    }
    if (!state.duel.p2 && state.duel.queue.length > 0) {
        state.duel.p2 = state.duel.queue.shift();
    }

    // Cleanup disconnected fighters
    if (state.duel.p1 && !state.players[state.duel.p1]) state.duel.p1 = undefined;
    if (state.duel.p2 && !state.players[state.duel.p2]) state.duel.p2 = undefined;

    // Reset fighters for the next 1v1
    [state.duel.p1, state.duel.p2].forEach(sid => {
        if (sid) {
            const p = state.players[sid];
            if (p && p.dead && tick >= p.respawnTick) {
                p.dead = false;
                p.health = p.maxHealth;
                p.ap = p.maxAp;
                p.pos = getSpawnPos(state, p);
                dispatcher.broadcastMessage(OpCode.S_PLAYER_RESPAWN, JSON.stringify(wrapPayload({ userId: p.presence.userId, pos: p.pos })), null, null, true);
            }
        }
    });
};


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

const getMeleeMotionParams = (motion?: string) => {
    const table = getMeleeMotionTable();
    const m = (motion || "").toLowerCase();
    const entry = table[m] || table["slash1"];
    return {
        stun: Number(entry?.stunTicks ?? 6),
        knockbackScale: Number(entry?.knockbackScale ?? 1.0),
        coneDot: Number(entry?.coneDot ?? 0.5),
        rangeScale: Number(entry?.rangeScale ?? 1.0),
        swingAngleDeg: Number(entry?.swingAngleDeg ?? 60),
        samples: Math.max(3, Number(entry?.samples ?? 5))
    };
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

const isActivePlayer = (p: PlayerState) => !p.spectator && !p.disconnected;

const reassignMaster = (state: MatchState) => {
    const next = Object.values(state.players).find(isActivePlayer);
    state.stage.masterSessionId = next?.presence.sessionId;
    state.stage.masterUserId = next?.presence.userId;
};

const cleanupDisconnected = (state: MatchState, tick: number) => {
    let removedMaster = false;
    for (const [sessionId, p] of Object.entries(state.players)) {
        if (!p.disconnected) continue;
        if (p.disconnectedUntilTick && tick >= p.disconnectedUntilTick) {
            if (state.stage.masterSessionId === sessionId) removedMaster = true;
            delete state.players[sessionId];
        }
    }
    if (removedMaster) reassignMaster(state);
};

const broadcastRoomUpdate = (dispatcher: nkruntime.MatchDispatcher, state: MatchState) => {
    const payload = {
        stage: state.stage,
        players: Object.values(state.players).map(p => ({
            userId: p.presence.userId,
            username: p.presence.username,
            ready: p.ready,
            team: p.team,
            loaded: p.loaded,
            spectator: !!p.spectator,
            disconnected: !!p.disconnected
        }))
    };
    dispatcher.broadcastMessage(OpCode.S_ROOM_UPDATE, JSON.stringify(wrapPayload(payload)), null, null, true);
};

const broadcastReadyState = (dispatcher: nkruntime.MatchDispatcher, state: MatchState) => {
    const payload = {
        players: Object.values(state.players).map(p => ({
            userId: p.presence.userId,
            ready: p.ready
        }))
    };
    dispatcher.broadcastMessage(OpCode.S_READY_STATE, JSON.stringify(wrapPayload(payload)), null, null, true);
};

const broadcastMatchState = (dispatcher: nkruntime.MatchDispatcher, state: MatchState, tick: number) => {
    const payload = {
        tick,
        players: Object.values(state.players).reduce((acc: any, p) => {
            acc[p.presence.userId] = {
                hp: p.health,
                ap: p.ap,
                maxHp: p.maxHealth,
                maxAp: p.maxAp,
                weight: p.weight,
                maxWeight: p.maxWeight,
                sf: p.sf,
                fr: p.fr,
                cr: p.cr,
                pr: p.pr,
                lr: p.lr,
                limitSpeed: p.limitSpeed,
                limitWall: p.limitWall,
                pos: p.pos,
                rot: p.rot,
                anim: p.anim,
                dead: p.dead,
                team: p.team,
                kills: p.kills,
                deaths: p.deaths,
                ammo: p.ammo,
                flashUntilTick: p.flashUntilTick ?? 0,
                stunUntilTick: p.stunUntilTick ?? 0,
                slowUntilTick: p.slowUntilTick ?? 0,
                poisonUntilTick: p.poisonUntilTick ?? 0,
                burnUntilTick: p.burnUntilTick ?? 0,
                enchantType: p.enchantType ?? "",
                spectator: !!p.spectator,
                disconnected: !!p.disconnected
            };
            return acc;
        }, {}),
        score: state.score,
        npcs: Object.values(state.npcs).map(npc => ({
            id: npc.id,
            templateId: npc.templateId,
            name: npc.name,
            hp: npc.health,
            ap: npc.ap,
            pos: npc.pos,
            dead: npc.dead
        })),
        worldItems: state.worldItems.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            amount: item.amount,
            pos: item.pos,
            active: item.active
        })),
        projectiles: state.projectiles.map(p => ({
            id: p.id,
            ownerUserId: p.ownerUserId,
            weaponType: p.weaponType,
            pos: p.pos,
            dir: p.dir
        })),
        smokeZones: state.smokeZones.map(z => ({
            id: z.id,
            pos: z.pos,
            radius: z.radius,
            endTick: z.endTick
        }))
    };
    dispatcher.broadcastMessage(OpCode.S_MATCH_STATE, JSON.stringify(wrapPayload(payload)), null, null, true);
};

export const matchInit: nkruntime.MatchInitFunction = (ctx, logger, nk, params) => {
    const gameTypeId = params?.gameTypeId ?? 0;
    const gt = getGameTypeConfig(gameTypeId);
    const roundLimit = Number.isFinite(params?.roundLimit) ? params.roundLimit : (gt?.defaultRound ?? 0);
    const timeLimitSec = normalizeTimeLimit(Number.isFinite(params?.timeLimitSec) ? params.timeLimitSec : (gt?.defaultTimeSec ?? 0));
    const settings: StageSettings = {
        name: params?.name ?? "Room",
        mapId: params?.mapId ?? 0,
        mode: params?.mode ?? "DM",
        gameTypeId,
        maxPlayers: params?.maxPlayers ?? 16,
        roundLimit,
        timeLimitSec,
        password: params?.password ?? "",
        teamMode: params?.teamMode ?? false,
        channelRule: params?.channelRule ?? "free_all_maps"
    };

    const map = getMapById(settings.mapId);
    const mapName = map?.name ?? "";
    const questLevel = Number.isFinite(params?.questLevel) ? params.questLevel : (Number.isFinite(params?.ql) ? params.ql : 0);
    const mapset = mapName ? getQuestMapsetByName(mapName) : null;
    const scenario = mapset ? getScenarioForMapset(mapset.title ?? mapset.name ?? mapName, questLevel) : null;
    let questState: MatchState["quest"] | undefined;
    let initialNpcs: Record<string, NpcState> = {};
    if (scenario && mapset) {
        const sectors = (scenario.maps ?? [])
            .slice()
            .sort((a: any, b: any) => Number(a?.dice ?? 0) - Number(b?.dice ?? 0))
            .map((m: any) => {
                const sectorId = Number(m?.key_sector ?? 0);
                const sector = (mapset.sectors ?? []).find((s: any) => Number(s?.id) === sectorId) ?? {};
                return {
                    sectorId,
                    npcsets: Array.isArray(m?.npcset_array) ? m.npcset_array : [],
                    meleeSpawn: Number(sector?.melee_spawn ?? 0),
                    rangeSpawn: Number(sector?.range_spawn ?? 0),
                    bossSpawn: String(sector?.boss_spawn ?? "") === "1"
                };
            });
        questState = {
            mode: "scenario",
            stageIndex: 0,
            completed: false,
            scenarioTitle: scenario.title,
            scenarioXp: Number(scenario.XP ?? 0),
            scenarioBp: Number(scenario.BP ?? 0),
            sectors
        };
        if (sectors.length > 0) {
            initialNpcs = buildScenarioNpcs(sectors[0], settings.mapId);
        }
    } else {
        const quest = getQuestByMap(settings.mapId);
        questState = quest?.stages ? { mode: "simple", questId: quest.id, stageIndex: 0, completed: false } : undefined;
        initialNpcs = questState && quest ? buildQuestNpcs(quest, 0, settings.mapId) : {};
    }
    return {
        state: {
            players: {},
            pendingJoinMeta: {},
            startTime: Date.now(),
            stage: {
                ...settings,
                started: false,
                round: 0,
                roundStartTick: 0,
                roundEndTick: 0
            },
            score: { red: 0, blue: 0 },
            worldItems: getWorldItemSpawns(settings.mapId, !!settings.teamMode).map((entry: any, idx: number) => {
                const desc = getWorldItemDesc(entry.item) || {};
                const respawnSec = Number.isFinite(entry.timeSec) && entry.timeSec > 0
                    ? entry.timeSec
                    : (Number.isFinite(desc.time) ? Number(desc.time) / 1000 : 30);
                return {
                    id: `${settings.mapId}-${idx}-${entry.item}`,
                    name: entry.item,
                    type: String(desc.type ?? "unknown"),
                    amount: Number.isFinite(desc.amount) ? Number(desc.amount) : 0,
                    pos: entry.pos ?? { x: 0, y: 0, z: 0 },
                    active: true,
                    respawnTick: 0,
                    respawnSec
                };
            }),
            projectiles: [],
            nextProjectileId: 1,
            smokeZones: [],
            quest: questState,
            npcs: questState ? initialNpcs : {}
        },
        tickRate: TICK_RATE,
        label: JSON.stringify({
            name: settings.name,
            mapId: settings.mapId,
            mode: settings.mode,
            gameTypeId: settings.gameTypeId,
            maxPlayers: settings.maxPlayers,
            roundLimit: settings.roundLimit,
            timeLimitSec: settings.timeLimitSec,
            hasPassword: !!settings.password
        })
    };
};

export const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = (ctx, logger, nk, dispatcher, tick, state: MatchState, presence, metadata) => {
    const currentSize = Object.values(state.players).filter(isActivePlayer).length;
    const metaSpectator = (metadata as any)?.spectator === true || (metadata as any)?.spectator === "true";
    const existing = Object.values(state.players).find(p => p.userId === presence.userId);
    if (currentSize >= state.stage.maxPlayers && !metaSpectator && !existing) {
        return { state, accept: false, rejectMessage: "Room full." };
    }
    if (state.stage.password && state.stage.password.length > 0) {
        const provided = (metadata as any)?.password ?? "";
        if (provided !== state.stage.password) {
            return { state, accept: false, rejectMessage: "Invalid password." };
        }
    }
    if (!state.pendingJoinMeta) state.pendingJoinMeta = {};
    state.pendingJoinMeta[presence.userId] = { spectator: metaSpectator };
    return { state, accept: true };
};

export const matchJoin: nkruntime.MatchJoinFunction = (ctx, logger, nk, dispatcher, tick, state: MatchState, presences) => {
    presences.forEach((p) => {
        const meta = state.pendingJoinMeta?.[p.userId] ?? {};
        const spectator = !!meta.spectator;

        const existingEntry = Object.entries(state.players).find(([, st]) => st.userId === p.userId && st.disconnected);
        if (existingEntry) {
            const [oldSessionId, oldState] = existingEntry;
            delete state.players[oldSessionId];
            oldState.presence = p;
            oldState.userId = p.userId;
            oldState.disconnected = false;
            oldState.disconnectedUntilTick = 0;
            oldState.spectator = spectator || oldState.spectator;
            state.players[p.sessionId] = oldState;
            if (state.stage.masterSessionId === oldSessionId) {
                state.stage.masterSessionId = p.sessionId;
                state.stage.masterUserId = p.userId;
            }
        } else {
            if (!state.stage.masterUserId && !spectator) {
                state.stage.masterUserId = p.userId;
                state.stage.masterSessionId = p.sessionId;
            }
            state.players[p.sessionId] = {
                presence: p,
                userId: p.userId,
                health: 100,
                ap: 100,
                pos: { x: 0, y: 0, z: 0 },
                rot: { x: 0, y: 0, z: 0 },
                vel: { x: 0, y: 0, z: 0 },
                anim: 0,
                ready: false,
                team: 0,
                loaded: false,
                dead: false,
                respawnTick: 0,
                lastAttackTick: -999999,
                kills: 0,
                deaths: 0,
                maxHealth: 100,
                maxAp: 100,
                weight: 0,
                maxWeight: BASE_MAX_WEIGHT,
                sf: 0,
                fr: 0,
                cr: 0,
                pr: 0,
                lr: 0,
                limitSpeed: 100,
                limitWall: 0,
                limitJump: 0,
                limitTumble: 0,
                caFactor: 1.0,
                caElapsed: 0.0,
                lastShotTick: -999999,
                pendingGuardRecoilTick: 0,
                chargedUntilTick: 0,
                guardCancelUntilTick: 0,
                stunType: ZST_NONE,
                guardStartTick: 0,
                pendingDashTick: 0,
                pendingDashDir: undefined,
                wallJumpStartTick: 0,
                wallJumpDir: -1,
                wallJump2: false,
                wallJump2Dir: -1,
                lastTumbleTick: 0,
                lastJumpTick: 0,
                ammo: {},
                weapons: {},
                spectator,
                disconnected: false,
                disconnectedUntilTick: 0,
                flashUntilTick: 0,
                stunUntilTick: 0,
                slowUntilTick: 0,
                slowRatio: 1,
                poisonUntilTick: 0,
                nextPoisonTick: 0,
                poisonDamage: 0,
                burnUntilTick: 0,
                nextBurnTick: 0,
                burnDamage: 0,
                lightningUntilTick: 0,
                nextLightningTick: 0,
                lightningDamage: 0,
                enchantType: "",
                enchantLevel: 0,
                enchantDamage: 0,
                enchantDurationTicks: 0,
                enchantLimitSpeed: 0
            };
        }
        if (state.pendingJoinMeta) delete state.pendingJoinMeta[p.userId];

        const playerState = state.players[p.sessionId];

        if (!playerState.spectator) {
            const active = nk.storageRead([{ collection: "characters", key: "active", userId: p.userId }]);
            const list = nk.storageRead([{ collection: "characters", key: "list", userId: p.userId }]);
            let activeId: string | null = null;
            if (active.length > 0) activeId = (active[0].value as any)?.charId ?? null;
            const chars = (list.length > 0 ? (list[0].value as any)?.characters : []) ?? [];
            const char = (activeId ? chars.find((c: any) => c?.id === activeId) : null) ?? chars[0] ?? null;
            if (char?.equipment) {
                playerState.weapons = {
                    melee: char.equipment.melee,
                    primary: char.equipment.primary,
                    secondary: char.equipment.secondary
                };
                const enchantIds = [char.equipment.item1, char.equipment.item2].filter((id: any) => typeof id === "number");
                for (const eid of enchantIds) {
                    const legacy = getLegacyItemEffect(Number(eid));
                    const weaponType = String(legacy?.weapon || "").toLowerCase();
                    if (weaponType.startsWith("enchant_")) {
                        playerState.enchantType = weaponType;
                        playerState.enchantLevel = Number(legacy?.effect_level || 1);
                        playerState.enchantDamage = Number(legacy?.damage || 0);
                        const delayMs = Number(legacy?.delay || 0);
                        playerState.enchantDurationTicks = delayMs > 0 ? Math.max(1, Math.ceil(delayMs / 50)) : DOT_TICK_INTERVAL;
                        playerState.enchantLimitSpeed = Number(legacy?.limitspeed || 0);
                        break;
                    }
                }
            }
            if (playerState.weapons) {
                const ids = Object.values(playerState.weapons).filter((id): id is number => typeof id === "number");
                for (const id of ids) {
                    const weapon = getWeaponInfo(id);
                    if (weapon) ensureAmmoState(playerState, id, weapon);
                }
            }
            if (char) {
                const baseHp = Number.isFinite(char.hp) ? char.hp : 100;
                const baseAp = Number.isFinite(char.ap) ? char.ap : 0;
                const bonus = computeEquipmentStats(char.equipment);
                playerState.maxHealth = baseHp + bonus.hp;
                playerState.maxAp = baseAp + bonus.ap;
                playerState.weight = bonus.weight;
                playerState.maxWeight = BASE_MAX_WEIGHT + bonus.maxwt;
                playerState.sf = bonus.sf;
                playerState.fr = bonus.fr;
                playerState.cr = bonus.cr;
                playerState.pr = bonus.pr;
                playerState.lr = bonus.lr;
                playerState.health = playerState.maxHealth;
                playerState.ap = playerState.maxAp;
            }
            const currentWeaponId = playerState.weapons.primary ?? playerState.weapons.secondary ?? playerState.weapons.melee;
            if (currentWeaponId) {
                const w = getWeaponInfo(currentWeaponId);
                if (w) {
                    playerState.currentWeaponId = currentWeaponId;
                    playerState.limitSpeed = w.limitSpeed || 100;
                    playerState.limitWall = w.limitWall || 0;
                    playerState.limitJump = w.limitJump || 0;
                    playerState.limitTumble = w.limitTumble || 0;
                }
            }
            playerState.pos = getSpawnPos(state, playerState);
        }
        const welcome = {
            matchId: ctx.matchId,
            tickRate: TICK_RATE,
            mapId: state.stage.mapId,
            players: Object.values(state.players).map(sp => ({
                uid: sp.presence.userId,
                name: sp.presence.username
            }))
        };
        dispatcher.broadcastMessage(OpCode.S_MATCH_WELCOME, JSON.stringify(wrapPayload(welcome)), [p], null, true);
        if (!playerState.spectator) {
            dispatcher.broadcastMessage(
                OpCode.S_PLAYER_SPAWN,
                JSON.stringify(wrapPayload({ userId: p.userId, username: p.username, pos: playerState.pos })),
                null,
                null,
                true
            );
        }
    });
    if (state.npcs && Object.keys(state.npcs).length > 0) {
        broadcastNpcSpawn(dispatcher, state.npcs, presences);
    }
    broadcastRoomUpdate(dispatcher, state);
    return { state };
};

export const matchLeave: nkruntime.MatchLeaveFunction = (ctx, logger, nk, dispatcher, tick, state: MatchState, presences) => {
    presences.forEach((p) => {
        const player = state.players[p.sessionId];
        if (!player) return;
        if (player.spectator) {
            delete state.players[p.sessionId];
        } else {
            player.disconnected = true;
            player.disconnectedUntilTick = tick + RECONNECT_GRACE_TICKS;
            player.ready = false;
        }
        if (state.stage.masterSessionId === p.sessionId) {
            reassignMaster(state);
        }
    });
    broadcastRoomUpdate(dispatcher, state);
    return { state };
};

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

    msgList.forEach((msg) => {

        const player = state.players[msg.presence.sessionId];
        if (!player) return;

        let data: any = {};
        try {
            data = JSON.parse(nk.binaryToString(msg.data));
        } catch {
            data = {};
        }

        const envelope = parseEnvelope(data);
        if (!envelope.versionOk) return;
        const payload = envelope.payload;

        if ((player.spectator || player.disconnected) && msg.opCode !== OpCode.C_ROOM_CHAT && msg.opCode !== OpCode.TIME_SYNC) {
            return;
        }

        switch (msg.opCode) {
            case OpCode.MOVE:
            case OpCode.C_INPUT_MOVE: {
                if (player.stunUntilTick && player.stunUntilTick > tick) break;
                const pos = payload?.pos;
                const rot = payload?.rot;
                if (!isVec3(pos) || !isVec3(rot)) break;
                if (Number.isFinite(payload?.weaponId)) {
                    const weaponId = payload.weaponId as number;
                    const weapon = getWeaponInfo(weaponId);
                    if (weapon) {
                        player.currentWeaponId = weaponId;
                        player.limitSpeed = weapon.limitSpeed || player.limitSpeed;
                        player.limitWall = weapon.limitWall || player.limitWall;
                        player.limitJump = weapon.limitJump || player.limitJump;
                        player.limitTumble = weapon.limitTumble || player.limitTumble;
                        if (!isMeleeWeaponType(weapon.weaponType)) {
                            player.chargedUntilTick = 0;
                        }
                    }
                }
                const animValue = Number.isFinite(payload?.anim) ? payload.anim : player.anim;
                const wasGuard = isGuardNonrecoilable(player.anim);
                if (isLowerState(animValue)) {
                    const slowActive = player.slowUntilTick && player.slowUntilTick > tick;
                    if ((isWallRunState(animValue) || isWallJumpState(animValue)) && (player.limitWall > 0 || slowActive)) break;
                    if (isTumbleState(animValue) && (slowActive || player.limitTumble > 0)) break;
                    if ((animValue === ZC_STATE_LOWER_JUMP_UP || animValue === ZC_STATE_LOWER_JUMP_DOWN || isWallJumpState(animValue)) && (slowActive || player.limitJump > 0)) break;
                }
                if (isLowerState(animValue) && isTumbleState(animValue)) {
                    const last = player.lastTumbleTick ?? 0;
                    if (last > 0 && tick - last < Math.ceil(TUMBLE_DELAY_TIME * TICK_RATE)) break;
                }
                if (isLowerState(animValue) && animValue === ZC_STATE_LOWER_JUMP_UP) {
                    const last = player.lastJumpTick ?? 0;
                    if (last > 0 && tick - last < Math.ceil(JUMP_QUEUE_TIME * TICK_RATE)) break;
                }
                if (isLowerState(animValue) && (isWallRunState(animValue) || isWallJumpState(animValue) || isWallJump2State(animValue))) {
                    if (!player.wallJumpStartTick || player.wallJumpStartTick <= 0) {
                        player.wallJumpStartTick = tick;
                        player.wallJumpDir = getWallJumpDirFromAnim(animValue);
                        player.wallJump2 = isWallJump2State(animValue);
                        player.wallJump2Dir = player.wallJump2 ? getWallJumpDirFromAnim(animValue) : -1;
                    } else if (isWallJump2State(animValue) && !player.wallJump2) {
                        player.wallJump2 = true;
                        player.wallJump2Dir = getWallJumpDirFromAnim(animValue);
                    }
                } else {
                    player.wallJumpStartTick = 0;
                    player.wallJumpDir = -1;
                    player.wallJump2 = false;
                    player.wallJump2Dir = -1;
                }
                const moveDelta = dist3(player.pos, pos);
                const maxSpeed = isLowerState(animValue) ? getMaxMoveSpeedForAnim(player, animValue, tick) : (getMoveDeltaLimit(player, tick) / TICK_DT);
                const maxDelta = maxSpeed * TICK_DT;
                if (moveDelta > maxDelta) break;
                const collision = getMapCollision(state.stage.mapId);
                const floorDist = getFloorDistance(collision, player.pos);
                const onGround = floorDist !== null && floorDist <= 5;
                const nearGround = floorDist !== null && floorDist <= 30;
                if (isLowerState(animValue) && !isTumbleState(animValue) && !isWallJumpState(animValue)) {
                    const prevVel = { x: player.vel.x, y: player.vel.y };
                    const nextVel = { x: (pos.x - player.pos.x) / TICK_DT, y: (pos.y - player.pos.y) / TICK_DT };
                    const dv = dist2(prevVel, nextVel);
                    const airScale = (!nearGround) ? AIR_MOVE : 1.0;
                    const accelLimit = ACCEL_SPEED * TICK_DT * 1.2 * airScale;
                    if (dv > accelLimit) break;
                }
                if (isLowerState(animValue)) {
                    const deltaDir = normalize({ x: pos.x - player.pos.x, y: pos.y - player.pos.y, z: 0 });
                    if (isWallRunState(animValue) || isWallJumpState(animValue)) {
                        const hasWall = isNearWall(collision, player.pos, deltaDir, 120);
                        if (!hasWall) break;
                    }
                    if (player.wallJumpStartTick && player.wallJumpStartTick > 0) {
                        const elapsed = (tick - player.wallJumpStartTick) / TICK_RATE;
                        const dir = player.wallJumpDir ?? -1;
                        const maxWallTime = dir === 1 ? WALL_JUMP_TIME_FRONT : WALL_JUMP_TIME_SIDE;
                        const secondJumpTime = dir === 1 ? WALL_JUMP2_TIME_FRONT : WALL_JUMP2_TIME_SIDE;
                        if (elapsed > maxWallTime) break;
                        if (elapsed > secondJumpTime && !player.wallJump2 && !isWallJump2State(animValue)) break;
                    }
                    if (animValue === ZC_STATE_LOWER_JUMP_UP) {
                        if (!nearGround) break;
                        const vz = (pos.z - player.pos.z) / TICK_DT;
                        if (vz > JUMP_VELOCITY * 1.2) break;
                    }
                    if (isWallJumpState(animValue)) {
                        const vz = (pos.z - player.pos.z) / TICK_DT;
                        if (vz > JUMP2_VELOCITY * 1.2 && vz > WALL_JUMP_VELOCITY * 1.2) break;
                    }
                    if (isWallJump2State(animValue)) {
                        const vz = (pos.z - player.pos.z) / TICK_DT;
                        const expected = (animValue === ZC_STATE_LOWER_RUN_WALL_LEFT_DOWN || animValue === ZC_STATE_LOWER_RUN_WALL_RIGHT_DOWN)
                            ? WALL_JUMP2_VELOCITY
                            : JUMP2_VELOCITY;
                        if (vz > expected * 1.2) break;
                    }
                    if (animValue === ZC_STATE_LOWER_JUMP_DOWN && onGround) break;
                }
                const adjusted = adjustMoveAgainstCollision(collision, player.pos, pos);
                if (adjusted.blocked && dist3(player.pos, adjusted.pos) < 1) break;
                if (checkSolidCylinder(collision, adjusted.pos, PLAYER_RADIUS, PLAYER_HEIGHT)) break;
                player.vel = {
                    x: (adjusted.pos.x - player.pos.x) / TICK_DT,
                    y: (adjusted.pos.y - player.pos.y) / TICK_DT,
                    z: (adjusted.pos.z - player.pos.z) / TICK_DT
                };
                player.pos = adjusted.pos;
                player.rot = rot;
                player.anim = animValue;
                const nowGuard = isGuardNonrecoilable(animValue);
                if (nowGuard && !wasGuard) {
                    player.guardStartTick = tick;
                }
                if (!nowGuard) {
                    player.guardStartTick = 0;
                    player.guardCancelUntilTick = 0;
                }
                if (isLowerState(animValue) && isTumbleState(animValue)) {
                    player.lastTumbleTick = tick;
                }
                if (isLowerState(animValue) && animValue === ZC_STATE_LOWER_JUMP_UP) {
                    player.lastJumpTick = tick;
                }
                break;
            }
            case OpCode.ATTACK:
            case OpCode.C_INPUT_ATTACK:
                if (player.dead) break;
                if (player.stunUntilTick && player.stunUntilTick > tick) break;
                
                if (!isVec3(payload?.aim)) break;
                const aimDir = normalize(payload.aim);
                const weaponId = selectWeaponId(player, payload);
                if (!weaponId) break;

                const weapon = getWeaponInfo(weaponId) ?? { id: 0, damage: DEFAULT_DAMAGE, range: MAX_ATTACK_RANGE, delay: DEFAULT_DELAY_MS, reloadTime: 0, magazine: 0, maxbullet: 0, ctrlAbility: 0, limitSpeed: 100, limitWall: 0, weaponType: "unknown" };
                
                // Gladiator Mode Restriction
                const isMelee = isMeleeWeaponType(weapon.weaponType);
                const isGladiator = state.stage.mode === "gladiator" || state.stage.mode === "team_gladiator";
                if (isGladiator && !isMelee) break;

                // Duel Mode Restriction
                if (state.stage.mode === "duel" && state.duel) {
                    if (msg.presence.sessionId !== state.duel.p1 && msg.presence.sessionId !== state.duel.p2) break;
                }

                player.currentWeaponId = weaponId;

                player.limitSpeed = weapon.limitSpeed || player.limitSpeed;
                player.limitWall = weapon.limitWall || player.limitWall;
                player.limitJump = (weapon as any).limitJump || player.limitJump;
                player.limitTumble = (weapon as any).limitTumble || player.limitTumble;
                if (!isMelee) {
                    player.chargedUntilTick = 0;
                }

                const cooldownTicks = getWeaponCooldownTicks(weapon);
                if (tick - player.lastAttackTick < cooldownTicks) break;

                const usesAmmo = (weapon.magazine ?? 0) > 0 || (weapon.maxbullet ?? 0) > 0;
                if (usesAmmo) {
                    const ammo = ensureAmmoState(player, weaponId, weapon);
                    // Authoritative Reload Check
                    if (ammo.reloadEndTick > tick) break;

                    if (ammo.magazine <= 0) {
                        // Trigger auto-reload if empty and has reserve
                        if (ammo.reserve > 0 && ammo.reloadEndTick <= tick) {
                            ammo.reloadEndTick = tick + ammo.reloadTicks;
                            // Sincronizar estado de recarga se necessário (Opcional, cliente geralmente sabe)
                        }
                        break;
                    }
                    ammo.magazine -= 1;
                    
                    // Auto-reload after last bullet
                    if (ammo.magazine <= 0 && ammo.reserve > 0) {
                        ammo.reloadEndTick = tick + ammo.reloadTicks;
                    }
                }
                player.lastAttackTick = tick;

                if (!isMeleeWeaponType(weapon.weaponType)) {
                    const caBase = getWeaponCAFBase(weapon.weaponType);
                    player.caElapsed = 0;
                    player.caFactor = Math.min(1, player.caFactor + caBase);
                    player.lastShotTick = tick;
                }
                if (isMeleeWeaponType(weapon.weaponType)) {
                    const collision = getMapCollision(state.stage.mapId);
                    const ownerDir = normalize({ x: aimDir.x, y: aimDir.y, z: 0 });
                    const meleeRange = Number.isFinite(weapon.range) && weapon.range > 0 ? weapon.range : 150;
                    let meleeType = typeof payload?.meleeType === "string" ? payload.meleeType.toLowerCase() : "normal";
                    const ownerPos = player.pos;
                    const ownerProfile = getHitboxProfile(player.anim);
                    const motion = typeof payload?.meleeMotion === "string" ? payload.meleeMotion.toLowerCase() : "";
                    const isSlash = meleeType === "slash" || motion.includes("slash");
                    if (meleeType === "massive") {
                        const charged = player.chargedUntilTick && tick <= player.chargedUntilTick;
                        if (!charged) meleeType = "normal";
                    }
                    if (meleeType === "massive") {
                        player.chargedUntilTick = 0;
                        const range = 280;
                        const maxDmgRange = 50;
                        for (const target of Object.values(state.players)) {
                            if (target.spectator || target.disconnected) continue;
                            if (target.presence.userId === player.presence.userId) continue;
                            if (target.dead) continue;
                            if (state.stage.teamMode && player.team && target.team && player.team === target.team) continue;
                            const dist = dist2(ownerPos, target.pos);
                            if (dist > range) continue;
                            if (checkWallBetween(collision, ownerPos, target.pos)) continue;
                            const targetDir = normalize({ x: target.rot.x, y: target.rot.y, z: 0 });
                            if (isGuarding(target, tick) && dot(ownerDir, targetDir) < 0) {
                                const addDir = normalize({ x: target.pos.x - ownerPos.x, y: target.pos.y - ownerPos.y, z: target.pos.z - ownerPos.z });
                                target.vel = {
                                    x: target.vel.x + addDir.x * 500,
                                    y: target.vel.y + addDir.y * 500,
                                    z: target.vel.z + 200
                                };
                                continue;
                            }
                            const damageScale = 1.5 - (1.5 - 0.9) * (Math.max(dist - maxDmgRange, 0) / (range - maxDmgRange));
                            const damage = Math.floor(damageScale * weapon.damage);
                            applyDamage(target, player, damage, 0.4);
                            dispatcher.broadcastMessage(
                                OpCode.S_PLAYER_DAMAGE,
                                JSON.stringify(wrapPayload({
                                    targetUserId: target.presence.userId,
                                    attackerUserId: player.presence.userId,
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
                                handlePlayerDeath(dispatcher, state, target, player, tick);
                            }
                        }
                        for (const npc of Object.values(state.npcs)) {
                            if (npc.dead) continue;
                            const dist = dist2(ownerPos, npc.pos);
                            if (dist > range) continue;
                            if (checkWallBetween(collision, ownerPos, npc.pos)) continue;
                            const damageScale = 1.5 - (1.5 - 0.9) * (Math.max(dist - maxDmgRange, 0) / (range - maxDmgRange));
                            const damage = Math.floor(damageScale * weapon.damage);
                            damageNpc(nk, dispatcher, state, player, npc, damage);
                        }
                    } else if (isSlash) {
                        const range = meleeRange + 100;
                        const attackPos = { x: ownerPos.x, y: ownerPos.y, z: ownerPos.z };
                        for (const target of Object.values(state.players)) {
                            if (target.spectator || target.disconnected) continue;
                            if (target.presence.userId === player.presence.userId) continue;
                            if (target.dead) continue;
                            if (state.stage.teamMode && player.team && target.team && player.team === target.team) continue;
                            const targetProfile = getHitboxProfile(target.anim);
                            const dist = distanceLineSegment(
                                { x: attackPos.x, y: attackPos.y, z: attackPos.z + ownerProfile.height * 0.5 },
                                target.pos,
                                { x: target.pos.x, y: target.pos.y, z: target.pos.z + targetProfile.height }
                            );
                            if (dist > range) continue;
                            if (checkWallBetween(collision, attackPos, target.pos)) continue;
                            const toTarget = normalize({ x: target.pos.x - attackPos.x, y: target.pos.y - attackPos.y, z: 0 });
                            if (dot(ownerDir, toTarget) < 0.5) continue;
                            const targetDir = normalize({ x: target.rot.x, y: target.rot.y, z: 0 });
                            if (isGuarding(target, tick) && dot(ownerDir, targetDir) < 0) {
                                target.guardStartTick = Math.max(0, tick - Math.ceil(GUARD_DURATION * TICK_RATE));
                                target.guardCancelUntilTick = tick + Math.ceil(GUARD_RECOIL_DURATION * TICK_RATE);
                                target.chargedUntilTick = tick + Math.ceil(COUNTER_CHARGED_TIME * TICK_RATE);
                                if (isGuardingRecoilable(target, tick)) {
                                    player.pendingGuardRecoilTick = tick + Math.ceil(GUARD_RECOIL_DELAY * TICK_RATE);
                                }
                                continue;
                            }
                            applyDamage(target, player, weapon.damage, getPiercingRatio(weapon.weaponType, false));
                            applyEnchantEffects(tick, target, player);
                            const kbDir = normalize({ x: target.pos.x - player.pos.x, y: target.pos.y - player.pos.y, z: 0 });
                            applyKnockback(state, target, kbDir, getKnockbackForce(weaponId));
                            dispatcher.broadcastMessage(
                                OpCode.S_PLAYER_DAMAGE,
                                JSON.stringify(wrapPayload({
                                    targetUserId: target.presence.userId,
                                    attackerUserId: player.presence.userId,
                                    damage: weapon.damage,
                                    hp: target.health,
                                    ap: target.ap,
                                    part: "body"
                                })),
                                null,
                                null,
                                true
                            );
                            if (target.health <= 0) {
                                handlePlayerDeath(dispatcher, state, target, player, tick);
                            }
                        }
                        for (const npc of Object.values(state.npcs)) {
                            if (npc.dead) continue;
                            const dist = distanceLineSegment(
                                { x: ownerPos.x, y: ownerPos.y, z: ownerPos.z + ownerProfile.height * 0.5 },
                                npc.pos,
                                { x: npc.pos.x, y: npc.pos.y, z: npc.pos.z + npc.height }
                            );
                            if (dist > range) continue;
                            if (checkWallBetween(collision, ownerPos, npc.pos)) continue;
                            damageNpc(nk, dispatcher, state, player, npc, weapon.damage);
                        }
                    } else {
                        const swordPos = {
                            x: ownerPos.x + ownerDir.x * 100,
                            y: ownerPos.y + ownerDir.y * 100,
                            z: ownerPos.z + ownerProfile.height * 0.5
                        };
                        for (const target of Object.values(state.players)) {
                            if (target.spectator || target.disconnected) continue;
                            if (target.presence.userId === player.presence.userId) continue;
                            if (target.dead) continue;
                            if (state.stage.teamMode && player.team && target.team && player.team === target.team) continue;
                            const targetProfile = getHitboxProfile(target.anim);
                            const dist = distanceLineSegment(swordPos, target.pos, { x: target.pos.x, y: target.pos.y, z: target.pos.z + targetProfile.height });
                            if (dist >= meleeRange) continue;
                            const fTarDir = normalize({
                                x: target.pos.x - (ownerPos.x - ownerDir.x * 50),
                                y: target.pos.y - (ownerPos.y - ownerDir.y * 50),
                                z: target.pos.z - (ownerPos.z - ownerDir.z * 50)
                            });
                            if (dot(ownerDir, fTarDir) <= 0.5) continue;
                            if (checkWallBetween(collision, ownerPos, target.pos)) continue;
                            const targetDir = normalize({ x: target.rot.x, y: target.rot.y, z: 0 });
                            if (isGuarding(target, tick) && dot(ownerDir, targetDir) < 0) {
                                target.guardStartTick = Math.max(0, tick - Math.ceil(GUARD_DURATION * TICK_RATE));
                                target.guardCancelUntilTick = tick + Math.ceil(GUARD_RECOIL_DURATION * TICK_RATE);
                                target.chargedUntilTick = tick + Math.ceil(COUNTER_CHARGED_TIME * TICK_RATE);
                                if (isGuardingRecoilable(target, tick)) {
                                    player.pendingGuardRecoilTick = tick + Math.ceil(GUARD_RECOIL_DELAY * TICK_RATE);
                                }
                                continue;
                            }
                            applyDamage(target, player, weapon.damage, getPiercingRatio(weapon.weaponType, false));
                            applyEnchantEffects(tick, target, player);
                            const kbDir = normalize({ x: target.pos.x - player.pos.x, y: target.pos.y - player.pos.y, z: 0 });
                            applyKnockback(state, target, kbDir, getKnockbackForce(weaponId));
                            dispatcher.broadcastMessage(
                                OpCode.S_PLAYER_DAMAGE,
                                JSON.stringify(wrapPayload({
                                    targetUserId: target.presence.userId,
                                    attackerUserId: player.presence.userId,
                                    damage: weapon.damage,
                                    hp: target.health,
                                    ap: target.ap,
                                    part: "body"
                                })),
                                null,
                                null,
                                true
                            );
                            if (target.health <= 0) {
                                handlePlayerDeath(dispatcher, state, target, player, tick);
                            }
                        }
                        for (const npc of Object.values(state.npcs)) {
                            if (npc.dead) continue;
                            const dist = distanceLineSegment(swordPos, npc.pos, { x: npc.pos.x, y: npc.pos.y, z: npc.pos.z + npc.height });
                            if (dist >= meleeRange) continue;
                            if (checkWallBetween(collision, ownerPos, npc.pos)) continue;
                            damageNpc(nk, dispatcher, state, player, npc, weapon.damage);
                        }
                    }
                    break;
                }
                if (weapon.weaponType === "flashbang" || weapon.weaponType === "smoke" || weapon.weaponType === "smokegrenade" || weapon.weaponType === "teargas" || weapon.weaponType === "tear_gas") {
                    const dir = normalize(aimDir);
                    const startPos = { x: player.pos.x + dir.x * 50, y: player.pos.y + dir.y * 50, z: player.pos.z + 130 };
                    const vel = { x: dir.x * 1200, y: dir.y * 1200, z: dir.z * 1200 + 300 };
                    const id = `p${state.nextProjectileId++}`;
                    state.projectiles.push({
                        id,
                        ownerUserId: player.presence.userId,
                        weaponType: weapon.weaponType,
                        pos: startPos,
                        dir,
                        speed: 0,
                        remaining: 0,
                        damage: 0,
                        range: 0,
                        minDamageRatio: 0,
                        vel,
                        gravity: 1000,
                        lifeTicks: 60,
                        explodeAfterTicks: 60,
                        kind: weapon.weaponType === "flashbang" ? "flashbang" : (weapon.weaponType === "teargas" || weapon.weaponType === "tear_gas") ? "smoke" : "smoke",
                        effectDurationTicks: weapon.weaponType === "flashbang" ? FLASHBANG_DURATION_TICKS : SMOKE_DURATION_TICKS
                    });
                    break;
                }
                if (weapon.weaponType === "medkit" || weapon.weaponType === "repairkit" || weapon.weaponType === "bulletkit" || weapon.weaponType === "food") {
                    const dir = normalize(aimDir);
                    const startPos = { x: player.pos.x + dir.x * 50, y: player.pos.y + dir.y * 50, z: player.pos.z + 130 };
                    const vel = { x: dir.x * 1200, y: dir.y * 1200, z: dir.z * 1200 + 300 };
                    const id = `p${state.nextProjectileId++}`;
                    const itemDesc = getItemData(String(weaponId)) as any;
                    state.projectiles.push({
                        id,
                        ownerUserId: player.presence.userId,
                        weaponType: weapon.weaponType,
                        pos: startPos,
                        dir,
                        speed: 0,
                        remaining: 0,
                        damage: 0,
                        range: 0,
                        minDamageRatio: 0,
                        vel,
                        gravity: 1000,
                        lifeTicks: Math.ceil(2 * TICK_RATE),
                        explodeAfterTicks: Math.ceil(2 * TICK_RATE),
                        kind: "itemkit",
                        worldItemModel: String(itemDesc?.mesh_name || itemDesc?.mesh || itemDesc?.model || "")
                    });
                    break;
                }
                const isExplosive = weapon.weaponType === "rocket" || weapon.weaponType === "fragmentation";
                if (isExplosive) {
                    const dir = calcShotDir(aimDir, weapon, (nowMs() + tick) >>> 0, player.caFactor);
                    const id = `p${state.nextProjectileId++}`;
                    if (weapon.weaponType === "fragmentation") {
                        const startPos = { x: player.pos.x + dir.x * 50, y: player.pos.y + dir.y * 50, z: player.pos.z + 130 };
                        const vel = { x: dir.x * 1200, y: dir.y * 1200, z: dir.z * 1200 + 300 };
                        state.projectiles.push({
                            id,
                            ownerUserId: player.presence.userId,
                            weaponType: weapon.weaponType,
                            pos: startPos,
                            dir,
                            speed: 0,
                            remaining: 0,
                            damage: weapon.damage,
                            range: 400,
                            minDamageRatio: 0.2,
                            vel,
                            gravity: 1000,
                        lifeTicks: Math.ceil(2 * TICK_RATE),
                        explodeAfterTicks: Math.ceil(2 * TICK_RATE),
                        kind: "grenade"
                    });
                    } else {
                        const speed = getProjectileSpeed(weapon.weaponType);
                        const range = Math.min(weapon.range, MAX_ATTACK_RANGE);
                        const startPos = { x: player.pos.x, y: player.pos.y, z: player.pos.z + 80 };
                        state.projectiles.push({
                            id,
                            ownerUserId: player.presence.userId,
                            weaponType: weapon.weaponType,
                            pos: startPos,
                            dir,
                            speed,
                            remaining: range,
                            damage: weapon.damage,
                            range: 350,
                            minDamageRatio: 0.3,
                            kind: "rocket"
                        });
                    }
                    break;
                }
                const maxRange = Math.min(weapon.range, MAX_ATTACK_RANGE);
                const hitMap = new Map<PlayerState, { damage: number; piercing: number; part: "head" | "body" | "legs" }>();
                const npcHitMap = new Map<NpcState, { damage: number }>();
                const collision = getMapCollision(state.stage.mapId);
                let firstTarget: PlayerState | null = null;
                let firstTargetDist: number | null = null;
                const considerHit = (dir: { x: number; y: number; z: number }) => {
                    let best: { target: PlayerState; part: "head" | "body" | "legs"; dist: number } | null = null;
                    for (const target of Object.values(state.players)) {
                        if (target.presence.userId === player.presence.userId) continue;
                        if (target.dead) continue;
                        if (state.stage.teamMode && player.team && target.team && player.team === target.team) continue;
                        const profile = getHitboxProfile(target.anim);
                        const dest = {
                            x: player.pos.x + dir.x * maxRange,
                            y: player.pos.y + dir.y * maxRange,
                            z: player.pos.z + dir.z * maxRange
                        };
                        const hitResult = playerHitTest(
                            { x: target.pos.x, y: target.pos.y, z: target.pos.z + profile.height },
                            target.pos,
                            player.pos,
                            dest
                        );
                        if (!hitResult) continue;
                        const hitDist = dist3(player.pos, hitResult.hitPos);
                        if (hitDist > maxRange) continue;
                        if (checkWallBetween(collision, player.pos, hitResult.hitPos)) continue;

                        const toTarget = {
                            x: target.pos.x - player.pos.x,
                            y: target.pos.y - player.pos.y,
                            z: target.pos.z - player.pos.z
                        };
                        const checkDir = normalize(toTarget);
                        if (dot(dir, checkDir) < AIM_CONE_DOT) continue;
                        const targetDir = normalize({ x: target.rot.x, y: target.rot.y, z: 0 });
                        if (hitResult.part !== "legs" && isGuarding(target, tick) && dot(dir, targetDir) < 0) {
                            continue;
                        }
                        if (!best || hitDist < best.dist) {
                            best = { target, part: hitResult.part, dist: hitDist };
                        }
                    }
                    if (!best) return;
                    const damage = weapon.damage;
                    const piercing = getPiercingRatio(weapon.weaponType, best.part === "head");
                    const entry = hitMap.get(best.target) ?? { damage: 0, piercing: 0, part: best.part };
                    entry.piercing = (entry.damage * entry.piercing + damage * piercing) / (entry.damage + damage);
                    entry.damage += damage;
                    const partRank = (p: "head" | "body" | "legs") => (p === "head" ? 2 : p === "body" ? 1 : 0);
                    if (partRank(best.part) > partRank(entry.part)) entry.part = best.part;
                    hitMap.set(best.target, entry);
                    if (!firstTarget || (firstTargetDist !== null && best.dist < firstTargetDist) || firstTargetDist === null) {
                        firstTarget = best.target;
                        firstTargetDist = best.dist;
                    }
                };

                const considerNpcHit = (dir: { x: number; y: number; z: number }) => {
                    let best: { target: NpcState; dist: number } | null = null;
                    for (const npc of Object.values(state.npcs)) {
                        if (npc.dead) continue;
                        const t = rayCylinderHit(player.pos, dir, npc.pos, npc.height, npc.radius, maxRange);
                        if (t === null) continue;
                        if (checkWallBetween(collision, player.pos, npc.pos)) continue;
                        const toTarget = {
                            x: npc.pos.x - player.pos.x,
                            y: npc.pos.y - player.pos.y,
                            z: npc.pos.z - player.pos.z
                        };
                        const checkDir = normalize(toTarget);
                        if (dot(dir, checkDir) < AIM_CONE_DOT) continue;
                        if (!best || t < best.dist) {
                            best = { target: npc, dist: t };
                        }
                    }
                    if (!best) return;
                    const entry = npcHitMap.get(best.target) ?? { damage: 0 };
                    entry.damage += weapon.damage;
                    npcHitMap.set(best.target, entry);
                };

                if (weapon.weaponType === "shotgun" || weapon.weaponType === "sawedshotgun") {
                    const rng = createMt19937((nowMs() + tick) >>> 0);
                    for (let i = 0; i < SHOTGUN_PELLETS; i++) {
                        const dir = getSpreadDir(aimDir, SHOTGUN_DIFFUSE_RANGE, rng);
                        considerHit(dir);
                        considerNpcHit(dir);
                    }
                } else {
                    const dir = calcShotDir(aimDir, weapon, (nowMs() + tick) >>> 0, player.caFactor);
                    considerHit(dir);
                    considerNpcHit(dir);
                }

                if (hitMap.size === 0) break;
                {
                    hitMap.forEach((info, target) => {
                        applyDamage(target, player, info.damage, info.piercing);
                        let knockback = getKnockbackForce(weaponId);
                        if (weapon.weaponType === "shotgun" || weapon.weaponType === "sawedshotgun") {
                            const pelletHits = weapon.damage > 0 ? Math.max(1, Math.round(info.damage / weapon.damage)) : 1;
                            knockback *= pelletHits / (SHOTGUN_PELLETS / 2);
                        }
                        const kbDir = normalize({ x: target.pos.x - player.pos.x, y: target.pos.y - player.pos.y, z: 0 });
                        applyKnockback(state, target, kbDir, knockback);
                        dispatcher.broadcastMessage(
                            OpCode.S_PLAYER_DAMAGE,
                            JSON.stringify(wrapPayload({
                                targetUserId: target.presence.userId,
                                attackerUserId: player.presence.userId,
                                damage: info.damage,
                                hp: target.health,
                                ap: target.ap,
                                part: info.part
                            })),
                            null,
                            null,
                            true
                        );
                        if (target.health <= 0) {
                            target.dead = true;
                            target.respawnTick = tick + 7 * TICK_RATE;
                            target.deaths += 1;
                            player.kills += 1;
                            if (state.stage.teamMode) {
                                if (player.team === TEAM_RED) state.score.red += 1;
                                if (player.team === TEAM_BLUE) state.score.blue += 1;
                            }
                            dispatcher.broadcastMessage(
                                OpCode.S_PLAYER_DIE,
                                JSON.stringify(wrapPayload({ targetUserId: target.presence.userId, attackerUserId: player.presence.userId })),
                                null,
                                null,
                                true
                            );
                        }
                    });
                }
                if (npcHitMap.size > 0) {
                    npcHitMap.forEach((info, npc) => {
                        damageNpc(nk, dispatcher, state, player, npc, info.damage);
                    });
                }
                break;
            case OpCode.C_READY:
                player.ready = true;
                broadcastReadyState(dispatcher, state);
                break;
            case OpCode.C_UNREADY:
                player.ready = false;
                broadcastReadyState(dispatcher, state);
                break;
            case OpCode.C_TEAM_CHANGE:
                player.team = typeof payload?.team === "number" ? payload.team : player.team;
                broadcastRoomUpdate(dispatcher, state);
                break;
            case OpCode.C_CLIENT_READY:
                player.loaded = true;
                broadcastRoomUpdate(dispatcher, state);
                break;
            case OpCode.C_ROOM_CHAT:
                dispatcher.broadcastMessage(
                    OpCode.C_ROOM_CHAT,
                    JSON.stringify(wrapPayload({
                        userId: player.presence.userId,
                        username: player.presence.username,
                        message: payload?.message ?? ""
                    })),
                    null,
                    null,
                    true
                );
                break;
            case OpCode.TIME_SYNC: {
                const response = {
                    serverTime: Date.now(),
                    clientTime: payload?.clientTime ?? payload?.t ?? null,
                    tick
                };
                dispatcher.broadcastMessage(OpCode.TIME_SYNC, JSON.stringify(wrapPayload(response)), [msg.presence], null, true);
                break;
            }
            case OpCode.C_INPUT_SKILL: {
                if (player.dead) break;
                if (player.stunUntilTick && player.stunUntilTick > tick) break;
                const weaponId = player.weapons?.melee;
                if (!weaponId) break;
                const weapon = getWeaponInfo(weaponId);
                if (!weapon) break;
                const skillRaw = payload?.skill ?? payload?.skillId ?? payload?.id ?? null;
                let skillId = 0;
                if (typeof skillRaw === "string") {
                    const key = skillRaw.toLowerCase();
                    if (key === "uppercut") skillId = ZC_SKILL_UPPERCUT;
                    else if (key === "splashshot" || key === "splash") skillId = ZC_SKILL_SPLASHSHOT;
                    else if (key === "dash") skillId = ZC_SKILL_DASH;
                    else if (key === "chargedshot") skillId = ZC_SKILL_CHARGEDSHOT;
                } else if (Number.isFinite(skillRaw)) {
                    skillId = Number(skillRaw);
                }
                if (!skillId) break;
                const ownerPos = player.pos;
                const ownerDir = normalize({ x: player.rot.x, y: player.rot.y, z: 0 });
                const collision = getMapCollision(state.stage.mapId);
                if (skillId === ZC_SKILL_SPLASHSHOT) {
                    if (weapon.weaponType !== "katana" && weapon.weaponType !== "doublekatana") break;
                    const range = 300;
                    const params = getMeleeMotionParams("slash5");
                    for (const target of Object.values(state.players)) {
                        if (target.spectator || target.disconnected) continue;
                        if (target.presence.userId === player.presence.userId) continue;
                        if (target.dead) continue;
                        if (state.stage.teamMode && player.team && target.team && player.team === target.team) continue;
                        const targetPos = { x: target.pos.x, y: target.pos.y, z: target.pos.z + 80 };
                        const dist = dist3(ownerPos, targetPos);
                        if (dist > range) continue;
                        if (checkWallBetween(collision, ownerPos, target.pos)) continue;
                        const targetDir = normalize({ x: target.rot.x, y: target.rot.y, z: 0 });
                        if (isGuarding(target, tick) && dot(targetDir, ownerDir) < 0) {
                            const addVel = {
                                x: target.pos.x - ownerPos.x,
                                y: target.pos.y - ownerPos.y,
                                z: 0
                            };
                            const knockDir = normalize({ x: addVel.x, y: addVel.y, z: 200 });
                            applyKnockback(state, target, knockDir, Math.sqrt(addVel.x * addVel.x + addVel.y * addVel.y + 200 * 200));
                            continue;
                        }
                        const minDmg = 0.3;
                        const maxDmgRange = 50;
                        let dmgRange = 1.0;
                        if (dist > maxDmgRange) {
                            dmgRange = 1.0 - (1.0 - minDmg) * ((dist - maxDmgRange) / (range - maxDmgRange));
                        }
                        let damage = Math.floor(weapon.damage * dmgRange);
                        if (!player.enchantType) {
                            damage = Math.floor(damage * 3);
                        }
                        applyDamage(target, player, damage, 0.4);
                        const stunTicks = Math.max(0, params.stun);
                        if (stunTicks > 0) {
                            target.stunUntilTick = Math.max(target.stunUntilTick ?? 0, tick + stunTicks);
                            target.stunType = getStunTypeForMelee("slash5", player);
                        }
                        const kbDir = normalize({ x: target.pos.x - player.pos.x, y: target.pos.y - player.pos.y, z: 0 });
                        applyKnockback(state, target, kbDir, MAX_SPEED);
                    }
                    break;
                }
                if (skillId === ZC_SKILL_UPPERCUT) {
                    if (weapon.weaponType !== "katana" && weapon.weaponType !== "doublekatana") break;
                    const range = 200;
                    for (const target of Object.values(state.players)) {
                        if (target.presence.userId === player.presence.userId) continue;
                        if (target.dead) continue;
                        if (state.stage.teamMode && player.team && target.team && player.team === target.team) continue;
                        const dist = dist3(ownerPos, target.pos);
                        if (dist > range) continue;
                        if (checkWallBetween(collision, ownerPos, target.pos)) continue;
                        const toTarget = normalize({ x: target.pos.x - ownerPos.x, y: target.pos.y - ownerPos.y, z: 0 });
                        if (dot(ownerDir, toTarget) <= 0) continue;
                        const blastDir = normalize({ x: ownerDir.x * 300, y: ownerDir.y * 300, z: 1700 });
                        applyKnockback(state, target, blastDir, Math.sqrt(300 * 300 + 1700 * 1700));
                    }
                    break;
                }
                if (skillId === ZC_SKILL_DASH) {
                    if (player.anim !== ZC_STATE_LOWER_UPPERCUT) break;
                    if (weapon.weaponType !== "dagger" && weapon.weaponType !== "dualdagger") break;
                    const range = 600;
                    for (const target of Object.values(state.players)) {
                        if (target.presence.userId === player.presence.userId) continue;
                        if (target.dead) continue;
                        if (state.stage.teamMode && player.team && target.team && player.team === target.team) continue;
                        const dist = dist3(ownerPos, target.pos);
                        if (dist > range) continue;
                        if (checkWallBetween(collision, ownerPos, target.pos)) continue;
                        const toTarget = normalize({ x: target.pos.x - ownerPos.x, y: target.pos.y - ownerPos.y, z: 0 });
                        const fDot = dot(ownerDir, toTarget);
                        let canDamage = false;
                        if (dist < 100) {
                            if (fDot > 0) canDamage = true;
                        } else if (dist < 300) {
                            if (fDot > 0.5) canDamage = true;
                        } else {
                            if (fDot > 0.96) canDamage = true;
                        }
                        if (!canDamage) continue;
                        const damage = Math.floor(weapon.damage * 1.5);
                        const piercing = getPiercingRatio("dagger", false);
                        applyDamage(target, player, damage, piercing);
                        const blastDir = normalize({ x: ownerDir.x * 300, y: ownerDir.y * 300, z: 100 });
                        applyKnockback(state, target, blastDir, Math.sqrt(300 * 300 + 100 * 100));
                        const addTime = 0.3 * (dist / 600);
                        target.pendingDashTick = tick + Math.ceil(addTime * TICK_RATE);
                        target.pendingDashDir = ownerDir;
                    }
                    break;
                }
                if (skillId === ZC_SKILL_CHARGEDSHOT) {
                    if (weapon.weaponType !== "katana" && weapon.weaponType !== "doublekatana") break;
                    player.chargedUntilTick = tick + Math.ceil(CHARGED_TIME * TICK_RATE);
                    break;
                }
                break;
            }
        }
    });

    // Projectile updates (server-authoritative)
    if (state.projectiles.length > 0) {
        const collision = getMapCollision(state.stage.mapId);
        const nextProjectiles: ProjectileState[] = [];
        for (const proj of state.projectiles) {
            const owner = Object.values(state.players).find(p => p.presence.userId === proj.ownerUserId) ?? null;
            if (!owner) continue;
            if (proj.lifeTicks !== undefined) {
                proj.lifeTicks -= 1;
                if (proj.lifeTicks <= 0) {
                    proj.explodeAfterTicks = 0;
                }
            }
            if (proj.remaining <= 0 && !proj.vel) {
                const knockback = proj.kind === "rocket" ? 0.5 : proj.kind === "grenade" ? 1.0 : 0;
                    const exploded = applyExplosion(nk, dispatcher, state, owner, proj.pos, proj.damage, proj.range, proj.minDamageRatio, knockback);
                for (const info of exploded) {
                    dispatcher.broadcastMessage(
                        OpCode.S_PLAYER_DAMAGE,
                        JSON.stringify(wrapPayload({
                            targetUserId: info.target.presence.userId,
                            attackerUserId: owner.presence.userId,
                            damage: info.damage,
                            hp: info.target.health,
                            ap: info.target.ap,
                            part: "body"
                        })),
                        null,
                        null,
                        true
                    );
                    if (info.target.health <= 0) {
                        info.target.dead = true;
                        info.target.respawnTick = tick + 7 * TICK_RATE;
                        info.target.deaths += 1;
                        owner.kills += 1;
                        if (state.stage.teamMode) {
                            if (owner.team === TEAM_RED) state.score.red += 1;
                            if (owner.team === TEAM_BLUE) state.score.blue += 1;
                        }
                        dispatcher.broadcastMessage(
                            OpCode.S_PLAYER_DIE,
                            JSON.stringify(wrapPayload({ targetUserId: info.target.presence.userId, attackerUserId: owner.presence.userId })),
                            null,
                            null,
                            true
                        );
                    }
                }
                continue;
            }
            let dir = normalize(proj.dir);
            let step = 0;
            let nextPos = proj.pos;
            if (proj.vel) {
                proj.vel.z -= (proj.gravity ?? 0) / TICK_RATE;
                dir = normalize(proj.vel);
                step = Math.max(1, Math.min(Math.sqrt(proj.vel.x * proj.vel.x + proj.vel.y * proj.vel.y + proj.vel.z * proj.vel.z) / TICK_RATE, 200));
                nextPos = {
                    x: proj.pos.x + proj.vel.x / TICK_RATE,
                    y: proj.pos.y + proj.vel.y / TICK_RATE,
                    z: proj.pos.z + proj.vel.z / TICK_RATE
                };
            } else {
                step = Math.max(1, Math.min(proj.speed, proj.remaining));
                nextPos = {
                    x: proj.pos.x + dir.x * step,
                    y: proj.pos.y + dir.y * step,
                    z: proj.pos.z + dir.z * step
                };
            }
            const impact = collision ? raycastCollisionImpact(collision, proj.pos, nextPos) : null;
            const collisionDist = impact ? impact.dist : null;
            let hitTarget: PlayerState | null = null;
            let hitNpc: NpcState | null = null;
            let hitDist: number | null = null;
            let hitPos: { x: number; y: number; z: number } | null = null;
            for (const target of Object.values(state.players)) {
                if (target.spectator || target.disconnected) continue;
                if (target.dead) continue;
                if (state.stage.teamMode && owner.team && target.team && owner.team === target.team) continue;
                const profile = getHitboxProfile(target.anim);
                const t = rayCylinderHit(proj.pos, dir, target.pos, profile.height, profile.radius, Math.max(step, 1));
                if (t !== null && (hitDist === null || t < hitDist)) {
                    hitDist = t;
                    hitTarget = target;
                    hitNpc = null;
                    hitPos = { x: proj.pos.x + dir.x * t, y: proj.pos.y + dir.y * t, z: proj.pos.z + dir.z * t };
                }
            }
            for (const npc of Object.values(state.npcs)) {
                if (npc.dead) continue;
                const t = rayCylinderHit(proj.pos, dir, npc.pos, npc.height, npc.radius, Math.max(step, 1));
                if (t !== null && (hitDist === null || t < hitDist)) {
                    hitDist = t;
                    hitTarget = null;
                    hitNpc = npc;
                    hitPos = { x: proj.pos.x + dir.x * t, y: proj.pos.y + dir.y * t, z: proj.pos.z + dir.z * t };
                }
            }

            let impactDist: number | null = null;
            if (collisionDist !== null) impactDist = collisionDist;
            if (hitDist !== null && (impactDist === null || hitDist < impactDist)) impactDist = hitDist;

            if (proj.kind === "grenade" && impactDist !== null && (hitDist === null || impactDist === collisionDist) && proj.explodeAfterTicks !== 0) {
                // bounce
                proj.pos = {
                    x: impact?.pos?.x ?? (proj.pos.x + dir.x * impactDist),
                    y: impact?.pos?.y ?? (proj.pos.y + dir.y * impactDist),
                    z: impact?.pos?.z ?? (proj.pos.z + dir.z * impactDist)
                };
                if (proj.vel) {
                    if (impact?.plane) {
                        const normal = normalize({ x: impact.plane.a, y: impact.plane.b, z: impact.plane.c });
                        const reflected = reflect(proj.vel, normal);
                        proj.vel = {
                            x: reflected.x * 0.8,
                            y: reflected.y * 0.8,
                            z: Math.abs(reflected.z) * 0.4
                        };
                    } else {
                        proj.vel.x = -proj.vel.x * 0.8;
                        proj.vel.y = -proj.vel.y * 0.8;
                        proj.vel.z = Math.abs(proj.vel.z) * 0.4;
                    }
                }
                nextProjectiles.push(proj);
                continue;
            }

            if (impactDist !== null || proj.explodeAfterTicks === 0) {
                const impactPos = {
                    x: impact?.pos?.x ?? (proj.pos.x + dir.x * (impactDist ?? 0)),
                    y: impact?.pos?.y ?? (proj.pos.y + dir.y * (impactDist ?? 0)),
                    z: impact?.pos?.z ?? (proj.pos.z + dir.z * (impactDist ?? 0))
                };
                if (proj.kind === "flashbang") {
                    for (const p of Object.values(state.players)) {
                        if (p.dead) continue;
                        const dist = dist3(impactPos, p.pos);
                        if (dist > FLASHBANG_DISTANCE) continue;
                        const pPos = { x: p.pos.x, y: p.pos.y, z: p.pos.z + getHitOffsets(p.anim).body };
                        if (collision && raycastCollision(collision, impactPos, pPos)) continue;
                        p.flashUntilTick = tick + FLASHBANG_DURATION_TICKS;
                    }
                } else if (proj.kind === "smoke") {
                    const isTear = proj.weaponType === "teargas" || proj.weaponType === "tear_gas";
                    state.smokeZones.push({
                        id: `smoke-${tick}-${proj.id}`,
                        pos: impactPos,
                        radius: 300,
                        endTick: tick + (proj.effectDurationTicks ?? SMOKE_DURATION_TICKS),
                        kind: isTear ? "tear" : "smoke"
                    });
                } else if (proj.kind === "itemkit") {
                    const desc = proj.worldItemModel ? getWorldItemDescByModel(proj.worldItemModel) : null;
                    if (desc) {
                        state.worldItems.push({
                            id: `${state.stage.mapId}-kit-${proj.id}`,
                            name: String(desc.name),
                            type: String(desc.type ?? "unknown"),
                            amount: Number.isFinite(desc.amount) ? Number(desc.amount) : 0,
                            pos: impactPos,
                            active: true,
                            respawnTick: 0,
                            respawnSec: 0,
                            oneShot: true
                        });
                    }
                } else {
                    const explosionPos = hitPos ?? impactPos;
                    const knockback = proj.kind === "rocket" ? 0.5 : proj.kind === "grenade" ? 1.0 : 0;
                    const exploded = applyExplosion(nk, dispatcher, state, owner, explosionPos, proj.damage, proj.range, proj.minDamageRatio, knockback);
                    for (const info of exploded) {
                        dispatcher.broadcastMessage(
                            OpCode.S_PLAYER_DAMAGE,
                            JSON.stringify(wrapPayload({
                                targetUserId: info.target.presence.userId,
                                attackerUserId: owner.presence.userId,
                                damage: info.damage,
                                hp: info.target.health,
                                ap: info.target.ap,
                                part: "body"
                            })),
                            null,
                            null,
                            true
                        );
                        if (info.target.health <= 0) {
                            handlePlayerDeath(dispatcher, state, info.target, owner, tick);
                        }
                    }
                }
                continue;
            }

            proj.pos = nextPos;
            if (proj.remaining > 0) proj.remaining -= step;
            if (proj.explodeAfterTicks !== undefined) proj.explodeAfterTicks -= 1;
            nextProjectiles.push(proj);
        }
        state.projectiles = nextProjectiles;
    }

    // Respawn logic
    Object.values(state.players).forEach((p) => {
        if (p.spectator || p.disconnected) return;
        if (!p.dead && tick !== p.lastShotTick) {
            updateCAFactor(p);
        }
        if (p.pendingGuardRecoilTick && tick >= p.pendingGuardRecoilTick) {
            p.pendingGuardRecoilTick = 0;
            p.stunUntilTick = Math.max(p.stunUntilTick ?? 0, tick + Math.ceil(GUARD_RECOIL_DURATION * TICK_RATE));
            p.stunType = ZST_BLOCKED;
        }
        if (p.stunUntilTick && tick >= p.stunUntilTick) {
            p.stunUntilTick = 0;
            p.stunType = ZST_NONE;
            p.slowRatio = 1;
        }
        if (p.pendingDashTick && tick >= p.pendingDashTick) {
            p.pendingDashTick = 0;
            const dir = p.pendingDashDir ?? { x: 0, y: 0, z: 0 };
            if (dir.x || dir.y || dir.z) {
                const blastDir = normalize({ x: dir.x * 300, y: dir.y * 300, z: 1700 });
                applyKnockback(state, p, blastDir, Math.sqrt(300 * 300 + 1700 * 1700));
            }
        }
        if (p.guardStartTick && p.guardStartTick > 0) {
            const guardElapsed = (tick - p.guardStartTick) / TICK_RATE;
            if (guardElapsed > GUARD_DURATION) {
                p.guardStartTick = 0;
                p.guardCancelUntilTick = tick + Math.ceil(0.2 * TICK_RATE);
            }
        }
        if (p.dead && tick >= p.respawnTick) {
            p.dead = false;
            p.health = p.maxHealth;
            p.ap = p.maxAp;
            p.pos = getSpawnPos(state, p);
            p.rot = { x: 0, y: 0, z: 0 };
                dispatcher.broadcastMessage(
                    OpCode.S_PLAYER_RESPAWN,
                    JSON.stringify(wrapPayload({ userId: p.presence.userId, pos: p.pos })),
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

    // World item respawn + pickup
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
            if (dist3(p.pos, item.pos) > WORLD_ITEM_PICKUP_RADIUS) continue;
            if (applyWorldItemToPlayer(dispatcher, p, item)) {
                item.active = false;
                if (item.oneShot || item.respawnSec <= 0) {
                    state.worldItems.splice(i, 1);
                } else {
                    item.respawnTick = tick + Math.ceil(item.respawnSec * TICK_RATE);
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
            if (dist3(zone.pos, p.pos) > zone.radius) continue;
            if (zone.kind === "tear") {
                p.slowUntilTick = Math.max(p.slowUntilTick ?? 0, tick + 10);
                p.slowRatio = Math.min(p.slowRatio ?? 1, 0.7);
                p.poisonDamage = Math.max(p.poisonDamage ?? 1, 1);
                p.poisonUntilTick = Math.max(p.poisonUntilTick ?? 0, tick + 40);
            }
        }
    }

    // NPC AI (quest)
    for (const npc of Object.values(state.npcs)) {
        if (npc.dead) continue;
        const targetInfo = pickNearestPlayer(state, npc.pos);
        if (!targetInfo || targetInfo.dist > NPC_TARGET_RANGE) continue;
        const target = targetInfo.player;

        if (targetInfo.dist > npc.attackRange) {
            const step = npc.speed * NPC_MOVE_SPEED_SCALE;
            const nextPos = moveTowards(npc.pos, target.pos, step);
            const collision = getMapCollision(state.stage.mapId);
            if (!isBlockedMovement(collision, npc.pos, nextPos)) {
                npc.pos = nextPos;
            }
            continue;
        }

        const collision = getMapCollision(state.stage.mapId);
        // Try skill first
        let usedSkill = false;
        for (const skillId of npc.skills) {
            const skill = getSkillTemplate(skillId);
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
                    if (dist3(npc.pos, p.pos) > radius) continue;
                    const pPos = { x: p.pos.x, y: p.pos.y, z: p.pos.z + 80 };
                    if (collision && raycastCollision(collision, npc.pos, pPos)) continue;
                    const dmg = applySkillDamage(p, p, Number(skill.mod?.damage || 0), Number(skill.resisttype || 0));
                    if (skill.mod?.root || skill.mod?.antimotion) {
                        const durationMs = Number(skill.effecttime || 0);
                        if (durationMs > 0) {
                            const durationTicks = Math.ceil(durationMs / 50);
                            p.stunUntilTick = Math.max(p.stunUntilTick ?? 0, tick + durationTicks);
                            p.stunType = ZST_LOOP;
                            p.slowUntilTick = Math.max(p.slowUntilTick ?? 0, tick + durationTicks);
                            p.slowRatio = 0;
                        }
                    }
                    dispatcher.broadcastMessage(
                        OpCode.S_PLAYER_DAMAGE,
                        JSON.stringify(wrapPayload({
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

            // Single target skill
            const targetPos = { x: target.pos.x, y: target.pos.y, z: target.pos.z + 80 };
            if (collision && raycastCollision(collision, npc.pos, targetPos)) break;
            const dmg = applySkillDamage(target, target, Number(skill.mod?.damage || 0), Number(skill.resisttype || 0));
            if (skill.mod?.root || skill.mod?.antimotion) {
                const durationMs = Number(skill.effecttime || 0);
                if (durationMs > 0) {
                    const durationTicks = Math.ceil(durationMs / 50);
                    target.stunUntilTick = Math.max(target.stunUntilTick ?? 0, tick + durationTicks);
                    target.stunType = ZST_LOOP;
                    target.slowUntilTick = Math.max(target.slowUntilTick ?? 0, tick + durationTicks);
                    target.slowRatio = 0;
                }
            }
            dispatcher.broadcastMessage(
                OpCode.S_PLAYER_DAMAGE,
                JSON.stringify(wrapPayload({
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
                handlePlayerDeath(dispatcher, state, target, null, tick);
            }
            break;
        }

        if (usedSkill) continue;
        if (tick < npc.nextAttackTick) continue;
        npc.nextAttackTick = tick + NPC_ATTACK_COOLDOWN_TICKS;
        const targetPos = { x: target.pos.x, y: target.pos.y, z: target.pos.z + 80 };
        if (collision && raycastCollision(collision, npc.pos, targetPos)) continue;
        const item = getItemData(String(npc.weaponItemId)) as any;
        const damage = Number(item?.damage || 5);
        const piercing = getPiercingRatio("dagger", false);
        applyDamage(target, target, damage, piercing);
        dispatcher.broadcastMessage(
            OpCode.S_PLAYER_DAMAGE,
            JSON.stringify(wrapPayload({
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
            handlePlayerDeath(dispatcher, state, target, null, tick);
        }
    }

    // Quest progression
    if (state.quest && !state.quest.completed) {
        if (state.quest.stageTransitionTick && state.quest.stageTransitionTick > 0) {
            if (tick >= state.quest.stageTransitionTick) {
                state.quest.stageTransitionTick = 0;
                const nextIndex = state.quest.stageIndex + 1;
                if (state.quest.mode === "scenario" && state.quest.sectors) {
                    if (nextIndex < state.quest.sectors.length) {
                        state.quest.stageIndex = nextIndex;
                        state.npcs = buildScenarioNpcs(state.quest.sectors[nextIndex], state.stage.mapId);
                        broadcastNpcSpawn(dispatcher, state.npcs);
                    } else {
                        state.quest.completed = true;
                        const bounty = Number(state.quest.scenarioBp ?? 0);
                        const xp = Number(state.quest.scenarioXp ?? 0);
                        for (const p of Object.values(state.players)) {
                            if (p.spectator || p.disconnected) continue;
                            if (bounty > 0) nk.walletUpdate(p.presence.userId, { bounty }, { action: "quest_reward", scenario: state.quest.scenarioTitle ?? "" }, true);
                            if (xp > 0) updateActiveCharXp(nk, p.presence.userId, xp);
                        }
                        endRound(dispatcher, state, "quest_clear");
                    }
                } else {
                    const quest = getQuestByMap(state.stage.mapId);
                    if (quest?.stages) {
                        if (nextIndex < quest.stages.length) {
                            state.quest.stageIndex = nextIndex;
                            state.npcs = buildQuestNpcs(quest, nextIndex, state.stage.mapId);
                            broadcastNpcSpawn(dispatcher, state.npcs);
                        } else {
                            state.quest.completed = true;
                            awardQuestRewards(nk, state, quest);
                            endRound(dispatcher, state, "quest_clear");
                        }
                    }
                }
            }
        } else {
            const allDead = Object.values(state.npcs).length > 0 && Object.values(state.npcs).every(n => n.dead);
            if (allDead) {
                state.quest.stageTransitionTick = tick + (5 * TICK_RATE);
                for (const p of Object.values(state.players)) {
                    if (p.dead) {
                        p.dead = false;
                        p.health = p.maxHealth;
                        p.ap = p.maxAp;
                        p.pos = getSpawnPos(state, p);
                        dispatcher.broadcastMessage(
                            OpCode.S_PLAYER_RESPAWN,
                            JSON.stringify(wrapPayload({ userId: p.presence.userId, pos: p.pos })),
                            null,
                            null,
                            true
                        );
                    }
                }
                dispatcher.broadcastMessage(OpCode.C_ROOM_CHAT, JSON.stringify(wrapPayload({ userId: "system", username: "SERVER", message: "STAGE CLEAR! Prepare-se para a proxima fase..." })), null, null, true);
            }
        }
    }

    const broadcastData = {
        players: state.players,
        tick
    };
    dispatcher.broadcastMessage(OpCode.HEARTBEAT, JSON.stringify(wrapPayload(broadcastData)));
    broadcastMatchState(dispatcher, state, tick);

    return { state };
};

export const matchTerminate: nkruntime.MatchTerminateFunction = (ctx, logger, nk, dispatcher, tick, state, graceSeconds) => {
    return { state };
};

const assignAssassinationVips = (state: MatchState) => {
    for (const player of Object.values(state.players)) {
        player.isVip = false;
    }
    if (state.stage.mode !== "assassination") return;
    const redPlayers = Object.values(state.players).filter(p => !p.spectator && !p.disconnected && p.team === TEAM_RED);
    const bluePlayers = Object.values(state.players).filter(p => !p.spectator && !p.disconnected && p.team === TEAM_BLUE);
    if (redPlayers.length > 0) {
        const vip = redPlayers[Math.floor(Math.random() * redPlayers.length)];
        vip.isVip = true;
    }
    if (bluePlayers.length > 0) {
        const vip = bluePlayers[Math.floor(Math.random() * bluePlayers.length)];
        vip.isVip = true;
    }
};

export const matchSignal: nkruntime.MatchSignalFunction = (ctx, logger, nk, dispatcher, tick, state: MatchState, data) => {
    let input: any = {};
    try {
        input = data ? JSON.parse(data) : {};
    } catch {
        input = {};
    }

    const op = input?.op;
    if (op === "get_state") {
        return { state, data: JSON.stringify({ stage: state.stage, players: state.players, score: state.score, worldItems: state.worldItems, npcs: state.npcs, projectiles: state.projectiles, smokeZones: state.smokeZones }) };
    }

    if (op === "check_join") {
        const ok = !state.stage.password || state.stage.password === (input?.password ?? "");
        return { state, data: JSON.stringify({ ok }) };
    }

    if (op === "set_ready") {
        const userId = input?.userId;
        const ready = !!input?.ready;
        const player = Object.values(state.players).find(p => p.presence.userId === userId);
        if (player && !player.spectator && !player.disconnected) {
            player.ready = ready;
            broadcastReadyState(dispatcher, state);
        }
        return { state, data: JSON.stringify({ ok: true }) };
    }

    if (op === "set_team") {
        const userId = input?.userId;
        const team = typeof input?.team === "number" ? input.team : 0;
        const player = Object.values(state.players).find(p => p.presence.userId === userId);
        if (player && !player.spectator && !player.disconnected) {
            player.team = team;
            broadcastRoomUpdate(dispatcher, state);
        }
        return { state, data: JSON.stringify({ ok: true }) };
    }

    if (op === "update_stage") {
        if (state.stage.masterUserId && input?.userId !== state.stage.masterUserId) {
            return { state, data: JSON.stringify({ ok: false, reason: "not_master" }) };
        }
        const prevMapId = state.stage.mapId;
        const prevTeamMode = !!state.stage.teamMode;
        state.stage.name = input?.name ?? state.stage.name;
        state.stage.mapId = typeof input?.mapId === "number" ? input.mapId : state.stage.mapId;
        state.stage.mode = input?.mode ?? state.stage.mode;
        state.stage.gameTypeId = typeof input?.gameTypeId === "number" ? input.gameTypeId : state.stage.gameTypeId;
        state.stage.maxPlayers = typeof input?.maxPlayers === "number" ? input.maxPlayers : state.stage.maxPlayers;
        state.stage.roundLimit = typeof input?.roundLimit === "number" ? input.roundLimit : state.stage.roundLimit;
        state.stage.timeLimitSec = typeof input?.timeLimitSec === "number" ? input.timeLimitSec : state.stage.timeLimitSec;
        if (typeof input?.password === "string") state.stage.password = input.password;
        if (typeof input?.teamMode === "boolean") state.stage.teamMode = input.teamMode;
        if (typeof input?.channelRule === "string") state.stage.channelRule = input.channelRule;
        if (state.stage.mapId !== prevMapId || !!state.stage.teamMode !== prevTeamMode) {
            state.worldItems = getWorldItemSpawns(state.stage.mapId, !!state.stage.teamMode).map((entry: any, idx: number) => {
                const desc = getWorldItemDesc(entry.item) || {};
                const respawnSec = Number.isFinite(entry.timeSec) && entry.timeSec > 0
                    ? entry.timeSec
                    : (Number.isFinite(desc.time) ? Number(desc.time) / 1000 : 30);
                return {
                    id: `${state.stage.mapId}-${idx}-${entry.item}`,
                    name: entry.item,
                    type: String(desc.type ?? "unknown"),
                    amount: Number.isFinite(desc.amount) ? Number(desc.amount) : 0,
                    pos: entry.pos ?? { x: 0, y: 0, z: 0 },
                    active: true,
                    respawnTick: 0,
                    respawnSec
                };
            });
            state.projectiles = [];
        }
        broadcastRoomUpdate(dispatcher, state);
        return { state, data: JSON.stringify({ ok: true }) };
    }

    if (op === "start") {
        if (state.stage.masterUserId && input?.userId !== state.stage.masterUserId) {
            return { state, data: JSON.stringify({ ok: false, reason: "not_master" }) };
        }
        const activePlayers = Object.values(state.players).filter(isActivePlayer);
        const allReady = activePlayers.length > 0 && activePlayers.every(p => p.ready);
        if (!allReady) {
            return { state, data: JSON.stringify({ ok: false, reason: "not_ready" }) };
        }
        if (state.stage.roundLimit > 0 && state.stage.round >= state.stage.roundLimit) {
            return { state, data: JSON.stringify({ ok: false, reason: "round_limit" }) };
        }
        state.stage.started = true;
        state.stage.round += 1;
        state.stage.roundStartTick = tick;
        state.stage.roundEndTick = state.stage.timeLimitSec > 0 ? tick + Math.ceil(state.stage.timeLimitSec * TICK_RATE) : 0;
        state.score = { red: 0, blue: 0 };
        assignAssassinationVips(state);
        dispatcher.broadcastMessage(OpCode.S_MATCH_START, JSON.stringify(wrapPayload({ round: state.stage.round })), null, null, true);

        return { state, data: JSON.stringify({ ok: true }) };
    }

    if (op === "end") {
        if (state.stage.masterUserId && input?.userId !== state.stage.masterUserId) {
            return { state, data: JSON.stringify({ ok: false, reason: "not_master" }) };
        }
        state.stage.started = false;
        state.stage.roundEndTick = 0;
        dispatcher.broadcastMessage(OpCode.S_MATCH_END, JSON.stringify(wrapPayload({ round: state.stage.round })), null, null, true);
        return { state, data: JSON.stringify({ ok: true }) };
    }

    if (op === "chat") {
        const message = String(input?.message ?? "");
        const userId = input?.userId ?? "";

        if (message.startsWith("/") && userId) {
            const parts = message.substring(1).split(" ");
            const cmd = parts[0].toLowerCase();
            const args = parts.slice(1);

            const accounts = nk.accountsGetId([userId]);
            const account = accounts.length > 0 ? accounts[0] : null;
            const role = (account?.user?.metadata as any)?.role ?? "player";
            const isAdmin = role === "admin" || role === "developer";

            if (isAdmin) {
                if (cmd === "kick" && args.length > 0) {
                    const targetName = args[0];
                    const target = Object.values(state.players).find(p => p.presence.username === targetName);
                    if (target) {
                        dispatcher.matchKick([target.presence]);
                        return { state, data: JSON.stringify({ ok: true }) };
                    }
                }
                if (cmd === "announce") {
                    dispatcher.broadcastMessage(
                        OpCode.C_ROOM_CHAT,
                        JSON.stringify(wrapPayload({
                            userId: "system",
                            username: "ANNOUNCEMENT",
                            message: args.join(" ")
                        })),
                        null,
                        null,
                        true
                    );
                    return { state, data: JSON.stringify({ ok: true }) };
                }
            }
        }

        dispatcher.broadcastMessage(
            OpCode.C_ROOM_CHAT,
            JSON.stringify(wrapPayload({
                userId: input?.userId ?? "",
                username: input?.username ?? "",
                message: input?.message ?? ""
            })),
            null,
            null,
            true
        );
        return { state, data: JSON.stringify({ ok: true }) };
    }

    return { state, data };
};
