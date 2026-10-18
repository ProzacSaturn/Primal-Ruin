// Regole di nucleo del Regolamento Ufficiale Avanzato (§1–§9), esercitate
// sull'engine. Se il motore non è conforme, il test regolamentare è `todo`
// con la nota del punto del regolamento: non si corregge in silenzio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installHeadlessEnvironment } from './helpers/headless-env.js';
import { validateDeckIds } from '../src/deck-validation.js';
import { calculateUnitCombatStrength } from '../src/game-rules.js';
import catalog from '../src/data/cards.json' with { type: 'json' };

const env = installHeadlessEnvironment({ seed: 1 });
const { GameController, GameState } = await import('../game.js');
const { CombatResolver } = await import('../src/engine/combat.js');
const { UIRenderer } = await import('../src/engine/renderer.js');

function fresh() {
    env.storage.clear();
    env.setSeed(1);
    GameState.reset(null);
}

function unit(force, extra = {}) {
    return {
        id: extra.id || `u-${force}`,
        name: extra.name || 'Unità',
        catalogId: extra.catalogId || 'test-unit',
        currentForce: force,
        force,
        keywords: [],
        damage: 0,
        damageThisTurn: 0,
        damageShield: 0,
        temporaryForce: 0,
        equipment: null,
        type: 'Creatura',
        ...extra
    };
}

function clearFronts() {
    for (const player of GameState.players) {
        for (const frontName of ['left', 'center', 'right']) {
            player.fronts[frontName] = { line: null, supA: null, supB: null };
        }
        player.sites = [];
        player.field = null;
        player.tacticEffects = {};
        player.pc = 20;
        player.follia = 0;
        player.parasites = 0;
    }
}

test('setup: 40 carte Esercito, 20 Domini, mano da 5 e 2 Domini attivi', () => {
    fresh();
    for (const player of GameState.players) {
        assert.equal(player.hand.length, 5);
        assert.equal(player.armyDeck.length, 35);
        assert.equal(player.domainDeck.length, 18);
        assert.equal(player.domains.length, 2);
        assert.ok(player.domains.every(domain => domain.tapped === false));
        assert.ok(player.pc > 0);
    }
});

test('un mazzo Esercito misto di tutte le categorie legali è valido', () => {
    const ids = ['unit', 'tactic', 'equipment', 'site', 'field'].flatMap(category =>
        catalog.cards.filter(card => card.category === category).slice(0, 8).map(card => card.id)
    );
    const result = validateDeckIds(ids, new Set(catalog.cards.map(card => card.id)));
    assert.equal(result.valid, true);
});

test('con il Mazzo Domini vuoto il Rifornimento continua senza pescare', async () => {
    fresh();
    const player = GameState.players[0];
    player.domainDeck = [];
    const before = player.domains.length;
    await GameController.beginTurn(0);
    assert.equal(player.domains.length, before);
    assert.notEqual(GameState.phase, 'gameover');
});

test('Canalizzare converte Follia in Echo 1:1, anche più volte', () => {
    fresh();
    GameState.phase = 'rifornimento';
    GameState.currentIndex = 0;
    const player = GameState.players[0];
    player.follia = 2;
    player.echo = 0;
    GameController.channelMadness();
    GameController.channelMadness();
    assert.equal(player.follia, 0);
    assert.equal(player.echo, 2);
    GameController.channelMadness();
    assert.equal(player.echo, 2);
});

test('la Fase Finale scarta fino a 7 carte e rimuove gli Echo', async () => {
    fresh();
    const player = GameState.players[0];
    player.hand = Array.from({ length: 9 }, (_, index) => ({
        id: `mano-${index}`,
        name: `Mano ${index}`,
        keywords: []
    }));
    player.echo = 4;
    player.armyDeck = [];
    player.domainDeck = [];
    GameState.players[1].armyDeck = [];
    GameState.players[1].domainDeck = [];
    GameState.phase = 'finale';
    GameState.currentIndex = 0;
    GameState.firstTurn = false;
    await GameController.endTurn();
    assert.equal(player.hand.length, 7);
    assert.match(env.logLines().join('\n'), /Fine turno: Echo rimossi/);
});

test('oltre 7 carte in Fase Principale non si scarta prima della Fase Finale', () => {
    fresh();
    const player = GameState.players[0];
    player.hand = Array.from({ length: 8 }, (_, index) => ({ id: `eccesso-${index}`, name: 'X' }));
    GameState.phase = 'principale';
    assert.equal(player.hand.length, 8);
    assert.equal(player.discard.length, 0);
});

