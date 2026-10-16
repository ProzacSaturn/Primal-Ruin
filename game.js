import cardCatalog from './src/data/cards.json';
import { clearCustomDeck, loadCustomDeck } from './src/deck-builder.js';
import { clearGameSave, loadGameSave, persistGame } from './src/save-store.js';
import { commanderForSet, defaultCommanderId, evaluateCommanderAbility, getCommander } from './src/commanders.js';
import { getSettings } from './src/settings.js';
import { getRandomState, nextRandom, restoreRandomState, seedRandom } from './src/random.js';
import { drawCardPixelArt } from './src/pixel-art.js';
import { calculateCardCost, markCardCostDiscountUsed } from './src/card-costs.js';
import {
    getTacticChoices as getRegisteredTacticChoices,
    getCardExecutionStatus,
    isImmediateTacticSupported,
    resolveImmediateTactic,
    restoreTemporaryForce
} from './src/card-effects.js';
import { restoreControlledUnits, tacticRequiresChoice } from './src/tactics.js';
import {
    createToken,
    getDamageReduction,
    getFerocityBonus,
    getSupportBonus,
    getUnitForceBonus,
    getUnitKeywords
} from './src/permanent-effects.js';
import {
    calculateUnitCombatStrength,
    checkDeployment,
    compareCombatStrengths,
    defaultPromotionSlot,
    shouldUseTorment
} from './src/game-rules.js';
import {
    getCommanderVictoryDamageEffects,
    getUnitDestructionEffects,
    getUnitDestructionReactions,
    getUnitEntryEffects,
    getUnitLineDestructionEffects,
    getSorvoloEntryEffects,
    hasSeminatoreSilente,
    isProtectedFromEffectDestruction,
    isProtectedFromEnemyMovement,
    shouldDestroySupportOnUnitLineWin
} from './src/unit-triggers.js';

const FRONT_NAMES = ['left', 'center', 'right'];
const FRONT_LABELS = { left: 'SINISTRA', center: 'CENTRO', right: 'DESTRA' };
const SLOT_NAMES = ['line', 'supA', 'supB'];
const CARD_DATA = cardCatalog.cards;
const SETS = cardCatalog.sets;

function getTacticChoices(card, player, opponent) {
    const choices = getRegisteredTacticChoices(card, player, opponent);
    if (!choices || card.cost > 2) return choices;
    return choices.filter(choice => {
        if (choice.value.owner !== 'opponent' || choice.value.slotName !== 'line' ||
            opponent.field?.catalogId !== 'set-1-116') return true;
        const targetStrength = CombatResolver.strength(opponent, choice.value.frontName, null);
        const highestStrength = FRONT_NAMES.reduce((highest, frontName) =>
            Math.max(highest, CombatResolver.strength(opponent, frontName, null)), 0);
        return targetStrength < highestStrength;
    });
}

const KEYWORD_PATTERNS = [
    /Ferocia/i,
    /Assalto/i,
    /Sorvolo/i,
    /Mente Collettiva/i,
    /Posizione Difensiva/i,
    /Logorare\s*\(\d+\)/ig,
    /Eco Spettrale/i,
    /Tormento\s*\(\d+\)/ig,
    /Ascensione\s*\(\d+\)/ig,
    /Divinità/i,
    /Infiltrazione\s*\(\d+\)/ig
];

function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(nextRandom() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function extractKeywords(rulesText) {
    return KEYWORD_PATTERNS.flatMap(pattern => rulesText.match(pattern) || []);
}

function cardIcon(card) {
    if (/dinosauro|raptor|pterosauro/i.test(card.type || '')) return '🦖';
    if (/spettro|non morto/i.test(card.type || '')) return '👻';
    if (/sciame|parassita/i.test(card.type || '')) return '🦠';
    if (/psionico/i.test(card.type || '')) return '🧠';
    if (/drone/i.test(card.type || '')) return '⚙️';
    return '⚔️';
}

function makeUnit(card, id, owner) {
    return {
        ...card,
        id,
        catalogId: card.id,
        owner,
        icon: cardIcon(card),
        keywords: extractKeywords(card.rulesText),
        temporaryKeywords: [],
        currentForce: card.force,
        damage: 0,
        damageThisTurn: 0,
        damageShield: 0,
        temporaryForce: 0,
        equipment: null,
        front: null,
        position: null
    };
}

function makeCardInstance(card, id, owner) {
    return card.category === 'unit'
        ? makeUnit(card, id, owner)
        : {
            ...card,
            id,
            catalogId: card.id,
            owner,
            keywords: extractKeywords(card.rulesText)
        };
}

function makeDeck(owner, setId, customCardIds = null) {
    if (customCardIds) {
        const cardsById = new Map(CARD_DATA.map(card => [card.id, card]));
        return shuffled(customCardIds.map((cardId, index) => {
            const card = cardsById.get(cardId);
            if (!card) throw new Error(`Carta sconosciuta nel mazzo: ${cardId}`);
            return makeCardInstance(card, `${owner}-${card.id}-${index}`, owner);
        }));
    }
    const units = shuffled(CARD_DATA.filter(card => card.setId === setId && card.category === 'unit'));
    if (units.length < 40) {
        throw new Error(`Il set ${setId} ha solo ${units.length} Unità: un mazzo richiede 40 carte.`);
    }
    return units.slice(0, 40).map(card => makeUnit(card, `${owner}-${card.id}`, owner));
}

function makeDomainDeck(owner) {
    const elements = ['Fuoco', 'Acqua', 'Terra', 'Aria', 'Ombra', 'Luce', 'Caos', 'Ordine'];
    return shuffled(Array.from({ length: 20 }, (_, index) => ({
        id: `${owner}-domain-${index}`,
        name: `Dominio di ${elements[index % elements.length]}`,
        tapped: false
    })));
}

function makePlayer(id, setId, customCardIds = null, commanderId = null) {
    const commander = getCommander(commanderId) || getCommander(defaultCommanderId());
    return {
        id,
        name: commander.name,
        commanderId: commander.id,
        pc: commander.pc,
        follia: 0,
        echo: 0,
        setId,
        armyDeck: makeDeck(id, setId, customCardIds),
        domainDeck: makeDomainDeck(id),
        hand: [],
        discard: [],
        exile: [],
        domains: [],
        sites: [],
        field: null,
        controlledUnits: [],
        fronts: Object.fromEntries(FRONT_NAMES.map(front => [front, { line: null, supA: null, supB: null }])),
        parasites: 0,
        commanderAbilityUsed: false,
        tacticEffects: {},
        sacrificeAfterCombat: [],
        tacticsPlayedThisTurn: 0,
        tacticLimitActive: false
    };
}

const GameState = {
    players: [],
    currentIndex: 0,
    phase: 'setup',
    turnNumber: 0,
    firstPlayerIndex: 0,
    firstTurn: true,
    mulliganUsed: false,
    selectedCard: null,
    selectedFromDiscard: false,
    gameOver: false,
    sacrifice: null,
    pendingTactic: null,
    pendingTorment: null,
    pendingPromotion: null,
    pendingSorvolo: false,
    sorvoloUsed: new Set(),
    log: [],

    get current() { return this.players[this.currentIndex]; },
    get opponent() { return this.players[1 - this.currentIndex]; },

    reset(customDeckIds = loadCustomDeck()) {
        const randomSeed = new Uint32Array(1);
        if (globalThis.crypto?.getRandomValues) {
            globalThis.crypto.getRandomValues(randomSeed);
        } else {
            randomSeed[0] = Date.now() >>> 0;
        }
        seedRandom(randomSeed[0]);
        const playerSetId = document.getElementById('player-set-select')?.value || SETS[0].id;
        const opponentSetId = document.getElementById('opponent-set-select')?.value || SETS[0].id;
        const playerCommanderId = document.getElementById('player-commander-select')?.value ||
            commanderForSet(playerSetId);
        this.players = [
            makePlayer('player', playerSetId, customDeckIds, playerCommanderId),
            makePlayer('opponent', opponentSetId, null, commanderForSet(opponentSetId))
        ];
        this.players.forEach(player => {
            for (let i = 0; i < 5; i++) player.hand.push(player.armyDeck.pop());
            player.domains.push(player.domainDeck.pop(), player.domainDeck.pop());
        });
        this.firstPlayerIndex = nextRandom() < 0.5 ? 0 : 1;
        this.currentIndex = this.firstPlayerIndex;
        this.phase = 'setup';
        this.turnNumber = 0;
        this.firstTurn = true;
        this.mulliganUsed = false;
        this.selectedCard = null;
        this.selectedFromDiscard = false;
        this.gameOver = false;
        this.sacrifice = null;
        this.pendingTactic = null;
        this.pendingTorment = null;
        this.pendingPromotion = null;
        this.pendingSorvolo = false;
        this.sorvoloUsed = new Set();
        this.log = [];
        Logger.clear();
        Logger.log('Partita preparata: 40 carte Esercito e 20 Domini per giocatore.');
        Logger.log('Mano iniziale: 5 carte. Puoi effettuare un Mulligan prima di iniziare.');
        Logger.log(`${this.players[this.firstPlayerIndex].name} è il primo giocatore.`);
    },

    onEquipmentPositionEntry(player, unit, slotName) {
        const id = unit.equipment?.catalogId || unit.equipment?.id;
        if (id === 'set-2-107' && slotName === 'line') this.drawCards(player, 1, unit.equipment.name);
        if (id === 'set-3-107' && slotName !== 'line') this.drawCards(player, 1, unit.equipment.name);
        if (id === 'set-3-111' && slotName === 'line') {
            const opponent = GameState.players[1 - GameState.players.indexOf(player)];
            const target = FRONT_NAMES.find(name => opponent.fronts[name].line);
            if (target) this.applyForceLoss(opponent, target, 1, unit.equipment.name, player);
        }
    },

    onUnitEntry(player, unit, frontName, slotName, fromDiscard = false) {
        this.onEquipmentPositionEntry(player, unit, slotName);
        this.applyCollectiveEntryBonus(player, unit, frontName, slotName);
        if (slotName === 'line') {
            for (const site of [...player.sites]) {
                if (site.catalogId !== 'set-1-092') continue;
                this.drawCards(player, 1, site.name);
                player.sites.splice(player.sites.indexOf(site), 1);
                player.discard.push(site);
                Logger.log(`${site.name} si distrugge dopo l’ingresso in Linea.`);
            }
        }
        const opponent = GameState.players[1 - GameState.players.indexOf(player)];
        for (const effect of getUnitEntryEffects(unit, slotName, fromDiscard)) {
            if (effect.when === 'line' && slotName !== 'line') continue;
            if (effect.type === 'recover-spectral-card') {
                const index = player.discard.findIndex(card =>
                    card.keywords?.some(keyword => keyword.startsWith('Eco Spettrale'))
                );
                if (index >= 0) {
                    const [recovered] = player.discard.splice(index, 1);
                    player.hand.push(recovered);
                    Logger.log(`${unit.name}: ${recovered.name} torna nella tua mano.`);
                }
            } else if (effect.type === 'recover-unit-cost-at-most') {
                const index = player.discard.findIndex(card =>
                    card.category === 'unit' && card.cost <= effect.cost
                );
                if (index >= 0) {
                    const [recovered] = player.discard.splice(index, 1);
                    player.hand.push(recovered);
                    Logger.log(`${unit.name}: ${recovered.name} torna nella tua mano.`);
                }
            } else if (effect.type === 'add-opponent-parasite') {
                this.addParasites(player, opponent, effect.amount);
            } else if (effect.type === 'destroy-enemy-support-in-front') {
                const targetSlot = ['supA', 'supB'].find(slot =>
                    opponent.fronts[frontName][slot] &&
                    !opponent.fronts[frontName][slot].keywords.includes('Divinità')
                );
                if (targetSlot) {
                    CombatResolver.destroyUnit(opponent, frontName, targetSlot, 'effect-destroy');
                }
            } else if (effect.type === 'create-support-token') {
                const targetSlot = ['supA', 'supB'].find(slot =>
                    !player.fronts[frontName][slot]
                );
                if (targetSlot) {
                    createToken(player, frontName, targetSlot, 'Pedina Sciame', effect.force);
                }
            } else if (effect.type === 'weaken-enemy-line-in-front' &&
                opponent.fronts[frontName].line) {
                this.applyForceLoss(
                    opponent,
                    frontName,
                    effect.amount,
                    unit.name,
                    player
                );
            }
        }
        const infiltrationCount = Number(
            unit.keywords.find(keyword => keyword.startsWith('Infiltrazione'))
                ?.match(/\((\d+)\)/)?.[1] || 0
        );
        const siteParasites = (player.sites || []).filter(site =>
            ['set-3-083', 'set-3-098'].includes(site.catalogId)
        ).length;
        const parasites = infiltrationCount + siteParasites;
        if (parasites > 0) {
            this.addParasites(player, opponent, parasites);
        }
        if (fromDiscard && unit.keywords.includes('Eco Spettrale') &&
            player.sites?.some(site => site.catalogId === 'set-2-087')) {
            this.drawCards(player, 1, 'Altare della Putrefazione');
        }
        if (slotName !== 'line' &&
            player.sites?.some(site => site.catalogId === 'set-3-097')) {
            this.triggerSiteSupportMove(player, frontName);
        }
    },

    applyCollectiveEntryBonus(player, unit, frontName, slotName) {
        if (unit.catalogId !== 'set-3-049' || slotName !== 'line' ||
            !getUnitKeywords(player, unit, frontName, slotName)
                .some(keyword => keyword.startsWith('Mente Collettiva'))) return;
        const bonus = Math.min(3, Math.max(0, this.countCollective(player) - 1));
        if (!bonus) return;
        unit.force += bonus;
        unit.currentForce += bonus;
        Logger.log(`${unit.name}: ottiene +${bonus} Forza per le altre Unità con Mente Collettiva.`);
    },

    triggerSiteSupportMove(player, frontName) {
        const opponent = GameState.players[1 - GameState.players.indexOf(player)];
        const sourceIndex = FRONT_NAMES.indexOf(frontName);
        const choices = ['supA', 'supB'].filter(slot =>
            opponent.fronts[frontName][slot] &&
            !isProtectedFromEnemyMovement(
                opponent,
                opponent.fronts[frontName][slot],
                frontName
            )
        ).flatMap(slot => {
            const target = opponent.fronts[frontName][slot];
            return [sourceIndex - 1, sourceIndex + 1]
                .filter(index => FRONT_NAMES[index])
                .flatMap(index => ['supA', 'supB']
                    .filter(targetSlot => !opponent.fronts[FRONT_NAMES[index]][targetSlot])
                    .map(targetSlot => ({
                        label: `${target.name} · ${FRONT_LABELS[frontName]} → ${FRONT_LABELS[FRONT_NAMES[index]]} Supporto`,
                        value: {
                            sourceFront: frontName,
                            sourceSlot: slot,
                            targetUnitId: target.id,
                            targetFront: FRONT_NAMES[index],
                            targetSlot
                        }
                    })));
        });
        if (!choices.length) return;
        const site = player.sites.find(item => item.catalogId === 'set-3-097');
        if (player !== GameState.players[0]) {
            this.resolveSiteSupportMove(player, choices[0].value, site);
            return;
        }
        GameState.pendingTactic = {
            card: site,
            mode: 'site-support-move',
            playerId: player.id,
            choices
        };
        UIRenderer.renderControls();
        document.getElementById('tactic-choice').focus();
    },

    resolveSiteSupportMove(player, choice, site) {
        const opponent = GameState.players[1 - GameState.players.indexOf(player)];
        const source = opponent.fronts[choice.sourceFront];
        const destination = opponent.fronts[choice.targetFront];
        const unit = source?.[choice.sourceSlot];
        const adjacent = Math.abs(
            FRONT_NAMES.indexOf(choice.sourceFront) -
            FRONT_NAMES.indexOf(choice.targetFront)
        ) === 1;
        if (!unit || unit.id !== choice.targetUnitId || destination?.[choice.targetSlot] ||
            !adjacent || !['supA', 'supB'].includes(choice.targetSlot)) {
            Logger.log(`${site.name}: il Supporto scelto non può più essere spostato.`);
            return;
        }
        if (isProtectedFromEnemyMovement(opponent, unit, choice.sourceFront)) {
            Logger.log(`${site.name}: ${unit.name} è protetta dagli effetti di movimento avversari.`);
            return;
        }
        source[choice.sourceSlot] = null;
        destination[choice.targetSlot] = unit;
        unit.front = choice.targetFront;
        unit.position = choice.targetSlot;
        this.onUnitMoved(opponent, unit, choice.sourceFront, choice.targetFront);
        Logger.log(`${site.name}: ${unit.name} viene spostata in Supporto in ${FRONT_LABELS[choice.targetFront]}.`);
    },

    addParasites(sourcePlayer, targetPlayer, count) {
        targetPlayer.parasites = (targetPlayer.parasites || 0) + count;
        Logger.log(`${count} Parassit${count === 1 ? 'a' : 'i'} assegnat${count === 1 ? 'o' : 'i'} a ${targetPlayer.name}.`);
        for (const owner of GameState.players) {
            const sporeWells = owner.sites?.filter(site => site.catalogId === 'set-3-088') || [];
            for (const site of sporeWells) this.drawCards(owner, count, site.name);
            const parasiteSanctuaries =
                owner.sites?.filter(site => site.catalogId === 'set-3-093') || [];
            targetPlayer.pc = Math.max(
                0,
                targetPlayer.pc - count * parasiteSanctuaries.length
            );
            if (owner.field?.catalogId === 'set-3-115') {
                targetPlayer.pc = Math.max(0, targetPlayer.pc - count);
            }
        }
        GameState.checkVictory();
    },

    resolveSiteActivation(site, choice) {
        const id = site.catalogId || site.id;
        const player = GameState.players[0];
        const opponent = GameState.players[1];
        if (id === 'set-1-102') {
            const sacrificed = CombatResolver.removeUnit(player, choice.frontName, choice.slotName);
            const line = player.fronts[choice.frontName].line;
            if (!sacrificed || !line) throw new Error('Non è più possibile sacrificare l’Unità scelta.');
            line.currentForce += 2;
            line.temporaryForce = (line.temporaryForce || 0) + 2;
        } else if (id === 'set-2-088') {
            const owner = choice.ownerKey === 'player' ? player : opponent;
            const target = choice.zone === 'field'
                ? owner.field
                : owner.sites.find(site => site.id === choice.siteId);
            if (!target || target.id !== choice.siteId) {
                throw new Error('Il Sito scelto non è più in gioco.');
            }
            target.ruins = (target.ruins || 0) + 1;
            if (target.ruins >= 2) {
                if (choice.zone === 'field') {
                    owner.discard.push(owner.field);
                    owner.field = null;
                } else {
                    const index = owner.sites.indexOf(target);
                    owner.discard.push(...owner.sites.splice(index, 1));
                }
            }
        } else if (id === 'set-3-082') {
            const source = player.fronts[choice.frontName];
            const target = player.fronts[choice.target];
            const unit = source[choice.slot];
            if (!unit || target[choice.targetSlot]) throw new Error('Il Supporto scelto non può essere spostato.');
            source[choice.slot] = null;
            target[choice.targetSlot] = unit;
            unit.front = choice.target;
            unit.position = choice.targetSlot;
            this.onUnitMoved(player, unit, choice.frontName, choice.target);
        } else if (id === 'set-3-089') {
            const source = player.fronts[choice.frontName];
            const target = player.fronts[choice.target];
            const unit = source.line;
            if (!unit || target.line) throw new Error('La Linea scelta non può essere spostata.');
            source.line = null;
            target.line = unit;
            unit.front = choice.target;
            unit.position = 'line';
            this.onUnitMoved(player, unit, choice.frontName, choice.target, true);
        }
        site.lastActivatedTurn = GameState.turnNumber;
        Logger.log(`${site.name}: abilità attivata.`);
        UIRenderer.refresh();
    },

    snapshot() {
        return {
            players: this.players,
            currentIndex: this.currentIndex,
            phase: this.phase,
            turnNumber: this.turnNumber,
            firstPlayerIndex: this.firstPlayerIndex,
            firstTurn: this.firstTurn,
            mulliganUsed: this.mulliganUsed,
            gameOver: this.gameOver,
            sorvoloUsed: [...this.sorvoloUsed],
            randomState: getRandomState()
        };
    },

    restore(snapshot) {
        this.players = snapshot.players;
        this.currentIndex = snapshot.currentIndex;
        this.phase = snapshot.phase;
        this.turnNumber = snapshot.turnNumber;
        this.firstPlayerIndex = snapshot.firstPlayerIndex;
        this.firstTurn = snapshot.firstTurn;
        this.mulliganUsed = snapshot.mulliganUsed === true;
        this.gameOver = snapshot.gameOver === true;
        this.selectedCard = null;
        this.selectedFromDiscard = false;
        this.sacrifice = null;
        this.pendingTactic = null;
        this.pendingTorment = null;
        this.pendingPromotion = null;
        this.pendingSorvolo = false;
        this.sorvoloUsed = new Set(snapshot.sorvoloUsed || []);
        restoreRandomState(snapshot.randomState);
        this.log = [];
    },

    countUnits(player) {
        return FRONT_NAMES.reduce((count, name) =>
            count + SLOT_NAMES.filter(slot => player.fronts[name][slot]).length, 0);
    },

    unitsInFront(player, frontName) {
        const front = player.fronts[frontName];
        return SLOT_NAMES.map(slot => front[slot]).filter(Boolean);
    },

    checkVictory() {
        for (const player of this.players) {
            if (player.pc <= 0 || player.follia >= 10) {
                this.gameOver = true;
                this.phase = 'gameover';
                const winner = this.players.find(candidate => candidate !== player);
                Logger.log(`${player.name} ha perso. ${winner.name} vince la partita!`);
                UIRenderer.showGameOver(winner);
                persistGame(this.snapshot());
                return true;
            }
        }
        return false;
    }
};

const Logger = {
    clear() {
        const logEl = document.getElementById('log');
        if (logEl) logEl.replaceChildren();
    },

    log(message, type = '') {
        const logEl = document.getElementById('log');
        if (!logEl) return;
        const line = document.createElement('div');
        line.textContent = `> ${message}`;
        if (type === 'ferocity') line.style.color = '#ff2a6d';
        logEl.appendChild(line);
        while (logEl.children.length > 100) logEl.firstElementChild.remove();
        logEl.scrollTop = logEl.scrollHeight;
    }
};

const FX = {
    audio: null,
    tone(freq, type, duration) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        try {
            this.audio ||= new AudioCtor();
            if (this.audio.state === 'suspended') this.audio.resume();
            const oscillator = this.audio.createOscillator();
            const gain = this.audio.createGain();
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(freq, this.audio.currentTime);
            gain.gain.setValueAtTime(0.08, this.audio.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audio.currentTime + duration);
            oscillator.connect(gain);
            gain.connect(this.audio.destination);
            oscillator.start();
            oscillator.stop(this.audio.currentTime + duration);
        } catch (error) {
            Logger.log(`Audio non disponibile: ${error.message}`);
        }
    },
    play(kind) {
        if (!getSettings().audio) return;
        if (kind === 'draw') this.tone(400, 'sine', 0.1);
        if (kind === 'play') this.tone(600, 'square', 0.12);
        if (kind === 'attack') this.tone(150, 'sawtooth', 0.2);
    }
};

