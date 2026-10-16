// Primo test che importa l'engine `game.js`: fissa lo stato iniziale di una
// partita nuova e la sua riproducibilità a parità di seed. Fino a qui l'engine
// aveva copertura automatica zero (vedi roadmap di produzione, P0).
import test from 'node:test';
import assert from 'node:assert/strict';
import { installHeadlessEnvironment } from './helpers/headless-env.js';

const env = installHeadlessEnvironment({ seed: 1 });
const { GameState } = await import('../game.js');

function resetWithSeed(seed) {
    env.setSeed(seed);
    GameState.reset(null);
}

function handsSnapshot() {
    return GameState.players.map(player => player.hand.map(card => card.catalogId));
}

test('una partita nuova parte dallo stato iniziale atteso', () => {
    resetWithSeed(1);

    assert.equal(GameState.phase, 'setup');
    assert.equal(GameState.turnNumber, 0);
    assert.equal(GameState.gameOver, false);
    assert.equal(GameState.firstTurn, true);
    assert.equal(GameState.mulliganUsed, false);
    assert.equal(GameState.players.length, 2);

    for (const player of GameState.players) {
        assert.equal(player.hand.length, 5, 'mano iniziale di 5 carte');
        assert.equal(player.armyDeck.length, 35, '40 carte meno le 5 pescate');
        assert.equal(player.domains.length, 2, '2 Domini attivi');
        assert.equal(player.domainDeck.length, 18, '20 Domini meno i 2 iniziali');
        assert.ok(player.domains.every(domain => domain.tapped === false), 'Domini iniziali non esausti');
        assert.ok(player.pc > 0, 'PC del Comandante positivo');
        assert.equal(player.follia, 0);
    }

    assert.equal(GameState.currentIndex, GameState.firstPlayerIndex);
    assert.ok(GameState.firstPlayerIndex === 0 || GameState.firstPlayerIndex === 1);
});

test('lo stesso seed produce lo stesso stato iniziale', () => {
    resetWithSeed(7);
    const firstHands = handsSnapshot();
    const firstPlayer = GameState.firstPlayerIndex;

    resetWithSeed(7);

    assert.deepEqual(handsSnapshot(), firstHands);
    assert.equal(GameState.firstPlayerIndex, firstPlayer);
});

test('il primo giocatore è derivato dal seed', () => {
    const observed = new Set();
    for (let seed = 1; seed <= 20; seed++) {
        resetWithSeed(seed);
        observed.add(GameState.firstPlayerIndex);
    }
    assert.deepEqual([...observed].sort(), [0, 1]);
});
