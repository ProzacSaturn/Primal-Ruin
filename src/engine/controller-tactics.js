import { resolveImmediateTactic } from '../card-effects.js';
import { tacticRequiresChoice } from '../tactics.js';
import { FRONT_LABELS, FRONT_NAMES } from './board.js';
import { CombatResolver } from './combat.js';
import { Logger } from './logger.js';
import { UIRenderer } from './renderer.js';
import { GameState } from './state.js';
import { getTacticChoices } from './tactic-choices.js';

const tacticMethods = {
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
                GameState.onUnitEntry(owner, unit, unit.front, unit.position, true);
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
        if (GameState.gameOver) this.closeReactionWindow();
    },

    confirmTactic() {
        const pending = GameState.pendingTactic;
        if (!pending) return;
        const choice = pending.choices[Number(document.getElementById('tactic-choice').value)];
        if (!choice) return;
        if (pending.mode === 'commander') {
            GameState.pendingTactic = null;
            this.commitCommanderActivation(GameState.players[0], pending.kind, choice.value);
            return;
        }
        if (pending.mode === 'site-support-move') {
            const player = GameState.players.find(owner => owner.id === pending.playerId);
            const site = player?.sites?.find(item =>
                item.id === pending.card.id && item.catalogId === 'set-3-097'
            );
            if (!player || !site) throw new Error('Il Sito Portale Silente non è più in gioco.');
            GameState.pendingTactic = null;
            GameState.resolveSiteSupportMove(player, choice.value, site);
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
            GameState.resolveSiteActivation(pending.card, choice.value);
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
        if (GameState.pendingTactic.mode === 'commander') {
            Logger.log('Abilità del Comandante annullata.');
            GameState.pendingTactic = null;
            UIRenderer.refresh();
            return;
        }
        Logger.log(`${GameState.pendingTactic.card.name}: scelta annullata, carta non giocata.`);
        GameState.pendingTactic = null;
        UIRenderer.refresh();
    }
};

export { tacticMethods };
