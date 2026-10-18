// Comandanti — roster PROVVISORIO e logica pura.
//
// NOTA: il regolamento ufficiale stabilisce che ogni Comandante ha un'abilità di
// Rifornimento e un'abilità attivabile una volta per turno, ma non ne definisce
// ancora il contenuto. Il roster qui sotto è quindi provvisorio (flag
// `provisional: true`) e va sostituito con i dati definitivi.
//
// Ogni abilità è descritta con una piccola lista di `ops` che game.js interpreta:
//   gainEcho { amount }                         -> l'attore guadagna Echo
//   addMadness { target, amount }               -> il bersaglio guadagna Follia
//   addParasite { target, amount }              -> il bersaglio guadagna Parassiti
//   drawArmy { amount }                         -> l'attore pesca carte Esercito
//   announce { amount }                         -> il testo viene annunciato, il tavolo non cambia
// Un'abilità può avere una `condition` valutata sull'attore.

export const COMMANDERS = [
    {
        id: 'cmd-1-01',
        name: 'Kragor, Signore della Furia Vulcanica',
        setId: 'set-1',
        pc: 20,
        provisional: true,
        rifornimento: {
            text: 'Istinto del Branco: se controlli meno Unità dell\'avversario, le tue Unità in Linea ottengono +1 Forza durante la Fase di Scontro.',
            ops: [{ type: 'announce', amount: 1 }]
        },
        activation: {
            name: 'Abilità attiva',
            text: 'Una volta per turno, costo 2: scegli un tuo Fronte. Fino alla fine del turno, l\'Unità in Linea ottiene Ferocia (se l\'ha già, ottiene +1 Forza).',
            ops: [{ type: 'announce', amount: 1 }]
        }
    },
    {
        id: 'cmd-2-01',
        name: 'Malakor, Arconte del Tormento',
        setId: 'set-2',
        pc: 20,
        provisional: true,
        rifornimento: {
            text: 'Maledizione dell\'Erebo: quando un effetto Tormento danneggia il Comandante avversario, pesca 1 carta se controlli una Linea.',
            ops: [{ type: 'announce', amount: 1 }]
        },
        activation: {
            name: 'Abilità attiva',
            text: 'Una volta per turno, costo 2: una tua Unità in Linea ottiene Logorare (se ce l\'ha già, la Linea avversaria perde 1 Forza).',
            ops: [{ type: 'announce', amount: 1 }]
        }
    },
    {
        id: 'cmd-3-01',
        name: 'Xylar, Mente Suprema dello Sciame',
        setId: 'set-3',
        pc: 20,
        provisional: true,
        rifornimento: {
            text: 'Crea una pedina Sciame con Forza 1 in Supporto oppure metti 1 segnalino Parassita sul Comandante avversario.',
            ops: [{ type: 'announce', amount: 1 }]
        },
        activation: {
            name: 'Abilità attiva',
            text: 'Una volta per turno, paga 2 Domini attivi: un\'Unità con Mente Collettiva ottiene +2 Forza fino alla fine dello Scontro e applica 1 Parassita.',
            ops: [{ type: 'announce', amount: 1 }]
        }
    },
    {
        id: 'cmd-4-01',
        name: 'Aurelius, l\'Imperatore Celeste',
        setId: 'set-4',
        pc: 20,
        provisional: true,
        rifornimento: {
            text: 'All\'inizio del tuo turno, pesca 1 carta.',
            ops: [{ type: 'drawArmy', amount: 1 }]
        },
        activation: {
            name: 'Abilità attiva',
            text: 'Una volta per turno, costo 2 PC: un\'Unità idonea subisce Ascensione; altrimenti infliggi 1 segnalino Tormento a un Comandante avversario.',
            ops: [{ type: 'announce', amount: 1 }]
        }
    }
];

const KNOWN_OPS = new Set(['gainEcho', 'addMadness', 'addParasite', 'drawArmy', 'announce']);
const KNOWN_CONDITIONS = new Set(['madnessAtMost']);
const SELF_OPS = new Set(['gainEcho', 'drawArmy', 'announce']);

export function listCommanders() {
    return COMMANDERS.map(commander => ({
        id: commander.id,
        name: commander.name,
        setId: commander.setId,
        pc: commander.pc,
        provisional: commander.provisional === true
    }));
}

export function getCommander(id) {
    return COMMANDERS.find(commander => commander.id === id) || null;
}

export function defaultCommanderId() {
    return COMMANDERS[0]?.id || null;
}

export function commanderForSet(setId) {
    const match = COMMANDERS.find(commander => commander.setId === setId) || COMMANDERS[0];
    return match ? match.id : null;
}

function conditionMet(condition, self) {
    if (condition.type === 'madnessAtMost') return (self?.follia ?? 0) <= condition.value;
    return false;
}

// Valuta un'abilità per un attore; funzione pura, non modifica nulla.
// Ritorna { ok, reason, effects } dove `effects` è una lista di descrittori
// { kind, target, amount } che il chiamante applica.
export function evaluateCommanderAbility(ability, { self } = {}) {
    if (!ability) return { ok: false, reason: 'missing-ability', effects: [] };
    if (ability.condition) {
        if (!KNOWN_CONDITIONS.has(ability.condition.type)) {
            return { ok: false, reason: 'unsupported-condition', effects: [] };
        }
        if (!conditionMet(ability.condition, self)) {
            return { ok: false, reason: 'condition-not-met', effects: [] };
        }
    }
    const ops = ability.ops || [];
    if (ops.length === 0) return { ok: false, reason: 'missing-ops', effects: [] };
    const effects = [];
    for (const op of ops) {
        if (!KNOWN_OPS.has(op.type)) return { ok: false, reason: `unsupported-op:${op.type}`, effects: [] };
        if (!Number.isFinite(op.amount) || op.amount <= 0) return { ok: false, reason: 'invalid-amount', effects: [] };
        const target = op.target || (SELF_OPS.has(op.type) ? 'self' : 'opponent');
        if (target !== 'self' && target !== 'opponent') return { ok: false, reason: 'invalid-target', effects: [] };
        effects.push({ kind: op.type, target, amount: op.amount });
    }
    return { ok: true, effects };
}

// Validazione dei dati: ritorna una lista (eventualmente vuota) di problemi.
export function validateCommander(commander) {
    const problems = [];
    if (!commander?.id) problems.push('id mancante');
    if (!commander?.name) problems.push('name mancante');
    if (!Number.isFinite(commander?.pc) || commander.pc <= 0) problems.push('pc non valido');
    const abilities = [['rifornimento', commander?.rifornimento], ['activation', commander?.activation]];
    for (const [key, ability] of abilities) {
        if (!ability) {
            problems.push(`${key} mancante`);
            continue;
        }
        if (key === 'activation' && !ability.name) problems.push('activation.name mancante');
        if (!Array.isArray(ability.ops) || ability.ops.length === 0) {
            problems.push(`${key}.ops mancante o vuoto`);
        } else {
            for (const op of ability.ops) {
                if (!KNOWN_OPS.has(op.type)) problems.push(`${key}: op sconosciuta "${op.type}"`);
            }
        }
        if (ability.condition && !KNOWN_CONDITIONS.has(ability.condition.type)) {
            problems.push(`${key}: condizione sconosciuta "${ability.condition.type}"`);
        }
    }
    return problems;
}
