// Effetti implementati, raggruppati per keyword o per famiglia.
// Ogni id del gruppo è asserito. I buchi rispetto al regolamento sono `todo`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installHeadlessEnvironment } from './helpers/headless-env.js';
import {
    getDamageReduction,
    getSupportBonus,
    getUnitForceBonus,
    getUnitKeywords
} from '../src/permanent-effects.js';
import {
    getUnitEntryEffects,
    getUnitLineDestructionEffects
} from '../src/unit-triggers.js';
import catalog from '../src/data/cards.json' with { type: 'json' };

const env = installHeadlessEnvironment({ seed: 2 });
const { GameState } = await import('../game.js');
const { CombatResolver } = await import('../src/engine/combat.js');

function fresh() {
    env.storage.clear();
    env.setSeed(2);
    GameState.reset(null);
}

function emptyPlayer() {
    return {
        id: 'probe',
        sites: [],
        field: null,
        parasites: 0,
        fronts: {
            left: { line: null, supA: null, supB: null },
            center: { line: null, supA: null, supB: null },
            right: { line: null, supA: null, supB: null }
        }
    };
}

function piece(id, extra = {}) {
    const card = catalog.cards.find(item => item.id === id);
    return {
        ...card,
        id,
        catalogId: id,
        keywords: extra.keywords || [],
        currentForce: card?.force || extra.force || 1,
        force: card?.force || extra.force || 1,
        ...extra
    };
}

test('keyword Ferocia: +1 in Scontro solo con meno Unità', () => {
    fresh();
    for (const player of GameState.players) {
        for (const frontName of ['left', 'center', 'right']) {
            player.fronts[frontName] = { line: null, supA: null, supB: null };
        }
        player.sites = [];
        player.tacticEffects = {};
    }
    const ferocious = piece('set-1-001', { keywords: ['Ferocia'], currentForce: 2, force: 2 });
    GameState.players[0].fronts.left.line = ferocious;
    GameState.players[1].fronts.left.line = piece('set-1-007', { keywords: [], currentForce: 2, force: 2 });
    GameState.players[1].fronts.center.line = piece('set-1-007', { id: 'extra', keywords: [], currentForce: 1, force: 1 });
    assert.equal(CombatResolver.strength(GameState.players[0], 'left', null), 3);
    GameState.players[1].fronts.center.line = null;
    assert.equal(CombatResolver.strength(GameState.players[0], 'left', null), 2);
});

test('keyword Logorare: la Linea avversaria perde X Forza, mai sotto 0', () => {
    fresh();
    const printed = catalog.cards.find(card => card.id === 'set-2-025');
    assert.match(printed.rulesText, /Logorare \(2\)/);
    const wearer = piece('set-2-025', { keywords: ['Logorare (2)'], currentForce: 1, force: 1 });
    const victim = piece('set-1-007', { keywords: [], currentForce: 1, force: 1 });
    GameState.players[0].fronts.left.line = wearer;
    GameState.players[1].fronts.left.line = victim;
    assert.equal(CombatResolver.strength(GameState.players[1], 'left', wearer), 0);
});

test('keyword Mente Collettiva: +1 per altra copia nel Fronte, massimo +3', () => {
    fresh();
    const keywords = ['Mente Collettiva'];
    const make = id => piece('set-3-001', { id, keywords, currentForce: 1, force: 1 });
    const player = GameState.players[0];
    player.fronts.left.line = make('a');
    player.fronts.left.supA = make('b');
    player.fronts.left.supB = make('c');
    player.sites = [];
    player.tacticEffects = {};
    // 1 base + 2 Supporti + collettivo (3-1)=2 → 5. Il quarto alleato non sta nel Fronte.
    assert.equal(CombatResolver.strength(player, 'left', null), 5);
});

test('famiglia Supporto +2: il bonus del Fronte sale di 1 per quella Unità', () => {
    for (const id of ['set-1-009', 'set-1-043', 'set-3-009']) {
        const player = emptyPlayer();
        player.fronts.left.supA = piece(id);
        assert.equal(getSupportBonus(player, 'left'), 2, id);
    }
});

test('famiglia potenziamento Supporti: il totale resta al cap +3', () => {
    for (const id of ['set-1-030', 'set-1-049', 'set-3-046']) {
        const player = emptyPlayer();
        player.fronts.left.line = piece(id, { keywords: id === 'set-3-046' ? ['Mente Collettiva'] : [] });
        player.fronts.left.supA = piece('set-1-007', { id: `${id}-a` });
        player.fronts.left.supB = piece('set-1-007', { id: `${id}-b` });
        assert.equal(getSupportBonus(player, 'left'), 3, id);
    }
    for (const id of ['set-1-101', 'set-3-096']) {
        const player = emptyPlayer();
        player.sites = [{ catalogId: id, id }];
        player.fronts.left.supA = piece('set-1-007');
        player.fronts.left.supB = piece('set-1-007', { id: 'altro' });
        assert.equal(getSupportBonus(player, 'left'), 3, id);
    }
});

