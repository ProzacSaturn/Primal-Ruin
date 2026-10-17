// Test di composizione del Mazzo Esercito: quota per categoria (§1 della guida
// al deckbuilding) e curva dei costi (§2), su tutti i set del catalogo.
import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../src/data/cards.json' with { type: 'json' };
import {
    ARMY_COST_QUOTAS,
    ARMY_DECK_COMPOSITION,
    composeArmyDeck,
    costBand
} from '../src/deck-composition.js';
import { seedRandom } from '../src/random.js';

const SET_IDS = ['set-1', 'set-2', 'set-3'];
const BAND_BOUNDS = [[10, 12], [14, 16], [8, 10], [2, 4]];

function countBy(items, key) {
    return items.reduce((counts, item) => {
        const name = key(item);
        counts[name] = (counts[name] || 0) + 1;
        return counts;
    }, {});
}

test('le quote di costo di default stanno negli intervalli della guida §2 e sommano 40', () => {
    assert.equal(ARMY_COST_QUOTAS.length, BAND_BOUNDS.length);
    ARMY_COST_QUOTAS.forEach((quota, band) => {
        const [min, max] = BAND_BOUNDS[band];
        assert.ok(quota >= min && quota <= max, `fascia ${band}: ${quota} fuori da ${min}-${max}`);
    });
    assert.equal(ARMY_COST_QUOTAS.reduce((sum, quota) => sum + quota, 0), 40);
});

test('la composizione di default sta nei range per categoria della guida §1', () => {
    for (const [category, [min, max]] of Object.entries({
        unit: [20, 22],
        tactic: [12, 14],
        equipment: [4, 6]
    })) {
        const quantity = ARMY_DECK_COMPOSITION[category];
        assert.ok(quantity >= min && quantity <= max, `${category}: ${quantity} fuori da ${min}-${max}`);
    }
    const sitesAndFields = ARMY_DECK_COMPOSITION.site + ARMY_DECK_COMPOSITION.field;
    assert.ok(sitesAndFields >= 2 && sitesAndFields <= 4, `Siti e Campi: ${sitesAndFields}`);
    assert.equal(
        Object.values(ARMY_DECK_COMPOSITION).reduce((sum, quantity) => sum + quantity, 0),
        40
    );
});

test('la fascia di costo raggruppa le carte in 1-2, 3-4, 5-6 e 7+', () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 12].map(costBand), [0, 0, 0, 1, 1, 2, 2, 3, 3]);
});

for (const setId of SET_IDS) {
    test(`il mazzo di ${setId} rispetta categoria e curva dei costi`, () => {
        seedRandom(7);
        const pool = catalog.cards.filter(card => card.setId === setId);
        const { cards, exact } = composeArmyDeck(pool, { label: setId });

        assert.equal(exact, true, `${setId}: la curva dei costi è stata approssimata`);
        assert.equal(cards.length, 40);
        assert.equal(new Set(cards.map(card => card.id)).size, 40, 'nessun duplicato');
        assert.ok(cards.every(card => card.setId === setId));
        assert.deepEqual(countBy(cards, card => card.category), ARMY_DECK_COMPOSITION);
        assert.deepEqual(
            BAND_BOUNDS.map((_, band) => cards.filter(card => costBand(card.cost ?? 0) === band).length),
            ARMY_COST_QUOTAS
        );
    });
}

test('le carte a basso costo sono sempre presenti in apertura', () => {
    for (const setId of SET_IDS) {
        seedRandom(3);
        const { cards } = composeArmyDeck(
            catalog.cards.filter(card => card.setId === setId),
            { label: setId }
        );
        const cheap = cards.filter(card => (card.cost ?? 0) <= 2);
        assert.ok(cheap.length >= 10, `${setId}: solo ${cheap.length} carte a costo 1-2`);
        assert.ok(cheap.some(card => card.category === 'unit'), `${setId}: nessuna Unità a costo 1-2`);
    }
});

test('un set ristretto approssima la curva ma mantiene la composizione per categoria', () => {
    const synthetic = [
        ...Array.from({ length: 4 }, (_, index) => ({
            id: `unit-${index}`, category: 'unit', cost: 5
        })),
        ...Array.from({ length: 4 }, (_, index) => ({
            id: `tactic-${index}`, category: 'tactic', cost: 7
        }))
    ];
    const { cards, exact } = composeArmyDeck(synthetic, {
        composition: { unit: 2, tactic: 2 },
        quotas: [2, 2, 0, 0],
        label: 'set-x'
    });

    assert.equal(exact, false);
    assert.equal(cards.length, 4);
    assert.deepEqual(countBy(cards, card => card.category), { unit: 2, tactic: 2 });
});

test('rifiuta un set senza carte sufficienti per una categoria', () => {
    assert.throws(
        () => composeArmyDeck([{ id: 'unit-0', category: 'unit', cost: 1 }], {
            composition: { unit: 2 },
            quotas: [2, 0, 0, 0],
            label: 'set-x'
        }),
        /Il set set-x ha solo 1 carte "unit": ne servono 2\./
    );
});
