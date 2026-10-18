import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCardCost, markCardCostDiscountUsed } from '../src/card-costs.js';

test('equipment cost includes its printed Equip cost', () => {
    const player = { sites: [], field: null };
    assert.equal(calculateCardCost(player, {
        category: 'equipment',
        cost: 3,
        equipCost: 2
    }), 5);
});

test('Spectral Echo discounts apply and respect the minimum cost', () => {
    const player = {
        sites: [
            { id: 'set-2-081' },
            { id: 'set-2-096', discountTurn: 2 }
        ],
        field: { id: 'set-2-114' }
    };
    const unit = { category: 'unit', cost: 5, keywords: ['Eco Spettrale'] };

    assert.equal(calculateCardCost(player, unit, { turnNumber: 3 }), 2);
    assert.equal(calculateCardCost(player, unit, { fromDiscard: true, turnNumber: 3 }), 2);
    assert.equal(calculateCardCost(player, unit, { turnNumber: 2 }), 3);

    markCardCostDiscountUsed(player, unit, 3);
    assert.equal(player.sites[1].discountTurn, 3);
    assert.equal(calculateCardCost(player, unit, { turnNumber: 3 }), 3);
});

test('the opposing Silence Veil increases one-cost Tactics by one', () => {
    const player = { field: null, sites: [] };
    const opponent = { field: { id: 'set-2-117' }, sites: [] };
    const tactic = { category: 'tactic', cost: 1 };

    assert.equal(calculateCardCost(player, tactic, { players: [player, opponent] }), 2);
    assert.equal(calculateCardCost(opponent, tactic, { players: [player, opponent] }), 1);
});

test('the player without a spectral-discount Site does not consume one', () => {
    const player = { sites: [], field: null };
    markCardCostDiscountUsed(player, {
        category: 'unit',
        keywords: ['Eco Spettrale']
    }, 1);
    assert.deepEqual(player.sites, []);
});

test('the once-per-turn spectral discount is not consumed when it cannot reduce payment', () => {
    const player = {
        sites: [
            { id: 'set-2-081' },
            { id: 'set-2-096', discountTurn: null }
        ],
        field: { id: 'set-2-114' }
    };
    const unit = { category: 'unit', cost: 1, keywords: ['Eco Spettrale'] };

    assert.equal(calculateCardCost(player, unit, { turnNumber: 4 }), 1);
    markCardCostDiscountUsed(player, unit, 4);
    assert.equal(player.sites[1].discountTurn, null);
});

test('Support Units discount spectral Unit and increase one-cost Tactic payment', () => {
    const makePlayer = (cardId, slotName = 'supA') => ({
        sites: [],
        field: null,
        fronts: {
            left: {
                line: slotName === 'line' ? { catalogId: cardId } : null,
                supA: slotName === 'supA' ? { catalogId: cardId } : null,
                supB: slotName === 'supB' ? { catalogId: cardId } : null
            },
            center: { line: null, supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        }
    });
    const spectralUnit = {
        category: 'unit',
        cost: 3,
        keywords: ['Eco Spettrale']
    };
    const oneCostTactic = { category: 'tactic', cost: 1 };
    const player = makePlayer('set-2-023');

    assert.equal(calculateCardCost(player, spectralUnit), 2);
    for (const opponent of [
        makePlayer('set-2-032'),
        makePlayer('set-3-028', 'line')
    ]) {
        assert.equal(
            calculateCardCost(player, oneCostTactic, { players: [player, opponent] }),
            2
        );
    }
});
