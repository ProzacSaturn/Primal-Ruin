import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateUnitCombatStrength,
    checkDeployment,
    compareCombatStrengths,
    defaultPromotionSlot,
    shouldUseTorment
} from '../src/game-rules.js';

test('adds at most three standard support bonuses', () => {
    const line = { currentForce: 4, keywords: [] };
    assert.equal(calculateUnitCombatStrength({
        line,
        supportCount: 3,
        collectiveCount: 0,
        fewerUnits: false,
        logorare: 0
    }), 7);
    assert.equal(calculateUnitCombatStrength({
        line,
        supportCount: 4,
        collectiveCount: 0,
        fewerUnits: false,
        logorare: 0
    }), 7);
});

test('enhanced support bonuses are two each but capped at three', () => {
    assert.equal(calculateUnitCombatStrength({
        line: { currentForce: 4, keywords: [] },
        supportCount: 1,
        supportBonusPerUnit: 2,
        supportBonusCap: 3,
        collectiveCount: 0,
        fewerUnits: false,
        logorare: 0
    }), 6);
    assert.equal(calculateUnitCombatStrength({
        line: { currentForce: 4, keywords: [] },
        supportCount: 2,
        supportBonusPerUnit: 2,
        supportBonusCap: 3,
        collectiveCount: 0,
        fewerUnits: false,
        logorare: 0
    }), 7);
});

test('applies Ferocia only when its controller has fewer units', () => {
    const line = { currentForce: 2, keywords: ['Ferocia'] };
    const shared = { line, supportCount: 0, collectiveCount: 0, logorare: 0 };
    assert.equal(calculateUnitCombatStrength({ ...shared, fewerUnits: true }), 3);
    assert.equal(calculateUnitCombatStrength({ ...shared, fewerUnits: false }), 2);
});

test('Mente Collettiva scales to its +3 cap and Logorare cannot reduce force below zero', () => {
    const line = { currentForce: 3, keywords: ['Mente Collettiva'] };
    assert.equal(calculateUnitCombatStrength({
        line,
        supportCount: 0,
        collectiveCount: 9,
        fewerUnits: false,
        logorare: 0
    }), 6);
    assert.equal(calculateUnitCombatStrength({
        line: { currentForce: 1, keywords: [] },
        supportCount: 0,
        collectiveCount: 0,
        fewerUnits: false,
        logorare: 9
    }), 0);
});

test('combat comparison returns exact margin and tie', () => {
    assert.deepEqual(compareCombatStrengths(7, 4), { result: 'left-wins', margin: 3 });
    assert.deepEqual(compareCombatStrengths(2, 6), { result: 'right-wins', margin: 4 });
    assert.deepEqual(compareCombatStrengths(5, 5), { result: 'tie', margin: 0 });
});

test('chooses the only lethal Torment outcome', () => {
    assert.equal(shouldUseTorment({
        commanderPc: 2,
        madness: 7,
        commanderDamage: 3,
        torment: 2
    }), false);
    assert.equal(shouldUseTorment({
        commanderPc: 4,
        madness: 8,
        commanderDamage: 2,
        torment: 2
    }), true);
});

test('AI prefers the Torment outcome that makes more relative victory progress', () => {
    assert.equal(shouldUseTorment({
        commanderPc: 20,
        madness: 8,
        commanderDamage: 2,
        torment: 2
    }), true);
    assert.equal(shouldUseTorment({
        commanderPc: 3,
        madness: 0,
        commanderDamage: 2,
        torment: 1
    }), false);
});

test('su un Fronte libero la prima Unità entra in Linea, non in Supporto', () => {
    const emptyFront = { line: null, supA: null, supB: null };
    assert.deepEqual(
        checkDeployment({ keywords: [] }, emptyFront, 'line'),
        { legal: true, assaultSwap: false }
    );
    assert.equal(checkDeployment({ keywords: [] }, emptyFront, 'supA').legal, false);
    assert.equal(checkDeployment({ keywords: ['Assalto'] }, emptyFront, 'line').legal, true);
    assert.equal(checkDeployment({ keywords: ['Posizione Difensiva'] }, emptyFront, 'line').legal, true);
    assert.equal(checkDeployment({ keywords: ['Posizione Difensiva'] }, emptyFront, 'supA').legal, false);
});

