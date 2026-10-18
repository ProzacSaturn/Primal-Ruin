import test from 'node:test';
import assert from 'node:assert/strict';
import { initSettings, readSettingsPayload, serializeSettingsRecord } from '../src/settings.js';

const STORAGE_KEY = 'primal-ruin.settings.v1';
const QUARANTINE_KEY = 'primal-ruin.settings.quarantine';

class MemoryStorage {
    values = new Map();
    getItem(key) {
        return this.values.get(key) ?? null;
    }
    setItem(key, value) {
        this.values.set(key, String(value));
    }
}

function installDocument() {
    const elements = {
        'settings-audio': { checked: true, addEventListener() {} },
        'settings-animation-speed': { value: '1', addEventListener() {} },
        'settings-status': { textContent: '' }
    };
    globalThis.document = {
        getElementById(id) {
            return elements[id];
        },
        documentElement: { style: { setProperty() {} } },
        elements
    };
}

test('reads a legacy settings object and keeps the chosen values', () => {
    const parsed = readSettingsPayload(JSON.stringify({ audio: false, animationSpeed: 0 }));
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.settings, { audio: false, animationSpeed: 0 });
    assert.equal(parsed.version, 1);
});

test('keeps unknown settings fields and a newer version number', () => {
    const parsed = readSettingsPayload(
        JSON.stringify({ version: 4, audio: false, animationSpeed: 2, theme: 'notte' })
    );
    assert.equal(parsed.ok, true);
    assert.equal(parsed.version, 4);
    assert.deepEqual(parsed.extras, { theme: 'notte' });
    assert.equal(
        serializeSettingsRecord(parsed.version, parsed.settings, parsed.extras),
        JSON.stringify({ version: 4, theme: 'notte', audio: false, animationSpeed: 2 })
    );
});

test('replaces only the broken fields inside an otherwise valid settings object', () => {
    const parsed = readSettingsPayload(
        JSON.stringify({ version: 1, audio: 'forte', animationSpeed: 9, nickname: 'Primal' })
    );
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.settings, { audio: true, animationSpeed: 1 });
    assert.deepEqual(parsed.extras, { nickname: 'Primal' });
});

test('rejects corrupted settings so the caller can keep a copy', () => {
    assert.deepEqual(readSettingsPayload('{nope'), { ok: false, reason: 'json' });
    assert.deepEqual(readSettingsPayload(JSON.stringify(['audio'])), {
        ok: false,
        reason: 'shape'
    });
    assert.equal(readSettingsPayload(JSON.stringify({ version: 0, audio: true })).ok, false);
});

test('opening the page upgrades old settings without changing them', () => {
    globalThis.localStorage = new MemoryStorage();
    installDocument();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ audio: false, animationSpeed: 0.5 }));

    initSettings();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    assert.deepEqual(stored, { version: 1, audio: false, animationSpeed: 0.5 });
    assert.equal(document.elements['settings-audio'].checked, false);
    assert.equal(document.elements['settings-animation-speed'].value, '0.5');
});

test('opening the page parks unreadable settings before writing defaults', () => {
    globalThis.localStorage = new MemoryStorage();
    installDocument();
    const broken = '{rotto';
    localStorage.setItem(STORAGE_KEY, broken);

    initSettings();

    assert.equal(JSON.parse(localStorage.getItem(QUARANTINE_KEY)).payload, broken);
    assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).audio, true);
    assert.match(document.elements['settings-status'].textContent, /messa da parte/);
});