test('famiglia bonus di Forza condizionali sulle Unità', () => {
    const line = piece('set-1-007', { id: 'linea', keywords: [] });
    const cases = [
        ['set-1-020', 1, player => { player.fronts.left.supA = piece('set-1-007', { id: 's1' }); player.fronts.left.supB = piece('set-1-007', { id: 's2' }); }],
        ['set-1-058', 3, player => { player.fronts.left.supA = piece('set-1-007', { id: 's1' }); player.fronts.left.supB = piece('set-1-007', { id: 's2' }); }],
        ['set-3-040', 2, player => {
            player.fronts.left.line = piece('set-3-040', { keywords: ['Mente Collettiva'] });
            player.fronts.left.supA = piece('set-1-007', { id: 's1' });
            player.fronts.left.supB = piece('set-1-007', { id: 's2' });
        }],
        ['set-1-053', 1, player => {
            player.fronts.center.line = line;
            player.fronts.right.line = piece('set-1-007', { id: 'r' });
        }],
        ['set-1-054', 2, player => {
            player.fronts.center.line = line;
            player.fronts.right.line = piece('set-1-007', { id: 'r' });
        }],
        ['set-3-012', 1, (player, opponent) => { opponent.parasites = 1; }]
    ];
    for (const [id, expected, arrange] of cases) {
        const player = emptyPlayer();
        const opponent = emptyPlayer();
        opponent.fronts.center.line = piece('set-1-007', { id: 'o1' });
        opponent.fronts.right.line = piece('set-1-007', { id: 'o2' });
        const subject = piece(id, { keywords: id.startsWith('set-3-') ? ['Mente Collettiva'] : [] });
        player.fronts.left.line = subject;
        arrange(player, opponent);
        const placed = player.fronts.left.line;
        assert.equal(getUnitForceBonus(player, placed, 'left', 'line', opponent), expected, id);
    }
});

test('famiglia riduzione danni da Unità e Supporti', () => {
    const player = emptyPlayer();
    const guarded = piece('set-1-039');
    player.fronts.left.line = guarded;
    player.fronts.left.supA = piece('set-2-010');
    assert.equal(getDamageReduction(player, guarded, 'left', 'line'), 2);
    const wearer = piece('set-2-042');
    player.fronts.right.supA = wearer;
    player.fronts.right.line = piece('set-1-007', { id: 'linea-dx' });
    assert.equal(getDamageReduction(player, player.fronts.right.line, 'right', 'line'), 1);
});

test('famiglia ingressi: Parassita, indebolimento e pedina', () => {
    const expectations = [
        ['set-3-002', 'line', false, 'add-opponent-parasite'],
        ['set-3-044', 'line', false, 'add-opponent-parasite'],
        ['set-2-009', 'line', false, 'weaken-enemy-line-in-front'],
        ['set-2-013', 'supA', false, 'weaken-enemy-line-in-front'],
        ['set-3-020', 'supA', false, 'create-support-token'],
        ['set-2-020', 'line', true, 'weaken-enemy-line-in-front']
    ];
    for (const [id, slot, fromDiscard, type] of expectations) {
        const effects = getUnitEntryEffects(piece(id), slot, fromDiscard);
        assert.equal(effects.some(effect => effect.type === type), true, id);
    }
});

test('famiglia distruzione in Linea: danno al Comandante o pesca', () => {
    for (const [id, type] of [
        ['set-1-006', 'commander-damage'],
        ['set-1-055', 'commander-damage'],
        ['set-2-028', 'draw-card'],
        ['set-3-026', 'add-parasite']
    ]) {
        const effects = getUnitLineDestructionEffects(piece(id, { position: 'line' }));
        assert.equal(effects.some(effect => effect.type === type), true, id);
        assert.equal(getUnitLineDestructionEffects(piece(id, { position: 'supA' })).length, 0, id);
    }
});

