// Famiglie di effetti permanenti ancora senza un caso dedicato.
// Ogni id è esercitato sulla funzione che lo implementa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installHeadlessEnvironment } from './helpers/headless-env.js';
import { checkDeployment } from '../src/game-rules.js';
import {
    getDamageReduction,
    getSupportBonus,
    getUnitForceBonus,
    getUnitKeywords
} from '../src/permanent-effects.js';
import { getUnitEntryEffects } from '../src/unit-triggers.js';
import catalog from '../src/data/cards.json' with { type: 'json' };

const env = installHeadlessEnvironment({ seed: 4 });
const { GameController, GameState } = await import('../game.js');
const { CombatResolver } = await import('../src/engine/combat.js');
const { UIRenderer } = await import('../src/engine/renderer.js');
const { getTacticChoices } = await import('../src/engine/tactic-choices.js');

const FRONTS = ['left', 'center', 'right'];
const SLOTS = ['line', 'supA', 'supB'];
let player;
let opponent;

function prepare() {
    env.storage.clear();
    env.setSeed(4);
    GameState.reset(null);
    for (const player of GameState.players) {
        for (const frontName of FRONTS) {
            player.fronts[frontName] = { line: null, supA: null, supB: null };
        }
        player.sites = [];
        player.field = null;
        player.armyDeck = [];
        player.domainDeck = [];
        player.discard = [];
        player.hand = [];
        player.parasites = 0;
        player.pc = 20;
        player.follia = 0;
        player.echo = 0;
        player.tacticEffects = {};
        player.frontWinsThisTurn = 0;
    }
    GameState.phase = 'principale';
    GameState.currentIndex = 0;
    GameState.gameOver = false;
    GameState.pendingTactic = null;
    GameState.pendingSorvolo = false;
    GameState.sacrifice = null;
    player = GameState.players[0];
    opponent = GameState.players[1];
}

