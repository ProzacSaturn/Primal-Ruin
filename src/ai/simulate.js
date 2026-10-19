// Partite automatiche. Usa il motore così com'è: il bot sceglie, GameController
// e la pipeline dell'avversario applicano le regole. Gli errori del motore
// restano nel report.
import { commanderForSet } from '../commanders.js';
import { UPDATED_MATCH_DECK } from '../deck-composition.js';
import { SETS } from '../engine/board.js';
import { UIRenderer } from '../engine/renderer.js';
import { setGamePersistenceSuspended } from '../save-store.js';
import { installHeadlessEnvironment } from '../../tests/helpers/headless-env.js';
import { GameController, GameState } from '../../game.js';
import {
    answerPrompt,
    channelMadness,
    chooseEnemyCandidate,
    chooseMulligan,
    chooseSorvoloIndex,
    createBotRng,
    playMainPhase
} from './bot.js';

const SET_IDS = SETS.map((set) => set.id);
const MIN_CARD_PLAYS = 40;
const CARD_DELTA = 0.15;
const MIN_DECK_GAMES = 40;
const DECK_HIGH = 0.65;
const DECK_LOW = 0.35;

export async function simulateMatches(options = {}) {
    const games = positiveInteger(options.games ?? 1000, 'games');
    const seed = uint32(options.seed ?? 1, 'seed');
    const turnLimit = positiveInteger(options.turnLimit ?? 100, 'turnLimit');
    const schedule = buildSchedule(games, seed, options.decks ?? null);
    installHeadlessEnvironment({ seed });
    setGamePersistenceSuspended(true);
    GameState.reportDamageLoops = true;
    const started = Date.now();
    const matches = [];
    const errors = [];
    try {
        for (let index = 0; index < schedule.length; index += 1) {
            const spec = schedule[index];
            try {
                matches.push(await playMatch(spec, turnLimit));
            } catch (error) {
                const failure = {
                    partita: index + 1,
                    seme: spec.seed,
                    turno: GameState.turnNumber || 0,
                    fase: GameState.phase,
                    mazzi: [spec.seat0.id, spec.seat1.id],
                    messaggio: error?.message || String(error),
                    stack: String(error?.stack || '')
                        .split('\n')
                        .slice(0, 8)
                };
                errors.push(failure);
                matches.push({
                    partita: index + 1,
                    seme: spec.seed,
                    mazzo0: spec.seat0.id,
                    mazzo1: spec.seat1.id,
                    nome0: spec.seat0.name,
                    nome1: spec.seat1.name,
                    stato: 'errore',
                    vincitore: null,
                    mazzoVincente: null,
                    turni: GameState.turnNumber || 0,
                    giocate: []
                });
            }
            options.onProgress?.(index + 1, schedule.length);
        }
    } finally {
        GameState.enemyCandidatePicker = null;
        GameState.reportDamageLoops = false;
        setGamePersistenceSuspended(false);
    }
    return buildReport({
        games,
        seed,
        turnLimit,
        elapsedMs: Date.now() - started,
        matches,
        errors
    });
}

export function formatReport(report) {
    const lines = [
        `Simulazione: ${report.partite} partite, seme ${report.seme}, limite ${report.limiteTurni} turni`,
        `Tempo: ${(report.tempoMs / 1000).toFixed(1)} s`,
        `Completate: ${report.completate} · Limite turni: ${report.limiteTurniRaggiunto} · Errori motore: ${report.errori.length}`,
        `Durata media (partite finite): ${report.durataMediaTurni} turni`,
        `Vittorie per posto: giocatore ${percent(report.posti.giocatore.vittorie, report.posti.giocatore.partite)} · avversario ${percent(report.posti.avversario.vittorie, report.posti.avversario.partite)}`,
        'Il posto giocatore usa le azioni umane. Il posto avversario usa la pipeline già nel motore: il bot sceglie fra le mosse legali elencate.',
        '',
        'Mazzi:'
    ];
    for (const deck of report.mazzi) {
        lines.push(`  ${deck.nome}: ${percent(deck.vittorie, deck.partite)} su ${deck.partite}`);
    }
    lines.push('', `Carte più vincenti (almeno ${MIN_CARD_PLAYS} giocate):`);
    for (const card of report.carteForti) lines.push(cardLine(card));
    lines.push('', `Carte meno vincenti (almeno ${MIN_CARD_PLAYS} giocate):`);
    for (const card of report.carteDeboli) lines.push(cardLine(card));
    lines.push('', 'Anomalie:');
    if (report.anomalie.troppoForti.length === 0 && report.anomalie.troppoDeboli.length === 0) {
        lines.push('  nessuna sopra le soglie');
    }
    for (const item of report.anomalie.troppoForti) lines.push(`  forte: ${item.testo}`);
    for (const item of report.anomalie.troppoDeboli) lines.push(`  debole: ${item.testo}`);
    if (report.errori.length) {
        lines.push('', 'Errori (seme per ripeterli):');
        for (const error of report.errori.slice(0, 8)) {
            lines.push(
                `  seme ${error.seme} turno ${error.turno} (${error.mazzi.join(' vs ')}): ${error.messaggio}`
            );
        }
    }
    if (report.partiteAlLimite.length) {
        lines.push(
            '',
            `Prime partite al limite turni: ${report.partiteAlLimite
                .slice(0, 5)
                .map((item) => item.seme)
                .join(', ')}`
        );
    }
    return lines.join('\n');
}

