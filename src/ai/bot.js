// Bot di playtest. Non è collegato alla UI: sceglie solo mosse che il motore
// considera legali e le esegue con GameController. Il posto avversario riceve
// già l'elenco dal motore; qui si sceglie una voce di quell'elenco.
import { isImmediateTacticSupported } from '../card-effects.js';
import { checkDeployment, defaultPromotionSlot, shouldUseTorment } from '../game-rules.js';
import { getUnitKeywords } from '../permanent-effects.js';
import { tacticRequiresChoice } from '../tactics.js';
import { FRONT_NAMES, SLOT_NAMES } from '../engine/board.js';
import { getTacticChoices } from '../engine/tactic-choices.js';
import { GameController, GameState } from '../../game.js';

const PLAY_THRESHOLD = 1.05;

export function createBotRng(seed) {
    let state = seed >>> 0 || 1;
    return () => {
        state ^= state << 13;
        state >>>= 0;
        state ^= state >>> 17;
        state >>>= 0;
        state ^= state << 5;
        state >>>= 0;
        return state / 0x100000000;
    };
}

export function chooseMulligan(hand) {
    const cheap = hand.filter((card) => (card.cost || 0) <= 2).length;
    if (cheap >= 2) return [];
    return hand
        .map((card, index) => ((card.cost || 0) >= 6 ? index : -1))
        .filter((index) => index >= 0);
}

export function channelMadness() {
    const player = GameState.players[0];
    while (
        GameState.phase === 'rifornimento' &&
        GameState.currentIndex === 0 &&
        player.follia >= 5
    ) {
        const before = player.follia;
        GameController.channelMadness();
        if (player.follia === before) break;
    }
}

export function playMainPhase(rng, recordPlay) {
    const blocked = new Set();
    let plays = 0;
    let fails = 0;
    while (plays < 16 && fails < 12 && !GameState.gameOver && GameState.phase === 'principale') {
        const [action] = listMainActions(blocked, rng);
        if (!action || action.score < PLAY_THRESHOLD) break;
        if (action.play()) {
            plays += 1;
            recordPlay(action.card);
        } else {
            fails += 1;
            blocked.add(action.key);
        }
    }
    if (GameState.gameOver || GameState.phase !== 'principale') return;
    activateCommander();
    purgeParasites();
    activateReadySites();
}

export function chooseEnemyCandidate(candidates, rng) {
    let best = candidates[0];
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
        const score = enemyCandidateScore(candidate) + (rng() - 0.5) * 0.35;
        if (score > bestScore) {
            bestScore = score;
            best = candidate;
        }
    }
    return best;
}

export function chooseSorvoloIndex(options) {
    const index = options.findIndex((option) => option.slotName !== 'line');
    return index >= 0 ? index : null;
}

export function answerPrompt() {
    if (GameState.pendingTactic) {
        drainPendingChoices();
        return true;
    }
    if (GameState.pendingPromotion) {
        const pending = GameState.pendingPromotion;
        const slot = defaultPromotionSlot(GameState.players[0].fronts[pending.frontName]);
        if (!slot) return false;
        GameController.choosePromotionSlot(slot);
        return true;
    }
    if (GameState.pendingTorment) {
        const pending = GameState.pendingTorment;
        const loser = GameState.players[1];
        GameController.chooseTorment(
            shouldUseTorment({
                commanderPc: loser.pc,
                madness: loser.follia,
                commanderDamage: pending.commanderDamage,
                torment: pending.torment
            })
        );
        return true;
    }
    if (GameState.sacrifice) return answerSacrifice();
    if (GameState.reactionWindow) return answerReaction();
    return false;
}

function listMainActions(blocked, rng) {
    const player = GameState.players[0];
    const opponent = GameState.players[1];
    const ready = readyCount(player);
    const actions = [];
    for (const card of player.hand) {
        if (card.category === 'unit')
            addUnitActions(actions, player, opponent, card, ready, blocked);
        else if (card.category === 'tactic')
            addTacticAction(actions, player, opponent, card, ready, blocked);
        else if (card.category === 'site' || card.category === 'field') {
            addPermanentAction(actions, player, card, ready, blocked);
        } else if (card.category === 'equipment') {
            addEquipmentAction(actions, player, card, ready, blocked);
        }
    }
    if (rng) {
        for (const action of actions) action.score += (rng() - 0.5) * 0.3;
    }
    actions.sort((left, right) => right.score - left.score || left.key.localeCompare(right.key));
    return actions;
}

