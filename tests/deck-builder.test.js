import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../src/data/cards.json' with { type: 'json' };
import {
    applyTemporaryForce,
    getCardExecutionStatus,
    getTacticChoices,
    isImmediateTacticSupported,
    registeredEquipmentIds,
    registeredFieldIds,
    registeredSiteIds,
    registeredUnitEffectIds,
    resolveImmediateTactic,
    restoreTemporaryForce
} from '../src/card-effects.js';
import {
    registeredTacticIds,
    resolveRegisteredTactic,
    restoreControlledUnits,
    tacticRequiresChoice
} from '../src/tactics.js';
import { validateDeckIds } from '../src/deck-validation.js';

const cardIds = catalog.cards.filter(card => card.category !== 'commander').slice(0, 40).map(card => card.id);

function asTactic(id) {
    const printed = catalog.cards.find(card => card.id === id);
    return { ...printed, category: 'tactic' };
}
const knownCardIds = new Set(catalog.cards.map(card => card.id));

test('accepts a 40-card deck without imposing a copy limit', () => {
    const repeatedDeck = Array(40).fill(cardIds[0]);
    assert.deepEqual(
        validateDeckIds(repeatedDeck, knownCardIds),
        { valid: true, message: 'Mazzo valido: 40 carte.' }
    );
});

test('rejects a deck with a card count other than 40', () => {
    assert.equal(validateDeckIds(cardIds.slice(0, 39), knownCardIds).valid, false);
    assert.match(validateDeckIds(cardIds.slice(0, 39), knownCardIds).message, /40 carte/);
});

test('rejects unknown catalog card IDs', () => {
    const invalidDeck = [...cardIds.slice(0, 39), 'set-99-999'];
    assert.match(validateDeckIds(invalidDeck, knownCardIds).message, /Carta sconosciuta/);
});

test('catalog contains 480 uniquely identified cards across four sets', () => {
    assert.equal(catalog.cards.length, 480);
    assert.equal(new Set(catalog.cards.map(card => card.id)).size, 480);
    assert.deepEqual(catalog.sets.map(set => set.id), ['set-1', 'set-2', 'set-3', 'set-4']);
    assert.deepEqual(
        [...new Set(catalog.cards.map(card => card.category))].sort(),
        ['commander', 'equipment', 'field', 'site', 'tactic', 'unit']
    );
});

test('keeps registered Equipment implemented and new Equipment partial', () => {
    const equipment = catalog.cards.filter(card => card.category === 'equipment');
    assert.ok(equipment.length > registeredEquipmentIds.size);
    for (const card of equipment) {
        assert.equal(
            getCardExecutionStatus(card).label,
            registeredEquipmentIds.has(card.id) ? 'Implementata' : 'Parziale',
            card.id
        );
    }
});

test('keeps unknown Equipment effects explicitly partial', () => {
    const unknownEquipment = {
        id: 'custom-equipment',
        category: 'equipment',
        rulesText: 'Effetto non registrato.'
    };

    assert.equal(getCardExecutionStatus(unknownEquipment).label, 'Parziale');
});

test('keeps registered Sites and Fields implemented and new ones partial', () => {
    for (const [category, registeredIds] of [
        ['site', registeredSiteIds],
        ['field', registeredFieldIds]
    ]) {
        const cards = catalog.cards.filter(card => card.category === category);
        assert.ok(cards.length > 0, category);
        for (const card of cards) {
            assert.equal(
                getCardExecutionStatus(card).label,
                registeredIds.has(card.id) ? 'Implementata' : 'Parziale',
                card.id
            );
        }
    }
});

test('keeps unknown Site and Field effects explicitly partial', () => {
    assert.equal(getCardExecutionStatus({
        id: 'custom-site',
        category: 'site',
        rulesText: 'Effetto non registrato.'
    }).label, 'Parziale');
    assert.equal(getCardExecutionStatus({
        id: 'custom-field',
        category: 'field',
        rulesText: 'Effetto non registrato.'
    }).label, 'Parziale');
});

