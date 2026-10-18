const FRONT_NAMES = ['left', 'center', 'right'];
const SLOTS = ['line', 'supA', 'supB'];

function cardId(card) {
    return card?.catalogId || card?.id;
}

function hasUnitCard(unit, ids) {
    return ids.includes(cardId(unit));
}

function frontHasUnit(player, frontName, ids, excludedUnit = null) {
    return SLOTS.some(slot => {
        const unit = player.fronts[frontName][slot];
        return unit && unit !== excludedUnit && hasUnitCard(unit, ids);
    });
}

export function playerUnits(player) {
    return FRONT_NAMES.flatMap(frontName =>
        SLOTS.map(slotName => ({
            frontName,
            slotName,
            unit: player.fronts[frontName][slotName]
        })).filter(entry => entry.unit)
    );
}

export function getUnitKeywords(player, unit, frontName, slotName) {
    if (!unit) return [];
    const keywords = [...(unit.keywords || [])];
    const equipment = unit.equipment;
    if (equipment) {
        const id = cardId(equipment);
        if (['set-1-083', 'set-1-090'].includes(id)) keywords.push('Ferocia');
        if (['set-1-086', 'set-3-110'].includes(id)) keywords.push('Sorvolo');
        if (['set-2-080', 'set-2-083', 'set-2-090', 'set-3-105'].includes(id)) {
            keywords.push('Logorare (1)');
        }
        if (['set-2-079', 'set-2-089'].includes(id)) keywords.push('Tormento');
    }
    if (slotName === 'line' && unit.force >= 5 &&
        player.sites?.some(site => cardId(site) === 'set-1-100')) {
        keywords.push('Ferocia');
    }
    if (player.sites?.some(site => cardId(site) === 'set-2-104') &&
        keywords.some(keyword => keyword.startsWith('Logorare'))) {
        keywords.push('Logorare (1)');
    }
    if (unit.force >= 4 && player.field?.catalogId === 'set-1-111') {
        keywords.push('Ferocia');
    }
    if (slotName === 'line' &&
        (['supA', 'supB'].some(slot =>
            hasUnitCard(player.fronts[frontName][slot], ['set-1-014'])
        ) || frontHasUnit(player, frontName, ['set-1-029'], unit) &&
            /raptor/i.test(unit.type || ''))) {
        keywords.push('Ferocia');
    }
    return [...new Set(keywords)];
}

