import { cross, dist3, dot, normalize } from "./math";
import type { PlayerState, Vec3 } from "./types";
import { getMeleeMotionTable } from "../data_manager";

export const reflect = (v: Vec3, n: Vec3) => {
    const d = dot(v, n);
    return {
        x: v.x - 2 * d * n.x,
        y: v.y - 2 * d * n.y,
        z: v.z - 2 * d * n.z
    };
};

export const createMt19937 = (seed: number) => {
    const mt = new Array<number>(624);
    let index = 624;
    mt[0] = seed >>> 0;
    for (let i = 1; i < 624; i++) {
        const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
        mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    const twist = () => {
        for (let i = 0; i < 624; i++) {
            const y = (mt[i] & 0x80000000) + (mt[(i + 1) % 624] & 0x7fffffff);
            let v = mt[(i + 397) % 624] ^ (y >>> 1);
            if (y % 2 !== 0) v ^= 0x9908b0df;
            mt[i] = v >>> 0;
        }
        index = 0;
    };
    return () => {
        if (index >= 624) twist();
        let y = mt[index++];
        y ^= y >>> 11;
        y ^= (y << 7) & 0x9d2c5680;
        y ^= (y << 15) & 0xefc60000;
        y ^= y >>> 18;
        return (y >>> 0) / 4294967296;
    };
};

const rotateAroundAxis = (v: Vec3, axis: Vec3, angle: number) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dotVA = v.x * axis.x + v.y * axis.y + v.z * axis.z;
    return {
        x: v.x * cos + (axis.y * v.z - axis.z * v.y) * sin + axis.x * dotVA * (1 - cos),
        y: v.y * cos + (axis.z * v.x - axis.x * v.z) * sin + axis.y * dotVA * (1 - cos),
        z: v.z * cos + (axis.x * v.y - axis.y * v.x) * sin + axis.z * dotVA * (1 - cos)
    };
};

export const getSpreadDir = (dir: Vec3, maxSpread: number, rng: () => number) => {
    const force = rng() * maxSpread;
    const right = normalize(cross(dir, { x: 0, y: 0, z: 1 }));
    let ret = rotateAroundAxis(dir, right, force);
    const angle = rng() * Math.PI * 2;
    ret = rotateAroundAxis(ret, dir, angle);
    return normalize(ret);
};

export const rayCylinderHit = (
    origin: Vec3,
    dir: Vec3,
    foot: Vec3,
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

export const distancePointToSegment = (p: Vec3, a: Vec3, b: Vec3) => {
    const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const ap = { x: p.x - a.x, y: p.y - a.y, z: p.z - a.z };
    const abLenSq = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
    if (abLenSq <= 0) return dist3(p, a);
    const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y + ap.z * ab.z) / abLenSq));
    const closest = { x: a.x + ab.x * t, y: a.y + ab.y * t, z: a.z + ab.z * t };
    return dist3(p, closest);
};

const closestPointOnSegment = (p: Vec3, a: Vec3, b: Vec3) => {
    const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const ap = { x: p.x - a.x, y: p.y - a.y, z: p.z - a.z };
    const abLenSq = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
    if (abLenSq <= 0) return a;
    const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y + ap.z * ab.z) / abLenSq));
    return { x: a.x + ab.x * t, y: a.y + ab.y * t, z: a.z + ab.z * t };
};

export const distanceLineSegment = (p: Vec3, a: Vec3, b: Vec3) =>
    dist3(closestPointOnSegment(p, a, b), p);

const distanceBetweenLineSegments = (a: Vec3, aa: Vec3, c: Vec3, cc: Vec3) => {
    const b = { x: aa.x - a.x, y: aa.y - a.y, z: aa.z - a.z };
    const d = { x: cc.x - c.x, y: cc.y - c.y, z: cc.z - c.z };
    let cm = cross(b, d);
    const cmMag = Math.sqrt(cm.x * cm.x + cm.y * cm.y + cm.z * cm.z);
    let ap = a;
    let cp = c;

    if (cmMag < 1) {
        const edge = { x: a.x - c.x, y: a.y - c.y, z: a.z - c.z };
        const dMag = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z) || 1;
        const temp = dot(edge, d) / dMag;
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
        } else if (st0 >= 0 && st0 <= 1) {
            ap = a;
            cp = { x: c.x + st0 * d.x, y: c.y + st0 * d.y, z: c.z + st0 * d.z };
        } else if (st1 >= 0 && st1 <= 1) {
            ap = aa;
            cp = { x: c.x + st1 * d.x, y: c.y + st1 * d.y, z: c.z + st1 * d.z };
        } else {
            cp = c;
            ap = { x: cp.x - x.x, y: cp.y - x.y, z: cp.z - x.z };
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

export const playerHitTest = (head: Vec3, foot: Vec3, src: Vec3, dest: Vec3) => {
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

export const getPiercingRatio = (weaponType: string, isHead: boolean) => {
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

export const normalizeWeaponType = (weaponType: string) => {
    switch (weaponType) {
        case "frag":
            return "fragmentation";
        default:
            return weaponType;
    }
};

export const applyDamage = (target: PlayerState, attacker: PlayerState | null, damage: number, piercingRatio: number) => {
    void attacker;
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

export const getResistRatio = (player: PlayerState, resistType: number) => {
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
    return Math.max(0, Math.min(resist / 100, 0.8));
};

export const getMeleeMotionParams = (motion?: string) => {
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
