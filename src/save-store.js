const STORAGE_KEY = 'primal-ruin.game-save.v1';
const QUARANTINE_KEY = 'primal-ruin.game-save.quarantine';
const SAVE_VERSION = 3;

function showSaveStatus(message) {
    if (typeof document === 'undefined') return;
    const status = document.getElementById('save-status');
    if (status) status.textContent = message;
}

function quarantineSave(serialized, reason) {
    if (!serialized) return;
    try {
        localStorage.setItem(
            QUARANTINE_KEY,
            JSON.stringify({
                quarantinedAt: new Date().toISOString(),
                reason,
                payload: serialized
            })
        );
    } catch (error) {
        console.error('Impossibile mettere da parte il salvataggio illeggibile.', error);
    }
}

function snapshotIsValid(state) {
    return (
        Array.isArray(state?.players) &&
        state.players.length === 2 &&
        state.players.every(
            (player) =>
                Number.isFinite(player.pc) &&
                player.pc >= 0 &&
                player.pc <= 20 &&
                Number.isInteger(player.follia) &&
                player.follia >= 0 &&
                player.follia <= 10 &&
                Number.isInteger(player.echo) &&
                player.echo >= 0 &&
                typeof player.commanderId === 'string' &&
                player.commanderId.length > 0 &&
                typeof player.commanderAbilityUsed === 'boolean' &&
                Array.isArray(player.armyDeck) &&
                Array.isArray(player.domainDeck) &&
                Array.isArray(player.hand) &&
                Array.isArray(player.discard) &&
                Array.isArray(player.exile) &&
                Array.isArray(player.domains) &&
                player.fronts &&
                ['left', 'center', 'right'].every((front) =>
                    stateFrontIsValid(player.fronts[front])
                )
        ) &&
        Number.isInteger(state.currentIndex) &&
        [0, 1].includes(state.currentIndex) &&
        ['setup', 'rifornimento', 'principale', 'scontro', 'finale', 'gameover'].includes(
            state.phase
        ) &&
        Number.isInteger(state.turnNumber) &&
        state.turnNumber >= 0 &&
        Number.isInteger(state.firstPlayerIndex) &&
        [0, 1].includes(state.firstPlayerIndex) &&
        typeof state.firstTurn === 'boolean' &&
        Array.isArray(state.sorvoloUsed) &&
        Number.isInteger(state.randomState) &&
        state.randomState > 0 &&
        state.randomState <= 0xffffffff
    );
}

function migrateSave(save, version) {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                ...save,
                version: SAVE_VERSION,
                migratedFrom: version
            })
        );
        showSaveStatus(`Salvataggio aggiornato dalla versione ${version}.`);
    } catch (error) {
        showSaveStatus(
            `Salvataggio letto (versione ${version}), ma l'aggiornamento non è stato scritto: ${error.message}`
        );
        console.error('Impossibile aggiornare il salvataggio locale.', error);
    }
}

export function persistGame(snapshot) {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                version: SAVE_VERSION,
                savedAt: new Date().toISOString(),
                snapshot
            })
        );
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
        quarantineSave(serialized, 'json');
        showSaveStatus(
            'Il salvataggio è illeggibile ed è stato messo da parte. Verrà avviata una nuova partita.'
        );
        console.error('Il salvataggio della partita non è JSON valido.', error);
        return null;
    }
    const state = save?.snapshot;
    const stampedVersion = Number.isInteger(save?.version) ? save.version : null;
    const version = stampedVersion ?? 0;
    if (version > SAVE_VERSION) {
        quarantineSave(serialized, 'future');
        showSaveStatus(
            'Il salvataggio è di una versione più nuova e non può essere aperto. È stato messo da parte.'
        );
        console.error('Il salvataggio della partita è incompleto o incompatibile.');
        return null;
    }
    if (!snapshotIsValid(state)) {
        quarantineSave(serialized, 'invalid');
        showSaveStatus(
            'Il salvataggio è incompatibile o incompleto ed è stato messo da parte. Verrà avviata una nuova partita.'
        );
        console.error('Il salvataggio della partita è incompleto o incompatibile.');
        return null;
    }
    if (version < SAVE_VERSION) migrateSave(save, version);
    return state;
}

function stateFrontIsValid(front) {
    return (
        front &&
        ['line', 'supA', 'supB'].every(
            (slot) => front[slot] === null || typeof front[slot] === 'object'
        )
    );
}

export function clearGameSave() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        showSaveStatus(`Eliminazione del salvataggio non riuscita: ${error.message}`);
        console.error('Impossibile rimuovere il salvataggio locale.', error);
    }
}
