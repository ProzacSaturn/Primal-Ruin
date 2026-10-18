import catalog from './data/cards.json' with { type: 'json' };
import { getCardExecutionStatus } from './card-effects.js';

const CATEGORY_LABELS = {
    unit: 'Unità',
    tactic: 'Tattica',
    equipment: 'Equipaggiamento',
    site: 'Sito',
    field: 'Campo',
    commander: 'Comandante'
};

export function initCardLibrary() {
    const setFilter = document.getElementById('library-set');
    const categoryFilter = document.getElementById('library-category');
    const searchInput = document.getElementById('library-search');
    const count = document.getElementById('library-count');
    const grid = document.getElementById('catalog-grid');

    function render() {
        const query = searchInput.value.trim().toLocaleLowerCase('it');
        const filtered = catalog.cards.filter(card => {
            if (setFilter.value !== 'all' && card.setId !== setFilter.value) return false;
            if (categoryFilter.value !== 'all' && card.category !== categoryFilter.value) return false;
            if (!query) return true;
            const searchable = [
                card.name,
                card.setName,
                card.type || '',
                card.rarity || '',
                card.rulesText
            ].join(' ').toLocaleLowerCase('it');
            return searchable.includes(query);
        });

        count.textContent = `${filtered.length} di ${catalog.cards.length} carte`;
        grid.replaceChildren();
        if (filtered.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'library-empty';
            empty.textContent = 'Nessuna carta corrisponde ai filtri.';
            grid.appendChild(empty);
            return;
        }

        for (const card of filtered) {
            const element = document.createElement('article');
            element.className = `library-card category-${card.category}`;
            const title = document.createElement('h3');
            title.textContent = `${String(card.number).padStart(3, '0')} · ${card.name}`;
            const metadata = document.createElement('p');
            metadata.className = 'library-metadata';
            metadata.textContent = `${card.setName} · ${CATEGORY_LABELS[card.category]} · ${card.rarity || 'Rarità non indicata'}`;
            const stats = document.createElement('p');
            stats.className = 'library-stats';
            const cardStats = [];
            if (card.cost !== null && card.cost !== undefined) cardStats.push(`Costo ${card.cost}`);
            if (card.health) cardStats.push(`Salute ${card.health}`);
            if (card.force !== null) cardStats.push(`Forza ${card.force}`);
            if (card.type) cardStats.push(card.type);
            if (card.equipCost !== null) cardStats.push(`Equip ${card.equipCost}`);
            if (card.decay !== null) cardStats.push(`Decadenza ${card.decay}`);
            stats.textContent = cardStats.join(' · ');
            const rules = document.createElement('p');
            rules.className = 'library-rules';
            rules.textContent = card.rulesText;
            const executionStatus = getCardExecutionStatus(card);
            const execution = document.createElement('p');
            execution.className = `library-execution ${executionStatus.label === 'Non eseguibile' ? 'unsupported' : ''}`;
            execution.textContent = `Motore: ${executionStatus.label}. ${executionStatus.detail}`;
            element.append(title, metadata, stats, rules, execution);
            grid.appendChild(element);
        }
    }

    let searchTimer = 0;
    setFilter.addEventListener('change', render);
    categoryFilter.addEventListener('change', render);
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(render, 150);
    });
    render();
}
