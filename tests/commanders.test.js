import test from 'node:test';
import assert from 'node:assert/strict';
import {
    COMMANDERS,
    commanderForSet,
    defaultCommanderId,
    evaluateCommanderAbility,
    getCommander,
    listCommanders,
    validateCommander
} from '../src/commanders.js';

test('il roster è valido e completo', () => {
    assert.ok(COMMANDERS.length >= 1);
    for (const commander of COMMANDERS) {
        assert.deepEqual(validateCommander(commander), [], `problemi su ${commander.id}`);
    }
});

test('gli id dei Comandanti sono univoci', () => {
    const ids = COMMANDERS.map(commander => commander.id);
    assert.equal(new Set(ids).size, ids.length);
});

test('getCommander risolve gli id noti e ignora quelli sconosciuti', () => {
    assert.equal(getCommander(COMMANDERS[0].id).name, COMMANDERS[0].name);
    assert.equal(getCommander('cmd-inesistente'), null);
});

test('defaultCommanderId indica il primo Comandante del roster', () => {
    assert.equal(defaultCommanderId(), COMMANDERS[0].id);
});

test('commanderForSet restituisce un Comandante del set richiesto', () => {
    for (const setId of ['set-1', 'set-2', 'set-3']) {
        const id = commanderForSet(setId);
        assert.equal(getCommander(id).setId, setId);
    }
});

test('commanderForSet ricade su un Comandante valido per set sconosciuti', () => {
    assert.equal(commanderForSet('set-99'), COMMANDERS[0].id);
});

test('listCommanders espone solo i metadati pubblici', () => {
    const [entry] = listCommanders();
    assert.deepEqual(Object.keys(entry).sort(), ['id', 'name', 'pc', 'provisional', 'setId']);
});

test('gainEcho bersaglia di default l\u2019attore', () => {
    const ability = { ops: [{ type: 'gainEcho', amount: 2 }] };
    assert.deepEqual(evaluateCommanderAbility(ability, { self: {} }).effects,
        [{ kind: 'gainEcho', target: 'self', amount: 2 }]);
});

test('addMadness bersaglia di default l\u2019avversario', () => {
    const ability = { ops: [{ type: 'addMadness', amount: 1 }] };
    assert.deepEqual(evaluateCommanderAbility(ability, { self: {} }).effects,
        [{ kind: 'addMadness', target: 'opponent', amount: 1 }]);
});

test('il bersaglio esplicito prevale sul default', () => {
    const ability = { ops: [{ type: 'addParasite', target: 'self', amount: 1 }] };
    assert.deepEqual(evaluateCommanderAbility(ability, { self: {} }).effects,
        [{ kind: 'addParasite', target: 'self', amount: 1 }]);
});

test('la condizione sulla Follia blocca o consente l\u2019abilità', () => {
    const ability = {
        condition: { type: 'madnessAtMost', value: 0 },
        ops: [{ type: 'gainEcho', amount: 1 }]
    };
    assert.equal(evaluateCommanderAbility(ability, { self: { follia: 0 } }).ok, true);
    const blocked = evaluateCommanderAbility(ability, { self: { follia: 1 } });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.reason, 'condition-not-met');
});

test('op sconosciute, importi non validi e abilità assenti falliscono in modo esplicito', () => {
    assert.equal(evaluateCommanderAbility(null, { self: {} }).reason, 'missing-ability');
    assert.match(evaluateCommanderAbility({ ops: [{ type: 'boom', amount: 1 }] }, { self: {} }).reason,
        /^unsupported-op/);
    assert.equal(evaluateCommanderAbility({ ops: [{ type: 'gainEcho', amount: 0 }] }, { self: {} }).reason,
        'invalid-amount');
    assert.equal(evaluateCommanderAbility({ ops: [] }, { self: {} }).reason, 'missing-ops');
});

test('evaluateCommanderAbility non modifica l\u2019attore', () => {
    const self = { follia: 0, echo: 0 };
    evaluateCommanderAbility({ ops: [{ type: 'gainEcho', amount: 1 }] }, { self });
    assert.deepEqual(self, { follia: 0, echo: 0 });
});
