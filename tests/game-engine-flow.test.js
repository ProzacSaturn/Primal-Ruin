// Test di flusso sull'engine `game.js`: Rifornimento, Mulligan, condizioni di
// vittoria e salvataggi. Complementa `game-engine.test.js`, che copre lo stato
// iniziale. Fino alla roadmap di produzione (P0) l'engine aveva copertura zero.
//
// Convenzione sulle divergenze: dove il codice NON è ancora conforme al
// regolamento ufficiale (`Regolamento Ufficiale Avanzato Primal Ruin.txt`), il
// test che descrive il comportamento REGOLAMENTARE è marcato `todo` con
// l'identificativo della divergenza (DV-x, vedi roadmap §2.3). Così la suite
// resta verde senza nascondere il gap: il `todo` diventa verde da solo quando
// la regola viene implementata.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installHeadlessEnvironment } from './helpers/headless-env.js';

const env = installHeadlessEnvironment({ seed: 1 });
const { GameController, GameState } = await import('../game.js');
const { loadGameSave } = await import('../src/save-store.js');

const SAVE_KEY = 'primal-ruin.game-save.v1';

function freshGame(seed = 1) {
    env.storage.clear();
    env.setSeed(seed);
    GameState.reset(null);
}

function resultText() {
    return env.elementText('game-result');
}

// --- Rifornimento (§5) -----------------------------------------------------

test('il primo Rifornimento del primo giocatore pesca 1 Dominio ma non carte Esercito', async () => {
    freshGame();
    const handBefore = GameState.players[0].hand.length;
    const domainsBefore = GameState.players[0].domains.length;

    await GameController.beginTurn(0);

    assert.equal(GameState.phase, 'rifornimento');
    assert.equal(GameState.turnNumber, 1);
    assert.equal(GameState.currentIndex, 0);
    assert.equal(GameState.players[0].domains.length, domainsBefore + 1, 'pesca 1 Dominio');
    assert.equal(GameState.players[0].hand.length, handBefore, 'primo turno: niente pesca Esercito');
});

test('il Rifornimento riattiva tutti i Domini del giocatore attivo', async () => {
    freshGame();
    await GameController.beginTurn(0);
    GameState.players[0].domains.forEach(domain => { domain.tapped = true; });

    await GameController.beginTurn(0);

    assert.ok(GameState.players[0].domains.every(domain => domain.tapped === false));
});

test('dal secondo Rifornimento si pesca anche 1 carta Esercito', async () => {
    freshGame();

    await GameController.beginTurn(0);
    await GameController.beginTurn(0);

    assert.equal(GameState.players[0].hand.length, 6, '5 iniziali + 1 pescata');
    assert.equal(GameState.players[0].domains.length, 4, '2 iniziali + 2 pescati');
});

test('il Rifornimento del Comandante viene risolto a inizio turno', async () => {
    freshGame();
    const commander = GameState.players[0].commanderId;
    const echoBefore = GameState.players[0].echo;

    await GameController.beginTurn(0);

    assert.ok(commander, 'il giocatore ha un Comandante assegnato');
    assert.equal(GameState.players[0].commanderAbilityUsed, false, 'abilità attivabile ancora disponibile');
    assert.ok(GameState.players[0].echo >= echoBefore, 'Echo non diminuisce a inizio turno');
});

// DV-8 — REGOLA PRIMO TURNO BILANCIATA (righe 90-93): il Dominio pescato nel
// primo turno del primo giocatore entra in gioco ESAUSTO, non attivo.
test('il Dominio pescato al primo turno entra esausto', async () => {
    freshGame();

    await GameController.beginTurn(0);

    const drawn = GameState.players[0].domains.at(-1);
    assert.equal(drawn.tapped, true, 'il Dominio del primo turno entra esausto');
});

// --- Mulligan (§5.4) -------------------------------------------------------

test('il Mulligan può essere usato una sola volta per partita', () => {
    freshGame(3);
    assert.equal(GameState.players[0].hand.length, 5);

    GameController.mulligan([0, 1, 2, 3, 4]);

    assert.equal(GameState.mulliganUsed, true);
    assert.equal(GameState.players[0].hand.length, 5, 'mano riempita di nuovo a 5');
    assert.equal(GameState.players[0].armyDeck.length, 35);

    const afterFirst = GameState.players[0].hand.map(card => card.catalogId);
    GameController.mulligan([0, 1, 2, 3, 4]);

    assert.deepEqual(
        GameState.players[0].hand.map(card => card.catalogId),
        afterFirst,
        'il secondo Mulligan non ha effetto'
    );
});

// DV-3 — §5.4 (righe 85-86): si può rimpiazzare QUALSIASI numero di carte,
// quindi la mano può essere rimpiazzata solo in parte.
test('il Mulligan parziale conserva le carte non rimpiazzate', () => {
    freshGame(11);
    const before = GameState.players[0].hand.map(card => card.catalogId);

    GameController.mulligan([0, 1]);

    const after = GameState.players[0].hand.map(card => card.catalogId);
    const kept = before.filter(id => after.includes(id)).length;
    assert.equal(kept, 3, 'rimpiazzando 2 carte, 3 restano in mano');
});

