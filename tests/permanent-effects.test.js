import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getFerocityBonus,
    getDamageReduction,
    getSupportBonus,
    getUnitForceBonus,
    getUnitKeywords
} from '../src/permanent-effects.js';

function playerWithEmptyFronts(overrides = {}) {
    return {
        sites: [],
        field: null,
        fronts: {
            left: { line: null, supA: null, supB: null },
            center: { line: null, supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        },
        ...overrides
    };
}

test('empty positions have no keywords and are safe to inspect', () => {
    const player = playerWithEmptyFronts();
    assert.deepEqual(getUnitKeywords(player, null, 'left', 'line'), []);
});

test('Corona della Mente Suprema grants force without granting Mente Collettiva', () => {
    const player = playerWithEmptyFronts();
    const unit = {
        keywords: [],
        equipment: { catalogId: 'set-3-112' }
    };
    player.fronts.left.line = unit;
    player.fronts.left.supA = { keywords: ['Mente Collettiva'], equipment: null };

    assert.deepEqual(getUnitKeywords(player, unit, 'left', 'line'), []);
    assert.equal(getUnitForceBonus(player, unit, 'left', 'line', playerWithEmptyFronts()), 1);
});

test('opposing line-weakening permanents are included in combat force modifiers', () => {
    const player = playerWithEmptyFronts();
    const opponent = playerWithEmptyFronts({
        sites: [{ catalogId: 'set-2-101' }],
        field: { catalogId: 'set-2-115' }
    });
    const line = { keywords: [], equipment: null };

    assert.equal(getUnitForceBonus(player, line, 'left', 'line', opponent), -2);
});

test('Vigile del Monolito weakens only the opposing Line in its own front', () => {
    const player = playerWithEmptyFronts();
    const opponent = playerWithEmptyFronts();
    const line = { catalogId: 'line', force: 4, currentForce: 4, keywords: [], equipment: null };
    player.fronts.left.line = line;
    opponent.fronts.left.line = {
        catalogId: 'set-3-019', force: 3, currentForce: 3, keywords: [], equipment: null
    };

    assert.equal(getUnitForceBonus(player, line, 'left', 'line', opponent), -1);
    assert.equal(getUnitForceBonus(player, line, 'center', 'line', opponent), 0);
});

test('Terre della Ferocia Primigenia strengthens Ferocia but does not grant it', () => {
    const player = playerWithEmptyFronts({ field: { catalogId: 'set-1-115' } });
    const ordinary = { force: 3, keywords: [], equipment: null };
    const fierce = { force: 3, keywords: ['Ferocia'], equipment: null };

    assert.deepEqual(getUnitKeywords(player, ordinary, 'left', 'line'), []);
    assert.equal(getFerocityBonus(player, ordinary, 'left', 'line', true), 0);
    assert.equal(getFerocityBonus(player, fierce, 'left', 'line', true), 2);
});

test('independent Site bonuses stack for Support strength up to the three-point cap', () => {
    const player = playerWithEmptyFronts({
        sites: [
            { catalogId: 'set-1-101' },
            { catalogId: 'set-3-096' }
        ]
    });
    player.fronts.left.supA = { equipment: null };
    player.fronts.left.supB = { equipment: null };

    assert.equal(getSupportBonus(player, 'left'), 3);
    player.sites = [{ catalogId: 'set-1-101' }];
    assert.equal(getSupportBonus(player, 'left'), 3);
});

test('Line damage reduction from separate permanent sources is cumulative', () => {
    const player = playerWithEmptyFronts({
        sites: [
            { catalogId: 'set-1-103' },
            { catalogId: 'set-2-085' }
        ]
    });
    const unit = { equipment: { catalogId: 'set-1-085' } };

    assert.equal(getDamageReduction(player, unit, 'left', 'line'), 4);
    assert.equal(getDamageReduction(player, unit, 'left', 'supA'), 2);
});

test('Line passives provide their printed strength and keyword bonuses', () => {
    const player = playerWithEmptyFronts();
    const opponent = playerWithEmptyFronts();
    const line = (catalogId, type = 'Dinosauro', keywords = []) => ({
        catalogId, type, force: 3, currentForce: 3, keywords, equipment: null
    });

    const lineBonus = line('set-1-008');
    player.fronts.left.line = lineBonus;
    assert.equal(getUnitForceBonus(player, lineBonus, 'left', 'line', opponent), 1);

    player.fronts.left.line = line('set-1-020');
    player.fronts.left.supA = line('support-a');
    player.fronts.left.supB = line('support-b');
    assert.equal(
        getUnitForceBonus(player, player.fronts.left.line, 'left', 'line', opponent),
        1
    );

    player.fronts.left.supA = line('set-1-014');
    player.fronts.left.line = line('ordinary-line');
    assert.ok(getUnitKeywords(
        player,
        player.fronts.left.line,
        'left',
        'line'
    ).includes('Ferocia'));

    player.fronts.left.line = line('raptor-line', 'Raptor');
    player.fronts.left.supA = line('set-1-029');
    assert.ok(getUnitKeywords(
        player,
        player.fronts.left.line,
        'left',
        'line'
    ).includes('Ferocia'));
});

test('frontwide Unit bonuses apply only when their stated board conditions hold', () => {
    const player = playerWithEmptyFronts();
    const opponent = playerWithEmptyFronts();
    const unit = catalogId => ({
        catalogId, force: 2, currentForce: 2, keywords: [], equipment: null
    });

    test('Matriarca del Branco Rosso buffs every controlled Line, not just itself', () => {
        const player = playerWithEmptyFronts();
        const opponent = playerWithEmptyFronts();
        const matriarch = { catalogId: 'set-1-047', force: 5, keywords: [], equipment: null };
        const otherLine = { catalogId: 'other', force: 3, keywords: [], equipment: null };
        player.fronts.left.line = matriarch;
        player.fronts.right.line = otherLine;

        assert.equal(getUnitForceBonus(player, matriarch, 'left', 'line', opponent), 1);
        assert.equal(getUnitForceBonus(player, otherLine, 'right', 'line', opponent), 1);
        assert.equal(getUnitForceBonus(player, otherLine, 'center', 'supA', opponent), 0);
    });

    player.fronts.left.line = unit('set-1-041');
    player.fronts.center.line = unit('other');
    assert.equal(getUnitForceBonus(
        player,
        player.fronts.left.line,
        'left',
        'line',
        opponent
    ), 1);

    player.fronts.left.line = unit('set-1-054');
    player.fronts.center.line = unit('other');
    player.fronts.right.line = null;
    assert.equal(getUnitForceBonus(
        player,
        player.fronts.left.line,
        'left',
        'line',
        opponent
    ), 0);
    player.fronts.right.line = unit('other');
    assert.equal(getUnitForceBonus(
        player,
        player.fronts.left.line,
        'left',
        'line',
        opponent
    ), 2);

    player.fronts.left.line = unit('set-3-012');
    opponent.parasites = 1;
    assert.equal(getUnitForceBonus(
        player,
        player.fronts.left.line,
        'left',
        'line',
        opponent
    ), 1);
});

test('Unit Support auras and support-strength cards grant additional Line strength', () => {
    for (const [catalogId, expected] of [
        ['set-1-009', 2],
        ['set-1-022', 2],
        ['set-1-030', 2],
        ['set-1-043', 2],
        ['set-1-049', 2],
        ['set-3-009', 2],
        ['set-3-046', 2]
    ]) {
        const player = playerWithEmptyFronts();
        player.fronts.left.line = { keywords: [], equipment: null };
        player.fronts.left.supA = {
            catalogId, type: 'Dinosauro', keywords: [], equipment: null
        };
        assert.equal(getSupportBonus(player, 'left'), expected, catalogId);
    }

    const capped = playerWithEmptyFronts({
        sites: [{ catalogId: 'set-1-101' }]
    });
    capped.fronts.left.line = { keywords: [], equipment: null };
    capped.fronts.left.supA = {
        catalogId: 'set-1-009', keywords: [], equipment: null
    };
    capped.fronts.left.supB = {
        catalogId: 'set-1-043', keywords: [], equipment: null
    };
    assert.equal(getSupportBonus(capped, 'left'), 3);
});

test('Unit Support abilities apply force reduction and damage prevention', () => {
    const player = playerWithEmptyFronts();
    const line = { catalogId: 'line', currentForce: 4, keywords: [], equipment: null };
    player.fronts.left.line = line;
    player.fronts.left.supA = {
        catalogId: 'set-2-034', currentForce: 1, keywords: [], equipment: null
    };
    player.fronts.left.supB = {
        catalogId: 'set-2-010', currentForce: 1, keywords: [], equipment: null
    };

    assert.equal(getUnitForceBonus(player, line, 'left', 'line', null), 1);
    assert.equal(getDamageReduction(player, line, 'left', 'line'), 1);
    player.fronts.left.supA.catalogId = 'set-2-042';
    assert.equal(getDamageReduction(player, line, 'left', 'line'), 2);
});

function catalogId(unit) {
    return unit?.catalogId;
}
