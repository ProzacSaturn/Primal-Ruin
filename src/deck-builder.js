import catalog from './data/cards.json' with { type: 'json' };
import { getCardExecutionStatus } from './card-effects.js';
import { tacticTiming } from './tactics.js';
import { validateDeckIds } from './deck-validation.js';

const STORAGE_KEY = 'primal-ruin.custom-deck.v1';
const QUARANTINE_KEY = 'primal-ruin.custom-deck.quarantine';
const DECK_VERSION = 1;
const cardsById = new Map(catalog.cards.map((card) => [card.id, card]));
const preparedCards = new Map(
    catalog.cards.map((card) => [
        card.id,
        {
            searchText: `${card.name} ${card.type || ''} ${card.rulesText} ${
                tacticTiming(card) === 'instant' ? 'istantanea' : tacticTiming(card) === 'standard' ? 'standard' : ''
            }`.toLocaleLowerCase('it'),
            executionStatus: getCardExecutionStatus(card)
        }
    ])
);
const CATEGORY_LABELS = {
    unit: 'Unità',
    tactic: 'Tattica',
    equipment: 'Equipaggiamento',
    site: 'Sito',
    field: 'Campo'
};

function validateDeck(cardIds) {
    return validateDeckIds(cardIds, cardsById);
}

function quarantineDeck(serialized, reason) {
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
        console.error('Impossibile mettere da parte il mazzo illeggibile.', error);
    }
}

export function loadCustomDeck() {
    let serialized;
    try {
        serialized = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        console.error('Impossibile leggere il mazzo salvato.', error);
        return null;
    }
    if (!serialized) return null;
    let stored;
    try {
        stored = JSON.parse(serialized);
    } catch (error) {
        quarantineDeck(serialized, 'json');
        console.error('Il mazzo salvato non è JSON valido.', error);
        return null;
    }
    const legacyList = Array.isArray(stored);
    const cardIds = legacyList ? stored : stored?.cardIds;
    const version = legacyList ? DECK_VERSION : stored?.version;
    if (!Number.isInteger(version) || version < 1) {
        quarantineDeck(serialized, 'version');
        console.error('Il mazzo salvato ha una versione non riconosciuta.');
        return null;
    }
    const validation = validateDeck(cardIds);
    if (!validation.valid) {
        quarantineDeck(serialized, 'invalid');
        console.error(`Il mazzo salvato non è valido: ${validation.message}`);
        return null;
    }
    return cardIds;
}

export function saveCustomDeck(cardIds) {
    const validation = validateDeck(cardIds);
    if (!validation.valid) throw new Error(validation.message);
    let previous = null;
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (serialized) {
            try {
                previous = JSON.parse(serialized);
            } catch {
                quarantineDeck(serialized, 'json');
            }
        }
    } catch {
        previous = null;
    }
    const extras =
        previous && typeof previous === 'object' && !Array.isArray(previous)
            ? Object.fromEntries(
                  Object.entries(previous).filter(([key]) => key !== 'version' && key !== 'cardIds')
              )
            : {};
    const version =
        Number.isInteger(previous?.version) && previous.version >= DECK_VERSION
            ? previous.version
            : DECK_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, ...extras, cardIds }));
}

export function clearCustomDeck() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Impossibile rimuovere il mazzo personalizzato.', error);
        throw error;
    }
}

