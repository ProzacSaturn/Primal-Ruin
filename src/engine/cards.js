import { defaultCommanderId, getCommander } from '../commanders.js';
import { composeArmyDeck } from '../deck-composition.js';
import { nextRandom } from '../random.js';
import { CARD_DATA, FRONT_NAMES } from './board.js';

const KEYWORD_PATTERNS = [
    /Ferocia/i,
    /Assalto/i,
    /Sorvolo/i,
    /Mente Collettiva/i,
    /Posizione Difensiva/i,
    /Logorare(?:\s*\(\d+\))?/ig,
    /Eco Spettrale/i,
    /Tormento(?:\s*\(\d+\))?/ig,
    /Ascensione(?:\s*\(\d+\)|\s+\d+)?/ig,
    /Infiltrazione(?:\s*\(\d+\))?/ig
];

function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(nextRandom() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function extractKeywords(rulesText = '', typeText = '') {
    const keywords = KEYWORD_PATTERNS.flatMap(pattern => (rulesText || '').match(pattern) || []);
    // Il tipo Divinità è la condizione. La frase di promemoria sulle carte non la attiva da sola.
    if (/Divinità/iu.test(typeText || '') && !keywords.includes('Divinità')) {
        keywords.push('Divinità');
    }
    return keywords;
}

function cardIcon(card) {
    if (/dinosauro|raptor|pterosauro/i.test(card.type || '')) return '🦖';
    if (/spettro|non morto/i.test(card.type || '')) return '👻';
    if (/sciame|parassita/i.test(card.type || '')) return '🦠';
    if (/psionico/i.test(card.type || '')) return '🧠';
    if (/drone/i.test(card.type || '')) return '⚙️';
    return '⚔️';
}

function makeUnit(card, id, owner) {
    return {
        ...card,
        id,
        catalogId: card.id,
        owner,
        icon: cardIcon(card),
        keywords: extractKeywords(card.rulesText, card.type),
        temporaryKeywords: [],
        currentForce: card.force,
        damage: 0,
        damageThisTurn: 0,
        damageShield: 0,
        temporaryForce: 0,
        equipment: null,
        front: null,
        position: null
    };
}

function makeCardInstance(card, id, owner) {
    return card.category === 'unit'
        ? makeUnit(card, id, owner)
        : {
            ...card,
            id,
            catalogId: card.id,
            owner,
            keywords: extractKeywords(card.rulesText, card.type)
        };
}

function makeDeck(owner, setId, customCardIds = null) {
    if (customCardIds) {
        const cardsById = new Map(CARD_DATA.map(card => [card.id, card]));
        return shuffled(customCardIds.map((cardId, index) => {
            const card = cardsById.get(cardId);
            if (!card) throw new Error(`Carta sconosciuta nel mazzo: ${cardId}`);
            return makeCardInstance(card, `${owner}-${card.id}-${index}`, owner);
        }));
    }
    const picks = composeArmyDeck(
        CARD_DATA.filter(card => card.setId === setId),
        { label: setId }
    );
    if (!picks.exact) {
        console.warn(`Il set ${setId} non copre tutti gli intervalli della curva dei costi (§2): composizione approssimata.`);
    }
    return shuffled(picks.cards).map((card, index) =>
        makeCardInstance(card, `${owner}-${card.id}-${index}`, owner));
}

function makeDomainDeck(owner) {
    const elements = ['Fuoco', 'Acqua', 'Terra', 'Aria', 'Ombra', 'Luce', 'Caos', 'Ordine'];
    return shuffled(Array.from({ length: 20 }, (_, index) => ({
        id: `${owner}-domain-${index}`,
        name: `Dominio di ${elements[index % elements.length]}`,
        tapped: false
    })));
}

function makePlayer(id, setId, customCardIds = null, commanderId = null) {
    const commander = getCommander(commanderId) || getCommander(defaultCommanderId());
    return {
        id,
        name: commander.name,
        commanderId: commander.id,
        pc: commander.pc,
        follia: 0,
        echo: 0,
        setId,
        armyDeck: makeDeck(id, setId, customCardIds),
        domainDeck: makeDomainDeck(id),
        hand: [],
        discard: [],
        exile: [],
        domains: [],
        sites: [],
        field: null,
        controlledUnits: [],
        fronts: Object.fromEntries(FRONT_NAMES.map(front => [front, { line: null, supA: null, supB: null }])),
        parasites: 0,
        commanderAbilityUsed: false,
        tacticEffects: {},
        sacrificeAfterCombat: [],
        tacticsPlayedThisTurn: 0,
        tacticLimitActive: false
    };
}

export { makePlayer };
