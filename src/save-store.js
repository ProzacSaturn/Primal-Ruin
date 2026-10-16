const STORAGE_KEY = 'primal-ruin.game-save.v1';
const SAVE_VERSION = 3;

function showSaveStatus(message) {
    if (typeof document === 'undefined') return;
    const status = document.getElementById('save-status');
    if (status) status.textContent = message;
}

export function persistGame(snapshot) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            version: SAVE_VERSION,
            savedAt: new Date().toISOString(),
            snapshot
        }));
        showSaveStatus(`Partita salvata alle ${new Date().toLocaleTimeString('it-IT')}.`);
    } catch (error) {
        showSaveStatus(`Salvataggio partita non riuscito: ${error.message}`);
        console.error('Impossibile salvare lo stato della partita.', error);
    }
}

export function loadGameSave() {
    let serialized;
    try {
        serialized = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        showSaveStatus(`Lettura del salvataggio non riuscita: ${error.message}`);
        console.error('Impossibile leggere il salvataggio locale.', error);
        return null;
    }
    if (!serialized) return null;
    let save;
    try {
        save = JSON.parse(serialized);
    } catch (error) {
        showSaveStatus('Il salvataggio è illeggibile; verrà avviata una nuova partita.');
        console.error('Il salvataggio della partita non è JSON valido.', error);
        return null;
    }
    const state = save?.snapshot;
    const valid = save?.version === SAVE_VERSION &&
        Array.isArray(state?.players) && state.players.length === 2 &&
        state.players.every(player =>
            Number.isFinite(player.pc) && player.pc >= 0 && player.pc <= 20 &&
            Number.isInteger(player.follia) && player.follia >= 0 && player.follia <= 10 &&
            Number.isInteger(player.echo) && player.echo >= 0 &&
            typeof player.commanderId === 'string' && player.commanderId.length > 0 &&
            typeof player.commanderAbilityUsed === 'boolean' &&
            Array.isArray(player.armyDeck) && Array.isArray(player.domainDeck) &&
            Array.isArray(player.hand) && Array.isArray(player.discard) &&
            Array.isArray(player.exile) && Array.isArray(player.domains) && player.fronts &&
            ['left', 'center', 'right'].every(front =>
                stateFrontIsValid(player.fronts[front]))
        ) &&
        Number.isInteger(state.currentIndex) && [0, 1].includes(state.currentIndex) &&
        ['setup', 'rifornimento', 'principale', 'scontro', 'finale', 'gameover'].includes(state.phase) &&
        Number.isInteger(state.turnNumber) && state.turnNumber >= 0 &&
        Number.isInteger(state.firstPlayerIndex) && [0, 1].includes(state.firstPlayerIndex) &&
        typeof state.firstTurn === 'boolean' &&
        Array.isArray(state.sorvoloUsed) &&
        Number.isInteger(state.randomState) && state.randomState > 0 &&
        state.randomState <= 0xffffffff;
    if (!valid) {
        showSaveStatus('Il salvataggio è incompatibile o incompleto; verrà avviata una nuova partita.');
        console.error('Il salvataggio della partita è incompleto o incompatibile.');
        return null;
    }
    return state;
}

function stateFrontIsValid(front) {
    return front && ['line', 'supA', 'supB'].every(slot =>
        front[slot] === null || typeof front[slot] === 'object');
}

export function clearGameSave() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        showSaveStatus(`Eliminazione del salvataggio non riuscita: ${error.message}`);
        console.error('Impossibile rimuovere il salvataggio locale.', error);
    }
}
