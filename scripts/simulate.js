import { mkdirSync, writeFileSync } from 'node:fs';
import { formatReport, simulateMatches } from '../src/ai/simulate.js';

const options = parseArgs(process.argv.slice(2));
const report = await simulateMatches({
    games: options.games,
    seed: options.seed,
    decks: options.decks,
    turnLimit: options.turnLimit,
    onProgress(done, total) {
        if (done % 100 === 0 || done === total) console.log(`Partite ${done}/${total}`);
    }
});
console.log(formatReport(report));
mkdirSync(options.outDir, { recursive: true });
const file = `${options.outDir}/sim-${report.seme}-${report.partite}.json`;
writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Report: ${file}`);

function parseArgs(argv) {
    const options = {
        games: 1000,
        seed: 1,
        decks: null,
        turnLimit: 100,
        outDir: 'sim-results'
    };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--games') options.games = integerArg(argv, ++index, '--games');
        else if (arg === '--seed') options.seed = integerArg(argv, ++index, '--seed');
        else if (arg === '--decks') options.decks = textArg(argv, ++index, '--decks');
        else if (arg === '--turn-limit')
            options.turnLimit = integerArg(argv, ++index, '--turn-limit');
        else if (arg === '--out') options.outDir = textArg(argv, ++index, '--out');
        else throw new Error(`Argomento sconosciuto: ${arg}`);
    }
    return options;
}

function integerArg(argv, index, name) {
    const value = Number(argv[index]);
    if (!Number.isInteger(value)) throw new Error(`${name} vuole un intero.`);
    return value;
}

function textArg(argv, index, name) {
    const value = argv[index];
    if (!value || value.startsWith('--')) throw new Error(`${name} vuole un valore.`);
    return value;
}
