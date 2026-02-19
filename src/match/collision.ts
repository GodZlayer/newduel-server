import { cross, dist3, dot, normalize } from "./math";
import type { Vec3 } from "./types";

type Plane = { a: number; b: number; c: number; d: number };

const dotPlane = (p: Plane, v: Vec3) =>
    p.a * v.x + p.b * v.y + p.c * v.z + p.d;

const dotPlaneNormal = (p: Pick<Plane, "a" | "b" | "c">, v: Vec3) =>
    p.a * v.x + p.b * v.y + p.c * v.z;

const PICK_TOLERENCE = 0.1;
const pickSign = (x: number) => (x < -PICK_TOLERENCE ? -1 : (x > PICK_TOLERENCE ? 1 : 0));

const getIntersectionOfTwoPlanes = (plane1: Plane, plane2: Plane) => {
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

const intersectLineSegmentPlane = (plane: Plane, v0: Vec3, v1: Vec3) => {
    const dir = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
    const denom = dotPlaneNormal(plane, dir);
    if (Math.abs(denom) < 1e-6) return null;
    const t = -(plane.d + dotPlaneNormal(plane, v0)) / denom;
    if (!Number.isFinite(t)) return null;
    const tt = Math.max(0, Math.min(1, t));
    return { x: v0.x + dir.x * tt, y: v0.y + dir.y * tt, z: v0.z + dir.z * tt };
};

const isPlaneCross = (plane: Plane, v0: Vec3, v1: Vec3) => {
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
    origin: Vec3,
    target: Vec3,
    solidPlanes: Plane[],
    outList: Plane[],
    state: { impactDist: number; impact: Vec3 | null; impactPlane: Plane | null }
): boolean => {
    const node = collision.nodes[nodeIdx];
    if (!node) return false;

    const hasPos = node.pos !== -1;
    const hasNeg = node.neg !== -1;

    if (!hasPos && !hasNeg) {
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
    const plane = node.plane as Plane;
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

    const negShiftPlane = { a: plane.a, b: plane.b, c: plane.c, d: plane.d - fShift };
    if (hasNeg && isPlaneCross(negShiftPlane, origin, target)) {
        solidPlanes.push(negShiftPlane);
        if (getColPlanesRecurse(node.neg, collision, method, radius, height, origin, target, solidPlanes, outList, state)) {
            bHit = true;
        }
        solidPlanes.pop();
    }

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
    impactPlanes: Plane[],
    origin: Vec3,
    target: Vec3,
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
            } else if (fDistToOrigin * fMinProjDist < fMinDistToOrigin * fProjDist) {
                fMinProjDist = fProjDist;
                fMinDistToOrigin = fDistToOrigin;
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
    origin: Vec3,
    target: Vec3,
    radius: number,
    height: number,
    method: "sphere" | "cylinder"
) => {
    const checkwalldir = normalize({ x: target.x - origin.x, y: target.y - origin.y, z: target.z - origin.z });
    const impactPlanes: Plane[] = [];
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
            } else if (fDistToOrigin / fProjDist < fMinDistToOrigin / fMinProjDist) {
                fMinProjDist = fProjDist;
                fMinDistToOrigin = fDistToOrigin;
            }
        }

        if (!bFound) return false;

        const fInter = Math.max(0, Math.min(1, fMinDistToOrigin / fMinProjDist));
        const currentorigin = {
            x: origin.x + fInter * diff.x,
            y: origin.y + fInter * diff.y,
            z: origin.z + fInter * diff.z
        };

        const simulplanes: Plane[] = [];
        for (const p of impactPlanes) {
            if (Math.abs(dotPlane(p, currentorigin)) < 0.1) {
                simulplanes.push(p);
            }
        }

        let fBestCase = 0;
        let newtargetpos = { ...currentorigin };
        let b1Case = false;

        for (const plane of simulplanes) {
            const ni = { x: plane.a, y: plane.b, z: plane.c };
            const adjtargetpos = {
                x: target.x + ni.x * -dotPlane(plane, target),
                y: target.y + ni.y * -dotPlane(plane, target),
                z: target.z + ni.z * -dotPlane(plane, target)
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

        let b2Case = false;
        for (let i = 0; i < simulplanes.length; i++) {
            for (let j = i + 1; j < simulplanes.length; j++) {
                const intersection = getIntersectionOfTwoPlanes(simulplanes[i], simulplanes[j]);
                if (!intersection) continue;
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
        const finalImpactPlanes: Plane[] = [];
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

const raycastSolidBsp = (collision: any, origin: Vec3, target: Vec3) => {
    if (!collision?.nodes || collision.nodes.length === 0) return null;
    const impactPlanes: Plane[] = [];
    const state = { impactDist: Infinity, impact: null, impactPlane: null };
    getColPlanesRecurse(collision.root ?? 0, collision, "sphere", 0, 0, origin, target, [], impactPlanes, state);
    if (state.impactDist === Infinity) return null;
    return state;
};

export const raycastCollisionDistance = (collision: any, origin: Vec3, target: Vec3) => {
    const res = raycastSolidBsp(collision, origin, target);
    return res ? res.impactDist : null;
};

export const raycastCollision = (collision: any, origin: Vec3, target: Vec3) =>
    raycastCollisionDistance(collision, origin, target) !== null;

export const raycastCollisionImpact = (collision: any, origin: Vec3, target: Vec3) => {
    const res = raycastSolidBsp(collision, origin, target);
    if (!res) return null;
    return { dist: res.impactDist, pos: res.impact, plane: res.impactPlane };
};

export const checkWallCylinder = (collision: any, origin: Vec3, target: Vec3, radius: number, height: number) => {
    if (!collision) return { hit: false, pos: target };
    const newTarget = { ...target };
    const hit = checkWall(collision, origin, newTarget, radius, height, "cylinder");
    return { hit, pos: newTarget };
};

export const checkWallBetween = (collision: any, a: Vec3, b: Vec3) => {
    if (!collision) return false;
    const p1 = { x: a.x, y: a.y, z: a.z + 100 };
    const p2 = { x: b.x, y: b.y, z: b.z + 100 };
    return raycastCollision(collision, p1, p2);
};

export const checkSolidCylinder = (collision: any, pos: Vec3, radius: number, height: number) => {
    if (!collision) return false;
    const target = { x: pos.x, y: pos.y, z: pos.z + 0.1 };
    const impactPlanes: Plane[] = [];
    const state = { impactDist: Infinity, impact: null, impactPlane: null };
    return getColPlanesRecurse(collision.root ?? 0, collision, "cylinder", radius, height, pos, target, [], impactPlanes, state);
};

export const getFloorDistance = (collision: any, pos: Vec3) => {
    if (!collision) return null;
    const origin = { x: pos.x, y: pos.y, z: pos.z + 5 };
    const target = { x: pos.x, y: pos.y, z: pos.z - 5000 };
    return raycastCollisionDistance(collision, origin, target);
};

export const getFloorPos = (collision: any, pos: Vec3, playerHeight = 180) => {
    if (!collision) return null;
    const origin = { x: pos.x, y: pos.y, z: pos.z + 5 };
    const target = { x: pos.x, y: pos.y, z: pos.z - 10000 };
    const hit = raycastCollisionImpact(collision, origin, target);
    if (!hit) return target;
    return { x: hit.pos.x, y: hit.pos.y, z: hit.pos.z - playerHeight };
};

export const adjustMoveAgainstCollision = (collision: any, from: Vec3, to: Vec3, playerRadius = 33, playerHeight = 180) => {
    if (!collision) return { pos: to, blocked: false };
    const newTo = { ...to };
    const hit = checkWall(collision, from, newTo, playerRadius, playerHeight, "cylinder");
    return { pos: newTo, blocked: hit };
};

export const isNearWall = (collision: any, pos: Vec3, dir: Vec3, maxDist: number) => {
    if (!collision) return false;
    const norm = normalize({ x: dir.x, y: dir.y, z: 0 });
    if (!norm.x && !norm.y) return false;
    const p1 = { x: pos.x, y: pos.y, z: pos.z + 100 };
    const p2 = { x: pos.x, y: pos.y, z: pos.z + 180 };
    const t1 = { x: p1.x + norm.x * maxDist, y: p1.y + norm.y * maxDist, z: p1.z };
    const t2 = { x: p2.x + norm.x * maxDist, y: p2.y + norm.y * maxDist, z: p2.z };
    return !!(raycastCollisionDistance(collision, p1, t1) !== null && raycastCollisionDistance(collision, p2, t2) !== null);
};

export const isBlockedMovement = (
    collision: any,
    from: Vec3,
    to: Vec3,
    playerRadius = 33,
    headOffset = 170,
    bodyOffset = 100,
    legsOffset = 40
) => {
    if (!collision) return false;
    const offsets = [
        { x: 0, y: 0 },
        { x: playerRadius, y: 0 },
        { x: -playerRadius, y: 0 },
        { x: 0, y: playerRadius },
        { x: 0, y: -playerRadius }
    ];
    for (const off of offsets) {
        const legsFrom = { x: from.x + off.x, y: from.y + off.y, z: from.z + legsOffset };
        const legsTo = { x: to.x + off.x, y: to.y + off.y, z: to.z + legsOffset };
        if (raycastCollision(collision, legsFrom, legsTo)) return true;
        const bodyFrom = { x: from.x + off.x, y: from.y + off.y, z: from.z + bodyOffset };
        const bodyTo = { x: to.x + off.x, y: to.y + off.y, z: to.z + bodyOffset };
        if (raycastCollision(collision, bodyFrom, bodyTo)) return true;
        const headFrom = { x: from.x + off.x, y: from.y + off.y, z: from.z + headOffset };
        const headTo = { x: to.x + off.x, y: to.y + off.y, z: to.z + headOffset };
        if (raycastCollision(collision, headFrom, headTo)) return true;
    }
    return false;
};