export function getUnitForceBonus(player, unit, frontName, slotName, opponent) {
    let bonus = 0;
    const id = cardId(unit.equipment);
    const unitId = cardId(unit);
    const front = player.fronts[frontName];
    if (['set-1-079', 'set-1-084', 'set-1-090'].includes(id)) {
        bonus += id === 'set-1-079' ? 1 : 2;
    }
    if (['set-2-079', 'set-2-082', 'set-2-085'].includes(id)) bonus += 1;
    if (['set-2-083', 'set-2-086', 'set-2-087', 'set-2-089'].includes(id)) bonus += 2;
    if (['set-2-088', 'set-2-090'].includes(id)) bonus += 3;
    if (opponent && SLOTS.some(slot =>
        cardId(opponent.fronts?.[frontName]?.[slot]?.equipment) === 'set-2-082'
    )) bonus -= 1;
    if (id === 'set-1-081' && slotName === 'line') bonus += 1;
    if (id === 'set-1-087') {
        bonus += FRONT_NAMES.filter(name => name !== frontName && player.fronts[name].line).length;
    }
    if (id === 'set-1-088') {
        bonus += Math.min(2, Number(Boolean(front.supA)) + Number(Boolean(front.supB)));
    }
    if (id === 'set-3-109' && SLOTS.some(slot =>
        front[slot] && front[slot] !== unit &&
        getUnitKeywords(player, front[slot], frontName, slot).includes('Mente Collettiva')
    )) bonus += 2;
    if (id === 'set-3-112') {
        bonus += Math.min(3, SLOTS.filter(slot =>
            front[slot] && front[slot] !== unit &&
            getUnitKeywords(player, front[slot], frontName, slot)
                .some(keyword => keyword.startsWith('Mente Collettiva'))
        ).length);
    }
    if (slotName === 'line' && ['set-1-008', 'set-1-033'].includes(unitId)) bonus += 1;
    if (unitId === 'set-1-020' && front.supA && front.supB) bonus += 1;
    if (unitId === 'set-1-036' && SLOTS.some(slot =>
        front[slot] && front[slot] !== unit && /raptor/i.test(front[slot].type || '')
    )) bonus += 1;
    if (unitId === 'set-1-041' &&
        FRONT_NAMES.filter(name => player.fronts[name].line).length >= 2) bonus += 1;
    if (slotName === 'line' &&
        playerUnits(player).some(entry => hasUnitCard(entry.unit, ['set-1-047']))) bonus += 1;
    if (['set-1-053', 'set-1-054'].includes(unitId) &&
        FRONT_NAMES.every(name => player.fronts[name].line)) {
        bonus += unitId === 'set-1-053' ? 1 : 2;
    }
    if (unitId === 'set-1-058' && front.supA && front.supB) bonus += 3;
    if (unitId === 'set-3-007' && slotName === 'line' &&
        (opponent?.fronts?.[frontName]?.line?.forceLostThisTurn || 0) > 0) bonus += 1;
    if (unitId === 'set-3-012' && (opponent?.parasites || 0) > 0) bonus += 1;
    if (unitId === 'set-3-022' && opponent && countUnits(player) < countUnits(opponent)) bonus += 1;
    if (unitId === 'set-3-033' && SLOTS.some(slot =>
        front[slot] && front[slot] !== unit && /sciame/i.test(front[slot].type || '')
    )) bonus += 1;
    if (unitId === 'set-3-040' && front.supA && front.supB) bonus += 2;
    if (unitId !== 'set-3-025' && frontHasUnit(
        player,
        frontName,
        ['set-3-025'],
        unit
    ) && getUnitKeywords(player, unit, frontName, slotName)
        .some(keyword => keyword.startsWith('Mente Collettiva'))) bonus += 1;
    if (playerUnits(player).some(entry => hasUnitCard(entry.unit, ['set-3-055'])) &&
        getUnitKeywords(player, unit, frontName, slotName)
            .some(keyword => keyword.startsWith('Mente Collettiva'))) bonus += 1;
    if (slotName === 'line' && ['supA', 'supB'].some(slot =>
        hasUnitCard(front[slot], ['set-2-034', 'set-2-042'])
    )) bonus += 1;
    if (['set-1-095'].some(siteId => player.sites?.some(site => cardId(site) === siteId)) &&
        getUnitKeywords(player, unit, frontName, slotName).includes('Ferocia')) bonus += 1;
    if (slotName === 'line' && player.sites?.some(site => cardId(site) === 'set-1-109')) bonus += 1;
    if (slotName === 'line' && player.sites?.some(site => cardId(site) === 'set-2-089') &&
        getUnitKeywords(player, unit, frontName, slotName).some(keyword => keyword.startsWith('Logorare'))) bonus += 1;
    if (player.sites?.some(site => cardId(site) === 'set-2-104') &&
        getUnitKeywords(player, unit, frontName, slotName).some(keyword => keyword.startsWith('Logorare'))) bonus += 1;
    if (slotName === 'line' && player.sites?.some(site => cardId(site) === 'set-3-103') &&
        getUnitKeywords(player, unit, frontName, slotName).some(keyword => keyword.startsWith('Mente Collettiva'))) bonus += 2;
    if (player.sites?.some(site => cardId(site) === 'set-3-091') &&
        getUnitKeywords(player, unit, frontName, slotName).some(keyword => keyword.startsWith('Mente Collettiva'))) bonus += 1;
    if (slotName === 'supA' || slotName === 'supB') {
        if (player.sites?.some(site => cardId(site) === 'set-3-086') &&
            getUnitKeywords(player, unit, frontName, slotName).some(keyword => keyword.startsWith('Mente Collettiva'))) bonus += 1;
    }
    if (slotName === 'line' && player.field?.catalogId === 'set-2-120' &&
        getUnitKeywords(player, unit, frontName, slotName)
            .some(keyword => keyword.startsWith('Logorare'))) bonus += 2;
    if (player.field?.catalogId === 'set-1-112' &&
        countUnits(player) > countUnits(opponent) && slotName === 'line') bonus += 1;
    if (player.field?.catalogId === 'set-1-118') {
        if (slotName === 'line') bonus += 1;
    }
    if (player.field?.catalogId === 'set-2-113' &&
        getUnitKeywords(player, unit, frontName, slotName).some(keyword => keyword.startsWith('Logorare'))) bonus += 1;
    if (player.field?.catalogId === 'set-3-113' &&
        getUnitKeywords(player, unit, frontName, slotName).some(keyword => keyword.startsWith('Mente Collettiva'))) bonus += 1;
    if (player.field?.catalogId === 'set-3-114' &&
        getUnitKeywords(player, unit, frontName, slotName).includes('Sorvolo')) bonus += 1;
    if (player.field?.catalogId === 'set-3-101' &&
        getUnitKeywords(player, unit, frontName, slotName).some(keyword => keyword.startsWith('Mente Collettiva'))) {
        bonus += Number(Boolean(front.supA)) + Number(Boolean(front.supB));
    }
    if (slotName === 'line' && opponent?.sites?.some(site =>
        cardId(site) === 'set-2-101')) bonus -= 1;
    if (slotName === 'line' &&
        opponent?.fronts?.[frontName]?.line?.catalogId === 'set-3-019') bonus -= 1;
    if (slotName === 'line' && opponent?.field &&
        ['set-1-118', 'set-2-115'].includes(cardId(opponent.field))) bonus -= 1;
    return bonus;
}

