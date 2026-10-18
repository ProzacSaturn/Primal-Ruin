import { commanderForSet } from '../commanders.js';
import { loadCustomDeck } from '../deck-builder.js';
import { createToken, getUnitKeywords } from '../permanent-effects.js';
import { getRandomState, nextRandom, restoreRandomState, seedRandom } from '../random.js';
import { persistGame } from '../save-store.js';
import {
    getSorvoloEntryEffects,
    getUnitEntryEffects,
    isProtectedFromEnemyMovement
} from '../unit-triggers.js';
import { FRONT_LABELS, FRONT_NAMES, SETS, SLOT_NAMES } from './board.js';
import { makePlayer } from './cards.js';
import { CombatResolver } from './combat.js';
import { GameController } from './controller.js';
import { Logger } from './logger.js';
import { UIRenderer } from './renderer.js';

const GameState = {
    players: [],
    currentIndex: 0,
    phase: 'setup',
    turnNumber: 0,
    firstPlayerIndex: 0,
    firstTurn: true,
    mulliganUsed: false,
    mulliganMarks: new Set(),
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
        this.mulliganMarks = new Set();
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
        if (id === 'set-2-107' && slotName === 'line') GameController.drawCards(player, 1, unit.equipment.name);
        if (id === 'set-3-107' && slotName !== 'line') GameController.drawCards(player, 1, unit.equipment.name);
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
                GameController.drawCards(player, 1, site.name);
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
        const siteParasites = (player.sites || []).filter(site =>
            ['set-3-083', 'set-3-098'].includes(site.catalogId)
        ).length;
        const parasites = siteParasites;
        if (parasites > 0) {
            this.addParasites(player, opponent, parasites);
        }
        if (fromDiscard && unit.keywords.includes('Eco Spettrale') &&
            player.sites?.some(site => site.catalogId === 'set-2-087')) {
            GameController.drawCards(player, 1, 'Altare della Putrefazione');
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
            for (const site of sporeWells) GameController.drawCards(owner, count, site.name);
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
        this.mulliganMarks = new Set();
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
        return this.players.reduce((total, boardOwner) => total + FRONT_NAMES.reduce((count, name) =>
            count + SLOT_NAMES.filter(slot => {
                const unit = boardOwner.fronts[name][slot];
                if (!unit) return false;
                if (unit.infiltrated) return unit.owner === player.id;
                return boardOwner === player;
            }).length, 0), 0);
    },

    unitsInFront(player, frontName) {
        const front = player.fronts[frontName];
        return SLOT_NAMES.map(slot => front[slot]).filter(Boolean);
    },

    checkVictory() {
        const defeated = this.players.filter(player => player.pc <= 0 || player.follia >= 10);
        if (defeated.length > 1) {
            // §9: nella sconfitta simultanea vince il giocatore di turno.
            const winner = this.players[this.currentIndex];
            this.gameOver = true;
            this.phase = 'gameover';
            Logger.log(`Sconfitta simultanea: ${winner.name} vince la partita (giocatore di turno).`);
            UIRenderer.showGameOver(winner);
            persistGame(this.snapshot());
            return true;
        }
        if (defeated.length === 1) {
            const winner = this.players.find(player => player !== defeated[0]);
            this.gameOver = true;
            this.phase = 'gameover';
            Logger.log(`${defeated[0].name} ha perso. ${winner.name} vince la partita!`);
            UIRenderer.showGameOver(winner);
            persistGame(this.snapshot());
            return true;
        }
        // §1: Dominio Totale della Mappa, solo all'inizio del proprio turno
        // (Fase di Rifornimento). Il giocatore di turno ha una Linea in tutti
        // e 3 i Fronti e l'avversario non ha alcuna Unità in campo.
        const dominant = this.players[this.currentIndex];
        const exposed = this.players.find(player => player !== dominant);
        if (this.phase === 'rifornimento' && dominant && exposed &&
            this.countUnits(exposed) === 0 &&
            FRONT_NAMES.every(name => dominant.fronts[name].line)) {
            this.gameOver = true;
            this.phase = 'gameover';
            Logger.log(`${dominant.name} controlla l'intera mappa. Dominio Totale della Mappa!`);
            UIRenderer.showGameOver(dominant);
            persistGame(this.snapshot());
            return true;
        }
        return false;
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
                GameController.drawCards(player, 1, site.name);
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
            const drawn = GameController.drawCards(player, 1, site.name);
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
    }
};

export { GameState };
