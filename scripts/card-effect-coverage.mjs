import catalog from '../src/data/cards.json' with { type: 'json' };
import { getCardExecutionStatus } from '../src/card-effects.js';

if (!catalog.cards.length) {
    throw new Error('Il catalogo è vuoto: impossibile verificare la copertura degli effetti.');
}

const categories = ['unit', 'tactic', 'equipment', 'site', 'field', 'commander'];
const labels = ['Unità base', 'Keyword implementata', 'Implementata', 'Parziale', 'Non eseguibile'];
const summary = Object.fromEntries(categories.map(category => [
    category,
    Object.fromEntries(labels.map(label => [label, 0]))
]));

for (const card of catalog.cards) {
    const status = getCardExecutionStatus(card);
    summary[card.category][status.label]++;
}

console.log('Copertura dichiarata degli effetti carta:');
for (const [category, counts] of Object.entries(summary)) {
    const parts = Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([label, count]) => `${label} ${count}`);
    console.log(`${category}: ${parts.join(', ')}`);
}