test('registers implemented Unit passive effects only for known Unit cards', () => {
    for (const id of registeredUnitEffectIds) {
        const card = catalog.cards.find(item => item.id === id);
        assert.ok(card, `registered Unit exists: ${id}`);
        if (card.category !== 'unit') continue;
        assert.equal(getCardExecutionStatus(card).label, 'Implementata', id);
    }
    assert.equal(getCardExecutionStatus({
        id: 'custom-unit',
        category: 'unit',
        rulesText: 'Abilità non registrata.'
    }).label, 'Parziale');
});

test('Fortezza del Velo protects a supported Line from Tactics costing two or less', () => {
    const player = {
        sites: [],
        fronts: Object.fromEntries(['left', 'center', 'right'].map(frontName => [
            frontName,
            { line: null, supA: null, supB: null }
        ]))
    };
    const opponent = {
        sites: [{ catalogId: 'set-2-091' }],
        fronts: Object.fromEntries(['left', 'center', 'right'].map(frontName => [
            frontName,
            { line: null, supA: null, supB: null }
        ]))
    };
    opponent.fronts.left.line = { name: 'Linea protetta', keywords: [] };
    opponent.fronts.center.supA = { name: 'Supporto', keywords: [] };
    const tactic = catalog.cards.find(card => card.id === 'set-1-062');

    assert.deepEqual(getTacticChoices(tactic, player, opponent), []);
    opponent.fronts.center.supA = null;
    assert.equal(getTacticChoices(tactic, player, opponent).length, 1);
});

test('Unit Lines cannot be targeted by prohibited opposing Tactics', () => {
    const player = {
        sites: [],
        fronts: Object.fromEntries(['left', 'center', 'right'].map(frontName => [
            frontName,
            { line: null, supA: null, supB: null }
        ]))
    };
    const opponent = {
        sites: [],
        fronts: Object.fromEntries(['left', 'center', 'right'].map(frontName => [
            frontName,
            { line: null, supA: null, supB: null }
        ]))
    };
    const tactic = { ...catalog.cards.find(card => card.id === 'set-1-062'), cost: 5 };
    opponent.fronts.left.line = { catalogId: 'set-1-051', keywords: [] };
    assert.deepEqual(getTacticChoices(tactic, player, opponent), []);

    opponent.fronts.left.line = { catalogId: 'set-3-032', keywords: [] };
    tactic.cost = 1;
    assert.deepEqual(getTacticChoices(tactic, player, opponent), []);
    tactic.cost = 2;
    assert.equal(getTacticChoices(tactic, player, opponent).length, 1);
});

test('opposing movement Tactics respect Unit movement protection', () => {
    const emptyFront = () => ({ line: null, supA: null, supB: null });
    const player = {
        fronts: { left: emptyFront(), center: emptyFront(), right: emptyFront() }
    };
    const opponent = {
        fronts: { left: emptyFront(), center: emptyFront(), right: emptyFront() }
    };
    const tactic = catalog.cards.find(card => card.id === 'set-3-067');
    opponent.fronts.left.line = { catalogId: 'set-3-051', keywords: [] };

    assert.deepEqual(getTacticChoices(tactic, player, opponent), []);
    assert.throws(
        () => resolveRegisteredTactic(
            tactic,
            { frontName: 'left', targetFront: 'center' },
            player,
            opponent
        ),
        /non può essere spostata/
    );

    opponent.fronts.left.line = { catalogId: 'collective', keywords: ['Mente Collettiva'] };
    opponent.fronts.left.supA = {
        catalogId: 'set-3-038', keywords: ['Mente Collettiva']
    };
    assert.deepEqual(getTacticChoices(tactic, player, opponent), []);
});

test('keeps previously registered Tactics executable and new Tactics unsupported', () => {
    const tactics = catalog.cards.filter(card => card.category === 'tactic');
    assert.equal(registeredTacticIds.length, 62);
    assert.equal(new Set(registeredTacticIds).size, 62);
    const supported = tactics.filter(isImmediateTacticSupported);
    assert.ok(supported.length > 0);
    assert.ok(supported.length < tactics.length);
    for (const card of supported) {
        assert.equal(getCardExecutionStatus(card).label, 'Implementata', card.id);
    }
    for (const card of tactics.filter(card => !isImmediateTacticSupported(card))) {
        assert.equal(getCardExecutionStatus(card).label, 'Non eseguibile', card.id);
    }
});

