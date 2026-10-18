import test from 'node:test';
import assert from 'node:assert/strict';
import { applyStandardAscension } from '../src/keywords.js';
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
        ['set-2-079', 1],
        ['set-2-082', 1],
        ['set-2-083', 2],
        ['set-2-085', 1],
        ['set-2-086', 2],
        ['set-2-087', 2],
        ['set-2-088', 3],
        ['set-2-089', 2],
        ['set-2-090', 3],
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
    const expectedKeywords = [
        ['set-1-083', 'Ferocia'],
        ['set-1-086', 'Sorvolo'],
        ['set-1-090', 'Ferocia'],
        ['set-2-079', 'Tormento'],
        ['set-2-080', 'Logorare (1)'],
        ['set-2-083', 'Logorare (1)'],
        ['set-2-084', 'Ascensione'],
        ['set-2-085', 'Posizione Difensiva'],
        ['set-2-089', 'Tormento'],
        ['set-2-089', 'Eco Spettrale'],
        ['set-2-090', 'Logorare (1)'],
        ['set-2-090', 'Ascensione'],
        ['set-3-105', 'Logorare (1)'],
        ['set-3-110', 'Sorvolo']
    ];

    for (const [cardId, keyword] of expectedKeywords) {
        const { player, unit } = playerWithUnit(cardId);
        assert.ok(getUnitKeywords(player, unit, 'left', 'line').includes(keyword), cardId);
    }
});

test('Anello delle Ombre adds Support strength and Eco Spettrale only in Support', () => {
    const { player, unit } = playerWithUnit('set-2-081', 'supA');
    player.fronts.left.line = { keywords: [], equipment: null };
    assert.equal(getSupportBonus(player, 'left'), 2);
    assert.ok(getUnitKeywords(player, unit, 'left', 'supA').includes('Eco Spettrale'));
    const lined = playerWithUnit('set-2-081');
    assert.equal(
        getUnitKeywords(lined.player, lined.unit, 'left', 'line').includes('Eco Spettrale'),
        false
    );
});

test('Amuleto dell’Ascensione and Sigillo grant standard Ascension', () => {
    for (const cardId of ['set-2-084', 'set-2-090']) {
        const { unit } = playerWithUnit(cardId);
        unit.force = 3;
        unit.currentForce = 3;
        unit.keywords = [];
        assert.equal(applyStandardAscension(unit), true, cardId);
        assert.equal(unit.force, 4, cardId);
        assert.ok(unit.keywords.includes('Divinità'), cardId);
    }
});

test('Mantello della Disperazione lowers enemy units on the same front', () => {
    const { player, unit } = playerWithUnit('set-2-082');
    const opponent = {
        fronts: {
            left: {
                line: { keywords: [], equipment: null, force: 3 },
                supA: null,
                supB: null
            },
            center: { line: null, supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        }
    };
    assert.equal(getUnitForceBonus(player, unit, 'left', 'line', opponent), 1);
    assert.equal(
        getUnitForceBonus(opponent, opponent.fronts.left.line, 'left', 'line', player),
        -1
    );
});

test('all Equipment damage-reduction values match their printed text', () => {
    const expectedReductions = new Map([
        ['set-1-080', 1],
        ['set-1-085', 2],
        ['set-2-080', 1],
        ['set-2-086', 2],
        ['set-3-106', 1]
    ]);

    for (const [cardId, reduction] of expectedReductions) {
        const { player, unit } = playerWithUnit(cardId);
        assert.equal(getDamageReduction(player, unit, 'left', 'line'), reduction, cardId);
    }
});
