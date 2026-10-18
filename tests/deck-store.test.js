import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../src/data/cards.json' with { type: 'json' };
import { loadCustomDeck, saveCustomDeck } from '../src/deck-builder.js';

const STORAGE_KEY = 'primal-ruin.custom-deck.v1';
const QUARANTINE_KEY = 'primal-ruin.custom-deck.quarantine';
const cardIds = catalog.cards
    .filter((card) => card.category !== 'commander')
    .slice(0, 40)
    .map((card) => card.id);

class MemoryStorage {
    values = new Map();
    getItem(key) {
        return this.values.get(key) ?? null;
    }
    setItem(key, value) {
        this.values.set(key, String(value));
    }
}

test('loads a legacy deck list and upgrades it on the next save', () => {
    globalThis.localStorage = new MemoryStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cardIds));

    assert.deepEqual(loadCustomDeck(), cardIds);
    assert.equal(localStorage.getItem(STORAGE_KEY), JSON.stringify(cardIds));

    saveCustomDeck(cardIds);
    assert.deepEqual(JSON.parse(localStorage.getItem(STORAGE_KEY)), {
        version: 1,
        cardIds
    });
});

test('keeps extra deck fields and a newer version when the list changes', () => {
    globalThis.localStorage = new MemoryStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, name: 'Giurassico', cardIds }));

    const swapped = [...cardIds.slice(1), cardIds[0]];
    saveCustomDeck(swapped);

    assert.deepEqual(JSON.parse(localStorage.getItem(STORAGE_KEY)), {
        version: 3,
        name: 'Giurassico',
        cardIds: swapped
    });
    assert.deepEqual(loadCustomDeck(), swapped);
});

test('parks an unreadable deck and still saves a new one', () => {
    globalThis.localStorage = new MemoryStorage();
    const broken = '{mazzo';
    localStorage.setItem(STORAGE_KEY, broken);

    assert.equal(loadCustomDeck(), null);
    assert.equal(JSON.parse(localStorage.getItem(QUARANTINE_KEY)).payload, broken);

    saveCustomDeck(cardIds);
    assert.deepEqual(JSON.parse(localStorage.getItem(STORAGE_KEY)).cardIds, cardIds);
    assert.equal(JSON.parse(localStorage.getItem(QUARANTINE_KEY)).payload, broken);
});

test('parks a deck with the wrong number of cards instead of using it', () => {
    globalThis.localStorage = new MemoryStorage();
    const raw = JSON.stringify({ version: 1, cardIds: cardIds.slice(0, 3) });
    localStorage.setItem(STORAGE_KEY, raw);

    assert.equal(loadCustomDeck(), null);
    assert.equal(JSON.parse(localStorage.getItem(QUARANTINE_KEY)).payload, raw);
    assert.equal(localStorage.getItem(STORAGE_KEY), raw);
});