async function playMatch(spec, turnLimit) {
    const plays = [];
    const rng = createBotRng(mixSeed(spec.seed, 99));
    GameState.reset(spec.seat0.cardIds, {
        seed: spec.seed,
        playerSetId: spec.seat0.setId,
        opponentSetId: spec.seat1.setId,
        opponentDeckIds: spec.seat1.cardIds,
        playerCommanderId: commanderForSet(spec.seat0.setId),
        opponentCommanderId: commanderForSet(spec.seat1.setId)
    });
    GameState.enemyCandidatePicker = (candidates) => {
        const picked = chooseEnemyCandidate(candidates, rng);
        if (picked?.card) plays.push(cardPlay(picked.card, 1));
        return picked;
    };
    const replaced = chooseMulligan(GameState.players[0].hand);
    if (replaced.length) GameController.mulligan(replaced);
    await drive(GameController.startGame());
    let spins = 0;
    while (!GameState.gameOver && GameState.turnNumber < turnLimit) {
        if (spins >= 400) throw new Error('Troppe iterazioni senza concludere il turno.');
        spins += 1;
        if (GameState.currentIndex !== 0) {
            throw new Error(
                `Turno fermo sul posto ${GameState.currentIndex} in fase ${GameState.phase}.`
            );
        }
        if (GameState.phase === 'rifornimento') {
            channelMadness();
            GameController.enterMainPhase();
        }
        if (GameState.phase === 'principale') {
            playMainPhase(rng, (card) => plays.push(cardPlay(card, 0)));
            await drive(GameController.resolveCombat());
            if (GameState.pendingSorvolo) await resolveSorvolo();
        }
        if (GameState.gameOver) break;
        if (GameState.phase === 'finale') {
            await drive(GameController.endTurn());
            continue;
        }
        throw new Error(`Fase inattesa ${GameState.phase} al turno ${GameState.turnNumber}.`);
    }
    const winnerSeat = winnerIndex();
    return {
        partita: spec.index + 1,
        seme: spec.seed,
        mazzo0: spec.seat0.id,
        mazzo1: spec.seat1.id,
        nome0: spec.seat0.name,
        nome1: spec.seat1.name,
        stato: GameState.gameOver ? 'completata' : 'limite-turni',
        vincitore: winnerSeat,
        mazzoVincente: winnerSeat === 0 ? spec.seat0.id : winnerSeat === 1 ? spec.seat1.id : null,
        turni: GameState.turnNumber,
        giocate: plays
    };
}

async function resolveSorvolo() {
    let guard = 0;
    while (GameState.pendingSorvolo && !GameState.gameOver && guard < 12) {
        guard += 1;
        const options = UIRenderer.getSorvoloOptions();
        const index = chooseSorvoloIndex(options);
        if (index == null || !options[index]) {
            await drive(GameController.skipSorvolo());
            return;
        }
        document.getElementById('sorvolo-choice').value = String(index);
        const pending = GameController.useSorvolo();
        if (pending?.then) await drive(pending);
    }
}

async function drive(promise) {
    if (!promise?.then) {
        let extra = 0;
        while (answerPrompt() && extra < 8) extra += 1;
        return;
    }
    let settled = false;
    let failure = null;
    promise.then(
        () => {
            settled = true;
        },
        (error) => {
            settled = true;
            failure = error;
        }
    );
    let idle = 0;
    let answers = 0;
    while (!settled) {
        if (answerPrompt()) {
            idle = 0;
            answers += 1;
            if (answers > 500) throw new Error(`${stallMessage()} (troppe risposte)`);
            await Promise.resolve();
            continue;
        }
        await Promise.resolve();
        if (settled) break;
        idle += 1;
        if (idle > 1000) throw new Error(stallMessage());
    }
    if (failure) throw failure;
    let extra = 0;
    while (answerPrompt() && extra < 8) extra += 1;
}