test('con la Linea occupata l’Unità può entrare in Supporto', () => {
    const occupied = { line: {}, supA: null, supB: null };
    assert.equal(checkDeployment({ keywords: [] }, occupied, 'supA').legal, true);
    assert.equal(checkDeployment({ keywords: [] }, occupied, 'line').legal, false);
});

test('Assalto can replace the line only when a support slot can receive it', () => {
    const frontWithOpenSupport = { line: {}, supA: null, supB: {} };
    const fullFront = { line: {}, supA: {}, supB: {} };
    const ownSites = [{ catalogId: 'set-1-098' }];
    assert.equal(checkDeployment(
        { keywords: ['Assalto'] },
        frontWithOpenSupport,
        'line',
        { ownSites }
    ).assaultSwap, true);
    assert.equal(checkDeployment(
        { keywords: ['Assalto'] },
        fullFront,
        'line',
        { ownSites }
    ).legal, false);
});

test('Vallata del Terrore blocks opponent Line entry but still permits Support entry', () => {
    const emptyFront = { line: null, supA: null, supB: null };
    const opposingSites = [{ catalogId: 'set-1-105' }];
    const unit = { force: 4, keywords: ['Assalto'] };

    assert.deepEqual(
        checkDeployment(unit, emptyFront, 'line', { opposingSites }),
        { legal: false, assaultSwap: false }
    );
    assert.deepEqual(
        checkDeployment(unit, emptyFront, 'supA', { opposingSites }),
        { legal: true, assaultSwap: false }
    );
    assert.equal(
        checkDeployment(unit, emptyFront, 'line', {
            ownSites: opposingSites
        }).legal,
        true
    );
});

test('Sala dei Lamenti restricts only opposing Units with Force three or less', () => {
    const emptyFront = { line: null, supA: null, supB: null };
    const opposingSites = [{ catalogId: 'set-2-094' }];

    assert.equal(checkDeployment(
        { force: 3, keywords: ['Assalto'] },
        emptyFront,
        'line',
        { opposingSites }
    ).legal, false);
    assert.equal(checkDeployment(
        { force: 4, keywords: ['Assalto'] },
        emptyFront,
        'line',
        { opposingSites }
    ).legal, true);
    assert.equal(checkDeployment(
        { force: 3, keywords: ['Assalto'] },
        emptyFront,
        'line',
        { ownSites: opposingSites }
    ).legal, true);
});

test('il Velo della Conquista permette il Supporto anche senza Linea', () => {
    const unit = { force: 2, keywords: [] };
    const frontWithLine = { line: {}, supA: null, supB: null };
    const frontWithoutLine = { line: null, supA: null, supB: null };

    assert.equal(checkDeployment(unit, frontWithLine, 'supA').legal, true);
    assert.equal(checkDeployment(unit, frontWithoutLine, 'supA').legal, false);
    assert.equal(checkDeployment(unit, frontWithoutLine, 'supA', {
        ownField: { catalogId: 'set-3-118' }
    }).legal, true);
});

test('default promotion picks the strongest support and favours supA on ties', () => {
    assert.equal(defaultPromotionSlot(
        { supA: { currentForce: 2 }, supB: { currentForce: 5 } }
    ), 'supB');
    assert.equal(defaultPromotionSlot(
        { supA: { currentForce: 4 }, supB: { currentForce: 4 } }
    ), 'supA');
    assert.equal(defaultPromotionSlot(
        { supA: { currentForce: 3 }, supB: null }
    ), 'supA');
    assert.equal(defaultPromotionSlot(
        { supA: null, supB: { currentForce: 1 } }
    ), 'supB');
});

test('default promotion returns null when no support is available', () => {
    assert.equal(defaultPromotionSlot({ supA: null, supB: null }), null);
    assert.equal(defaultPromotionSlot(undefined), null);
});