export function initDeckBuilder(onUseDeck) {
    const root = document.getElementById('deck-builder');
    const setFilter = document.getElementById('builder-set');
    const categoryFilter = document.getElementById('builder-category');
    const searchInput = document.getElementById('builder-search');
    const catalogList = document.getElementById('builder-catalog');
    const deckList = document.getElementById('builder-deck');
    const count = document.getElementById('builder-count');
    const status = document.getElementById('builder-status');
    const saveButton = document.getElementById('builder-save');
    const useButton = document.getElementById('builder-use');
    let cardIds = loadCustomDeck() || [];

    function render() {
        const search = searchInput.value.trim().toLocaleLowerCase('it');
        const visibleCards = catalog.cards.filter((card) => {
            if (card.category === 'commander') return false;
            if (setFilter.value !== 'all' && card.setId !== setFilter.value) return false;
            if (categoryFilter.value !== 'all' && card.category !== categoryFilter.value)
                return false;
            return !search || preparedCards.get(card.id).searchText.includes(search);
        });
        catalogList.replaceChildren();
        for (const card of visibleCards) {
            const row = document.createElement('div');
            row.className = 'builder-card';
            const details = document.createElement('span');
            const execution = preparedCards.get(card.id).executionStatus;
            const speed = tacticTiming(card);
            const kind = speed
                ? `Tattica ${speed === 'instant' ? 'Istantanea' : 'Standard'}`
                : CATEGORY_LABELS[card.category];
            details.textContent = `${card.name} · ${kind} · costo ${card.cost} · ${execution.label}`;
            const add = document.createElement('button');
            add.type = 'button';
            add.className = 'btn builder-add';
            add.textContent = 'Aggiungi';
            add.setAttribute('aria-label', `Aggiungi ${card.name} al mazzo`);
            add.disabled = cardIds.length >= 40;
            add.addEventListener('click', () => {
                if (cardIds.length >= 40) return;
                cardIds.push(card.id);
                render();
            });
            row.append(details, add);
            catalogList.appendChild(row);
        }

        const counts = new Map();
        cardIds.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
        deckList.replaceChildren();
        for (const [id, quantity] of counts) {
            const card = cardsById.get(id);
            const row = document.createElement('div');
            row.className = 'builder-card';
            const details = document.createElement('span');
            details.textContent = `${quantity}× ${card.name}`;
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'btn builder-remove';
            remove.textContent = 'Rimuovi';
            remove.setAttribute('aria-label', `Rimuovi una copia di ${card.name} dal mazzo`);
            remove.addEventListener('click', () => {
                const index = cardIds.lastIndexOf(id);
                if (index >= 0) cardIds.splice(index, 1);
                render();
            });
            row.append(details, remove);
            deckList.appendChild(row);
        }

        const validation = validateDeck(cardIds);
        const unsupportedCount = cardIds.reduce(
            (count, id) =>
                count + Number(preparedCards.get(id).executionStatus.label === 'Non eseguibile'),
            0
        );
        count.textContent = `${cardIds.length}/40 carte`;
        status.textContent =
            validation.valid && unsupportedCount > 0
                ? `${validation.message} Avviso: ${unsupportedCount} carte hanno effetti non giocabili in questa build.`
                : validation.message;
        status.classList.toggle('valid', validation.valid);
        status.classList.toggle('warning', validation.valid && unsupportedCount > 0);
        saveButton.disabled = !validation.valid;
        useButton.disabled = !validation.valid;
    }

    let searchTimer = 0;
    for (const control of [setFilter, categoryFilter]) control.addEventListener('change', render);
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(render, 150);
    });
    saveButton.addEventListener('click', () => {
        try {
            saveCustomDeck(cardIds);
            status.textContent = 'Mazzo salvato in questo browser.';
        } catch (error) {
            status.textContent = `Salvataggio non riuscito: ${error.message}`;
            console.error('Impossibile salvare il mazzo personalizzato.', error);
        }
    });
    useButton.addEventListener('click', async () => {
        const validation = validateDeck(cardIds);
        if (!validation.valid) {
            status.textContent = validation.message;
            return;
        }
        try {
            saveCustomDeck(cardIds);
            await onUseDeck([...cardIds]);
        } catch (error) {
            status.textContent = `Impossibile usare il mazzo: ${error.message}`;
            console.error('Impossibile avviare una partita con il mazzo personalizzato.', error);
        }
    });
    root.addEventListener('toggle', render);
    document.addEventListener('primal-ruin:demo-decks', () => {
        cardIds = [];
        render();
    });
    render();
}
