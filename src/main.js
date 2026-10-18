import '../styles.css';
import { GameController } from '../game.js';
import { listCommanders } from './commanders.js';
import { initCardLibrary } from './card-library.js';
import { initDeckBuilder } from './deck-builder.js';
import { initSettings } from './settings.js';

document.getElementById('btn-mulligan').addEventListener('click', () => GameController.mulligan());
document.getElementById('btn-start').addEventListener('click', () => GameController.startGame());
document.getElementById('btn-principale').addEventListener('click', () => GameController.enterMainPhase());
document.getElementById('btn-attack').addEventListener('click', () => GameController.resolveCombat());
document.getElementById('btn-finale').addEventListener('click', () => GameController.endTurn());
document.getElementById('btn-canala').addEventListener('click', () => GameController.channelMadness());
document.getElementById('btn-sacrifice-end').addEventListener('click', () => GameController.finishSacrifice());
document.getElementById('btn-commander').addEventListener('click', () => GameController.activateCommanderAbility());
document.getElementById('btn-sorvolo').addEventListener('click', () => GameController.useSorvolo());
document.getElementById('btn-sorvolo-skip').addEventListener('click', () => GameController.skipSorvolo());
document.getElementById('btn-torment-madness').addEventListener('click', () => GameController.chooseTorment(true));
document.getElementById('btn-torment-damage').addEventListener('click', () => GameController.chooseTorment(false));
document.getElementById('btn-tactic-confirm').addEventListener('click', () => GameController.confirmTactic());
document.getElementById('btn-tactic-cancel').addEventListener('click', () => GameController.cancelTactic());
document.getElementById('btn-promotion-confirm').addEventListener('click', () => {
    GameController.choosePromotionSlot(document.getElementById('promotion-choice').value);
});
document.getElementById('btn-new-game').addEventListener('click', () => {
    if (window.confirm('Iniziare una nuova partita? La partita salvata verrà sostituita.')) {
        GameController.newGame();
    }
});
document.getElementById('btn-demo-decks').addEventListener('click', () => {
    if (GameController.useDemoDecks()) {
        document.dispatchEvent(new Event('primal-ruin:demo-decks'));
    }
});
const commanderSelect = document.getElementById('player-commander-select');
for (const commander of listCommanders()) {
    const option = document.createElement('option');
    option.value = commander.id;
    option.textContent = commander.provisional
        ? `${commander.name} (provvisorio)`
        : commander.name;
    commanderSelect.appendChild(option);
}
initCardLibrary();
initSettings();
initDeckBuilder(cardIds => GameController.resetWithDeck(cardIds));

const fronts = ['left', 'center', 'right'];
const slots = ['line', 'supA', 'supB'];
fronts.forEach(front => {
    ['supA', 'supB'].forEach(slot => {
        const element = document.getElementById(`opp-${front}-${slot}`);
        element.addEventListener('click', event => {
            event.stopPropagation();
            GameController.deployInfiltration(front, slot);
        });
    });
    slots.forEach(slot => {
        document.getElementById(`p-${front}-${slot}`).addEventListener('click', event => {
            event.stopPropagation();
            GameController.handleSlotClick(front, slot);
        });
        document.getElementById(`p-${front}-${slot}`).addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            GameController.handleSlotClick(front, slot);
        });
    });
});

GameController.init();

document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName))) {
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