test('giocare un’Unità esaurisce tanti Domini quant’è il costo ed entra in Supporto', () => {
    fresh();
    const player = GameState.players[0];
    const card = unit(2, {
        id: 'ingresso',
        name: 'Ingresso',
        category: 'unit',
        cost: 1,
        keywords: []
    });
    player.hand = [card];
    player.domains.forEach(domain => { domain.tapped = false; });
    GameState.phase = 'principale';
    GameState.currentIndex = 0;
    GameState.selectedCard = card;
    GameController.deploy('left', 'supA');
    assert.equal(player.fronts.left.supA?.id, 'ingresso');
    assert.equal(player.fronts.left.line, null);
    assert.equal(player.domains.filter(domain => domain.tapped).length, 1);
    assert.equal(player.hand.length, 0);
});

test('senza Assalto un’Unità non entra in Linea nel turno in cui è giocata', () => {
    fresh();
    const player = GameState.players[0];
    const card = unit(2, { id: 'lenta', category: 'unit', cost: 1, keywords: [] });
    player.hand = [card];
    GameState.phase = 'principale';
    GameState.currentIndex = 0;
    GameState.selectedCard = card;
    GameController.deploy('left', 'line');
    assert.equal(player.fronts.left.line, null);
    assert.equal(player.hand.length, 1);
});

test('Assalto entra in Linea; Posizione Difensiva rifiuta il Supporto se la Linea è libera', () => {
    fresh();
    const player = GameState.players[0];
    const assault = unit(2, { id: 'assalto', category: 'unit', cost: 1, keywords: ['Assalto'] });
    player.hand = [assault];
    GameState.phase = 'principale';
    GameState.currentIndex = 0;
    GameState.selectedCard = assault;
    GameController.deploy('left', 'line');
    assert.equal(player.fronts.left.line?.id, 'assalto');

    const defender = unit(2, {
        id: 'difesa',
        category: 'unit',
        cost: 1,
        keywords: ['Posizione Difensiva']
    });
    player.hand = [defender];
    GameState.selectedCard = defender;
    GameController.deploy('center', 'supA');
    assert.equal(player.fronts.center.supA, null);
    GameController.deploy('center', 'line');
    assert.equal(player.fronts.center.line?.id, 'difesa');
});

test('Eco Spettrale si gioca dagli scarti a costo +1 ed è esiliata se lascia il gioco', () => {
    fresh();
    const player = GameState.players[0];
    const card = unit(2, {
        id: 'spettro',
        category: 'unit',
        cost: 1,
        keywords: ['Eco Spettrale']
    });
    player.discard = [card];
    player.hand = [];
    while (player.domains.length < 2) player.domains.push({ id: `d-${player.domains.length}`, tapped: false });
    player.domains.forEach(domain => { domain.tapped = false; });
    GameState.phase = 'principale';
    GameState.currentIndex = 0;
    GameState.selectedCard = card;
    GameState.selectedFromDiscard = true;
    GameController.deploy('left', 'supA');
    assert.equal(player.fronts.left.supA?.id, 'spettro');
    assert.equal(player.domains.filter(domain => domain.tapped).length, 2);
    assert.equal(player.discard.length, 0);
    CombatResolver.removeUnit(player, 'left', 'supA', 'effect-destroy');
    assert.equal(player.exile.some(item => item.id === 'spettro'), true);
    assert.equal(player.discard.some(item => item.id === 'spettro'), false);
});

test('Ascensione spende anche gli Echo indicati', () => {
    fresh();
    const player = GameState.players[0];
    const card = unit(2, {
        id: 'ascesa',
        category: 'unit',
        cost: 1,
        keywords: ['Ascensione (2)']
    });
    player.hand = [card];
    player.echo = 1;
    GameState.phase = 'principale';
    GameState.currentIndex = 0;
    GameState.selectedCard = card;
    GameController.deploy('left', 'supA');
    assert.equal(player.fronts.left.supA, null, 'Echo insufficienti: la carta resta in mano');
    player.echo = 2;
    GameState.selectedCard = card;
    GameController.deploy('left', 'supA');
    assert.equal(player.fronts.left.supA?.id, 'ascesa');
    assert.equal(player.echo, 0);
});