const UIRenderer = {
    updateStats() {
        const player = GameState.players[0];
        const opponent = GameState.players[1];
        document.getElementById('player-pc').textContent = player.pc;
        document.getElementById('player-follia').textContent = player.follia;
        document.getElementById('player-echo').textContent = player.echo;
        document.getElementById('player-parassiti').textContent = player.parasites;
        document.getElementById('player-deck').textContent = player.armyDeck.length;
        document.getElementById('opp-pc').textContent = opponent.pc;
        document.getElementById('opp-follia').textContent = opponent.follia;
        document.getElementById('opp-echo').textContent = opponent.echo;
        document.getElementById('opp-parassiti').textContent = opponent.parasites;
        document.getElementById('opp-deck').textContent = opponent.armyDeck.length;
        document.getElementById('player-domini-count').textContent =
            `${player.domains.filter(domain => !domain.tapped).length}/${player.domains.length}`;
        this.renderCommander();
    },

    renderCommander() {
        const [player, opponent] = GameState.players;
        if (!player) return;
        const playerCommander = getCommander(player.commanderId);
        const opponentCommander = opponent ? getCommander(opponent.commanderId) : null;
        document.getElementById('player-commander-name').textContent =
            playerCommander?.name || 'IL TUO COMANDANTE';
        document.getElementById('player-commander-ability').textContent = playerCommander
            ? `${playerCommander.activation.name} · ${player.commanderAbilityUsed ? 'già usata' : 'pronta'} — ${playerCommander.activation.text}`
            : '';
        if (opponent) {
            document.getElementById('opp-commander-name').textContent =
                opponentCommander?.name || 'COMANDANTE NEMICO';
            document.getElementById('opp-commander-ability').textContent = opponentCommander
                ? opponentCommander.activation.text
                : '';
        }
    },

    renderDomains(player, containerId) {
        const area = document.getElementById(containerId);
        const title = area.querySelector('.zone-title');
        area.replaceChildren(title);
        player.domains.forEach(domain => {
            const element = document.createElement('div');
            element.className = `siti-slot occupied${domain.tapped ? ' tapped' : ''}`;
            element.textContent = domain.name;
            area.appendChild(element);
        });
        (player.sites || []).forEach(site => {
            const element = document.createElement('div');
            element.className = 'siti-slot occupied permanent-card';
            element.textContent = `${site.name}${site.decay != null ? ` · Decadenza ${site.decay}` : ''}${site.ruins ? ` · ${site.ruins} Rovina` : ''}`;
            element.title = site.rulesText;
            if (player === GameState.players[0] && GameController.canActivateSite(site)) {
                element.tabIndex = 0;
                element.setAttribute('role', 'button');
                element.addEventListener('click', () => GameController.activateSite(site));
                element.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        GameController.activateSite(site);
                    }
                });
            }
            area.appendChild(element);
        });
        if (player.field) {
            const element = document.createElement('div');
            element.className = 'siti-slot occupied permanent-card field-card';
            element.textContent = `Campo: ${player.field.name}`;
            element.title = player.field.rulesText;
            area.appendChild(element);
        }
    },

    renderSlot(prefix, frontName, slotName, unit) {
        const element = document.getElementById(`${prefix}-${frontName}-${slotName}`);
        if (!element) return;
        element.replaceChildren();
        const side = prefix === 'p' ? 'tuo' : 'avversario';
        const label = FRONT_LABELS[frontName];
        const slotLabel = slotName === 'line' ? 'Linea' : `Supporto ${slotName === 'supA' ? 'A' : 'B'}`;
        if (!unit) {
            element.textContent = 'Vuoto';
            element.setAttribute('aria-label', `Fronte ${label}, ${slotLabel} ${side}: vuoto`);
            element.setAttribute('role', 'button');
            element.tabIndex = prefix === 'p' ? 0 : -1;
            element.classList.remove('sacrifice-target');
            return;
        }
        element.setAttribute(
            'aria-label',
            `Fronte ${label}, ${slotLabel} ${side}: ${unit.name}, Forza ${unit.currentForce}`
        );
        element.setAttribute('role', 'button');
        element.tabIndex = prefix === 'p' ? 0 : -1;
        const icon = document.createElement('span');
        icon.className = 'slot-icon';
        icon.textContent = unit.icon;
        const details = document.createElement('div');
        details.className = 'slot-details';
        const name = document.createElement('div');
        name.className = 'slot-name';
        name.textContent = unit.name;
        const keywords = document.createElement('span');
        keywords.className = 'slot-keyword';
        const owner = GameState.players[prefix === 'p' ? 0 : 1];
        keywords.textContent = [
            ...getUnitKeywords(owner, unit, frontName, slotName),
            ...(unit.equipment ? [`Equip: ${unit.equipment.name}`] : [])
        ].join(', ');
        details.append(name, keywords);
        const force = document.createElement('span');
        force.className = 'slot-force';
        force.textContent = Number.isFinite(unit.force)
            ? `${unit.currentForce}/${unit.force}`
            : 'In gioco';
        element.append(icon, details, force);
        element.classList.toggle('sacrifice-target',
            GameState.sacrifice?.frontName === frontName && prefix === 'p');
    },

    renderBoard() {
        for (const frontName of FRONT_NAMES) {
            for (const slotName of SLOT_NAMES) {
                this.renderSlot('p', frontName, slotName, GameState.players[0].fronts[frontName][slotName]);
                this.renderSlot('opp', frontName, slotName, GameState.players[1].fronts[frontName][slotName]);
            }
        }
        this.renderDomains(GameState.players[0], 'player-siti-area');
        this.renderDomains(GameState.players[1], 'opp-siti-area');
        this.updateStats();
        this.renderControls();
        this.updateBoardInteractivity();
    },

    renderHand() {
        const area = document.getElementById('hand-area');
        area.replaceChildren();
        if (!GameState.players.length || GameState.phase === 'setup') {
            area.textContent = 'La tua mano iniziale contiene 5 carte.';
            return;
        }
        const player = GameState.players[0];
        const spectralDiscard = player.discard.filter(card => card.keywords.includes('Eco Spettrale'));
        if (player.hand.length === 0 && spectralDiscard.length === 0) {
            area.textContent = 'Mano vuota.';
            return;
        }
        const renderCard = (card, fromDiscard = false) => {
            const element = document.createElement('button');
            element.type = 'button';
            element.className = `card${fromDiscard ? ' spectral-card' : ''}${GameState.selectedCard?.id === card.id ? ' selected' : ''}`;
            element.disabled = GameState.currentIndex !== 0 || GameState.phase !== 'principale' ||
                GameState.sacrifice !== null || GameState.pendingTorment !== null ||
                GameState.pendingTactic !== null ||
                (card.category !== 'unit' && !['site', 'field', 'equipment'].includes(card.category) &&
                    !isImmediateTacticSupported(card));
            const cost = document.createElement('span');
            cost.className = 'card-cost';
            cost.textContent = card.category === 'equipment'
                ? String(card.cost + (card.equipCost || 0))
                : card.cost;
            const name = document.createElement('span');
            name.className = 'card-name';
            name.textContent = card.name;
            const art = document.createElement('canvas');
            art.className = 'card-art card-art-canvas';
            art.width = 64;
            art.height = 48;
            drawCardPixelArt(art, card);
            const stats = document.createElement('span');
            stats.className = 'card-stats';
            const executionStatus = getCardExecutionStatus(card);
            stats.textContent = card.category === 'unit'
                ? `Forza ${card.force} · ${card.type}`
                : ['site', 'field', 'equipment'].includes(card.category)
                    ? `${card.category} · ${executionStatus.label}`
                    : `${card.category} · ${executionStatus.label}`;
            const rules = document.createElement('span');
            rules.className = 'card-rules';
            rules.textContent = card.category === 'unit'
                ? `${executionStatus.label}: ${card.rulesText}${fromDiscard ? ' · +1 Dominio' : ''}`
                : card.category === 'site'
                    ? `${executionStatus.label}: ${card.rulesText}`
                    : `${executionStatus.label}: ${executionStatus.detail}`;
            element.title = card.rulesText;
            element.append(cost, name, art, stats, rules);
            element.addEventListener('click', () => fromDiscard
                ? GameController.selectDiscardCard(card) : GameController.selectCard(card));
            area.appendChild(element);
        };
        player.hand.forEach(card => renderCard(card));
        spectralDiscard.forEach(card => renderCard(card, true));
    },

    updateBoardInteractivity() {
        for (const frontName of FRONT_NAMES) {
            for (const slotName of SLOT_NAMES) {
                const element = document.getElementById(`p-${frontName}-${slotName}`);
                if (!element) continue;
                const canDeploy = GameState.phase === 'principale' && GameState.currentIndex === 0 &&
                    GameState.selectedCard && !GameState.sacrifice && !GameState.pendingTorment;
                const player = GameState.players[0];
                const opponent = GameState.players[1];
                const front = player.fronts[frontName];
                const keywords = GameState.selectedCard
                    ? getUnitKeywords(player, GameState.selectedCard, frontName, slotName)
                    : [];
                if (player.field?.catalogId === 'set-1-113' &&
                    GameState.countUnits(player) < GameState.countUnits(opponent) &&
                    !keywords.includes('Assalto')) keywords.push('Assalto');
                const deployment = GameState.selectedCard
                    ? checkDeployment(
                        { ...GameState.selectedCard, keywords },
                        front,
                        slotName,
                        { ownSites: player.sites, opposingSites: opponent.sites }
                    )
                    : { legal: false };
                element.classList.toggle('selectable',
                    Boolean(canDeploy && deployment.legal));
                element.classList.toggle('sacrifice-target',
                    Boolean(GameState.sacrifice?.frontName === frontName &&
                        GameState.players[0].fronts[frontName][slotName]));
            }
        }
    },

    resolvePermanentTurnStart(playerIndex) {
        const player = GameState.players[playerIndex];
        const opponent = GameState.players[1 - playerIndex];
        const expiredSites = [];
        for (const site of [...(player.sites || [])]) {
            if (!Number.isInteger(site.decayRemaining)) continue;
            site.decayRemaining = Math.max(0, site.decayRemaining - 1);
            if (site.decayRemaining === 0) expiredSites.push(site);
        }
        for (const site of expiredSites) {
            player.sites.splice(player.sites.indexOf(site), 1);
            player.discard.push(site);
            Logger.log(`${site.name}: l’ultima Decadenza viene rimossa; il Sito è distrutto.`);
            if (site.catalogId === 'set-1-094') {
                const frontName = FRONT_NAMES.find(name =>
                    !player.fronts[name].supA || !player.fronts[name].supB
                );
                if (frontName) {
                    const slot = player.fronts[frontName].supA ? 'supB' : 'supA';
                    createToken(player, frontName, slot, 'Pedina Raptor', 2);
                }
            }
        }
        const line = FRONT_NAMES.map(name => player.fronts[name].line).find(Boolean);
        const enemyLine = FRONT_NAMES.map(name => opponent.fronts[name].line).find(Boolean);
        for (const site of player.sites) {
            const id = site.catalogId;
            if (id === 'set-1-091' && line) this.applyTemporaryForce(line, 1, `${site.name}`);
            if (['set-1-093', 'set-2-082'].includes(id) && enemyLine) {
                this.applyForceLoss(opponent, FRONT_NAMES.find(name =>
                    opponent.fronts[name].line === enemyLine
                ), 1, site.name, player);
            }
            if (id === 'set-1-108') {
                const raptor = player.armyDeck.findIndex(card => /raptor/i.test(card.type || ''));
                if (raptor >= 0) {
                    const [card] = player.armyDeck.splice(raptor, 1);
                    player.armyDeck.push(card);
                    Logger.log(`${site.name}: ${card.name} cercata e messa in cima al mazzo.`);
                }
            }
            if (id === 'set-2-079' && player.armyDeck.length) {
                Logger.log(`${site.name}: prima carta del mazzo ${player.armyDeck.at(-1).name}.`);
            }
            if (id === 'set-2-090' || id === 'set-2-119') {
                if (player.discard.length) player.armyDeck.unshift(player.discard.shift());
            }
            if (id === 'set-2-093') {
                FRONT_NAMES.forEach(frontName => {
                    if (opponent.fronts[frontName].line) {
                        this.applyForceLoss(opponent, frontName, 1, site.name, player);
                    }
                });
            }
            if (id === 'set-2-100') {
                const index = player.discard.findIndex(card =>
                    card.keywords?.includes('Eco Spettrale')
                );
                if (index >= 0) player.hand.push(...player.discard.splice(index, 1));
            }
            if (id === 'set-3-081') {
                const frontName = FRONT_NAMES.find(name =>
                    player.fronts[name].line && (!player.fronts[name].supA || !player.fronts[name].supB)
                );
                if (frontName) {
                    const front = player.fronts[frontName];
                    createToken(player, frontName, front.supA ? 'supB' : 'supA');
                }
            }
            if (id === 'set-3-084') {
                Logger.log(`${site.name}: mano avversaria — ${opponent.hand.map(card => card.name).join(', ') || 'vuota'}.`);
            }
            if (id === 'set-3-092') {
                const sourceName = FRONT_NAMES.find((name, index) => {
                    const unit = opponent.fronts[name].line;
                    return unit &&
                        !isProtectedFromEnemyMovement(opponent, unit, name) &&
                        [index - 1, index + 1].some(targetIndex =>
                        FRONT_NAMES[targetIndex] && !opponent.fronts[FRONT_NAMES[targetIndex]].line
                    );
                });
                if (sourceName) {
                    const sourceIndex = FRONT_NAMES.indexOf(sourceName);
                    const destinationIndex = [sourceIndex - 1, sourceIndex + 1].find(index =>
                        FRONT_NAMES[index] && !opponent.fronts[FRONT_NAMES[index]].line
                    );
                    const unit = opponent.fronts[sourceName].line;
                    opponent.fronts[sourceName].line = null;
                    opponent.fronts[FRONT_NAMES[destinationIndex]].line = unit;
                    unit.front = FRONT_NAMES[destinationIndex];
                    this.onUnitMoved(opponent, unit, sourceName, FRONT_NAMES[destinationIndex], true);
                }
            }
            if (id === 'set-3-102' && this.countCollective(player) >= 3) {
                this.drawCards(player, 1, site.name);
            }
            if (id === 'set-3-104') {
                FRONT_NAMES.forEach(frontName => {
                    const front = player.fronts[frontName];
                    if (!front.line && !front.supA && !front.supB) return;
                    const slot = !front.supA ? 'supA' : !front.supB ? 'supB' : null;
                    if (slot) createToken(player, frontName, slot);
                });
            }
        }
        const sunkenCities = GameState.players.flatMap(owner =>
            (owner.sites || []).filter(site => site.catalogId === 'set-2-103')
        );
        for (const site of sunkenCities) {
            if (!player.armyDeck.length) break;
            const drawn = this.drawCards(player, 1, site.name);
            if (!drawn) continue;
            player.pc = Math.max(0, player.pc - 1);
            Logger.log(`${player.name} perde 1 PC per ${site.name}.`);
        }
        if (player.field?.catalogId === 'set-1-120') {
            const frontName = FRONT_NAMES.find(name => !player.fronts[name].supA || !player.fronts[name].supB);
            if (frontName) {
                const front = player.fronts[frontName];
                createToken(player, frontName, front.supA ? 'supB' : 'supA', 'Pedina Raptor', 3);
            }
        }
        if (player.field?.catalogId === 'set-3-120' &&
            FRONT_NAMES.every(frontName => SLOT_NAMES.some(slot => player.fronts[frontName][slot]))) {
            opponent.pc = Math.max(0, opponent.pc - 1);
            Logger.log(`${player.field.name}: il Comandante avversario perde 1 PC.`);
        }
        if (player.field?.catalogId === 'set-2-119' && player.discard.length) {
            player.armyDeck.unshift(player.discard.shift());
        }
    },

    countCollective(player) {
        return FRONT_NAMES.reduce((count, frontName) => count +
            SLOT_NAMES.filter(slotName =>
                player.fronts[frontName][slotName] &&
                getUnitKeywords(player, player.fronts[frontName][slotName], frontName, slotName)
                    .some(keyword => keyword.startsWith('Mente Collettiva'))
            ).length, 0);
    },

    resolvePermanentCombatStart(playerIndex) {
        for (let attackerIndex = 0; attackerIndex < 2; attackerIndex++) {
            const player = GameState.players[attackerIndex];
            const opponent = GameState.players[1 - attackerIndex];
            for (const site of player.sites || []) {
                if (site.catalogId === 'set-1-099') {
                    const frontName = FRONT_NAMES.find(name => opponent.fronts[name].line);
                    if (frontName) this.applyForceLoss(opponent, frontName, 1, site.name, player);
                }
            }
            if (player.field?.catalogId === 'set-3-116') {
                for (const frontName of FRONT_NAMES) {
                    const count = SLOT_NAMES.filter(slot =>
                        player.fronts[frontName][slot] &&
                        getUnitKeywords(player, player.fronts[frontName][slot], frontName, slot)
                            .some(keyword => keyword.startsWith('Mente Collettiva'))
                    ).length;
                    if (count && opponent.fronts[frontName].line) {
                        this.applyForceLoss(opponent, frontName, Math.min(2, count), player.field.name, player);
                    }
                }
            }
        }
    },

    applyTemporaryForce(unit, modifier, source) {
        const previous = unit.currentForce;
        unit.currentForce = Math.max(0, unit.currentForce + modifier);
        const applied = unit.currentForce - previous;
        unit.temporaryForce = (unit.temporaryForce || 0) + applied;
        if (applied < 0) unit.forceLostThisTurn = (unit.forceLostThisTurn || 0) - applied;
        Logger.log(`${source}: ${unit.name} ${applied >= 0 ? 'ottiene' : 'perde'} ${Math.abs(applied)} Forza fino a fine turno.`);
    },

    applyForceLoss(owner, frontName, amount, source, sourcePlayer, triggerEquipment = true) {
        const unit = owner.fronts[frontName]?.line;
        if (!unit) return;
        const applied = Math.min(amount, Math.max(0, unit.currentForce));
        if (!applied) return;
        unit.currentForce -= applied;
        unit.temporaryForce = (unit.temporaryForce || 0) - applied;
        unit.forceLostThisTurn = (unit.forceLostThisTurn || 0) + applied;
        Logger.log(`${source}: ${unit.name} perde ${applied} Forza.`);
        CombatResolver.onForceLoss(owner, unit, applied, sourcePlayer, triggerEquipment);
        if (unit.currentForce <= 0 && owner.fronts[frontName]?.line === unit) {
            CombatResolver.removeUnit(owner, frontName, 'line', 'effect-destroy', sourcePlayer);
        }
    },

    onUnitMoved(player, unit, sourceFront, targetFront, wasLine = false, usedSorvolo = false) {
        this.onEquipmentPositionEntry(player, unit, unit.position);
        if (usedSorvolo) this.resolveSorvoloEntryEffects(player, unit, targetFront);
        if (!wasLine && unit.position === 'line') {
            this.applyCollectiveEntryBonus(player, unit, targetFront, unit.position);
        }
        if (wasLine) {
            for (const fieldOwner of GameState.players) {
                if (fieldOwner.field?.catalogId !== 'set-3-117') continue;
                if (unit.currentForce <= 0 ||
                    player.fronts[targetFront][unit.position] !== unit) break;
                const applied = Math.min(1, Math.max(0, unit.currentForce));
                if (!applied) continue;
                unit.currentForce -= applied;
                unit.temporaryForce = (unit.temporaryForce || 0) - applied;
                unit.forceLostThisTurn = (unit.forceLostThisTurn || 0) + applied;
                CombatResolver.onForceLoss(player, unit, applied, fieldOwner);
                Logger.log(`${fieldOwner.field.name}: ${unit.name} perde ${applied} Forza.`);
                if (unit.currentForce <= 0) {
                    CombatResolver.removeUnit(player, targetFront, unit.position, 'effect-destroy', fieldOwner);
                }
            }
        }
        if (player.sites?.some(site => site.catalogId === 'set-3-085') &&
            getUnitKeywords(player, unit, targetFront, unit.position).includes('Sorvolo')) {
            const enemy = player === GameState.players[0] ? GameState.players[1] : GameState.players[0];
            const frontName = FRONT_NAMES.find(name => enemy.fronts[name].line);
            if (frontName) this.applyForceLoss(enemy, frontName, 1, 'Fenditura Dimensionale', player);
        }
        const enemy = player === GameState.players[0] ? GameState.players[1] : GameState.players[0];
        if (wasLine && !player.fronts[sourceFront].line &&
            enemy.field?.catalogId === 'set-1-117') {
            player.pc = Math.max(0, player.pc - 1);
            Logger.log(`${enemy.field.name}: ${player.name} perde 1 PC perché un Fronte diventa scoperto.`);
            GameState.checkVictory();
        }
    },

    resolveSorvoloEntryEffects(player, unit, targetFront) {
        const opponent = GameState.players[1 - GameState.players.indexOf(player)];
        for (const effect of getSorvoloEntryEffects(unit)) {
            if (effect.type === 'boost-own-line') {
                const line = player.fronts[targetFront].line;
                if (!line) continue;
                line.currentForce += effect.amount;
                line.temporaryForce = (line.temporaryForce || 0) + effect.amount;
            } else if (effect.type === 'damage-enemy-line-in-front') {
                if (opponent.fronts[targetFront].line) {
                    CombatResolver.damageLine(opponent, targetFront, effect.amount, player, true);
                }
            } else if (effect.type === 'add-opponent-parasite') {
                this.addParasites(player, opponent, 1);
            } else if (effect.type === 'weaken-enemy-line') {
                const frontName = FRONT_NAMES.find(name => opponent.fronts[name].line);
                if (frontName) {
                    this.applyForceLoss(opponent, frontName, effect.amount, unit.name, player);
                }
            } else if (effect.type === 'destroy-weak-enemy-line') {
                const frontName = FRONT_NAMES.find(name =>
                    opponent.fronts[name].line?.currentForce <= effect.maximumForce
                );
                if (frontName) {
                    CombatResolver.destroyUnit(opponent, frontName, 'line', 'effect-destroy');
                }
            }
        }
    },

    renderControls() {
        const setup = GameState.phase === 'setup';
        const playerTurn = GameState.currentIndex === 0 && !GameState.gameOver;
        document.getElementById('player-set-select').disabled = !setup;
        document.getElementById('opponent-set-select').disabled = !setup;
        document.getElementById('player-commander-select').disabled = !setup;
        const commanderBtn = document.getElementById('btn-commander');
        commanderBtn.hidden = !playerTurn || GameState.phase !== 'principale';
        commanderBtn.disabled = Boolean(GameState.players[0]?.commanderAbilityUsed) ||
            GameState.sacrifice || GameState.pendingTactic || GameState.pendingTorment ||
            GameState.pendingPromotion;
        document.getElementById('btn-mulligan').hidden = !setup || GameState.mulliganUsed;
        document.getElementById('btn-start').hidden = !setup;
        document.getElementById('btn-principale').hidden = !playerTurn || GameState.phase !== 'rifornimento';
        document.getElementById('btn-attack').hidden = !playerTurn || GameState.phase !== 'principale';
        document.getElementById('btn-finale').hidden = !playerTurn || GameState.phase !== 'finale';
        document.getElementById('btn-canala').hidden =
            !playerTurn || GameState.phase !== 'rifornimento' || GameState.players[0].follia === 0;
        document.getElementById('btn-sacrifice-end').hidden = !GameState.sacrifice;
        document.getElementById('sorvolo-panel').hidden = !GameState.pendingSorvolo;
        document.getElementById('torment-panel').hidden = !GameState.pendingTorment;
        document.getElementById('tactic-panel').hidden = !GameState.pendingTactic;
        document.getElementById('promotion-panel').hidden = !GameState.pendingPromotion;
        if (GameState.pendingPromotion) {
            const promotionChoice = document.getElementById('promotion-choice');
            promotionChoice.replaceChildren();
            GameState.pendingPromotion.supports.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot;
                option.textContent = slot === 'supA' ? 'Supporto A' : 'Supporto B';
                promotionChoice.appendChild(option);
            });
        }
        const tacticChoice = document.getElementById('tactic-choice');
        tacticChoice.replaceChildren();
        if (GameState.pendingTactic) {
            GameState.pendingTactic.choices.forEach((choice, index) => {
                const option = document.createElement('option');
                option.value = String(index);
                option.textContent = choice.label;
                tacticChoice.appendChild(option);
            });
            document.getElementById('tactic-choice-label').textContent =
                GameState.pendingTactic.mode === 'discard'
                    ? `Scegli una carta da scartare per ${GameState.pendingTactic.card.name}:`
                    : GameState.pendingTactic.mode === 'shadow-recovery'
                        ? 'Scegli facoltativamente un’Unità dagli scarti da mettere in Supporto:'
                    : GameState.pendingTactic.mode === 'equipment'
                        ? `Scegli l’Unità da equipaggiare con ${GameState.pendingTactic.card.name}:`
                    : GameState.pendingTactic.mode === 'permanent-replace'
                        ? `Scegli quale permanente distruggere per giocare ${GameState.pendingTactic.card.name}:`
                    : GameState.pendingTactic.mode === 'active-site'
                        ? `Scegli l’effetto di ${GameState.pendingTactic.card.name}:`
                    : GameState.pendingTactic.mode === 'site-support-move'
                        ? 'Scegli un Supporto avversario da spostare in un Fronte adiacente:'
                    : `Scegli un bersaglio per ${GameState.pendingTactic.card.name}:`;
        }
        document.getElementById('btn-tactic-cancel').hidden =
            GameState.pendingTactic?.mode === 'discard';
        document.getElementById('btn-tactic-confirm').textContent =
            GameState.pendingTactic?.mode === 'discard' ? 'SCARTA CARTA' :
                GameState.pendingTactic?.mode === 'shadow-recovery' ? 'CONFERMA RECUPERO' :
                    GameState.pendingTactic?.mode === 'equipment' ? 'EQUIPAGGIA' :
                        GameState.pendingTactic?.mode === 'permanent-replace' ? 'SOSTITUISCI E GIOCA' :
                            GameState.pendingTactic?.mode === 'active-site' ? 'ATTIVA' :
                                GameState.pendingTactic?.mode === 'site-support-move' ? 'SPOSTA SUPPORTO' :
                                    'RISOLVI TATTICA';
        if (GameState.pendingTorment) {
            const pending = GameState.pendingTorment;
            document.getElementById('torment-choice').textContent =
                `${pending.winnerName}: infliggi ${pending.commanderDamage} danni al Comandante oppure assegna ${pending.torment} Follia?`;
        }
        const sorvoloChoice = document.getElementById('sorvolo-choice');
        sorvoloChoice.replaceChildren();
        this.getSorvoloOptions().forEach((option, index) => {
            const element = document.createElement('option');
            element.value = String(index);
            element.textContent = option.label;
            sorvoloChoice.appendChild(element);
        });
        document.getElementById('btn-attack').disabled =
            Boolean(GameState.sacrifice || GameState.pendingTorment || GameState.pendingTactic ||
                GameState.pendingPromotion);
        document.getElementById('btn-finale').disabled =
            Boolean(GameState.sacrifice || GameState.pendingTorment || GameState.pendingTactic ||
                GameState.pendingPromotion);
        document.getElementById('btn-new-game').disabled =
            Boolean(GameState.sacrifice || GameState.pendingTorment || GameState.pendingPromotion);
        document.getElementById('btn-demo-decks').disabled =
            Boolean(GameState.sacrifice || GameState.pendingTorment || GameState.pendingPromotion);
        const phase = GameState.phase === 'setup' ? 'PREPARAZIONE' :
            ({ rifornimento: 'RIFORNIMENTO', principale: 'FASE PRINCIPALE', scontro: 'SCONTRO', finale: 'FASE FINALE', gameover: 'PARTITA TERMINATA' }[GameState.phase]);
        document.getElementById('phase-label').textContent = phase;
        document.getElementById('turn-label').textContent = GameState.players.length
            ? `Turno ${GameState.turnNumber || '—'} · ${GameState.current.name}`
            : '';
    },

    showGameOver(winner) {
        this.renderBoard();
        document.getElementById('game-result').textContent = `${winner.name} vince!`;
        document.getElementById('game-result').hidden = false;
    },

    refresh() {
        this.renderBoard();
        this.renderHand();
        if (!GameState.sacrifice && !GameState.pendingSorvolo && !GameState.pendingTactic &&
            !GameState.pendingTorment && !GameState.pendingPromotion && GameState.phase !== 'scontro') {
            persistGame(GameState.snapshot());
        }
    },

    getSorvoloOptions() {
        if (!GameState.players.length) return [];
        const player = GameState.players[0];
        const options = [];
        FRONT_NAMES.forEach((frontName, index) => {
            SLOT_NAMES.forEach(slotName => {
                const unit = player.fronts[frontName][slotName];
                if (!unit || !getUnitKeywords(player, unit, frontName, slotName).includes('Sorvolo') || unit.cannotMoveThisTurn ||
                    GameState.sorvoloUsed.has(unit.id)) return;
                [index - 1, index + 1].forEach(adjacentIndex => {
                    const adjacentFront = FRONT_NAMES[adjacentIndex];
                    if (!adjacentFront) return;
                    const target = player.fronts[adjacentFront];
                    const canEnterLine = !target.line &&
                        (player.sites?.some(site => site.catalogId === 'set-1-104') ||
                            player.field?.catalogId === 'set-3-099');
                    const targetSlots = canEnterLine
                        ? ['line', ...(target.supA === null ? ['supA'] : []),
                            ...(target.supB === null ? ['supB'] : [])]
                        : [target.supA === null ? 'supA' : target.supB === null ? 'supB' : null]
                            .filter(Boolean);
                    for (const targetSlot of targetSlots) {
                        options.push({
                            frontName,
                            slotName,
                            targetFront: adjacentFront,
                            targetSlot,
                            unit,
                            label: `${unit.name}: ${FRONT_LABELS[frontName]} → ${FRONT_LABELS[adjacentFront]} (${targetSlot === 'line' ? 'Linea' : 'Supporto'})`
                        });
                    }
                });
                if (player.sites?.some(site => site.catalogId === 'set-2-086')) {
                    FRONT_NAMES.filter(targetFront => targetFront !== frontName &&
                        ![index - 1, index + 1].some(adjacentIndex =>
                            FRONT_NAMES[adjacentIndex] === targetFront
                        )).forEach(targetFront => {
                        const target = player.fronts[targetFront];
                        const targetSlot = target.supA === null ? 'supA' :
                            target.supB === null ? 'supB' : null;
                        if (!targetSlot) return;
                        options.push({
                            frontName,
                            slotName,
                            targetFront,
                            targetSlot,
                            unit,
                            label: `${unit.name}: ${FRONT_LABELS[frontName]} → ${FRONT_LABELS[targetFront]} (Supporto)`
                        });
                    });
                }
            });
        });
        return options;
    }
};

