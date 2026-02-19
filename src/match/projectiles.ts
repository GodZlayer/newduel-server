import type { MatchState, NpcState, PlayerState, ProjectileState, Vec3 } from "./types";

type ExplosionResult = { target: PlayerState; damage: number; piercing: number };

type ProcessProjectilesArgs = {
    nk: nkruntime.Nakama;
    dispatcher: nkruntime.MatchDispatcher;
    state: MatchState;
    tick: number;
    tickRate: number;
    teamRed: number;
    teamBlue: number;
    flashbangDistance: number;
    flashbangDurationTicks: number;
    smokeDurationTicks: number;
    opCodePlayerDamage: number;
    opCodePlayerDie: number;
    wrapPayload: (payload: any) => any;
    getMapCollision: (mapId: number) => any;
    getHitboxProfile: (anim: number) => { height: number; radius: number };
    getBodyOffset: (anim: number) => number;
    getWorldItemDescByModel: (model?: string) => any;
    raycastCollision: (collision: any, origin: Vec3, target: Vec3) => boolean;
    raycastCollisionImpact: (collision: any, origin: Vec3, target: Vec3) => { dist: number; pos: Vec3; plane: { a: number; b: number; c: number } } | null;
    rayCylinderHit: (origin: Vec3, dir: Vec3, foot: Vec3, height: number, radius: number, maxDist: number) => number | null;
    normalize: (v: Vec3) => Vec3;
    reflect: (v: Vec3, n: Vec3) => Vec3;
    dist3: (a: Vec3, b: Vec3) => number;
    applyExplosion: (
        nk: nkruntime.Nakama,
        dispatcher: nkruntime.MatchDispatcher,
        state: MatchState,
        attacker: PlayerState,
        origin: Vec3,
        damage: number,
        range: number,
        minDamageRatio: number,
        knockback: number
    ) => ExplosionResult[];
    handlePlayerDeath: (
        dispatcher: nkruntime.MatchDispatcher,
        state: MatchState,
        target: PlayerState,
        attacker: PlayerState | null,
        tick: number
    ) => void;
};

export const processProjectiles = (args: ProcessProjectilesArgs) => {
    const {
        nk,
        dispatcher,
        state,
        tick,
        tickRate,
        teamRed,
        teamBlue,
        flashbangDistance,
        flashbangDurationTicks,
        smokeDurationTicks,
        opCodePlayerDamage,
        opCodePlayerDie,
        wrapPayload,
        getMapCollision,
        getHitboxProfile,
        getBodyOffset,
        getWorldItemDescByModel,
        raycastCollision,
        raycastCollisionImpact,
        rayCylinderHit,
        normalize,
        reflect,
        dist3,
        applyExplosion,
        handlePlayerDeath
    } = args;

    if (state.projectiles.length <= 0) return;

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
                    opCodePlayerDamage,
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
                    info.target.respawnTick = tick + 7 * tickRate;
                    info.target.deaths += 1;
                    owner.kills += 1;
                    if (state.stage.teamMode) {
                        if (owner.team === teamRed) state.score.red += 1;
                        if (owner.team === teamBlue) state.score.blue += 1;
                    }
                    dispatcher.broadcastMessage(
                        opCodePlayerDie,
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
            proj.vel.z -= (proj.gravity ?? 0) / tickRate;
            dir = normalize(proj.vel);
            step = Math.max(1, Math.min(Math.sqrt(proj.vel.x * proj.vel.x + proj.vel.y * proj.vel.y + proj.vel.z * proj.vel.z) / tickRate, 200));
            nextPos = {
                x: proj.pos.x + proj.vel.x / tickRate,
                y: proj.pos.y + proj.vel.y / tickRate,
                z: proj.pos.z + proj.vel.z / tickRate
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
        let hitPos: Vec3 | null = null;
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
                    if (dist > flashbangDistance) continue;
                    const pPos = { x: p.pos.x, y: p.pos.y, z: p.pos.z + getBodyOffset(p.anim) };
                    if (collision && raycastCollision(collision, impactPos, pPos)) continue;
                    p.flashUntilTick = tick + flashbangDurationTicks;
                }
            } else if (proj.kind === "smoke") {
                const isTear = proj.weaponType === "teargas" || proj.weaponType === "tear_gas";
                state.smokeZones.push({
                    id: `smoke-${tick}-${proj.id}`,
                    pos: impactPos,
                    radius: 300,
                    endTick: tick + (proj.effectDurationTicks ?? smokeDurationTicks),
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
                        opCodePlayerDamage,
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
};