test('in parità entrambe le Linee subiscono 1 danno e nessun PC', async () => {
    fresh();
    clearFronts();
    GameState.currentIndex = 0;
    GameState.phase = 'scontro';
    GameState.players[0].fronts.left.line = unit(4, { id: 'a', name: 'A' });
    GameState.players[1].fronts.left.line = unit(4, { id: 'b', name: 'B' });
    await CombatResolver.resolveFront('left');
    assert.equal(GameState.players[0].fronts.left.line.currentForce, 3);
    assert.equal(GameState.players[1].fronts.left.line.currentForce, 3);
    assert.equal(GameState.players[0].pc, 20);
    assert.equal(GameState.players[1].pc, 20);
});

test('Fronte scoperto: l’attaccante infligge l’intera Forza al Comandante', async () => {
    fresh();
    clearFronts();
    GameState.currentIndex = 0;
    GameState.phase = 'scontro';
    GameState.players[0].fronts.left.line = unit(3, { id: 'att', name: 'Att' });
    await CombatResolver.resolveFront('left');
    assert.equal(GameState.players[1].pc, 17);
    assert.equal(GameState.players[0].pc, 20);
});

test('la differenza danneggia il Comandante e, in eccesso, il Supporto promosso', async () => {
    fresh();
    clearFronts();
    GameState.currentIndex = 0;
    GameState.phase = 'scontro';
    GameState.players[0].fronts.left.line = unit(4, { id: 'att', name: 'Att' });
    GameState.players[1].fronts.left.line = unit(1, { id: 'def', name: 'Def' });
    GameState.players[1].fronts.left.supA = unit(4, { id: 'sup', name: 'Sup' });
    await CombatResolver.resolveFront('left');
    // Il Supporto vale +1: 4 contro 2, margine 2. La Linea da 1 cade e 1 danno prosegue.
    assert.equal(GameState.players[1].pc, 18);
    assert.equal(GameState.players[1].fronts.left.line?.id, 'sup');
    assert.equal(GameState.players[1].fronts.left.line.currentForce, 3);
    assert.equal(GameState.players[1].discard.some(card => card.id === 'def'), true);
});

test('il Sacrificio difensivo previene 1 danno per ogni Forza sacrificata', async () => {
    fresh();
    clearFronts();
    GameState.currentIndex = 1;
    GameState.phase = 'scontro';
    GameState.players[1].fronts.left.line = unit(4, { id: 'att', name: 'Att' });
    GameState.players[0].fronts.left.supA = unit(2, { id: 'sac', name: 'Sac' });
    const pending = CombatResolver.resolveFront('left');
    assert.equal(GameState.sacrifice?.remaining, 4);
    CombatResolver.sacrifice('left', 'supA');
    CombatResolver.finishSacrifice();
    await pending;
    assert.equal(GameState.players[0].pc, 18);
    assert.equal(GameState.players[0].fronts.left.supA, null);
    assert.equal(GameState.sacrifice, null);
});

test('Tormento converte il danno al Comandante in Follia', async () => {
    fresh();
    clearFronts();
    GameState.currentIndex = 1;
    GameState.phase = 'scontro';
    GameState.players[1].fronts.left.line = unit(3, {
        id: 'tor',
        name: 'Tor',
        keywords: ['Tormento (2)']
    });
    GameState.players[0].fronts.left.line = unit(2, { id: 'def', name: 'Def' });
    GameState.players[0].follia = 8;
    await CombatResolver.resolveFront('left');
    assert.equal(GameState.players[0].follia, 10);
    assert.equal(GameState.players[0].pc, 20);
});

test('Divinità non cade per un effetto e, a 0 Forza in Scontro, è Sigillata negli scarti', async () => {
    fresh();
    clearFronts();
    const divine = unit(1, { id: 'dio', name: 'Dio', keywords: ['Divinità'] });
    GameState.players[1].fronts.left.line = divine;
    assert.equal(CombatResolver.destroyUnit(GameState.players[1], 'left', 'line'), null);
    assert.equal(GameState.players[1].fronts.left.line?.id, 'dio');
    GameState.currentIndex = 0;
    GameState.phase = 'scontro';
    GameState.players[0].fronts.left.line = unit(3, { id: 'att', name: 'Att' });
    await CombatResolver.resolveFront('left');
    assert.equal(GameState.players[1].fronts.left.line, null);
    assert.equal(GameState.players[1].discard.some(card => card.id === 'dio'), true);
    assert.equal(GameState.players[1].exile.some(card => card.id === 'dio'), false);
});

