export const DOT_TICK_INTERVAL = 20;

export const NEED_EXP_LM: Record<number, number> = {
    1: 1.0, 21: 1.1, 31: 1.2, 41: 1.4, 46: 1.6, 
    51: 1.8, 56: 2.0, 61: 4.0, 66: 8.0, 71: 12.0, 
    76: 16.0, 81: 20.0, 86: 20.0, 91: 40.0, 96: 40.0
};

export const getLevelMultiplier = (level: number): number => {
    const keys = Object.keys(NEED_EXP_LM).map(Number).sort((a, b) => b - a);
    for (const key of keys) {
        if (level >= key) return NEED_EXP_LM[key];
    }
    return 1.0;
};

/**
 * Retorna o XP TOTAL necessário para atingir o nível especificado.
 */
export const getXpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    if (level > 99) return getXpForLevel(99);
    
    // Fórmula de paridade GunZ aproximada:
    // O XP necessário cresce quadraticamente, multiplicado pelo LM da tabela.
    const multiplier = getLevelMultiplier(level);
    const base = 50 * Math.pow(level - 1, 2) * multiplier;
    return Math.floor(base);
};

/**
 * Calcula o nível baseado no XP acumulado.
 */
export const getLevelFromXp = (xp: number): number => {
    if (xp <= 0) return 1;
    for (let l = 99; l >= 1; l--) {
        if (xp >= getXpForLevel(l)) return l;
    }
    return 1;
};

/**
 * Retorna a porcentagem de progresso para o próximo nível (0-100).
 */
export const getLevelProgress = (xp: number): number => {
    const currentLevel = getLevelFromXp(xp);
    if (currentLevel >= 99) return 100;
    
    const xpCurrentLevel = getXpForLevel(currentLevel);
    const xpNextLevel = getXpForLevel(currentLevel + 1);
    
    const progress = ((xp - xpCurrentLevel) / (xpNextLevel - xpCurrentLevel)) * 100;
    return Math.max(0, Math.min(100, progress));
};
