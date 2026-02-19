import type { MatchState, NpcState, PlayerState } from "./types";

type LoopInputMessage = {
    presence: nkruntime.Presence;
    data: any;
    opCode: number;
};

type LoopInputDeps = {
    opCode: Record<string, number>;
    [key: string]: any;
};

export const runLoopInputPhase = (
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    state: MatchState,
    tick: number,
    msgList: LoopInputMessage[],
    deps: LoopInputDeps
) => {
    const OpCode = deps.opCode;

    const parseEnvelope = deps.parseEnvelope;
    const isVec3 = deps.isVec3;
    const getWeaponInfo = deps.getWeaponInfo;
    const isMeleeWeaponType = deps.isMeleeWeaponType;
    const isGuardNonrecoilable = deps.isGuardNonrecoilable;
    const isLowerState = deps.isLowerState;
    const isWallRunState = deps.isWallRunState;
    const isWallJumpState = deps.isWallJumpState;
    const isWallJump2State = deps.isWallJump2State;
    const isTumbleState = deps.isTumbleState;
    const getWallJumpDirFromAnim = deps.getWallJumpDirFromAnim;
    const dist3 = deps.dist3;
    const getMaxMoveSpeedForAnim = deps.getMaxMoveSpeedForAnim;
    const getMoveDeltaLimit = deps.getMoveDeltaLimit;
    const getMapCollision = deps.getMapCollision;
    const getFloorDistance = deps.getFloorDistance;
    const dist2 = deps.dist2;
    const normalize = deps.normalize;
    const isNearWall = deps.isNearWall;
    const adjustMoveAgainstCollision = deps.adjustMoveAgainstCollision;
    const checkSolidCylinder = deps.checkSolidCylinder;
    const selectWeaponId = deps.selectWeaponId;
    const getWeaponCooldownTicks = deps.getWeaponCooldownTicks;
    const ensureAmmoState = deps.ensureAmmoState;
    const getWeaponCAFBase = deps.getWeaponCAFBase;
    const getHitboxProfile = deps.getHitboxProfile;
    const getMeleeMotionParams = deps.getMeleeMotionParams;
    const checkWallBetween = deps.checkWallBetween;
    const isGuarding = deps.isGuarding;
    const dot = deps.dot;
    const isGuardingRecoilable = deps.isGuardingRecoilable;
    const getPiercingRatio = deps.getPiercingRatio;
    const applyDamage = deps.applyDamage;
    const applyEnchantEffects = deps.applyEnchantEffects;
    const applyKnockback = deps.applyKnockback;
    const getKnockbackForce = deps.getKnockbackForce;
    const damageNpc = deps.damageNpc;
    const distanceLineSegment = deps.distanceLineSegment;
    const getProjectileSpeed = deps.getProjectileSpeed;
    const createMt19937 = deps.createMt19937;
    const nowMs = deps.nowMs;
    const getSpreadDir = deps.getSpreadDir;
    const calcShotDir = deps.calcShotDir;
    const playerHitTest = deps.playerHitTest;
    const handlePlayerDeath = deps.handlePlayerDeath;
    const broadcastReadyState = deps.broadcastReadyState;
    const broadcastRoomUpdate = deps.broadcastRoomUpdate;
    const getServerFeatureFlags = deps.getServerFeatureFlags;
    const wrapPayload = deps.wrapPayload;
    const rayCylinderHit = deps.rayCylinderHit;
    const getItemData = deps.getItemData;
    const getStunTypeForMelee = deps.getStunTypeForMelee;

    const TICK_RATE = deps.TICK_RATE;
    const TICK_DT = deps.TICK_DT;
    const AIR_MOVE = deps.AIR_MOVE;
    const ACCEL_SPEED = deps.ACCEL_SPEED;
    const PLAYER_RADIUS = deps.PLAYER_RADIUS;
    const PLAYER_HEIGHT = deps.PLAYER_HEIGHT;
    const TUMBLE_DELAY_TIME = deps.TUMBLE_DELAY_TIME;
    const JUMP_QUEUE_TIME = deps.JUMP_QUEUE_TIME;
    const WALL_JUMP_TIME_FRONT = deps.WALL_JUMP_TIME_FRONT;
    const WALL_JUMP_TIME_SIDE = deps.WALL_JUMP_TIME_SIDE;
    const WALL_JUMP2_TIME_FRONT = deps.WALL_JUMP2_TIME_FRONT;
    const WALL_JUMP2_TIME_SIDE = deps.WALL_JUMP2_TIME_SIDE;
    const ZC_STATE_LOWER_JUMP_UP = deps.ZC_STATE_LOWER_JUMP_UP;
    const ZC_STATE_LOWER_JUMP_DOWN = deps.ZC_STATE_LOWER_JUMP_DOWN;
    const JUMP_VELOCITY = deps.JUMP_VELOCITY;
    const JUMP2_VELOCITY = deps.JUMP2_VELOCITY;
    const WALL_JUMP_VELOCITY = deps.WALL_JUMP_VELOCITY;
    const WALL_JUMP2_VELOCITY = deps.WALL_JUMP2_VELOCITY;
    const ZC_STATE_LOWER_RUN_WALL_LEFT_DOWN = deps.ZC_STATE_LOWER_RUN_WALL_LEFT_DOWN;
    const ZC_STATE_LOWER_RUN_WALL_RIGHT_DOWN = deps.ZC_STATE_LOWER_RUN_WALL_RIGHT_DOWN;
    const MAX_ATTACK_RANGE = deps.MAX_ATTACK_RANGE;
    const DEFAULT_DAMAGE = deps.DEFAULT_DAMAGE;
    const DEFAULT_DELAY_MS = deps.DEFAULT_DELAY_MS;
    const AIM_CONE_DOT = deps.AIM_CONE_DOT;
    const TEAM_RED = deps.TEAM_RED;
    const TEAM_BLUE = deps.TEAM_BLUE;
    const SHOTGUN_PELLETS = deps.SHOTGUN_PELLETS;
    const SHOTGUN_DIFFUSE_RANGE = deps.SHOTGUN_DIFFUSE_RANGE;
    const MAX_SPEED = deps.MAX_SPEED;
    const GUARD_DURATION = deps.GUARD_DURATION;
    const GUARD_RECOIL_DURATION = deps.GUARD_RECOIL_DURATION;
    const COUNTER_CHARGED_TIME = deps.COUNTER_CHARGED_TIME;
    const GUARD_RECOIL_DELAY = deps.GUARD_RECOIL_DELAY;
    const FLASHBANG_DURATION_TICKS = deps.FLASHBANG_DURATION_TICKS;
    const SMOKE_DURATION_TICKS = deps.SMOKE_DURATION_TICKS;
    const ZC_SKILL_UPPERCUT = deps.ZC_SKILL_UPPERCUT;
    const ZC_SKILL_SPLASHSHOT = deps.ZC_SKILL_SPLASHSHOT;
    const ZC_SKILL_DASH = deps.ZC_SKILL_DASH;
    const ZC_SKILL_CHARGEDSHOT = deps.ZC_SKILL_CHARGEDSHOT;
    const ZC_STATE_LOWER_UPPERCUT = deps.ZC_STATE_LOWER_UPPERCUT;
    const CHARGED_TIME = deps.CHARGED_TIME;
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
                {
                    const flags = getServerFeatureFlags(nk);
                    const providedRecipeHash = typeof payload?.recipeHash === "string" ? payload.recipeHash : "";
                    const providedContentHash = typeof payload?.contentHash === "string" ? payload.contentHash : "";
                    const expectedRecipeHash = state.stage.recipeHash ?? "";
                    const expectedContentHash = state.stage.contentHash ?? "";

                    if (flags.enforceRecipeHash) {
                        const recipeMismatch = !!expectedRecipeHash && providedRecipeHash !== expectedRecipeHash;
                        const contentMismatch = !!expectedContentHash && providedContentHash !== expectedContentHash;
                        if (recipeMismatch || contentMismatch) {
                            player.loaded = false;
                            dispatcher.broadcastMessage(
                                OpCode.S_MATCH_ERROR,
                                JSON.stringify(wrapPayload({
                                    code: "CONTENT_HASH_MISMATCH",
                                    detail: "Client recipe/content hash mismatch."
                                })),
                                [msg.presence],
                                null,
                                true
                            );
                            break;
                        }
                    }

                    player.loaded = true;
                    broadcastRoomUpdate(dispatcher, state);
                }
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
};
