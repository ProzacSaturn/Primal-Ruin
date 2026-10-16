function cardId(card) {
    return card?.catalogId || card?.id;
}

export function getUnitLineDestructionEffects(line) {
    if (!line || line.position !== 'line') return [];
    const id = cardId(line);
    const effects = [];

    if (['set-1-006', 'set-1-038', 'set-1-045', 'set-3-047'].includes(id)) {
        effects.push({ type: 'commander-damage', amount: 1 });
    } else if (id === 'set-1-055') {
        effects.push({ type: 'commander-damage', amount: 2 });
    }
    if (['set-2-028', 'set-2-039', 'set-3-016', 'set-3-036'].includes(id)) {
        effects.push({ type: 'draw-card' });
    }
    if (id === 'set-3-026') effects.push({ type: 'add-parasite' });
    if (['set-2-035', 'set-2-049'].includes(id)) {
        effects.push({ type: 'exile-from-discard' });
    }
    if (id === 'set-2-043') effects.push({ type: 'put-spectral-card-on-top' });
    if (id === 'set-3-045') {
        effects.push({ type: 'destroy-enemy-support-in-front' });
    }
    if (id === 'set-1-052') effects.push({ type: 'temporary-force', amount: 2 });

    return effects;
}

export function getUnitDestructionEffects(unit) {
    if (cardId(unit) === 'set-3-006' && unit.position === 'line') {
        return [{ type: 'damage-enemy-line-in-front', amount: 1 }];
    }
    return [];
}

export function getUnitEntryEffects(unit, slotName, fromDiscard = false) {
    const id = cardId(unit);
    const effects = [];
    if (id === 'set-1-027') {
        effects.push({ type: 'destroy-enemy-support-in-front', when: 'line' });
    }
    if (id === 'set-2-016') effects.push({ type: 'recover-spectral-card' });
    if (id === 'set-2-027') effects.push({ type: 'recover-unit-cost-at-most', cost: 3 });
    if (id === 'set-2-009' && slotName === 'line') {
        effects.push({ type: 'weaken-enemy-line-in-front', amount: 1 });
    }
    if (id === 'set-2-013' && slotName !== 'line') {
        effects.push({ type: 'weaken-enemy-line-in-front', amount: 1 });
    }
    if (['set-2-029', 'set-2-040'].includes(id) && slotName === 'line') {
        effects.push({ type: 'weaken-enemy-line-in-front', amount: 2 });
    }
    if (['set-2-020', 'set-2-031'].includes(id) && fromDiscard) {
        effects.push({ type: 'weaken-enemy-line-in-front', amount: 1 });
    }
    if (['set-3-002', 'set-3-014'].includes(id)) {
        effects.push({ type: 'add-opponent-parasite', amount: 1 });
    }
    if (id === 'set-3-020') effects.push({ type: 'create-support-token', force: 1 });
    if (id === 'set-3-030') effects.push({ type: 'create-support-token', force: 2 });
    if (id === 'set-3-039') {
        effects.push({ type: 'create-support-token', force: 2, when: 'line' });
    }
    if (id === 'set-3-044') effects.push({ type: 'add-opponent-parasite', amount: 2 });
    if (id === 'set-3-050') effects.push({ type: 'add-opponent-parasite', amount: 1 });
    if (id === 'set-3-011' && slotName === 'line') {
        effects.push({ type: 'weaken-enemy-line-in-front', amount: 1 });
    }
    if (id === 'set-3-023' && slotName !== 'line') {
        effects.push({ type: 'weaken-enemy-line-in-front', amount: 1 });
    }
    return effects;
}

export function getSorvoloEntryEffects(unit) {
    const id = cardId(unit);
    if (id === 'set-1-031' || id === 'set-1-048') {
        return [{ type: 'boost-own-line', amount: 1 }];
    }
    if (id === 'set-1-037') return [{ type: 'damage-enemy-line-in-front', amount: 1 }];
    if (id === 'set-3-035') return [{ type: 'add-opponent-parasite' }];
    if (id === 'set-3-042') return [{ type: 'weaken-enemy-line', amount: 2 }];
    if (id === 'set-3-052') return [{ type: 'destroy-weak-enemy-line', maximumForce: 3 }];
    return [];
}

export function getUnitDestructionReactions(units, destroyedUnit, turnNumber) {
    const reactions = [];
    const destroyedKeywords = destroyedUnit?.keywords || [];

    for (const unit of units) {
        const id = cardId(unit);
        if (id === 'set-2-018' && unit.lastDestroyedDrawTurn !== turnNumber) {
            reactions.push({ type: 'draw-card', source: unit });
        }
        if (id === 'set-3-053' &&
            destroyedKeywords.some(keyword => keyword.startsWith('Mente Collettiva'))) {
            reactions.push({ type: 'create-support-token', source: unit });
        }
    }

    return reactions;
}

export function getCommanderVictoryDamageEffects(
    units,
    winningLine,
    frontWinsThisTurn,
    turnNumber,
    opposingLineUncovered
) {
    let amount = 0;
    const oncePerTurnSources = [];
    const lineId = cardId(winningLine);
    if (['set-1-018', 'set-1-046'].includes(lineId)) amount++;
    if (lineId === 'set-1-026' && opposingLineUncovered) amount++;

    for (const unit of units) {
        const id = cardId(unit);
        if (id === 'set-1-056' && unit.lastWinDamageTurn !== turnNumber) {
            amount++;
            oncePerTurnSources.push(unit);
        }
        if (id === 'set-1-060' && frontWinsThisTurn >= 2) amount += 3;
    }

    return { amount, oncePerTurnSources };
}

export function shouldDestroySupportOnUnitLineWin(winningLine) {
    return cardId(winningLine) === 'set-1-044';
}

export function hasSeminatoreSilente(units) {
    return units.some(unit => cardId(unit) === 'set-3-050');
}

export function isProtectedFromEffectDestruction(unit, slotName) {
    return cardId(unit) === 'set-1-057' && slotName === 'line';
}

export function isProtectedFromEnemyTactic(unit, slotName, tacticCost) {
    return slotName === 'line' &&
        (cardId(unit) === 'set-1-051' ||
            (cardId(unit) === 'set-3-032' && tacticCost === 1));
}

export function isProtectedFromEnemyMovement(owner, unit, frontName) {
    const hasIsolatedLine = Object.values(owner.fronts).some(front =>
        cardId(front.line) === 'set-3-051'
    );
    if (hasIsolatedLine) return true;
    const front = owner.fronts[frontName];
    const hasCollectiveGuardian = ['line', 'supA', 'supB'].some(slotName =>
        cardId(front[slotName]) === 'set-3-038'
    );
    return hasCollectiveGuardian &&
        unit.keywords?.some(keyword => keyword.startsWith('Mente Collettiva'));
}
