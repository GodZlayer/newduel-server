export enum CharItemPart {
    HEAD = 0,
    CHEST = 1,
    HANDS = 2,
    LEGS = 3,
    FEET = 4,
    FINGERL = 5,
    FINGERR = 6,
    MELEE = 7,
    PRIMARY = 8,
    SECONDARY = 9,
    CUSTOM1 = 10,
    CUSTOM2 = 11,
}

export const CHAR_ITEM_PARTS = {
    HEAD: { id: CharItemPart.HEAD, slot: "head" },
    CHEST: { id: CharItemPart.CHEST, slot: "chest" },
    HANDS: { id: CharItemPart.HANDS, slot: "hands" },
    LEGS: { id: CharItemPart.LEGS, slot: "legs" },
    FEET: { id: CharItemPart.FEET, slot: "feet" },
    FINGERL: { id: CharItemPart.FINGERL, slot: "fingerl" },
    FINGERR: { id: CharItemPart.FINGERR, slot: "fingerr" },
    MELEE: { id: CharItemPart.MELEE, slot: "melee" },
    PRIMARY: { id: CharItemPart.PRIMARY, slot: "primary" },
    SECONDARY: { id: CharItemPart.SECONDARY, slot: "secondary" },
    CUSTOM1: { id: CharItemPart.CUSTOM1, slot: "item1" },
    CUSTOM2: { id: CharItemPart.CUSTOM2, slot: "item2" },
} as const;

export const CHAR_ITEM_PART_SLOTS: ReadonlyArray<string> = [
    "head",
    "chest",
    "hands",
    "legs",
    "feet",
    "fingerl",
    "fingerr",
    "melee",
    "primary",
    "secondary",
    "item1",
    "item2",
];
