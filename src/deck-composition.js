import { nextRandom } from './random.js';

// Composizione del Mazzo Esercito di default (§2 del regolamento ufficiale, §1
// della guida al deckbuilding): 40 carte totali fra Unità, Tattiche,
// Equipaggiamenti, Siti e Campi. Il regolamento fissa solo il totale: questo è
// il profilo del prototipo e rientra in tutti i range raccomandati dalla guida.
export const ARMY_DECK_COMPOSITION = { unit: 22, tactic: 12, equipment: 4, site: 1, field: 1 };

// Curva dei costi (§2 della guida): 10-12 / 14-16 / 8-10 / 2-4 carte per fascia.
// Il profilo 11/15/10/4 sta dentro ogni intervallo e somma esattamente 40.
export const ARMY_COST_QUOTAS = [11, 15, 10, 4];

// Fascia di costo di una carta: costo 1-2, 3-4, 5-6, 7+. Si usa il costo
// stampato (`card.cost`), lo stesso mostrato nel deckbuilder e nel catalogo.
export function costBand(cost) {
    if (cost <= 2) return 0;
    if (cost <= 4) return 1;
    if (cost <= 6) return 2;
    return 3;
}

function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(nextRandom() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// Ripartizione delle carte fra categorie e fasce di costo. È un problema di
// trasporto (sorgente -> categorie -> fasce -> pozzo) con entrambe le marginali
// vincolate: quantità per categoria e quota per fascia. Serve una risoluzione
// esatta perché una scelta greedy può svuotare una fascia che l'unica categoria
// rimasta (es. gli Equipaggiamenti) non può coprire altrove. Qui si usa un
// Ford-Fulkerson con cammini di aumento BFS.
function planAllocation(supplies, need, quotas) {
    const categories = Object.keys(need);
    const SOURCE = 'source';
    const SINK = 'sink';
    const bandNode = band => `band:${band}`;
    const edges = [];

    const addEdge = (from, to, capacity) => {
        const forward = { from, to, capacity, flow: 0 };
        const backward = { from: to, to: from, capacity: 0, flow: 0 };
        forward.reverse = backward;
        backward.reverse = forward;
        edges.push(forward, backward);
        return forward;
    };

    for (const category of categories) addEdge(SOURCE, category, need[category]);
    for (let band = 0; band < quotas.length; band++) {
        addEdge(bandNode(band), SINK, quotas[band]);
    }
    const cellEdge = new Map();
    for (const category of categories) {
        for (let band = 0; band < quotas.length; band++) {
            cellEdge.set(
                `${category}:${band}`,
                addEdge(category, bandNode(band), supplies[category][band].length)
            );
        }
    }

    const target = quotas.reduce((sum, quota) => sum + quota, 0);
    let flow = 0;
    while (flow < target) {
        const parent = new Map([[SOURCE, null]]);
        const queue = [SOURCE];
        while (queue.length > 0 && !parent.has(SINK)) {
            const node = queue.shift();
            for (const edge of edges) {
                if (edge.from !== node || edge.flow >= edge.capacity) continue;
                if (parent.has(edge.to)) continue;
                parent.set(edge.to, edge);
                queue.push(edge.to);
            }
        }
        if (!parent.has(SINK)) break;
        let bottleneck = Infinity;
        for (let node = SINK; parent.get(node);) {
            const edge = parent.get(node);
            bottleneck = Math.min(bottleneck, edge.capacity - edge.flow);
            node = edge.from;
        }
        for (let node = SINK; parent.get(node);) {
            const edge = parent.get(node);
            edge.flow += bottleneck;
            edge.reverse.flow -= bottleneck;
            node = edge.from;
        }
        flow += bottleneck;
    }

    return {
        exact: flow >= target,
        allocation: Object.fromEntries(categories.map(category => [
            category,
            quotas.map((unused, band) => cellEdge.get(`${category}:${band}`).flow)
        ]))
    };
}

/**
 * Compone il Mazzo Esercito pescando dalle `cards` fornite (le carte di un set)
 * secondo la composizione per categoria e la curva dei costi richieste.
 *
 * Se il set non copre tutti gli intervalli della curva (set ristretti) la curva
 * viene approssimata e `exact` è `false`, ma la composizione per categoria resta
 * sempre garantita. Le carte sono mescolate con il PRNG condiviso, quindi la
 * selezione è casuale ma riproducibile sotto seme.
 *
 * @param {Array<object>} cards
 * @param {{ composition?: object, quotas?: number[], label?: string }} [options]
 * @returns {{ cards: Array<object>, exact: boolean }}
 */
export function composeArmyDeck(cards, {
    composition = ARMY_DECK_COMPOSITION,
    quotas = ARMY_COST_QUOTAS,
    label = 'indicato'
} = {}) {
    const supplies = {};
    for (const [category, need] of Object.entries(composition)) {
        const pool = cards.filter(card => card.category === category);
        if (pool.length < need) {
            throw new Error(
                `Il set ${label} ha solo ${pool.length} carte "${category}": ne servono ${need}.`
            );
        }
        const bands = quotas.map(() => []);
        for (const card of shuffled(pool)) bands[costBand(card.cost ?? 0)].push(card);
        supplies[category] = bands;
    }

    const { allocation, exact } = planAllocation(supplies, composition, quotas);
    const picks = [];
    for (const [category, need] of Object.entries(composition)) {
        let missing = need;
        for (let band = 0; band < quotas.length; band++) {
            const taken = allocation[category][band];
            for (let index = 0; index < taken; index++) {
                picks.push(supplies[category][band].pop());
            }
            missing -= taken;
        }
        // Fallback per i set ristretti: la categoria completa la propria quota
        // anche fuori fascia, così il totale per categoria resta esatto.
        for (let band = 0; band < quotas.length && missing > 0; band++) {
            while (missing > 0 && supplies[category][band].length > 0) {
                picks.push(supplies[category][band].pop());
                missing--;
            }
        }
    }
    return { cards: picks, exact };
}

// Mazzo fisso della parte già collegata al testo stampato. Non è un mazzo demo:
// serve per giocare, dal tavolo, gli Equipaggiamenti, i Siti e i Campi appena
// spostati sull’id della carta. Quaranta carte, copie ammesse.
export const UPDATED_MATCH_DECK = [
    'set-2-079', 'set-2-080', 'set-2-081', 'set-2-082', 'set-2-083', 'set-2-084',
    'set-2-085', 'set-2-086', 'set-2-087', 'set-2-088', 'set-2-089', 'set-2-090',
    'set-3-081', 'set-3-082', 'set-3-083', 'set-3-084', 'set-3-085', 'set-3-086',
    'set-3-087', 'set-3-088',
    'set-2-100', 'set-2-108',
    'set-3-099', 'set-3-107', 'set-3-108', 'set-3-109',
    'set-3-112', 'set-3-113', 'set-3-115', 'set-3-116', 'set-3-117', 'set-3-118', 'set-3-119',
    'set-3-001', 'set-3-001', 'set-3-004',
    'set-1-003', 'set-1-004',
    'set-2-002', 'set-2-003'
];
