import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameSave, persistGame } from '../src/save-store.js';

class MemoryStorage {
    values = new Map();

    getItem(key) {
        return this.values.get(key) ?? null;
    }

    setItem(key, value) {
        this.values.set(key, String(value));
    }
}

const emptyPlayer = () => ({
    pc: 20,
    follia: 0,
    echo: 0,
    commanderId: 'cmd-1-01',
    commanderAbilityUsed: false,
    armyDeck: [],
    domainDeck: [],
    hand: [],
    discard: [],
    exile: [],
    domains: [],
    fronts: Object.fromEntries(['left', 'center', 'right'].map(front => [
        front,
        { line: null, supA: null, supB: null }
    ]))
});

test('persists and restores a versioned game snapshot', () => {
    globalThis.localStorage = new MemoryStorage();
    const snapshot = {
        players: [emptyPlayer(), emptyPlayer()],
        currentIndex: 0,
        phase: 'setup',
        turnNumber: 0,
        firstPlayerIndex: 1,
        firstTurn: true,
        mulliganUsed: false,
        gameOver: false,
        sorvoloUsed: [],
        randomState: 1
    };
    persistGame(snapshot);
    assert.deepEqual(loadGameSave(), snapshot);
});

test('rejects malformed or incompatible save data', () => {
    globalThis.localStorage = new MemoryStorage();
    localStorage.setItem('primal-ruin.game-save.v1', JSON.stringify({ version: 999, snapshot: {} }));
    assert.equal(loadGameSave(), null);
});
