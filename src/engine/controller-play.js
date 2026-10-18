import { calculateCardCost, markCardCostDiscountUsed } from '../card-costs.js';
import { isImmediateTacticSupported } from '../card-effects.js';
import { checkDeployment } from '../game-rules.js';
import { tacticTiming } from '../tactics.js';
import { createToken, getUnitKeywords } from '../permanent-effects.js';
import { FRONT_LABELS, FRONT_NAMES, SLOT_NAMES } from './board.js';
import { FX } from './fx.js';
import { Logger } from './logger.js';
import { UIRenderer } from './renderer.js';
import { GameState } from './state.js';

const playMethods = {
    selectCard(card) {
        if (GameState.reactionWindow?.playerIndex === 0) {
            if (GameState.pendingTactic || GameState.sacrifice || GameState.pendingTorment ||
                GameState.pendingPromotion) return;
            if (!isImmediateTacticSupported(card) || tacticTiming(card) === 'standard') {
                Logger.log(`${card.name}: in questa finestra puoi giocare solo una Tattica Istantanea.`);
                return;
            }
            this.playImmediateTactic(card);
            return;
        }
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
        return ['set-1-102', 'set-2-088', 'set-2-100', 'set-3-082', 'set-3-089'].includes(id) &&
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
        } else if (id === 'set-2-100') {
            for (const frontName of FRONT_NAMES) {
                if (!player.fronts[frontName].line) continue;
                for (const slotName of ['supA', 'supB']) {
                    const unit = player.fronts[frontName][slotName];
                    if (!unit) continue;
                    choices.push({
                        label: `Sacrifica ${unit.name} · +2 Forza a ${FRONT_LABELS[frontName]}`,
                        value: { mode: 'sacrifice-support', frontName, slotName }
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

    selectDiscardCard(card) {
        if (GameState.phase !== 'principale' || GameState.currentIndex !== 0 || GameState.sacrifice) return;
        const alreadySelected = GameState.selectedCard?.id === card.id && GameState.selectedFromDiscard;
        GameState.selectedCard = alreadySelected ? null : card;
        GameState.selectedFromDiscard = !alreadySelected;
        if (GameState.selectedCard) Logger.log(`${card.name} selezionata dagli scarti.`);
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
            opposingSites: opponent.sites,
            ownField: player.field
        });
        if (front[slotName] && !deployment.assaultSwap) {
            Logger.log('Questa posizione è occupata.');
            return;
        }
        if (keywords.includes('Posizione Difensiva') && slotName !== 'line' && !front.line &&
            player.field?.catalogId !== 'set-3-118') {
            Logger.log('Posizione Difensiva: devi assegnare questa Unità alla Linea se possibile.');
            return;
        }
        if (!deployment.legal && slotName !== 'line' && !front.line) {
            Logger.log('Su questo Fronte la Linea è libera: la prima Unità deve entrare in Linea.');
            return;
        }
        if (!deployment.legal && slotName === 'line' && front.line) {
            Logger.log('La Linea è occupata. Scegli un Supporto, oppure un’Unità con Assalto se può sostituirla.');
            return;
        }
        if (!deployment.legal) return;
        const available = player.domains.filter(domain => !domain.tapped);
        const spectral = GameState.selectedFromDiscard && card.keywords.includes('Eco Spettrale');
        const cost = this.getCardCost(player, card, spectral);
        if (available.length < cost) {
            Logger.log(`Domini insufficienti: servono ${cost}, ne hai ${available.length} attivi.`);
            return;
        }
        available.slice(0, cost).forEach(domain => { domain.tapped = true; });
        markCardCostDiscountUsed(player, card, GameState.turnNumber, spectral);
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
        GameState.onUnitEntry(player, unit, frontName, slotName, spectral);
        FX.play('play');
        UIRenderer.refresh();
    },

    playInfiltratedUnit(frontName, slotName) {
        if (GameState.phase !== 'principale' || GameState.currentIndex !== 0 || GameState.sacrifice) return;
        if (slotName !== 'supA' && slotName !== 'supB') return;
        const card = GameState.selectedCard;
        if (!card?.keywords?.some(keyword => keyword.startsWith('Infiltrazione'))) return;
        const player = GameState.players[0];
        const opponent = GameState.players[1];
        const front = opponent.fronts[frontName];
        if (!front || front.line || front[slotName]) {
            Logger.log('Infiltrazione: il Fronte avversario deve essere scoperto e il Supporto libero.');
            return;
        }
        const available = player.domains.filter(domain => !domain.tapped);
        const cost = this.getCardCost(player, card, false);
        if (available.length < cost) {
            Logger.log(`Domini insufficienti: servono ${cost}, ne hai ${available.length} attivi.`);
            return;
        }
        available.slice(0, cost).forEach(domain => { domain.tapped = true; });
        markCardCostDiscountUsed(player, card, GameState.turnNumber, false);
        if (GameState.selectedFromDiscard) {
            const index = player.discard.findIndex(unit => unit.id === card.id);
            if (index >= 0) player.discard.splice(index, 1);
        } else {
            const index = player.hand.findIndex(unit => unit.id === card.id);
            if (index >= 0) player.hand.splice(index, 1);
        }
        const unit = card;
        unit.currentForce = unit.force;
        unit.front = frontName;
        unit.position = slotName;
        unit.infiltrated = true;
        unit.owner = player.id;
        front[slotName] = unit;
        GameState.selectedCard = null;
        GameState.selectedFromDiscard = false;
        Logger.log(`${unit.name} si infiltra nel Fronte di ${FRONT_LABELS[frontName]}.`);
        GameState.onUnitEntry(player, unit, frontName, slotName, false);
        FX.play('play');
        UIRenderer.refresh();
    }
};

export { playMethods };
