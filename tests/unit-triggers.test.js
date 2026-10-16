import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getCommanderVictoryDamageEffects,
    getUnitDestructionEffects,
    getUnitDestructionReactions,
    getUnitEntryEffects,
    getUnitLineDestructionEffects,
    getSorvoloEntryEffects,
    hasSeminatoreSilente,
    isProtectedFromEffectDestruction,
    isProtectedFromEnemyTactic,
    isProtectedFromEnemyMovement,
    shouldDestroySupportOnUnitLineWin
} from '../src/unit-triggers.js';

test('Line destruction abilities resolve from their printed triggers only in Line', () => {
    const expectedById = new Map([
        ['set-1-006', [{ type: 'commander-damage', amount: 1 }]],
        ['set-1-038', [{ type: 'commander-damage', amount: 1 }]],
        ['set-1-045', [{ type: 'commander-damage', amount: 1 }]],
        ['set-1-055', [{ type: 'commander-damage', amount: 2 }]],
        ['set-3-047', [{ type: 'commander-damage', amount: 1 }]],
        ['set-1-052', [{ type: 'temporary-force', amount: 2 }]],
        ['set-2-028', [{ type: 'draw-card' }]],
        ['set-2-039', [{ type: 'draw-card' }]],
        ['set-2-049', [{ type: 'exile-from-discard' }]],
        ['set-3-016', [{ type: 'draw-card' }]],
        ['set-3-026', [{ type: 'add-parasite' }]],
        ['set-3-036', [{ type: 'draw-card' }]]
    ]);

    for (const [catalogId, expected] of expectedById) {
        assert.deepEqual(
            getUnitLineDestructionEffects({ catalogId, position: 'line' }),
            expected,
            catalogId
        );
        assert.deepEqual(
            getUnitLineDestructionEffects({ catalogId, position: 'supA' }),
            [],
            `${catalogId} must not trigger from Support`
        );
    }
    for (const catalogId of ['set-2-035', 'set-2-049']) {
        assert.deepEqual(
            getUnitLineDestructionEffects({ catalogId, position: 'line' }),
            [{ type: 'exile-from-discard' }]
        );
    }
    assert.deepEqual(
        getUnitLineDestructionEffects({ catalogId: 'set-2-043', position: 'line' }),
        [{ type: 'put-spectral-card-on-top' }]
    );
    assert.deepEqual(
        getUnitLineDestructionEffects({ catalogId: 'set-3-045', position: 'line' }),
        [{ type: 'destroy-enemy-support-in-front' }]
    );
    assert.equal(shouldDestroySupportOnUnitLineWin({ catalogId: 'set-1-044' }), true);
    assert.equal(shouldDestroySupportOnUnitLineWin({ catalogId: 'other' }), false);
});

test('enemy movement protection covers isolated Lines and local Collective Mind auras', () => {
    const emptyFront = () => ({ line: null, supA: null, supB: null });
    const owner = {
        fronts: { left: emptyFront(), center: emptyFront(), right: emptyFront() }
    };
    const collective = { keywords: ['Mente Collettiva'] };
    owner.fronts.left.line = { catalogId: 'set-3-051' };
    assert.equal(isProtectedFromEnemyMovement(owner, collective, 'center'), true);
    owner.fronts.left.line = null;
    owner.fronts.center.supA = { catalogId: 'set-3-038' };
    assert.equal(isProtectedFromEnemyMovement(owner, collective, 'center'), true);
    assert.equal(isProtectedFromEnemyMovement(owner, { keywords: [] }, 'center'), false);
    assert.equal(isProtectedFromEnemyMovement(owner, collective, 'left'), false);
});

test('Unit entry triggers recover cards, add Parasites, and create tokens', () => {
    assert.deepEqual(
        getUnitEntryEffects({ catalogId: 'set-2-016' }),
        [{ type: 'recover-spectral-card' }]
    );
    assert.deepEqual(
        getUnitEntryEffects({ catalogId: 'set-2-027' }),
        [{ type: 'recover-unit-cost-at-most', cost: 3 }]
    );
    assert.deepEqual(getUnitEntryEffects({ catalogId: 'set-3-002' }), [
        { type: 'add-opponent-parasite', amount: 1 }
    ]);
    assert.deepEqual(getUnitEntryEffects({ catalogId: 'set-3-044' }), [
        { type: 'add-opponent-parasite', amount: 2 }
    ]);
    assert.deepEqual(getUnitEntryEffects({ catalogId: 'set-3-050' }), [
        { type: 'add-opponent-parasite', amount: 1 }
    ]);
    assert.deepEqual(getUnitEntryEffects({ catalogId: 'set-3-030' }), [
        { type: 'create-support-token', force: 2 }
    ]);
    assert.deepEqual(getUnitEntryEffects({ catalogId: 'set-3-039' }), [
        { type: 'create-support-token', force: 2, when: 'line' }
    ]);
    assert.deepEqual(getUnitEntryEffects({ catalogId: 'set-1-027' }), [
        { type: 'destroy-enemy-support-in-front', when: 'line' }
    ]);
    assert.deepEqual(getUnitEntryEffects({ catalogId: 'set-2-009' }, 'line'), [
        { type: 'weaken-enemy-line-in-front', amount: 1 }
    ]);
    assert.deepEqual(getUnitEntryEffects({ catalogId: 'set-2-013' }, 'supA'), [
        { type: 'weaken-enemy-line-in-front', amount: 1 }
    ]);
    assert.deepEqual(getUnitEntryEffects({ catalogId: 'set-2-029' }, 'line'), [
        { type: 'weaken-enemy-line-in-front', amount: 2 }
    ]);
    assert.deepEqual(
        getUnitEntryEffects({ catalogId: 'set-2-020' }, 'line', false),
        []
    );
    assert.deepEqual(
        getUnitEntryEffects({ catalogId: 'set-2-020' }, 'line', true),
        [{ type: 'weaken-enemy-line-in-front', amount: 1 }]
    );
    assert.deepEqual(getUnitEntryEffects({ catalogId: 'set-3-011' }, 'line'), [
        { type: 'weaken-enemy-line-in-front', amount: 1 }
    ]);
    assert.deepEqual(getUnitEntryEffects({ catalogId: 'set-3-023' }, 'supB'), [
        { type: 'weaken-enemy-line-in-front', amount: 1 }
    ]);
    assert.deepEqual(getUnitEntryEffects({ catalogId: 'other' }), []);
});