const CombatResolver = {
    async resolveAll() {
        Logger.log('=== FASE DI SCONTRO: SINISTRA → CENTRO → DESTRA ===');
        FX.play('attack');
        for (const frontName of FRONT_NAMES) {
            if (GameState.gameOver) break;
            await this.resolveFront(frontName);
        }
        GameState.checkVictory();
        UIRenderer.refresh();
    },

    strength(player, frontName, enemyLine) {
        const front = player.fronts[frontName];
        if (!front.line) return 0;
        const collective = SLOT_NAMES.map(slot => front[slot])
            .filter(unit => unit?.keywords.includes('Mente Collettiva')).length;
        const opponentPlayer = player === GameState.players[0]
            ? GameState.players[1] : GameState.players[0];
        const wearMatch = enemyLine && getUnitKeywords(
            opponentPlayer, enemyLine, frontName, 'line'
        ).find(keyword => keyword.startsWith('Logorare'));
        const wearPenalty = wearMatch ? Number(wearMatch.match(/\((\d+)\)/)?.[1] || 1) : 0;
        const keywords = getUnitKeywords(player, front.line, frontName, 'line');
        const effectiveLine = {
            ...front.line,
            currentForce: front.line.currentForce +
                getUnitForceBonus(player, front.line, frontName, 'line',
                    player === GameState.players[0] ? GameState.players[1] : GameState.players[0]),
            keywords
        };
        const staticSupport = getSupportBonus(player, frontName);
        const supportBonus = player.tacticEffects?.supportBonus
            ? Math.min(3, Number(Boolean(front.supA)) * player.tacticEffects.supportBonus +
                Number(Boolean(front.supB)) * player.tacticEffects.supportBonus)
            : staticSupport;
        return calculateUnitCombatStrength({
            line: effectiveLine,
            supportCount: supportBonus,
            supportBonusPerUnit: 1,
            supportBonusCap: 3,
            collectiveCount: collective,
            fewerUnits: GameState.countUnits(player) < GameState.countUnits(
                opponentPlayer
            ),
            logorare: wearPenalty,
            ferocityBonus: getFerocityBonus(player, front.line, frontName, 'line',
                GameState.countUnits(player) < GameState.countUnits(opponentPlayer))
        });
    },

    commanderDamage(winner, loser, frontName, margin) {
        const effects = winner.tacticEffects || {};
        const ownFront = winner.fronts[frontName];
        const opposingFront = loser.fronts[frontName];
        let bonus = 0;
        if (effects.breakthrough && ownFront.line && opposingFront.line &&
            ownFront.line.currentForce > opposingFront.line.currentForce) {
            bonus += effects.breakthrough;
        }
        if (effects.collectiveOverrun) {
            const collectiveCount = SLOT_NAMES.filter(slot =>
                ownFront[slot]?.keywords.includes('Mente Collettiva')
            ).length;
            if (collectiveCount >= 2) bonus += effects.collectiveOverrun;
        }
        const winningLine = ownFront.line;
        if (winningLine && getUnitKeywords(winner, winningLine, frontName, 'line')
            .some(keyword => keyword.startsWith('Logorare')) &&
            winner.sites?.some(site => site.catalogId === 'set-2-097')) {
            bonus++;
        }
        const unitDamage = getCommanderVictoryDamageEffects(
            playerUnits(winner).map(entry => entry.unit),
            winningLine,
            winner.frontWinsThisTurn || 0,
            GameState.turnNumber,
            !opposingFront.line
        );
        bonus += unitDamage.amount;
        for (const unit of unitDamage.oncePerTurnSources) {
            unit.lastWinDamageTurn = GameState.turnNumber;
        }
        if (winner.frontWinsThisTurn >= 2 && winner.field?.catalogId === 'set-1-119' &&
            winner.field.lastExtraDamageTurn !== GameState.turnNumber) {
            winner.field.lastExtraDamageTurn = GameState.turnNumber;
            bonus++;
        }
        const damage = margin + bonus;
        return frontName === 'center' && effects.doubleCentralDamage
            ? damage * 2
            : damage;
    },

    resolveUnitLineWinEffects(loser, frontName, winningLine) {
        if (!shouldDestroySupportOnUnitLineWin(winningLine)) return;
        const slotName = ['supA', 'supB'].find(slotName =>
            loser.fronts[frontName][slotName] &&
            !loser.fronts[frontName][slotName].keywords.includes('Divinità')
        );
        if (slotName) {
            CombatResolver.destroyUnit(loser, frontName, slotName, 'effect-destroy');
        }
    },

    async resolveFront(frontName) {
        const attacker = GameState.current;
        const defender = GameState.opponent;
        const attackFront = attacker.fronts[frontName];
        const defendFront = defender.fronts[frontName];
        if (!attackFront.line && !defendFront.line) {
            Logger.log(`${FRONT_LABELS[frontName]}: nessuna Linea, nessuno scontro.`);
            return;
        }
        if (!attackFront.line && defendFront.line) {
            defender.frontWinsThisTurn = (defender.frontWinsThisTurn || 0) + 1;
            Logger.log(`${FRONT_LABELS[frontName]}: fronte scoperto.`);
            this.resolveUnitLineWinEffects(
                attacker,
                frontName,
                defendFront.line
            );
            const damage = this.commanderDamage(
                defender, attacker, frontName, this.strength(defender, frontName, null)
            );
            await this.dealCommanderDamage(attacker, frontName, damage);
            GameState.checkVictory();
            return;
        }
        if (!attackFront.line) return;
        const attackStrength = this.strength(attacker, frontName, defendFront.line);
        if (!defendFront.line) {
            attacker.frontWinsThisTurn = (attacker.frontWinsThisTurn || 0) + 1;
            this.resolveUnitLineWinEffects(
                defender,
                frontName,
                attackFront.line
            );
            const damage = this.commanderDamage(attacker, defender, frontName, attackStrength);
            Logger.log(`${FRONT_LABELS[frontName]} scoperto: ${damage} danni al Comandante.`);
            await this.dealCommanderDamage(defender, frontName, damage);
            GameState.checkVictory();
            UIRenderer.refresh();
            return;
        }
        const defendStrength = this.strength(defender, frontName, attackFront.line);
        Logger.log(`${FRONT_LABELS[frontName]}: ${attackStrength} vs ${defendStrength}.`);
        const comparison = compareCombatStrengths(attackStrength, defendStrength);
        if (comparison.result === 'tie') {
            Logger.log('Parità: entrambe le Linee subiscono 1 danno.');
            await this.damageLine(attacker, frontName, 1);
            await this.damageLine(defender, frontName, 1);
            return;
        }
        const winner = comparison.result === 'left-wins' ? attacker : defender;
        const loser = winner === attacker ? defender : attacker;
        winner.frontWinsThisTurn = (winner.frontWinsThisTurn || 0) + 1;
        const difference = comparison.margin;
        const commanderDamage = this.commanderDamage(winner, loser, frontName, difference);
        const winningLine = winner.fronts[frontName].line;
        this.resolveUnitLineWinEffects(loser, frontName, winningLine);
        Logger.log(`${winner.name} vince il Fronte di ${difference}.`);
        if (winningLine.keywords.some(keyword => keyword.startsWith('Tormento'))) {
            const value = Number(winningLine.keywords.find(keyword => keyword.startsWith('Tormento')).match(/\((\d+)\)/)?.[1] || 1);
            const useTorment = await this.chooseTorment(winner, loser, frontName, commanderDamage, value);
            if (useTorment) {
                loser.follia = Math.min(10, loser.follia + value);
                Logger.log(`Tormento: ${loser.name} riceve ${value} Follia invece dei danni al Comandante.`);
            } else {
                await this.dealCommanderDamage(loser, frontName, commanderDamage);
            }
        } else {
            await this.dealCommanderDamage(loser, frontName, commanderDamage);
        }
        if (!GameState.gameOver) await this.damageLine(loser, frontName, difference, winner);
        GameState.checkVictory();
        UIRenderer.refresh();
    },

    async chooseTorment(winner, loser, frontName, commanderDamage, torment) {
        if (winner !== GameState.players[0]) {
            const useTorment = shouldUseTorment({
                commanderPc: loser.pc,
                madness: loser.follia,
                commanderDamage,
                torment
            });
            Logger.log(
                `L’avversario sceglie ${useTorment ? 'Tormento' : 'il danno al Comandante'} sul Fronte ${FRONT_LABELS[frontName]}.`
            );
            return useTorment;
        }
        UIRenderer.renderControls();
        return new Promise(resolve => {
            GameState.pendingTorment = {
                winnerName: winner.name,
                frontName,
                commanderDamage,
                torment,
                resolve
            };
            UIRenderer.renderControls();
            document.getElementById('btn-torment-madness').focus();
        });
    },

    chooseTormentOutcome(useTorment) {
        const pending = GameState.pendingTorment;
        if (!pending) return;
        GameState.pendingTorment = null;
        Logger.log(
            `Scegli ${useTorment ? `${pending.torment} Follia` : `${pending.commanderDamage} danni al Comandante`} con Tormento.`
        );
        pending.resolve(useTorment);
        UIRenderer.renderControls();
    },

    async dealCommanderDamage(defender, frontName, amount) {
        if (defender === GameState.players[1] && amount > 0) {
            const units = GameState.unitsInFront(defender, frontName)
                .filter(unit => unit.currentForce > 0)
                .sort((a, b) => a.currentForce - b.currentForce || a.name.localeCompare(b.name));
            const totalSacrifice = units.reduce((sum, unit) => sum + unit.currentForce, 0);
            const shouldSacrifice = defender.pc <= 8 || amount >= 4;
            if (shouldSacrifice && totalSacrifice >= amount) {
                let prevented = 0;
                for (const unit of units) {
                    if (prevented >= amount) break;
                    prevented += unit.currentForce;
                    CombatResolver.removeUnit(
                        defender,
                        frontName,
                        unit.position
                    );
                }
                amount = Math.max(0, amount - prevented);
                Logger.log(`L’avversario sacrifica Unità per prevenire ${prevented} danni al Comandante.`);
            }
        }
        if (defender !== GameState.players[0] || amount <= 0 ||
            GameState.unitsInFront(defender, frontName).length === 0) {
            defender.pc = Math.max(0, defender.pc - amount);
            Logger.log(`${defender.name} perde ${amount} PC.`);
            return;
        }
        GameState.sacrifice = { frontName, remaining: amount, resolve: null };
        Logger.log(`Puoi sacrificare Unità in ${FRONT_LABELS[frontName]} per prevenire danni al Comandante, oppure confermare.`);
        UIRenderer.refresh();
        await new Promise(resolve => { GameState.sacrifice.resolve = resolve; });
        if (GameState.sacrifice.remaining > 0) {
            defender.pc = Math.max(0, defender.pc - GameState.sacrifice.remaining);
            Logger.log(`${defender.name} perde ${GameState.sacrifice.remaining} PC.`);
        } else {
            Logger.log('Tutto il danno al Comandante è stato prevenuto.');
        }
        GameState.sacrifice = null;
        UIRenderer.refresh();
    },

    removeUnit(player, frontName, slotName, reason = 'removed', sourcePlayer = null, promotionSlot = null) {
        const front = player.fronts[frontName];
        const unit = front[slotName];
        if (!unit) return;
        if (reason === 'effect-destroy' &&
            isProtectedFromEffectDestruction(unit, slotName)) {
            Logger.log(`${unit.name} non può essere distrutta da effetti mentre è in Linea.`);
            return null;
        }
        front[slotName] = null;
        const controller = GameState.players.find(candidate =>
            candidate.controlledUnits?.some(control => control.unitId === unit.id)
        );
        const controlIndex = controller?.controlledUnits.findIndex(control =>
            control.unitId === unit.id
        ) ?? -1;
        const control = controlIndex >= 0 ? controller.controlledUnits[controlIndex] : null;
        const owner = control
            ? GameState.players.find(candidate => candidate.id === control.ownerId) || player
            : player;
        if (control) controller.controlledUnits.splice(controlIndex, 1);
        if (unit.keywords.includes('Divinità')) {
            owner.discard.push(unit);
            Logger.log(`${unit.name} viene Sigillata e va negli scarti.`);
        } else if (unit.keywords.includes('Eco Spettrale')) {
            owner.exile.push(unit);
            Logger.log(`${unit.name} viene esiliata (Eco Spettrale).`);
        } else {
            owner.discard.push(unit);
            Logger.log(`${unit.name} va negli scarti.`);
        }
        this.onUnitRemoved(player, unit, frontName, reason, sourcePlayer);
        if (slotName === 'line') this.promoteSupport(front, player, frontName, promotionSlot);
        const enemy = player === GameState.players[0] ? GameState.players[1] : GameState.players[0];
        if (slotName === 'line' && !front.line && enemy.field?.catalogId === 'set-1-117') {
            player.pc = Math.max(0, player.pc - 1);
            Logger.log(`${enemy.field.name}: ${player.name} perde 1 PC perché un Fronte diventa scoperto.`);
            GameState.checkVictory();
        }
    },

    destroyUnit(player, frontName, slotName, reason = 'effect-destroy') {
        const unit = player.fronts[frontName]?.[slotName];
        if (!unit || unit.keywords.includes('Divinità')) return null;
        this.removeUnit(player, frontName, slotName, reason);
        return unit;
    },

    onUnitRemoved(owner, unit, frontName, reason, sourcePlayer = null) {
        if (unit.keywords.includes('Eco Spettrale') &&
            owner.sites?.some(site => site.catalogId === 'set-2-099')) {
            GameController.drawCards(owner, 1, 'Santuario della Seconda Morte');
        }
        const destroyed = reason === 'combat-destroy' || reason === 'effect-destroy';
        const enemy = owner === GameState.players[0] ? GameState.players[1] : GameState.players[0];
        if (!destroyed) return;
        for (const effect of getUnitDestructionEffects(unit)) {
            if (effect.type === 'damage-enemy-line-in-front' &&
                enemy.fronts[frontName].line) {
                this.damageLine(enemy, frontName, effect.amount, owner, true);
            }
        }
        if (reason === 'combat-destroy' && owner.sites?.some(site => site.catalogId === 'set-1-096')) {
            const target = FRONT_NAMES.find(name => enemy.fronts[name].line);
            if (target) this.damageLine(enemy, target, 1, owner, true);
        }
        if (owner.sites?.some(site => site.catalogId === 'set-2-080')) {
            GameController.drawCards(owner, 1, 'Pozzo delle Anime');
            const siteIndex = owner.sites.findIndex(site => site.catalogId === 'set-2-080');
            owner.discard.push(...owner.sites.splice(siteIndex, 1));
        }
        if (unit.keywords.includes('Mente Collettiva') &&
            owner.sites?.some(site => site.catalogId === 'set-3-095')) {
            const frontName = FRONT_NAMES.find(name =>
                owner.fronts[name].line && (!owner.fronts[name].supA || !owner.fronts[name].supB)
            );
            if (frontName) {
                const front = owner.fronts[frontName];
                createToken(owner, frontName, front.supA ? 'supB' : 'supA');
            }
        }
        if (destroyed) {
            const destroyedKeywords = getUnitKeywords(owner, unit, frontName, unit.position);
            const reactions = getUnitDestructionReactions(
                playerUnits(owner).map(entry => entry.unit),
                { ...unit, keywords: destroyedKeywords },
                GameState.turnNumber
            );
            for (const reaction of reactions) {
                if (reaction.type === 'draw-card') {
                    reaction.source.lastDestroyedDrawTurn = GameState.turnNumber;
                    GameController.drawCards(owner, 1, reaction.source.name);
                } else if (reaction.type === 'create-support-token') {
                    const targetFront = FRONT_NAMES.find(name =>
                        owner.fronts[name].line &&
                        (!owner.fronts[name].supA || !owner.fronts[name].supB)
                    );
                    if (targetFront) {
                        const front = owner.fronts[targetFront];
                        createToken(owner, targetFront, front.supA ? 'supB' : 'supA');
                    }
                }
            }
        }
        if (unit.catalogId === 'set-2-014' && destroyed) {
            owner.pc = Math.max(0, owner.pc - 1);
            Logger.log(`${unit.name}: perdi 1 PC quando viene distrutto.`);
            GameState.checkVictory();
        }
        if (reason === 'combat-destroy' && enemy.sites?.some(site => site.catalogId === 'set-2-092')) {
            GameController.drawCards(enemy, 1, 'Santuario delle Ombre');
        }
        if (reason !== 'combat-destroy' || !sourcePlayer || unit.position !== 'line') return;
        const activeLine = sourcePlayer.fronts[frontName].line;
        const equipmentId = activeLine?.equipment?.catalogId;
        for (const effect of getUnitLineDestructionEffects(activeLine)) {
            if (effect.type === 'commander-damage') {
                owner.pc = Math.max(0, owner.pc - effect.amount);
                Logger.log(`${activeLine.name}: ${owner.name} perde ${effect.amount} PC aggiuntivi.`);
                GameState.checkVictory();
            } else if (effect.type === 'draw-card') {
                GameController.drawCards(sourcePlayer, 1, activeLine.name);
            } else if (effect.type === 'add-parasite') {
                GameController.addParasites(sourcePlayer, owner, 1);
            } else if (effect.type === 'exile-from-discard') {
                const discardOwner = [sourcePlayer, owner].find(candidate => candidate.discard.length);
                if (discardOwner) {
                    const [exiled] = discardOwner.discard.splice(0, 1);
                    discardOwner.exile.push(exiled);
                    Logger.log(`${activeLine.name}: ${exiled.name} viene esiliata dagli scarti.`);
                }
            } else if (effect.type === 'put-spectral-card-on-top') {
                const index = sourcePlayer.discard.findIndex(card =>
                    card.keywords?.some(keyword => keyword.startsWith('Eco Spettrale'))
                );
                if (index >= 0) {
                    const [recovered] = sourcePlayer.discard.splice(index, 1);
                    sourcePlayer.armyDeck.push(recovered);
                    Logger.log(`${activeLine.name}: ${recovered.name} viene messa in cima al mazzo.`);
                }
            } else if (effect.type === 'destroy-enemy-support-in-front') {
                const slotName = ['supA', 'supB'].find(slot =>
                    enemy.fronts[frontName][slot] &&
                    !enemy.fronts[frontName][slot].keywords.includes('Divinità')
                );
                if (slotName) {
                    this.destroyUnit(enemy, frontName, slotName, 'effect-destroy');
                }
            } else if (effect.type === 'temporary-force') {
                activeLine.currentForce += effect.amount;
                activeLine.temporaryForce = (activeLine.temporaryForce || 0) + effect.amount;
                Logger.log(`${activeLine.name}: ottiene +${effect.amount} Forza fino alla fine del turno.`);
            }
        }
        if (sourcePlayer.sites?.some(site => site.catalogId === 'set-3-100')) {
            const movedFrom = FRONT_NAMES.find((name, index) => {
                const unit = enemy.fronts[name].line;
                if (name === frontName || !unit ||
                    isProtectedFromEnemyMovement(enemy, unit, name)) return false;
                return [index - 1, index + 1].some(targetIndex =>
                    FRONT_NAMES[targetIndex] && !enemy.fronts[FRONT_NAMES[targetIndex]].line
                );
            });
            if (movedFrom) {
                const sourceIndex = FRONT_NAMES.indexOf(movedFrom);
                const targetIndex = [sourceIndex - 1, sourceIndex + 1].find(index =>
                    FRONT_NAMES[index] && !enemy.fronts[FRONT_NAMES[index]].line
                );
                const movedUnit = enemy.fronts[movedFrom].line;
                enemy.fronts[movedFrom].line = null;
                this.promoteSupport(enemy.fronts[movedFrom], enemy, movedFrom);
                enemy.fronts[FRONT_NAMES[targetIndex]].line = movedUnit;
                movedUnit.front = FRONT_NAMES[targetIndex];
                movedUnit.position = 'line';
                GameController.onUnitMoved(enemy, movedUnit, movedFrom, FRONT_NAMES[targetIndex], true);
                Logger.log(`${sourcePlayer.sites.find(site => site.catalogId === 'set-3-100').name}: ${movedUnit.name} si sposta in ${FRONT_LABELS[FRONT_NAMES[targetIndex]]}.`);
            }
        }
        if (equipmentId === 'set-3-108') this.addParasites(sourcePlayer, owner, 1);
        if (equipmentId === 'set-2-108') {
            const slot = ['supA', 'supB'].find(name => {
                const unit = enemy.fronts[frontName][name];
                return unit && !isProtectedFromEnemyMovement(enemy, unit, frontName);
            });
            if (slot) {
                const moved = enemy.fronts[frontName][slot];
                const destination = FRONT_NAMES.flatMap(targetFront => ['supA', 'supB']
                    .filter(targetSlot => !enemy.fronts[targetFront][targetSlot])
                    .map(targetSlot => ({ targetFront, targetSlot })))
                    .find(entry => entry.targetFront !== frontName);
                if (destination) {
                    enemy.fronts[frontName][slot] = null;
                    enemy.fronts[destination.targetFront][destination.targetSlot] = moved;
                    moved.front = destination.targetFront;
                    moved.position = destination.targetSlot;
                    GameController.onUnitMoved(
                        enemy,
                        moved,
                        frontName,
                        destination.targetFront
                    );
                }
            }
        }
        if (sourcePlayer.sites?.some(site => site.catalogId === 'set-2-102')) {
            const index = owner.discard.findIndex(card => card.id === unit.id);
            if (index >= 0) {
                const [destroyedUnit] = owner.discard.splice(index, 1);
                sourcePlayer.discard.push(destroyedUnit);
            }
        }
        if (sourcePlayer.field?.catalogId === 'set-1-114' ||
            (sourcePlayer.field?.catalogId === 'set-2-116' &&
                getUnitKeywords(sourcePlayer, activeLine, frontName, 'line')
                    .some(keyword => keyword.startsWith('Logorare')) ) ||
            (sourcePlayer.field?.catalogId === 'set-3-118' &&
                getUnitKeywords(sourcePlayer, activeLine, frontName, 'line')
                    .some(keyword => keyword.startsWith('Mente Collettiva')))) {
            this.drawCards(sourcePlayer, 1, sourcePlayer.field.name);
        }
        if (sourcePlayer.sites?.some(site => site.catalogId === 'set-1-106') &&
            sourcePlayer.sites.find(site => site.catalogId === 'set-1-106').lastKillTurn !== GameState.turnNumber) {
            sourcePlayer.sites.find(site => site.catalogId === 'set-1-106').lastKillTurn = GameState.turnNumber;
            owner.pc = Math.max(0, owner.pc - 1);
        }
        if (equipmentId === 'set-1-084') owner.pc = Math.max(0, owner.pc - 1);
        if (sourcePlayer.sites?.some(site => site.catalogId === 'set-1-106') || equipmentId === 'set-1-084') {
            Logger.log(`${sourcePlayer.name} infligge 1 danno aggiuntivo per la Linea distrutta.`);
        }
    },

    onForceLoss(owner, unit, amount, sourcePlayer, triggerEquipment = true) {
        for (const player of GameState.players) {
            if (!player.tacticEffects?.drawOnForceLoss) continue;
            const drawn = player.armyDeck.pop();
            if (drawn) {
                player.hand.push(drawn);
                Logger.log(`${player.name} pesca 1 carta per Eco del Dolore.`);
            }
        }
        if (amount > 0) {
            const victimFront = unit.front;
            if (sourcePlayer?.sites?.some(site => site.catalogId === 'set-2-084') &&
                sourcePlayer.sites.every(site =>
                    site.catalogId !== 'set-2-084' || site.lastDamageTriggerTurn !== GameState.turnNumber
                )) {
                const site = sourcePlayer.sites.find(item => item.catalogId === 'set-2-084');
                if (site) {
                    site.lastDamageTriggerTurn = GameState.turnNumber;
                    owner.pc = Math.max(0, owner.pc - 1);
                }
            }
            if (triggerEquipment && amount > 0 &&
                unit.equipment?.catalogId === 'set-2-110') {
                const targetPlayer = owner === GameState.players[0]
                    ? GameState.players[1] : GameState.players[0];
                GameController.applyForceLoss(
                    targetPlayer,
                    unit.front,
                    1,
                    unit.equipment.name,
                    owner,
                    false
                );
            }
            const fieldOwner = GameState.players.find(player =>
                player !== owner && player.field?.catalogId === 'set-2-118'
            );
            if (fieldOwner && fieldOwner.field.lastTriggerTurn !== GameState.turnNumber) {
                fieldOwner.field.lastTriggerTurn = GameState.turnNumber;
                owner.pc = Math.max(0, owner.pc - 1);
                Logger.log(`${fieldOwner.field.name}: ${owner.name} perde 1 PC.`);
                GameState.checkVictory();
            }
            if (owner.sites?.some(site => site.catalogId === 'set-2-098') &&
                (unit.forceLostThisTurn || 0) >= 2) {
                const slot = ['supA', 'supB'].find(name => owner.fronts[victimFront][name]);
                if (slot) this.destroyUnit(owner, victimFront, slot);
            }
        }
    },

    restoreControlledUnits() {
        for (const unit of restoreControlledUnits(GameState.players)) {
            Logger.log(`${unit.name} torna sotto il controllo del suo proprietario.`);
        }
    },

    promoteSupport(front, player, frontName, slot = null) {
        const next = slot || (front.supA ? 'supA' : front.supB ? 'supB' : null);
        if (!next || !front[next]) return;
        front.line = front[next];
        front.line.position = 'line';
        front[next] = next === 'supA' ? front.supB : null;
        if (next === 'supA') front.supB = null;
        if (front.supA) front.supA.position = 'supA';
        GameController.onEquipmentPositionEntry(player, front.line, 'line');
        Logger.log(`${front.line.name} viene promosso a Linea.`);
    },

    // Apre il prompt con cui il giocatore umano sceglie quale Supporto diventa la
    // nuova Linea quando la Linea viene distrutta e ci sono due Supporti.
    promptPromotionSlot(player, frontName) {
        return new Promise(resolve => {
            GameState.pendingPromotion = {
                frontName,
                supports: ['supA', 'supB'].filter(slot => player.fronts[frontName][slot]),
                resolve
            };
            Logger.log(`Scegli quale Supporto diventa la nuova Linea di ${FRONT_LABELS[frontName]}.`);
            UIRenderer.renderControls();
            document.getElementById('promotion-choice').focus();
        });
    },

    choosePromotionSlot(slot) {
        const pending = GameState.pendingPromotion;
        if (!pending || !pending.supports.includes(slot)) return;
        GameState.pendingPromotion = null;
        pending.resolve(slot);
        UIRenderer.renderControls();
    },

    async damageLine(player, frontName, amount, sourcePlayer = null, reflected = false) {
        const front = player.fronts[frontName];
        let remaining = amount;
        while (remaining > 0 && front.line) {
            const line = front.line;
            if (line.damageShield > 0) {
                const prevented = Math.min(remaining, line.damageShield);
                line.damageShield = 0;
                remaining -= prevented;
                Logger.log(`${line.name} previene ${prevented} danni.`);
                if (remaining === 0) break;
            }
            const slotName = 'line';
            const reduction = getDamageReduction(player, line, frontName, slotName);
            const prevented = Math.min(remaining, reduction);
            remaining -= prevented;
            if (prevented) Logger.log(`${line.name} previene ${prevented} danni grazie all’Equipaggiamento/Sito.`);
            if (!remaining) break;
            const dealt = Math.min(remaining, line.currentForce);
            line.currentForce -= dealt;
            line.damage += dealt;
            line.damageThisTurn = (line.damageThisTurn || 0) + dealt;
            remaining -= dealt;
            if (dealt > 0) this.onForceLoss(player, line, dealt, sourcePlayer);
            if (dealt > 0 && !reflected && GameState.phase === 'scontro' &&
                line.equipment?.catalogId === 'set-1-089') {
                const enemy = player === GameState.players[0] ? GameState.players[1] : GameState.players[0];
                const enemyLine = enemy.fronts[frontName].line;
                if (enemyLine) await this.damageLine(enemy, frontName, 1, player, true);
            }
            Logger.log(`${line.name} subisce ${dealt} danno.`);
            if (line.currentForce <= 0) {
                const promotionSlot = front.supA && front.supB
                    ? (player === GameState.players[0]
                        ? await this.promptPromotionSlot(player, frontName)
                        : defaultPromotionSlot(front))
                    : null;
                this.removeUnit(
                    player, frontName, 'line',
                    GameState.phase === 'scontro' ? 'combat-destroy' : 'effect-destroy',
                    null,
                    promotionSlot
                );
            }
        }
        UIRenderer.renderBoard();
    },

    sacrifice(frontName, slotName) {
        if (!GameState.sacrifice || GameState.sacrifice.frontName !== frontName) return;
        const player = GameState.players[0];
        const unit = player.fronts[frontName][slotName];
        if (!unit) return;
        GameState.sacrifice.remaining = Math.max(0, GameState.sacrifice.remaining - unit.currentForce);
        Logger.log(`Sacrificio: ${unit.name} previene fino a ${unit.currentForce} danni.`);
        this.removeUnit(player, frontName, slotName);
        UIRenderer.refresh();
    },

    finishSacrifice() {
        const resolve = GameState.sacrifice?.resolve;
        if (resolve) resolve();
    }
};