test('distinguishes implemented keywords from cards with additional unimplemented text', () => {
    const keyword = getCardExecutionStatus({
        category: 'unit',
        rulesText: 'Ferocia, Assalto, Logorare (2).'
    });
    const combinedEffect = getCardExecutionStatus({
        category: 'unit',
        rulesText: 'Ferocia. Pesca una carta.'
    });
    const optionalTorment = getCardExecutionStatus({
        category: 'unit',
        rulesText: 'Tormento (2)'
    });

    assert.equal(keyword.label, 'Keyword implementata');
    assert.equal(combinedEffect.label, 'Parziale');
    assert.equal(optionalTorment.label, 'Keyword implementata');
    for (const id of [
        'set-1-001',
        'set-1-002',
        'set-1-003',
        'set-1-004'
    ]) {
        const card = catalog.cards.find(item => item.id === id);
        assert.equal(getCardExecutionStatus(card).label, 'Keyword implementata', id);
    }
});

test('resolves only registered parasite tactics and preserves their exact conditions', () => {
    const opponent = { parasites: 0 };
    const infiltrate = catalog.cards.find(card => card.id === 'set-3-059');
    resolveImmediateTactic(infiltrate, {}, opponent);
    assert.equal(opponent.parasites, 1);

    const spread = catalog.cards.find(card => card.id === 'set-3-069');
    resolveImmediateTactic(spread, {}, opponent);
    assert.equal(opponent.parasites, 1);
    opponent.parasites = 0;
    resolveImmediateTactic(spread, {}, opponent);
    assert.equal(opponent.parasites, 1);
});

test('resolves only registered global line-buff tactics as temporary combat bonuses', () => {
    const player = {
        fronts: {
            left: { line: { currentForce: 2, temporaryForce: 0 } },
            center: { line: null },
            right: { line: { currentForce: 4, temporaryForce: 0 } }
        }
    };
    const opponent = { parasites: 0 };
    const card = catalog.cards.find(item => item.id === 'set-1-063');
    const message = resolveImmediateTactic(card, player, opponent);
    assert.match(message, /2 Linee/);
    assert.equal(player.fronts.left.line.currentForce, 3);
    assert.equal(player.fronts.right.line.temporaryForce, 1);
});

test('resolves global enemy line-force reductions and restores them after combat', () => {
    const player = {
        fronts: {
            left: { line: { currentForce: 2, temporaryForce: 0 } },
            center: { line: null },
            right: { line: { currentForce: 1, temporaryForce: 0 } }
        }
    };
    const opponent = {
        fronts: {
            left: { line: { currentForce: 4, temporaryForce: 0 } },
            center: { line: null },
            right: { line: { currentForce: 3, temporaryForce: 0 } }
        }
    };
    const weakenOne = catalog.cards.find(card => card.id === 'set-2-069');
    const weakenTwo = catalog.cards.find(card => card.id === 'set-2-076');

    assert.equal(getCardExecutionStatus(weakenOne).label, 'Implementata');
    assert.equal(getCardExecutionStatus(weakenTwo).label, 'Implementata');
    resolveImmediateTactic(weakenOne, player, opponent);
    assert.equal(opponent.fronts.left.line.currentForce, 3);
    assert.equal(opponent.fronts.left.line.temporaryForce, -1);
    resolveImmediateTactic(weakenTwo, player, opponent);
    assert.equal(opponent.fronts.left.line.currentForce, 1);
    assert.equal(opponent.fronts.left.line.temporaryForce, -3);
    assert.equal(opponent.fronts.right.line.currentForce, 0);
    assert.equal(opponent.fronts.right.line.temporaryForce, -3);

    restoreTemporaryForce(opponent.fronts.left.line);
    restoreTemporaryForce(opponent.fronts.right.line);
    assert.equal(opponent.fronts.left.line.currentForce, 4);
    assert.equal(opponent.fronts.right.line.currentForce, 3);
    assert.equal(opponent.fronts.left.line.temporaryForce, 0);
});

