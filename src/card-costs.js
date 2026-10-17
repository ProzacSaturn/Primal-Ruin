function catalogId(card) {
    return card?.catalogId || card?.id;
}

function hasSupportUnit(player, ids) {
    return ['left', 'center', 'right'].some(frontName =>
        ['supA', 'supB'].some(slotName =>
            ids.includes(catalogId(player.fronts?.[frontName]?.[slotName]))
        )
    );
}

function hasLineUnit(player, ids) {
    return ['left', 'center', 'right'].some(frontName =>
        ids.includes(catalogId(player.fronts?.[frontName]?.line))
    );
}

export function calculateCardCost(player, card, {
    fromDiscard = false,
    turnNumber = 0,
    players = [player]
} = {}) {
    let cost = card.cost ?? 0;
    if (card.category === 'equipment') cost += card.equipCost ?? 0;

    const spectral = card.keywords?.includes('Eco Spettrale');
    if (card.category === 'unit' && spectral && fromDiscard) cost++;
    if (card.category === 'unit' && spectral) {
        if (player.sites?.some(site => catalogId(site) === 'set-2-081')) cost--;
        if (player.field && catalogId(player.field) === 'set-2-114') cost--;
        if (player.sites?.some(site =>
            catalogId(site) === 'set-2-096' && site.discountTurn !== turnNumber
        )) cost--;
    }

    if (card.category === 'tactic' && card.cost === 1 &&
        players.some(owner => owner !== player && (
            catalogId(owner.field) === 'set-2-117' ||
            hasSupportUnit(owner, ['set-2-032']) ||
            hasLineUnit(owner, ['set-3-028'])
        ))) {
        cost++;
    }
    if (card.category === 'unit' && spectral &&
        hasSupportUnit(player, ['set-2-023'])) cost--;
    return Math.max(1, cost);
}

export function markCardCostDiscountUsed(player, card, turnNumber, fromDiscard = false) {
    if (card.category !== 'unit' || !card.keywords?.includes('Eco Spettrale')) return;
    const site = player.sites?.find(candidate =>
        catalogId(candidate) === 'set-2-096' && candidate.discountTurn !== turnNumber
    );
    if (!site) return;
    let costWithoutSite = card.cost ?? 0;
    if (fromDiscard) costWithoutSite++;
    if (player.sites?.some(candidate => catalogId(candidate) === 'set-2-081')) {
        costWithoutSite--;
    }
    if (player.field && catalogId(player.field) === 'set-2-114') costWithoutSite--;
    if (Math.max(1, costWithoutSite) > Math.max(1, costWithoutSite - 1)) {
        site.discountTurn = turnNumber;
    }
}