function board() {
    return {
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

function card(id, extra = {}) {
    const printed = catalog.cards.find(item => item.id === id);
    return {
        ...printed,
        id: extra.id || id,
        catalogId: id,
        name: printed?.name || id,
        keywords: [],
        force: printed?.force || 1,
        currentForce: printed?.force || 1,
        position: 'line',
        front: 'left',
        equipment: null,
        ...extra
    };
}

function permanent(id) {
    const printed = catalog.cards.find(item => item.id === id);
    return { id, catalogId: id, name: printed?.name || id, keywords: [] };
}

function occupant(player) {
    return FRONTS.flatMap(frontName => SLOTS.map(slot => player.fronts[frontName][slot])).find(Boolean);
}

test('famiglia bonus di Forza e keyword da Unità, Siti e Campi', () => {
    const cases = [
        ['set-1-033', 1, (player, unit) => { player.fronts.left.line = unit; }],
        ['set-1-036', 1, (player, unit) => {
            player.fronts.left.line = unit;
            player.fronts.left.supA = card('set-1-007', { id: 'raptor', type: 'Raptor' });
        }],
        ['set-3-007', 1, (player, unit, opponent) => {
            player.fronts.left.line = unit;
            opponent.fronts.left.line = card('set-1-007', { id: 'ferita', forceLostThisTurn: 1 });
        }],
        ['set-3-022', 1, (player, unit, opponent) => {
            player.fronts.left.line = unit;
            opponent.fronts.center.line = card('set-1-007', { id: 'o1' });
            opponent.fronts.right.line = card('set-1-007', { id: 'o2' });
        }],
        ['set-3-025', 1, player => {
            player.fronts.left.line = card('set-1-007', { id: 'collettiva', keywords: ['Mente Collettiva'] });
            player.fronts.left.supA = card('set-3-025');
        }],
        ['set-3-033', 1, (player, unit) => {
            player.fronts.left.line = unit;
            player.fronts.left.supA = card('set-1-007', { id: 'sciame', type: 'Sciame' });
        }],
        ['set-3-055', 1, (player, unit) => {
            unit.keywords = ['Mente Collettiva'];
            player.fronts.left.line = unit;
            player.fronts.center.line = card('set-3-055', { id: 'regina' });
        }]
    ];
    for (const [id, expected, arrange] of cases) {
        const player = board();
        const opponent = board();
        const unit = card(id);
        arrange(player, unit, opponent);
        const subject = id === 'set-3-025' ? player.fronts.left.line : unit;
        assert.equal(
            getUnitForceBonus(player, subject, 'left', 'line', opponent),
            expected,
            id
        );
    }

    const guarded = board();
    const bulky = card('set-2-026');
    guarded.fronts.left.line = bulky;
    assert.equal(getDamageReduction(guarded, bulky, 'left', 'line'), 1, 'set-2-026');

    const ferocitySite = board();
    ferocitySite.sites = [permanent('set-1-095')];
    const fierce = card('set-1-001', { keywords: ['Ferocia'] });
    ferocitySite.fronts.left.line = fierce;
    assert.equal(getUnitForceBonus(ferocitySite, fierce, 'left', 'line', board()), 1, 'set-1-095');

    const lineSite = board();
    lineSite.sites = [permanent('set-1-109')];
    const line = card('set-1-007');
    lineSite.fronts.left.line = line;
    assert.equal(getUnitForceBonus(lineSite, line, 'left', 'line', board()), 1, 'set-1-109');

    const wearSite = board();
    wearSite.sites = [permanent('set-2-089'), permanent('set-2-104')];
    const wearer = card('set-2-025', { keywords: ['Logorare (2)'] });
    wearSite.fronts.left.line = wearer;
    assert.equal(getUnitForceBonus(wearSite, wearer, 'left', 'line', board()), 2, 'set-2-089+104');
    assert.ok(getUnitKeywords(wearSite, wearer, 'left', 'line').includes('Logorare (1)'), 'set-2-104');

    const hive = board();
    hive.sites = [permanent('set-1-100')];
    const heavy = card('set-1-007', { force: 5, currentForce: 5 });
    hive.fronts.left.line = heavy;
    assert.ok(getUnitKeywords(hive, heavy, 'left', 'line').includes('Ferocia'), 'set-1-100');

    const raptorNest = board();
    raptorNest.sites = [permanent('set-1-107')];
    raptorNest.fronts.left.supA = card('set-1-007', { type: 'Raptor' });
    assert.equal(getSupportBonus(raptorNest, 'left'), 2, 'set-1-107');

    const collectiveSite = board();
    collectiveSite.sites = [permanent('set-3-091'), permanent('set-3-103')];
    const mind = card('set-3-001', { keywords: ['Mente Collettiva'] });
    collectiveSite.fronts.left.line = mind;
    assert.equal(getUnitForceBonus(collectiveSite, mind, 'left', 'line', board()), 3, 'set-3-091+103');

    const supportMind = board();
    supportMind.sites = [permanent('set-3-086')];
    const helper = card('set-3-001', { keywords: ['Mente Collettiva'], position: 'supA' });
    supportMind.fronts.left.supA = helper;
    assert.equal(getUnitForceBonus(supportMind, helper, 'left', 'supA', board()), 1, 'set-3-086');

    const fieldCases = [
        ['set-1-111', card('set-1-007', { force: 4 }), 'Ferocia', 'keywords'],
        ['set-1-112', card('set-1-007'), 1, 'more-units'],
        ['set-1-118', card('set-1-007'), 1, 'line'],
        ['set-2-113', card('set-2-025', { keywords: ['Logorare (1)'] }), 1, 'line'],
        ['set-2-120', card('set-2-025', { keywords: ['Logorare (1)'] }), 2, 'line'],
        ['set-3-112', card('set-3-001', { keywords: ['Mente Collettiva'] }), 1, 'line'],
        ['set-3-113', card('set-1-007', { keywords: ['Sorvolo'] }), 1, 'line']
    ];
    for (const [id, unit, expected] of fieldCases) {
        const player = board();
        const opponent = board();
        player.field = permanent(id);
        player.fronts.left.line = unit;
        if (id === 'set-1-112') opponent.fronts = board().fronts;
        if (id === 'set-1-111') {
            assert.ok(getUnitKeywords(player, unit, 'left', 'line').includes(expected), id);
        } else {
            assert.equal(getUnitForceBonus(player, unit, 'left', 'line', opponent), expected, id);
        }
    }
    const pressed = board();
    const pressedLine = card('set-1-007');
    pressed.fronts.left.line = pressedLine;
    const suppressor = board();
    suppressor.field = permanent('set-1-118');
    assert.equal(getUnitForceBonus(pressed, pressedLine, 'left', 'line', suppressor), -1, 'set-1-118 avversario');
});

test('famiglia ingressi Unità: indebolimento dagli scarti, Logorare di Linea, Parassita', () => {
    assert.equal(
        getUnitEntryEffects(card('set-2-031'), 'line', true)[0]?.type,
        'weaken-enemy-line-in-front'
    );
    assert.equal(getUnitEntryEffects(card('set-2-040'), 'line', false)[0]?.amount, 2);
    assert.equal(getUnitEntryEffects(card('set-3-014'), 'supA', false)[0]?.type, 'add-opponent-parasite');
});

test('famiglia ingressi permanenti: pesca, pedina, Parassita e spostamento', () => {
    prepare();
    for (const id of ['set-1-097', 'set-2-083']) {
        prepare();
        GameState.players[0].armyDeck = [{ id: `pesca-${id}`, name: id, keywords: [] }];
        GameController.onPermanentEntry(GameState.players[0], permanent(id));
        assert.equal(GameState.players[0].hand.at(-1).id, `pesca-${id}`, id);
    }
    prepare();
    GameController.onPermanentEntry(GameState.players[0], permanent('set-3-090'));
    assert.equal(occupant(GameState.players[0])?.name, 'Pedina Sciame');

    for (const id of ['set-3-083', 'set-3-098']) {
        prepare();
        GameState.players[0].sites = [permanent(id)];
        const unit = card('set-1-007', { keywords: [] });
        GameState.players[0].fronts.left.supA = unit;
        GameState.onUnitEntry(GameState.players[0], unit, 'left', 'supA');
        assert.equal(GameState.players[1].parasites, 1, id);
    }

    prepare();
    player.sites = [permanent('set-1-092')];
    player.armyDeck = [{ id: 'nido', name: 'Nido', keywords: [] }];
    const entered = card('set-1-007');
    player.fronts.left.line = entered;
    GameState.onUnitEntry(player, entered, 'left', 'line');
    assert.equal(player.hand.at(-1).id, 'nido');
    assert.equal(player.sites.length, 0);

    prepare();
    GameState.players[0].sites = [permanent('set-2-087')];
    GameState.players[0].armyDeck = [{ id: 'putrido', name: 'Putrido', keywords: [] }];
    const spectral = card('set-1-007', { keywords: ['Eco Spettrale'] });
    GameState.onUnitEntry(GameState.players[0], spectral, 'left', 'line', true);
    assert.equal(GameState.players[0].hand.at(-1).id, 'putrido');

    prepare();
    GameState.players[0].sites = [permanent('set-3-097')];
    opponent.fronts.left.supA = card('set-1-007', { id: 'ostaggio' });
    const walker = card('set-1-007', { id: 'ingresso' });
    player.fronts.left.supA = walker;
    GameState.onUnitEntry(player, walker, 'left', 'supA');
    assert.equal(GameState.pendingTactic?.mode, 'site-support-move');
});

test('famiglia inizio turno: Decadenza, ricerca, scarti, pedine e spostamento', () => {
    prepare();
    const nest = permanent('set-1-094');
    nest.decayRemaining = 1;
    GameState.players[0].sites = [nest];
    GameState.resolvePermanentTurnStart(0);
    assert.equal(occupant(GameState.players[0])?.name, 'Pedina Raptor');
    assert.equal(occupant(GameState.players[0]).force, 2);

    prepare();
    player.sites = [permanent('set-1-108')];
    player.armyDeck = [
        { id: 'soldato', name: 'Soldato', type: 'Guerriero', keywords: [] },
        { id: 'raptor-cima', name: 'Raptor', type: 'Raptor', keywords: [] }
    ];
    GameState.resolvePermanentTurnStart(0);
    assert.equal(player.armyDeck.at(-1).id, 'raptor-cima');

    prepare();
    GameState.players[0].sites = [permanent('set-2-079')];
    GameState.players[0].armyDeck = [{ id: 'cima', name: 'CimaSepolta', keywords: [] }];
    GameState.resolvePermanentTurnStart(0);
    assert.match(env.logLines().join('\n'), /CimaSepolta/);

    for (const id of ['set-2-090', 'set-2-119']) {
        prepare();
        const owner = GameState.players[0];
        if (id === 'set-2-119') owner.field = permanent(id);
        else owner.sites = [permanent(id)];
        owner.discard = [{ id: `fondo-${id}`, name: 'Fondo', keywords: [] }];
        owner.armyDeck = [{ id: 'gia', name: 'Gia', keywords: [] }];
        GameState.resolvePermanentTurnStart(0);
        assert.equal(owner.armyDeck[0].id, `fondo-${id}`, id);
    }

    prepare();
    const ncrospira = permanent('set-2-100');
    GameState.players[0].sites = [ncrospira];
    GameState.players[0].fronts.left.line = card('set-1-007', {
        id: 'linea-ncro',
        currentForce: 3,
        force: 3
    });
    GameState.players[0].fronts.left.supA = card('set-1-007', { id: 'sup-ncro' });
    GameState.players[0].discard = [{ id: 'eco-mano', name: 'Eco', keywords: ['Eco Spettrale'] }];
    GameState.resolveSiteActivation(ncrospira, { frontName: 'left', slotName: 'supA' });
    assert.equal(GameState.players[0].fronts.left.supA, null);
    assert.equal(GameState.players[0].fronts.left.line.currentForce, 5);
    assert.equal(GameState.players[0].discard.some(item => item.id === 'sup-ncro'), true);
    assert.equal(GameState.players[0].hand.some(item => item.id === 'eco-mano'), false);

    prepare();
    GameState.players[0].sites = [permanent('set-2-108')];
    GameState.players[0].discard = [
        { id: 'normale', name: 'Normale', category: 'unit', keywords: [] },
        { id: 'eco-mausoleo', name: 'Spettro', category: 'unit', keywords: ['Eco Spettrale'] }
    ];
    GameState.resolvePermanentTurnStart(0);
    assert.equal(GameState.players[0].hand[0].id, 'eco-mausoleo');
    assert.equal(GameState.players[0].discard[0].id, 'normale');

    for (const id of ['set-1-093', 'set-2-082', 'set-2-093']) {
        prepare();
        GameState.players[0].sites = [permanent(id)];
        GameState.players[1].fronts.left.line = card('set-1-007', { currentForce: 3, force: 3 });
        GameState.resolvePermanentTurnStart(0);
        assert.equal(GameState.players[1].fronts.left.line.currentForce, 2, id);
    }

    prepare();
    GameState.players[0].sites = [permanent('set-3-081')];
    GameState.players[0].fronts.left.line = card('set-1-007');
    GameState.resolvePermanentTurnStart(0);
    assert.equal(GameState.players[0].fronts.left.supA?.name, 'Pedina Sciame');

    prepare();
    GameState.players[0].sites = [permanent('set-3-084')];
    GameState.players[1].hand = [{ id: 'segreto', name: 'NomeSegretoAvversario', keywords: [] }];
    GameState.resolvePermanentTurnStart(0);
    assert.match(env.logLines().join('\n'), /NomeSegretoAvversario/);

    prepare();
    GameState.players[0].sites = [permanent('set-3-092')];
    GameState.players[1].fronts.center.line = card('set-1-007', { id: 'slitta' });
    GameState.resolvePermanentTurnStart(0);
    assert.equal(GameState.players[1].fronts.left.line?.id, 'slitta');

    prepare();
    GameState.players[0].sites = [permanent('set-3-102')];
    GameState.players[0].armyDeck = [{ id: 'collettivo-pesca', name: 'P', keywords: [] }];
    for (const frontName of FRONTS) {
        GameState.players[0].fronts[frontName].line = card('set-3-001', {
            id: frontName,
            keywords: ['Mente Collettiva']
        });
    }
    GameState.resolvePermanentTurnStart(0);
    assert.equal(GameState.players[0].hand.at(-1).id, 'collettivo-pesca');

    prepare();
    GameState.players[0].sites = [permanent('set-3-104')];
    GameState.players[0].fronts.right.line = card('set-1-007');
    GameState.resolvePermanentTurnStart(0);
    assert.equal(GameState.players[0].fronts.right.supA?.name, 'Pedina Sciame');

    prepare();
    GameState.players[0].sites = [permanent('set-2-103')];
    GameState.players[0].armyDeck = [{ id: 'ythra', name: 'Ythra', keywords: [] }];
    GameState.resolvePermanentTurnStart(0);
    assert.equal(GameState.players[0].hand.at(-1).id, 'ythra');
    assert.equal(GameState.players[0].pc, 19);

    prepare();
    GameState.players[0].field = permanent('set-1-120');
    GameState.resolvePermanentTurnStart(0);
    assert.equal(occupant(GameState.players[0])?.force, 3);

    prepare();
    GameState.players[0].field = permanent('set-3-120');
    for (const frontName of FRONTS) {
        GameState.players[0].fronts[frontName].supA = card('set-1-007', { id: frontName });
    }
    GameState.resolvePermanentTurnStart(0);
    assert.equal(GameState.players[1].pc, 20);
});

test('famiglia attivazione Siti e abilità di Scontro', () => {
    prepare();
    const altar = permanent('set-1-102');
    player.sites = [altar];
    player.fronts.left.line = card('set-1-007', { id: 'linea', currentForce: 2, force: 2 });
    player.fronts.left.supA = card('set-1-007', { id: 'vittima', currentForce: 1, force: 1 });
    GameState.resolveSiteActivation(altar, { frontName: 'left', slotName: 'supA' });
    assert.equal(player.fronts.left.supA, null);
    assert.equal(player.fronts.left.line.currentForce, 4);

    prepare();
    const mover = permanent('set-3-082');
    GameState.players[0].sites = [mover];
    const support = card('set-1-007', { id: 'mobile', position: 'supA' });
    GameState.players[0].fronts.left.supA = support;
    GameState.resolveSiteActivation(mover, {
        frontName: 'left', slot: 'supA', target: 'center', targetSlot: 'supA'
    });
    assert.equal(GameState.players[0].fronts.center.supA, support);

    prepare();
    const lineMover = permanent('set-3-089');
    GameState.players[0].sites = [lineMover];
    const movingLine = card('set-1-007', { id: 'marcia' });
    GameState.players[0].fronts.left.line = movingLine;
    GameState.resolveSiteActivation(lineMover, { frontName: 'left', target: 'center' });
    assert.equal(GameState.players[0].fronts.center.line, movingLine);

    prepare();
    GameState.players[0].sites = [permanent('set-1-099')];
    GameState.players[1].fronts.right.line = card('set-1-007', { currentForce: 4, force: 4 });
    GameState.resolvePermanentCombatStart(0);
    assert.equal(GameState.players[1].fronts.right.line.currentForce, 3);

    prepare();
    GameState.players[0].field = permanent('set-3-115');
    GameState.players[0].fronts.left.line = card('set-3-001', { keywords: ['Mente Collettiva'] });
    GameState.players[0].fronts.left.supA = card('set-3-001', { id: 'b', keywords: ['Mente Collettiva'] });
    GameState.players[1].fronts.left.line = card('set-1-007', { currentForce: 4, force: 4 });
    GameState.resolvePermanentCombatStart(0);
    assert.equal(GameState.players[1].fronts.left.line.currentForce, 2);

    prepare();
    player.sites = [permanent('set-2-097')];
    player.fronts.left.line = card('set-2-025', { keywords: ['Logorare (1)'] });
    opponent.fronts.left.line = card('set-1-007', { id: 'difesa' });
    assert.equal(CombatResolver.commanderDamage(player, opponent, 'left', 1), 2);

    prepare();
    player.field = permanent('set-1-119');
    player.frontWinsThisTurn = 2;
    player.fronts.left.line = card('set-1-007', { currentForce: 3, force: 3 });
    opponent.fronts.left.line = card('set-1-007', { id: 'debole', currentForce: 1, force: 1 });
    assert.equal(CombatResolver.commanderDamage(player, opponent, 'left', 1), 2);
});

test('famiglia distruzione e perdita di Forza: Siti, Campi, Unità', () => {
    prepare();
    const fallen = card('set-2-014', { position: 'line' });
    CombatResolver.onUnitRemoved(player, fallen, 'left', 'effect-destroy');
    assert.equal(player.pc, 19);

    prepare();
    GameState.players[0].sites = [permanent('set-2-080')];
    GameState.players[0].armyDeck = [{ id: 'anima', name: 'Anima', keywords: [] }];
    CombatResolver.onUnitRemoved(GameState.players[0], card('set-1-007', { position: 'line' }), 'left', 'effect-destroy');
    assert.equal(GameState.players[0].hand.at(-1).id, 'anima');
    assert.equal(GameState.players[0].sites.length, 0);

    prepare();
    GameState.players[1].sites = [permanent('set-1-096')];
    GameState.players[0].fronts.center.line = card('set-1-007', { currentForce: 3, force: 3 });
    CombatResolver.onUnitRemoved(
        GameState.players[1],
        card('set-1-007', { id: 'caduta', position: 'line' }),
        'left',
        'combat-destroy'
    );
    assert.equal(GameState.players[0].fronts.center.line.currentForce, 2);

    prepare();
    opponent.sites = [permanent('set-2-092')];
    opponent.armyDeck = [{ id: 'ombra', name: 'Ombra', keywords: [] }];
    CombatResolver.onUnitRemoved(player, card('set-1-007', { position: 'line' }), 'left', 'combat-destroy');
    assert.equal(opponent.hand.at(-1).id, 'ombra');

    prepare();
    player.sites = [permanent('set-2-099')];
    player.armyDeck = [{ id: 'seconda', name: 'Seconda', keywords: [] }];
    CombatResolver.onUnitRemoved(
        player,
        card('set-1-007', { keywords: ['Eco Spettrale'], position: 'line' }),
        'left',
        'removed'
    );
    assert.equal(player.hand.at(-1).id, 'seconda');

    prepare();
    player.sites = [permanent('set-1-106')];
    player.fronts.left.line = card('set-1-007', { id: 'carnefice' });
    CombatResolver.onUnitRemoved(opponent, card('set-1-007', { id: 'prima', position: 'line' }), 'left', 'combat-destroy', player);
    CombatResolver.onUnitRemoved(opponent, card('set-1-007', { id: 'seconda-vittima', position: 'line' }), 'left', 'combat-destroy', player);
    assert.equal(opponent.pc, 19);

    prepare();
    player.sites = [permanent('set-2-102')];
    const stolen = card('set-1-007', { id: 'preda', position: 'line' });
    opponent.discard = [stolen];
    player.fronts.left.line = card('set-1-007', { id: 'ladro' });
    CombatResolver.onUnitRemoved(opponent, stolen, 'left', 'combat-destroy', player);
    assert.equal(player.discard.at(-1)?.id, 'preda');
    assert.equal(opponent.discard.length, 0);

    prepare();
    player.sites = [permanent('set-3-095')];
    player.fronts.center.line = card('set-3-001', { keywords: ['Mente Collettiva'] });
    CombatResolver.onUnitRemoved(
        player,
        card('set-3-001', { id: 'sciolta', keywords: ['Mente Collettiva'], position: 'line' }),
        'left',
        'effect-destroy'
    );
    assert.equal(player.fronts.center.supA?.name, 'Pedina Sciame');

    for (const [id, keyword] of [['set-1-114', null], ['set-2-116', 'Logorare (1)'], ['set-3-117', 'Mente Collettiva']]) {
        prepare();
        const killer = GameState.players[0];
        killer.field = permanent(id);
        killer.armyDeck = [{ id: `pesca-${id}`, name: id, keywords: [] }];
        killer.fronts.left.line = card('set-1-007', { keywords: keyword ? [keyword] : [] });
        CombatResolver.onUnitRemoved(
            GameState.players[1],
            card('set-1-007', { id: `vittima-${id}`, position: 'line' }),
            'left',
            'combat-destroy',
            killer
        );
        assert.equal(killer.hand.at(-1).id, `pesca-${id}`, id);
    }

    prepare();
    opponent.sites = [permanent('set-2-084')];
    const wounded = card('set-1-007', { currentForce: 3, force: 3, front: 'left' });
    player.fronts.left.line = wounded;
    CombatResolver.onForceLoss(player, wounded, 1, opponent, false);
    CombatResolver.onForceLoss(player, wounded, 1, opponent, false);
    assert.equal(player.pc, 19);

    prepare();
    player.sites = [permanent('set-2-098')];
    const bleeding = card('set-1-007', { front: 'left', forceLostThisTurn: 2, currentForce: 3, force: 3 });
    player.fronts.left.line = bleeding;
    player.fronts.left.supA = card('set-1-007', { id: 'crolla' });
    CombatResolver.onForceLoss(player, bleeding, 1, opponent, false);
    assert.equal(player.fronts.left.supA, null);

    prepare();
    opponent.field = permanent('set-2-118');
    const hurt = card('set-1-007', { front: 'left', currentForce: 3, force: 3 });
    player.fronts.left.line = hurt;
    CombatResolver.onForceLoss(player, hurt, 1, opponent, false);
    assert.equal(player.pc, 19);

    prepare();
    opponent.field = permanent('set-1-117');
    player.fronts.left.line = card('set-1-007', { keywords: [] });
    CombatResolver.removeUnit(player, 'left', 'line', 'effect-destroy');
    assert.equal(player.pc, 19);

    prepare();
    const reinforced = card('set-3-049', { keywords: ['Mente Collettiva'], force: 1, currentForce: 1 });
    player.fronts.left.line = reinforced;
    player.fronts.center.line = card('set-3-001', { keywords: ['Mente Collettiva'] });
    GameState.applyCollectiveEntryBonus(player, reinforced, 'left', 'line');
    assert.equal(reinforced.currentForce, 2);
});

test('famiglia movimento, schieramento e limite tattiche', async () => {
    prepare();
    player.sites = [permanent('set-1-104')];
    player.fronts.left.line = card('set-1-007', { id: 'volo', keywords: ['Sorvolo'] });
    const options = UIRenderer.getSorvoloOptions();
    assert.ok(options.some(option => option.targetSlot === 'line'), 'set-1-104');

    prepare();
    GameState.players[0].sites = [permanent('set-2-086')];
    GameState.players[0].fronts.left.line = card('set-1-007', { id: 'lungo', keywords: ['Sorvolo'] });
    assert.ok(UIRenderer.getSorvoloOptions().some(option => option.targetFront === 'right'), 'set-2-086');

    prepare();
    player.sites = [permanent('set-3-093')];
    const flyer = card('set-1-007', { keywords: ['Sorvolo'], position: 'line', currentForce: 2, force: 2 });
    player.fronts.center.line = flyer;
    opponent.fronts.left.line = card('set-1-007', { id: 'bersaglio', currentForce: 3, force: 3 });
    GameState.onUnitMoved(player, flyer, 'left', 'center', true);
    assert.equal(opponent.fronts.left.line.currentForce, 2);

    prepare();
    opponent.field = permanent('set-3-116');
    const moved = card('set-1-007', { position: 'line', currentForce: 3, force: 3 });
    player.fronts.center.line = moved;
    GameState.onUnitMoved(player, moved, 'left', 'center', true);
    assert.equal(moved.currentForce, 2);

    prepare();
    player.field = permanent('set-1-113');
    opponent.fronts.left.line = card('set-1-007', { id: 'a' });
    opponent.fronts.center.line = card('set-1-007', { id: 'b' });
    const recruit = card('set-1-007', { id: 'recluta', cost: 1, category: 'unit', keywords: [] });
    player.hand = [recruit];
    player.domains = Array.from({ length: 4 }, (_, index) => ({ id: `d-${index}`, tapped: false }));
    GameState.selectedCard = recruit;
    GameController.deploy('left', 'line');
    assert.equal(player.fronts.left.line?.id, 'recluta');

    prepare();
    opponent.field = permanent('set-1-116');
    opponent.fronts.left.line = card('set-1-007', { currentForce: 5, force: 5 });
    opponent.fronts.center.line = card('set-1-007', { id: 'bassa', currentForce: 1, force: 1 });
    const tactic = catalog.cards.find(item => item.id === 'set-1-062');
    const choices = getTacticChoices({ ...tactic, catalogId: tactic.id }, player, opponent);
    assert.deepEqual(choices.map(choice => choice.value.frontName), ['center']);

    prepare();
    player.sites = [permanent('set-2-095')];
    const second = { ...catalog.cards.find(item => item.id === 'set-1-067'), id: 'seconda-tattica', catalogId: 'set-1-067', keywords: [] };
    player.hand = [second];
    player.tacticsPlayedThisTurn = 1;
    GameController.commitTactic(second, null, player, opponent);
    assert.equal(player.hand[0], second);

    assert.equal(checkDeployment(
        { force: 4, keywords: ['Assalto'] },
        { line: {}, supA: null, supB: null },
        'line',
        { opposingSites: [permanent('set-3-094')] }
    ).legal, false);

    prepare();
    const doomed = card('set-1-007', { id: 'sacrificio-sito' });
    player.fronts.left.line = doomed;
    opponent.sites = [permanent('set-1-110')];
    await GameController.beginTurn(0);
    assert.equal(player.fronts.left.line, null);
    assert.equal(player.discard.some(item => item.id === 'sacrificio-sito'), true);
});

test('famiglia Parassiti da Sito e Campo', () => {
    prepare();
    GameState.players[0].sites = [permanent('set-3-088')];
    GameState.players[0].armyDeck = [{ id: 'spora', name: 'Spora', keywords: [] }];
    GameState.addParasites(GameState.players[0], GameState.players[1], 1);
    assert.equal(GameState.players[0].hand.at(-1).id, 'spora');
    assert.equal(GameState.players[1].parasites, 1);

    prepare();
    GameState.players[0].sites = [permanent('set-3-093')];
    GameState.addParasites(GameState.players[1], GameState.players[0], 2);
    assert.equal(GameState.players[0].parasites, 2);
    assert.equal(GameState.players[0].pc, 20);

    prepare();
    GameState.players[0].field = permanent('set-3-114');
    GameState.addParasites(GameState.players[0], GameState.players[1], 1);
    assert.equal(GameState.players[1].pc, 19);
});

test('Spira della Dominazione sposta un’altra Linea avversaria', () => {
    prepare();
    player.sites = [permanent('set-3-108')];
    player.fronts.left.line = card('set-1-007', { id: 'cacciatore' });
    const shifted = card('set-1-007', { id: 'spostata' });
    opponent.fronts.center.line = shifted;
    CombatResolver.onUnitRemoved(
        opponent,
        card('set-1-007', { id: 'morta', position: 'line' }),
        'left',
        'combat-destroy',
        player
    );
    assert.equal(opponent.fronts.left.line, shifted);
    assert.equal(opponent.fronts.center.line, null);
});

test('Abisso della Collettività è un Sito: +1 Forza per Supporto alle Unità con Mente Collettiva', () => {
    const owner = board();
    owner.sites = [permanent('set-3-109')];
    const unit = card('set-3-001', { keywords: ['Mente Collettiva'] });
    owner.fronts.left.line = unit;
    owner.fronts.left.supA = card('set-1-007', { id: 'appoggio' });
    assert.equal(getUnitForceBonus(owner, unit, 'left', 'line', board()), 1);
});

test('Città dell’Invasione è un Sito: Sorvolo può entrare in Linea', () => {
    prepare();
    GameState.players[0].sites = [permanent('set-3-107')];
    GameState.players[0].fronts.left.line = card('set-1-007', { keywords: ['Sorvolo'] });
    assert.ok(UIRenderer.getSorvoloOptions().some(option => option.targetSlot === 'line'));
});

test('Velo della Conquista lascia il Supporto senza Linea anche con Posizione Difensiva', () => {
    const empty = { line: null, supA: null, supB: null };
    const defensive = { force: 2, keywords: ['Posizione Difensiva'] };
    assert.equal(checkDeployment(defensive, empty, 'supA', {
        ownField: permanent('set-3-118')
    }).legal, true);
    assert.equal(checkDeployment(defensive, empty, 'supA').legal, false);
});

test('Cattedrale, Vortice, Santuario del Parassita ed Era usano il testo stampato', () => {
    const cathedral = board();
    cathedral.sites = [permanent('set-3-099')];
    const collective = card('set-3-001', { keywords: ['Mente Collettiva'] });
    cathedral.fronts.left.line = collective;
    assert.equal(getUnitForceBonus(cathedral, collective, 'left', 'line', board()), 1);

    prepare();
    player.sites = [permanent('set-3-100')];
    const vortex = card('set-1-007', { id: 'vortice' });
    opponent.fronts.left.line = vortex;
    GameState.resolvePermanentTurnStart(0);
    assert.equal(opponent.fronts.center.line, vortex);
    assert.equal(opponent.fronts.left.line, null);

    prepare();
    player.sites = [permanent('set-3-101')];
    GameState.addParasites(opponent, player, 1);
    assert.equal(player.pc, 19);

    prepare();
    player.field = permanent('set-3-119');
    for (const frontName of FRONTS) {
        player.fronts[frontName].supA = card('set-1-007', { id: frontName });
    }
    GameState.resolvePermanentTurnStart(0);
    assert.equal(opponent.pc, 19);
});
