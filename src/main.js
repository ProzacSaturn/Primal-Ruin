import { GameController } from '../game.js';
import { listCommanders } from './commanders.js';
import { initCardLibrary } from './card-library.js';
import { initDeckBuilder } from './deck-builder.js';
import { initSettings } from './settings.js';

if (window.__primalRuinBooted) {
    // Il file aperto dal disco e il server non devono avviare il motore due volte.
} else {
    window.__primalRuinBooted = true;
    boot();
}

function listen(id, type, handler) {
    document.getElementById(id)?.addEventListener(type, handler);
}

function boot() {
    listen('btn-mulligan', 'click', () => GameController.mulligan());
    listen('btn-start', 'click', () => GameController.startGame());
    listen('btn-principale', 'click', () => GameController.enterMainPhase());
    listen('btn-attack', 'click', () => GameController.resolveCombat());
    listen('btn-finale', 'click', () => GameController.endTurn());
    listen('btn-canala', 'click', () => GameController.channelMadness());
    listen('btn-sacrifice-end', 'click', () => GameController.finishSacrifice());
    listen('btn-commander', 'click', () => GameController.activateCommanderAbility());
    listen('btn-retreat', 'click', () => GameController.toggleRetreat());
    listen('btn-purge', 'click', () => GameController.purgeParasite());
    listen('btn-sorvolo', 'click', () => GameController.useSorvolo());
    listen('btn-sorvolo-skip', 'click', () => GameController.skipSorvolo());
    listen('btn-torment-madness', 'click', () => GameController.chooseTorment(true));
    listen('btn-torment-damage', 'click', () => GameController.chooseTorment(false));
    listen('btn-tactic-confirm', 'click', () => GameController.confirmTactic());
    listen('btn-tactic-cancel', 'click', () => GameController.cancelTactic());
    listen('btn-reaction-pass', 'click', () => GameController.passReaction());
    listen('btn-promotion-confirm', 'click', () => {
        GameController.choosePromotionSlot(document.getElementById('promotion-choice').value);
    });
    listen('btn-new-game', 'click', () => {
        if (window.confirm('Iniziare una nuova partita? La partita salvata verrà sostituita.')) {
            GameController.newGame();
        }
    });
    listen('btn-demo-decks', 'click', () => {
        if (GameController.useDemoDecks()) {
            document.dispatchEvent(new Event('primal-ruin:demo-decks'));
        }
    });
    listen('btn-updated-deck', 'click', () => {
        if (GameController.useUpdatedDeck()) {
            const roadmap = document.getElementById('roadmap-panel');
            if (roadmap) roadmap.open = true;
        }
    });
    listen('btn-open-archive', 'click', () => {
        document
            .getElementById('card-library-title')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('library-search')?.focus();
    });
    const commanderSelect = document.getElementById('player-commander-select');
    if (commanderSelect) {
        for (const commander of listCommanders()) {
            const option = document.createElement('option');
            option.value = commander.id;
            option.textContent = commander.provisional
                ? `${commander.name} (provvisorio)`
                : commander.name;
            commanderSelect.appendChild(option);
        }
    }
    initCardLibrary();
    initSettings();
    initDeckBuilder((cardIds) => GameController.resetWithDeck(cardIds));

    const fronts = ['left', 'center', 'right'];
    const slots = ['line', 'supA', 'supB'];
    fronts.forEach((front) => {
        ['supA', 'supB'].forEach((slot) => {
            const element = document.getElementById(`opp-${front}-${slot}`);
            element?.addEventListener('click', (event) => {
                event.stopPropagation();
                GameController.deployInfiltration(front, slot);
            });
        });
        slots.forEach((slot) => {
            const ownSlot = document.getElementById(`p-${front}-${slot}`);
            ownSlot?.addEventListener('click', (event) => {
                event.stopPropagation();
                GameController.handleSlotClick(front, slot);
            });
            ownSlot?.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                GameController.handleSlotClick(front, slot);
            });
        });
    });

    GameController.init();

    document.addEventListener('keydown', (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const target = event.target;
        if (
            target instanceof HTMLElement &&
            (target.isContentEditable ||
                ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName))
        ) {
            return;
        }
        if (event.key === 'Escape') {
            GameController.cancelSelection();
            return;
        }
        if (event.key === 'Enter' && !document.getElementById('btn-start').hidden) {
            event.preventDefault();
            GameController.startGame();
            return;
        }
        if (event.code === 'Space') {
            event.preventDefault();
            if (!document.getElementById('btn-principale').hidden) GameController.enterMainPhase();
            else if (!document.getElementById('btn-attack').hidden) GameController.resolveCombat();
            else if (!document.getElementById('btn-finale').hidden) GameController.endTurn();
        }
    });
}