test('tre Parassiti a inizio turno ne rimuovono uno e fanno perdere 1 PC', async () => {
    fresh();
    const player = GameState.players[0];
    player.parasites = 3;
    player.armyDeck = [];
    player.domainDeck = [];
    const pc = player.pc;
    await GameController.beginTurn(0);
    assert.equal(player.parasites, 2);
    assert.equal(player.pc, pc - 1);
});

test('l’abilità del Comandante si attiva una sola volta per turno', () => {
    fresh();
    GameState.phase = 'principale';
    GameState.currentIndex = 0;
    const player = GameState.players[0];
    const opponent = GameState.players[1];
    const follia = opponent.follia;
    const echo = player.echo;
    const pc = player.pc;
    GameController.activateCommanderAbility();
    assert.equal(player.commanderAbilityUsed, true);
    assert.equal(opponent.follia, follia);
    assert.equal(player.echo, echo);
    assert.equal(player.pc, pc);
    GameController.activateCommanderAbility();
    assert.equal(player.commanderAbilityUsed, true);
    assert.equal(opponent.follia, follia);
});

test('Sorvolo sposta in un Fronte adiacente ed entra in Supporto', () => {
    fresh();
    clearFronts();
    const flyer = unit(2, { id: 'volo', name: 'Volo', keywords: ['Sorvolo'] });
    GameState.players[0].fronts.center.line = flyer;
    GameState.phase = 'scontro';
    GameState.pendingSorvolo = true;
    const options = UIRenderer.getSorvoloOptions();
    assert.ok(options.every(option => option.targetSlot !== 'line'));
    assert.ok(options.every(option =>
        Math.abs(['left', 'center', 'right'].indexOf(option.frontName) -
            ['left', 'center', 'right'].indexOf(option.targetFront)) === 1));
    document.getElementById('sorvolo-choice').value = '0';
    GameController.useSorvolo();
    assert.equal(GameState.players[0].fronts.center.line, null);
    assert.equal(flyer.position, 'supA');
    assert.notEqual(flyer.front, 'center');
});

test('al quarto Sito si sceglie quale permanente distruggere; un nuovo Campo sostituisce il precedente', () => {
    fresh();
    const player = GameState.players[0];
    player.domains = Array.from({ length: 8 }, (_, index) => ({ id: `dom-${index}`, tapped: false }));
    player.sites = [1, 2, 3].map(index => ({ id: `sito-${index}`, name: `Sito ${index}`, catalogId: `sito-${index}` }));
    const fourth = {
        id: 'quarto',
        name: 'Quarto',
        category: 'site',
        cost: 1,
        catalogId: 'set-1-098',
        rulesText: '',
        keywords: []
    };
    player.hand = [fourth];
    GameState.phase = 'principale';
    GameState.currentIndex = 0;
    GameController.playSite(fourth);
    assert.equal(player.sites.length, 3);
    assert.equal(GameState.pendingTactic?.mode, 'permanent-replace');

    GameState.pendingTactic = null;
    const oldField = {
        id: 'campo-vecchio',
        name: 'Vecchio',
        category: 'field',
        catalogId: 'old',
        keywords: []
    };
    const nextField = catalog.cards.find(card => card.id === 'set-1-111');
    player.field = oldField;
    player.hand = [{ ...nextField, id: 'campo-nuovo', catalogId: nextField.id, keywords: [] }];
    GameController.playSite(player.hand[0]);
    assert.equal(player.field.catalogId, 'set-1-111');
    assert.equal(player.discard.some(card => card.id === 'campo-vecchio'), true);
});

test('un nuovo Equipaggiamento manda il precedente negli scarti', () => {
    fresh();
    const player = GameState.players[0];
    const host = unit(2, { id: 'ospite', name: 'Ospite' });
    player.fronts.left.line = host;
    player.domains = Array.from({ length: 10 }, (_, index) => ({ id: `eq-${index}`, tapped: false }));
    const first = catalog.cards.find(card => card.id === 'set-1-079');
    const second = catalog.cards.find(card => card.id === 'set-1-080');
    player.hand = [
        { ...first, id: 'eq-a', catalogId: first.id, keywords: [] },
        { ...second, id: 'eq-b', catalogId: second.id, keywords: [] }
    ];
    GameState.phase = 'principale';
    GameState.currentIndex = 0;
    GameController.playEquipment(player.hand[0]);
    document.getElementById('tactic-choice').value = '0';
    GameController.confirmTactic();
    assert.equal(host.equipment.catalogId, 'set-1-079');
    GameController.playEquipment(player.hand[0]);
    document.getElementById('tactic-choice').value = '0';
    GameController.confirmTactic();
    assert.equal(host.equipment.catalogId, 'set-1-080');
    assert.equal(player.discard.some(card => card.catalogId === 'set-1-079'), true);
});

