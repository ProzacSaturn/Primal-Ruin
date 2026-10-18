export function calculateUnitCombatStrength({
    line,
    supportCount,
    supportBonusPerUnit = 1,
    supportBonusCap = 3,
    collectiveCount,
    fewerUnits,
    logorare,
    ferocityBonus = 1
}) {
    if (!line) return 0;
    const supportBonus = Math.min(
        supportBonusCap,
        Math.max(0, supportCount) * supportBonusPerUnit
    );
    const collectiveBonus = line.keywords.includes('Mente Collettiva')
        ? Math.min(3, Math.max(0, collectiveCount - 1))
        : 0;
    const ferocity = line.keywords.includes('Ferocia') && fewerUnits ? ferocityBonus : 0;
    return Math.max(
        0,
        line.currentForce + supportBonus + collectiveBonus + ferocity - Math.max(0, logorare)
    );
}

export function compareCombatStrengths(left, right) {
    if (left === right) return { result: 'tie', margin: 0 };
    return left > right
        ? { result: 'left-wins', margin: left - right }
        : { result: 'right-wins', margin: right - left };
}

export function shouldUseTorment({ commanderPc, madness, commanderDamage, torment }) {
    const winsWithDamage = commanderPc <= commanderDamage;
    const winsWithMadness = madness + torment >= 10;
    if (winsWithDamage || winsWithMadness) {
        return winsWithMadness && !winsWithDamage;
    }
    const damageProgress = commanderDamage / Math.max(1, commanderPc);
    const madnessProgress = torment / Math.max(1, 10 - madness);
    return madnessProgress > damageProgress;
}

// Scelta deterministica (per l'avversario automatico) di quale Supporto promuovere a
// Linea quando la Linea viene distrutta: preferisce la Forza più alta e, a parità,
// resta su "supA". Ritorna null se non c'è alcun Supporto da promuovere.
export function defaultPromotionSlot(front) {
    const supports = ['supA', 'supB'].filter(slot => front?.[slot]);
    if (supports.length === 0) return null;
    return supports.reduce((best, slot) =>
        front[slot].currentForce > front[best].currentForce ? slot : best
    );
}

export function checkDeployment(unit, front, slotName, {
    ownSites = [],
    opposingSites = []
} = {}) {
    if (!front || !['line', 'supA', 'supB'].includes(slotName)) {
        return { legal: false, assaultSwap: false };
    }
    const assault = unit.keywords.includes('Assalto');
    const defensive = unit.keywords.includes('Posizione Difensiva');
    const assaultSwap = slotName === 'line' && assault && Boolean(front.line) &&
        (!front.supA || !front.supB);
    const lineRestricted = slotName === 'line' && (
        opposingSites.some(site => site.catalogId === 'set-1-105') ||
        (Number(unit.force) <= 3 &&
            opposingSites.some(site => site.catalogId === 'set-2-094')) ||
        (assaultSwap && !ownSites.some(site => site.catalogId === 'set-1-098')) ||
        (assaultSwap && opposingSites.some(site => site.catalogId === 'set-3-094'))
    );
    if (lineRestricted) return { legal: false, assaultSwap: false };
    if (front[slotName] && !assaultSwap) return { legal: false, assaultSwap: false };
    if (defensive && slotName !== 'line' && !front.line) {
        return { legal: false, assaultSwap: false };
    }
    if (slotName === 'line' && !assault &&
        !(defensive && !front.line)) {
        return { legal: false, assaultSwap: false };
    }
    return { legal: true, assaultSwap };
}
