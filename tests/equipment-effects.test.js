import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getDamageReduction,
    getSupportBonus,
    getUnitForceBonus,
    getUnitKeywords
} from '../src/permanent-effects.js';

function playerWithUnit(cardId, slotName = 'line') {
    const player = {
        sites: [],
        field: null,
        fronts: {
            left: { line: null, supA: null, supB: null },
            center: { line: null, supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        }
    };
    const unit = {
        id: 'equipped-unit',
        force: 3,
        currentForce: 3,
        type: 'Creature',
        keywords: [],
        equipment: { id: cardId, catalogId: cardId, category: 'equipment', name: cardId }
    };
    player.fronts.left[slotName] = unit;
    return { player, unit };
}

test('all static Equipment force bonuses resolve from their equipped position', () => {
    const expectedBonuses = new Map([
        ['set-1-079', 1],
        ['set-1-081', 1],
        ['set-1-084', 2],
        ['set-1-087', 2],
        ['set-1-088', 2],
        ['set-1-090', 2],
        ['set-2-109', 2],
        ['set-2-112', 2],
        ['set-3-109', 2],
        ['set-3-112', 2]
    ]);

    const opponent = {
        fronts: {
            left: { line: null, supA: null, supB: null },
            center: { line: null, supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        }
    };
    const { player: crystalPlayer } = playerWithUnit('set-1-087');
    crystalPlayer.fronts.center.line = { keywords: [], equipment: null };
    crystalPlayer.fronts.right.line = { keywords: [], equipment: null };
    assert.equal(
        getUnitForceBonus(
            crystalPlayer,
            crystalPlayer.fronts.left.line,
            'left',
            'line',
            opponent
        ),
        expectedBonuses.get('set-1-087')
    );
    for (const [cardId, expectedBonus] of expectedBonuses) {
        const { player, unit } = playerWithUnit(cardId);
        if (cardId === 'set-1-088') {
            player.fronts.left.supA = { keywords: [], equipment: null };
            player.fronts.left.supB = { keywords: [], equipment: null };
        }
        if (cardId === 'set-3-109' || cardId === 'set-3-112') {
            player.fronts.left.supA = {
                keywords: ['Mente Collettiva'],
                equipment: null
            };
            player.fronts.left.supB = {
                keywords: ['Mente Collettiva'],
                equipment: null
            };
        }
        const expected = cardId === 'set-1-087' ? 0 : expectedBonus;
        assert.equal(getUnitForceBonus(player, unit, 'left', 'line', opponent), expected, cardId);
    }
});

test('position-dependent Equipment bonuses and Support strength are applied', () => {
    const { player: linePlayer, unit: lineUnit } = playerWithUnit('set-1-081');
    assert.equal(getUnitForceBonus(linePlayer, lineUnit, 'left', 'line', null), 1);

    const { player: supportPlayer } = playerWithUnit('set-1-082', 'supA');
    supportPlayer.fronts.left.line = { keywords: [], equipment: null };
    assert.equal(getSupportBonus(supportPlayer, 'left'), 2);

    const { player: supportLinePlayer, unit: supportLineUnit } =
        playerWithUnit('set-1-081', 'supA');
    assert.equal(
        getUnitForceBonus(supportLinePlayer, supportLineUnit, 'left', 'supA', null),
        0
    );
});

test('Equipment-granted keywords are included in the equipped Unit keyword set', () => {
    const expectedKeywords = new Map([
        ['set-1-083', 'Ferocia'],
        ['set-1-086', 'Sorvolo'],
        ['set-1-090', 'Ferocia'],
        ['set-2-105', 'Logorare (1)'],
        ['set-2-111', 'Sorvolo'],
        ['set-2-112', 'Logorare (1)'],
        ['set-3-105', 'Logorare (1)'],
        ['set-3-110', 'Sorvolo']
    ]);

    for (const [cardId, keyword] of expectedKeywords) {
        const { player, unit } = playerWithUnit(cardId);
        assert.ok(getUnitKeywords(player, unit, 'left', 'line').includes(keyword), cardId);
    }
});

test('all Equipment damage-reduction values match their printed text', () => {
    const expectedReductions = new Map([
        ['set-1-080', 1],
        ['set-1-085', 2],
        ['set-2-106', 1],
        ['set-3-106', 1]
    ]);

    for (const [cardId, reduction] of expectedReductions) {
        const { player, unit } = playerWithUnit(cardId);
        assert.equal(getDamageReduction(player, unit, 'left', 'line'), reduction, cardId);
    }
});