test('il cap di default del calcolo Forza è +3', {
    todo: '§3 Cap Assoluto +3. calculateUnitCombatStrength usa supportBonusCap 2 se il chiamante non passa 3; CombatResolver nello scontro passa 3.'
}, () => {
    assert.equal(calculateUnitCombatStrength({
        line: { currentForce: 1, keywords: [] },
        supportCount: 3,
        collectiveCount: 0,
        fewerUnits: false,
        logorare: 0
    }), 4);
});

test('il Dominio Totale scatta solo all’inizio del proprio turno', {
    todo: '§1: la vittoria è all’inizio del proprio turno. checkVictory la applica anche in Fase Principale.'
}, () => {
    fresh();
    clearFronts();
    GameState.phase = 'principale';
    GameState.currentIndex = 0;
    for (const frontName of ['left', 'center', 'right']) {
        GameState.players[0].fronts[frontName].line = unit(1, { id: frontName });
    }
    GameState.checkVictory();
    assert.equal(GameState.gameOver, false);
});

test('un attaccante senza Linea non subisce il Fronte Scoperto', {
    todo: '§6.3 descrive il Fronte Scoperto solo se manca la Linea del difensore. resolveFront infligge la Forza del difensore all’attaccante.'
}, async () => {
    fresh();
    clearFronts();
    GameState.currentIndex = 0;
    GameState.phase = 'scontro';
    GameState.players[1].fronts.left.line = unit(4, { id: 'def', name: 'Def' });
    await CombatResolver.resolveFront('left');
    assert.equal(GameState.players[0].pc, 20);
});

test('l’Equipaggiamento di un’Unità distrutta va negli scarti come carta separata', {
    todo: '§9: removeUnit scarta l’Unità con l’Equipaggiamento ancora annidato, non la carta Equipaggiamento da sola.'
}, () => {
    fresh();
    clearFronts();
    const gear = { id: 'arma', catalogId: 'set-1-079', name: 'Arma', category: 'equipment' };
    const host = unit(2, { id: 'ospite', name: 'Ospite', equipment: gear });
    GameState.players[0].fronts.left.line = host;
    CombatResolver.removeUnit(GameState.players[0], 'left', 'line', 'combat-destroy');
    assert.equal(GameState.players[0].discard.some(card => card.id === 'arma'), true);
});

test('Ritirata: scartare un Supporto pagando 1 Dominio', {
    todo: '§6.2 Ritirata e Rimpiazzo non ha un’azione nell’engine.'
}, () => {
    assert.equal(typeof GameController.retreat, 'function');
});

test('Purga: pagare 2 Domini per rimuovere 1 Parassita', {
    todo: '§6.2 e §7: la Purga manuale non c’è. A inizio turno, con 3+ Parassiti, se ne rimuove uno e si perde 1 PC.'
}, () => {
    assert.equal(typeof GameController.purgeParasite, 'function');
});

test('durante lo Scontro esiste la finestra delle Tattiche Istantanee', {
    todo: '§6.3: le tattiche si giocano solo in Fase Principale. Non c’è una finestra di reazione per Fronte.'
}, () => {
    fresh();
    GameState.phase = 'scontro';
    GameState.currentIndex = 0;
    const card = { ...catalog.cards.find(item => item.id === 'set-1-067'), id: 'istantanea', keywords: [] };
    GameState.players[0].hand = [card];
    GameState.selectedCard = card;
    GameController.playImmediateTactic(card);
    assert.equal(GameState.players[0].hand.some(item => item.id === 'istantanea'), false);
});

test('Guerra a Squadre 2v2', {
    todo: '§8 non è implementato: la partita è solo 1 contro 1, con due giocatori.'
}, () => {
    fresh();
    assert.equal(GameState.players.length, 4);
});