function addUnitActions(actions, player, opponent, card, ready, blocked) {
    const cost = GameController.getCardCost(player, card);
    if (cost > ready) return;
    for (const frontName of FRONT_NAMES) {
        for (const slotName of SLOT_NAMES) {
            const key = `${card.id}|${frontName}|${slotName}`;
            if (blocked.has(key)) continue;
            const keywords = deploymentKeywords(player, opponent, card, frontName, slotName);
            const deployment = checkDeployment(
                { ...card, keywords },
                player.fronts[frontName],
                slotName,
                {
                    ownSites: player.sites,
                    opposingSites: opponent.sites,
                    ownField: player.field
                }
            );
            if (!deployment.legal) continue;
            actions.push({
                key,
                card,
                score: unitScore(card, slotName),
                play: () =>
                    commitHandCard(card, () => {
                        GameController.cancelSelection();
                        GameController.selectCard(card);
                        GameController.deploy(frontName, slotName);
                    })
            });
        }
        if (!(card.keywords || []).some((keyword) => keyword.startsWith('Infiltrazione'))) continue;
        for (const slotName of ['supA', 'supB']) {
            const key = `${card.id}|infil|${frontName}|${slotName}`;
            if (blocked.has(key)) continue;
            const front = opponent.fronts[frontName];
            if (!front || front.line || front[slotName]) continue;
            actions.push({
                key,
                card,
                score: unitScore(card, 'line') + 0.3,
                play: () =>
                    commitHandCard(card, () => {
                        GameController.cancelSelection();
                        GameController.selectCard(card);
                        GameController.deployInfiltration(frontName, slotName);
                    })
            });
        }
    }
}

function addTacticAction(actions, player, opponent, card, ready, blocked) {
    const key = `${card.id}|tactic`;
    if (blocked.has(key) || !isImmediateTacticSupported(card) || tacticBlocked(player)) return;
    const choices = getTacticChoices(card, player, opponent);
    if (choices === null || (tacticRequiresChoice(card) && choices.length === 0)) return;
    if (GameController.getCardCost(player, card) > ready) return;
    let threat = 0;
    for (const choice of choices) threat = Math.max(threat, choiceScore(choice));
    actions.push({
        key,
        card,
        score: 1.15 + threat - (card.cost || 0) * 0.12,
        play: () =>
            commitHandCard(card, () => {
                GameController.cancelSelection();
                GameController.selectCard(card);
            })
    });
}

function addPermanentAction(actions, player, card, ready, blocked) {
    const key = `${card.id}|permanent`;
    if (blocked.has(key) || GameController.getCardCost(player, card) > ready) return;
    const occupied = player.sites.length + Number(Boolean(player.field));
    if (occupied >= 3 && player.sites.length === 0 && !player.field) return;
    actions.push({
        key,
        card,
        score: card.category === 'field' ? 1.35 : 1.55,
        play: () =>
            commitHandCard(card, () => {
                GameController.cancelSelection();
                GameController.selectCard(card);
            })
    });
}

function addEquipmentAction(actions, player, card, ready, blocked) {
    const key = `${card.id}|equipment`;
    if (blocked.has(key) || GameController.getCardCost(player, card) > ready) return;
    const hasUnit = FRONT_NAMES.some((frontName) =>
        SLOT_NAMES.some((slotName) => player.fronts[frontName][slotName])
    );
    if (!hasUnit) return;
    actions.push({
        key,
        card,
        score: 1.25,
        play: () =>
            commitHandCard(card, () => {
                GameController.cancelSelection();
                GameController.selectCard(card);
            })
    });
}

function commitHandCard(card, apply) {
    apply();
    drainPendingChoices();
    const stillInHand = GameState.players[0].hand.some((item) => item.id === card.id);
    if (stillInHand) GameController.cancelSelection();
    return !stillInHand;
}

function activateCommander() {
    const player = GameState.players[0];
    if (player.commanderAbilityUsed || readyCount(player) < 2) return;
    const hasLine = FRONT_NAMES.some((frontName) => player.fronts[frontName].line);
    if (!hasLine) return;
    GameController.activateCommanderAbility();
    drainPendingChoices();
}

function purgeParasites() {
    const player = GameState.players[0];
    if ((player.parasites || 0) < 2 || readyCount(player) < 2) return;
    GameController.purgeParasite();
}

function activateReadySites() {
    const sites = [...GameState.players[0].sites];
    for (const site of sites) {
        if (GameState.gameOver || !GameController.canActivateSite(site)) continue;
        GameController.activateSite(site);
        drainPendingChoices();
    }
}

function drainPendingChoices() {
    const player = GameState.players[0];
    for (let step = 0; step < 6 && GameState.pendingTactic; step += 1) {
        const pending = GameState.pendingTactic;
        document.getElementById('tactic-choice').value = String(bestChoiceIndex(pending, player));
        GameController.confirmTactic();
        if (GameState.pendingTactic === pending) {
            throw new Error(
                `Scelta non applicata per ${pending.card?.name || pending.mode || 'tattiche'}.`
            );
        }
    }
    if (GameState.pendingTactic) {
        throw new Error(
            `Scelte tattiche ancora aperte: ${GameState.pendingTactic.card?.name || GameState.pendingTactic.mode}.`
        );
    }
}