test('restores temporary force after damage without healing past the base force', () => {
    const unit = { currentForce: 3, temporaryForce: 0 };
    applyTemporaryForce(unit, 2);
    unit.currentForce -= 2;
    assert.equal(restoreTemporaryForce(unit), false);
    assert.equal(unit.currentForce, 1);
    assert.equal(unit.temporaryForce, 0);
});

test('flags a unit that reaches zero force when a temporary combat bonus expires', () => {
    const unit = { currentForce: 1, temporaryForce: 2 };
    unit.currentForce -= 1;
    assert.equal(restoreTemporaryForce(unit), true);
    assert.equal(unit.currentForce, 0);
});

test('all registered targeted tactics produce a legal choice and resolve', () => {
    const unit = (id, keywords = [], force = 5) => ({
        id, name: id, category: 'unit', cost: 1, keywords, force, currentForce: force, damage: 0,
        temporaryForce: 0, damageThisTurn: 0, forceLostThisTurn: 0,
        position: 'line', front: 'left'
    });
    const fronts = () => ({
        left: { line: unit('line-left'), supA: null, supB: null },
        center: { line: unit('line-center'), supA: unit('support-center', [], 2), supB: null },
        right: { line: null, supA: null, supB: null }
    });
    const scenarios = registeredTacticIds.filter(id => {
        const card = catalog.cards.find(item => item.id === id);
        return tacticRequiresChoice(card);
    });

    for (const id of scenarios) {
        const player = {
            fronts: fronts(), hand: [], discard: [], exile: [], pc: 20, follia: 0,
            parasites: 0, armyDeck: [], sites: [],
            domains: Array.from({ length: 20 }, (_, index) => ({
                id: `domain-${index}`, tapped: false
            }))
        };
        const opponent = {
            fronts: fronts(), hand: [], discard: [], exile: [], pc: 20, follia: 0,
            parasites: 0, armyDeck: [], sites: [],
            domains: Array.from({ length: 20 }, (_, index) => ({
                id: `enemy-domain-${index}`, tapped: false
            }))
        };
        const card = asTactic(id);
        player.hand.push(card);
        if (id === 'set-1-066') player.fronts.left.line = unit('line-left', ['Ferocia']);
        if (id === 'set-1-068') player.fronts.left.line.damageThisTurn = 2;
        if (id === 'set-1-069') player.hand.push({ id: 'discard-me', name: 'Scarto' });
        if (id === 'set-1-076') player.fronts.left.line = unit('strong-line', [], 7);
        if (id === 'set-2-057' || id === 'set-2-064') {
            player.discard.push(unit('spectral', ['Eco Spettrale']));
        }
        if (id === 'set-2-070') {
            player.discard.push(unit('spectral', ['Eco Spettrale']));
        }
        if (id === 'set-1-074' || id === 'set-2-075') {
            player.sites.push({ id: 'player-site', name: 'Sito alleato', ruins: 0 });
            opponent.sites.push({ id: 'enemy-site', name: 'Sito nemico', ruins: 0 });
        }
        if (id === 'set-2-078') {
            player.discard.push(unit('recoverable'));
            opponent.discard.push(unit('enemy-recoverable'));
        }
        if (id === 'set-2-067') player.discard.push(unit('discard-target'));
        if (id === 'set-2-071') player.discard.push(unit('discard-a'), unit('discard-b'));
        if (id === 'set-3-074') opponent.parasites = 1;
        if (id === 'set-2-060' || id === 'set-3-063') {
            opponent.hand.push({ id: 'enemy-tactic', name: 'Tattica avversaria', category: 'tactic' });
        }
        if (id === 'set-2-065') player.fronts.left.line = unit('weak-line', [], 2);
        if (id === 'set-2-056') player.fronts.left.line.forceLostThisTurn = 2;
        if (id === 'set-2-068') {
            player.armyDeck.push(...Array.from({ length: 4 }, (_, index) => ({
                id: `deck-${index}`, name: `Deck ${index}`
            })));
        }
        if (id === 'set-3-060') player.fronts.left.line = unit('collective', ['Mente Collettiva']);
        if (id === 'set-3-062') {
            player.fronts.left.line = unit('collective-line', ['Mente Collettiva']);
            player.fronts.left.supA = unit('collective-support', ['Mente Collettiva'], 2);
            opponent.fronts.left.supA = unit('enemy-support', [], 2);
        }
        if (id === 'set-3-072') {
            opponent.fronts.left.supA = unit('controlled-support', [], 2);
        }
        if (id === 'set-3-076') player.fronts.left.line = unit('collective-line', ['Mente Collettiva']);
        if (id === 'set-3-064') player.fronts.left.line = unit('flyer', ['Sorvolo']);
        if (id === 'set-3-080') opponent.fronts.left.line = unit('weak-enemy-line', [], 4);
        const choices = getTacticChoices(card, player, opponent);
        assert.ok(choices.length > 0, `${id} should offer at least one legal choice`);
        const changes = [];
        const message = resolveImmediateTactic(
            card,
            player,
            opponent,
            choices[0].value,
            {
                damageLine: (target, frontName, amount) => changes.push({ target, frontName, amount }),
                removeUnit: (target, frontName, slotName) => {
                    const removed = target.fronts[frontName][slotName];
                    target.fronts[frontName][slotName] = null;
                    target.discard.push(removed);
                    return removed;
                },
                destroyUnit: (target, frontName, slotName) => {
                    const removed = target.fronts[frontName][slotName];
                    if (removed?.keywords.includes('Divinità')) return null;
                    target.fronts[frontName][slotName] = null;
                    target.discard.push(removed);
                    return removed;
                }
            }
        );
        assert.equal(typeof message, 'string', `${id} should return a resolution log`);
    }
});