function stallMessage() {
    const flags = [
        GameState.pendingTactic && 'tattica',
        GameState.pendingTorment && 'tormento',
        GameState.pendingPromotion && 'promozione',
        GameState.sacrifice && 'sacrificio',
        GameState.reactionWindow && 'reazione',
        GameState.pendingSorvolo && 'sorvolo'
    ].filter(Boolean);
    return `Motore fermo al turno ${GameState.turnNumber} (${GameState.phase}): ${flags.join(', ') || 'nessun prompt'}`;
}

function winnerIndex() {
    if (!GameState.gameOver) return null;
    const text = document.getElementById('game-result').textContent;
    const index = GameState.players.findIndex((player) => text === `${player.name} vince!`);
    if (index < 0) throw new Error(`Partita chiusa senza vincitore leggibile: ${text}`);
    return index;
}

function buildReport({ games, seed, turnLimit, elapsedMs, matches, errors }) {
    const decks = new Map();
    const cards = new Map();
    const seats = [
        { partite: 0, vittorie: 0 },
        { partite: 0, vittorie: 0 }
    ];
    let completed = 0;
    let turnSum = 0;
    const turnLimits = [];
    for (const match of matches) {
        noteDeck(decks, match.mazzo0, match.nome0);
        noteDeck(decks, match.mazzo1, match.nome1);
        if (match.stato !== 'completata') {
            if (match.stato === 'limite-turni') {
                turnLimits.push({
                    partita: match.partita,
                    seme: match.seme,
                    mazzi: [match.mazzo0, match.mazzo1],
                    turni: match.turni
                });
            }
            continue;
        }
        completed += 1;
        turnSum += match.turni;
        seats[0].partite += 1;
        seats[1].partite += 1;
        decks.get(match.mazzo0).partite += 1;
        decks.get(match.mazzo1).partite += 1;
        if (match.vincitore === 0 || match.vincitore === 1) {
            seats[match.vincitore].vittorie += 1;
            decks.get(match.mazzoVincente).vittorie += 1;
        }
        for (const play of match.giocate) {
            if (!play.id) continue;
            const card = cards.get(play.id) || {
                id: play.id,
                nome: play.name,
                setId: play.setId,
                giocate: 0,
                vittorie: 0
            };
            card.giocate += 1;
            if (play.seat === match.vincitore) card.vittorie += 1;
            cards.set(play.id, card);
        }
    }
    const deckRows = [...decks.values()]
        .map((deck) => ({ ...deck, tasso: rate(deck.vittorie, deck.partite) }))
        .sort((left, right) => right.tasso - left.tasso || left.nome.localeCompare(right.nome));
    const cardRows = [...cards.values()]
        .map((card) => ({ ...card, tasso: rate(card.vittorie, card.giocate) }))
        .sort((left, right) => right.tasso - left.tasso || right.giocate - left.giocate);
    const played = cardRows.filter((card) => card.giocate >= MIN_CARD_PLAYS);
    const playTotal = cardRows.reduce((sum, card) => sum + card.giocate, 0);
    const winTotal = cardRows.reduce((sum, card) => sum + card.vittorie, 0);
    const mean = playTotal ? winTotal / playTotal : 0;
    const strongCards = played.filter((card) => card.tasso >= mean + CARD_DELTA);
    const weakCards = played.filter((card) => card.tasso <= mean - CARD_DELTA);
    const strongDecks = deckRows.filter(
        (deck) => deck.partite >= MIN_DECK_GAMES && deck.tasso >= DECK_HIGH
    );
    const weakDecks = deckRows.filter(
        (deck) => deck.partite >= MIN_DECK_GAMES && deck.tasso <= DECK_LOW
    );
    return {
        partite: games,
        seme: seed,
        limiteTurni: turnLimit,
        tempoMs: elapsedMs,
        completate: completed,
        limiteTurniRaggiunto: turnLimits.length,
        durataMediaTurni: completed ? Number((turnSum / completed).toFixed(2)) : 0,
        tassoMedioCarte: Number(mean.toFixed(4)),
        posti: { giocatore: seats[0], avversario: seats[1] },
        mazzi: deckRows,
        carteForti: played.slice(0, 8),
        carteDeboli: [...played].reverse().slice(0, 8),
        anomalie: {
            troppoForti: [
                ...strongDecks.map((deck) => ({
                    tipo: 'mazzo',
                    id: deck.id,
                    testo: `${deck.nome} vince ${percent(deck.vittorie, deck.partite)} su ${deck.partite}`
                })),
                ...strongCards.slice(0, 15).map((card) => ({
                    tipo: 'carta',
                    id: card.id,
                    testo: `${card.nome} (${card.id}) ${percent(card.vittorie, card.giocate)} su ${card.giocate} giocate`
                }))
            ],
            troppoDeboli: [
                ...weakDecks.map((deck) => ({
                    tipo: 'mazzo',
                    id: deck.id,
                    testo: `${deck.nome} vince ${percent(deck.vittorie, deck.partite)} su ${deck.partite}`
                })),
                ...weakCards.slice(0, 15).map((card) => ({
                    tipo: 'carta',
                    id: card.id,
                    testo: `${card.nome} (${card.id}) ${percent(card.vittorie, card.giocate)} su ${card.giocate} giocate`
                }))
            ]
        },
        partiteAlLimite: turnLimits,
        errori: errors,
        partiteDettaglio: matches.map((match) => ({
            partita: match.partita,
            seme: match.seme,
            mazzo0: match.mazzo0,
            mazzo1: match.mazzo1,
            stato: match.stato,
            vincitore: match.vincitore,
            mazzoVincente: match.mazzoVincente,
            turni: match.turni
        }))
    };
}