test('il Mulligan senza carte selezionate non rimpiazza nulla', () => {
    freshGame(7);
    const before = GameState.players[0].hand.map(card => card.catalogId);

    GameController.mulligan([]);

    assert.equal(GameState.mulliganUsed, true, 'il Mulligan è comunque consumato');
    assert.deepEqual(GameState.players[0].hand.map(card => card.catalogId), before);
    assert.equal(GameState.players[0].armyDeck.length, 35, 'nessuna carta va in fondo al mazzo');
});

// --- Condizioni di vittoria (§1.3, §9) -------------------------------------

test('il Comandante a 0 PC fa vincere l’avversario', () => {
    freshGame();
    GameState.players[0].pc = 0;

    assert.equal(GameState.checkVictory(), true);
    assert.equal(GameState.gameOver, true);
    assert.equal(GameState.phase, 'gameover');
    assert.equal(resultText(), `${GameState.players[1].name} vince!`);
});

test('10 segnalini Follia fanno perdere la partita', () => {
    freshGame();
    GameState.players[1].follia = 10;

    assert.equal(GameState.checkVictory(), true);
    assert.equal(resultText(), `${GameState.players[0].name} vince!`);
});

test('senza sconfitta il controllo vittoria non chiude la partita', () => {
    freshGame();

    assert.equal(GameState.checkVictory(), false);
    assert.equal(GameState.gameOver, false);
    assert.notEqual(GameState.phase, 'gameover');
});

// DV-4 — §9 (riga 194 circa): nel pareggio simultaneo vince il giocatore di turno.
test('nella sconfitta simultanea vince il giocatore di turno', () => {
    freshGame();
    GameState.currentIndex = 0;
    GameState.players[0].pc = 0;
    GameState.players[1].pc = 0;

    GameState.checkVictory();

    assert.equal(resultText(), `${GameState.players[0].name} vince!`);
});

// DV-7 — §1.3: vittoria per Dominio Totale della Mappa (3 Linee attive e
// avversario senza Unità).
test('il Dominio Totale della Mappa chiude la partita', () => {
    freshGame();
    const unit = { name: 'Segnaposto', currentForce: 1, force: 1, keywords: [], catalogId: 'test' };
    for (const frontName of ['left', 'center', 'right']) {
        GameState.players[0].fronts[frontName].line = { ...unit };
    }

    assert.equal(GameState.checkVictory(), true);
});

// --- Salvataggi (§"migrazioni dei salvataggi") -----------------------------

test('la partita viene salvata in localStorage con la versione corrente', async () => {
    freshGame();

    await GameController.beginTurn(0);

    const raw = env.storage.getItem(SAVE_KEY);
    assert.ok(raw, 'il salvataggio è stato scritto');
    const save = JSON.parse(raw);
    assert.equal(save.version, 3);
    assert.equal(save.snapshot.players.length, 2);
    assert.ok(Number.isInteger(save.snapshot.randomState));
});

test('un salvataggio della versione corrente viene ricaricato integro', async () => {
    freshGame();

    await GameController.beginTurn(0);

    const recovered = loadGameSave();
    assert.ok(recovered, 'il salvataggio viene riconosciuto valido');
    assert.equal(recovered.phase, GameState.phase);
    assert.equal(recovered.turnNumber, GameState.turnNumber);
    assert.equal(recovered.currentIndex, GameState.currentIndex);
    assert.equal(recovered.players[0].hand.length, GameState.players[0].hand.length);
});

test('un salvataggio illeggibile viene ignorato', () => {
    freshGame();
    env.storage.setItem(SAVE_KEY, '{ questo non è json');

    assert.equal(loadGameSave(), null);
});

// DV-7bis — criterio di qualità "migrazioni dei salvataggi": un salvataggio di
// una versione precedente viene MIGRATO, non scartato.
test('un salvataggio di versione precedente viene migrato', { todo: 'DV-7bis: src/save-store.js:43 scarta se version !== 3' }, async () => {
    freshGame();

    await GameController.beginTurn(0);

    const save = JSON.parse(env.storage.getItem(SAVE_KEY));
    env.storage.setItem(SAVE_KEY, JSON.stringify({ ...save, version: 2 }));

    assert.ok(loadGameSave(), 'il salvataggio v2 dovrebbe essere migrato');
});

test('snapshot e restore ricostruiscono lo stato della partita', async () => {
    freshGame(5);

    await GameController.beginTurn(0);

    const before = GameState.snapshot();
    const snapshot = JSON.parse(JSON.stringify(before));

    GameState.reset(null);
    GameState.restore(snapshot);

    assert.equal(GameState.phase, before.phase);
    assert.equal(GameState.turnNumber, before.turnNumber);
    assert.equal(GameState.currentIndex, before.currentIndex);
    assert.equal(GameState.players[0].hand.length, before.players[0].hand.length);
    assert.equal(GameState.players[0].domains.length, before.players[0].domains.length);
    assert.equal(GameState.players[1].domainDeck.length, before.players[1].domainDeck.length);
});
