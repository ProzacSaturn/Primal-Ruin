import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const setsDir = resolve(root, 'sets');
const outputPath = resolve(root, 'src', 'data', 'cards.json');

const setFiles = [
    { id: 'set-1', name: 'Furia Giurassica', file: 'set_1_furia_giurassica.md' },
    { id: 'set-2', name: 'Risveglio Infernale', file: 'set_2_risveglio_infernale.md' },
    { id: 'set-3', name: 'Invasione Silente', file: 'set_3_invasione_silente.md' },
    { id: 'set-4', name: 'Ascesa Divina', file: 'set_4_ascesa_divina.md' }
];

const categoryNames = {
    UNITÀ: 'unit',
    UNITA: 'unit',
    TATTICHE: 'tactic',
    EQUIPAGGIAMENTI: 'equipment',
    SITI: 'site',
    CAMPI: 'field',
    COMANDANTE: 'commander'
};

function categoryRanges(text) {
    const ranges = [];
    // Maiuscolo di proposito: nel testo delle carte «Unità» e «Comandante»
    // precedono spesso una parentesi e non devono rubare l'intervallo del titolo.
    const pattern = /(UNITÀ|UNITA|TATTICHE|EQUIPAGGIAMENTI|SITI|CAMPI|COMANDANTE)[^\d()]{0,40}\((\d+)(?:\s*[-–—]\s*(\d+))?\)/gu;
    let match;
    while ((match = pattern.exec(text))) {
        const start = Number(match[2]);
        const end = Number(match[3] || match[2]);
        const category = categoryNames[match[1]];
        if (!category) continue;
        ranges.push({ category, start, end });
    }
    return ranges;
}

function categoryFor(ranges, number) {
    return ranges.find(range => number >= range.start && number <= range.end)?.category || null;
}

function cardStarts(text) {
    const found = new Map();
    const consider = (number, index) => {
        if (number < 1 || number > 120 || found.has(number)) return;
        found.set(number, index);
    };
    for (const match of text.matchAll(/(?:^|\n)\s*(\d{1,3})\.\s+/g)) {
        consider(Number(match[1]), match.index + match[0].search(/\d/));
    }
    for (const match of text.matchAll(/(?:^|[^\d])(\d{1,3})\.\s+/g)) {
        consider(Number(match[1]), match.index + match[0].search(/\d/));
    }
    return [...found.entries()]
        .map(([number, index]) => ({ number, index }))
        .sort((left, right) => left.index - right.index);
}