function answerSacrifice() {
    const pending = GameState.sacrifice;
    const player = GameState.players[0];
    const front = player.fronts[pending.frontName];
    const units = SLOT_NAMES.map((slot) => ({ slot, unit: front[slot] }))
        .filter((entry) => entry.unit)
        .sort(
            (left, right) =>
                left.unit.currentForce - right.unit.currentForce ||
                left.slot.localeCompare(right.slot)
        );
    const smallest = units[0];
    const worthIt =
        smallest &&
        player.pc - pending.remaining <= 8 &&
        smallest.unit.currentForce <= pending.remaining;
    if (!worthIt) {
        GameController.finishSacrifice();
        return true;
    }
    const before = pending.remaining;
    GameController.handleSlotClick(pending.frontName, smallest.slot);
    if (GameState.sacrifice && GameState.sacrifice.remaining === before) {
        GameController.finishSacrifice();
    }
    return true;
}

function answerReaction() {
    const player = GameState.players[0];
    const opponent = GameState.players[1];
    let best = null;
    let bestScore = 1.4;
    for (const card of player.hand) {
        if (!GameController.canPlayInstant(player, opponent, card)) continue;
        const score = tacticListScore(card, player, opponent);
        if (score > bestScore) {
            bestScore = score;
            best = card;
        }
    }
    if (!best) {
        GameController.passReaction();
        return true;
    }
    GameController.selectCard(best);
    if (GameState.pendingTactic || !player.hand.some((card) => card.id === best.id)) return true;
    GameController.passReaction();
    return true;
}

function bestChoiceIndex(pending, player) {
    if (pending.mode === 'discard') {
        let best = 0;
        let cost = -1;
        pending.choices.forEach((choice, index) => {
            const card = player.hand.find((item) => item.id === choice.value?.cardId);
            const cardCost = card?.cost || 0;
            if (cardCost > cost) {
                cost = cardCost;
                best = index;
            }
        });
        return best;
    }
    if (pending.mode === 'equipment' || pending.mode === 'commander') {
        let best = 0;
        let score = Number.NEGATIVE_INFINITY;
        pending.choices.forEach((choice, index) => {
            const value = choice.value || {};
            const owner = GameState.players.find((item) => item.id === value.ownerId) || player;
            const unit = owner.fronts?.[value.frontName]?.[value.slotName];
            const next = (unit?.currentForce || 0) + (value.slotName === 'line' ? 3 : 0);
            if (next > score) {
                score = next;
                best = index;
            }
        });
        return best;
    }
    let best = 0;
    let score = Number.NEGATIVE_INFINITY;
    pending.choices.forEach((choice, index) => {
        const next = choiceScore(choice);
        if (next > score) {
            score = next;
            best = index;
        }
    });
    return best;
}

function enemyCandidateScore(candidate) {
    if (candidate.tactic) {
        const threat = choiceScore(
            candidate.tacticChoice ? { value: candidate.tacticChoice } : null
        );
        return 1.3 + threat - (candidate.card.cost || 0) * 0.12;
    }
    return unitScore(candidate.card, candidate.deployment?.slotName || 'supA');
}

function tacticListScore(card, player, opponent) {
    const choices = getTacticChoices(card, player, opponent) || [];
    let threat = 0;
    for (const choice of choices) threat = Math.max(threat, choiceScore(choice));
    return 1.15 + threat - (card.cost || 0) * 0.12;
}

function unitScore(card, slotName) {
    const cost = Math.max(1, card.cost || 1);
    let score = (card.force || 0) / cost + (slotName === 'line' ? 2.2 : 0.45);
    for (const keyword of card.keywords || []) {
        if (keyword === 'Assalto') score += 0.8;
        else if (keyword.startsWith('Tormento')) score += 0.7;
        else if (keyword.startsWith('Infiltrazione')) score += 0.5;
        else if (keyword === 'Ferocia') score += 0.4;
        else if (keyword === 'Mente Collettiva') score += 0.4;
        else if (keyword.startsWith('Logorare')) score += 0.4;
    }
    return score;
}

function choiceScore(choice) {
    const value = choice?.value || {};
    let score = 0;
    if (value.owner === 'opponent' || value.commander === 'opponent') score += 2;
    if (value.slotName === 'line' || value.enemyFrontName) score += 1;
    if (value.skip) score -= 2;
    if (typeof choice?.label === 'string' && /avversar/i.test(choice.label)) score += 0.5;
    return score;
}

function deploymentKeywords(player, opponent, card, frontName, slotName) {
    const keywords = getUnitKeywords(player, card, frontName, slotName);
    if (
        player.field?.catalogId === 'set-1-113' &&
        GameState.countUnits(player) < GameState.countUnits(opponent) &&
        !keywords.includes('Assalto')
    ) {
        keywords.push('Assalto');
    }
    return keywords;
}

function tacticBlocked(player) {
    const siteLimit = GameState.players.some((owner) =>
        owner.sites?.some((site) => site.catalogId === 'set-2-095')
    );
    return (player.tacticLimitActive || siteLimit) && (player.tacticsPlayedThisTurn || 0) >= 1;
}

function readyCount(player) {
    return player.domains.filter((domain) => !domain.tapped).length;
}
