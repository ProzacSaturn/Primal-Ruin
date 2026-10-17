import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'Set.txt');
const outputPath = resolve(root, 'src', 'data', 'cards.json');
const setDefinitions = [
    { id: 'set-1', name: 'Furia Giurassica', marker: 'FURIA GIURASSICA' },
    { id: 'set-2', name: 'Risveglio Infernale', marker: 'RISVEGLIO INFERNALE' },
    { id: 'set-3', name: 'Invasione Silente', marker: 'INVASIONE SILENTE' }
];
const expectedCategories = {
    'set-1': { unit: 60, tactic: 18, equipment: 12, site: 20, field: 10 },
    'set-2': { unit: 52, tactic: 26, equipment: 8, site: 26, field: 8 },
    'set-3': { unit: 56, tactic: 24, equipment: 8, site: 24, field: 8 }
};
const categoryMarkers = [
    ['tactic', 'TATTICHE'],
    ['equipment', 'EQUIPAGGIAMENTI'],
    ['site', 'SITI'],
    ['field', 'CAMPI']
];
const rarityMarkers = new Map([
    ['COMUNI', 'Comune'],
    ['NON COMUNI', 'Non comune'],
    ['RARE', 'Rara'],
    ['MITICHE', 'Mitica'],
    ['LEGGENDARIE', 'Leggendaria']
]);

function headingText(line) {
    return line.trim().replace(/^[^\p{L}]*/u, '').toLocaleUpperCase('it');
}

function parseCard(card) {
    const body = card.body;
    const costLine = body.find(line => /^Costo\s*:?\s*\d+/i.test(line.trim()));
    const forceLine = body.find(line => /^Forza\s*:?\s*\d+/i.test(line.trim()));
    const typeLine = body.find(line => /^Tipo\s*:/i.test(line.trim()));
    const cost = costLine ? Number(costLine.match(/\d+/)[0]) : null;
    const force = forceLine ? Number(forceLine.match(/\d+/)[0]) : null;
    const type = typeLine ? typeLine.replace(/^Tipo\s*:\s*/i, '').trim() : null;
    const equipMatch = costLine?.match(/\bEquip(?:aggiamento)?\s*:?\s*(\d+)/i);
    const decayMatch = costLine?.match(/\bDecadenza\s*\((\d+)\)/i);
    const excluded = /^(?:Costo\s*:?\s*\d+|Forza\s*:?\s*\d+|Tipo\s*:|Testo\s*:)/i;
    const rulesText = body
        .filter(line => !excluded.test(line.trim()))
        .join('\n')
        .trim();

    return {
        id: `${card.setId}-${String(card.number).padStart(3, '0')}`,
        setId: card.setId,
        setName: card.setName,
        number: card.number,
        name: card.name,
        category: card.category,
        rarity: card.rarity,
        cost,
        force,
        type,
        equipCost: equipMatch ? Number(equipMatch[1]) : null,
        decay: decayMatch ? Number(decayMatch[1]) : null,
        rulesText,
        sourceLine: card.sourceLine
    };
}

const source = readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '');
const lines = source.split(/\r?\n/);
const cards = [];
let activeSet = setDefinitions[0];
let category = 'unit';
let rarity = null;
let current = null;

function flushCard() {
    if (!current) return;
    cards.push(parseCard(current));
    current = null;
}

for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const upper = line.trim().toLocaleUpperCase('it');
    const set = setDefinitions.find(definition => upper.includes(definition.marker));
    if (set && set !== activeSet) {
        flushCard();
        activeSet = set;
        category = 'unit';
        rarity = null;
        continue;
    }

    const text = headingText(line);
    const categoryMarker = categoryMarkers.find(([, marker]) => text.startsWith(marker));
    if (categoryMarker) {
        flushCard();
        category = categoryMarker[0];
        rarity = null;
        continue;
    }

    const rarityMarker = [...rarityMarkers.keys()].find(marker => text.startsWith(marker));
    if (rarityMarker) {
        flushCard();
        rarity = rarityMarkers.get(rarityMarker);
        continue;
    }

    const cardStart = line.match(/^\s*(\d{1,3})\.\s+(.+?)\s*$/);
    if (cardStart) {
        flushCard();
        current = {
            setId: activeSet.id,
            setName: activeSet.name,
            number: Number(cardStart[1]),
            name: cardStart[2].trim(),
            category,
            rarity,
            sourceLine: index + 1,
            body: []
        };
        continue;
    }

    if (current) current.body.push(line);
}
flushCard();

const errors = [];
const ids = new Set();
for (const definition of setDefinitions) {
    const setCards = cards.filter(card => card.setId === definition.id);
    const counts = Object.fromEntries(
        ['unit', 'tactic', 'equipment', 'site', 'field']
            .map(kind => [kind, setCards.filter(card => card.category === kind).length])
    );
    for (const [kind, expected] of Object.entries(expectedCategories[definition.id])) {
        if (counts[kind] !== expected) {
            errors.push(`${definition.id}: ${kind} attese ${expected}, trovate ${counts[kind]}`);
        }
    }
    const numbers = setCards.map(card => card.number).sort((a, b) => a - b);
    if (numbers.length !== 120 || numbers.some((number, index) => number !== index + 1)) {
        errors.push(`${definition.id}: numerazione carte incompleta o duplicata`);
    }
}

for (const card of cards) {
    if (ids.has(card.id)) errors.push(`ID duplicato: ${card.id}`);
    ids.add(card.id);
    if (card.cost === null) errors.push(`${card.id} ${card.name}: costo mancante`);
    if (card.category === 'unit' && (card.force === null || !card.type)) {
        errors.push(`${card.id} ${card.name}: Forza o Tipo mancante`);
    }
}

if (cards.length !== 360) errors.push(`Attese 360 carte, trovate ${cards.length}`);
if (errors.length) {
    console.error(`Importazione non valida:\n- ${errors.join('\n- ')}`);
    process.exitCode = 1;
} else {
    const catalog = {
        version: 1,
        source: 'Set.txt',
        sets: setDefinitions.map(definition => ({
            id: definition.id,
            name: definition.name,
            cardCount: cards.filter(card => card.setId === definition.id).length
        })),
        cards
    };
    const { mkdirSync } = await import('node:fs');
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    console.log(`Importate ${cards.length} carte da ${setDefinitions.length} set in ${outputPath}`);
    for (const definition of setDefinitions) {
        const summary = expectedCategories[definition.id];
        console.log(`${definition.name}: ${Object.entries(summary).map(([kind, count]) => `${kind} ${count}`).join(', ')}`);
    }
}
