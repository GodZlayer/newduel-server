import type { Vec2, Vec3 } from "./types";

export const normalize = (v: Vec3): Vec3 => {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (!len) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
};

export const dot = (a: Vec3, b: Vec3): number =>
    a.x * b.x + a.y * b.y + a.z * b.z;

export const cross = (a: Vec3, b: Vec3): Vec3 => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
});

export const dist3 = (a: Vec3, b: Vec3): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const dist2 = (a: Vec2, b: Vec2): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};

export const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));