export function getFerocityBonus(player, unit, frontName, slotName, fewerUnits) {
    const keywords = getUnitKeywords(player, unit, frontName, slotName);
    if (!keywords.some(keyword => keyword.startsWith('Ferocia')) || !fewerUnits) return 0;
    const ferocityValue = keywords.some(keyword => keyword.includes('+2')) ||
        player.field?.catalogId === 'set-1-115' ? 2 : 1;
    return ferocityValue;
}

export function getDamageReduction(player, unit, frontName, slotName) {
    const equipmentId = cardId(unit.equipment);
    let reduction = ['set-1-085', 'set-2-086'].includes(equipmentId) ? 2 :
        ['set-1-080', 'set-2-080', 'set-3-106'].includes(equipmentId) ? 1 : 0;
    if (slotName === 'line') {
        if (hasUnitCard(unit, ['set-2-026', 'set-3-032'])) reduction++;
        if (player.fronts[frontName].supA || player.fronts[frontName].supB) {
            if (hasUnitCard(unit, ['set-1-039'])) reduction++;
        }
        reduction += ['supA', 'supB'].filter(slot =>
            hasUnitCard(player.fronts[frontName][slot], ['set-2-010', 'set-2-042'])
        ).length;
        reduction += (player.sites || []).filter(site =>
            ['set-1-103', 'set-2-085'].includes(cardId(site))
        ).length;
    }
    return reduction;
}

function ownSupport(unit) {
    return Boolean(unit) && !unit.infiltrated;
}

export function getSupportBonus(player, frontName) {
    const front = player.fronts[frontName];
    let total = Number(ownSupport(front.supA)) + Number(ownSupport(front.supB));
    const supportEnhancers = ['set-1-030', 'set-1-049', 'set-3-046'];
    const frontHasEnhancer = frontHasUnit(player, frontName, supportEnhancers);
    const extraSupportSites = (player.sites || []).filter(site =>
        ['set-1-101', 'set-3-096'].includes(cardId(site))
    ).length;
    total += extraSupportSites *
        (Number(ownSupport(front.supA)) + Number(ownSupport(front.supB)));
    for (const slot of ['supA', 'supB']) {
        const unit = front[slot];
        if (!ownSupport(unit)) continue;
        if (hasUnitCard(unit, ['set-1-009', 'set-1-043', 'set-3-009']) ||
            cardId(unit.equipment) === 'set-1-082' ||
            frontHasEnhancer ||
            (hasUnitCard(unit, ['set-1-022']) &&
                !front[slot === 'supA' ? 'supB' : 'supA'])) {
            total++;
        }
        if (/raptor/i.test(unit.type || '') &&
            player.sites?.some(site => cardId(site) === 'set-1-107')) total++;
    }
    return Math.min(3, total);
}

export function countUnits(player) {
    return playerUnits(player).length;
}

export function createToken(owner, frontName, slotName, name = 'Pedina Sciame', force = 1) {
    owner.tokenCounter = (owner.tokenCounter || 0) + 1;
    const unit = {
        id: `token-${owner.id}-${owner.tokenCounter}`,
        catalogId: null,
        owner: owner.id,
        name,
        category: 'unit',
        type: name === 'Pedina Raptor' ? 'Raptor' : 'Sciame',
        force,
        currentForce: force,
        damage: 0,
        damageThisTurn: 0,
        damageShield: 0,
        temporaryForce: 0,
        keywords: [],
        temporaryKeywords: [],
        front: frontName,
        position: slotName,
        equipment: null
    };
    owner.fronts[frontName][slotName] = unit;
    return unit;
}