const GameController = {
    init() {
        const saved = loadGameSave();
        if (saved) {
            GameState.restore(saved);
            Logger.log('Partita ripresa dal salvataggio locale.');
        } else {
            GameState.reset();
        }
        UIRenderer.refresh();
        if (saved && GameState.currentIndex === 1 && !GameState.gameOver) {
            if (GameState.phase === 'principale') {
                this.runEnemyTurn().then(() => {
                    if (!GameState.gameOver) this.beginTurn(0);
                });
            } else if (GameState.phase === 'finale') {
                this.beginTurn(0);
            }
        }
    },

    async resetWithDeck(cardIds) {
        if (GameState.phase !== 'setup' &&
            !window.confirm('Avviare una nuova partita con questo mazzo? La partita attuale verrà sostituita.')) {
            return;
        }
        clearGameSave();
        GameState.reset(cardIds);
        document.getElementById('game-result').hidden = true;
        UIRenderer.refresh();
        Logger.log('Nuova partita preparata con il mazzo personalizzato.');
        await this.startGame();
    },

    newGame() {
        clearGameSave();
        GameState.reset();
        document.getElementById('game-result').hidden = true;
        UIRenderer.refresh();
        Logger.log('Nuova partita preparata.');
    },

    useDemoDecks() {
        if (GameState.phase !== 'setup' &&
            !window.confirm('Passare ai mazzi demo e iniziare una nuova partita?')) return false;
        try {
            clearCustomDeck();
            clearGameSave();
            GameState.reset(null);
            document.getElementById('game-result').hidden = true;
            UIRenderer.refresh();
            Logger.log('Nuova partita preparata con i mazzi demo.');
            return true;
        } catch (error) {
            Logger.log(`Impossibile passare ai mazzi demo: ${error.message}`);
            console.error('Impossibile passare ai mazzi demo.', error);
            return false;
        }
    },

    mulligan() {
        if (GameState.phase !== 'setup' || GameState.mulliganUsed) return;
        const player = GameState.players[0];
        player.armyDeck.push(...player.hand);
        player.hand = [];
        player.armyDeck = shuffled(player.armyDeck);
        for (let i = 0; i < 5; i++) player.hand.push(player.armyDeck.pop());
        GameState.mulliganUsed = true;
        Logger.log('Mulligan effettuato: 5 carte rimescolate e pescate.');
        UIRenderer.refresh();
    },

    async startGame() {
        if (GameState.phase !== 'setup') return;
        document.getElementById('game-result').hidden = true;
        await this.beginTurn(GameState.firstPlayerIndex);
    },

    async beginTurn(playerIndex) {
        if (GameState.gameOver) return;
        GameState.currentIndex = playerIndex;
        GameState.turnNumber++;
        GameState.phase = 'rifornimento';
        const player = GameState.current;
        player.commanderAbilityUsed = false;
        player.tacticsPlayedThisTurn = 0;
        player.frontWinsThisTurn = 0;
        this.resolveCommanderRifornimento(player);
        for (const front of Object.values(player.fronts)) {
            for (const slot of SLOT_NAMES) {
                if (!front[slot]) continue;
                front[slot].damageThisTurn = 0;
                front[slot].forceLostThisTurn = 0;
            }
        }
        player.domains.forEach(domain => { domain.tapped = false; });
        this.resolvePermanentTurnStart(playerIndex);
        for (const siteOwner of GameState.players) {
            if (siteOwner.sites?.some(site => site.catalogId === 'set-1-110')) {
                const unit = FRONT_NAMES.flatMap(frontName => SLOT_NAMES.map(slotName =>
                    ({ frontName, slotName, unit: player.fronts[frontName][slotName] })
                )).find(entry => entry.unit);
                if (unit) CombatResolver.removeUnit(player, unit.frontName, unit.slotName, 'sacrifice');
            }
        }
        const hasSeminatore = hasSeminatoreSilente(
            GameState.players.flatMap(owner => playerUnits(owner).map(entry => entry.unit))
        );
        if (hasSeminatore && player.parasites >= 3) {
            player.pc = Math.max(0, player.pc - 1);
            Logger.log(`${player.name} perde 1 PC aggiuntivo per Seminatore Silente.`);
        }
        if (player.parasites >= 3) {
            player.parasites--;
            Logger.log(`${player.name}: un Parassita viene rimosso (ne restano ${player.parasites}).`);
        }
        if (player.parasites > 0) {
            player.pc = Math.max(0, player.pc - 1);
            Logger.log(`Parassita: ${player.name} perde 1 PC.`);
        }
        if (GameState.checkVictory()) return;
        if (playerIndex === 1 && player.follia > 0) {
            player.echo += player.follia;
            Logger.log(`Avversario canalizza ${player.follia} Follia in Echo.`);
            player.follia = 0;
        }
        const domain = player.domainDeck.pop();
        if (domain) {
            player.domains.push(domain);
            Logger.log(`${player.name} pesca un Dominio.`);
        }
        if (!GameState.firstTurn && player.armyDeck.length > 0) {
            player.hand.push(player.armyDeck.pop());
            Logger.log(`${player.name} pesca una carta Esercito.`);
        } else if (GameState.firstTurn) {
            Logger.log('Primo turno del primo giocatore: niente pesca Esercito.');
        }
        GameState.firstTurn = false;
        GameState.phase = playerIndex === 0 ? 'rifornimento' : 'principale';
        Logger.log(`Turno ${GameState.turnNumber}: ${player.name} — ${playerIndex === 0 ? 'Fase di Rifornimento' : 'Fase Principale'}.`);
        UIRenderer.refresh();
        if (playerIndex === 1) {
            await this.runEnemyTurn();
            if (!GameState.gameOver) await this.beginTurn(0);
        }
    },

    // Applica gli effetti di un'abilità del Comandante e ritorna una descrizione.
    applyCommanderEffects(actor, effects) {
        const opponentOf = player => GameState.players.find(candidate => candidate !== player);
        const descriptions = [];
        for (const effect of effects) {
            const target = effect.target === 'opponent' ? opponentOf(actor) : actor;
            if (!target) continue;
            if (effect.kind === 'gainEcho') {
                target.echo += effect.amount;
                descriptions.push(`${target.name} guadagna ${effect.amount} Echo`);
            } else if (effect.kind === 'addMadness') {
                target.follia = Math.min(10, target.follia + effect.amount);
                descriptions.push(`${target.name} guadagna ${effect.amount} Follia`);
            } else if (effect.kind === 'addParasite') {
                GameState.addParasites(actor, target, effect.amount);
                descriptions.push(`${effect.amount} Parassita a ${target.name}`);
            } else if (effect.kind === 'drawArmy') {
                this.drawCards(target, effect.amount, 'Comandante');
                descriptions.push(`${target.name} pesca ${effect.amount} carta`);
            }
        }
        return descriptions.join('; ');
    },

    // Abilità di Rifornimento: si attiva automaticamente a inizio turno dell'attore.
    resolveCommanderRifornimento(player) {
        const commander = getCommander(player.commanderId);
        if (!commander?.rifornimento) return;
        const result = evaluateCommanderAbility(commander.rifornimento, { self: player });
        if (!result.ok) {
            Logger.log(`${commander.name}: abilità di Rifornimento non si attiva (${result.reason}).`);
            return;
        }
        const summary = this.applyCommanderEffects(player, result.effects);
        Logger.log(`${commander.name} — Rifornimento: ${summary || 'nessun effetto'}.`);
    },

    // Abilità attivabile del Comandante del giocatore: una sola volta per turno.
    activateCommanderAbility() {
        if (GameState.phase !== 'principale' || GameState.currentIndex !== 0 || GameState.gameOver) return;
        if (GameState.sacrifice || GameState.pendingTactic || GameState.pendingTorment) return;
        const player = GameState.players[0];
        if (player.commanderAbilityUsed) return;
        const commander = getCommander(player.commanderId);
        if (!commander?.activation) return;
        const result = evaluateCommanderAbility(commander.activation, { self: player });
        if (!result.ok) {
            Logger.log(`${commander.name}: abilità non disponibile (${result.reason}).`);
            return;
        }
        player.commanderAbilityUsed = true;
        const summary = this.applyCommanderEffects(player, result.effects);
        Logger.log(`${commander.name} — ${commander.activation.name}: ${summary || 'nessun effetto'}.`);
        FX.play('play');
        if (GameState.checkVictory()) return;
        UIRenderer.refresh();
    },

    selectCard(card) {
        if (GameState.phase !== 'principale' || GameState.currentIndex !== 0 ||
            GameState.sacrifice || GameState.pendingTactic || GameState.pendingTorment) return;
        if (card.category !== 'unit') {
            if (card.category === 'site' || card.category === 'field') {
                this.playSite(card);
                return;
            }
            if (card.category === 'equipment') {
                this.playEquipment(card);
                return;
            }
            if (isImmediateTacticSupported(card)) {
                this.playImmediateTactic(card);
                return;
            }
            Logger.log(`${card.name}: effetto non ancora implementato; la carta è catalogata ma non giocabile in questa build.`);
            return;
        }
        GameState.selectedCard = GameState.selectedCard?.id === card.id ? null : card;
        GameState.selectedFromDiscard = false;
        if (GameState.selectedCard) Logger.log(`Selezionata ${card.name}: scegli una posizione.`);
        UIRenderer.renderHand();
        UIRenderer.updateBoardInteractivity();
    },

    getCardCost(player, card, fromDiscard = false) {
        return calculateCardCost(player, card, {
            fromDiscard,
            turnNumber: GameState.turnNumber,
            players: GameState.players
        });
    },

    playSite(card) {
        const player = GameState.players[0];
        if (GameState.phase !== 'principale' || GameState.currentIndex !== 0) return;
        const cardIndex = player.hand.findIndex(item => item.id === card.id);
        if (cardIndex < 0) throw new Error(`Il Sito ${card.name} non è più in mano.`);
        const available = player.domains.filter(domain => !domain.tapped);
        const cost = this.getCardCost(player, card);
        if (available.length < cost) {
            Logger.log(`Domini insufficienti per ${card.name}: servono ${cost}, ne hai ${available.length} attivi.`);
            return;
        }
        if (card.category === 'field' && player.field) {
            this.commitPermanentCard(card, null);
            return;
        }
        const occupiedCount = player.sites.length + Number(Boolean(player.field));
        if (occupiedCount >= 3) {
            const choices = [
                ...player.sites.map(site => ({
                    label: `Distruggi ${site.name} per giocare ${card.name}`,
                    value: { zone: 'site', cardId: site.id }
                })),
                ...(player.field ? [{
                    label: `Distruggi il Campo ${player.field.name} per giocare ${card.name}`,
                    value: { zone: 'field', cardId: player.field.id }
                }] : [])
            ];
            if (choices.length === 0) {
                Logger.log(`${card.name}: non c'è uno spazio Sito disponibile.`);
                return;
            }
            GameState.pendingTactic = { card, choices, mode: 'permanent-replace' };
            UIRenderer.renderControls();
            document.getElementById('tactic-choice').focus();
            return;
        }
        this.commitPermanentCard(card, null);
    },

    commitPermanentCard(card, replaced = null) {
        const player = GameState.players[0];
        const cardIndex = player.hand.findIndex(item => item.id === card.id);
        if (cardIndex < 0) throw new Error(`La carta ${card.name} non è più in mano.`);
        const available = player.domains.filter(domain => !domain.tapped);
        const cost = this.getCardCost(player, card);
        if (available.length < cost) {
            Logger.log(`Domini insufficienti per ${card.name}: servono ${cost}, ne hai ${available.length} attivi.`);
            return;
        }
        if (card.category === 'field' && player.field && !replaced) {
            player.discard.push(player.field);
            player.field = null;
        }
        if (replaced) {
            const old = replaced.zone === 'field'
                ? player.field
                : player.sites.find(site => site.id === replaced.cardId);
            if (!old) throw new Error('La carta permanente da sostituire non è più in gioco.');
            if (replaced.zone === 'field') player.field = null;
            else player.sites.splice(player.sites.indexOf(old), 1);
            player.discard.push(old);
        }
        available.slice(0, cost).forEach(domain => { domain.tapped = true; });
        const cardInstance = {
            ...card,
            decay: card.category === 'site' ? card.decay : null,
            decayRemaining: card.category === 'site' ? card.decay : null,
            ruins: 0
        };
        player.hand.splice(cardIndex, 1);
        if (card.category === 'field') player.field = cardInstance;
        else player.sites.push(cardInstance);
        Logger.log(`${card.name} entra in gioco${card.decay ? ` con ${card.decay} Decadenza` : ''}.`);
        this.onPermanentEntry(player, cardInstance);
        UIRenderer.refresh();
    },

    playEquipment(card) {
        const player = GameState.players[0];
        const available = player.domains.filter(domain => !domain.tapped);
        const cost = this.getCardCost(player, card);
        const choices = FRONT_NAMES.flatMap(frontName => SLOT_NAMES
            .filter(slotName => player.fronts[frontName][slotName])
            .map(slotName => {
                const unit = player.fronts[frontName][slotName];
                return {
                    label: `${unit.name} · ${FRONT_LABELS[frontName]} · ${slotName === 'line' ? 'Linea' : 'Supporto'}${unit.equipment ? ` · sostituisce ${unit.equipment.name}` : ''}`,
                    value: { frontName, slotName, unitId: unit.id }
                };
            }));
        if (available.length < cost) {
            Logger.log(`Domini insufficienti per ${card.name}: servono ${cost} (costo carta + Equip), ne hai ${available.length}.`);
            return;
        }
        if (!choices.length) {
            Logger.log(`${card.name}: non hai Unità in gioco da equipaggiare.`);
            return;
        }
        GameState.pendingTactic = { card, choices, mode: 'equipment' };
        UIRenderer.renderControls();
        document.getElementById('tactic-choice').focus();
    },

    onPermanentEntry(player, card) {
        const id = card.catalogId || card.id;
        if (['set-1-097', 'set-2-083'].includes(id)) {
            this.drawCards(player, 1, `${card.name}`);
        }
        if (['set-3-090'].includes(id)) {
            const availableFront = FRONT_NAMES.find(frontName =>
                !player.fronts[frontName].supA || !player.fronts[frontName].supB
            );
            if (availableFront) {
                const slotName = player.fronts[availableFront].supA ? 'supB' : 'supA';
                createToken(player, availableFront, slotName);
            }
        }
    },

    drawCards(player, amount, reason) {
        let drawn = 0;
        while (drawn < amount && player.armyDeck.length) {
            player.hand.push(player.armyDeck.pop());
            drawn++;
        }
        Logger.log(`${reason}: pesca ${drawn} carta${drawn === 1 ? '' : 'e'}.`);
        return drawn;
    },

    canActivateSite(site) {
        const id = site.catalogId || site.id;
        return ['set-1-102', 'set-2-088', 'set-3-082', 'set-3-089'].includes(id) &&
            site.lastActivatedTurn !== GameState.turnNumber;
    },

    activateSite(site) {
        const id = site.catalogId || site.id;
        const player = GameState.players[0];
        const opponent = GameState.players[1];
        const choices = [];
        if (id === 'set-1-102') {
            for (const frontName of FRONT_NAMES) {
                if (!player.fronts[frontName].line) continue;
                for (const slotName of SLOT_NAMES) {
                    const unit = player.fronts[frontName][slotName];
                    if (unit) choices.push({
                        label: `Sacrifica ${unit.name} · +2 Forza a ${FRONT_LABELS[frontName]}`,
                        value: { mode: 'sacrifice', frontName, slotName }
                    });
                }
            }
        } else if (id === 'set-2-088') {
            choices.push(...[
                ...player.sites.map(target => ({ target, ownerKey: 'player', zone: 'site' })),
                ...(player.field ? [{ target: player.field, ownerKey: 'player', zone: 'field' }] : []),
                ...opponent.sites.map(target => ({ target, ownerKey: 'opponent', zone: 'site' })),
                ...(opponent.field ? [{ target: opponent.field, ownerKey: 'opponent', zone: 'field' }] : [])
            ].map(({ target, ownerKey, zone }) => ({
                label: `Profana ${ownerKey === 'player' ? 'tuo' : 'avversario'} · ${target.name}`,
                value: { mode: 'profane', ownerKey, zone, siteId: target.id }
            })));
        } else if (id === 'set-3-082') {
            choices.push(...FRONT_NAMES.flatMap(frontName =>
                ['supA', 'supB'].filter(slot => player.fronts[frontName][slot])
                    .flatMap(slot => FRONT_NAMES
                        .filter((target, index) => Math.abs(index - FRONT_NAMES.indexOf(frontName)) === 1)
                        .flatMap(target => ['supA', 'supB']
                            .filter(targetSlot => !player.fronts[target][targetSlot])
                            .map(targetSlot => ({
                                label: `${player.fronts[frontName][slot].name} · ${FRONT_LABELS[frontName]} → ${FRONT_LABELS[target]} Supporto`,
                                value: { mode: 'move-support', frontName, slot, target, targetSlot }
                            }))))
            ));
        } else if (id === 'set-3-089') {
            choices.push(...FRONT_NAMES.flatMap((frontName, index) => {
                if (!player.fronts[frontName].line) return [];
                return [index - 1, index + 1]
                    .filter(targetIndex => FRONT_NAMES[targetIndex] && !player.fronts[FRONT_NAMES[targetIndex]].line)
                    .map(targetIndex => ({
                        label: `${FRONT_LABELS[frontName]} → ${FRONT_LABELS[FRONT_NAMES[targetIndex]]}`,
                        value: { mode: 'move-line', frontName, target: FRONT_NAMES[targetIndex] }
                    }));
            }));
        }
        if (!choices.length) {
            Logger.log(`${site.name}: nessuna scelta legale per attivare l’abilità.`);
            return;
        }
        GameState.pendingTactic = { card: site, choices, mode: 'active-site' };
        UIRenderer.renderControls();
        document.getElementById('tactic-choice').focus();
    },

    playImmediateTactic(card) {
        const player = GameState.players[0];
        const opponent = GameState.players[1];
        const choices = getTacticChoices(card, player, opponent);
        if (choices === null) {
            Logger.log(`${card.name}: nessun risolutore registrato; la carta non viene giocata.`);
            return;
        }
        if (tacticRequiresChoice(card)) {
            if (choices.length === 0) {
                Logger.log(`${card.name}: non ci sono bersagli legali; la carta non viene giocata.`);
                return;
            }
            GameState.pendingTactic = { card, choices };
            UIRenderer.renderControls();
            document.getElementById('tactic-choice').focus();
            return;
        }
        this.commitTactic(card, null, player, opponent);
    },

    commitTactic(card, choice, player = GameState.players[0], opponent = GameState.players[1]) {
        const siteTacticLimit = GameState.players.some(owner =>
            owner.sites?.some(site => site.catalogId === 'set-2-095')
        );
        if ((player.tacticLimitActive || siteTacticLimit) &&
            player.tacticsPlayedThisTurn >= 1) {
            Logger.log(`${card.name}: non puoi giocare un'altra Tattica in questo turno.`);
            return;
        }
        const cardId = card.catalogId || card.id;
        if (cardId === 'set-2-070') {
            const spectral = player.discard.find(unit => unit.id === choice?.cardId);
            const totalCost = card.cost + (spectral?.cost || 0);
            const readyCount = player.domains.filter(domain => !domain.tapped).length;
            if (!spectral || readyCount < totalCost) {
                Logger.log(`${card.name}: bersaglio non valido o Domini insufficienti per pagare anche l'Unità.`);
                return;
            }
        }
        const selectedChoice = cardId === 'set-2-078'
            ? Object.fromEntries(Object.entries(choice || {})
                .filter(([key]) => key !== 'playerRecovery' && key !== 'opponentRecovery'))
            : choice;
        const legalChoices = getTacticChoices(card, player, opponent);
        if (legalChoices === null || (tacticRequiresChoice(card) &&
            !legalChoices.some(option => JSON.stringify(option.value) === JSON.stringify(selectedChoice)))) {
            Logger.log(`${card.name}: la scelta non è più legale; la carta non viene giocata.`);
            return;
        }
        const available = player.domains.filter(domain => !domain.tapped);
        const cost = this.getCardCost(player, card);
        if (available.length < cost) {
            Logger.log(`Domini insufficienti per ${card.name}: servono ${cost}, ne hai ${available.length} attivi.`);
            return;
        }
        available.slice(0, cost).forEach(domain => { domain.tapped = true; });
        const handIndex = player.hand.findIndex(unit => unit.id === card.id);
        if (handIndex < 0) throw new Error(`La Tattica ${card.name} non è più in mano.`);
        player.hand.splice(handIndex, 1);
        player.discard.push(card);
        player.tacticsPlayedThisTurn = (player.tacticsPlayedThisTurn || 0) + 1;
        const tacticId = card.catalogId || card.id;
        if (tacticId === 'set-2-055' || tacticId === 'set-2-073') {
            const drawCount = tacticId === 'set-2-055' ? 1 : 3;
            let drawn = 0;
            for (let index = 0; index < drawCount && player.armyDeck.length > 0; index++) {
                player.hand.push(player.armyDeck.pop());
                drawn++;
            }
            const choices = player.hand.map(unit => ({
                label: `${unit.name} · scarta`,
                value: { cardId: unit.id }
            }));
            Logger.log(`${card.name}: peschi ${drawn} carta${drawn === 1 ? '' : 'e'}.`);
            if (choices.length > 0) {
                GameState.pendingTactic = { card, choices, mode: 'discard' };
                UIRenderer.renderControls();
                document.getElementById('tactic-choice').focus();
            } else {
                Logger.log(`${card.name}: non hai carte da scartare.`);
                UIRenderer.refresh();
            }
            return;
        }
        const message = resolveImmediateTactic(card, player, opponent, choice, {
            damageLine: (target, frontName, amount) =>
                CombatResolver.damageLine(target, frontName, amount, player),
            onForceLoss: (target, unit, amount) =>
                CombatResolver.onForceLoss(target, unit, amount, player),
            onUnitPlayed: (owner, unit) => {
                this.onUnitEntry(owner, unit, unit.front, unit.position, true);
            },
            removeUnit: (target, frontName, slotName) =>
                CombatResolver.removeUnit(target, frontName, slotName, 'sacrifice'),
            destroyUnit: (target, frontName, slotName) => {
                return CombatResolver.destroyUnit(target, frontName, slotName);
            }
        });
        Logger.log(message);
        GameState.checkVictory();
        UIRenderer.refresh();
    },

    confirmTactic() {
        const pending = GameState.pendingTactic;
        if (!pending) return;
        const choice = pending.choices[Number(document.getElementById('tactic-choice').value)];
        if (!choice) return;
        if (pending.mode === 'site-support-move') {
            const player = GameState.players.find(owner => owner.id === pending.playerId);
            const site = player?.sites?.find(item =>
                item.id === pending.card.id && item.catalogId === 'set-3-097'
            );
            if (!player || !site) throw new Error('Il Sito Portale Silente non è più in gioco.');
            GameState.pendingTactic = null;
            this.resolveSiteSupportMove(player, choice.value, site);
            UIRenderer.refresh();
            return;
        }
        if (pending.mode === 'site-replace') {
            const player = GameState.players[0];
            const index = player.sites.findIndex(site => site.id === choice.value.siteId);
            if (index < 0) throw new Error('Il Sito da sostituire non è più in gioco.');
            player.discard.push(...player.sites.splice(index, 1));
            GameState.pendingTactic = null;
            this.playSite(pending.card);
            return;
        }
        if (pending.mode === 'permanent-replace') {
            GameState.pendingTactic = null;
            this.commitPermanentCard(pending.card, choice.value);
            return;
        }
        if (pending.mode === 'equipment') {
            const player = GameState.players[0];
            const { frontName, slotName, unitId } = choice.value;
            const unit = player.fronts[frontName][slotName];
            if (!unit || unit.id !== unitId) throw new Error('L’Unità scelta non è più in quella posizione.');
            const equipment = pending.card;
            const cost = this.getCardCost(player, equipment);
            const available = player.domains.filter(domain => !domain.tapped);
            if (available.length < cost) {
                GameState.pendingTactic = null;
                Logger.log(`${equipment.name}: non ci sono più Domini sufficienti per pagare costo ed Equip.`);
                UIRenderer.refresh();
                return;
            }
            const handIndex = player.hand.findIndex(item => item.id === equipment.id);
            if (handIndex < 0) throw new Error(`${equipment.name} non è più in mano.`);
            available.slice(0, cost).forEach(domain => { domain.tapped = true; });
            player.hand.splice(handIndex, 1);
            if (unit.equipment) player.discard.push(unit.equipment);
            unit.equipment = { ...equipment };
            GameState.pendingTactic = null;
            Logger.log(`${equipment.name} viene equipaggiato a ${unit.name} pagando ${equipment.cost} + ${equipment.equipCost || 0} Domini.`);
            UIRenderer.refresh();
            return;
        }
        if (pending.mode === 'active-site') {
            GameState.pendingTactic = null;
            this.resolveSiteActivation(pending.card, choice.value);
            return;
        }
        if (pending.mode === 'discard') {
            const player = GameState.players[0];
            const discardIndex = player.hand.findIndex(unit => unit.id === choice.value.cardId);
            if (discardIndex < 0) throw new Error('La carta da scartare non è più in mano.');
            const [discarded] = player.hand.splice(discardIndex, 1);
            player.discard.push(discarded);
            Logger.log(`${pending.card.name}: scarti ${discarded.name}.`);
            GameState.pendingTactic = null;
            UIRenderer.refresh();
            return;
        }
        if (pending.mode === 'shadow-recovery') {
            GameState.pendingTactic = null;
            this.commitTactic(pending.card, {
                ...pending.baseChoice,
                playerRecovery: choice.value
            });
            return;
        }
        if ((pending.card.catalogId || pending.card.id) === 'set-2-078') {
            const player = GameState.players[0];
            const recoverySlots = FRONT_NAMES.flatMap(frontName => {
                const front = player.fronts[frontName];
                const slots = frontName === choice.value.ownFrontName
                    ? front.supA && front.supB ? ['supB'] : ['supA', 'supB']
                    : ['supA', 'supB'].filter(slotName => !front[slotName]);
                return [...new Set(slots)].map(slotName => ({ frontName, slotName }));
            });
            const recoveryChoices = player.discard
                .filter(item => item.category === 'unit')
                .flatMap(unit => recoverySlots.map(({ frontName, slotName }) => ({
                    label: `${unit.name} → Supporto ${slotName === 'supA' ? 'A' : 'B'} in ${FRONT_LABELS[frontName]}`,
                    value: { cardId: unit.id, frontName, slotName }
                })));
            recoveryChoices.unshift({ label: 'Non recuperare Unità', value: null });
            GameState.pendingTactic = {
                card: pending.card,
                mode: 'shadow-recovery',
                baseChoice: choice.value,
                choices: recoveryChoices
            };
            UIRenderer.renderControls();
            document.getElementById('tactic-choice').focus();
            return;
        }
        GameState.pendingTactic = null;
        this.commitTactic(pending.card, choice.value);
    },

    cancelTactic() {
        if (!GameState.pendingTactic) return;
        if (GameState.pendingTactic.mode === 'discard') return;
        Logger.log(`${GameState.pendingTactic.card.name}: scelta annullata, carta non giocata.`);
        GameState.pendingTactic = null;
        UIRenderer.refresh();
    },

    selectDiscardCard(card) {
        if (GameState.phase !== 'principale' || GameState.currentIndex !== 0 || GameState.sacrifice) return;
        const alreadySelected = GameState.selectedCard?.id === card.id && GameState.selectedFromDiscard;
        GameState.selectedCard = alreadySelected ? null : card;
        GameState.selectedFromDiscard = !alreadySelected;
        if (GameState.selectedCard) Logger.log(`${card.name} dagli scarti: costa 1 Dominio aggiuntivo.`);
        UIRenderer.renderHand();
        UIRenderer.updateBoardInteractivity();
    },

    deploy(frontName, slotName) {
        if (GameState.phase !== 'principale' || GameState.currentIndex !== 0 || GameState.sacrifice) return;
        const card = GameState.selectedCard;
        if (!card) return;
        const player = GameState.players[0];
        const opponent = GameState.players[1];
        const front = player.fronts[frontName];
        const keywords = getUnitKeywords(player, card, frontName, slotName);
        if (player.field?.catalogId === 'set-1-113' &&
            GameState.countUnits(player) < GameState.countUnits(GameState.players[1]) &&
            !keywords.includes('Assalto')) keywords.push('Assalto');
        const unitForDeployment = { ...card, keywords };
        if (opponent.sites?.some(site => site.catalogId === 'set-2-094') &&
            card.force <= 3 && slotName === 'line') {
            Logger.log(`${card.name}: Sala dei Lamenti impedisce alle Unità di Forza 3 o inferiore di entrare in Linea.`);
            return;
        }
        const potentialAssaultSwap = slotName === 'line' &&
            keywords.includes('Assalto') && Boolean(front.line) &&
            (!front.supA || !front.supB);
        if (potentialAssaultSwap &&
            !player.sites?.some(site => site.catalogId === 'set-1-098')) {
            Logger.log('Assalto non può sostituire una Linea senza Passo della Frattura.');
            return;
        }
        if (potentialAssaultSwap &&
            opponent.sites?.some(site => site.catalogId === 'set-3-094')) {
            Logger.log('Torre della Distorsione impedisce di sostituire una Linea avversaria.');
            return;
        }
        if (opponent.sites?.some(site => site.catalogId === 'set-1-105') &&
            slotName === 'line') {
            Logger.log('Vallata del Terrore Primordiale impedisce di entrare in Linea.');
            return;
        }
        const deployment = checkDeployment(unitForDeployment, front, slotName, {
            ownSites: player.sites,
            opposingSites: opponent.sites
        });
        if (front[slotName] && !deployment.assaultSwap) {
            Logger.log('Questa posizione è occupata.');
            return;
        }
        if (card.keywords.includes('Posizione Difensiva') && slotName !== 'line' && !front.line) {
            Logger.log('Posizione Difensiva: devi assegnare questa Unità alla Linea se possibile.');
            return;
        }
        if (!deployment.legal && slotName === 'line') {
            Logger.log('Solo Assalto può entrare in Linea nel turno in cui viene giocata. Scegli un Supporto.');
            return;
        }
        if (!deployment.legal) return;
        const available = player.domains.filter(domain => !domain.tapped);
        const spectral = GameState.selectedFromDiscard && card.keywords.includes('Eco Spettrale');
        const ascension = card.keywords.find(keyword => keyword.startsWith('Ascensione'));
        const echoCost = ascension ? Number(ascension.match(/\((\d+)\)/)?.[1] || 0) : 0;
        const cost = this.getCardCost(player, card, spectral);
        if (available.length < cost) {
            Logger.log(`Domini insufficienti: servono ${cost}, ne hai ${available.length} attivi.`);
            return;
        }
        if (player.echo < echoCost) {
            Logger.log(`Echo insufficienti: servono ${echoCost}, ne hai ${player.echo}.`);
            return;
        }
        available.slice(0, cost).forEach(domain => { domain.tapped = true; });
        markCardCostDiscountUsed(player, card, GameState.turnNumber, spectral);
        player.echo -= echoCost;
        if (deployment.assaultSwap) {
            const openSupport = front.supA === null ? 'supA' : 'supB';
            front[openSupport] = front.line;
            front[openSupport].position = openSupport;
            Logger.log(`Assalto: ${front.line.name} si sposta in Supporto.`);
        }
        if (spectral) {
            const index = player.discard.findIndex(unit => unit.id === card.id);
            const [fromDiscard] = player.discard.splice(index, 1);
            GameState.selectedCard = fromDiscard;
        } else {
            player.hand.splice(player.hand.findIndex(unit => unit.id === card.id), 1);
        }
        const unit = GameState.selectedCard;
        unit.currentForce = unit.force;
        unit.front = frontName;
        unit.position = slotName;
        front[slotName] = unit;
        GameState.selectedCard = null;
        GameState.selectedFromDiscard = false;
        Logger.log(`${unit.name} entra in ${FRONT_LABELS[frontName]} (${slotName === 'line' ? 'Linea' : 'Supporto'}).`);
        this.onUnitEntry(player, unit, frontName, slotName, spectral);
        FX.play('play');
        UIRenderer.refresh();
    },

    channelMadness() {
        if (GameState.phase !== 'rifornimento' || GameState.currentIndex !== 0) return;
        const player = GameState.players[0];
        if (player.follia <= 0) return;
        player.follia--;
        player.echo++;
        Logger.log('Canalizzi 1 Follia in 1 Echo.');
        UIRenderer.updateStats();
        UIRenderer.renderControls();
        persistGame(GameState.snapshot());
    },

    enterMainPhase() {
        if (GameState.phase !== 'rifornimento' || GameState.currentIndex !== 0) return;
        GameState.phase = 'principale';
        Logger.log('Fase Principale: puoi giocare carte e attivare abilità.');
        UIRenderer.refresh();
    },

    async resolveCombat() {
        if (GameState.phase !== 'principale' || GameState.currentIndex !== 0 || GameState.sacrifice) return;
        GameState.phase = 'scontro';
        GameState.sorvoloUsed.clear();
        if (UIRenderer.getSorvoloOptions().length > 0) {
            GameState.pendingSorvolo = true;
            Logger.log('Sorvolo: puoi spostare Unità in un Fronte adiacente come Supporto.');
            UIRenderer.refresh();
            return;
        }
        await this.continueCombat();
    },

    useSorvolo() {
        const options = UIRenderer.getSorvoloOptions();
        const option = options[Number(document.getElementById('sorvolo-choice').value)];
        if (!option) return;
        const player = GameState.players[0];
        const source = player.fronts[option.frontName];
        const target = player.fronts[option.targetFront];
        source[option.slotName] = null;
        if (option.slotName === 'line') {
            CombatResolver.promoteSupport(source, player, option.frontName);
        }
        target[option.targetSlot] = option.unit;
        option.unit.front = option.targetFront;
        option.unit.position = option.targetSlot;
        this.onUnitMoved(player, option.unit, option.frontName, option.targetFront,
            option.slotName === 'line', true);
        GameState.sorvoloUsed.add(option.unit.id);
        Logger.log(`${option.unit.name} usa Sorvolo: entra in Supporto a ${FRONT_LABELS[option.targetFront]}.`);
        if (UIRenderer.getSorvoloOptions().length === 0) this.skipSorvolo();
        else UIRenderer.refresh();
    },

    skipSorvolo() {
        GameState.pendingSorvolo = false;
        UIRenderer.refresh();
        this.continueCombat();
    },

    async continueCombat() {
        GameState.pendingSorvolo = false;
        UIRenderer.renderControls();
        this.resolvePermanentCombatStart(GameState.currentIndex);
        await CombatResolver.resolveAll();
        this.removeCombatBonuses();
        if (!GameState.gameOver) {
            GameState.phase = 'finale';
            UIRenderer.refresh();
            Logger.log('Scontro terminato. Premi FINE TURNO per concludere.');
        }
    },

    async endTurn() {
        if (GameState.phase !== 'finale' || GameState.currentIndex !== 0 || GameState.sacrifice) return;
        const player = GameState.players[0];
        while (player.hand.length > 7) {
            player.discard.push(player.hand.pop());
            Logger.log('Scarti una carta per tornare a 7 in mano.');
        }
        player.echo = 0;
        Logger.log('Fine turno: Echo rimossi.');
        GameState.selectedCard = null;
        GameState.selectedFromDiscard = false;
        UIRenderer.refresh();
        await this.beginTurn(1);
    },

    async runEnemyTurn() {
        if (GameState.gameOver) return;
        const enemy = GameState.players[1];
        Logger.log('L’avversario pianifica le mosse.');
        const enemyCommander = getCommander(enemy.commanderId);
        if (enemyCommander?.activation && !enemy.commanderAbilityUsed) {
            const result = evaluateCommanderAbility(enemyCommander.activation, { self: enemy });
            if (result.ok) {
                enemy.commanderAbilityUsed = true;
                const summary = this.applyCommanderEffects(enemy, result.effects);
                Logger.log(`${enemyCommander.name} — ${enemyCommander.activation.name}: ${summary || 'nessun effetto'}.`);
            }
        }
        while (!GameState.gameOver) {
            const domains = enemy.domains.filter(domain => !domain.tapped);
            const candidates = enemy.hand
                .map((card, index) => ({ card, index }))
                .filter(({ card }) => {
                    if (card.category !== 'unit' && !isImmediateTacticSupported(card)) return false;
                    if (card.category === 'tactic') {
                        const siteTacticLimit = GameState.players.some(owner =>
                            owner.sites?.some(site => site.catalogId === 'set-2-095')
                        );
                        if ((enemy.tacticLimitActive || siteTacticLimit) &&
                            enemy.tacticsPlayedThisTurn >= 1) return false;
                        const choices = getTacticChoices(card, enemy, GameState.players[0]);
                        if (choices === null || (tacticRequiresChoice(card) && choices.length === 0)) {
                            return false;
                        }
                    }
                    const ascension = card.keywords.find(keyword => keyword.startsWith('Ascensione'));
                    const echoCost = ascension ? Number(ascension.match(/\((\d+)\)/)?.[1] || 0) : 0;
                    return this.getCardCost(enemy, card) <= domains.length && echoCost <= enemy.echo;
                })
                .map(candidate => {
                    if (candidate.card.category !== 'unit') {
                        const choices = getTacticChoices(candidate.card, enemy, GameState.players[0]);
                        return {
                            ...candidate,
                            tactic: true,
                            tacticChoice: choices?.[0]?.value ?? null,
                            deployment: null,
                            score: 3 + (enemy.parasites === 0 ? 1 : 0) -
                                this.getCardCost(enemy, candidate.card) * 0.1
                        };
                    }
                    return {
                        ...candidate,
                        tactic: false,
                        deployment: this.findEnemySlot(enemy, candidate.card),
                        score: this.scoreEnemyPlay(enemy, candidate.card, domains.length)
                    };
                })
                .filter(candidate => candidate.tactic || candidate.deployment)
                .sort((a, b) => b.score - a.score ||
                    a.card.id.localeCompare(b.card.id) ||
                    FRONT_NAMES.indexOf(a.deployment?.frontName) - FRONT_NAMES.indexOf(b.deployment?.frontName));
            if (candidates.length === 0) break;
            const candidate = candidates[0];
            const cost = this.getCardCost(enemy, candidate.card);
            domains.slice(0, cost).forEach(domain => { domain.tapped = true; });
            enemy.hand.splice(candidate.index, 1);
            if (candidate.tactic) {
                enemy.discard.push(candidate.card);
                enemy.tacticsPlayedThisTurn = (enemy.tacticsPlayedThisTurn || 0) + 1;
                Logger.log(`Avversario gioca ${candidate.card.name}.`);
                Logger.log(resolveImmediateTactic(
                    candidate.card,
                    enemy,
                    GameState.players[0],
                    candidate.tacticChoice,
                    {
                        damageLine: (target, frontName, amount) =>
                            CombatResolver.damageLine(target, frontName, amount, enemy),
                        onForceLoss: (target, unit, amount) =>
                            CombatResolver.onForceLoss(target, unit, amount, enemy),
                        onUnitPlayed: (owner, unit) => {
                            const frontName = unit.front;
                            const slotName = unit.position;
                            this.onUnitEntry(owner, unit, frontName, slotName, true);
                        },
                        removeUnit: (target, frontName, slotName) =>
                            CombatResolver.removeUnit(target, frontName, slotName, 'sacrifice'),
                        destroyUnit: (target, frontName, slotName) => {
                            return CombatResolver.destroyUnit(target, frontName, slotName);
                        }
                    }
                ));
                continue;
            }
            const deployment = candidate.deployment;
            const unit = candidate.card;
            markCardCostDiscountUsed(enemy, unit, GameState.turnNumber);
            const ascension = unit.keywords.find(keyword => keyword.startsWith('Ascensione'));
            if (ascension) enemy.echo -= Number(ascension.match(/\((\d+)\)/)?.[1] || 0);
            unit.currentForce = unit.force;
            if (deployment.assaultSwap) {
                const front = enemy.fronts[deployment.frontName];
                const supportSlot = front.supA === null ? 'supA' : 'supB';
                front[supportSlot] = front.line;
                front[supportSlot].position = supportSlot;
            }
            unit.front = deployment.frontName;
            unit.position = deployment.slotName;
            enemy.fronts[deployment.frontName][deployment.slotName] = unit;
            Logger.log(`Avversario gioca ${unit.name} in ${FRONT_LABELS[deployment.frontName]}.`);
            this.onUnitEntry(enemy, unit, deployment.frontName, deployment.slotName);
        }
        if (GameState.gameOver) return;
        UIRenderer.refresh();
        await CombatResolver.resolveAll();
        this.removeCombatBonuses();
        if (GameState.gameOver) return;
        GameState.phase = 'finale';
        enemy.echo = 0;
        while (enemy.hand.length > 7) enemy.discard.push(enemy.hand.pop());
        Logger.log('Turno avversario terminato.');
        UIRenderer.refresh();
    },

    removeCombatBonuses() {
        CombatResolver.restoreControlledUnits();
        for (const player of GameState.players) {
            for (const [frontName, front] of Object.entries(player.fronts)) {
                for (const slotName of SLOT_NAMES) {
                    restoreTemporaryForce(front[slotName]);
                    const unit = front[slotName];
                    if (unit) unit.cannotMoveThisTurn = false;
                    if (unit?.temporaryKeywords?.length) {
                        for (const keyword of unit.temporaryKeywords) {
                            const index = unit.keywords.lastIndexOf(keyword);
                            if (index >= 0) unit.keywords.splice(index, 1);
                        }
                        unit.temporaryKeywords = [];
                    }
                }
                while (front.line?.currentForce <= 0) {
                    CombatResolver.removeUnit(player, frontName, 'line');
                }
                for (const slotName of ['supA', 'supB']) {
                    if (front[slotName]?.currentForce <= 0) {
                        CombatResolver.removeUnit(player, frontName, slotName);
                    }
                }
                for (const unitId of player.sacrificeAfterCombat || []) {
                    for (const [frontName, front] of Object.entries(player.fronts)) {
                        const slotName = SLOT_NAMES.find(slot => front[slot]?.id === unitId);
                        if (!slotName) continue;
                        CombatResolver.removeUnit(player, frontName, slotName);
                        break;
                    }
                }
                player.sacrificeAfterCombat = [];
                player.tacticEffects = {};
                player.tacticLimitActive = false;
            }
        }
        UIRenderer.refresh();
    },

    findEnemySlot(enemy, card) {
        const opponent = GameState.players[0];
        const keywords = [...card.keywords];
        if (enemy.field?.catalogId === 'set-1-113' &&
            GameState.countUnits(enemy) < GameState.countUnits(opponent) &&
            !keywords.includes('Assalto')) keywords.push('Assalto');
        for (const frontName of FRONT_NAMES) {
            const front = enemy.fronts[frontName];
            const defensive = keywords.includes('Posizione Difensiva');
            const assault = keywords.includes('Assalto');
            const deploymentUnit = { ...card, keywords };
            const rules = {
                ownSites: enemy.sites,
                opposingSites: opponent.sites
            };
            const lineDeployment = checkDeployment(
                deploymentUnit,
                front,
                'line',
                rules
            );
            if (lineDeployment.legal && (!front.line || lineDeployment.assaultSwap) &&
                (defensive || assault)) {
                return {
                    frontName,
                    slotName: 'line',
                    assaultSwap: lineDeployment.assaultSwap
                };
            }
            if (defensive && !front.line) continue;
            for (const slotName of ['supA', 'supB']) {
                if (checkDeployment(deploymentUnit, front, slotName, rules).legal) {
                    return { frontName, slotName };
                }
            }
        }
        return null;
    },

    scoreEnemyPlay(enemy, card, availableDomains) {
        const deployment = this.findEnemySlot(enemy, card);
        if (!deployment) return Number.NEGATIVE_INFINITY;
        const front = enemy.fronts[deployment.frontName];
        const enemyFront = GameState.players[0].fronts[deployment.frontName];
        const cost = this.getCardCost(enemy, card);
        const score = card.force / cost * 2 +
            Number(card.keywords.includes('Assalto')) * 1.5 +
            Number(card.keywords.some(keyword => keyword.startsWith('Tormento'))) +
            Number(card.keywords.some(keyword => keyword.startsWith('Infiltrazione'))) +
            Number(card.keywords.includes('Ferocia')) * 0.5 +
            Number(card.keywords.includes('Mente Collettiva')) * 0.5 +
            Number(card.keywords.includes('Logorare')) * 0.5 +
            (deployment.slotName === 'line' ? 2.5 : 0) +
            (deployment.slotName !== 'line' && front.line ? 1.5 : 0) +
            (!enemyFront.line && deployment.slotName === 'line' ? 1 : 0) -
            Math.max(0, availableDomains - card.cost) * 0.1;
        return score;
    },

    handleSlotClick(frontName, slotName) {
        if (GameState.sacrifice) {
            CombatResolver.sacrifice(frontName, slotName);
        } else {
            this.deploy(frontName, slotName);
        }
    },

    finishSacrifice() {
        CombatResolver.finishSacrifice();
    },

    chooseTorment(useTorment) {
        CombatResolver.chooseTormentOutcome(useTorment);
    },

    choosePromotionSlot(slot) {
        CombatResolver.choosePromotionSlot(slot);
    },

    cancelSelection() {
        GameState.selectedCard = null;
        GameState.selectedFromDiscard = false;
        UIRenderer.refresh();
    }
};

export { GameController, GameState };