test('global Collective Mind tactics resolve without opening a target prompt', () => {
    const makeUnit = (id, keywords) => ({
        id, name: id, keywords, currentForce: 3, force: 3, temporaryForce: 0
    });
    for (const [id, bonus] of [['set-3-068', 1], ['set-3-079', 2]]) {
        const player = {
            fronts: {
                left: { line: makeUnit('left', ['Mente Collettiva']), supA: null, supB: null },
                center: { line: makeUnit('center', []), supA: makeUnit('support', ['Mente Collettiva']), supB: null },
                right: { line: null, supA: null, supB: null }
            }
        };
        const card = catalog.cards.find(item => item.id === id);
        assert.equal(tacticRequiresChoice(card), false);
        resolveImmediateTactic(card, player, {});
        assert.equal(player.fronts.left.line.currentForce, 3 + bonus);
        assert.equal(player.fronts.center.supA.currentForce, 3 + bonus);
        assert.equal(player.fronts.center.line.currentForce, 3);
    }
});

test('global combat tactics record their scoped effects', () => {
    for (const [id, expected] of [
        ['set-1-067', { breakthrough: 1 }],
        ['set-1-072', { supportBonus: 2 }],
        ['set-1-078', { doubleCentralDamage: true }],
        ['set-3-070', { supportBonus: 2 }],
        ['set-3-073', { collectiveOverrun: 1 }]
    ]) {
        const player = {
            fronts: {
                left: { line: null, supA: null, supB: null },
                center: { line: null, supA: null, supB: null },
                right: { line: null, supA: null, supB: null }
            }
        };
        const card = catalog.cards.find(item => item.id === id);
        assert.equal(tacticRequiresChoice(card), false);
        resolveImmediateTactic(card, player, {});
        assert.deepEqual(player.tacticEffects, expected);
    }
    const line = { id: 'line', name: 'Linea', keywords: [], currentForce: 2, force: 2 };
    const player = {
        fronts: {
            left: { line, supA: null, supB: null },
            center: { line: null, supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        },
        tacticEffects: {}
    };
    resolveImmediateTactic(
        catalog.cards.find(item => item.id === 'set-1-077'),
        player,
        {}
    );
    assert.ok(line.keywords.includes('Assalto'));
    assert.deepEqual(player.sacrificeAfterCombat, ['line']);
});

test('Silenzio Cosmico marks both players for the one-tactic-per-turn limit', () => {
    const card = catalog.cards.find(item => item.id === 'set-2-077');
    const player = { tacticsPlayedThisTurn: 1 };
    const opponent = { tacticsPlayedThisTurn: 0 };
    assert.equal(tacticRequiresChoice(card), false);
    resolveImmediateTactic(card, player, opponent);
    assert.equal(player.tacticLimitActive, true);
    assert.equal(opponent.tacticLimitActive, true);
});

test('draw-and-discard tactics resolve deterministically for the automatic opponent', () => {
    for (const [id, drawCount] of [['set-2-055', 1], ['set-2-073', 3]]) {
        const player = {
            hand: [{ id: 'high-cost', name: 'Carta costosa', cost: 7 }],
            discard: [],
            armyDeck: Array.from({ length: 3 }, (_, index) => ({
                id: `draw-${index}`, name: `Carta ${index}`, cost: 1
            }))
        };
        const card = asTactic(id);
        resolveImmediateTactic(card, player, {});
        assert.equal(player.hand.length, 1 + drawCount - 1);
        assert.equal(player.discard[0].id, 'high-cost');
        assert.equal(player.armyDeck.length, 3 - drawCount);
    }
});

test('mass-destruction tactic removes all eligible units but preserves Divinità', () => {
    const unit = (id, force, keywords = []) => ({
        id, name: id, force, currentForce: force, keywords, position: 'line'
    });
    const player = {
        fronts: {
            left: { line: null, supA: null, supB: null },
            center: { line: null, supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        }
    };
    const divine = unit('divine', 2, ['Divinità']);
    const opponent = {
        fronts: {
            left: {
                line: unit('weak-line', 3), supA: unit('weak-support', 1),
                supB: divine
            },
            center: { line: unit('strong-line', 4), supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        },
        discard: [], exile: []
    };
    const card = catalog.cards.find(item => item.id === 'set-2-072');
    resolveImmediateTactic(card, player, opponent);
    assert.equal(opponent.fronts.left.line, divine);
    assert.equal(opponent.fronts.left.supA, null);
    assert.equal(opponent.fronts.center.line.id, 'strong-line');
    assert.deepEqual(opponent.discard.map(item => item.id).sort(), ['weak-line', 'weak-support']);
});

test('Parasite-pressure and board tactics resolve their selected targets', () => {
    const card = id => catalog.cards.find(item => item.id === id);
    const makeFronts = () => ({
        left: { line: { id: 'line', name: 'Linea', keywords: [], force: 4, currentForce: 4 }, supA: null, supB: null },
        center: { line: { id: 'center', name: 'Centro', keywords: [], force: 4, currentForce: 4 }, supA: null, supB: null },
        right: { line: null, supA: null, supB: null }
    });
    const player = {
        id: 'player', name: 'Player', fronts: makeFronts(),
        hand: [], discard: [{ id: 'a' }, { id: 'b' }], exile: [],
        armyDeck: [], pc: 20, parasites: 0
    };
    const opponent = {
        id: 'opponent', name: 'Opponent', fronts: makeFronts(),
        hand: [], discard: [], exile: [], armyDeck: [], pc: 20, parasites: 2
    };
    const pressure = card('set-2-071');
    const pressureChoice = getTacticChoices(pressure, player, opponent)[0];
    resolveImmediateTactic(pressure, player, opponent, pressureChoice.value);
    assert.equal(opponent.fronts.left.line.forceLostThisTurn, undefined);
    assert.equal(player.fronts.left.line.currentForce, 3);
    assert.equal(player.fronts.left.line.forceLostThisTurn, 1);

    const parasiteCard = card('set-3-077');
    resolveImmediateTactic(parasiteCard, player, opponent, { owner: 'opponent' });
    assert.equal(opponent.parasites, 4);
    assert.equal(opponent.pc, 18);

    const swarmCard = card('set-3-065');
    const swarmChoice = getTacticChoices(swarmCard, player, opponent)[0];
    resolveImmediateTactic(swarmCard, player, opponent, swarmChoice.value);
    assert.equal(player.fronts[swarmChoice.value.frontName][swarmChoice.value.slotName].force, 1);

    const swapCard = card('set-3-078');
    const before = player.fronts.left;
    const swapChoice = getTacticChoices(swapCard, player, opponent)[0];
    resolveImmediateTactic(swapCard, player, opponent, swapChoice.value);
    assert.notEqual(player.fronts.left, before);
    assert.equal(player.fronts.left.line.front, 'left');
});

test('prevents Divine units from being destroyed by the support-destruction tactic', () => {
    const card = catalog.cards.find(item => item.id === 'set-1-073');
    const divine = {
        id: 'divine', name: 'Divina', keywords: ['Divinità'], force: 3, currentForce: 3
    };
    const player = {
        fronts: {
            left: { line: { id: 'line' }, supA: null, supB: null },
            center: { line: null, supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        },
        hand: [], discard: [], exile: [], pc: 20
    };
    const opponent = {
        fronts: {
            left: { line: { id: 'enemy-line' }, supA: divine, supB: null },
            center: { line: null, supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        },
        hand: [], discard: [], exile: [], pc: 20
    };
    const choices = getTacticChoices(card, player, opponent);
    assert.equal(choices.length, 0);
});

test('Frattura Territoriale marks a Site twice before destroying it', () => {
    const card = catalog.cards.find(item => item.id === 'set-1-074');
    const site = { id: 'target-site', name: 'Sito bersaglio', ruins: 0 };
    const player = { sites: [], discard: [] };
    const opponent = { sites: [site], discard: [] };
    const choice = getTacticChoices(card, player, opponent)[0].value;

    resolveImmediateTactic(card, player, opponent, choice);
    assert.equal(site.ruins, 1);
    assert.equal(opponent.sites.length, 1);
    resolveImmediateTactic(card, player, opponent, choice);
    assert.equal(opponent.sites.length, 0);
    assert.equal(opponent.discard[0], site);
});

test('Eco del Dolore draws when any Line loses Force and does nothing when the deck is empty', () => {
    const player = {
        fronts: {
            left: { line: null, supA: null, supB: null },
            center: { line: null, supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        },
        tacticEffects: {}, hand: [], armyDeck: [{ id: 'drawn', category: 'unit' }]
    };
    const line = { id: 'line', name: 'Linea', category: 'unit', force: 4, currentForce: 4, keywords: [] };
    const opponent = {
        fronts: {
            left: { line, supA: null, supB: null },
            center: { line: null, supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        },
        hand: [], discard: [], exile: [], domains: []
    };
    const trigger = asTactic('set-2-059');
    const loss = asTactic('set-2-053');

    assert.equal(tacticRequiresChoice(trigger), false);
    resolveImmediateTactic(trigger, player, opponent);
    resolveImmediateTactic(loss, player, opponent, { owner: 'opponent', frontName: 'left' });
    assert.deepEqual(player.hand.map(item => item.id), ['drawn']);
    assert.equal(line.currentForce, 3);
    resolveImmediateTactic(loss, player, opponent, { owner: 'opponent', frontName: 'left' });
    assert.equal(player.hand.length, 1);
});

test('Risveglio Oscuro pays the spectral Unit cost and returns it to play', () => {
    const card = catalog.cards.find(item => item.id === 'set-2-070');
    const spectral = {
        id: 'spectral', category: 'unit', name: 'Spettro', cost: 2, force: 3,
        currentForce: 0, keywords: ['Eco Spettrale']
    };
    const player = {
        discard: [spectral],
        domains: Array.from({ length: 6 }, (_, index) => ({ id: index, tapped: false })),
        fronts: {
            left: { line: null, supA: null, supB: null },
            center: { line: null, supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        }
    };
    const opponent = { fronts: {} };
    const choice = getTacticChoices(card, player, opponent)[0].value;

    resolveImmediateTactic(card, player, opponent, choice);
    assert.equal(player.discard.length, 0);
    assert.equal(player.domains.filter(domain => domain.tapped).length, 2);
    assert.equal(player.fronts[choice.frontName][choice.slotName], spectral);
    assert.equal(spectral.currentForce, spectral.force);
});

test('Crollo del Fronte destroys a Site and its owner draws one card', () => {
    const card = catalog.cards.find(item => item.id === 'set-2-075');
    const site = { id: 'site', name: 'Sito', ruins: 0 };
    const player = { sites: [], discard: [], hand: [], armyDeck: [] };
    const opponent = {
        sites: [site], discard: [], hand: [],
        armyDeck: [{ id: 'owner-draw', category: 'unit' }]
    };
    const choice = getTacticChoices(card, player, opponent)[0].value;

    resolveImmediateTactic(card, player, opponent, choice);
    assert.equal(opponent.sites.length, 0);
    assert.equal(opponent.discard[0], site);
    assert.equal(opponent.hand[0].id, 'owner-draw');
});

test('temporary Line and Support control moves cards and tracks original ownership', () => {
    const cardFor = id => catalog.cards.find(item => item.id === id);
    const makeFronts = () => ({
        left: { line: null, supA: null, supB: null },
        center: { line: null, supA: null, supB: null },
        right: { line: null, supA: null, supB: null }
    });
    const player = { id: 'player', fronts: makeFronts(), controlledUnits: [] };
    const opponent = { id: 'opponent', fronts: makeFronts() };
    const line = { id: 'enemy-line', name: 'Linea', currentForce: 4, force: 4, keywords: [] };
    const support = { id: 'enemy-support', name: 'Supporto', currentForce: 2, force: 2, keywords: [] };
    opponent.fronts.left.line = line;
    opponent.fronts.center.supA = support;

    const lineTactic = cardFor('set-2-074');
    const lineChoice = getTacticChoices(lineTactic, player, opponent)[0].value;
    resolveImmediateTactic(lineTactic, player, opponent, lineChoice);
    assert.equal(opponent.fronts.left.line, null);
    assert.equal(player.fronts[lineChoice.targetFront].line, line);
    assert.equal(player.controlledUnits[0].ownerId, opponent.id);

    player.fronts.right.supA = null;
    const supportTactic = cardFor('set-3-072');
    const supportChoice = getTacticChoices(supportTactic, player, opponent)[0].value;
    resolveImmediateTactic(supportTactic, player, opponent, supportChoice);
    assert.equal(opponent.fronts.center.supA, null);
    assert.equal(player.fronts[supportChoice.targetFront][supportChoice.targetSlot], support);
    assert.equal(player.controlledUnits.length, 2);

    const restored = restoreControlledUnits([player, opponent]);
    assert.deepEqual(restored.map(unit => unit.id).sort(), ['enemy-line', 'enemy-support']);
    assert.equal(opponent.fronts.left.line, line);
    assert.equal(opponent.fronts.center.supA, support);
    assert.equal(player.controlledUnits.length, 0);
});

test('Giudizio delle Ombre honors an optional recovery and lets the other player recover', () => {
    const card = catalog.cards.find(item => item.id === 'set-2-078');
    const line = id => ({
        id, category: 'unit', name: id, force: 4, currentForce: 4, keywords: [], position: 'line'
    });
    const makeFronts = () => ({
        left: { line: line('left-line'), supA: null, supB: null },
        center: { line: null, supA: null, supB: null },
        right: { line: line('right-line'), supA: null, supB: null }
    });
    const player = {
        fronts: makeFronts(), discard: [line('player-recovery')], exile: []
    };
    const opponent = {
        fronts: makeFronts(), discard: [line('opponent-recovery')], exile: []
    };
    const choice = getTacticChoices(card, player, opponent)[0].value;
    const playerRecovery = {
        cardId: 'player-recovery', frontName: 'center', slotName: 'supA'
    };

    resolveImmediateTactic(card, player, opponent, { ...choice, playerRecovery });
    assert.equal(player.fronts.center.supA.id, 'player-recovery');
    assert.ok(Object.values(opponent.fronts).some(front =>
        front.supA?.id === 'opponent-recovery' || front.supB?.id === 'opponent-recovery'
    ));
    assert.equal(player.discard.some(item => item.id === 'player-recovery'), false);
    assert.equal(opponent.discard.some(item => item.id === 'opponent-recovery'), false);

    const optionalPlayer = { fronts: makeFronts(), discard: [line('unused')], exile: [] };
    const optionalOpponent = { fronts: makeFronts(), discard: [], exile: [] };
    const optionalChoice = getTacticChoices(card, optionalPlayer, optionalOpponent)[0].value;
    resolveImmediateTactic(card, optionalPlayer, optionalOpponent, {
        ...optionalChoice, playerRecovery: null, opponentRecovery: null
    });
    assert.equal(optionalPlayer.discard[0].id, 'unused');
});