function clean(text) {
    return text
        .replace(/\*\*/g, '')
        .replace(/\*(.*?)\*/gs, '$1')
        .replace(/\*/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .trim();
}

function trimChunk(slice) {
    const cut = slice.search(/\n\s*(?:---|#{1,6}\s|[👑🏛🌍📜🏹🟩🟣])/u);
    return cut >= 0 ? slice.slice(0, cut) : slice;
}

function parseChunk(raw) {
    let text = clean(raw.replace(/```/g, '').replace(/`/g, ''));
    text = text.replace(/^\s*\d{1,3}\.\s+/, '');
    text = text.replace(/\b(?:UNITÀ|UNITA|TATTICHE|EQUIPAGGIAMENTI|SITI|CAMPI|COMANDANTE)\s*\([^)]*\)[\s\S]*$/u, '');
    const marker = text.search(/\b(?:Costo|Salute|Punti Comando)\b/i);
    const name = (marker > 0 ? text.slice(0, marker) : text.split('\n')[0])
        .replace(/\|/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const body = marker > 0 ? text.slice(marker) : text.split('\n').slice(1).join('\n');
    const costMatch = body.match(/Costo\s*:\s*(\d+)/i);
    const forceMatch = body.match(/Forza\s*:\s*(\d+)/i);
    const typeMatch = body.match(/Tipo\s*:\s*(.+?)(?=\s*(?:\||\b(?:Costo|Forza|Equip|Decadenza|Salute|Punti Comando|Testo|Abilit)\b)|$)/is);
    const equipMatch = body.match(/Equip(?:aggiamento)?\s*:?\s*(\d+)/i);
    const decayMatch = body.match(/Decadenza\s*:\s*(\d+)/i) || body.match(/Decadenza\s*\((\d+)\)/i);
    const healthMatch = body.match(/Salute\s*:\s*(\d+)/i) ||
        body.match(/Punti Comando(?:\s*\(PC\))?(?:\s*Iniziali)?\s*:\s*(\d+)/i);
    const rules = body
        .replace(/Costo\s*:\s*\d+\s*(?:[–—-]\s*(?:Equip(?:aggiamento)?\s*:?\s*\d+|Decadenza\s*(?::\s*\d+|\(\d+\))))?/gi, '')
        .replace(/Forza\s*:\s*\d+/gi, '')
        .replace(/Tipo\s*:\s*.+?(?=\s*(?:\||\b(?:Costo|Forza|Equip|Decadenza|Salute|Punti Comando|Testo|Abilit)\b)|$)/gis, '')
        .replace(/Equip(?:aggiamento)?\s*:?\s*\d+/gi, '')
        .replace(/Decadenza\s*:\s*\d+/gi, '')
        .replace(/Decadenza\s*\(\d+\)/gi, '')
        .replace(/Salute\s*:\s*\d+/gi, '')
        .replace(/Punti Comando(?:\s*\(PC\))?(?:\s*Iniziali)?\s*:\s*\d+/gi, '')
        .replace(/\bTesto\s*:\s*/gi, '')
        .replace(/\|/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\s*[👑🏛🌍📜🏹🟩🟣]+\s*$/u, '')
        .trim();
    return {
        name,
        cost: costMatch ? Number(costMatch[1]) : null,
        force: forceMatch ? Number(forceMatch[1]) : null,
        type: typeMatch ? typeMatch[1].replace(/\s+/g, ' ').trim() : null,
        equipCost: equipMatch ? Number(equipMatch[1]) : null,
        decay: decayMatch ? Number(decayMatch[1]) : null,
        health: healthMatch ? Number(healthMatch[1]) : null,
        rulesText: rules
    };
}

const cards = [];
const errors = [];

for (const definition of setFiles) {
    const sourcePath = resolve(setsDir, definition.file);
    const text = readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '');
    const ranges = categoryRanges(text);
    const starts = cardStarts(text);
    if (starts.length !== 120) {
        const present = new Set(starts.map(start => start.number));
        const missing = [];
        for (let number = 1; number <= 120; number++) {
            if (!present.has(number)) missing.push(number);
        }
        errors.push(`${definition.id}: trovate ${starts.length} carte, mancano ${missing.join(', ') || 'nessuna (duplicati?)'}`);
    }
    starts.forEach((start, index) => {
        const end = starts[index + 1]?.index ?? text.length;
        const parsed = parseChunk(trimChunk(text.slice(start.index, end)));
        const category = categoryFor(ranges, start.number);
        if (!category) errors.push(`${definition.id}-${start.number}: categoria sconosciuta`);
        if (!parsed.name) errors.push(`${definition.id}-${start.number}: nome mancante`);
        if (category !== 'commander' && parsed.cost === null) {
            errors.push(`${definition.id}-${String(start.number).padStart(3, '0')} ${parsed.name}: costo mancante`);
        }
        if (category === 'unit' && (parsed.force === null || !parsed.type)) {
            errors.push(`${definition.id}-${String(start.number).padStart(3, '0')} ${parsed.name}: Forza o Tipo mancante`);
        }
        cards.push({
            id: `${definition.id}-${String(start.number).padStart(3, '0')}`,
            setId: definition.id,
            setName: definition.name,
            number: start.number,
            name: parsed.name,
            category,
            rarity: null,
            cost: parsed.cost,
            force: parsed.force,
            type: parsed.type,
            equipCost: parsed.equipCost,
            decay: parsed.decay,
            health: parsed.health,
            rulesText: parsed.rulesText,
            sourceFile: definition.file
        });
    });
}

const ids = new Set();
for (const card of cards) {
    if (ids.has(card.id)) errors.push(`ID duplicato: ${card.id}`);
    ids.add(card.id);
}

const expectedCounts = {
    'set-1': { unit: 60, tactic: 18, equipment: 12, site: 20, field: 9, commander: 1 },
    'set-2': { unit: 60, tactic: 18, equipment: 12, site: 20, field: 9, commander: 1 },
    'set-3': { unit: 56, tactic: 24, equipment: 8, site: 23, field: 8, commander: 1 },
    'set-4': { unit: 56, tactic: 26, equipment: 8, site: 24, field: 6, commander: 0 }
};
for (const [setId, expected] of Object.entries(expectedCounts)) {
    for (const [kind, count] of Object.entries(expected)) {
        const actual = cards.filter(card => card.setId === setId && card.category === kind).length;
        if (actual !== count) errors.push(`${setId} ${kind}: attese ${count}, trovate ${actual}`);
    }
}

if (errors.length) {
    console.error(`Importazione non valida:\n- ${errors.join('\n- ')}`);
    process.exitCode = 1;
} else {
    const catalog = {
        version: 2,
        source: 'sets/',
        sets: setFiles.map(definition => ({
            id: definition.id,
            name: definition.name,
            cardCount: cards.filter(card => card.setId === definition.id).length
        })),
        cards
    };
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    console.log(`Importate ${cards.length} carte da ${setFiles.length} set.`);
    for (const definition of setFiles) {
        const own = cards.filter(card => card.setId === definition.id);
        const counts = ['unit', 'tactic', 'equipment', 'site', 'field', 'commander']
            .map(kind => `${kind} ${own.filter(card => card.category === kind).length}`)
            .join(', ');
        console.log(`${definition.name}: ${counts}`);
    }
}

if (readdirSync(setsDir).length === 0) {
    console.error('La cartella sets/ è vuota.');
    process.exitCode = 1;
}