test('famiglia Equipaggiamento innescato: pesca, Logorare riflesso, Parassita', async () => {
    fresh();
    const player = GameState.players[0];
    const opponent = GameState.players[1];
    for (const frontName of ['left', 'center', 'right']) {
        player.fronts[frontName] = { line: null, supA: null, supB: null };
        opponent.fronts[frontName] = { line: null, supA: null, supB: null };
    }
    player.armyDeck.push({ id: 'pescata', name: 'Pescata' });
    const host = piece('set-1-007', {
        id: 'host',
        front: 'left',
        position: 'line',
        currentForce: 3,
        force: 3,
        equipment: { catalogId: 'set-2-107', name: 'Tomo' }
    });
    player.fronts.left.line = host;
    const hand = player.hand.length;
    GameState.onEquipmentPositionEntry(player, host, 'line');
    assert.equal(player.hand.length, hand + 1);

    opponent.fronts.left.line = piece('set-1-007', { id: 'vittima', currentForce: 3, force: 3 });
    host.equipment = { catalogId: 'set-2-110', name: 'Sigillo' };
    CombatResolver.onForceLoss(player, host, 1, opponent, true);
    assert.equal(opponent.fronts.left.line.currentForce, 2);

    host.equipment = { catalogId: 'set-3-108', name: 'Lama' };
    const destroyed = piece('set-1-007', { id: 'morta', position: 'line' });
    CombatResolver.onUnitRemoved(opponent, destroyed, 'left', 'combat-destroy', player);
    assert.equal(opponent.parasites, 1);

    player.armyDeck = [{ id: 'supporto-pesca', name: 'Pescata supporto', keywords: [] }];
    host.equipment = { catalogId: 'set-3-107', name: 'Velo' };
    const beforeSupport = player.hand.length;
    GameState.onEquipmentPositionEntry(player, host, 'supA');
    assert.equal(player.hand.length, beforeSupport + 1);

    for (const frontName of ['left', 'center', 'right']) {
        opponent.fronts[frontName] = { line: null, supA: null, supB: null };
    }
    opponent.fronts.center.line = piece('set-1-007', {
        id: 'artiglio', currentForce: 4, force: 4, keywords: []
    });
    host.equipment = { catalogId: 'set-3-111', name: 'Artiglio' };
    GameState.onEquipmentPositionEntry(player, host, 'line');
    assert.equal(opponent.fronts.center.line.currentForce, 3);

    GameState.phase = 'scontro';
    host.equipment = { catalogId: 'set-1-089', name: 'Specchio' };
    host.currentForce = 3;
    player.fronts.left.line = host;
    opponent.fronts.left.line = piece('set-1-007', {
        id: 'riflesso', currentForce: 3, force: 3, keywords: []
    });
    await CombatResolver.damageLine(player, 'left', 1);
    assert.equal(host.currentForce, 2);
    assert.equal(opponent.fronts.left.line.currentForce, 2);

});

test('Catene dell’Abisso sposta un Supporto avversario quando la Linea equipaggiata distrugge', {
    todo: 'set-2-108: il testo sposta un Supporto avversario. onUnitRemoved cerca il Supporto sul giocatore opposto al proprietario della Linea distrutta, cioè su chi ha equipaggiato.'
}, () => {
    fresh();
    const player = GameState.players[0];
    const opponent = GameState.players[1];
    for (const frontName of ['left', 'center', 'right']) {
        player.fronts[frontName] = { line: null, supA: null, supB: null };
        opponent.fronts[frontName] = { line: null, supA: null, supB: null };
    }
    player.fronts.left.line = piece('set-1-007', {
        id: 'host',
        equipment: { catalogId: 'set-2-108', name: 'Catene' },
        keywords: []
    });
    const dragged = piece('set-1-007', { id: 'trascinato', position: 'supA', keywords: [] });
    opponent.fronts.left.supA = dragged;
    CombatResolver.onUnitRemoved(
        opponent,
        piece('set-1-007', { id: 'linea-catena', position: 'line', keywords: [] }),
        'left',
        'combat-destroy',
        player
    );
    assert.equal(dragged.front, 'center');
});

test('keyword Decadenza: a 0 segnalini il Sito è distrutto', () => {
    fresh();
    const player = GameState.players[0];
    const site = {
        id: 'tana',
        catalogId: 'set-1-091',
        name: 'Tana',
        decay: 1,
        decayRemaining: 1
    };
    player.sites = [site];
    GameState.resolvePermanentTurnStart(0);
    assert.equal(player.sites.length, 0);
    assert.equal(player.discard.some(card => card.id === 'tana'), true);
});

test('keyword Profanare: a 2 segnalini Rovina il Sito è distrutto', () => {
    fresh();
    const player = GameState.players[0];
    const target = { id: 'bersaglio', catalogId: 'set-1-098', name: 'Bersaglio', ruins: 0 };
    player.sites = [target];
    const activator = { id: 'profano', catalogId: 'set-2-088', name: 'Profanatore' };
    const choice = { ownerKey: 'player', zone: 'site', siteId: 'bersaglio' };
    GameState.resolveSiteActivation(activator, choice);
    assert.equal(target.ruins, 1);
    assert.equal(player.sites.length, 1);
    GameState.resolveSiteActivation(activator, choice);
    assert.equal(player.sites.length, 0);
    assert.equal(player.discard.some(card => card.id === 'bersaglio'), true);
});

test('keyword concesse dall’Equipaggiamento entrano nel profilo dell’Unità', () => {
    const player = emptyPlayer();
    const host = piece('set-1-007', {
        equipment: { catalogId: 'set-1-083', id: 'set-1-083' }
    });
    player.fronts.left.line = host;
    assert.ok(getUnitKeywords(player, host, 'left', 'line').includes('Ferocia'));
    host.equipment = { catalogId: 'set-2-105', id: 'set-2-105' };
    assert.ok(getUnitKeywords(player, host, 'left', 'line').some(keyword => keyword.startsWith('Logorare')));
});

test('Infiltrazione, Divinità e Ascensione sono keyword di regolamento senza carta stampata', {
    todo: '§7 le elenca per i tre set. Set.txt e cards.json non contengono i testi Tormento, Divinità, Ascensione o Infiltrazione (X): il motore le applica solo se keywords è già compilato.'
}, () => {
    const printed = catalog.cards.filter(card =>
        /Tormento|Divinità|Ascensione|Infiltrazione\s*\(/i.test(card.rulesText || '')
    );
    assert.ok(printed.length > 0);
});