function noteDeck(decks, id, name) {
    if (!decks.has(id)) decks.set(id, { id, nome: name, partite: 0, vittorie: 0 });
}

function cardPlay(card, seat) {
    return {
        id: card.catalogId || card.id,
        name: card.name,
        setId: card.setId || null,
        seat
    };
}

function buildSchedule(games, seed, decks) {
    const pair = decks ? parseDeckPair(decks) : null;
    const pairs = pair ? null : allPairs();
    const schedule = [];
    for (let index = 0; index < games; index += 1) {
        let seat0;
        let seat1;
        if (pair) {
            [seat0, seat1] = index % 2 === 0 ? pair : [pair[1], pair[0]];
        } else {
            [seat0, seat1] = pairs[index % pairs.length];
        }
        schedule.push({
            index,
            seed: mixSeed(seed, index),
            seat0,
            seat1
        });
    }
    return schedule;
}

function allPairs() {
    const decks = SET_IDS.map((id) => deckFromToken(id));
    const pairs = [];
    for (const left of decks) {
        for (const right of decks) {
            if (left.id !== right.id) pairs.push([left, right]);
        }
    }
    return pairs;
}

function parseDeckPair(text) {
    const tokens = String(text)
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);
    if (tokens.length === 1) tokens.push(tokens[0]);
    if (tokens.length !== 2) {
        throw new Error('Usa --decks set-1,set-2 oppure --decks updated,set-1.');
    }
    return [deckFromToken(tokens[0]), deckFromToken(tokens[1])];
}

function deckFromToken(token) {
    if (token === 'updated') {
        return {
            id: 'updated',
            name: 'Mazzo aggiornato',
            setId: 'set-3',
            cardIds: UPDATED_MATCH_DECK
        };
    }
    const set = SETS.find((item) => item.id === token);
    if (!set) {
        throw new Error(`Mazzo sconosciuto: ${token}. Usa set-1, set-2, set-3, set-4 o updated.`);
    }
    return { id: set.id, name: set.name, setId: set.id, cardIds: null };
}

function mixSeed(base, index) {
    let value = (Number(base) ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
    value ^= value << 13;
    value >>>= 0;
    value ^= value >>> 17;
    value >>>= 0;
    value ^= value << 5;
    value >>>= 0;
    return value || 1;
}

function positiveInteger(value, name) {
    if (!Number.isInteger(value) || value < 1) {
        throw new Error(`${name} deve essere un intero positivo.`);
    }
    return value;
}

function uint32(value, name) {
    if (!Number.isInteger(value) || value < 1 || value > 0xffffffff) {
        throw new Error(`${name} deve essere un intero fra 1 e 4294967295.`);
    }
    return value;
}

function rate(wins, total) {
    return total ? wins / total : 0;
}

function percent(wins, total) {
    if (!total) return '0%';
    return `${((wins / total) * 100).toFixed(1)}%`;
}

function cardLine(card) {
    return `  ${card.nome} (${card.id}): ${percent(card.vittorie, card.giocate)} su ${card.giocate}`;
}
