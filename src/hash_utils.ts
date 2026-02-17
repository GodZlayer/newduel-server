const stableStringifyInner = (value: any): string => {
    if (value === null || value === undefined) return "null";

    const valueType = typeof value;
    if (valueType === "number") {
        return Number.isFinite(value) ? String(value) : "null";
    }
    if (valueType === "boolean") return value ? "true" : "false";
    if (valueType === "string") return JSON.stringify(value);

    if (Array.isArray(value)) {
        return `[${value.map(stableStringifyInner).join(",")}]`;
    }

    if (valueType === "object") {
        const keys = Object.keys(value).sort();
        const parts = keys.map((key) => `${JSON.stringify(key)}:${stableStringifyInner(value[key])}`);
        return `{${parts.join(",")}}`;
    }

    return "null";
};

export const stableStringify = (value: any): string => stableStringifyInner(value);

export const fnv1a32 = (input: string): string => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
};

export const hashObject = (value: any): string => fnv1a32(stableStringify(value));
