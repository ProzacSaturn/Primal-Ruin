import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameSave, persistGame } from '../src/save-store.js';

const STORAGE_KEY = 'primal-ruin.game-save.v1';
const QUARANTINE_KEY = 'primal-ruin.game-save.quarantine';

class MemoryStorage {
    values = new Map();

    getItem(key) {
        return this.values.get(key) ?? null;
    }

    setItem(key, value) {
        this.values.set(key, String(value));
    }

    removeItem(key) {
        this.values.delete(key);
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
    fronts: Object.fromEntries(
        ['left', 'center', 'right'].map((front) => [front, { line: null, supA: null, supB: null }])
    )
});

function validSnapshot(extra = {}) {
    return {
        players: [emptyPlayer(), emptyPlayer()],
        currentIndex: 0,
        phase: 'setup',
        turnNumber: 0,
        firstPlayerIndex: 1,
        firstTurn: true,
        mulliganUsed: false,
        gameOver: false,
        sorvoloUsed: [],
        randomState: 1,
        ...extra
    };
}

test('persists and restores a versioned game snapshot', () => {
    globalThis.localStorage = new MemoryStorage();
    const snapshot = validSnapshot();
    persistGame(snapshot);
    assert.deepEqual(loadGameSave(), snapshot);
    assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).version, 3);
});

test('rejects a future save and keeps a copy aside', () => {
    globalThis.localStorage = new MemoryStorage();
    const raw = JSON.stringify({ version: 999, snapshot: {} });
    localStorage.setItem(STORAGE_KEY, raw);
    assert.equal(loadGameSave(), null);
    assert.equal(JSON.parse(localStorage.getItem(QUARANTINE_KEY)).payload, raw);
    assert.equal(localStorage.getItem(STORAGE_KEY), raw);
});

test('migrates an older valid save without dropping fields', () => {
    globalThis.localStorage = new MemoryStorage();
    const snapshot = validSnapshot({ note: 'da conservare' });
    const legacy = { version: 2, savedAt: '2020-01-01T00:00:00.000Z', note: 'busta', snapshot };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    assert.deepEqual(loadGameSave(), snapshot);

    const upgraded = JSON.parse(localStorage.getItem(STORAGE_KEY));
    assert.equal(upgraded.version, 3);
    assert.equal(upgraded.migratedFrom, 2);
    assert.equal(upgraded.note, 'busta');
    assert.equal(upgraded.snapshot.note, 'da conservare');
    assert.equal(upgraded.savedAt, legacy.savedAt);
});

test('migrates a legacy save that has no version stamp', () => {
    globalThis.localStorage = new MemoryStorage();
    const snapshot = validSnapshot();
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ savedAt: '2019-05-01T00:00:00.000Z', snapshot })
    );

    assert.deepEqual(loadGameSave(), snapshot);
    const upgraded = JSON.parse(localStorage.getItem(STORAGE_KEY));
    assert.equal(upgraded.version, 3);
    assert.equal(upgraded.migratedFrom, 0);
});

test('keeps a broken save aside so the next write does not erase it', () => {
    globalThis.localStorage = new MemoryStorage();
    const broken = '{ questo non è json';
    localStorage.setItem(STORAGE_KEY, broken);

    assert.equal(loadGameSave(), null);
    assert.equal(JSON.parse(localStorage.getItem(QUARANTINE_KEY)).payload, broken);

    persistGame(validSnapshot());
    assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).version, 3);
    assert.equal(JSON.parse(localStorage.getItem(QUARANTINE_KEY)).payload, broken);
});

test('rejects an older envelope whose snapshot is incomplete', () => {
    globalThis.localStorage = new MemoryStorage();
    const raw = JSON.stringify({ version: 1, snapshot: { phase: 'setup' } });
    localStorage.setItem(STORAGE_KEY, raw);
    assert.equal(loadGameSave(), null);
    assert.equal(JSON.parse(localStorage.getItem(QUARANTINE_KEY)).reason, 'invalid');
    assert.equal(localStorage.getItem(STORAGE_KEY), raw);
});

function saveRaw(snapshot) {
    return JSON.stringify({ version: 3, snapshot });
}

test('rejects a save with a hole where a discarded card should be', () => {
    globalThis.localStorage = new MemoryStorage();
    const snapshot = validSnapshot();
    snapshot.players[0].discard = [null];
    const raw = saveRaw(snapshot);
    localStorage.setItem(STORAGE_KEY, raw);
    assert.equal(loadGameSave(), null);
    assert.equal(JSON.parse(localStorage.getItem(QUARANTINE_KEY)).reason, 'invalid');
    assert.equal(localStorage.getItem(STORAGE_KEY), raw);
});

test('rejects a save with a hole where a domain should be', () => {
    globalThis.localStorage = new MemoryStorage();
    const snapshot = validSnapshot();
    snapshot.players[0].domains = [null];
    const raw = saveRaw(snapshot);
    localStorage.setItem(STORAGE_KEY, raw);
    assert.equal(loadGameSave(), null);
    assert.equal(JSON.parse(localStorage.getItem(QUARANTINE_KEY)).reason, 'invalid');
});

test('rejects a unit in hand that has no rules text', () => {
    globalThis.localStorage = new MemoryStorage();
    const snapshot = validSnapshot();
    snapshot.players[0].hand = [{ category: 'unit', keywords: [] }];
    localStorage.setItem(STORAGE_KEY, saveRaw(snapshot));
    assert.equal(loadGameSave(), null);
});

test('keeps a board token and a complete hand card', () => {
    globalThis.localStorage = new MemoryStorage();
    const snapshot = validSnapshot();
    snapshot.players[0].hand = [
        { category: 'unit', name: 'Raptor', rulesText: 'Nessuna abilità.', keywords: [] }
    ];
    snapshot.players[0].domains = [{ name: 'Dominio di Fuoco', tapped: false }];
    snapshot.players[0].fronts.left.line = {
        category: 'unit',
        name: 'Pedina Sciame',
        keywords: []
    };
    localStorage.setItem(STORAGE_KEY, saveRaw(snapshot));
    assert.deepEqual(loadGameSave(), snapshot);
});