test('Seminatore Silente turn-start penalty is active while any copy remains in play', () => {
    assert.equal(hasSeminatoreSilente([
        { catalogId: 'unrelated' },
        { catalogId: 'set-3-050' }
    ]), true);
    assert.equal(hasSeminatoreSilente([{ catalogId: 'unrelated' }]), false);
});

test('Sorvolo entry triggers apply the correct front, line, and parasite effects', () => {
    for (const catalogId of ['set-1-031', 'set-1-048']) {
        assert.deepEqual(
            getSorvoloEntryEffects({ catalogId }),
            [{ type: 'boost-own-line', amount: 1 }]
        );
    }
    assert.deepEqual(getSorvoloEntryEffects({ catalogId: 'set-1-037' }), [
        { type: 'damage-enemy-line-in-front', amount: 1 }
    ]);
    assert.deepEqual(getSorvoloEntryEffects({ catalogId: 'set-3-035' }), [
        { type: 'add-opponent-parasite' }
    ]);
    assert.deepEqual(getSorvoloEntryEffects({ catalogId: 'set-3-042' }), [
        { type: 'weaken-enemy-line', amount: 2 }
    ]);
    assert.deepEqual(getSorvoloEntryEffects({ catalogId: 'set-3-052' }), [
        { type: 'destroy-weak-enemy-line', maximumForce: 3 }
    ]);
});

test('destroyed-Unit reactions respect once-per-turn and Mente Collettiva conditions', () => {
    const drawWatcher = { catalogId: 'set-2-018', lastDestroyedDrawTurn: 2 };
    const tokenWatcher = { catalogId: 'set-3-053' };
    const units = [drawWatcher, tokenWatcher];

    assert.deepEqual(
        getUnitDestructionReactions(units, { keywords: [] }, 3),
        [{ type: 'draw-card', source: drawWatcher }]
    );
    assert.deepEqual(
        getUnitDestructionReactions(units, { keywords: ['Mente Collettiva'] }, 3),
        [
            { type: 'draw-card', source: drawWatcher },
            { type: 'create-support-token', source: tokenWatcher }
        ]
    );
    assert.deepEqual(
        getUnitDestructionReactions(units, { keywords: ['Mente Collettiva'] }, 2),
        [{ type: 'create-support-token', source: tokenWatcher }]
    );
});

test('Line-destruction reactions and effect-destruction protection are position-aware', () => {
    assert.deepEqual(
        getUnitDestructionEffects({ catalogId: 'set-3-006', position: 'line' }),
        [{ type: 'damage-enemy-line-in-front', amount: 1 }]
    );
    assert.deepEqual(
        getUnitDestructionEffects({ catalogId: 'set-3-006', position: 'supA' }),
        []
    );
    const protectedUnit = { catalogId: 'set-1-057' };
    assert.equal(isProtectedFromEffectDestruction(protectedUnit, 'line'), true);
    assert.equal(isProtectedFromEffectDestruction(protectedUnit, 'supA'), false);
    assert.equal(isProtectedFromEffectDestruction({ catalogId: 'other' }, 'line'), false);
    assert.equal(isProtectedFromEnemyTactic(
        { catalogId: 'set-1-051' }, 'line', 5
    ), true);
    assert.equal(isProtectedFromEnemyTactic(
        { catalogId: 'set-3-032' }, 'line', 1
    ), true);
    assert.equal(isProtectedFromEnemyTactic(
        { catalogId: 'set-3-032' }, 'line', 2
    ), false);
});

test('Commander damage triggers follow Line wins, uncovered fronts, and per-turn limits', () => {
    const firstWinSource = { catalogId: 'set-1-056' };
    const winningUnits = [
        firstWinSource,
        { catalogId: 'set-1-060' }
    ];

    assert.deepEqual(
        getCommanderVictoryDamageEffects(
            winningUnits,
            { catalogId: 'set-1-018' },
            1,
            4,
            true
        ),
        { amount: 2, oncePerTurnSources: [firstWinSource] }
    );
    firstWinSource.lastWinDamageTurn = 4;
    assert.deepEqual(
        getCommanderVictoryDamageEffects(
            winningUnits,
            { catalogId: 'set-1-026' },
            2,
            4,
            true
        ),
        { amount: 4, oncePerTurnSources: [] }
    );
    assert.deepEqual(
        getCommanderVictoryDamageEffects(
            winningUnits,
            { catalogId: 'set-1-046' },
            3,
            4,
            false
        ),
        { amount: 4, oncePerTurnSources: [] }
    );
});
