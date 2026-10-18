import { clearCustomDeck } from '../deck-builder.js';
import { playerUnits } from '../permanent-effects.js';
import { clearGameSave, loadGameSave, persistGame } from '../save-store.js';
import { hasSeminatoreSilente } from '../unit-triggers.js';
import { FRONT_NAMES, SLOT_NAMES } from './board.js';
import { CombatResolver } from './combat.js';
import { Logger } from './logger.js';
import { UIRenderer } from './renderer.js';
import { GameState } from './state.js';

const matchMethods = {
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

    // §5.4: il Mulligan è parziale — si può rimpiazzare qualsiasi numero di carte
    // (0 incluse). Le carte scelte vanno in fondo al mazzo e se ne pescano altrettante.
    mulligan(selection) {
        if (GameState.phase !== 'setup' || GameState.mulliganUsed) return;
        const player = GameState.players[0];
        const targets = Array.isArray(selection)
            ? [...new Set(selection)].filter(index => Number.isInteger(index) && player.hand[index])
            : player.hand
                .map((card, index) => GameState.mulliganMarks.has(card.id) ? index : -1)
                .filter(index => index >= 0);
        const replaced = targets.map(index => player.hand[index]);
        player.hand = player.hand.filter((_, index) => !targets.includes(index));
        if (replaced.length > 0) {
            player.armyDeck.unshift(...replaced);
            for (let i = 0; i < replaced.length; i++) player.hand.push(player.armyDeck.pop());
        }
        GameState.mulliganUsed = true;
        GameState.mulliganMarks = new Set();
        Logger.log(replaced.length === 0
            ? 'Mulligan saltato: nessuna carta rimpiazzata.'
            : `Mulligan: ${replaced.length} carte in fondo al mazzo, altrettante pescate.`);
        UIRenderer.refresh();
    },

    // Marca/smarca una carta della mano come "da rimpiazzare" durante il Mulligan.
    toggleMulliganMark(card) {
        if (GameState.phase !== 'setup' || GameState.mulliganUsed) return;
        const marks = GameState.mulliganMarks;
        if (marks.has(card.id)) marks.delete(card.id);
        else marks.add(card.id);
        UIRenderer.renderHand();
        UIRenderer.renderControls();
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
        GameState.resolvePermanentTurnStart(playerIndex);
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
        CombatResolver.applyTormentAtTurnStart(player);
        if (GameState.checkVictory()) return;
        if (playerIndex === 1 && player.follia > 0) {
            player.echo += player.follia;
            Logger.log(`Avversario canalizza ${player.follia} Follia in Echo.`);
            player.follia = 0;
        }
        const domain = player.domainDeck.pop();
        if (domain) {
            // §5: al Turno 1 il primo giocatore pesca sì 1 Dominio, ma entra ESAUSTO.
            if (GameState.firstTurn) domain.tapped = true;
            player.domains.push(domain);
            Logger.log(`${player.name} pesca un Dominio${GameState.firstTurn ? ' (esausto)' : ''}.`);
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

    handleSlotClick(frontName, slotName) {
        if (GameState.sacrifice) {
            CombatResolver.sacrifice(frontName, slotName);
        } else {
            this.deploy(frontName, slotName);
        }
    },

    deployInfiltration(frontName, slotName) {
        this.playInfiltratedUnit(frontName, slotName);
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

export { matchMethods };
